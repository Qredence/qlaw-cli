# bridge_server.py
# Minimal bridge that exposes:
# - POST /v1/responses (SSE): start workflow.run_stream(initial_message)
# - POST /v1/workflows/{entity_id}/send_responses (SSE): workflow.send_responses_streaming({ request_id: ... })

from __future__ import annotations

import asyncio
import json
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict, Optional, Tuple

from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from uuid import uuid4
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, create_engine, select
from sqlalchemy.orm import declarative_base, sessionmaker

# Agent Framework imports (ensure installed/available in your Python env)
from agent_framework import ChatMessage, Role
from agent_framework._workflows._handoff import HandoffBuilder, HandoffUserInputRequest
from agent_framework._workflows._events import (
    WorkflowEvent,
    RequestInfoEvent,
    WorkflowOutputEvent,
    WorkflowStatusEvent,
    WorkflowRunState,
    WorkflowFailedEvent,
)

# Workflow storage configuration
WORKFLOW_TTL = 3600  # Time-to-live in seconds (1 hour default)
MAX_WORKFLOWS: Optional[int] = None  # Optional maximum number of workflows (None = unlimited)

# In-memory session store: conversation_id -> (workflow instance, last_access_timestamp)
WORKFLOWS: Dict[str, Tuple[Any, float]] = {}
CONV_RUNS: Dict[str, str] = {}

# Locks for synchronizing workflow creation per conversation_id
_WORKFLOW_LOCKS: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

# Cleanup task reference for graceful shutdown
_cleanup_task: Optional[asyncio.Task] = None


# ---- Example workflow factory (adapt to your environment) ----
async def create_workflow(entity_id: str) -> Any:
    """Create a multi-tier handoff workflow akin to handoff_specialist_to_specialist.py.

    Replace this with your real agents/clients as needed.
    """
    from agent_framework.openai import OpenAIChatClient

    client = OpenAIChatClient()

    # Coordinator + specialists (names must match handoff aliases)
    triage = client.create_agent(instructions="Triage agent", name="triage_agent")
    replacement = client.create_agent(instructions="Replacement agent", name="replacement_agent")
    delivery = client.create_agent(instructions="Delivery agent", name="delivery_agent")
    billing = client.create_agent(instructions="Billing agent", name="billing_agent")

    wf = (
        HandoffBuilder(name=entity_id, participants=[triage, replacement, delivery, billing])
        .set_coordinator(triage)
        .add_handoff(triage, [replacement, delivery, billing])
        .add_handoff(replacement, [delivery, billing])
        .add_handoff(delivery, billing)
        .with_termination_condition(lambda conv: sum(1 for m in conv if m.role.value == "user") > 4)
        .build()
    )
    return wf


# ---- OpenAI-compatible request payload (subset) ----
class OpenAIRequest(BaseModel):
    model: str
    input: Any
    stream: Optional[bool] = True
    conversation: Optional[Any] = None  # str | {"id": str}


def _get_conversation_id(conversation: Any) -> Optional[str]:
    if isinstance(conversation, str):
        return conversation
    if isinstance(conversation, dict):
        return conversation.get("id")
    return None


async def _get_or_create_workflow(entity_id: str, conversation_id: Optional[str]) -> tuple[Any, str]:
    """Get or create a workflow, refreshing its last access timestamp.
    
    Uses per-key locking to prevent race conditions when concurrent requests
    use the same conversation_id.
    """
    key = conversation_id or f"conv_{uuid4().hex[:8]}"
    current_time = time.time()
    
    # Get or create lock for this key
    lock = _WORKFLOW_LOCKS[key]
    
    # Acquire lock before checking/creating
    async with lock:
        # Double-check pattern: re-check after acquiring lock
        entry = WORKFLOWS.get(key)
        if entry:
            # Workflow exists - refresh timestamp
            wf, _ = entry
            WORKFLOWS[key] = (wf, current_time)
        else:
            # Create new workflow only if still missing after lock acquisition
            wf = await create_workflow(entity_id)
            WORKFLOWS[key] = (wf, current_time)
            
            # Enforce MAX_WORKFLOWS limit if set
            if MAX_WORKFLOWS is not None and len(WORKFLOWS) > MAX_WORKFLOWS:
                _evict_lru_workflow()
        
        # Lock is automatically released here via async with context manager
        # Optionally clean up lock entry if workflow was removed (but keep lock for active workflows)
    
    return wf, key


def _evict_lru_workflow() -> None:
    """Evict the least-recently-used workflow when MAX_WORKFLOWS limit is exceeded."""
    if not WORKFLOWS:
        return
    
    # Find the workflow with the oldest timestamp
    lru_key = min(WORKFLOWS.items(), key=lambda x: x[1][1])[0]
    del WORKFLOWS[lru_key]
    
    # Optionally clean up the lock entry (safe to delete even if lock is in use,
    # as coroutines hold references to the lock object itself)
    if lru_key in _WORKFLOW_LOCKS:
        del _WORKFLOW_LOCKS[lru_key]


async def _cleanup_workflows() -> None:
    """Periodic cleanup task that removes expired workflows and enforces MAX_WORKFLOWS limit."""
    while True:
        try:
            await asyncio.sleep(60)  # Run cleanup every minute
            current_time = time.time()
            
            # Remove expired workflows (older than TTL)
            expired_keys = [
                key for key, (_, timestamp) in WORKFLOWS.items()
                if current_time - timestamp > WORKFLOW_TTL
            ]
            for key in expired_keys:
                del WORKFLOWS[key]
                # Clean up corresponding lock entry
                if key in _WORKFLOW_LOCKS:
                    del _WORKFLOW_LOCKS[key]
            
            # Enforce MAX_WORKFLOWS limit if set
            if MAX_WORKFLOWS is not None and len(WORKFLOWS) > MAX_WORKFLOWS:
                # Sort by timestamp and evict oldest entries
                sorted_workflows = sorted(
                    WORKFLOWS.items(),
                    key=lambda x: x[1][1]
                )
                num_to_evict = len(WORKFLOWS) - MAX_WORKFLOWS
                for key, _ in sorted_workflows[:num_to_evict]:
                    del WORKFLOWS[key]
                    # Clean up corresponding lock entry
                    if key in _WORKFLOW_LOCKS:
                        del _WORKFLOW_LOCKS[key]
        
        except asyncio.CancelledError:
            # Cleanup task was cancelled (shutdown)
            break
        except Exception as e:
            # Log error but continue cleanup loop
            print(f"Error in workflow cleanup: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage cleanup task lifecycle: start on startup, stop on shutdown."""
    global _cleanup_task
    
    # Start cleanup task
    _cleanup_task = asyncio.create_task(_cleanup_workflows())
    
    yield
    
    # Stop cleanup task gracefully
    if _cleanup_task:
        _cleanup_task.cancel()
        try:
            await _cleanup_task
        except asyncio.CancelledError:
            pass


app = FastAPI(lifespan=lifespan)


def _serialize_chat_message(msg: ChatMessage) -> Dict[str, Any]:
    return {
        "role": msg.role.value,
        "author_name": getattr(msg, "author_name", None),
        "text": getattr(msg, "text", ""),
    }


def _to_openai_trace_request_info(ev: RequestInfoEvent) -> Dict[str, Any]:
    # Wrap RequestInfoEvent as response.trace.complete with workflow_info payload
    req = ev.data  # HandoffUserInputRequest
    conversation = []
    prompt = ""
    awaiting_agent_id = ""
    source_executor_id = ev.source_executor_id

    if isinstance(req, HandoffUserInputRequest):
        conversation = [_serialize_chat_message(m) for m in req.conversation]
        prompt = req.prompt
        awaiting_agent_id = req.awaiting_agent_id
        source_executor_id = req.source_executor_id

    return {
        "type": "response.trace.complete",
        "data": {
            "trace_type": "workflow_info",
            "event_type": "RequestInfoEvent",
            "data": {
                "request_info": {
                    "request_id": ev.request_id,
                    "source_executor_id": source_executor_id,
                    "request_type": getattr(ev.request_type, "__name__", str(ev.request_type)),
                    "response_type": getattr(ev.response_type, "__name__", str(ev.response_type)),
                    "data": {
                        "conversation": conversation,
                        "awaiting_agent_id": awaiting_agent_id,
                        "prompt": prompt,
                        "source_executor_id": source_executor_id,
                    },
                }
            },
        },
        "item_id": f"item_{uuid4().hex[:8]}",
        "output_index": 0,
        "sequence_number": 0,
    }


def _to_openai_output_event(conversation: Any) -> Dict[str, Any]:
    # Emit final conversation as a single assistant delta (MVP)
    lines = []
    for m in conversation:
        if getattr(m, "text", "").strip():
            who = m.author_name or m.role.value
            lines.append(f"{who}: {m.text}")
    text = "\n".join(lines) if lines else "(no content)"
    return {
        "type": "response.output_text.delta",
        "delta": text,
        "item_id": f"msg_{uuid4().hex[:8]}",
        "output_index": 0,
        "content_index": 0,
        "sequence_number": 0,
    }


async def _stream_events(async_iter, send) -> None:
    async for ev in async_iter:
        if isinstance(ev, RequestInfoEvent):
            await send(_to_openai_trace_request_info(ev))
        elif isinstance(ev, WorkflowOutputEvent):
            await send(_to_openai_output_event(ev.data))
        elif isinstance(ev, WorkflowFailedEvent):
            await send({"type": "error", "message": ev.details.message})
        else:
            # Optionally handle status/other events as traces
            pass
    await send("[DONE]")


def _sse_response(generator: AsyncGenerator[Dict[str, Any] | str, None]) -> StreamingResponse:
    async def sse_iter():
        async for event in generator:
            if event == "[DONE]":
                yield b"data: [DONE]\n\n"
            else:
                yield f"data: {json.dumps(event)}\n\n".encode("utf-8")

    return StreamingResponse(
        sse_iter(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"}
    )


@app.post("/v1/responses")
async def responses(request: OpenAIRequest):
    wf, conv_id = await _get_or_create_workflow(request.model, _get_conversation_id(request.conversation))
    _ensure_workflow_row(request.model)
    run_id = _ensure_run_row(request.model, conv_id)
    initial = request.input if isinstance(request.input, str) else str(request.input)

    async def gen():
        q: asyncio.Queue[Any] = asyncio.Queue()

        async def send(ev):
            await q.put(ev)

        _update_run_status(conv_id, "running")
        await _stream_events(wf.run_stream(initial), send)
        _update_run_status(conv_id, "completed", completed=True)
        await q.put("[DONE]")

        while True:
            item = await q.get()
            yield item
            if item == "[DONE]":
                break

    return _sse_response(gen())


class SendResponsesBody(BaseModel):
    responses: Dict[str, Any]
    conversation: Optional[Any] = None


@app.post("/v1/workflows/{entity_id}/send_responses")
async def continue_workflow(entity_id: str, body: SendResponsesBody):
    wf, conv_id = await _get_or_create_workflow(entity_id, _get_conversation_id(body.conversation))
    _ensure_workflow_row(entity_id)
    _ensure_run_row(entity_id, conv_id)

    async def gen():
        q: asyncio.Queue[Any] = asyncio.Queue()

        async def send(ev):
            await q.put(ev)

        async def _iter():
            async for ev in wf.send_responses_streaming(body.responses):
                yield ev

        _update_run_status(conv_id, "running")
        await _stream_events(_iter(), send)
        _update_run_status(conv_id, "completed", completed=True)
        await q.put("[DONE]")

        while True:
            item = await q.get()
            yield item
            if item == "[DONE]":
                break

    return _sse_response(gen())

class CreateWorkflowBody(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

@app.post("/v1/workflows")
def create_workflow_row(body: CreateWorkflowBody):
    eid = body.name or f"wf_{uuid4().hex[:8]}"
    w = _ensure_workflow_row(eid, body.name, body.config)
    return JSONResponse({"id": w.id, "name": w.name, "config": json.loads(w.config), "created_at": w.created_at.isoformat()})

@app.get("/v1/workflows/{entity_id}")
def get_workflow_row(entity_id: str):
    with _db_session() as s:
        w = s.get(Workflow, entity_id)
        if not w:
            return JSONResponse({"error": "not_found"}, status_code=404)
        return JSONResponse({"id": w.id, "name": w.name, "config": json.loads(w.config), "created_at": w.created_at.isoformat()})

@app.get("/v1/workflows/{entity_id}/runs")
def list_runs(entity_id: str):
    with _db_session() as s:
        rows = s.execute(select(Run).where(Run.workflow_id == entity_id)).scalars().all()
        return JSONResponse([{ "id": r.id, "status": r.status, "started_at": r.started_at.isoformat(), "completed_at": r.completed_at.isoformat() if r.completed_at else None } for r in rows])

@app.get("/v1/runs/{run_id}/status")
def get_run_status(run_id: str):
    with _db_session() as s:
        r = s.get(Run, run_id)
        if not r:
            return JSONResponse({"error": "not_found"}, status_code=404)
        return JSONResponse({"id": r.id, "status": r.status, "current_step": r.current_step, "last_error": r.last_error, "started_at": r.started_at.isoformat(), "completed_at": r.completed_at.isoformat() if r.completed_at else None })

class HandoffBody(BaseModel):
    from_agent: str
    to_agent: str
    reason: Optional[str] = None

@app.post("/v1/runs/{run_id}/handoff")
def record_handoff(run_id: str, body: HandoffBody):
    with _db_session() as s:
        r = s.get(Run, run_id)
        if not r:
            return JSONResponse({"error": "not_found"}, status_code=404)
        _audit(run_id, "handoff_initiated", {"from_agent": body.from_agent, "to_agent": body.to_agent, "reason": body.reason or ""})
        return JSONResponse({"run_id": run_id, "status": "accepted"})

@app.get("/v1/runs/{run_id}/audit")
def list_audit(run_id: str):
    with _db_session() as s:
        rows = s.execute(select(AuditLog).where(AuditLog.run_id == run_id)).scalars().all()
        return JSONResponse([{ "id": a.id, "type": a.type, "detail": json.loads(a.detail), "created_at": a.created_at.isoformat() } for a in rows])
Base = declarative_base()

class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(String, primary_key=True)
    name = Column(String)
    config = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Run(Base):
    __tablename__ = "runs"
    id = Column(String, primary_key=True)
    workflow_id = Column(String)
    status = Column(String)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    current_step = Column(String, nullable=True)
    entity_id = Column(String)
    conv_key = Column(String)
    last_error = Column(Text, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True)
    run_id = Column(String)
    type = Column(String)
    detail = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

ENGINE = create_engine("sqlite:///bridge.db")
SessionLocal = sessionmaker(bind=ENGINE)

def _db_session():
    return SessionLocal()

def _audit(run_id: str, type_: str, detail: Dict[str, Any]):
    with _db_session() as s:
        a = AuditLog(id=uuid4().hex, run_id=run_id, type=type_, detail=json.dumps(detail), created_at=datetime.utcnow())
        s.add(a)
        s.commit()

def _ensure_workflow_row(entity_id: str, name: Optional[str] = None, config: Optional[Dict[str, Any]] = None):
    with _db_session() as s:
        w = s.get(Workflow, entity_id)
        if not w:
            w = Workflow(id=entity_id, name=name or entity_id, config=json.dumps(config or {}), created_at=datetime.utcnow())
            s.add(w)
            s.commit()
        return w

def _ensure_run_row(entity_id: str, conv_key: str) -> str:
    with _db_session() as s:
        run_id = CONV_RUNS.get(conv_key)
        if run_id:
            r = s.get(Run, run_id)
            if r:
                return run_id
        run_id = uuid4().hex
        r = Run(id=run_id, workflow_id=entity_id, status="running", started_at=datetime.utcnow(), entity_id=entity_id, conv_key=conv_key)
        s.add(r)
        s.commit()
        CONV_RUNS[conv_key] = run_id
        _audit(run_id, "run_started", {"entity_id": entity_id, "conv_key": conv_key})
        return run_id

def _update_run_status(conv_key: str, status: str, current_step: Optional[str] = None, error: Optional[str] = None, completed: bool = False):
    run_id = CONV_RUNS.get(conv_key)
    if not run_id:
        return
    with _db_session() as s:
        r = s.get(Run, run_id)
        if not r:
            return
        r.status = status
        if current_step:
            r.current_step = current_step
        if error:
            r.last_error = error
        if completed:
            r.completed_at = datetime.utcnow()
        s.commit()
    _audit(run_id, "status", {"status": status, "current_step": current_step or "", "error": error or ""})

@app.on_event("startup")
def _init_db():
    Base.metadata.create_all(ENGINE)

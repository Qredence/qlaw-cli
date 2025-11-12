# bridge_server.py
# Minimal bridge that exposes:
# - POST /v1/responses (SSE): start workflow.run_stream(initial_message)
# - POST /v1/workflows/{entity_id}/send_responses (SSE): workflow.send_responses_streaming({ request_id: ... })

from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncGenerator, Dict, Optional

from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from uuid import uuid4

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

app = FastAPI()

# In-memory session store: conversation_id -> workflow instance
WORKFLOWS: Dict[str, Any] = {}


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
    key = conversation_id or f"conv_{uuid4().hex[:8]}"
    wf = WORKFLOWS.get(key)
    if not wf:
        wf = await create_workflow(entity_id)
        WORKFLOWS[key] = wf
    return wf, key


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
    initial = request.input if isinstance(request.input, str) else str(request.input)

    async def gen():
        q: asyncio.Queue[Any] = asyncio.Queue()

        async def send(ev):
            await q.put(ev)

        await _stream_events(wf.run_stream(initial), send)
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

    async def gen():
        q: asyncio.Queue[Any] = asyncio.Queue()

        async def send(ev):
            await q.put(ev)

        async def _iter():
            async for ev in wf.send_responses_streaming(body.responses):
                yield ev

        await _stream_events(_iter(), send)
        await q.put("[DONE]")

        while True:
            item = await q.get()
            yield item
            if item == "[DONE]":
                break

    return _sse_response(gen())

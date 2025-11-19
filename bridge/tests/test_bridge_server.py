from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import bridge.bridge_server as bridge_server


def test_request_info_event_serialization() -> None:
    role = bridge_server.Role("user")
    message = bridge_server.ChatMessage(role=role, author_name="Alice", text="Hello")
    req = bridge_server.HandoffUserInputRequest(
        conversation=[message],
        prompt="Need assistance",
        awaiting_agent_id="triage_agent",
        source_executor_id="triage_agent",
    )
    event = SimpleNamespace(
        data=req,
        request_id="req_123",
        source_executor_id="triage_agent",
        request_type=type("MockRequest", (), {}),
        response_type=type("MockResponse", (), {}),
    )

    payload = bridge_server._to_openai_trace_request_info(event)

    assert payload["type"] == "response.trace.complete"
    workflow_info = payload["data"]["data"]["request_info"]
    assert workflow_info["request_id"] == "req_123"
    assert workflow_info["data"]["prompt"] == "Need assistance"
    assert workflow_info["data"]["awaiting_agent_id"] == "triage_agent"
    assert workflow_info["data"]["conversation"][0]["text"] == "Hello"


def test_prune_workflows_handles_ttl_and_max_limits() -> None:
    original_workflows = bridge_server.WORKFLOWS.copy()
    original_locks = dict(bridge_server._WORKFLOW_LOCKS)
    original_ttl = bridge_server.WORKFLOW_TTL
    original_max = bridge_server.MAX_WORKFLOWS

    try:
        bridge_server.WORKFLOWS.clear()
        bridge_server._WORKFLOW_LOCKS.clear()
        bridge_server.WORKFLOW_TTL = 5
        bridge_server.MAX_WORKFLOWS = 2

        bridge_server.WORKFLOWS["stale_run"] = (object(), 0.0)
        bridge_server._WORKFLOW_LOCKS["stale_run"] = asyncio.Lock()

        bridge_server.WORKFLOWS["keep_a"] = (object(), 7.0)
        bridge_server.WORKFLOWS["keep_b"] = (object(), 8.0)
        bridge_server.WORKFLOWS["keep_c"] = (object(), 6.0)

        bridge_server._prune_workflows(current_time=10.0)

        assert "stale_run" not in bridge_server.WORKFLOWS
        assert len(bridge_server.WORKFLOWS) == 2
        assert "keep_c" not in bridge_server.WORKFLOWS
        assert {"keep_a", "keep_b"} == set(bridge_server.WORKFLOWS.keys())
    finally:
        bridge_server.WORKFLOWS.clear()
        bridge_server.WORKFLOWS.update(original_workflows)
        bridge_server._WORKFLOW_LOCKS.clear()
        bridge_server._WORKFLOW_LOCKS.update(original_locks)
        bridge_server.WORKFLOW_TTL = original_ttl
        bridge_server.MAX_WORKFLOWS = original_max


def test_ensure_workflow_row_uses_sqlite_session(tmp_path: Any) -> None:
    db_path = tmp_path / "test_bridge.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Session = sessionmaker(bind=engine)

    original_engine = bridge_server.ENGINE
    original_session_local = bridge_server.SessionLocal

    try:
        bridge_server.ENGINE = engine
        bridge_server.SessionLocal = Session
        bridge_server.Base.metadata.create_all(engine)

        bridge_server._ensure_workflow_row(
            "wf_test",
            name="demo",
            config={"foo": "bar"},
        )
        bridge_server._ensure_workflow_row("wf_test")

        with bridge_server._db_session() as session:
            row = session.get(bridge_server.Workflow, "wf_test")
            assert row is not None
            assert row.name == "demo"
    finally:
        bridge_server.ENGINE = original_engine
        bridge_server.SessionLocal = original_session_local

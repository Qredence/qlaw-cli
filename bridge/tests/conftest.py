"""Test scaffolding for the bridge package.

We install lightweight stubs for the agent_framework modules so tests can run
without the real dependency (which normally lives outside this repo). The
production server still imports the real package when available.
"""

from __future__ import annotations

import sys
import types
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterator

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


def _ensure_agent_framework_stub() -> None:
    if "agent_framework" in sys.modules:
        return

    agent_framework = types.ModuleType("agent_framework")

    class Role:
        def __init__(self, value: str):
            self.value = value

    @dataclass
    class ChatMessage:
        role: Role
        author_name: str | None = None
        text: str = ""

    agent_framework.Role = Role
    agent_framework.ChatMessage = ChatMessage
    sys.modules["agent_framework"] = agent_framework

    # Stub out handoff builder bits referenced by create_workflow()
    handoff_module = types.ModuleType("agent_framework._workflows._handoff")

    class _StubWorkflow:
        async def run_stream(self, *_: Any) -> AsyncIterator[Any]:
            if False:
                yield None

        async def send_responses_streaming(self, *_: Any) -> AsyncIterator[Any]:
            if False:
                yield None

    class HandoffBuilder:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self._workflow = _StubWorkflow()

        def set_coordinator(self, *args: Any, **kwargs: Any) -> "HandoffBuilder":
            return self

        def add_handoff(self, *args: Any, **kwargs: Any) -> "HandoffBuilder":
            return self

        def with_termination_condition(self, *args: Any, **kwargs: Any) -> "HandoffBuilder":
            return self

        def build(self) -> _StubWorkflow:
            return self._workflow

    @dataclass
    class HandoffUserInputRequest:
        conversation: list[Any]
        prompt: str
        awaiting_agent_id: str
        source_executor_id: str

    handoff_module.HandoffBuilder = HandoffBuilder
    handoff_module.HandoffUserInputRequest = HandoffUserInputRequest
    sys.modules["agent_framework._workflows._handoff"] = handoff_module

    # Minimal workflow event stubs
    events_module = types.ModuleType("agent_framework._workflows._events")

    class WorkflowEvent:  # pragma: no cover - simple marker type
        ...

    class RequestInfoEvent(WorkflowEvent):
        ...

    class WorkflowOutputEvent(WorkflowEvent):
        def __init__(self, data: Any):
            self.data = data

    class WorkflowStatusEvent(WorkflowEvent):
        ...

    class WorkflowRunState:
        ...

    class WorkflowFailedEvent(WorkflowEvent):
        def __init__(self, details: Any):
            self.details = details

    events_module.WorkflowEvent = WorkflowEvent
    events_module.RequestInfoEvent = RequestInfoEvent
    events_module.WorkflowOutputEvent = WorkflowOutputEvent
    events_module.WorkflowStatusEvent = WorkflowStatusEvent
    events_module.WorkflowRunState = WorkflowRunState
    events_module.WorkflowFailedEvent = WorkflowFailedEvent
    sys.modules["agent_framework._workflows._events"] = events_module

    # OpenAI client stub so create_workflow can import if invoked
    openai_module = types.ModuleType("agent_framework.openai")

    class OpenAIChatClient:
        def create_agent(self, **kwargs: Any) -> dict[str, Any]:
            return {"name": kwargs.get("name", "stub_agent"), "instructions": kwargs.get("instructions", "")}

    openai_module.OpenAIChatClient = OpenAIChatClient
    sys.modules["agent_framework.openai"] = openai_module


_ensure_agent_framework_stub()

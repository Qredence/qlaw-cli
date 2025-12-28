from typing import Any, Optional
from agent_framework._workflows._handoff import HandoffBuilder
from agent_framework.openai import OpenAIChatClient

from .tools.registry import get_tool_schemas


async def create_workflow(entity_id: str, conn_str: Optional[str] = None) -> Any:
    """Create a multi-tier handoff workflow or a Foundry Agent workflow.

    If conn_str is provided, assumes entity_id is a Foundry Agent ID.
    Otherwise, creates the default handoff workflow with tools.
    """
    if conn_str:
        try:
            from agent_framework.azure import AzureAIAgentClient
            from azure.identity.aio import DefaultAzureCredential

            # Use Foundry Agent
            client = AzureAIAgentClient(
                project_endpoint=conn_str,
                agent_id=entity_id,
                async_credential=DefaultAzureCredential(),
                should_cleanup_agent=False,
            )
            return client.create_agent(name=entity_id)
        except Exception as e:
            raise ValueError(f"Failed to create Azure agent: {e}") from e

    # Get tool schemas for the agent
    tools = get_tool_schemas()

    client = OpenAIChatClient()

    # Coordinator + specialists (names must match handoff aliases)
    # All agents get access to tools
    triage = client.create_agent(
        instructions="Triage agent - analyze user requests and delegate to specialists. You have access to file system tools for reading, searching, and editing code.",
        name="triage_agent",
        tools=tools,
    )
    replacement = client.create_agent(
        instructions="Replacement agent - handle file replacements and edits. Use the edit_file tool to make precise text replacements.",
        name="replacement_agent",
        tools=tools,
    )
    delivery = client.create_agent(
        instructions="Delivery agent - create files, directories, and manage outputs. Use write_file, mkdir, and related tools.",
        name="delivery_agent",
        tools=tools,
    )
    billing = client.create_agent(
        instructions="Billing agent - handle billing inquiries and support.",
        name="billing_agent",
        tools=tools,
    )

    wf = (
        HandoffBuilder(
            name=entity_id, participants=[triage, replacement, delivery, billing]
        )
        .set_coordinator(triage)
        .add_handoff(triage, [replacement, delivery, billing])
        .add_handoff(replacement, [delivery, billing])
        .add_handoff(delivery, billing)
        .with_termination_condition(
            lambda conv: sum(1 for m in conv if m.role.value == "user") > 4
        )
        .build()
    )
    return wf

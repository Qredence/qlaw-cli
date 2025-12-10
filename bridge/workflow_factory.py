from typing import Any, Optional
from agent_framework._workflows._handoff import HandoffBuilder
from agent_framework.openai import OpenAIChatClient


async def create_workflow(entity_id: str, conn_str: Optional[str] = None) -> Any:
    """Create a multi-tier handoff workflow or a Foundry Agent workflow.

    If conn_str is provided, assumes entity_id is a Foundry Agent ID.
    Otherwise, creates the default handoff workflow.
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
    client = OpenAIChatClient()

    # Coordinator + specialists (names must match handoff aliases)
    triage = client.create_agent(instructions="Triage agent", name="triage_agent")
    replacement = client.create_agent(
        instructions="Replacement agent", name="replacement_agent"
    )
    delivery = client.create_agent(instructions="Delivery agent", name="delivery_agent")
    billing = client.create_agent(instructions="Billing agent", name="billing_agent")

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

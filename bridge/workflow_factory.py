from typing import Any
from agent_framework._workflows._handoff import HandoffBuilder
from agent_framework.openai import OpenAIChatClient


async def create_workflow(entity_id: str) -> Any:
    """Create a multi-tier handoff workflow akin to handoff_specialist_to_specialist.py.

    Replace this with your real agents/clients as needed.
    """
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

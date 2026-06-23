# planner.py
# The Planner agent — the first node in the Chorus pipeline.
#
# Responsibility:
#   Receives the user's question and decomposes it into distinct
#   investigative angles. Each angle becomes a brief for one Researcher.
#
# In Phase 1 (real implementation):
#   This will call an LLM (e.g. Groq + Llama 3.1 8B) and ask it to
#   break the question into 3-5 meaningful angles based on the topic.
#
# Currently (stub):
#   Returns 3 hardcoded angles — technical, historical, impact.
#   This lets us test the pipeline structure without needing a real LLM.

from chorus.graph.state import GraphState  # the shared state passed between all nodes
from chorus.schemas import AnglePlan       # the data shape for one investigative angle


async def planner_node(state: GraphState) -> dict:
    """
    Decomposes the user's question into 3 investigative angles.

    Args:
        state: the current GraphState — we read state["question"] from it

    Returns:
        A dict with "angles" key containing a list of AnglePlan objects.
        LangGraph merges this dict back into the shared GraphState,
        so after this node runs, state["angles"] will have these 3 items.

    Node position in pipeline: FIRST — runs before any researchers.
    """

    # Build 3 angle plans, each targeting a different perspective on the question.
    # f-strings embed the user's actual question into the brief and search seeds,
    # so the researchers know exactly what to investigate.
    return {
        "angles": [
            AnglePlan(
                angle_id="technical",
                brief=f"Technical aspects of: {state['question']}",
                search_seeds=[f"{state['question']} technical"]
            ),
            AnglePlan(
                angle_id="historical",
                brief=f"Historical context of: {state['question']}",
                search_seeds=[f"{state['question']} history"]
            ),
            AnglePlan(
                angle_id="impact",
                brief=f"Real-world impact of: {state['question']}",
                search_seeds=[f"{state['question']} impact"]
            ),
        ]
    }

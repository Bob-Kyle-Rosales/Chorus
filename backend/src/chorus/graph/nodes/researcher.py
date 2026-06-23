# researcher.py
# The Researcher agent — runs 3 times in parallel, one per angle.
#
# Responsibility:
#   Receives one investigative angle (from state["angles"][angle_index])
#   and independently researches that specific angle. It searches the web,
#   reads pages, extracts evidence, and produces a list of findings.
#
# Key design rule:
#   Researchers CANNOT see each other's outputs. Each researcher only
#   reads its own assigned angle and the global question. This preserves
#   independence — each angle gets an unbiased investigation.
#
# In Phase 1 (real implementation):
#   - Uses Tavily API to search the web for the angle's search seeds
#   - Uses httpx + trafilatura to fetch and extract page content
#   - Uses Groq + Llama 3.1 70B to analyze the content and produce findings
#   - All fetched URLs pass through assert_safe_url() (SSRF protection)
#   - All fetched content is wrapped with wrap_untrusted() (injection protection)
#
# Currently (stub):
#   Returns one hardcoded placeholder finding with confidence="low".

from chorus.graph.state import GraphState          # shared state — we read angles from it
from chorus.schemas import Finding, ResearcherOutput  # data shapes for findings and output


async def researcher_node(state: GraphState, angle_index: int = 0) -> dict:
    """
    Investigates one angle of the user's question and returns findings.

    Args:
        state:       the current GraphState — we read state["angles"] from it
        angle_index: which angle this researcher is responsible for (0, 1, or 2).
                     Set via functools.partial in graph.py so each of the 3
                     researcher nodes gets a different index.

    Returns:
        A dict with "researcher_outputs" key containing a list with ONE item.
        LangGraph uses the operator.add reducer in GraphState to APPEND this
        to the existing list — so all 3 researchers' outputs accumulate safely
        even though they run in parallel.

    Node position in pipeline: runs AFTER planner, BEFORE critic.
    3 instances run in parallel (researcher_0, researcher_1, researcher_2).
    """

    # Get this researcher's assigned angle from the state.
    # angle_index determines which angle we work on:
    #   researcher_0 → angles[0] (technical)
    #   researcher_1 → angles[1] (historical)
    #   researcher_2 → angles[2] (impact)
    angle = state["angles"][angle_index]

    # Return our findings wrapped in a list.
    # The list wrapper is required because the operator.add reducer
    # concatenates lists — [output_0] + [output_1] + [output_2] = [all three]
    return {
        "researcher_outputs": [
            ResearcherOutput(
                angle_id=angle.angle_id,  # tag the output with which angle it belongs to
                findings=[
                    Finding(
                        claim=f"Stub finding for {angle.angle_id}",  # placeholder claim
                        support="Placeholder — real research pending.",
                        citations=[],        # no real citations yet in stub mode
                        confidence="low",    # stubs are always low confidence
                    )
                ],
                open_questions=["Pending real research."],  # gaps for the critic to note
            )
        ]
    }

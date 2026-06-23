# synthesizer.py
# The Synthesizer agent — the final node in the Chorus pipeline.
#
# Responsibility:
#   Receives all researcher outputs AND the critic's assessment, then
#   reconciles them into a single structured final report. It resolves
#   contradictions, highlights contested points, and produces a
#   TL;DR with an overall confidence rating.
#
# Why it runs last:
#   The graph enforces critic → synthesizer ordering. The Synthesizer
#   uses the Critique to decide which findings to trust, which to flag
#   as contested, and what confidence level to assign the overall report.
#
# In Phase 1 (real implementation):
#   Will call Groq + Llama 3.1 70B with all findings + critique as context
#   and ask it to produce a structured Report using JSON mode + Pydantic validation.
#
# Currently (stub):
#   Flattens all findings from all researchers into one list and
#   builds a minimal Report with placeholder text.

from datetime import datetime, timezone  # for timestamping the generated report
from chorus.graph.state import GraphState  # shared state — we read everything from it
from chorus.schemas import Report          # the final report data shape


async def synthesizer_node(state: GraphState) -> dict:
    """
    Assembles the final research report from all agent outputs.

    Args:
        state: the current GraphState — we read:
               - state["question"]            : the original user question
               - state["researcher_outputs"]  : all findings from all 3 researchers
               - state["critique"]            : the critic's assessment (available but not
                                               used in the stub — used in Phase 1)

    Returns:
        A dict with "report" key containing the final Report object.
        LangGraph merges this into GraphState as the last step before END.
        The WebSocket handler then sends this as the "report.ready" event.

    Node position in pipeline: LAST — runs after the critic finishes.
    """

    # Flatten all findings from all 3 researchers into one combined list.
    # state["researcher_outputs"] is a list of ResearcherOutput objects.
    # Each ResearcherOutput has a .findings list.
    # This list comprehension loops through each output and each finding within it.
    # Example: [[finding_A, finding_B], [finding_C], [finding_D]] → [A, B, C, D]
    all_findings = [
        finding
        for output in state["researcher_outputs"]
        for finding in output.findings
    ]

    return {
        "report": Report(
            question=state["question"],               # echo back the original question
            tl_dr="Stub report — real synthesis pending.",  # placeholder summary
            key_findings=all_findings,                # all collected findings from all researchers
            contested_points=[],                      # Phase 1: populated from contradictions in critique
            sources=[],                               # Phase 1: aggregated from all finding citations
            confidence_overall="low",                 # stubs are always low confidence
            generated_at=datetime.now(tz=timezone.utc),  # timestamp with UTC timezone
        )
    }

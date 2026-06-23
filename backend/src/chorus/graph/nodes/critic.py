# critic.py
# The Critic agent — the adversarial layer in the Chorus pipeline.
#
# Responsibility:
#   Reads ALL researcher outputs and stress-tests them. It looks for:
#   - Contradictions: two researchers making conflicting claims
#   - Weak claims: assertions that aren't well-supported by citations
#   - Gaps: important angles that no researcher covered
#   - Follow-up needs: requests for a researcher to dig deeper (Phase 2)
#
# Why this node is architecturally required:
#   The graph edges enforce that the Synthesizer CANNOT run until the Critic
#   has finished. This is a structural guarantee — not a prompt instruction.
#   It mirrors how real publishing works: findings are challenged before
#   they're assembled into a final report.
#
# In Phase 1 (real implementation):
#   Will call Groq + Llama 3.1 70B with all researcher outputs as context
#   and ask it to critically evaluate the findings.
#
# Currently (stub):
#   Returns an empty critique (no contradictions, no weak claims found).
#   The single gap note acknowledges that the findings are stubs.

from chorus.graph.state import GraphState  # shared state — we read researcher_outputs from it
from chorus.schemas import Critique        # data shape for the critic's full assessment


async def critic_node(state: GraphState) -> dict:
    """
    Reviews all researcher outputs and produces a critique.

    Args:
        state: the current GraphState — we read state["researcher_outputs"] from it.
               By the time this node runs, all 3 researchers have finished and
               their outputs are in state["researcher_outputs"].

    Returns:
        A dict with "critique" key containing a Critique object.
        LangGraph merges this into the shared GraphState so the Synthesizer
        can access it via state["critique"].

    Node position in pipeline: runs AFTER all 3 researchers finish, BEFORE synthesizer.
    """

    # Stub: return an empty critique to keep the pipeline moving.
    # In Phase 1, this will analyze state["researcher_outputs"] with an LLM
    # and return real contradictions, weak claims, and gaps.
    return {
        "critique": Critique(
            contradictions=[],   # no contradictions found (stub — nothing to compare)
            weak_claims=[],      # no weak claims flagged (stub)
            gaps=["All findings are stubs — real critique pending."],  # honest stub note
            needs_followup=[],   # no follow-up requests (Phase 2 feature)
        )
    }

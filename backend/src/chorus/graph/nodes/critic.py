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
# Why ainvoke (not astream)?
#   The Critic produces structured JSON — a Critique object. We need the
#   complete response before we can parse and validate it with Pydantic.
#   Streaming partial JSON would be invalid mid-stream.
#
# Model: smart_llm (Llama 3.3 70B)
#   Cross-reading 3 researchers' outputs and identifying subtle contradictions
#   requires strong multi-step reasoning. The 8B model is not reliable enough
#   for this task — use the 70B model.

import json
from langchain_core.messages import SystemMessage, HumanMessage

from chorus.graph.state import GraphState
from chorus.llm import smart_llm
from chorus.schemas import ClaimRef, ContradictionRef, Critique, FollowupRequest


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are a critical analyst reviewing research findings from multiple researchers.

Your job is to rigorously evaluate their findings and identify:
1. CONTRADICTIONS: places where two researchers make conflicting claims
2. WEAK CLAIMS: assertions that are vague, unsupported, or speculative
3. GAPS: important aspects of the question that no researcher addressed
4. FOLLOW-UP NEEDS: specific angles that need deeper investigation

Return a JSON object with this exact structure:
{
  "contradictions": [
    {
      "claim_a": "The exact claim from one researcher",
      "claim_b": "The conflicting claim from another researcher",
      "explanation": "Why these claims conflict and why it matters"
    }
  ],
  "weak_claims": [
    {
      "claim": "The exact weak claim",
      "reason": "Why this claim is weak or insufficiently supported"
    }
  ],
  "gaps": [
    "A topic or perspective the question needed but no researcher covered"
  ],
  "needs_followup": []
}

Rules:
- Be specific — quote exact claims, don't paraphrase vaguely
- Only flag real contradictions, not just different perspectives on the same topic
- Only flag claims that are genuinely weak, not just complex
- Return ONLY the JSON object. No markdown, no explanation."""


def _format_findings(state: GraphState) -> str:
    """
    Formats all researcher outputs into a readable text block for the Critic's prompt.

    Each researcher's angle and findings are clearly separated so the LLM
    can identify which researcher made which claim when looking for contradictions.
    """
    sections = []
    for output in state["researcher_outputs"]:
        lines = [f"## Researcher: {output.angle_id}"]
        for i, finding in enumerate(output.findings, 1):
            lines.append(f"Finding {i} [{finding.confidence} confidence]: {finding.claim}")
            lines.append(f"  Support: {finding.support[:300]}")
        if output.open_questions:
            lines.append(f"Open questions: {'; '.join(output.open_questions)}")
        sections.append("\n".join(lines))
    return "\n\n".join(sections)


async def critic_node(state: GraphState) -> dict:
    """
    Reviews all researcher outputs and produces a structured critique.

    Reads state["researcher_outputs"] — all 3 researchers' findings —
    and calls Groq to identify contradictions, weak claims, and gaps.

    Args:
        state: the current GraphState — reads state["question"] and
               state["researcher_outputs"] (all 3 researchers' outputs).
               By the time this node runs, all 3 researchers have finished.

    Returns:
        {"critique": Critique(...)} — merged into GraphState for the Synthesizer.

    Node position in pipeline: runs AFTER all 3 researchers finish, BEFORE synthesizer.
    """

    # Format all researcher findings into one readable prompt section
    findings_text = _format_findings(state)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"""
Original research question: {state['question']}

Researcher Findings:
{findings_text}

Critically evaluate these findings and return your assessment as JSON.
"""),
    ]

    # ainvoke — wait for complete response before parsing
    response = await smart_llm.ainvoke(messages)

    # Strip markdown fences if present (same pattern as researcher.py)
    raw_content = response.content.strip()
    if raw_content.startswith("```"):
        raw_content = raw_content.split("\n", 1)[-1]
        raw_content = raw_content.rsplit("```", 1)[0].strip()

    try:
        data = json.loads(raw_content)

        critique = Critique(
            contradictions=[
                ContradictionRef(
                    claim_a=c["claim_a"],
                    claim_b=c["claim_b"],
                    explanation=c["explanation"],
                )
                for c in data.get("contradictions", [])
            ],
            weak_claims=[
                ClaimRef(claim=w["claim"], reason=w["reason"])
                for w in data.get("weak_claims", [])
            ],
            gaps=data.get("gaps", []),
            needs_followup=[
                # LLMs sometimes return strings instead of dicts here — skip non-dicts
                FollowupRequest(angle_id=f["angle_id"], instruction=f["instruction"])
                for f in data.get("needs_followup", [])
                if isinstance(f, dict) and "angle_id" in f and "instruction" in f
            ],
        )

    except (json.JSONDecodeError, KeyError):
        # If parsing fails, return a minimal critique so the pipeline continues
        critique = Critique(
            contradictions=[],
            weak_claims=[],
            gaps=["Critique generation failed — manual review recommended."],
            needs_followup=[],
        )

    return {"critique": critique}

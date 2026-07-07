# synthesizer.py
# The Synthesizer agent — the final node in the Chorus pipeline.
#
# Responsibility:
#   Takes everything produced by the pipeline — the question, all researcher
#   findings, and the critic's assessment — and assembles a final structured
#   Report that the user actually reads.
#
# Why it runs last:
#   The graph enforces critic → synthesizer ordering. The Synthesizer uses
#   the Critique to decide which findings to trust, which to flag as contested,
#   and what overall confidence level to assign the report.
#
# Why ainvoke (not astream)?
#   The Synthesizer produces a structured Report object. We need the complete
#   JSON before we can validate it with Pydantic and send report.ready.
#
# Model: smart_llm (Llama 3.3 70B)
#   Reconciling contradictions, weighing confidence levels, and producing a
#   coherent structured report requires strong reasoning. Use the 70B model.

import json
from datetime import datetime, timezone
from langchain_core.messages import SystemMessage, HumanMessage

from chorus.graph.state import GraphState
from chorus.llm import smart_llm
from chorus.schemas import Citation, ContestedPoint, Finding, Report


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are a research synthesizer. Your job is to take findings from
multiple researchers and a critic's assessment, then produce a final structured report.

Reconcile contradictions identified by the critic. Highlight contested points where
researchers disagreed. Assign an overall confidence level based on the quality of evidence.

You will be given a numbered list of sources, and each researcher finding will show
which numbered sources back it. Cite sources by number in source_indices — never
invent a source number, never renumber them, never write a URL directly.

Return a JSON object with this exact structure:
{
  "tl_dr": "2-3 sentence summary of the key findings",
  "key_findings": [
    {
      "claim": "A specific, important finding",
      "support": "The evidence behind this finding",
      "confidence": "low" | "medium" | "high",
      "source_indices": [1, 3]
    }
  ],
  "contested_points": [
    {
      "topic": "What the disagreement is about",
      "positions": ["Position A", "Position B"],
      "source_indices": [2, 4]
    }
  ],
  "confidence_overall": "low" | "medium" | "high"
}

Rules:
- tl_dr must be concise — 2-3 sentences maximum
- Include 3-6 key findings — the most important and well-supported ones
- Only include contested_points where there is genuine disagreement
- source_indices must reference the numbered Sources list you were given, and should
  carry forward the source numbers already attached to the researcher findings a claim
  is drawn from — every key finding and contested point should cite at least one
  source wherever the underlying findings had one
- confidence_overall: "high" if most findings are well-supported, "medium" if mixed,
  "low" if findings are mostly speculative or contradictory
- Return ONLY the JSON object. No markdown, no explanation."""


def _format_context(state: GraphState, all_citations: list[Citation]) -> str:
    """
    Formats the full research context — all findings, the critique, and a
    numbered source list — into a single text block for the Synthesizer's
    prompt.

    all_citations must be the same list (same order) that the caller will
    later use to resolve the model's source_indices back into real Citation
    objects — the numbers only mean something if both sides agree on them.
    Each researcher finding is shown with the numbers of its own citations,
    so the model can carry that attribution forward instead of guessing.
    """
    url_to_index = {c.url: i + 1 for i, c in enumerate(all_citations)}

    lines = [f"Research Question: {state['question']}\n"]

    # All researcher findings, each tagged with the numbered sources behind it
    lines.append("## Researcher Findings\n")
    for output in state["researcher_outputs"]:
        lines.append(f"### {output.angle_id}")
        for f in output.findings:
            nums = ", ".join(
                f"[{url_to_index[c.url]}]" for c in f.citations if c.url in url_to_index
            )
            lines.append(f"- [{f.confidence} confidence] {f.claim}" + (f" {nums}" if nums else ""))
            lines.append(f"  Evidence: {f.support[:300]}")
        if output.open_questions:
            lines.append(f"Open questions: {'; '.join(output.open_questions)}")
        lines.append("")

    # Critic's assessment
    critique = state["critique"]
    if critique:
        lines.append("## Critic's Assessment\n")
        if critique.contradictions:
            lines.append("Contradictions identified:")
            for c in critique.contradictions:
                lines.append(f"  - {c.claim_a} ↔ {c.claim_b}: {c.explanation}")
        if critique.weak_claims:
            lines.append("Weak claims flagged:")
            for w in critique.weak_claims:
                lines.append(f"  - {w.claim}: {w.reason}")
        if critique.gaps:
            lines.append("Gaps in coverage:")
            for g in critique.gaps:
                lines.append(f"  - {g}")
        lines.append("")

    # Numbered source list — the model cites by these numbers, not by URL,
    # since reproducing a long URL exactly is unreliable for an LLM.
    lines.append("## Sources")
    for i, c in enumerate(all_citations, 1):
        lines.append(f"[{i}] {c.title or c.url} — {c.url}")

    return "\n".join(lines)


def _collect_all_citations(state: GraphState) -> list[Citation]:
    """Collects all citations from all researcher findings, deduplicating by URL."""
    seen_urls: set[str] = set()
    citations: list[Citation] = []
    for output in state["researcher_outputs"]:
        for finding in output.findings:
            for citation in finding.citations:
                if citation.url not in seen_urls:
                    seen_urls.add(citation.url)
                    citations.append(citation)
    return citations


async def synthesizer_node(state: GraphState) -> dict:
    """
    Assembles the final research report from all agent outputs.

    Reads the full GraphState — question, all researcher outputs, and critique —
    and calls Groq to produce a structured Report object.

    Args:
        state: the current GraphState — reads:
               - state["question"]            : the original user question
               - state["researcher_outputs"]  : all 3 researchers' findings
               - state["critique"]            : the critic's assessment

    Returns:
        {"report": Report(...)} — the final output sent to the frontend as report.ready.

    Node position in pipeline: LAST — runs after the critic finishes.
    """

    # Collect + number all citations FIRST — the same list, in the same
    # order, is used both in the prompt (so the model can cite "[3]") and
    # afterward to resolve the model's cited numbers back into real
    # Citation objects. It also becomes report.sources, so these numbers
    # are exactly the ones the frontend's own citation badges use.
    all_citations = _collect_all_citations(state)
    context = _format_context(state, all_citations)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"{context}\n\nSynthesize these findings into a final report."),
    ]

    # ainvoke — wait for complete structured response
    response = await smart_llm.ainvoke(messages)

    # Strip markdown fences if present
    raw_content = response.content.strip()
    if raw_content.startswith("```"):
        raw_content = raw_content.split("\n", 1)[-1]
        raw_content = raw_content.rsplit("```", 1)[0].strip()

    def _resolve_sources(indices: object) -> list[Citation]:
        """
        Maps the model's 1-based source_indices back to real Citation objects.
        Silently drops anything out of range or the wrong type — the model
        occasionally hallucinates an index or returns something malformed,
        and a citation is worth dropping quietly rather than failing the
        whole report over.
        """
        if not isinstance(indices, list):
            return []
        return [
            all_citations[i - 1]
            for i in indices
            if isinstance(i, int) and 1 <= i <= len(all_citations)
        ]

    try:
        data = json.loads(raw_content)

        # Build Finding objects for key findings
        key_findings = [
            Finding(
                claim=f["claim"],
                support=f["support"],
                citations=_resolve_sources(f.get("source_indices")),
                confidence=f.get("confidence", "medium"),
            )
            for f in data.get("key_findings", [])
        ]

        # Build ContestedPoint objects
        contested_points = [
            ContestedPoint(
                topic=cp["topic"],
                positions=cp["positions"],
                sources=_resolve_sources(cp.get("source_indices")),
            )
            for cp in data.get("contested_points", [])
        ]

        report = Report(
            question=state["question"],
            tl_dr=data.get("tl_dr", ""),
            key_findings=key_findings,
            contested_points=contested_points,
            sources=all_citations,
            confidence_overall=data.get("confidence_overall", "medium"),
            generated_at=datetime.now(tz=timezone.utc),
        )

    except (json.JSONDecodeError, KeyError):
        # If parsing fails, produce a minimal report from raw researcher outputs
        all_findings = [f for o in state["researcher_outputs"] for f in o.findings]
        report = Report(
            question=state["question"],
            tl_dr="Report generation encountered an error. Raw findings are included below.",
            key_findings=all_findings,
            contested_points=[],
            sources=all_citations,
            confidence_overall="low",
            generated_at=datetime.now(tz=timezone.utc),
        )

    return {"report": report}

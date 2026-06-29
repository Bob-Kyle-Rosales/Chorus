# Deterministic follow-up routing — no LLM, no latency.
#
# Decides whether a follow-up question should be answered by:
#   "reasoning" — reasoning over existing findings (fast, 1 credit)
#   "pipeline"  — full new research run (thorough, 5 credits)
#
# Two-signal approach:
#   1. Explicit references: the user says "finding 2", "tell me more", etc.
#      These phrases always signal the user is asking about existing content.
#   2. Keyword overlap: if 30%+ of the content words in the question already
#      appear in the findings text, the topic is covered — use reasoning.
#   3. Default: new topic detected — run a new pipeline.
#
# Why no LLM?
#   LLM routing adds 1-2 seconds of latency before the actual answer starts.
#   A deterministic classifier is instant, predictable, and easier to tune.
#   The threshold (OVERLAP_THRESHOLD) can be adjusted without retraining.

import re
from typing import Literal

# Content-free words excluded from keyword matching — they appear everywhere
# and would falsely inflate overlap scores.
_STOP_WORDS = frozenset({
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "this", "that", "these",
    "those", "its", "their", "our", "your", "his", "her", "and", "or",
    "but", "if", "then", "so", "yet", "not", "no", "in", "on", "at",
    "to", "for", "of", "with", "by", "from", "about", "as", "into",
    "through", "between", "more", "some", "any", "all", "each", "both",
    "also", "just", "than", "too", "very", "still", "now", "here", "there",
    "only", "what", "which", "who", "how", "when", "where", "why",
})

# Phrases that explicitly reference the existing research output.
# Matching any of these always routes to reasoning — the user is clearly
# asking about something they just read.
_REFERENCE_RE = re.compile(
    r"\bfinding\s*\d+"              # "finding 2", "finding #3"
    r"|tell\s+me\s+more"            # "tell me more about..."
    r"|\bexplain\s+that\b"          # "explain that"
    r"|\belaborate\b"               # "elaborate on..."
    r"|\bexpand\s+on\b"             # "expand on..."
    r"|\bwhat\s+does\s+that\s+mean" # "what does that mean"
    r"|\byou\s+mentioned\b"         # "you mentioned earlier"
    r"|\baccording\s+to\b",         # "according to the findings"
    re.IGNORECASE,
)

# Fraction of question keywords that must appear in findings text
# to trigger reasoning instead of a new pipeline run.
OVERLAP_THRESHOLD = 0.30


def _keywords(text: str) -> set[str]:
    """Extract content words: 3+ characters, not stop words, lowercase."""
    return {
        w
        for w in re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        if w not in _STOP_WORDS
    }


def route_followup(question: str, findings_text: str) -> Literal["reasoning", "pipeline"]:
    """
    Classify a follow-up question as needing reasoning or a new pipeline.

    Args:
        question:      the user's follow-up question
        findings_text: pre-joined string of all finding claims + support text
                       from the session's stored report (built in PATCH /sessions/{id}/report)

    Returns:
        "reasoning" if the question is about existing content
        "pipeline"  if it introduces a genuinely new topic
    """
    # Signal 1: explicit reference to existing findings
    if _REFERENCE_RE.search(question):
        return "reasoning"

    # Signal 2: keyword overlap with existing findings
    q_words = _keywords(question)
    if q_words and findings_text:
        f_words = _keywords(findings_text)
        overlap = len(q_words & f_words) / len(q_words)
        if overlap >= OVERLAP_THRESHOLD:
            return "reasoning"

    # Default: new topic — run a fresh pipeline
    return "pipeline"

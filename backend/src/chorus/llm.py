# Shared Groq LLM clients used by all agent nodes.
#
# Two models:
#   fast_llm  — Llama 3.1 8B  (Planner: lighter task, faster, cheaper)
#   smart_llm — Llama 3.1 70B (Researcher, Critic, Synthesizer: heavy reasoning)
#
# Created once at import time and reused across all concurrent runs.
# ChatGroq clients are stateless and safe to share.

from langchain_groq import ChatGroq
from chorus.config import settings

# max_retries: the underlying Groq SDK retries on 429 (rate limit) and 5xx
# errors, honoring the server's Retry-After hint with exponential backoff.
# Without this, a transient rate-limit burst (e.g. parallel researchers across
# concurrent sessions all drawing from the same API key's token budget) raises
# immediately and kills the whole graph run. A short automatic retry resolves
# most of these without any user-visible error.

# Llama 3.1 8B — used for the Planner
# Fast enough that users don't notice the delay before researchers start.
fast_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=settings.groq_api_key,
    temperature=0.3,
    max_retries=4,
)

# Llama 3.1 70B — used for Researcher, Critic, Synthesizer
# Significantly smarter for multi-step reasoning and structured output.
smart_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=settings.groq_api_key,
    temperature=0.3,
    max_retries=4,
)
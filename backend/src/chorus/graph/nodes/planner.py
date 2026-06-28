# planner.py
# The Planner agent — the first node in the Chorus pipeline.
#
# Responsibility:
#   Receives the user's question and calls Groq to intelligently decompose
#   it into 3 distinct investigative angles. Each angle becomes a brief
#   for one Researcher agent.
#
# Why ainvoke (not astream)?
#   The Planner produces a short structured JSON response — the list of angles.
#   We need the complete JSON before we can parse and validate it with Pydantic.
#   Streaming partial JSON would be invalid and unparseable mid-stream.
#   ainvoke waits for the full response and returns it at once.
#
# Model: fast_llm (Llama 3.1 8B)
#   The Planner's task is relatively simple — decompose a question into angles.
#   The 8B model is fast and cheap enough for this, and its speed means
#   researchers start sooner, improving the overall run latency.

import json                                    # parses the JSON string returned by the LLM
from langchain_core.messages import SystemMessage, HumanMessage  # structures the prompt

from chorus.graph.state import GraphState      # shared state passed between all nodes
from chorus.llm import fast_llm               # Groq Llama 3.1 8B client
from chorus.schemas import AnglePlan           # Pydantic model for one investigative angle


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
# The system prompt tells the LLM exactly what role it plays and what format
# to return. Being explicit about the JSON structure and constraints
# (exactly 3, no markdown, no explanation) reduces parsing failures.
SYSTEM_PROMPT = """You are a research planner for a multi-agent research system.

Given a research question, decompose it into exactly 3 distinct investigative angles.
Each angle should explore a genuinely different dimension of the question —
for example: technical, historical, economic, ethical, or comparative.

Return a JSON array of exactly 3 objects with this exact structure:
[
  {
    "angle_id": "short_snake_case_identifier",
    "brief": "1-2 sentence instruction telling the researcher exactly what to investigate",
    "search_seeds": ["specific search query 1", "specific search query 2"]
  }
]

Rules:
- Return ONLY the JSON array. No explanation, no markdown, no code blocks.
- Each angle_id must be unique and descriptive (e.g. "technical", "historical", "economic")
- Each brief must be specific to the question — not generic instructions
- Each search_seeds list must have 2 targeted queries relevant to that angle"""


async def planner_node(state: GraphState) -> dict:
    """
    Decomposes the user's question into 3 investigative angles using Groq.

    Calls fast_llm (Llama 3.1 8B) with the question and a structured prompt
    that instructs the model to return a JSON array of AnglePlan objects.

    Args:
        state: the current GraphState — we read state["question"] from it

    Returns:
        A dict with "angles" key containing a list of 3 AnglePlan objects.
        LangGraph merges this into GraphState so researchers can access
        state["angles"][0], state["angles"][1], state["angles"][2].

    Node position in pipeline: FIRST — runs before any researchers.
    Raises: json.JSONDecodeError if the LLM returns malformed JSON
            ValidationError if the JSON doesn't match the AnglePlan schema
    """

    # Build the prompt.
    # SystemMessage sets the LLM's role and output format expectations.
    # HumanMessage carries the actual question to decompose.
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Research question: {state['question']}"),
    ]

    # Call Groq and wait for the complete response.
    # ainvoke() blocks until the full response arrives — appropriate here
    # because we need complete JSON before we can parse it.
    response = await fast_llm.ainvoke(messages)

    # response.content is a plain string containing the JSON array.
    # json.loads() parses it into a Python list of dicts.
    raw = json.loads(response.content)

    # Validate each dict against the AnglePlan Pydantic schema.
    # model_validate() raises ValidationError if any field is missing or wrong type.
    # This ensures downstream nodes always receive properly typed AnglePlan objects,
    # not raw dicts that could silently break later.
    angles = [AnglePlan.model_validate(item) for item in raw]

    return {"angles": angles}

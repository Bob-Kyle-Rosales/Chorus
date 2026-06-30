# researcher.py
# The Researcher agent — the core of the Chorus pipeline.
#
# Responsibility:
#   Receives one investigative angle and independently researches it.
#   Searches the web, fetches and reads source pages, then uses Groq
#   to analyze the content and extract structured findings with citations.
#
# Key design rule:
#   Researchers CANNOT see each other's outputs. Each researcher only
#   reads its own assigned angle and the global question. This preserves
#   independence — each angle gets an unbiased investigation.
#
# Three sub-steps:
#   A) Search  — Tavily finds relevant pages for the angle's search seeds
#   B) Fetch   — httpx retrieves page content; trafilatura extracts clean text
#   C) Analyze — Two Groq calls:
#                  1. smart_llm.astream() → streams reasoning tokens to frontend (live typing)
#                  2. smart_llm.ainvoke() → extracts structured JSON findings from the reasoning
#
# Why two LLM calls in step C?
#   The first call streams token-by-token to the frontend so users see the agent
#   "thinking" in real time. But streaming produces free-form text, not structured JSON.
#   The second call takes that reasoning and extracts clean structured findings
#   that the Critic can reliably parse and challenge.
#
# Security:
#   - assert_safe_url() blocks SSRF before every fetch (see security/fetch_guard.py)
#   - wrap_untrusted() tags all fetched content as data-not-instructions (see security/untrusted.py)

import json
from datetime import datetime, timezone

import httpx                    # async HTTP client for fetching web pages
import trafilatura              # extracts clean article text from raw HTML

from langchain_core.messages import SystemMessage, HumanMessage

from chorus.config import settings
from chorus.graph.state import GraphState
from chorus.llm import smart_llm
from chorus.schemas import Citation, Finding, ResearcherOutput
from chorus.security.fetch_guard import UnsafeURLError, assert_safe_url
from chorus.security.untrusted import wrap_untrusted


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

# First LLM call — free-form reasoning streamed to the frontend.
# The researcher thinks through the sources and synthesizes what it found.
REASONING_PROMPT = """You are a research agent investigating one specific angle of a question.

You have been given search results and page content from the web.
Carefully read all the sources, then write a detailed analytical summary of what you found.

Be thorough — explain what the evidence says, where sources agree, where they conflict,
and what remains uncertain. Write in flowing prose, not bullet points.
Cite specific facts from the sources as you write."""

# Second LLM call — structured extraction from the reasoning.
# Takes the free-form reasoning and converts it into typed Finding objects.
EXTRACTION_PROMPT = """You are a data extraction agent.

Given a research analysis, extract structured findings from it.
Return a JSON object with this exact structure:
{
  "findings": [
    {
      "claim": "A single specific, verifiable claim",
      "support": "The evidence from the sources that backs this claim",
      "confidence": "low" | "medium" | "high"
    }
  ],
  "open_questions": ["Question the research couldn't fully answer"]
}

Rules:
- Extract 2-4 findings maximum — quality over quantity
- Each claim must be a single, specific assertion (not a general statement)
- confidence "high" = multiple strong sources agree
- confidence "medium" = some support but gaps exist
- confidence "low" = speculative or weakly supported
- Return ONLY the JSON object. No markdown, no explanation."""


# ---------------------------------------------------------------------------
# Researcher node
# ---------------------------------------------------------------------------

async def researcher_node(state: GraphState, angle_index: int = 0) -> dict:
    """
    Investigates one angle of the user's question and returns structured findings.

    Sub-steps:
      A) Tavily search using the angle's search_seeds
      B) Fetch and extract top result pages (with SSRF guard + injection protection)
      C) Stream reasoning to frontend, then extract structured findings

    Args:
        state:       the current GraphState — reads state["question"] and state["angles"]
        angle_index: which angle this researcher is responsible for (0, 1, or 2).
                     Pre-filled via functools.partial in graph.py.

    Returns:
        {"researcher_outputs": [ResearcherOutput(...)]}
        Wrapped in a list so the operator.add reducer in GraphState
        appends it to the other researchers' outputs without overwriting.

    Node position in pipeline: runs AFTER planner, BEFORE critic.
    3 instances run in parallel (researcher_0, researcher_1, researcher_2).
    """

    # Get this researcher's assigned angle.
    # Each of the 3 parallel researchers gets a different index.
    angle = state["angles"][angle_index]

    # ------------------------------------------------------------------
    # Sub-step A: Search with Tavily
    # ------------------------------------------------------------------
    # Import here (not at module level) so the module loads even if
    # TAVILY_API_KEY is not set — the error only appears when a run starts.
    from tavily import TavilyClient
    tavily = TavilyClient(api_key=settings.tavily_api_key)

    # Search with ALL seeds and combine results.
    # Each seed targets a different facet of the angle — using all of them
    # gives the researcher broader, more diverse sources to reason from.
    # max_results=3 per seed keeps the total manageable (3 seeds × 3 = up to 9 results).
    all_results = []
    for seed in angle.search_seeds:
        seed_results = tavily.search(query=seed, max_results=3)
        all_results.extend(seed_results.get("results", []))

    # Deduplicate by URL — the same page can appear across multiple seed searches.
    # We keep the first occurrence and skip subsequent duplicates.
    seen_urls: set[str] = set()
    results = []
    for r in all_results:
        url = r.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            results.append(r)

    # ------------------------------------------------------------------
    # Sub-step B: Fetch and extract page content
    # ------------------------------------------------------------------
    # For each result, we:
    #   1. Validate the URL (SSRF guard — blocks internal/private addresses)
    #   2. Fetch the page with httpx
    #   3. Extract clean text with trafilatura (strips ads, nav, boilerplate)
    #   4. Wrap in untrusted content delimiters (prompt injection protection)
    sources_text = ""     # accumulates all fetched content for the LLM prompt
    citations = []        # tracks source metadata for structured output

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        for result in results[:3]:    # top 3 results — balances coverage vs context length
            url = result.get("url", "")
            title = result.get("title", "")
            snippet = result.get("content", "")

            try:
                # SSRF guard — raises UnsafeURLError for private/internal addresses
                assert_safe_url(url)

                # Fetch the page
                response = await client.get(url)
                response.raise_for_status()

                # Extract clean article text from HTML.
                # trafilatura removes navigation, ads, footers, and other noise.
                raw_html = response.text
                extracted = trafilatura.extract(raw_html) or snippet   # fall back to snippet if extraction fails
                extracted = extracted[:settings.max_fetch_bytes]       # cap size

                # Wrap in safety delimiters before adding to the prompt.
                # This tells the LLM: "this is data to analyze, not instructions to follow"
                sources_text += wrap_untrusted(url, extracted) + "\n\n"

                # Record citation metadata for the structured output
                citations.append(Citation(
                    url=url,
                    title=title,
                    snippet=snippet[:500],
                    retrieved_at=datetime.now(tz=timezone.utc),
                ))

            except (UnsafeURLError, httpx.HTTPError, Exception):
                # Skip this URL — unsafe address, network error, or extraction failure.
                # We have fallback results so a failed fetch doesn't break the run.
                continue

    # Fall back to Tavily snippets if all fetches failed
    if not sources_text:
        for result in results[:3]:
            sources_text += f"Source: {result.get('url', '')}\n{result.get('content', '')}\n\n"
            citations.append(Citation(
                url=result.get("url", ""),
                title=result.get("title", ""),
                snippet=result.get("content", "")[:500],
                retrieved_at=datetime.now(tz=timezone.utc),
            ))

    # ------------------------------------------------------------------
    # Sub-step C: Analyze with Groq — two LLM calls
    # ------------------------------------------------------------------
    # Wrapped in try/except so a Groq API failure (rate limit exhausted after
    # retries, network error, etc.) degrades THIS ONE researcher to a stub
    # finding instead of crashing the entire graph run. Without this, one
    # researcher's transient failure throws away the other researchers'
    # completed work and kills the whole session — easy to trigger when
    # parallel researchers across concurrent sessions burst past Groq's TPM
    # rate limit (all sessions share one API key's token budget).
    try:
        # --- First call: stream reasoning to the frontend ---
        # This is what produces the live typing effect in the researcher's card.
        # astream() yields tokens one at a time as Groq generates them.
        # The tokens flow to the frontend via astream_events in routes.py —
        # this node does NOT call send() directly (Observer pattern handles it).
        reasoning_messages = [
            SystemMessage(content=REASONING_PROMPT),
            HumanMessage(content=f"""
Angle to investigate: {angle.brief}
Original question: {state['question']}

Sources:
{sources_text}

Write your analytical findings based on these sources.
"""),
        ]

        # Accumulate the streamed tokens into a full reasoning text.
        # The tokens themselves are forwarded to the frontend by astream_events in routes.py.
        accumulated_reasoning = ""
        async for chunk in smart_llm.astream(reasoning_messages):
            accumulated_reasoning += chunk.content

        # --- Second call: extract structured findings from the reasoning ---
        # ainvoke() here (not astream) because we need complete JSON, not a stream.
        # The reasoning text from the first call is the input — this call distills
        # the free-form analysis into typed Finding objects the Critic can work with.
        extraction_messages = [
            SystemMessage(content=EXTRACTION_PROMPT),
            HumanMessage(content=f"Research analysis to extract findings from:\n\n{accumulated_reasoning}"),
        ]

        extraction_response = await smart_llm.ainvoke(extraction_messages)

        # Strip markdown code fences if the LLM wrapped the JSON despite instructions.
        # e.g. ```json\n{...}\n``` → {...}
        raw_content = extraction_response.content.strip()
        if raw_content.startswith("```"):
            # Remove opening fence (```json or ```)
            raw_content = raw_content.split("\n", 1)[-1]
            # Remove closing fence
            raw_content = raw_content.rsplit("```", 1)[0].strip()

        # Parse the JSON and build Finding objects with citations attached
        try:
            extracted = json.loads(raw_content)
            findings = [
                Finding(
                    claim=f["claim"],
                    support=f["support"],
                    citations=citations,    # attach all sources to every finding
                    confidence=f.get("confidence", "medium"),
                )
                for f in extracted.get("findings", [])
            ]
            open_questions = extracted.get("open_questions", [])
        except (json.JSONDecodeError, KeyError):
            # If structured extraction fails, create one finding from the raw reasoning
            findings = [Finding(
                claim=f"Research findings for {angle.angle_id}",
                support=accumulated_reasoning[:1000],
                citations=citations,
                confidence="low",
            )]
            open_questions = ["Structured extraction failed — findings may be incomplete."]

    except Exception:
        # Groq call failed outright (rate limit exhausted, network error, etc.)
        # even after the client's built-in retries. Degrade this researcher to
        # a stub finding so the Critic and Synthesizer can still produce a
        # report from the other researchers' real findings.
        findings = [Finding(
            claim=f"Research on '{angle.angle_id}' could not be completed",
            support=(
                "This angle's analysis failed due to a temporary issue with the "
                "research service (e.g. rate limiting). The other angles below "
                "were not affected. Consider re-running this research."
            ),
            citations=citations,
            confidence="low",
        )]
        open_questions = [f"Analysis for '{angle.angle_id}' failed — consider re-running this research."]

    # Return wrapped in a list — the operator.add reducer in GraphState
    # appends this to the other researchers' outputs without overwriting.
    return {
        "researcher_outputs": [
            ResearcherOutput(
                angle_id=angle.angle_id,
                findings=findings,
                open_questions=open_questions,
            )
        ]
    }

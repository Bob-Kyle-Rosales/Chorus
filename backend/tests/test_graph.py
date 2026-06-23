import pytest
from chorus.graph.graph import build_graph
from chorus.graph.state import GraphState

@pytest.mark.asyncio
async def test_graph_runs_to_completion():
    graph = build_graph()
    initial: GraphState = {
        "question": "What is quantum computing?",
        "run_id": "test-run-1",
        "angles": [],
        "researcher_outputs": [],
        "critique": None,
        "report": None,
    }
    result = await graph.ainvoke(initial)
    assert result["report"] is not None
    assert result["critique"] is not None
    assert len(result["angles"]) == 3
    assert len(result["researcher_outputs"]) == 3


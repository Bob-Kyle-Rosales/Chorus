# graph.py
# Wires all the agent nodes together into an executable LangGraph pipeline.
#
# This file defines the STRUCTURE of the Chorus pipeline:
#   - Which nodes exist
#   - Which order they run in
#   - Which nodes run in parallel
#
# It does NOT define what each node does — that's in nodes/*.py.
# Think of this as the blueprint; the node files are the rooms.
#
# Pipeline shape:
#
#                    planner
#                      │
#          ┌───────────┼───────────┐
#          ▼           ▼           ▼
#     researcher_0  researcher_1  researcher_2   (run in PARALLEL)
#          │           │           │
#          └───────────┼───────────┘
#                      ▼
#                    critic                       (waits for ALL 3)
#                      │
#                      ▼
#                  synthesizer
#                      │
#                      ▼
#                     END

from functools import partial          # lets us pre-fill function arguments (angle_index)
from langgraph.graph import StateGraph, END  # StateGraph = the graph builder; END = terminal node marker
from chorus.graph.state import GraphState   # the shared data structure passed between nodes
from chorus.graph.nodes.planner import planner_node
from chorus.graph.nodes.researcher import researcher_node
from chorus.graph.nodes.critic import critic_node
from chorus.graph.nodes.synthesizer import synthesizer_node


def build_graph():
    """
    Constructs and compiles the Chorus LangGraph pipeline.

    Returns:
        A compiled LangGraph graph ready to execute.
        Call graph.ainvoke(initial_state) or graph.astream(initial_state)
        to run it with a specific research question.

    Why compiled?
        Compilation validates the graph structure (catches missing nodes,
        dangling edges) and prepares an optimized execution plan.
        The compiled graph is stateless — safe to reuse across all users.
        Each call to ainvoke/astream gets its own fresh GraphState.

    Called once at server startup (in main.py lifespan) and stored
    in app.state.graph for reuse across all WebSocket connections.
    """

    # Create a new graph builder that uses GraphState as its state schema.
    # StateGraph knows which fields exist, their types, and how to merge
    # parallel writes (via the Annotated reducer on researcher_outputs).
    graph = StateGraph(GraphState)

    # -----------------------------------------------------------------------
    # Register nodes
    # Each node is an async function that receives GraphState and returns
    # a dict of the fields it wants to update.
    # -----------------------------------------------------------------------

    graph.add_node("planner", planner_node)

    # The 3 researcher nodes all call the same researcher_node function,
    # but each gets a different angle_index pre-filled via partial().
    #
    # partial(researcher_node, angle_index=0) creates a new callable that,
    # when called with just `state`, runs researcher_node(state, angle_index=0).
    # This is how we reuse one function for 3 parallel nodes.
    graph.add_node("researcher_0", partial(researcher_node, angle_index=0))
    graph.add_node("researcher_1", partial(researcher_node, angle_index=1))
    graph.add_node("researcher_2", partial(researcher_node, angle_index=2))

    graph.add_node("critic", critic_node)
    graph.add_node("synthesizer", synthesizer_node)

    # -----------------------------------------------------------------------
    # Define the entry point
    # This is where execution begins when ainvoke/astream is called.
    # -----------------------------------------------------------------------
    graph.set_entry_point("planner")

    # -----------------------------------------------------------------------
    # Fan-out: planner → 3 researchers in PARALLEL
    # Adding 3 edges from "planner" tells LangGraph to run all 3 researcher
    # nodes simultaneously after the planner finishes.
    # They don't wait for each other — they run at the same time.
    # -----------------------------------------------------------------------
    graph.add_edge("planner", "researcher_0")
    graph.add_edge("planner", "researcher_1")
    graph.add_edge("planner", "researcher_2")

    # -----------------------------------------------------------------------
    # Fan-in: all 3 researchers → critic
    # LangGraph waits until ALL THREE researchers have finished before
    # running the critic. The operator.add reducer in GraphState collects
    # all 3 outputs into researcher_outputs as they complete.
    # -----------------------------------------------------------------------
    graph.add_edge("researcher_0", "critic")
    graph.add_edge("researcher_1", "critic")
    graph.add_edge("researcher_2", "critic")

    # -----------------------------------------------------------------------
    # Linear: critic → synthesizer → END
    # These run sequentially after the fan-in completes.
    # END is a special LangGraph marker that signals the graph is finished.
    # -----------------------------------------------------------------------
    graph.add_edge("critic", "synthesizer")
    graph.add_edge("synthesizer", END)

    # Compile validates the structure and returns an executable graph object.
    return graph.compile()

from datetime import datetime, timezone
from chorus.schemas import AnglePlan, Report


def test_angle_plan_roundtrip():
    data = {"angle_id": "technical", "brief": "Examine X", "search_seeds": ["X overview"]}
    plan = AnglePlan.model_validate(data)
    assert plan.angle_id == "technical"
    assert plan.search_seeds == ["X overview"]


def test_report_roundtrip():
    report = Report(
        question="What is X?",
        tl_dr="X is Y.",
        key_findings=[],
        contested_points=[],
        sources=[],
        confidence_overall="medium",
        generated_at=datetime.now(tz=timezone.utc),
    )
    assert report.confidence_overall == "medium"

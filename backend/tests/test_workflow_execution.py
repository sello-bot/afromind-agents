from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.session import Base
from app.execution.models import NodeExecution, WorkflowExecution
from app.execution.service import execute_workflow
from app.workflows.models import Workflow


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def workflow(provider="groq", model="openai/gpt-oss-20b"):
    return Workflow(
        name="Integration test",
        description="",
        nodes=[
            {"id": "trigger", "data": {"nodeType": "trigger"}},
            {"id": "agent", "data": {"nodeType": "agent", "agentConfig": {
                "instructions": "Qualify this lead.", "provider": provider,
                "model": model, "temperature": 0.2, "maxTokens": 500}}},
            {"id": "output", "data": {"nodeType": "output"}},
        ],
        edges=[
            {"source": "trigger", "target": "agent"},
            {"source": "agent", "target": "output"},
        ],
    )


@pytest.mark.parametrize(("provider", "model"), [
    ("groq", "openai/gpt-oss-20b"),
    ("openai", "gpt-4o-mini"),
])
def test_provider_execution_and_history(db, provider, model):
    wf = workflow(provider, model)
    db.add(wf)
    db.commit()
    answer = {"mode": "ai", "provider": provider, "model": model, "response": "Qualified"}
    with patch("app.execution.service.generate_ai_response", return_value=answer) as ai:
        result = execute_workflow(db, wf, {"lead": "Example Ltd"})

    assert result["status"] == "completed"
    assert result["output_data"] == {"result": answer}
    assert [n["status"] for n in result["nodes"]] == ["completed"] * 3
    ai.call_args.kwargs == {
        "instructions": "Qualify this lead.",
        "user_input": {"received": {"lead": "Example Ltd"}},
        "provider": provider, "model": model,
        "temperature": 0.2, "max_tokens": 500,
    }
    saved = db.get(WorkflowExecution, result["id"])
    nodes = db.query(NodeExecution).filter_by(execution_id=result["id"]).all()
    assert saved.status == "completed"
    assert len(nodes) == 3
    assert saved.output_data == {"result": answer}


def test_provider_failure_is_persisted(db):
    wf = workflow()
    db.add(wf)
    db.commit()
    with patch("app.execution.service.generate_ai_response", side_effect=RuntimeError("Groq returned HTTP 503.")):
        result = execute_workflow(db, wf, {"lead": "Example"})

    assert result["status"] == "failed"
    assert "HTTP 503" in result["error"]
    agent = next(n for n in result["nodes"] if n["node_id"] == "agent")
    assert agent["status"] == "failed"
    assert "HTTP 503" in agent["error"]

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.workflows.models import Workflow
from app.execution.graph import (
    validate_and_order,
    WorkflowValidationError,
)
from app.execution.models import (
    WorkflowExecution,
    NodeExecution,
)
from app.integrations.ai_provider import generate_ai_response


def utc_now():
    return datetime.now(timezone.utc)


def serialize_execution(db: Session, execution: WorkflowExecution):
    node_records = (
        db.query(NodeExecution)
        .filter(NodeExecution.execution_id == execution.id)
        .order_by(NodeExecution.started_at.asc())
        .all()
    )

    return {
        "id": execution.id,
        "workflow_id": execution.workflow_id,
        "status": execution.status,
        "input_data": execution.input_data,
        "output_data": execution.output_data,
        "error": execution.error,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "nodes": [
            {
                "id": item.id,
                "node_id": item.node_id,
                "node_type": item.node_type,
                "status": item.status,
                "input_data": item.input_data,
                "output_data": item.output_data,
                "error": item.error,
                "started_at": item.started_at,
                "completed_at": item.completed_at,
            }
            for item in node_records
        ],
    }


def execute_workflow(
    db: Session,
    workflow: Workflow,
    input_data: dict,
):
    order = validate_and_order(workflow.nodes, workflow.edges)

    execution = WorkflowExecution(
        workflow_id=workflow.id,
        status="running",
        input_data=input_data,
        started_at=utc_now(),
    )

    db.add(execution)
    db.commit()
    db.refresh(execution)

    node_map = {
        node["id"]: node
        for node in workflow.nodes
    }

    incoming_edges = {}
    for edge in workflow.edges:
        incoming_edges.setdefault(edge["target"], []).append(
            edge["source"]
        )

    node_outputs = {}
    final_output = None

    try:
        for node_id in order:
            node = node_map[node_id]
            node_type = node["data"]["nodeType"]

            predecessors = incoming_edges.get(node_id, [])

            if node_type == "trigger":
                current_input = input_data
            elif len(predecessors) == 1:
                current_input = node_outputs[predecessors[0]]
            else:
                current_input = {
                    source: node_outputs[source]
                    for source in predecessors
                }

            record = NodeExecution(
                execution_id=execution.id,
                node_id=node_id,
                node_type=node_type,
                status="running",
                input_data=current_input,
                started_at=utc_now(),
            )

            db.add(record)
            db.commit()
            db.refresh(record)

            try:
                if node_type == "trigger":
                    result = {
                        "received": current_input,
                    }

                elif node_type == "agent":
                    agent_config = (
                        node.get("data", {}).get("agentConfig", {}) or {}
                    )

                    instructions = agent_config.get(
                        "instructions",
                        "You are a helpful AI agent. Process the input accurately.",
                    )

                    result = generate_ai_response(
                        instructions=instructions,
                        user_input=current_input,
                        provider=agent_config.get(
                            "provider",
                            "groq",
                        ),
                        model=agent_config.get("model"),
                        temperature=float(
                            agent_config.get("temperature", 0.3)
                        ),
                        max_tokens=int(
                            agent_config.get("maxTokens", 1000)
                        ),
                    )

                elif node_type == "condition":
                    # Conditions will gain configurable rules
                    # and branching in a later stage.
                    result = {
                        "mode": "pass_through",
                        "condition_evaluated": False,
                        "data": current_input,
                    }

                elif node_type == "tool":
                    raise RuntimeError(
                        "Tool execution is not enabled yet. "
                        "Approved tool adapters are required."
                    )

                elif node_type == "output":
                    result = {
                        "result": current_input,
                    }
                    final_output = result

                else:
                    raise RuntimeError(
                        f"Unsupported node type: {node_type}"
                    )

                record.output_data = result
                record.status = "completed"
                record.completed_at = utc_now()

                node_outputs[node_id] = result
                db.commit()

            except Exception as node_error:
                record.status = "failed"
                record.error = str(node_error)
                record.completed_at = utc_now()
                db.commit()
                raise

        execution.status = "completed"
        execution.output_data = final_output or {}
        execution.completed_at = utc_now()
        db.commit()

    except Exception as error:
        execution.status = "failed"
        execution.error = str(error)
        execution.completed_at = utc_now()
        db.commit()

    db.refresh(execution)
    return serialize_execution(db, execution)

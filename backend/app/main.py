from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import Base, engine
from app.workflows import models
from app.execution import models as execution_models
from app.execution.routes import router as executions_router
from app.workflows.routes import router as workflows_router


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    version="0.3.0",
    description="Workflow orchestration API for Afromind Agents",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.cors_origins.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflows_router)
app.include_router(executions_router)


@app.get("/")
def root():
    return {
        "service": "afromind-agents",
        "message": "Afromind Agents API",
    }


@app.get("/health")
def health():
    configured_providers = []

    if settings.groq_api_key:
        configured_providers.append("groq")

    if settings.openai_api_key:
        configured_providers.append("openai")

    return {
        "status": "healthy",
        "service": "afromind-agents",
        "environment": settings.environment,
        "ai_configured": bool(configured_providers),
        "ai_providers": configured_providers,
        "default_ai_provider": settings.default_ai_provider,
    }

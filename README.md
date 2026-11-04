# Afromind Agents

A visual AI agent orchestration platform for building, configuring, and executing intelligent workflows.

## Technology
- Frontend: Next.js 14, React, TypeScript, Tailwind CSS, React Flow
- Backend: FastAPI, SQLAlchemy, Python
- AI providers: Groq and OpenAI
- Database: SQLite for local development; PostgreSQL supported

## Features
- Visual workflow builder with connected nodes
- Configurable AI agents and provider-specific models
- Workflow execution engine
- Execution history and node-level results
- Backend-managed AI credentials

## Backend setup

    cd backend
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Configure provider API keys in backend/.env. Never commit secrets.

## Frontend setup

    cd frontend
    npm install
    cp .env.example .env.local
    npm run dev

Set NEXT_PUBLIC_API_URL to your backend URL.

API documentation: http://localhost:8000/docs

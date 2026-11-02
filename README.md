# Afromind Agents

Visual AI agent orchestration platform for businesses and developers.

## Stack
- Frontend: Next.js 14, React, Tailwind CSS, React Flow (`@xyflow/react`)
- Backend: FastAPI, SQLAlchemy
- Infrastructure: PostgreSQL and Redis (Docker Compose)

## Quick start

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000.

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### Infrastructure
```bash
docker compose up -d
```

The initial workflow builder is a UI foundation. Workflow persistence and safe execution are planned milestones; no arbitrary tool execution is enabled in this starter.

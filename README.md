# TrackBridge

TrackBridge is a self-hosted email tracking platform inspired by mxHERO TotalTrack and Mailtrack, built with FastAPI, React, PostgreSQL, Redis, and Caddy.

## Sprint 1 scope

- Docker Compose infrastructure
- FastAPI backend with OpenAPI docs
- React + Vite + TypeScript frontend
- JWT authentication
- Modern dashboard
- Black theme, #ddff24 accent, JetBrains Mono
- PostgreSQL and Redis services
- Local attachment storage folder for future tracked attachments
- GitHub Actions CI for backend and frontend

## Quick start

1. Copy the environment file.

```bash
cp .env.example .env
```

2. Start the stack.

```bash
docker compose up --build
```

3. Open the app.

- Frontend: http://localhost
- API docs: http://localhost/docs
- Health: http://localhost/api/v1/health

## Local backend development

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Local frontend development

```bash
cd frontend
npm install
npm run dev
```

## Production notes

Change `TRACKBRIDGE_SECRET_KEY`, database credentials, and `TRACKBRIDGE_DOMAIN` before deployment. Caddy will manage HTTPS automatically when the domain points to the server and ports 80/443 are reachable.

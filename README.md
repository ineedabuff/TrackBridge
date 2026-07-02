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

## Sprint 2 scope

- Tracked email records
- Public tracking pixel endpoint at `/t/{token}.gif`
- Open event capture with IP address, user-agent, referer, and timestamp
- Authenticated API to generate pixel HTML
- Dashboard counters backed by real tracking data
- Recent tracked emails list with open counts

## Sprint 3 scope

- Tracked link records
- Public click redirect endpoint at `/c/{token}`
- Click event capture with IP address, user-agent, referer, and timestamp
- Authenticated API to generate redirect URLs and link HTML
- Dashboard click counters backed by real tracking data
- Recent tracked links list with click counts

## Quick start

1. Copy the environment file.

```bash
cp .env.example .env
```

2. Update production values in `.env`.

```env
TRACKBRIDGE_DOMAIN=trackbridge.example.com
TRACKBRIDGE_ACME_EMAIL=admin@example.com
TRACKBRIDGE_PUBLIC_BASE_URL=https://trackbridge.example.com
TRACKBRIDGE_SECRET_KEY=change-me-before-production
POSTGRES_PASSWORD=change-me
TRACKBRIDGE_DATABASE_URL=postgresql+psycopg://trackbridge:change-me@postgres:5432/trackbridge
```

3. Start the stack.

```bash
docker compose up --build -d
```

4. Open the app.

- Frontend: http://localhost
- API docs: http://localhost/docs
- Health: http://localhost/api/v1/health

## Tracking pixel flow

1. Sign in.
2. Open the Pixels section in the dashboard.
3. Enter a recipient and subject.
4. Copy the generated HTML image tag into an email body.
5. When the email client loads the image, TrackBridge records an open event.

## Click tracking flow

1. Sign in.
2. Open the Clicks section in the dashboard.
3. Enter a label and destination URL.
4. Copy the generated redirect URL into an email link.
5. When someone clicks it, TrackBridge records the click and redirects to the destination.

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
pnpm install
pnpm dev
```

## Production notes

Change `TRACKBRIDGE_SECRET_KEY`, database credentials, `TRACKBRIDGE_DOMAIN`, `TRACKBRIDGE_ACME_EMAIL`, and `TRACKBRIDGE_PUBLIC_BASE_URL` before deployment. Caddy will manage HTTPS automatically when the domain points to the server and ports 80/443 are reachable.

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

## Sprint 4 scope

- Local tracked attachment storage
- Public tracked attachment download endpoint at `/a/{token}`
- Download event capture with IP address, user-agent, referer, and timestamp
- Authenticated API to upload files and generate tracked download URLs
- Dashboard download counters backed by real tracking data
- Recent tracked attachments list with download counts

## Sprint 5 scope

- Chrome extension using Manifest V3
- Popup login/configuration for self-hosted TrackBridge
- Gmail content script with a floating TrackBridge panel
- Insert tracking pixels into Gmail compose windows
- Generate and insert tracked links into Gmail compose windows
- Quick dashboard access from Gmail and the extension popup

## Sprint 6 scope

- Analytics overview API at `/api/v1/analytics/overview`
- Engagement rates for opens, clicks, and downloads
- Seven-day activity trend
- Recent activity timeline across all signal types
- Top tracked items by event volume
- Dashboard analytics panel with compact operational views


## Sprint 7 scope

- Report preferences API at `/api/v1/reports/preferences`
- Manual report generation at `/api/v1/reports/send-now`
- Report delivery history at `/api/v1/reports/history`
- SMTP-ready email delivery with plain text and HTML reports
- Dashboard Reports panel with daily, weekly, and immediate alert preferences
- Safe preview mode when SMTP is not configured

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
TRACKBRIDGE_SMTP_HOST=smtp.example.com
TRACKBRIDGE_SMTP_PORT=587
TRACKBRIDGE_SMTP_USERNAME=mailer@example.com
TRACKBRIDGE_SMTP_PASSWORD=change-me
TRACKBRIDGE_SMTP_FROM=TrackBridge <mailer@example.com>
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

## Attachment tracking flow

1. Sign in.
2. Open the Attachments section in the dashboard.
3. Upload a file with a link label.
4. Copy the generated download URL into an email link.
5. When someone downloads it, TrackBridge records the event and serves the file.


## Email reports flow

1. Sign in.
2. Open the Reports section in the dashboard.
3. Choose the recipient and report preferences.
4. Click Send now to generate a report preview or send it through SMTP.
5. Add SMTP values in `.env` when you are ready for real email delivery.

## Chrome extension development

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `extension` folder.
5. Open the extension popup and sign in with your TrackBridge URL.
6. Open Gmail and use the TrackBridge panel in the bottom-right corner.

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

Change `TRACKBRIDGE_SECRET_KEY`, database credentials, `TRACKBRIDGE_DOMAIN`, `TRACKBRIDGE_ACME_EMAIL`, and `TRACKBRIDGE_PUBLIC_BASE_URL` before deployment. Set `TRACKBRIDGE_SMTP_HOST`, `TRACKBRIDGE_SMTP_USERNAME`, `TRACKBRIDGE_SMTP_PASSWORD`, and `TRACKBRIDGE_SMTP_FROM` when you want TrackBridge to send reports by email. Caddy will manage HTTPS automatically when the domain points to the server and ports 80/443 are reachable.

Tracked files are stored locally under `storage/attachments` by default. This path is mounted into the backend container and can later be replaced by an S3-compatible backend.



import {
  Activity,
  ArrowRight,
  Copy,
  LogOut,
  MailCheck,
  Radar,
  Send,
  ShieldCheck
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { MetricCard } from "./components/MetricCard";
import {
  AuthMode,
  DashboardSummary,
  TrackedEmail,
  User,
  authenticate,
  createTrackedEmail,
  getDashboardSummary,
  listTrackedEmails
} from "./lib/api";
import "./styles/app.css";

const demoStats = [
  { label: "Tracked emails", key: "tracked_emails" },
  { label: "Opens", key: "opens" },
  { label: "Clicks", key: "clicks" },
  { label: "Attachments", key: "attachments" }
] as const;

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [token, setToken] = useState(() => localStorage.getItem("trackbridge_token") ?? "");
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("trackbridge_user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trackedEmails, setTrackedEmails] = useState<TrackedEmail[]>([]);
  const [generatedPixel, setGeneratedPixel] = useState<TrackedEmail | null>(null);
  const [error, setError] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingPixel, setCreatingPixel] = useState(false);

  const isAuthenticated = Boolean(token && user);
  const title = useMemo(() => (mode === "register" ? "Create workspace" : "Sign in"), [mode]);

  useEffect(() => {
    if (!token) return;
    Promise.all([getDashboardSummary(token), listTrackedEmails(token)])
      .then(([nextSummary, emails]) => {
        setSummary(nextSummary);
        setTrackedEmails(emails);
      })
      .catch(() => {
        localStorage.removeItem("trackbridge_token");
        localStorage.removeItem("trackbridge_user");
        setToken("");
        setUser(null);
      });
  }, [token]);

  async function refreshTrackingData(activeToken = token) {
    const [nextSummary, emails] = await Promise.all([
      getDashboardSummary(activeToken),
      listTrackedEmails(activeToken)
    ]);
    setSummary(nextSummary);
    setTrackedEmails(emails);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await authenticate(mode, {
        email: String(form.get("email")),
        password: String(form.get("password")),
        full_name: String(form.get("full_name") || "TrackBridge Admin")
      });
      localStorage.setItem("trackbridge_token", response.access_token);
      localStorage.setItem("trackbridge_user", JSON.stringify(response.user));
      setToken(response.access_token);
      setUser(response.user);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePixel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setTrackingError("");
    setCopied(false);
    setCreatingPixel(true);

    const form = new FormData(event.currentTarget);
    try {
      const trackedEmail = await createTrackedEmail(token, {
        recipient_email: String(form.get("recipient_email")),
        subject: String(form.get("subject"))
      });
      setGeneratedPixel(trackedEmail);
      event.currentTarget.reset();
      await refreshTrackingData();
    } catch (createError) {
      setTrackingError(createError instanceof Error ? createError.message : "Pixel creation failed");
    } finally {
      setCreatingPixel(false);
    }
  }

  async function copyPixelHtml() {
    if (!generatedPixel) return;
    await navigator.clipboard.writeText(generatedPixel.pixel_html);
    setCopied(true);
  }

  function logout() {
    localStorage.removeItem("trackbridge_token");
    localStorage.removeItem("trackbridge_user");
    setToken("");
    setUser(null);
    setSummary(null);
    setTrackedEmails([]);
    setGeneratedPixel(null);
  }

  if (isAuthenticated) {
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand-lockup">
            <span className="brand-mark">TB</span>
            <div>
              <strong>TrackBridge</strong>
              <span>Self-hosted tracking</span>
            </div>
          </div>
          <nav>
            <a className="active" href="#dashboard"><Activity size={18} /> Dashboard</a>
            <a href="#tracking"><Radar size={18} /> Pixels</a>
            <a href="#mail"><MailCheck size={18} /> Campaigns</a>
            <a href="#security"><ShieldCheck size={18} /> Security</a>
          </nav>
        </aside>

        <section className="dashboard" id="dashboard">
          <header className="dashboard-header">
            <div>
              <span className="eyebrow">Sprint 2</span>
              <h1>Email tracking command center</h1>
              <p>Tracking pixels are live, measurable, and ready to embed in outbound mail.</p>
            </div>
            <button className="icon-button" type="button" onClick={logout} aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </header>

          <div className="operator-strip">
            <div>
              <span>Workspace</span>
              <strong>{summary?.workspace ?? user?.full_name}</strong>
            </div>
            <div>
              <span>API</span>
              <strong>Pixel endpoint ready</strong>
            </div>
            <div>
              <span>Members</span>
              <strong>{summary?.users ?? 1}</strong>
            </div>
          </div>

          <section className="metric-grid">
            {demoStats.map((item) => (
              <MetricCard
                key={item.key}
                label={item.label}
                value={summary ? summary[item.key] : 0}
              />
            ))}
          </section>

          <section className="tracking-workbench" id="tracking">
            <form className="tracking-form" onSubmit={handleCreatePixel}>
              <div>
                <span className="eyebrow">Tracking pixel</span>
                <h2>Create a tracked email</h2>
              </div>
              <label>
                Recipient email
                <input name="recipient_email" type="email" placeholder="client@example.com" required />
              </label>
              <label>
                Subject
                <input name="subject" minLength={1} maxLength={255} placeholder="Proposal follow-up" required />
              </label>
              {trackingError && <p className="form-error">{trackingError}</p>}
              <button className="primary-button" type="submit" disabled={creatingPixel}>
                {creatingPixel ? "Creating..." : "Generate pixel"}
                <Send size={18} />
              </button>
            </form>

            <article className="pixel-output">
              <div>
                <span className="eyebrow">Embed code</span>
                <h2>{generatedPixel ? generatedPixel.subject : "No pixel selected"}</h2>
              </div>
              {generatedPixel ? (
                <>
                  <code>{generatedPixel.pixel_html}</code>
                  <button className="secondary-button" type="button" onClick={copyPixelHtml}>
                    <Copy size={18} />
                    {copied ? "Copied" : "Copy HTML"}
                  </button>
                </>
              ) : (
                <p className="muted-copy">Generate a pixel and paste the HTML into an email body.</p>
              )}
            </article>
          </section>

          <section className="timeline-panel">
            <div>
              <span className="eyebrow">Recent tracked emails</span>
              <h2>Open telemetry</h2>
            </div>
            <div className="email-table">
              {trackedEmails.length === 0 ? (
                <p className="muted-copy">No tracked emails yet.</p>
              ) : (
                trackedEmails.map((email) => (
                  <article key={email.id}>
                    <div>
                      <strong>{email.subject}</strong>
                      <span>{email.recipient_email}</span>
                    </div>
                    <strong>{email.opens}</strong>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <section className="auth-visual">
        <div className="brand-lockup large">
          <span className="brand-mark">TB</span>
          <div>
            <strong>TrackBridge</strong>
            <span>Private email intelligence</span>
          </div>
        </div>
        <h1>Own every signal from send to open.</h1>
        <p>Self-hosted infrastructure for teams that want tracking data under their control.</p>
      </section>

      <section className="auth-panel" aria-label="Authentication">
        <div className="mode-switch" role="tablist" aria-label="Authentication mode">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>Login</button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>Register</button>
        </div>
        <h2>{title}</h2>
        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Full name
              <input name="full_name" minLength={2} placeholder="TrackBridge Admin" required />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength={12} placeholder="12+ characters" required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Working..." : title}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}

export default App;

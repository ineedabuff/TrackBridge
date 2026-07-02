import { Activity, ArrowRight, LogOut, MailCheck, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { MetricCard } from "./components/MetricCard";
import { AuthMode, DashboardSummary, User, authenticate, getDashboardSummary } from "./lib/api";
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAuthenticated = Boolean(token && user);
  const title = useMemo(() => (mode === "register" ? "Create workspace" : "Sign in"), [mode]);

  useEffect(() => {
    if (!token) return;
    getDashboardSummary(token)
      .then(setSummary)
      .catch(() => {
        localStorage.removeItem("trackbridge_token");
        localStorage.removeItem("trackbridge_user");
        setToken("");
        setUser(null);
      });
  }, [token]);

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

  function logout() {
    localStorage.removeItem("trackbridge_token");
    localStorage.removeItem("trackbridge_user");
    setToken("");
    setUser(null);
    setSummary(null);
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
            <a href="#mail"><MailCheck size={18} /> Campaigns</a>
            <a href="#security"><ShieldCheck size={18} /> Security</a>
          </nav>
        </aside>

        <section className="dashboard" id="dashboard">
          <header className="dashboard-header">
            <div>
              <span className="eyebrow">Sprint 1</span>
              <h1>Email tracking command center</h1>
              <p>Infrastructure, authentication, and operational visibility are online.</p>
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
              <strong>OpenAPI ready</strong>
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

          <section className="timeline-panel">
            <div>
              <span className="eyebrow">Roadmap</span>
              <h2>Next delivery lane</h2>
            </div>
            <ol>
              <li><strong>Sprint 2</strong><span>Tracking pixel events</span></li>
              <li><strong>Sprint 3</strong><span>Tracked click redirects</span></li>
              <li><strong>Sprint 4</strong><span>Attachment telemetry</span></li>
            </ol>
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

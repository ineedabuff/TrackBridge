import {
  Activity,
  BarChart3,
  Bell,
  ArrowRight,
  Copy,
  Link2,
  LogOut,
  MailCheck,
  MousePointerClick,
  Paperclip,
  Radar,
  Send,
  ShieldCheck,
  Upload
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { MetricCard } from "./components/MetricCard";
import {
  AnalyticsOverview,
  AuthMode,
  DashboardSummary,
  ReportHistoryItem,
  ReportPreferences,
  ReportSendResult,
  TrackedAttachment,
  TrackedEmail,
  TrackedLink,
  User,
  authenticate,
  createTrackedAttachment,
  getAnalyticsOverview,
  createTrackedEmail,
  createTrackedLink,
  getDashboardSummary,
  getReportPreferences,
  listReportHistory,
  listTrackedAttachments,
  listTrackedEmails,
  listTrackedLinks,
  sendReportNow,
  updateReportPreferences
} from "./lib/api";
import "./styles/app.css";

const demoStats = [
  { label: "Tracked emails", key: "tracked_emails" },
  { label: "Opens", key: "opens" },
  { label: "Clicks", key: "clicks" },
  { label: "Downloads", key: "attachments" }
] as const;

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [token, setToken] = useState(() => localStorage.getItem("trackbridge_token") ?? "");
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("trackbridge_user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [trackedEmails, setTrackedEmails] = useState<TrackedEmail[]>([]);
  const [trackedLinks, setTrackedLinks] = useState<TrackedLink[]>([]);
  const [trackedAttachments, setTrackedAttachments] = useState<TrackedAttachment[]>([]);
  const [reportPreferences, setReportPreferences] = useState<ReportPreferences | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [reportResult, setReportResult] = useState<ReportSendResult | null>(null);
  const [generatedPixel, setGeneratedPixel] = useState<TrackedEmail | null>(null);
  const [generatedLink, setGeneratedLink] = useState<TrackedLink | null>(null);
  const [generatedAttachment, setGeneratedAttachment] = useState<TrackedAttachment | null>(null);
  const [error, setError] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [linkError, setLinkError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [reportError, setReportError] = useState("");
  const [copiedPixel, setCopiedPixel] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAttachment, setCopiedAttachment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingPixel, setCreatingPixel] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [creatingAttachment, setCreatingAttachment] = useState(false);
  const [savingReports, setSavingReports] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  const isAuthenticated = Boolean(token && user);
  const title = useMemo(() => (mode === "register" ? "Create workspace" : "Sign in"), [mode]);

  const refreshTrackingData = useCallback(async (activeToken = token) => {
    const [nextSummary, nextAnalytics, emails, links, attachments, preferences, history] = await Promise.all([
      getDashboardSummary(activeToken),
      getAnalyticsOverview(activeToken),
      listTrackedEmails(activeToken),
      listTrackedLinks(activeToken),
      listTrackedAttachments(activeToken),
      getReportPreferences(activeToken),
      listReportHistory(activeToken)
    ]);
    setSummary(nextSummary);
    setAnalytics(nextAnalytics);
    setTrackedEmails(emails);
    setTrackedLinks(links);
    setTrackedAttachments(attachments);
    setReportPreferences(preferences);
    setReportHistory(history);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    // Loading authenticated dashboard data is the intended synchronization here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshTrackingData(token).catch(() => {
      localStorage.removeItem("trackbridge_token");
      localStorage.removeItem("trackbridge_user");
      setToken("");
      setUser(null);
    });
  }, [refreshTrackingData, token]);

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
    setCopiedPixel(false);
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

  async function handleCreateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setLinkError("");
    setCopiedLink(false);
    setCreatingLink(true);

    const form = new FormData(event.currentTarget);
    try {
      const trackedLink = await createTrackedLink(token, {
        label: String(form.get("label")),
        destination_url: String(form.get("destination_url"))
      });
      setGeneratedLink(trackedLink);
      event.currentTarget.reset();
      await refreshTrackingData();
    } catch (createError) {
      setLinkError(createError instanceof Error ? createError.message : "Link creation failed");
    } finally {
      setCreatingLink(false);
    }
  }

  async function handleCreateAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setAttachmentError("");
    setCopiedAttachment(false);
    setCreatingAttachment(true);

    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setAttachmentError("Choose a file to track");
      setCreatingAttachment(false);
      return;
    }

    try {
      const attachment = await createTrackedAttachment(token, String(form.get("label")), file);
      setGeneratedAttachment(attachment);
      event.currentTarget.reset();
      await refreshTrackingData();
    } catch (createError) {
      setAttachmentError(
        createError instanceof Error ? createError.message : "Attachment upload failed"
      );
    } finally {
      setCreatingAttachment(false);
    }
  }


  async function handleSaveReports(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setReportError("");
    setSavingReports(true);

    const form = new FormData(event.currentTarget);
    try {
      const preferences = await updateReportPreferences(token, {
        recipient_email: String(form.get("recipient_email") || user?.email || ""),
        daily_enabled: form.has("daily_enabled"),
        weekly_enabled: form.has("weekly_enabled"),
        immediate_open_enabled: form.has("immediate_open_enabled"),
        immediate_click_enabled: form.has("immediate_click_enabled"),
        immediate_download_enabled: form.has("immediate_download_enabled")
      });
      setReportPreferences(preferences);
    } catch (saveError) {
      setReportError(saveError instanceof Error ? saveError.message : "Report preferences failed");
    } finally {
      setSavingReports(false);
    }
  }

  async function handleSendReportNow() {
    if (!token) return;
    setReportError("");
    setSendingReport(true);

    try {
      const result = await sendReportNow(token);
      setReportResult(result);
      setReportHistory(await listReportHistory(token));
    } catch (sendError) {
      setReportError(sendError instanceof Error ? sendError.message : "Report send failed");
    } finally {
      setSendingReport(false);
    }
  }

  async function copyPixelHtml() {
    if (!generatedPixel) return;
    await navigator.clipboard.writeText(generatedPixel.pixel_html);
    setCopiedPixel(true);
  }

  async function copyTrackedLink() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink.tracking_url);
    setCopiedLink(true);
  }

  async function copyAttachmentLink() {
    if (!generatedAttachment) return;
    await navigator.clipboard.writeText(generatedAttachment.download_url);
    setCopiedAttachment(true);
  }

  function formatBytes(value: number) {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function logout() {
    localStorage.removeItem("trackbridge_token");
    localStorage.removeItem("trackbridge_user");
    setToken("");
    setUser(null);
    setSummary(null);
    setAnalytics(null);
    setTrackedEmails([]);
    setTrackedLinks([]);
    setTrackedAttachments([]);
    setReportPreferences(null);
    setReportHistory([]);
    setReportResult(null);
    setGeneratedPixel(null);
    setGeneratedLink(null);
    setGeneratedAttachment(null);
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
            <a href="#clicks"><MousePointerClick size={18} /> Clicks</a>
            <a href="#attachments"><Paperclip size={18} /> Attachments</a>
            <a href="#analytics"><BarChart3 size={18} /> Analytics</a>
            <a href="#reports"><Bell size={18} /> Reports</a>
            <a href="#mail"><MailCheck size={18} /> Campaigns</a>
            <a href="#security"><ShieldCheck size={18} /> Security</a>
          </nav>
        </aside>

        <section className="dashboard" id="dashboard">
          <header className="dashboard-header">
            <div>
              <span className="eyebrow">Sprint 7</span>
              <h1>Email tracking command center</h1>
              <p>Reports, alerts, and delivery summaries are live.</p>
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
              <strong>Tracking endpoints ready</strong>
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


          <section className="analytics-panel" id="analytics">
            <div className="analytics-header">
              <div>
                <span className="eyebrow">Analytics</span>
                <h2>Signal performance</h2>
              </div>
              <strong>{analytics?.totals.total_events ?? 0} events</strong>
            </div>

            <div className="rate-grid">
              <article><span>Open rate</span><strong>{analytics?.rates.open_rate ?? 0}%</strong></article>
              <article><span>Click rate</span><strong>{analytics?.rates.click_rate ?? 0}%</strong></article>
              <article><span>Download rate</span><strong>{analytics?.rates.download_rate ?? 0}%</strong></article>
            </div>

            <div className="trend-chart" aria-label="Seven day activity chart">
              {(analytics?.series ?? []).map((point) => {
                const total = point.opens + point.clicks + point.downloads;
                const maxTotal = Math.max(...(analytics?.series ?? [{ opens: 0, clicks: 0, downloads: 0 }]).map((item) => item.opens + item.clicks + item.downloads), 1);
                return (
                  <article key={point.date}>
                    <div style={{ height: `${Math.max((total / maxTotal) * 100, total > 0 ? 8 : 0)}%` }} />
                    <span>{new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</span>
                    <strong>{total}</strong>
                  </article>
                );
              })}
            </div>

            <div className="analytics-grid">
              <article>
                <h3>Recent activity</h3>
                <div className="activity-list">
                  {(analytics?.recent_activity ?? []).length === 0 ? (
                    <p className="muted-copy">No activity yet.</p>
                  ) : (
                    analytics?.recent_activity.map((item) => (
                      <div key={`${item.event_type}-${item.occurred_at}-${item.title}`}>
                        <span>{item.event_type}</span>
                        <strong>{item.title}</strong>
                        <small>{item.target}</small>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article>
                <h3>Top items</h3>
                <div className="activity-list">
                  {(analytics?.top_items ?? []).length === 0 ? (
                    <p className="muted-copy">No ranked items yet.</p>
                  ) : (
                    analytics?.top_items.map((item) => (
                      <div key={`${item.item_type}-${item.title}-${item.target}`}>
                        <span>{item.item_type}</span>
                        <strong>{item.title}</strong>
                        <small>{item.events} events</small>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </section>


          <section className="reports-panel" id="reports">
            <div className="analytics-header">
              <div>
                <span className="eyebrow">Reports</span>
                <h2>Email reports</h2>
              </div>
              <button className="secondary-button compact" type="button" onClick={handleSendReportNow} disabled={sendingReport}>
                <Bell size={18} />
                {sendingReport ? "Sending..." : "Send now"}
              </button>
            </div>

            <div className="reports-grid">
              <form className="report-form" key={reportPreferences?.updated_at ?? "reports"} onSubmit={handleSaveReports}>
                <label>
                  Recipient email
                  <input
                    name="recipient_email"
                    type="email"
                    defaultValue={reportPreferences?.recipient_email ?? user?.email ?? ""}
                    required
                  />
                </label>

                <label className="checkbox-row">
                  <input name="daily_enabled" type="checkbox" defaultChecked={reportPreferences?.daily_enabled ?? false} />
                  Daily digest
                </label>
                <label className="checkbox-row">
                  <input name="weekly_enabled" type="checkbox" defaultChecked={reportPreferences?.weekly_enabled ?? false} />
                  Weekly digest
                </label>
                <label className="checkbox-row">
                  <input name="immediate_open_enabled" type="checkbox" defaultChecked={reportPreferences?.immediate_open_enabled ?? false} />
                  Open alerts
                </label>
                <label className="checkbox-row">
                  <input name="immediate_click_enabled" type="checkbox" defaultChecked={reportPreferences?.immediate_click_enabled ?? false} />
                  Click alerts
                </label>
                <label className="checkbox-row">
                  <input name="immediate_download_enabled" type="checkbox" defaultChecked={reportPreferences?.immediate_download_enabled ?? false} />
                  Download alerts
                </label>

                {reportError && <p className="form-error">{reportError}</p>}
                <button className="primary-button" type="submit" disabled={savingReports}>
                  {savingReports ? "Saving..." : "Save reports"}
                  <ArrowRight size={18} />
                </button>
              </form>

              <article className="report-preview">
                <div>
                  <span className="eyebrow">Latest report</span>
                  <h3>{reportResult?.subject ?? "No report sent yet"}</h3>
                </div>
                {reportResult ? (
                  <>
                    <p className={reportResult.sent ? "status-good" : "status-muted"}>{reportResult.message}</p>
                    <pre>{reportResult.preview_text}</pre>
                  </>
                ) : (
                  <p className="muted-copy">Report previews will appear here after a manual send.</p>
                )}
              </article>
            </div>

            <div className="report-history">
              <h3>Report history</h3>
              <div className="activity-list">
                {reportHistory.length === 0 ? (
                  <p className="muted-copy">No sent reports yet.</p>
                ) : (
                  reportHistory.map((item) => (
                    <div key={item.id}>
                      <span>{item.status}</span>
                      <strong>{item.subject}</strong>
                      <small>{item.recipient_email}</small>
                    </div>
                  ))
                )}
              </div>
            </div>
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
                    {copiedPixel ? "Copied" : "Copy HTML"}
                  </button>
                </>
              ) : (
                <p className="muted-copy">Generate a pixel and paste the HTML into an email body.</p>
              )}
            </article>
          </section>

          <section className="tracking-workbench" id="clicks">
            <form className="tracking-form" onSubmit={handleCreateLink}>
              <div>
                <span className="eyebrow">Click tracking</span>
                <h2>Create a tracked link</h2>
              </div>
              <label>
                Link label
                <input name="label" minLength={1} maxLength={120} placeholder="View proposal" required />
              </label>
              <label>
                Destination URL
                <input name="destination_url" type="url" placeholder="https://example.com/proposal" required />
              </label>
              {linkError && <p className="form-error">{linkError}</p>}
              <button className="primary-button" type="submit" disabled={creatingLink}>
                {creatingLink ? "Creating..." : "Generate link"}
                <Link2 size={18} />
              </button>
            </form>

            <article className="pixel-output">
              <div>
                <span className="eyebrow">Redirect URL</span>
                <h2>{generatedLink ? generatedLink.label : "No link selected"}</h2>
              </div>
              {generatedLink ? (
                <>
                  <code>{generatedLink.tracking_url}</code>
                  <button className="secondary-button" type="button" onClick={copyTrackedLink}>
                    <Copy size={18} />
                    {copiedLink ? "Copied" : "Copy URL"}
                  </button>
                </>
              ) : (
                <p className="muted-copy">Generate a redirect URL and use it as the link in your email.</p>
              )}
            </article>
          </section>

          <section className="tracking-workbench" id="attachments">
            <form className="tracking-form" onSubmit={handleCreateAttachment}>
              <div>
                <span className="eyebrow">Tracked attachment</span>
                <h2>Upload a tracked file</h2>
              </div>
              <label>
                Link label
                <input name="label" minLength={1} maxLength={120} placeholder="Download proposal" required />
              </label>
              <label>
                File
                <input name="file" type="file" required />
              </label>
              {attachmentError && <p className="form-error">{attachmentError}</p>}
              <button className="primary-button" type="submit" disabled={creatingAttachment}>
                {creatingAttachment ? "Uploading..." : "Upload attachment"}
                <Upload size={18} />
              </button>
            </form>

            <article className="pixel-output">
              <div>
                <span className="eyebrow">Download URL</span>
                <h2>{generatedAttachment ? generatedAttachment.label : "No attachment selected"}</h2>
              </div>
              {generatedAttachment ? (
                <>
                  <code>{generatedAttachment.download_url}</code>
                  <button className="secondary-button" type="button" onClick={copyAttachmentLink}>
                    <Copy size={18} />
                    {copiedAttachment ? "Copied" : "Copy URL"}
                  </button>
                </>
              ) : (
                <p className="muted-copy">Upload a file and share the tracked download URL.</p>
              )}
            </article>
          </section>

          <section className="data-grid">
            <article className="timeline-panel">
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
            </article>

            <article className="timeline-panel">
              <div>
                <span className="eyebrow">Recent tracked links</span>
                <h2>Click telemetry</h2>
              </div>
              <div className="email-table">
                {trackedLinks.length === 0 ? (
                  <p className="muted-copy">No tracked links yet.</p>
                ) : (
                  trackedLinks.map((link) => (
                    <article key={link.id}>
                      <div>
                        <strong>{link.label}</strong>
                        <span>{link.destination_url}</span>
                      </div>
                      <strong>{link.clicks}</strong>
                    </article>
                  ))
                )}
              </div>
            </article>

            <article className="timeline-panel">
              <div>
                <span className="eyebrow">Recent attachments</span>
                <h2>Download telemetry</h2>
              </div>
              <div className="email-table">
                {trackedAttachments.length === 0 ? (
                  <p className="muted-copy">No tracked attachments yet.</p>
                ) : (
                  trackedAttachments.map((attachment) => (
                    <article key={attachment.id}>
                      <div>
                        <strong>{attachment.label}</strong>
                        <span>{attachment.original_filename} · {formatBytes(attachment.size_bytes)}</span>
                      </div>
                      <strong>{attachment.downloads}</strong>
                    </article>
                  ))
                )}
              </div>
            </article>
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


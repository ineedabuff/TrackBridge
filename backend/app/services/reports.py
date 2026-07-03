import smtplib
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.api.routes.analytics import analytics_overview
from app.core.config import Settings
from app.models.user import User
from app.schemas.analytics import AnalyticsOverview


def build_report(user: User, db: Session) -> tuple[str, str, str]:
    overview = analytics_overview(current_user=user, db=db)
    subject = f"TrackBridge report: {overview.totals.total_events} events"
    text = build_text_report(user, overview)
    html = build_html_report(user, overview)
    return subject, text, html


def build_text_report(user: User, overview: AnalyticsOverview) -> str:
    lines = [
        f"TrackBridge report for {user.full_name}",
        "",
        f"Tracked emails: {overview.totals.tracked_emails}",
        f"Tracked links: {overview.totals.tracked_links}",
        f"Tracked attachments: {overview.totals.tracked_attachments}",
        "",
        f"Opens: {overview.totals.opens} ({overview.rates.open_rate}%)",
        f"Clicks: {overview.totals.clicks} ({overview.rates.click_rate}%)",
        f"Downloads: {overview.totals.downloads} ({overview.rates.download_rate}%)",
        "",
        "Recent activity:",
    ]

    if overview.recent_activity:
        for item in overview.recent_activity[:8]:
            lines.append(f"- {item.event_type}: {item.title} -> {item.target}")
    else:
        lines.append("- No activity yet.")

    return "\n".join(lines)


def build_html_report(user: User, overview: AnalyticsOverview) -> str:
    activity = "".join(
        f"<li><strong>{item.event_type}</strong>: {item.title} &rarr; {item.target}</li>"
        for item in overview.recent_activity[:8]
    ) or "<li>No activity yet.</li>"

    return f"""<!doctype html>
<html>
  <body style="background:#000;color:#f6f8f2;font-family:Arial,sans-serif;padding:24px;">
    <h1 style="color:#ddff24;">TrackBridge report</h1>
    <p>Workspace: {user.full_name}</p>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;color:#f6f8f2;">
      <tr><td>Tracked emails</td><td>{overview.totals.tracked_emails}</td></tr>
      <tr><td>Tracked links</td><td>{overview.totals.tracked_links}</td></tr>
      <tr><td>Tracked attachments</td><td>{overview.totals.tracked_attachments}</td></tr>
      <tr><td>Opens</td><td>{overview.totals.opens} ({overview.rates.open_rate}%)</td></tr>
      <tr><td>Clicks</td><td>{overview.totals.clicks} ({overview.rates.click_rate}%)</td></tr>
      <tr><td>Downloads</td><td>{overview.totals.downloads} ({overview.rates.download_rate}%)</td></tr>
    </table>
    <h2>Recent activity</h2>
    <ul>{activity}</ul>
  </body>
</html>"""


def smtp_is_configured(settings: Settings) -> bool:
    return bool(settings.smtp_host and settings.smtp_from)


def send_report_email(
    *,
    settings: Settings,
    recipient_email: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = recipient_email
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    if settings.smtp_use_ssl:
        smtp: smtplib.SMTP = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=20)
    else:
        smtp = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20)

    with smtp:
        if settings.smtp_use_tls and not settings.smtp_use_ssl:
            smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)

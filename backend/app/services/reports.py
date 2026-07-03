import html
import smtplib
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.api.routes.analytics import analytics_overview
from app.core.config import Settings
from app.models.user import User
from app.schemas.analytics import AnalyticsActivityItem, AnalyticsOverview


def build_report(user: User, db: Session, dashboard_url: str | None = None) -> tuple[str, str, str]:
    overview = analytics_overview(current_user=user, db=db)
    subject = build_subject(overview)
    text = build_text_report(user, overview, dashboard_url)
    html_body = build_html_report(user, overview, dashboard_url)
    return subject, text, html_body


def build_subject(overview: AnalyticsOverview) -> str:
    latest = overview.recent_activity[0] if overview.recent_activity else None
    if not latest:
        return "TrackBridge tracking report"
    return f"Tracking notification: {latest.title}"


def notification_sentence(latest: AnalyticsActivityItem | None) -> str:
    if not latest:
        return "Your TrackBridge workspace has no tracking activity yet."
    if latest.event_type == "open":
        return f"Email sent to {latest.target} has been opened."
    if latest.event_type == "click":
        return f"{latest.title} was clicked from email activity for {latest.target}."
    return f"{latest.title} was accessed from email tracking activity for {latest.target}."


def build_text_report(
    user: User, overview: AnalyticsOverview, dashboard_url: str | None = None
) -> str:
    latest = overview.recent_activity[0] if overview.recent_activity else None
    lines = [
        "Tracking Notification",
        "",
        notification_sentence(latest),
        "",
        f"Workspace: {user.full_name}",
        f"Tracked emails: {overview.totals.tracked_emails}",
        f"Tracked links: {overview.totals.tracked_links}",
        f"Tracked attachments: {overview.totals.tracked_attachments}",
        f"Opens: {overview.totals.opens} ({overview.rates.open_rate}%)",
        f"Clicks: {overview.totals.clicks} ({overview.rates.click_rate}%)",
        f"Downloads: {overview.totals.downloads} ({overview.rates.download_rate}%)",
    ]

    if dashboard_url:
        lines.extend(["", f"Open tracking report: {dashboard_url}"])

    lines.extend(["", "Recent activity:"])
    if overview.recent_activity:
        for item in overview.recent_activity[:8]:
            lines.append(f"- {item.event_type}: {item.title} -> {item.target}")
    else:
        lines.append("- No activity yet.")

    return "\n".join(lines)


def build_html_report(
    user: User, overview: AnalyticsOverview, dashboard_url: str | None = None
) -> str:
    latest = overview.recent_activity[0] if overview.recent_activity else None
    safe_sentence = html.escape(notification_sentence(latest))
    safe_workspace = html.escape(user.full_name)
    report_url = html.escape(dashboard_url or "#", quote=True)
    cta_style = (
        "display:inline-block;background:#42a5f5;color:#fff;text-decoration:none;"
        "font-weight:700;padding:12px 18px;border-radius:4px;font-size:14px;"
    )
    rows = "".join(
        f"""<tr>
          <td style="border:1px solid #d8d8d8;padding:8px;color:#666;">{html.escape(item.occurred_at.strftime('%Y-%m-%d %H:%M'))}</td>
          <td style="border:1px solid #d8d8d8;padding:8px;color:#333;">{html.escape(item.target)}</td>
          <td style="border:1px solid #d8d8d8;padding:8px;color:#333;">{html.escape(item.event_type.title())}</td>
          <td style="border:1px solid #d8d8d8;padding:8px;color:#333;">{html.escape(item.ip_address or 'Unknown')}</td>
          <td style="border:1px solid #d8d8d8;padding:8px;color:#333;">{html.escape(item.title)}</td>
        </tr>"""
        for item in overview.recent_activity[:8]
    ) or (
        '<tr><td colspan="5" style="border:1px solid #d8d8d8;padding:10px;">'
        "No activity yet.</td></tr>"
    )

    return f"""<!doctype html>
<html>
  <body style="margin:0;background:#ffffff;color:#111;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:1120px;margin:0 auto;padding:36px 38px;">
      <div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:14px;">
        <strong style="color:#666;font-size:16px;">Tracking Notification</strong>
        <span style="color:#666;font-size:14px;"><mark style="background:#ffd45c;padding:0 3px;">TrackBridge</mark> report</span>
      </div>

      <div style="background:#f1f1f1;padding:26px 30px;margin-bottom:26px;">
        <p style="margin:0 0 16px;font-size:20px;line-height:1.45;color:#111;">{safe_sentence}</p>
        <a href="{report_url}" style="{cta_style}">OPEN TRACKING REPORT</a>
      </div>

      <p style="text-align:center;color:#777;font-size:14px;margin:0 0 28px;">
        To change notifications for this workspace, open TrackBridge report settings.
      </p>

      <h1 style="font-size:28px;margin:0 0 8px;color:#111;">Email Tracking Report</h1>
      <p style="margin:0 0 20px;color:#777;">Workspace: {safe_workspace}</p>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;border-collapse:collapse;">
        <tr>
          <td style="background:#fafafa;border:1px solid #ddd;padding:14px;"><strong>{overview.totals.opens}</strong><br><span style="color:#777;">Opens</span></td>
          <td style="background:#fafafa;border:1px solid #ddd;padding:14px;"><strong>{overview.totals.clicks}</strong><br><span style="color:#777;">Clicks</span></td>
          <td style="background:#fafafa;border:1px solid #ddd;padding:14px;"><strong>{overview.totals.downloads}</strong><br><span style="color:#777;">Downloads</span></td>
          <td style="background:#fafafa;border:1px solid #ddd;padding:14px;"><strong>{overview.totals.total_events}</strong><br><span style="color:#777;">Events</span></td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:13px;">
        <thead>
          <tr>
            <th align="left" style="border:1px solid #aaa;padding:8px;color:#777;">Date</th>
            <th align="left" style="border:1px solid #aaa;padding:8px;color:#777;">Recipient</th>
            <th align="left" style="border:1px solid #aaa;padding:8px;color:#777;">Type</th>
            <th align="left" style="border:1px solid #aaa;padding:8px;color:#777;">Location</th>
            <th align="left" style="border:1px solid #aaa;padding:8px;color:#777;">Object</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>

      <p style="margin:20px 0 0;color:#777;font-size:12px;text-align:center;font-style:italic;">
        Note: Location indicators are IP-based and may not represent the exact recipient location.
      </p>
    </div>
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

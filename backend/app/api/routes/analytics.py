from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.tracking import (
    AttachmentDownloadEvent,
    EmailOpenEvent,
    LinkClickEvent,
    TrackedAttachment,
    TrackedEmail,
    TrackedLink,
)
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsActivityItem,
    AnalyticsOverview,
    AnalyticsRates,
    AnalyticsSeriesPoint,
    AnalyticsTopItem,
    AnalyticsTotals,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def ratio(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return round((numerator / denominator) * 100, 1)


def event_date(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).date().isoformat()


@router.get("/overview", response_model=AnalyticsOverview)
def analytics_overview(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> AnalyticsOverview:
    tracked_emails = db.scalar(
        select(func.count(TrackedEmail.id)).where(TrackedEmail.owner_id == current_user.id)
    ) or 0
    tracked_links = db.scalar(
        select(func.count(TrackedLink.id)).where(TrackedLink.owner_id == current_user.id)
    ) or 0
    tracked_attachments = db.scalar(
        select(func.count(TrackedAttachment.id)).where(TrackedAttachment.owner_id == current_user.id)
    ) or 0

    open_rows = db.execute(
        select(EmailOpenEvent, TrackedEmail)
        .join(TrackedEmail, EmailOpenEvent.tracked_email_id == TrackedEmail.id)
        .where(TrackedEmail.owner_id == current_user.id)
    ).all()
    click_rows = db.execute(
        select(LinkClickEvent, TrackedLink)
        .join(TrackedLink, LinkClickEvent.tracked_link_id == TrackedLink.id)
        .where(TrackedLink.owner_id == current_user.id)
    ).all()
    download_rows = db.execute(
        select(AttachmentDownloadEvent, TrackedAttachment)
        .join(
            TrackedAttachment,
            AttachmentDownloadEvent.tracked_attachment_id == TrackedAttachment.id,
        )
        .where(TrackedAttachment.owner_id == current_user.id)
    ).all()

    opens = len(open_rows)
    clicks = len(click_rows)
    downloads = len(download_rows)

    today = datetime.now(timezone.utc).date()
    series_days = [(today - timedelta(days=offset)).isoformat() for offset in range(6, -1, -1)]
    series_counts: dict[str, dict[str, int]] = {
        day: {"opens": 0, "clicks": 0, "downloads": 0} for day in series_days
    }

    activity: list[AnalyticsActivityItem] = []
    top_counts: dict[tuple[str, str, str], int] = defaultdict(int)

    for event, email in open_rows:
        day = event_date(event.opened_at)
        if day in series_counts:
            series_counts[day]["opens"] += 1
        activity.append(
            AnalyticsActivityItem(
                event_type="open",
                title=email.subject,
                target=email.recipient_email,
                occurred_at=event.opened_at,
                ip_address=event.ip_address,
            )
        )
        top_counts[("email", email.subject, email.recipient_email)] += 1

    for event, link in click_rows:
        day = event_date(event.clicked_at)
        if day in series_counts:
            series_counts[day]["clicks"] += 1
        activity.append(
            AnalyticsActivityItem(
                event_type="click",
                title=link.label,
                target=link.destination_url,
                occurred_at=event.clicked_at,
                ip_address=event.ip_address,
            )
        )
        top_counts[("link", link.label, link.destination_url)] += 1

    for event, attachment in download_rows:
        day = event_date(event.downloaded_at)
        if day in series_counts:
            series_counts[day]["downloads"] += 1
        activity.append(
            AnalyticsActivityItem(
                event_type="download",
                title=attachment.label,
                target=attachment.original_filename,
                occurred_at=event.downloaded_at,
                ip_address=event.ip_address,
            )
        )
        top_counts[("attachment", attachment.label, attachment.original_filename)] += 1

    activity.sort(key=lambda item: item.occurred_at, reverse=True)
    top_items = [
        AnalyticsTopItem(item_type=item_type, title=title, target=target, events=events)
        for (item_type, title, target), events in sorted(
            top_counts.items(), key=lambda entry: entry[1], reverse=True
        )[:8]
    ]

    return AnalyticsOverview(
        totals=AnalyticsTotals(
            tracked_emails=tracked_emails,
            tracked_links=tracked_links,
            tracked_attachments=tracked_attachments,
            opens=opens,
            clicks=clicks,
            downloads=downloads,
            total_events=opens + clicks + downloads,
        ),
        rates=AnalyticsRates(
            open_rate=ratio(opens, tracked_emails),
            click_rate=ratio(clicks, tracked_links),
            download_rate=ratio(downloads, tracked_attachments),
        ),
        series=[
            AnalyticsSeriesPoint(date=day, **series_counts[day])
            for day in series_days
        ],
        recent_activity=activity[:12],
        top_items=top_items,
    )

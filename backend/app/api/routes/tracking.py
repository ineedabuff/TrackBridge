from secrets import token_urlsafe

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.tracking import EmailOpenEvent, LinkClickEvent, TrackedEmail, TrackedLink
from app.models.user import User
from app.schemas.tracking import (
    TrackedEmailCreate,
    TrackedEmailDetail,
    TrackedEmailRead,
    TrackedLinkCreate,
    TrackedLinkDetail,
    TrackedLinkRead,
)

email_router = APIRouter(prefix="/tracked-emails", tags=["tracking"])
link_router = APIRouter(prefix="/tracked-links", tags=["tracking"])
public_router = APIRouter(tags=["tracking"])
TRANSPARENT_GIF = bytes.fromhex(
    "47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b"
)


def public_url(request: Request, path: str) -> str:
    settings = get_settings()
    public_base_url = str(settings.public_base_url).rstrip("/") if settings.public_base_url else ""
    if public_base_url:
        return f"{public_base_url}{path}"

    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc))
    return f"{proto}://{host}{path}"


def request_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return None


def serialize_tracked_email(
    tracked_email: TrackedEmail, request: Request, opens: int = 0
) -> TrackedEmailRead:
    pixel_url = public_url(request, f"/t/{tracked_email.token}.gif")
    return TrackedEmailRead(
        id=tracked_email.id,
        recipient_email=tracked_email.recipient_email,
        subject=tracked_email.subject,
        tracking_pixel_url=pixel_url,
        pixel_html=f'<img src="{pixel_url}" width="1" height="1" alt="" />',
        opens=opens,
        created_at=tracked_email.created_at,
    )


def serialize_tracked_link(
    tracked_link: TrackedLink, request: Request, clicks: int = 0
) -> TrackedLinkRead:
    tracking_link_url = public_url(request, f"/c/{tracked_link.token}")
    return TrackedLinkRead(
        id=tracked_link.id,
        label=tracked_link.label,
        destination_url=tracked_link.destination_url,
        tracking_url=tracking_link_url,
        link_html=f'<a href="{tracking_link_url}">{tracked_link.label}</a>',
        clicks=clicks,
        created_at=tracked_link.created_at,
    )


@email_router.post("", response_model=TrackedEmailRead, status_code=status.HTTP_201_CREATED)
def create_tracked_email(
    payload: TrackedEmailCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackedEmailRead:
    tracked_email = TrackedEmail(
        owner_id=current_user.id,
        recipient_email=payload.recipient_email.lower(),
        subject=payload.subject,
        token=token_urlsafe(32),
    )
    db.add(tracked_email)
    db.commit()
    db.refresh(tracked_email)
    return serialize_tracked_email(tracked_email, request)


@email_router.get("", response_model=list[TrackedEmailRead])
def list_tracked_emails(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TrackedEmailRead]:
    rows = db.execute(
        select(TrackedEmail, func.count(EmailOpenEvent.id))
        .outerjoin(EmailOpenEvent, EmailOpenEvent.tracked_email_id == TrackedEmail.id)
        .where(TrackedEmail.owner_id == current_user.id)
        .group_by(TrackedEmail.id)
        .order_by(TrackedEmail.created_at.desc())
    ).all()
    return [serialize_tracked_email(tracked_email, request, opens) for tracked_email, opens in rows]


@email_router.get("/{tracked_email_id}", response_model=TrackedEmailDetail)
def read_tracked_email(
    tracked_email_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackedEmailDetail:
    tracked_email = db.scalar(
        select(TrackedEmail).where(
            TrackedEmail.id == tracked_email_id, TrackedEmail.owner_id == current_user.id
        )
    )
    if tracked_email is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tracked email not found")

    opens = db.scalar(
        select(func.count(EmailOpenEvent.id)).where(
            EmailOpenEvent.tracked_email_id == tracked_email.id
        )
    ) or 0
    base = serialize_tracked_email(tracked_email, request, opens)
    events = db.scalars(
        select(EmailOpenEvent)
        .where(EmailOpenEvent.tracked_email_id == tracked_email.id)
        .order_by(EmailOpenEvent.opened_at.desc())
    ).all()
    return TrackedEmailDetail(**base.model_dump(), open_events=list(events))


@link_router.post("", response_model=TrackedLinkRead, status_code=status.HTTP_201_CREATED)
def create_tracked_link(
    payload: TrackedLinkCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackedLinkRead:
    tracked_link = TrackedLink(
        owner_id=current_user.id,
        label=payload.label,
        destination_url=str(payload.destination_url),
        token=token_urlsafe(32),
    )
    db.add(tracked_link)
    db.commit()
    db.refresh(tracked_link)
    return serialize_tracked_link(tracked_link, request)


@link_router.get("", response_model=list[TrackedLinkRead])
def list_tracked_links(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TrackedLinkRead]:
    rows = db.execute(
        select(TrackedLink, func.count(LinkClickEvent.id))
        .outerjoin(LinkClickEvent, LinkClickEvent.tracked_link_id == TrackedLink.id)
        .where(TrackedLink.owner_id == current_user.id)
        .group_by(TrackedLink.id)
        .order_by(TrackedLink.created_at.desc())
    ).all()
    return [serialize_tracked_link(tracked_link, request, clicks) for tracked_link, clicks in rows]


@link_router.get("/{tracked_link_id}", response_model=TrackedLinkDetail)
def read_tracked_link(
    tracked_link_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackedLinkDetail:
    tracked_link = db.scalar(
        select(TrackedLink).where(
            TrackedLink.id == tracked_link_id, TrackedLink.owner_id == current_user.id
        )
    )
    if tracked_link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tracked link not found")

    clicks = db.scalar(
        select(func.count(LinkClickEvent.id)).where(LinkClickEvent.tracked_link_id == tracked_link.id)
    ) or 0
    base = serialize_tracked_link(tracked_link, request, clicks)
    events = db.scalars(
        select(LinkClickEvent)
        .where(LinkClickEvent.tracked_link_id == tracked_link.id)
        .order_by(LinkClickEvent.clicked_at.desc())
    ).all()
    return TrackedLinkDetail(**base.model_dump(), click_events=list(events))


@public_router.get("/t/{token}.gif", include_in_schema=False)
def track_open(token: str, request: Request, db: Session = Depends(get_db)) -> Response:
    tracked_email = db.scalar(select(TrackedEmail).where(TrackedEmail.token == token))
    if tracked_email is not None:
        db.add(
            EmailOpenEvent(
                tracked_email_id=tracked_email.id,
                ip_address=request_ip(request),
                user_agent=request.headers.get("user-agent"),
                referer=request.headers.get("referer"),
            )
        )
        db.commit()

    return Response(
        content=TRANSPARENT_GIF,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@public_router.get("/c/{token}", include_in_schema=False)
def track_click(token: str, request: Request, db: Session = Depends(get_db)) -> RedirectResponse:
    tracked_link = db.scalar(select(TrackedLink).where(TrackedLink.token == token))
    if tracked_link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tracked link not found")

    db.add(
        LinkClickEvent(
            tracked_link_id=tracked_link.id,
            ip_address=request_ip(request),
            user_agent=request.headers.get("user-agent"),
            referer=request.headers.get("referer"),
        )
    )
    db.commit()
    return RedirectResponse(url=tracked_link.destination_url, status_code=status.HTTP_302_FOUND)

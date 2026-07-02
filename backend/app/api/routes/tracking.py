from secrets import token_urlsafe

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.tracking import EmailOpenEvent, TrackedEmail
from app.models.user import User
from app.schemas.tracking import TrackedEmailCreate, TrackedEmailDetail, TrackedEmailRead

api_router = APIRouter(prefix="/tracked-emails", tags=["tracking"])
public_router = APIRouter(tags=["tracking"])
TRANSPARENT_GIF = bytes.fromhex(
    "47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b"
)


def tracking_url(request: Request, token: str) -> str:
    settings = get_settings()
    public_base_url = str(settings.public_base_url).rstrip("/") if settings.public_base_url else ""
    if public_base_url:
        return f"{public_base_url}/t/{token}.gif"

    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc))
    return f"{proto}://{host}/t/{token}.gif"


def serialize_tracked_email(
    tracked_email: TrackedEmail, request: Request, opens: int = 0
) -> TrackedEmailRead:
    pixel_url = tracking_url(request, tracked_email.token)
    return TrackedEmailRead(
        id=tracked_email.id,
        recipient_email=tracked_email.recipient_email,
        subject=tracked_email.subject,
        tracking_pixel_url=pixel_url,
        pixel_html=f'<img src="{pixel_url}" width="1" height="1" alt="" />',
        opens=opens,
        created_at=tracked_email.created_at,
    )


@api_router.post("", response_model=TrackedEmailRead, status_code=status.HTTP_201_CREATED)
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


@api_router.get("", response_model=list[TrackedEmailRead])
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


@api_router.get("/{tracked_email_id}", response_model=TrackedEmailDetail)
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


@public_router.get("/t/{token}.gif", include_in_schema=False)
def track_open(token: str, request: Request, db: Session = Depends(get_db)) -> Response:
    tracked_email = db.scalar(select(TrackedEmail).where(TrackedEmail.token == token))
    if tracked_email is not None:
        forwarded_for = request.headers.get("x-forwarded-for")
        ip_address = forwarded_for.split(",")[0].strip() if forwarded_for else None
        if ip_address is None and request.client is not None:
            ip_address = request.client.host
        db.add(
            EmailOpenEvent(
                tracked_email_id=tracked_email.id,
                ip_address=ip_address,
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

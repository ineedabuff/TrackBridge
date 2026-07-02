from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.tracking import EmailOpenEvent, TrackedEmail
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict[str, int | str]:
    users_count = db.scalar(select(func.count(User.id))) or 0
    tracked_count = db.scalar(
        select(func.count(TrackedEmail.id)).where(TrackedEmail.owner_id == current_user.id)
    ) or 0
    opens_count = db.scalar(
        select(func.count(EmailOpenEvent.id))
        .join(TrackedEmail, EmailOpenEvent.tracked_email_id == TrackedEmail.id)
        .where(TrackedEmail.owner_id == current_user.id)
    ) or 0
    return {
        "workspace": current_user.full_name,
        "tracked_emails": tracked_count,
        "opens": opens_count,
        "clicks": 0,
        "attachments": 0,
        "users": users_count,
    }

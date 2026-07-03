from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.reports import SentReport, UserReportPreference
from app.models.user import User
from app.schemas.reports import (
    ReportHistoryItem,
    ReportPreferencesRead,
    ReportPreferencesUpdate,
    ReportSendResult,
)
from app.services.reports import build_report, send_report_email, smtp_is_configured

router = APIRouter(prefix="/reports", tags=["reports"])


def get_or_create_preferences(db: Session, user: User) -> UserReportPreference:
    preferences = db.scalar(
        select(UserReportPreference).where(UserReportPreference.user_id == user.id)
    )
    if preferences:
        return preferences

    preferences = UserReportPreference(user_id=user.id, recipient_email=user.email)
    db.add(preferences)
    db.commit()
    db.refresh(preferences)
    return preferences


@router.get("/preferences", response_model=ReportPreferencesRead)
def read_report_preferences(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> UserReportPreference:
    return get_or_create_preferences(db, current_user)


@router.put("/preferences", response_model=ReportPreferencesRead)
def update_report_preferences(
    payload: ReportPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserReportPreference:
    preferences = get_or_create_preferences(db, current_user)
    preferences.recipient_email = str(payload.recipient_email or current_user.email)
    preferences.daily_enabled = payload.daily_enabled
    preferences.weekly_enabled = payload.weekly_enabled
    preferences.immediate_open_enabled = payload.immediate_open_enabled
    preferences.immediate_click_enabled = payload.immediate_click_enabled
    preferences.immediate_download_enabled = payload.immediate_download_enabled
    db.add(preferences)
    db.commit()
    db.refresh(preferences)
    return preferences


@router.get("/history", response_model=list[ReportHistoryItem])
def report_history(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[SentReport]:
    return list(
        db.scalars(
            select(SentReport)
            .where(SentReport.user_id == current_user.id)
            .order_by(SentReport.sent_at.desc())
            .limit(20)
        )
    )


@router.post("/send-now", response_model=ReportSendResult)
def send_report_now(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ReportSendResult:
    preferences = get_or_create_preferences(db, current_user)
    subject, text_body, html_body = build_report(current_user, db)

    if not smtp_is_configured(settings):
        return ReportSendResult(
            sent=False,
            message="SMTP is not configured. Preview generated only.",
            subject=subject,
            preview_text=text_body,
            preview_html=html_body,
        )

    try:
        send_report_email(
            settings=settings,
            recipient_email=preferences.recipient_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )
    except Exception as exc:
        db.add(
            SentReport(
                user_id=current_user.id,
                report_type="manual",
                recipient_email=preferences.recipient_email,
                subject=subject,
                status="failed",
                message=str(exc),
            )
        )
        db.commit()
        return ReportSendResult(
            sent=False,
            message=f"Email delivery failed: {exc}",
            subject=subject,
            preview_text=text_body,
            preview_html=html_body,
        )

    db.add(
        SentReport(
            user_id=current_user.id,
            report_type="manual",
            recipient_email=preferences.recipient_email,
            subject=subject,
            status="sent",
            message="Report sent successfully.",
        )
    )
    db.commit()
    return ReportSendResult(
        sent=True,
        message="Report sent successfully.",
        subject=subject,
        preview_text=text_body,
        preview_html=html_body,
    )

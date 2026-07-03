from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class UserReportPreference(Base):
    __tablename__ = "user_report_preferences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"), unique=True, index=True, nullable=False
    )
    recipient_email: Mapped[str] = mapped_column(String(320), nullable=False)
    daily_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    weekly_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    immediate_open_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    immediate_click_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    immediate_download_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SentReport(Base):
    __tablename__ = "sent_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    report_type: Mapped[str] = mapped_column(String(40), default="manual", nullable=False)
    recipient_email: Mapped[str] = mapped_column(String(320), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

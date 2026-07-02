from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class TrackedEmail(Base):
    __tablename__ = "tracked_emails"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    recipient_email: Mapped[str] = mapped_column(String(320), index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    open_events: Mapped[list["EmailOpenEvent"]] = relationship(
        back_populates="tracked_email", cascade="all, delete-orphan"
    )


class EmailOpenEvent(Base):
    __tablename__ = "email_open_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tracked_email_id: Mapped[str] = mapped_column(
        ForeignKey("tracked_emails.id"), index=True, nullable=False
    )
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    referer: Mapped[str | None] = mapped_column(Text, nullable=True)
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    tracked_email: Mapped[TrackedEmail] = relationship(back_populates="open_events")


class TrackedLink(Base):
    __tablename__ = "tracked_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    destination_url: Mapped[str] = mapped_column(Text, nullable=False)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    click_events: Mapped[list["LinkClickEvent"]] = relationship(
        back_populates="tracked_link", cascade="all, delete-orphan"
    )


class LinkClickEvent(Base):
    __tablename__ = "link_click_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tracked_link_id: Mapped[str] = mapped_column(
        ForeignKey("tracked_links.id"), index=True, nullable=False
    )
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    referer: Mapped[str | None] = mapped_column(Text, nullable=True)
    clicked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    tracked_link: Mapped[TrackedLink] = relationship(back_populates="click_events")

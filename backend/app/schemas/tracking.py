from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class TrackedEmailCreate(BaseModel):
    recipient_email: EmailStr
    subject: str = Field(min_length=1, max_length=255)


class TrackedEmailRead(BaseModel):
    id: str
    recipient_email: EmailStr
    subject: str
    tracking_pixel_url: str
    pixel_html: str
    opens: int
    created_at: datetime


class OpenEventRead(BaseModel):
    id: str
    ip_address: str | None
    user_agent: str | None
    referer: str | None
    opened_at: datetime

    model_config = {"from_attributes": True}


class TrackedEmailDetail(TrackedEmailRead):
    open_events: list[OpenEventRead]

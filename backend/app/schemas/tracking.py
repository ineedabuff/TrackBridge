from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, HttpUrl


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


class TrackedLinkCreate(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    destination_url: HttpUrl


class TrackedLinkRead(BaseModel):
    id: str
    label: str
    destination_url: str
    tracking_url: str
    link_html: str
    clicks: int
    created_at: datetime


class ClickEventRead(BaseModel):
    id: str
    ip_address: str | None
    user_agent: str | None
    referer: str | None
    clicked_at: datetime

    model_config = {"from_attributes": True}


class TrackedLinkDetail(TrackedLinkRead):
    click_events: list[ClickEventRead]


class TrackedAttachmentRead(BaseModel):
    id: str
    label: str
    original_filename: str
    content_type: str
    size_bytes: int
    download_url: str
    link_html: str
    downloads: int
    created_at: datetime


class DownloadEventRead(BaseModel):
    id: str
    ip_address: str | None
    user_agent: str | None
    referer: str | None
    downloaded_at: datetime

    model_config = {"from_attributes": True}


class TrackedAttachmentDetail(TrackedAttachmentRead):
    download_events: list[DownloadEventRead]

from datetime import datetime

from pydantic import BaseModel, EmailStr


class ReportPreferencesRead(BaseModel):
    id: str
    recipient_email: EmailStr
    daily_enabled: bool
    weekly_enabled: bool
    immediate_open_enabled: bool
    immediate_click_enabled: bool
    immediate_download_enabled: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportPreferencesUpdate(BaseModel):
    recipient_email: EmailStr | None = None
    daily_enabled: bool = False
    weekly_enabled: bool = False
    immediate_open_enabled: bool = False
    immediate_click_enabled: bool = False
    immediate_download_enabled: bool = False


class ReportHistoryItem(BaseModel):
    id: str
    report_type: str
    recipient_email: EmailStr
    subject: str
    status: str
    message: str | None
    sent_at: datetime

    model_config = {"from_attributes": True}


class ReportSendResult(BaseModel):
    sent: bool
    message: str
    subject: str
    preview_text: str
    preview_html: str

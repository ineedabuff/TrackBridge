from datetime import datetime

from pydantic import BaseModel


class AnalyticsTotals(BaseModel):
    tracked_emails: int
    tracked_links: int
    tracked_attachments: int
    opens: int
    clicks: int
    downloads: int
    total_events: int


class AnalyticsRates(BaseModel):
    open_rate: float
    click_rate: float
    download_rate: float


class AnalyticsSeriesPoint(BaseModel):
    date: str
    opens: int
    clicks: int
    downloads: int


class AnalyticsActivityItem(BaseModel):
    event_type: str
    title: str
    target: str
    occurred_at: datetime
    ip_address: str | None
    user_agent: str | None


class AnalyticsTopItem(BaseModel):
    item_type: str
    title: str
    target: str
    events: int


class AnalyticsOverview(BaseModel):
    totals: AnalyticsTotals
    rates: AnalyticsRates
    series: list[AnalyticsSeriesPoint]
    recent_activity: list[AnalyticsActivityItem]
    top_items: list[AnalyticsTopItem]

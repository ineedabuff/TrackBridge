from functools import lru_cache

from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TRACKBRIDGE_", env_file=".env", extra="ignore")

    app_name: str = "TrackBridge"
    env: str = "development"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = Field(min_length=16, default="change-me-before-production")
    access_token_expire_minutes: int = 60
    database_url: str = "postgresql+psycopg://trackbridge:trackbridge@postgres:5432/trackbridge"
    redis_url: str = "redis://redis:6379/0"
    frontend_url: AnyUrl | str = "http://localhost:5173"
    public_base_url: AnyUrl | str | None = None
    extension_origin_regex: str = r"chrome-extension://.*"
    attachment_storage_path: str = "storage/attachments"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()

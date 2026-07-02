import os
from pathlib import Path

os.environ.setdefault("TRACKBRIDGE_DATABASE_URL", "sqlite:///./test_trackbridge.db")
os.environ.setdefault("TRACKBRIDGE_SECRET_KEY", "test-secret-key-with-enough-length")
os.environ.setdefault("TRACKBRIDGE_ATTACHMENT_STORAGE_PATH", "./test-attachments")

TEST_DB = Path("test_trackbridge.db")
if TEST_DB.exists():
    TEST_DB.unlink()

TEST_ATTACHMENTS = Path("test-attachments")
if TEST_ATTACHMENTS.exists():
    for item in TEST_ATTACHMENTS.iterdir():
        if item.is_file():
            item.unlink()
else:
    TEST_ATTACHMENTS.mkdir()

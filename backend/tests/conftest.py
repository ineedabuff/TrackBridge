import os
from pathlib import Path

os.environ.setdefault("TRACKBRIDGE_DATABASE_URL", "sqlite:///./test_trackbridge.db")
os.environ.setdefault("TRACKBRIDGE_SECRET_KEY", "test-secret-key-with-enough-length")

TEST_DB = Path("test_trackbridge.db")
if TEST_DB.exists():
    TEST_DB.unlink()

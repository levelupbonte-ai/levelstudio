"""Pre-scaffolded pytest fixtures for the FastAPI backend.

Tests hit the live uvicorn process managed by supervisor (not an in-process ASGI app), so
the app under test is the same one the frontend and Playwright see. Do NOT re-create this
file — add app-specific fixtures below the marker at the bottom.
"""

import os

import httpx
import pytest
import pytest_asyncio

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8001")
API_URL = f"{BACKEND_URL}/api"


def api_url(path: str = "") -> str:
    """Absolute URL for an /api route: api_url("/status") -> http://localhost:8001/api/status."""
    return f"{API_URL}{path}"


@pytest.fixture(scope="session")
def backend_url() -> str:
    return BACKEND_URL


@pytest.fixture
def client():
    """Sync httpx client rooted at /api — the default for endpoint tests.

    Example:
        def test_status(client):
            assert client.get("/status").status_code == 200
    """
    with httpx.Client(base_url=API_URL, timeout=30.0) as c:
        yield c


@pytest_asyncio.fixture
async def aclient():
    """Async variant, for tests that also await motor/backend helpers directly."""
    async with httpx.AsyncClient(base_url=API_URL, timeout=30.0) as c:
        yield c


# --- app-specific fixtures below this line ---

import uuid
from datetime import datetime, timedelta, timezone

import pymongo

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "levelup_studio")


@pytest.fixture
def mongo_db():
    """Sync pymongo handle to the app's DB — for seeding/cleaning tscheck-* fixture rows."""
    mc = pymongo.MongoClient(MONGO_URL)
    try:
        yield mc[DB_NAME]
    finally:
        mc.close()


@pytest.fixture
def fixture_session(mongo_db):
    """Seeds a fresh user + session cookie for this test only; cleans up afterwards.

    Yields (cookie_dict, user_id) so tests can pass cookies=... to httpx.
    """
    suffix = uuid.uuid4().hex[:10]
    user_id = f"tscheck-user-{suffix}"
    token = f"tscheck-tok-{suffix}"
    now = datetime.now(timezone.utc)
    mongo_db.users.insert_one(
        {
            "user_id": user_id,
            "email": f"{user_id}@example.com",
            "name": "TSCheck Fixture User",
            "picture": "",
            "created_at": now,
        }
    )
    mongo_db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": token,
            "expires_at": now + timedelta(days=7),
            "created_at": now,
        }
    )
    try:
        yield {"session_token": token}, user_id
    finally:
        mongo_db.users.delete_one({"user_id": user_id})
        mongo_db.user_sessions.delete_one({"session_token": token})

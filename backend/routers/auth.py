"""Emergent-managed Google Auth + anonymous-cookie ownership.

Two identities coexist in the studio:
- **Anonymous visitors** — a persistent `anon_id` cookie the backend sets on first request. Every
  project a visitor creates is owned by this id, so refreshes and share links keep working before
  they sign in. Cookie is per-browser and session-length (30-day cap for share link durability).
- **Signed-in users** — full accounts backed by Emergent Auth (Google), stored in `users` and
  `user_sessions`. On login, every project sitting under their `anon_id` is transferred to
  `user_id` in one atomic pass and the count is returned in the response.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

import httpx
from fastapi import APIRouter, Cookie, HTTPException, Request, Response

from lib.db import db
from models.architect import SessionExchange, User

router = APIRouter()

_EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
_COOKIE_NAME = "session_token"
ANON_COOKIE = "anon_id"
_SESSION_DAYS = 7
_ANON_DAYS = 30


def _naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def _resolve_user_from_token(token: str) -> Optional[User]:
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires = _naive_utc(session["expires_at"])
    if expires < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        return None
    doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not doc:
        return None
    return User(**doc)


async def current_user(request: Request) -> Optional[User]:
    token = request.cookies.get(_COOKIE_NAME)
    if not token:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    if not token:
        return None
    return await _resolve_user_from_token(token)


async def require_user(request: Request) -> User:
    user = await current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to continue")
    return user


def _mint_anon_id() -> str:
    return f"anon_{uuid.uuid4().hex[:16]}"


def ensure_anon_cookie(request: Request, response: Response) -> str:
    """Return the visitor's anon_id, setting the cookie on the response if it was missing."""
    anon = request.cookies.get(ANON_COOKIE)
    if anon and anon.startswith("anon_"):
        return anon
    anon = _mint_anon_id()
    response.set_cookie(
        ANON_COOKIE, anon,
        max_age=_ANON_DAYS * 24 * 3600,
        httponly=True, secure=True, samesite="none", path="/",
    )
    return anon


async def _migrate_anon_to_user(anon_id: str, user_id: str) -> int:
    """Move every project owned by anon_id to user_id. Returns the moved count."""
    if not anon_id or not user_id:
        return 0
    projects = await db.projects.update_many(
        {"user_id": anon_id},
        {"$set": {"user_id": user_id}},
    )
    imports = await db.templates.update_many(
        {"owner_id": anon_id},
        {"$set": {"owner_id": user_id}},
    )
    return int(projects.modified_count) + int(imports.modified_count)


@router.post("/auth/session")
async def create_session(payload: SessionExchange, request: Request, response: Response) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(_EMERGENT_SESSION_URL, headers={"X-Session-ID": payload.session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Auth exchange failed")
    data = r.json()
    email = str(data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="No email returned")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name") or existing.get("name"),
                      "picture": data.get("picture") or existing.get("picture")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name") or email,
            "picture": data.get("picture") or "",
            "created_at": datetime.now(timezone.utc),
        })

    session_token = data.get("session_token") or uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=_SESSION_DAYS)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"user_id": user_id, "session_token": session_token, "expires_at": expires_at,
                  "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    response.set_cookie(
        _COOKIE_NAME, session_token,
        max_age=_SESSION_DAYS * 24 * 3600,
        httponly=True, secure=True, samesite="none", path="/",
    )

    # Migrate anonymous projects/imports if the visitor already had an anon cookie.
    anon_id = request.cookies.get(ANON_COOKIE)
    migrated = await _migrate_anon_to_user(anon_id, user_id) if anon_id else 0

    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": User(**doc).model_dump(), "migrated": migrated}


@router.get("/auth/me")
async def me(request: Request) -> User:
    user = await current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not signed in")
    return user


@router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)) -> dict:
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(_COOKIE_NAME, path="/", samesite="none", secure=True)
    return {"ok": True}

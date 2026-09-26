"""Level IA architect routes — chat, projects, quota."""

import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Set

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from lib.architect_brain import run_architect
from lib.db import db
from lib.html_post import harden_images
from models.architect import (
    ChatRequest,
    ChatResponse,
    Message,
    Project,
    ProjectSummary,
    Question,
    Choice,
    Quota,
    ShareLink,
)

logger = logging.getLogger(__name__)
router = APIRouter()

DAILY_LIMIT = 20

# Strong refs to in-flight background builds so the loop cannot garbage-collect them mid-run.
_JOBS: Set["asyncio.Task[None]"] = set()
# project_id -> running build task, so the user can stop a build.
_RUNNING: Dict[str, "asyncio.Task[None]"] = {}

SHARE_DAYS = 7

STAGES = [
    "Reading your brief",
    "Choosing the design direction",
    "Laying out the navigation and hero",
    "Writing the page sections",
    "Building the interactive screens",
    "Tuning the mobile layout",
    "Final polish",
]


async def _set_progress(project_id: str, step: int) -> None:
    step = max(0, min(step, len(STAGES) - 1))
    await db.projects.update_one(
        {"id": project_id}, {"$set": {"progress": STAGES[step], "progress_step": step}}
    )


async def _progress_ticker(project_id: str) -> None:
    """Walks the build stages while the model works, so the wait shows real movement."""
    try:
        for step in range(len(STAGES)):
            await _set_progress(project_id, step)
            await asyncio.sleep(16)
    except asyncio.CancelledError:
        raise


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _resets_at() -> datetime:
    now = datetime.now(timezone.utc)
    return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


async def _quota(consume: bool = False) -> Quota:
    day = _today()
    if consume:
        doc = await db.usage.find_one_and_update(
            {"day": day}, {"$inc": {"used": 1}}, upsert=True, return_document=True
        )
        used = int(doc.get("used", 1)) if doc else 1
    else:
        doc = await db.usage.find_one({"day": day})
        used = int(doc.get("used", 0)) if doc else 0
    return Quota(
        used=used,
        limit=DAILY_LIMIT,
        remaining=max(DAILY_LIMIT - used, 0),
        day=day,
        resets_at=_resets_at(),
    )


def _aware(project: Dict[str, Any]) -> Dict[str, Any]:
    """Motor hands back naive datetimes — normalise to aware UTC before Pydantic."""
    for key in ("created_at", "updated_at"):
        value = project.get(key)
        if isinstance(value, datetime) and value.tzinfo is None:
            project[key] = value.replace(tzinfo=timezone.utc)
    for msg in project.get("messages", []):
        value = msg.get("created_at")
        if isinstance(value, datetime) and value.tzinfo is None:
            msg["created_at"] = value.replace(tzinfo=timezone.utc)
    return project


async def _load(project_id: str) -> Project:
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    project = Project(**_aware(doc))
    # A build orphaned by a restart must not leave the project spinning forever.
    if project.generating and (datetime.now(timezone.utc) - project.updated_at).total_seconds() > 600:
        project.generating = False
        await db.projects.update_one({"id": project_id}, {"$set": {"generating": False}})
    return project


@router.get("/quota", response_model=Quota)
async def get_quota() -> Quota:
    return await _quota()


@router.get("/projects", response_model=List[ProjectSummary])
async def list_projects() -> List[ProjectSummary]:
    docs = await db.projects.find({}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    out: List[ProjectSummary] = []
    for doc in docs:
        doc = _aware(doc)
        out.append(
            ProjectSummary(
                id=doc["id"],
                title=doc.get("title") or "New project",
                style=doc.get("style"),
                has_site=bool(doc.get("html")),
                updated_at=doc["updated_at"],
            )
        )
    return out


@router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    return await _load(project_id)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str) -> Dict[str, bool]:
    res = await db.projects.delete_one({"id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}


@router.get("/projects/{project_id}/html", response_class=HTMLResponse)
async def get_project_html(project_id: str) -> HTMLResponse:
    project = await _load(project_id)
    if not project.html:
        raise HTTPException(status_code=404, detail="No site generated yet")
    return HTMLResponse(content=project.html)


QUOTA_MESSAGE = (
    "We have reached the studio's build budget for today. Every project you started is saved in the "
    "sidebar, so you can keep reviewing its live preview and share links. Come back tomorrow and I "
    "will pick up exactly where we left off, or contact LevelUp Studio to turn one of these previews "
    "into your real website right away."
)


@router.post("/projects/{project_id}/stop", response_model=Project)
async def stop_build(project_id: str) -> Project:
    project = await _load(project_id)
    task = _RUNNING.pop(project_id, None)
    if task and not task.done():
        task.cancel()
    project.generating = False
    project.progress = None
    project.progress_step = 0
    project.messages.append(
        Message(
            role="assistant",
            kind="text",
            text="Build stopped. Tell me what to change and I will start again.",
        )
    )
    project.updated_at = datetime.now(timezone.utc)
    await db.projects.replace_one({"id": project.id}, project.model_dump(), upsert=True)
    return project


@router.post("/projects/{project_id}/share", response_model=ShareLink)
async def create_share_link(project_id: str) -> ShareLink:
    project = await _load(project_id)
    if not project.html:
        raise HTTPException(status_code=404, detail="No site generated yet")

    now = datetime.now(timezone.utc)
    expires = project.share_expires_at
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if not project.share_token or expires is None or expires <= now:
        project.share_token = uuid.uuid4().hex
        expires = now + timedelta(days=SHARE_DAYS)
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"share_token": project.share_token, "share_expires_at": expires}},
        )

    path = f"/api/share/{project.share_token}"
    base = os.environ.get("APP_URL", "").rstrip("/")
    return ShareLink(url=f"{base}{path}" if base else path, path=path, expires_at=expires)


@router.get("/share/{token}", response_class=HTMLResponse)
async def shared_site(token: str) -> HTMLResponse:
    doc = await db.projects.find_one({"share_token": token}, {"_id": 0})
    if not doc or not doc.get("html"):
        raise HTTPException(status_code=404, detail="This preview link does not exist")
    expires = doc.get("share_expires_at")
    if isinstance(expires, datetime):
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires <= datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="This preview link has expired")
    return HTMLResponse(content=doc["html"], headers={"X-Robots-Tag": "noindex, nofollow"})


async def _generate(project_id: str, transcript: List[Dict[str, Any]], images: List[Dict[str, str]]) -> None:
    """Runs the architect off the request cycle — a full build takes longer than any HTTP timeout."""
    try:
        project = await _load(project_id)
    except HTTPException:
        return

    ticker = asyncio.create_task(_progress_ticker(project_id))
    reply = Message(role="assistant", kind="error", text="")
    result: Dict[str, Any] | None = None
    try:
        result = await run_architect(project_id, transcript, project.html, images)
    except asyncio.CancelledError:
        ticker.cancel()
        await db.projects.update_one(
            {"id": project_id}, {"$set": {"generating": False, "progress": None, "progress_step": 0}}
        )
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("architect call failed")
        reply.text = (
            "The studio could not reach the design engine just now. Send your request again and I "
            "will pick it straight back up."
        )
        logger.error("architect error detail: %s", exc)
    finally:
        ticker.cancel()

    project = await _load(project_id)  # re-read: the ticker wrote progress fields

    if result is not None:
        kind = result.get("kind", "refusal")
        reply.kind = "refusal"
        reply.text = str(result.get("text", "")).strip()

        if kind == "questions":
            questions: List[Question] = []
            for raw_q in result.get("questions", [])[:5]:
                options = [Choice(label=str(o)) for o in (raw_q.get("options") or [])[:5]]
                questions.append(
                    Question(
                        label=str(raw_q.get("label", "")),
                        options=options,
                        multi=bool(raw_q.get("multi", False)),
                    )
                )
            reply.kind = "questions"
            reply.questions = questions
            if not reply.text:
                reply.text = "A few quick decisions before I build."
        elif kind == "site" and result.get("html"):
            reply.kind = "site"
            reply.html = harden_images(str(result["html"]))
            reply.site_name = str(result.get("title") or project.title)
            reply.site_style = str(result.get("style") or "")
            if not reply.text:
                reply.text = "Your site is ready."
            project.html = reply.html
            project.style = reply.site_style
        elif not reply.text:
            reply.text = "I only build websites. Tell me about your business and I'll design it."

        if result.get("title"):
            # The architect's title beats the raw prompt we used as a placeholder.
            project.title = str(result["title"])[:60]

    project.messages.append(reply)
    project.generating = False
    project.progress = None
    project.progress_step = 0
    project.updated_at = datetime.now(timezone.utc)
    await db.projects.replace_one({"id": project.id}, project.model_dump(), upsert=True)


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    if not payload.text.strip() and not payload.attachments:
        raise HTTPException(status_code=422, detail="Message is empty")

    current = await _quota()
    if current.remaining <= 0:
        raise HTTPException(status_code=429, detail=QUOTA_MESSAGE)

    project = await _load(payload.project_id) if payload.project_id else Project()
    if project.generating:
        raise HTTPException(status_code=409, detail="A build is already running for this project")

    user_text = payload.text.strip()
    context_bits: List[str] = []
    images: List[Dict[str, str]] = []
    for att in payload.attachments:
        if att.kind == "image" and att.data:
            images.append({"data": att.data})
            context_bits.append(f"[attached image: {att.name}]")
        elif att.data:
            context_bits.append(f"[attached file {att.name}]:\n{att.data[:20000]}")
        else:
            context_bits.append(f"[attached file: {att.name}]")

    user_msg = Message(role="user", kind="text", text=user_text, attachments=payload.attachments)
    project.messages.append(user_msg)

    transcript: List[Dict[str, Any]] = []
    for msg in project.messages:
        if msg.kind == "site":
            transcript.append({"role": "assistant", "text": f"(delivered site: {msg.site_name})"})
        elif msg.kind == "questions":
            qs = "; ".join(f"{q.label} [{', '.join(c.label for c in q.options)}]" for q in msg.questions)
            transcript.append({"role": "assistant", "text": f"Asked: {qs}"})
        else:
            transcript.append({"role": msg.role, "text": msg.text})
    if context_bits:
        transcript.append({"role": "user", "text": "\n".join(context_bits)})

    if project.title == "New project" and user_text:
        project.title = user_text[:48]
    project.generating = True
    project.progress = STAGES[0]
    project.progress_step = 0
    project.updated_at = datetime.now(timezone.utc)
    await db.projects.replace_one({"id": project.id}, project.model_dump(), upsert=True)

    quota = await _quota(consume=True)
    task = asyncio.create_task(_generate(project.id, transcript, images))
    _JOBS.add(task)
    _RUNNING[project.id] = task
    task.add_done_callback(_JOBS.discard)
    task.add_done_callback(lambda t, pid=project.id: _RUNNING.pop(pid, None))
    return ChatResponse(project=project, quota=quota)

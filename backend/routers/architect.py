"""LevelUp Studio architect routes — chat, projects, quota, templates, share."""

import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

from lib.architect_brain import run_architect, quick_analysis
from lib.db import db
from lib.html_post import harden_images
from lib.templates import TEMPLATES
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
    Template,
)
from routers.auth import require_user, current_user

logger = logging.getLogger(__name__)
router = APIRouter()

DAILY_LIMIT = 20

# Strong refs to in-flight background builds so the loop cannot garbage-collect them mid-run.
_JOBS: Set["asyncio.Task[None]"] = set()
_RUNNING: Dict[str, "asyncio.Task[None]"] = {}

SHARE_DAYS = 7

# Stages align with the brain's phases. The mouse-cursor animation reads `progress_focus` to know
# where on the page it should be pointing next.
STAGES = [
    "Analysing your brief",
    "Choosing the design direction",
    "Laying out navigation and hero",
    "Writing the page sections",
    "Building the interactive screens",
    "Tuning the mobile layout",
    "Checking every section is complete",
]

STAGE_NOTES = [
    "Reading every answer you gave, in the order you gave them.",
    "Picking a palette and type pairing that fits your trade.",
    "Structuring the pages the way visitors read them.",
    "Writing real copy, no filler text.",
    "Wiring the booking, menu and account screens.",
    "Making sure it feels right in one hand.",
    "A last pass so nothing ships half finished.",
]

STAGE_FOCUS = [
    "brief", "palette", "hero", "sections", "interactions", "mobile", "review",
]

EXPECTED_SECONDS = 150


async def _set_progress(project_id: str, step: int, pct: int) -> None:
    step = max(0, min(step, len(STAGES) - 1))
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "progress": STAGES[step],
            "progress_step": step,
            "progress_pct": min(pct, 99),
            "progress_focus": STAGE_FOCUS[step],
        }},
    )


async def _progress_ticker(project_id: str) -> None:
    elapsed = 0.0
    try:
        while True:
            pct = int(min(99, (elapsed / EXPECTED_SECONDS) * 100))
            step = min(int(elapsed // (EXPECTED_SECONDS / len(STAGES))), len(STAGES) - 1)
            await _set_progress(project_id, step, pct)
            await asyncio.sleep(2)
            elapsed += 2
    except asyncio.CancelledError:
        raise


async def _seed_templates_if_needed() -> None:
    """Reset the collection if it is empty OR any doc is missing the current schema keys."""
    docs = await db.templates.find({}, {"_id": 0}).to_list(200)
    seed_ids = {t["id"] for t in TEMPLATES}
    needs_reset = (
        not docs
        or any("service" not in d for d in docs)
        or any(d["id"] not in seed_ids for d in docs)
        or len(docs) != len(TEMPLATES)
    )
    if needs_reset:
        await db.templates.delete_many({})
        await db.templates.insert_many([dict(t) for t in TEMPLATES])


@router.get("/templates", response_model=List[Template])
async def list_templates(service: Optional[str] = None) -> List[Template]:
    await _seed_templates_if_needed()
    query: Dict[str, Any] = {}
    if service and service != "all":
        query["service"] = service
    docs = await db.templates.find(query, {"_id": 0, "html": 0}).to_list(200)
    order = {t["id"]: i for i, t in enumerate(TEMPLATES)}
    docs.sort(key=lambda d: order.get(d["id"], 999))
    return [Template(**d) for d in docs]


@router.get("/templates/{template_id}/html", response_class=HTMLResponse)
async def template_html(template_id: str) -> HTMLResponse:
    doc = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not doc:
        doc = next((dict(t) for t in TEMPLATES if t["id"] == template_id), None)
    if not doc or not doc.get("html"):
        raise HTTPException(status_code=404, detail="Template preview not available")
    return HTMLResponse(content=doc["html"])


async def _get_template(template_id: Optional[str]) -> Optional[Dict[str, Any]]:
    if not template_id:
        return None
    doc = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if doc:
        return doc
    return next((dict(t) for t in TEMPLATES if t["id"] == template_id), None)


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
        used=used, limit=DAILY_LIMIT, remaining=max(DAILY_LIMIT - used, 0),
        day=day, resets_at=_resets_at(),
    )


def _aware(project: Dict[str, Any]) -> Dict[str, Any]:
    for key in ("created_at", "updated_at"):
        value = project.get(key)
        if isinstance(value, datetime) and value.tzinfo is None:
            project[key] = value.replace(tzinfo=timezone.utc)
    for msg in project.get("messages", []):
        value = msg.get("created_at")
        if isinstance(value, datetime) and value.tzinfo is None:
            msg["created_at"] = value.replace(tzinfo=timezone.utc)
    return project


async def _load(project_id: str, user_id: Optional[str] = None) -> Project:
    query: Dict[str, Any] = {"id": project_id}
    if user_id:
        query["user_id"] = user_id
    doc = await db.projects.find_one(query, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    project = Project(**_aware(doc))
    if project.generating and (datetime.now(timezone.utc) - project.updated_at).total_seconds() > 600:
        project.generating = False
        await db.projects.update_one({"id": project_id}, {"$set": {"generating": False}})
    return project


@router.get("/quota", response_model=Quota)
async def get_quota() -> Quota:
    return await _quota()


@router.get("/projects", response_model=List[ProjectSummary])
async def list_projects(request: Request) -> List[ProjectSummary]:
    user = await current_user(request)
    if not user:
        return []
    docs = await db.projects.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    out: List[ProjectSummary] = []
    for doc in docs:
        doc = _aware(doc)
        out.append(ProjectSummary(
            id=doc["id"],
            title=doc.get("title") or "New project",
            style=doc.get("style"),
            has_site=bool(doc.get("html")),
            updated_at=doc["updated_at"],
        ))
    return out


@router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, request: Request) -> Project:
    user = await current_user(request)
    return await _load(project_id, user.user_id if user else None)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, request: Request) -> Dict[str, bool]:
    user = await require_user(request)
    res = await db.projects.delete_one({"id": project_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}


@router.get("/projects/{project_id}/html", response_class=HTMLResponse)
async def get_project_html(project_id: str, request: Request) -> HTMLResponse:
    user = await current_user(request)
    project = await _load(project_id, user.user_id if user else None)
    if not project.html:
        raise HTTPException(status_code=404, detail="No site generated yet")
    return HTMLResponse(content=project.html)


QUOTA_MESSAGE = (
    "We have reached the studio's build budget for today. Every project you started is saved in "
    "your workspace, so you can keep reviewing its live preview and share links. Come back "
    "tomorrow and I will pick up exactly where we left off, or contact LevelUp Studio to turn "
    "one of these previews into your real website right away."
)


@router.post("/projects/{project_id}/stop", response_model=Project)
async def stop_build(project_id: str, request: Request) -> Project:
    user = await require_user(request)
    project = await _load(project_id, user.user_id)
    task = _RUNNING.pop(project_id, None)
    if task and not task.done():
        task.cancel()
    project.generating = False
    project.progress = None
    project.progress_step = 0
    project.progress_focus = None
    project.messages.append(Message(
        role="assistant", kind="text",
        text="Build stopped. Tell me what to change and I will start again.",
    ))
    project.updated_at = datetime.now(timezone.utc)
    await db.projects.replace_one({"id": project.id}, project.model_dump(), upsert=True)
    return project


@router.post("/projects/{project_id}/share", response_model=ShareLink)
async def create_share_link(project_id: str, request: Request) -> ShareLink:
    user = await require_user(request)
    project = await _load(project_id, user.user_id)
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


def _looks_complete(html: str) -> bool:
    lowered = html.lower()
    return len(html) > 6000 and "</html>" in lowered and lowered.count("<section") >= 4


async def _generate(project_id: str, transcript: List[Dict[str, Any]],
                    images: List[Dict[str, str]], template_id: Optional[str]) -> None:
    try:
        project = await _load(project_id)
    except HTTPException:
        return

    base_template = await _get_template(template_id or project.template_id)
    ticker = asyncio.create_task(_progress_ticker(project_id))
    reply = Message(role="assistant", kind="error", text="")
    result: Optional[Dict[str, Any]] = None
    try:
        result = await run_architect(project_id, transcript, project.html, images, base_template)
        if result.get("kind") == "site" and not _looks_complete(str(result.get("html") or "")):
            logger.warning("incomplete document for %s, retrying once", project_id)
            retry_transcript = transcript + [{
                "role": "user",
                "text": "Your last document was incomplete. Rebuild it in full, every section "
                        "written out, ending with </body></html>.",
            }]
            result = await run_architect(project_id, retry_transcript, project.html, images, base_template)
    except asyncio.CancelledError:
        ticker.cancel()
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"generating": False, "progress": None, "progress_step": 0,
                      "progress_pct": 0, "progress_focus": None}},
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

    project = await _load(project_id)

    if result is not None:
        kind = result.get("kind", "refusal")
        reply.kind = "refusal"
        reply.text = str(result.get("text", "")).strip()

        if kind == "questions":
            questions: List[Question] = []
            for raw_q in result.get("questions", [])[:5]:
                options = [Choice(label=str(o)) for o in (raw_q.get("options") or [])[:5]]
                questions.append(Question(
                    label=str(raw_q.get("label", "")),
                    options=options,
                    multi=bool(raw_q.get("multi", False)),
                ))
            reply.kind = "questions"
            reply.questions = questions
            if not reply.text:
                reply.text = "A few quick decisions before I build."
        elif kind == "site" and result.get("html"):
            reply.kind = "site"
            reply.html = harden_images(str(result["html"]))
            reply.site_name = str(result.get("title") or project.title)
            reply.site_style = str(result.get("style") or "")
            reply.suggestions = [str(s)[:60] for s in (result.get("suggestions") or [])[:3]]
            if not reply.text:
                reply.text = "Your site is ready."
            project.html = reply.html
            project.style = reply.site_style
        elif not reply.text:
            reply.text = "I only build websites. Tell me about your business and I'll design it."

        if result.get("title"):
            project.title = str(result["title"])[:60]

    project.messages.append(reply)
    project.generating = False
    project.progress = None
    project.progress_step = 0
    project.progress_focus = None
    project.updated_at = datetime.now(timezone.utc)
    await db.projects.replace_one({"id": project.id}, project.model_dump(), upsert=True)


# --- attachments scan --------------------------------------------------------

_ALLOWED_MIME_PREFIXES = ("image/", "text/")
_ALLOWED_MIME_EXTRA = {
    "application/pdf",
    "application/json",
    "application/xml",
}
_MAX_ATT_BYTES = 5 * 1024 * 1024


def _scan_attachments(atts: List[Any]) -> List[Any]:
    """Mark each attachment ok / unsupported / too_large / empty. Rejected ones lose their data
    payload so the model does not receive random bytes."""
    for att in atts:
        mime = (att.mime or "").lower()
        allowed = mime.startswith(_ALLOWED_MIME_PREFIXES) or mime in _ALLOWED_MIME_EXTRA
        if not allowed:
            att.scan = "unsupported"
            att.data = ""
            continue
        payload = att.data or ""
        if att.kind == "image":
            # rough base64 size check
            approx = len(payload) * 3 // 4
        else:
            approx = len(payload.encode("utf-8", errors="ignore"))
        if approx > _MAX_ATT_BYTES:
            att.scan = "too_large"
            att.data = ""
            continue
        if att.kind != "other" and not payload:
            att.scan = "empty"
        else:
            att.scan = "ok"
    return atts


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    user = await require_user(request)
    if not payload.text.strip() and not payload.attachments:
        raise HTTPException(status_code=422, detail="Message is empty")

    current = await _quota()
    if current.remaining <= 0:
        raise HTTPException(status_code=429, detail=QUOTA_MESSAGE)

    if payload.project_id:
        project = await _load(payload.project_id, user.user_id)
    else:
        project = Project(user_id=user.user_id)
    if project.generating:
        raise HTTPException(status_code=409, detail="A build is already running for this project")
    if payload.template_id:
        project.template_id = payload.template_id

    user_text = payload.text.strip()
    scanned = _scan_attachments(list(payload.attachments))
    context_bits: List[str] = []
    images: List[Dict[str, str]] = []
    for att in scanned:
        if att.scan != "ok":
            context_bits.append(f"[attached file rejected: {att.name} ({att.scan})]")
            continue
        if att.kind == "image" and att.data:
            images.append({"data": att.data})
            context_bits.append(f"[attached image: {att.name}]")
        elif att.data:
            context_bits.append(f"[attached file {att.name}]:\n{att.data[:20000]}")
        else:
            context_bits.append(f"[attached file: {att.name}]")

    user_msg = Message(role="user", kind="text", text=user_text, attachments=scanned)
    project.messages.append(user_msg)

    # Analysis pass — a short, contextual note about what the architect understood, written into
    # the transcript before the model is asked to react. Style-cards' brief_prompt is also folded in.
    base_template = await _get_template(project.template_id)
    style_brief = ""
    if base_template and base_template.get("kind") == "style" and base_template.get("brief_prompt"):
        style_brief = str(base_template["brief_prompt"])

    is_first_turn = not any(m.kind in ("questions", "site") for m in project.messages[:-1])
    if is_first_turn and user_text:
        try:
            analysis = await quick_analysis(user_text, style_brief)
        except Exception:  # noqa: BLE001
            analysis = ""
        if analysis:
            project.messages.append(Message(
                role="assistant", kind="analysis",
                text=analysis,
            ))

    transcript: List[Dict[str, Any]] = []
    if style_brief:
        transcript.append({"role": "user", "text": f"[style brief chosen from gallery]\n{style_brief}"})
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
    project.progress_pct = 1
    project.progress_focus = STAGE_FOCUS[0]
    project.updated_at = datetime.now(timezone.utc)
    if not project.user_id:
        project.user_id = user.user_id
    await db.projects.replace_one({"id": project.id}, project.model_dump(), upsert=True)

    quota = await _quota(consume=True)
    task = asyncio.create_task(_generate(project.id, transcript, images, project.template_id))
    _JOBS.add(task)
    _RUNNING[project.id] = task
    task.add_done_callback(_JOBS.discard)
    task.add_done_callback(lambda t, pid=project.id: _RUNNING.pop(pid, None))
    return ChatResponse(project=project, quota=quota)

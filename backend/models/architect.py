"""Pydantic v2 models for the Level IA architect workspace."""

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uid() -> str:
    return str(uuid.uuid4())


class Attachment(BaseModel):
    name: str
    mime: str = "text/plain"
    kind: Literal["image", "text", "pdf", "other"] = "other"
    # base64 payload (images) or extracted text (code / text files)
    data: str = ""


class Choice(BaseModel):
    id: str = Field(default_factory=_uid)
    label: str


class Question(BaseModel):
    id: str = Field(default_factory=_uid)
    label: str
    options: List[Choice] = Field(default_factory=list)
    multi: bool = False
    allow_custom: bool = True


class Message(BaseModel):
    id: str = Field(default_factory=_uid)
    role: Literal["user", "assistant"] = "assistant"
    kind: Literal["text", "questions", "site", "refusal", "error"] = "text"
    text: str = ""
    questions: List[Question] = Field(default_factory=list)
    attachments: List[Attachment] = Field(default_factory=list)
    site_name: Optional[str] = None
    site_style: Optional[str] = None
    html: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


class Project(BaseModel):
    id: str = Field(default_factory=_uid)
    title: str = "New project"
    style: Optional[str] = None
    html: Optional[str] = None
    generating: bool = False
    progress: Optional[str] = None
    progress_step: int = 0
    share_token: Optional[str] = None
    share_expires_at: Optional[datetime] = None
    messages: List[Message] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class ShareLink(BaseModel):
    url: str
    path: str
    expires_at: datetime


class ProjectSummary(BaseModel):
    id: str
    title: str
    style: Optional[str] = None
    has_site: bool = False
    updated_at: datetime


class Quota(BaseModel):
    used: int
    limit: int
    remaining: int
    day: str
    resets_at: datetime


class ChatRequest(BaseModel):
    project_id: Optional[str] = None
    text: str
    attachments: List[Attachment] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """The build runs in the background: the project comes back with generating=True and the
    client polls GET /projects/{id} until the assistant message lands."""

    project: Project
    quota: Quota

"""Share link criterion: POST /projects/{id}/share mints a token that serves the site
publicly (via APP_URL) and is not indexable; unknown tokens 404.

Not part of the current acceptance_matrix but kept passing (auth cookie added) since
chat/projects routes became auth-gated in this iteration.
"""

import os
import uuid
from datetime import datetime, timezone

import httpx

APP_URL = os.environ.get("APP_URL", "https://imported-repos-hub.preview.emergentagent.com")


def _seed_delivered_project(mongo_db, user_id: str) -> str:
    project_id = f"tscheck-share-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    mongo_db.projects.insert_one(
        {
            "id": project_id,
            "user_id": user_id,
            "title": "TSCheck Barbershop",
            "style": None,
            "html": "<!doctype html><html><head><title>tscheck</title></head><body>tscheck site</body></html>",
            "generating": False,
            "progress": None,
            "progress_step": 0,
            "progress_pct": 0,
            "share_token": None,
            "share_expires_at": None,
            "created_at": now,
            "updated_at": now,
            "messages": [],
        }
    )
    return project_id


def test_share_link_serves_html_and_is_noindex(client: httpx.Client, mongo_db, fixture_session):
    cookies, user_id = fixture_session
    project_id = _seed_delivered_project(mongo_db, user_id)
    try:
        resp = client.post(f"/projects/{project_id}/share", cookies=cookies)
        assert resp.status_code == 200, f"share mint failed: {resp.status_code} {resp.text[:300]}"
        data = resp.json()
        path = data.get("path") or data.get("url") or data.get("share_url")
        token = data.get("token")
        assert token or path, f"no token/path in share response: {data}"

        if path and path.startswith("http"):
            share_path = path[path.index("/api"):] if "/api" in path else path
        elif path:
            share_path = path
        else:
            share_path = f"/api/share/{token}"

        full_url = f"{APP_URL}{share_path}" if share_path.startswith("/") else f"{APP_URL}/{share_path}"
        with httpx.Client(timeout=30.0) as public_client:
            share_resp = public_client.get(full_url)
        assert share_resp.status_code == 200, f"share GET failed: {share_resp.status_code} body={share_resp.text[:200]}"
        assert "<html" in share_resp.text.lower() or "<!doctype" in share_resp.text.lower(), (
            f"share response is not HTML: {share_resp.text[:200]}"
        )
        robots = share_resp.headers.get("x-robots-tag", "")
        assert "noindex" in robots.lower(), f"missing X-Robots-Tag: noindex header, got {share_resp.headers}"
    finally:
        mongo_db.projects.delete_one({"id": project_id})


def test_share_link_unknown_token_404(client: httpx.Client):
    resp = client.get("/share/deadbeefdeadbeef")
    assert resp.status_code == 404, f"expected 404 for unknown token, got {resp.status_code} {resp.text[:200]}"

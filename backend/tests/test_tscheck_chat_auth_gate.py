"""Criterion: chat endpoint is auth-gated.

POST /api/chat without a session cookie -> 401.
GET /api/projects without a cookie -> 200 [] (intentional per spec_deviations).
GET /api/auth/me without a cookie -> 401.
"""

import httpx


def test_chat_requires_auth(client: httpx.Client):
    resp = client.post("/chat", json={"text": "A modern barbershop"})
    assert resp.status_code == 401, f"expected 401 for anonymous chat, got {resp.status_code} {resp.text[:300]}"


def test_projects_anonymous_returns_empty_list(client: httpx.Client):
    resp = client.get("/projects")
    assert resp.status_code == 200, f"expected 200 for anonymous /projects, got {resp.status_code} {resp.text[:300]}"
    assert resp.json() == [], f"expected empty list for anonymous /projects, got {resp.json()}"


def test_auth_me_requires_auth(client: httpx.Client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401, f"expected 401 for anonymous /auth/me, got {resp.status_code} {resp.text[:300]}"

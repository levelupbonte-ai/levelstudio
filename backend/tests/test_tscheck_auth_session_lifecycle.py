"""Criterion: auth session lifecycle via cookie works.

With a seeded valid session cookie: GET /api/auth/me -> 200 user JSON;
POST /api/chat with the same cookie -> 200 with a project + quota;
GET /api/projects with the same cookie -> includes that project.
"""

import httpx


def test_auth_me_and_chat_and_projects_with_session_cookie(client: httpx.Client, fixture_session):
    cookies, user_id = fixture_session

    me = client.get("/auth/me", cookies=cookies)
    assert me.status_code == 200, f"expected 200 for authed /auth/me, got {me.status_code} {me.text[:300]}"
    me_data = me.json()
    assert me_data.get("user_id") == user_id, f"unexpected user in /auth/me: {me_data}"

    chat = client.post(
        "/chat",
        json={"text": "Portfolio for a photographer in Lisbon"},
        cookies=cookies,
    )
    assert chat.status_code == 200, f"expected 200 for authed chat, got {chat.status_code} {chat.text[:300]}"
    chat_data = chat.json()
    assert "project" in chat_data, f"chat response missing 'project': {chat_data}"
    assert "quota" in chat_data, f"chat response missing 'quota': {chat_data}"
    project_id = chat_data["project"]["id"]

    projects = client.get("/projects", cookies=cookies)
    assert projects.status_code == 200, f"expected 200 for authed /projects, got {projects.status_code} {projects.text[:300]}"
    ids = [p["id"] for p in projects.json()]
    assert project_id in ids, f"newly-created project {project_id} not found in {ids}"

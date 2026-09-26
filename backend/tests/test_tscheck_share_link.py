"""Share link criterion: POST /projects/{id}/share mints a token that serves the site
publicly (via APP_URL) and is not indexable; unknown tokens 404."""

import os

import httpx

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8001")
API_URL = f"{BACKEND_URL}/api"

SEEDED_PROJECT_ID = "22089b5f-b8f1-41f6-82af-3d0be3813940"  # "Le Barbier du Port" (delivered site)
APP_URL = os.environ.get("APP_URL", "https://web-architect-46.preview.emergentagent.com")


def test_share_link_serves_html_and_is_noindex(client: httpx.Client):
    resp = client.post(f"/projects/{SEEDED_PROJECT_ID}/share")
    assert resp.status_code == 200, f"share mint failed: {resp.status_code} {resp.text[:300]}"
    data = resp.json()
    # locate the share path/token in the response
    path = data.get("path") or data.get("url") or data.get("share_url")
    token = data.get("token")
    assert token or path, f"no token/path in share response: {data}"

    if path and path.startswith("http"):
        share_path = path[path.index("/api"):] if "/api" in path else path
    elif path:
        share_path = path
    else:
        share_path = f"/api/share/{token}"

    # GET through the public ingress (APP_URL) — real path users hit.
    full_url = f"{APP_URL}{share_path}" if share_path.startswith("/") else f"{APP_URL}/{share_path}"
    with httpx.Client(timeout=30.0) as public_client:
        share_resp = public_client.get(full_url)
    assert share_resp.status_code == 200, f"share GET failed: {share_resp.status_code} body={share_resp.text[:200]}"
    assert "<html" in share_resp.text.lower() or "<!doctype" in share_resp.text.lower(), (
        f"share response is not HTML: {share_resp.text[:200]}"
    )
    robots = share_resp.headers.get("x-robots-tag", "")
    assert "noindex" in robots.lower(), f"missing X-Robots-Tag: noindex header, got {share_resp.headers}"


def test_share_link_unknown_token_404(client: httpx.Client):
    resp = client.get(f"{API_URL}/share/deadbeefdeadbeef".replace(API_URL, ""))
    resp = client.get("/share/deadbeefdeadbeef")
    assert resp.status_code == 404, f"expected 404 for unknown token, got {resp.status_code} {resp.text[:200]}"

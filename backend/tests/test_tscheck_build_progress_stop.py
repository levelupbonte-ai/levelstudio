"""Build progress + stop criterion: POST /api/chat starts a background build that
advances progress through STAGES, and POST /api/projects/{id}/stop cancels it,
appending an assistant 'Build stopped' message.

NOTE: this is the ONLY new build we trigger (budget discipline) and we stop it
immediately rather than let it complete.
"""

import time

import httpx


def test_chat_starts_background_build_with_progress_then_stop(client: httpx.Client):
    t0 = time.time()
    resp = client.post("/chat", json={"text": "Un site pour mon food truck a Lille (tscheck-progress-stop)"})
    elapsed = time.time() - t0
    assert resp.status_code == 200, f"chat failed: {resp.status_code} {resp.text[:300]}"
    assert elapsed < 2.0, f"POST /chat took {elapsed:.2f}s, expected <2s (background job contract)"

    data = resp.json()
    project = data.get("project") or data
    project_id = project.get("id")
    assert project_id, f"no project id in response: {data}"
    assert project.get("generating") is True, f"expected generating=true, got {project}"

    try:
        # Poll briefly to observe progress advancing through STAGES (best-effort, short window).
        seen_progress = None
        for _ in range(4):
            g = client.get(f"/projects/{project_id}")
            assert g.status_code == 200, f"get project failed: {g.status_code}"
            gp = g.json()
            if gp.get("generating") is False:
                break
            seen_progress = gp.get("progress", seen_progress)
            if gp.get("progress_step"):
                break
            time.sleep(1.5)
        # progress/progress_step fields should exist on the schema even if not yet advanced far
        g = client.get(f"/projects/{project_id}")
        gp = g.json()
        assert "progress" in gp or "progress_step" in gp, f"no progress fields on project: {list(gp.keys())}"
    finally:
        stop = client.post(f"/projects/{project_id}/stop")
        assert stop.status_code == 200, f"stop failed: {stop.status_code} {stop.text[:300]}"
        stopped = stop.json()
        stopped_project = stopped.get("project") or stopped
        assert stopped_project.get("generating") is False, f"expected generating=false after stop, got {stopped_project}"

        msgs = stopped_project.get("messages", [])
        assert any(
            "stop" in (m.get("text") or "").lower() for m in msgs if m.get("role") == "assistant"
        ), f"no assistant 'Build stopped' message found: {[m.get('text') for m in msgs if m.get('role')=='assistant']}"

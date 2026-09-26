"""Build progress + stop criterion: POST /api/chat starts a background build that
reports a live progress_pct through STAGES (backend/routers/architect.py), and
POST /api/projects/{id}/stop cancels it, resetting progress and appending an
assistant 'Build stopped' message.

NOTE: this is the ONLY new build we trigger (budget discipline) and we stop it
immediately rather than let it complete.
"""

import time

import httpx

# Mirrors backend/routers/architect.py STAGES so we assert against real stage names,
# not a hardcoded guess.
STAGES = [
    "Reading your brief",
    "Choosing the design direction",
    "Laying out the navigation and hero",
    "Writing the page sections",
    "Building the interactive screens",
    "Tuning the mobile layout",
    "Checking every section is complete",
]


def test_chat_starts_background_build_with_progress_then_stop(client: httpx.Client):
    t0 = time.time()
    resp = client.post("/chat", json={"text": "Site vitrine pour un food truck a Lille (tscheck)"})
    elapsed = time.time() - t0
    assert resp.status_code == 200, f"chat failed: {resp.status_code} {resp.text[:300]}"
    assert elapsed < 2.0, f"POST /chat took {elapsed:.2f}s, expected <2s (background job contract)"

    data = resp.json()
    project = data.get("project") or data
    project_id = project.get("id")
    assert project_id, f"no project id in response: {data}"
    assert project.get("generating") is True, f"expected generating=true, got {project}"
    assert (project.get("progress_pct") or 0) >= 1, f"expected progress_pct>=1 immediately, got {project.get('progress_pct')}"

    try:
        # First poll.
        g1 = client.get(f"/projects/{project_id}")
        assert g1.status_code == 200, f"get project failed: {g1.status_code}"
        gp1 = g1.json()
        pct1 = gp1.get("progress_pct")
        assert pct1 is not None, f"no progress_pct field: {list(gp1.keys())}"
        if gp1.get("progress") is not None:
            assert gp1["progress"] in STAGES, f"progress '{gp1['progress']}' not a known STAGES entry"

        # Wait a few seconds (ticker advances every 2s) then poll again.
        time.sleep(4.5)
        g2 = client.get(f"/projects/{project_id}")
        assert g2.status_code == 200, f"get project failed: {g2.status_code}"
        gp2 = g2.json()
        pct2 = gp2.get("progress_pct")
        assert pct2 is not None, f"no progress_pct field on second poll: {list(gp2.keys())}"
        if gp2.get("progress") is not None:
            assert gp2["progress"] in STAGES, f"progress '{gp2['progress']}' not a known STAGES entry"

        if gp2.get("generating") is not False:
            assert pct2 > pct1, f"progress_pct did not strictly increase across polls: {pct1} -> {pct2}"
    finally:
        stop = client.post(f"/projects/{project_id}/stop")
        assert stop.status_code == 200, f"stop failed: {stop.status_code} {stop.text[:300]}"
        stopped = stop.json()
        stopped_project = stopped.get("project") or stopped
        assert stopped_project.get("generating") is False, f"expected generating=false after stop, got {stopped_project}"
        assert stopped_project.get("progress_pct") == 0, f"expected progress_pct reset to 0 after stop, got {stopped_project.get('progress_pct')}"

        msgs = stopped_project.get("messages", [])
        assert any(
            "stop" in (m.get("text") or "").lower() for m in msgs if m.get("role") == "assistant"
        ), f"no assistant 'Build stopped' message found: {[m.get('text') for m in msgs if m.get('role')=='assistant']}"

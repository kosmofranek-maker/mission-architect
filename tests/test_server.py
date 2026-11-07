import json
import threading
import urllib.request
from http.server import ThreadingHTTPServer

import pytest

import server
from engine.model import default_design


@pytest.fixture(scope="module")
def base(tmp_path_factory):
    server.LB.PATH = tmp_path_factory.mktemp("lb") / "lb.json"
    srv = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


def call(base, path, body=None):
    req = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def test_static_and_catalog(base):
    with urllib.request.urlopen(base + "/") as r:
        assert b"Mission Architect" in r.read()
    s, cat = call(base, "/api/catalog")
    assert s == 200 and "europa" in cat["SCENARIOS"] and cat["FIELD_OWNER"]["bus"] == "systems"


def test_evaluate_handles_infinite_propellant(base):
    s, ev = call(base, "/api/evaluate", {"design": {"scenario": "europa", "orbit": "europa_orbit", "propulsion": "coldgas"}})
    assert s == 200 and not ev["ok"]


def test_launch_and_leaderboard(base):
    s, res = call(base, "/api/launch", {"design": default_design("wildfire"), "seed": 5, "name": "T", "player": "p"})
    assert s == 200 and res["score"]["grade"] in "SABCF" and "evaluation" not in res["sim"]
    s, rows = call(base, "/api/leaderboard?scenario=wildfire")
    assert rows and rows[0]["player"] == "p"


def test_room_flow(base):
    s, v = call(base, "/api/room/create", {"player": "a"})
    code = v["code"]
    call(base, f"/api/room/{code}/join", {"player": "a", "roles": ["manager", "systems", "science", "comms"]})
    s, _ = call(base, f"/api/room/{code}/join", {"player": "b", "roles": ["science"]})
    assert s == 409  # already taken
    s, _ = call(base, f"/api/launch", {"design": {}, "room": code})
    assert s == 409  # not approved yet
    for r in ["manager", "systems", "science", "comms"]:
        s, v = call(base, f"/api/room/{code}/approve", {"player": "a", "role": r})
    assert all(v["approvals"].values())
    s, res = call(base, "/api/launch", {"design": {}, "room": code, "save": False})
    assert s == 200
    s, v = call(base, f"/api/room/{code}?since=-1")
    assert v["last_run"]["seed"] == res["seed"]
    s, v2 = call(base, f"/api/room/{code}?since={v['version']}")
    assert v2.get("unchanged")

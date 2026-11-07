"""Mission Architect web server: serves the game (web/) and a small JSON API.

Run: .venv/bin/python server.py  ->  http://localhost:8600
Standard library only, so it deploys anywhere Python runs.
"""
from __future__ import annotations

import json
import math
import os
import random
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from engine import catalog as C
from engine import leaderboard as LB
from engine.model import blank_design, default_design, evaluate, normalize
from engine.rooms import FIELD_OWNER, RoomStore
from engine.scoring import score
from engine.simulate import monte_carlo, simulate

WEB = Path(__file__).resolve().parent / "web"
ROOMS = RoomStore()


def clean(o):
    """JSON-safe: inf/nan -> None, tuples -> lists."""
    if isinstance(o, float):
        return o if math.isfinite(o) else None
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    return o


def catalog() -> dict:
    return {k: getattr(C, k) for k in ("DESTINATIONS", "SCENARIOS", "ORBITS", "LAUNCH_VEHICLES", "LV_TARGET_LABEL",
                                       "BUSES", "SOLAR_ARRAYS", "RTG", "BATTERIES", "COMMS", "GROUND", "COMPUTERS",
                                       "ADCS", "PROPULSION", "INSTRUMENTS", "DIFFICULTY", "ROLES", "RADIATION_LABEL", "EDL", "PARTNERS", "MAX_PARTNERS", "PAYLOADS", "CREW_RATED", "SUPPLY_KG_PER_CREW_MONTH", "EXISTING")} | {
        "FIELD_OWNER": FIELD_OWNER,
        "DEFAULTS": {s: default_design(s) for s in C.SCENARIOS},
        "BLANK": {s: blank_design(s) for s in C.SCENARIOS},
    }


def launch(body: dict) -> dict:
    design = normalize(body.get("design", {}))
    seed = int(body.get("seed") or random.randint(1, 999_999))
    ev = evaluate(design)
    sim = simulate(design, seed, ev)
    sc = score(sim)
    sim.pop("evaluation", None)
    res = {"name": str(body.get("name", "Unnamed mission"))[:40], "player": str(body.get("player", ""))[:20],
           "seed": seed, "design": design, "sim": sim, "score": sc, "evaluation": ev}
    if sim["launched"] and not design["sandbox"] and body.get("save", True):
        LB.add({"name": res["name"], "player": res["player"] or "anonymous", "scenario": design["scenario"],
                "difficulty": design["difficulty"], "score": sc["total"], "grade": sc["grade"], "seed": seed,
                "design": design})
    return res


def room_view(code: str) -> dict:
    r = ROOMS.get(code)
    return {"code": code, "design": r["design"], "version": r["version"], "approvals": r["approvals"],
            "players": {p: i["roles"] for p, i in r["players"].items()}, "chat": r["chat"][-20:],
            "last_run": r["last_run"], "evaluation": evaluate(r["design"])}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(WEB), **kw)

    def log_message(self, fmt, *args):  # quieter console
        if "/api/room/" not in self.path:
            super().log_message(fmt, *args)

    def _json(self, data, status=200):
        raw = json.dumps(clean(data)).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _body(self) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        if n > 200_000:
            raise ValueError("body too large")
        return json.loads(self.rfile.read(n) or b"{}")

    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        try:
            if u.path == "/api/catalog":
                return self._json(catalog())
            if u.path == "/api/leaderboard":
                return self._json(LB.top(q.get("scenario", "wildfire"), int(q.get("n", 10))))
            if u.path.startswith("/api/room/"):
                code = u.path.rsplit("/", 1)[-1].upper()
                if not ROOMS.exists(code):
                    return self._json({"error": "No room with that code."}, 404)
                if int(q.get("since", -1)) == ROOMS.version(code):
                    return self._json({"unchanged": True, "version": ROOMS.version(code)})
                return self._json(room_view(code))
        except Exception as e:  # noqa: BLE001
            return self._json({"error": str(e)}, 400)
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        try:
            b = self._body()
            if u.path == "/api/evaluate":
                return self._json(evaluate(b.get("design", {})))
            if u.path == "/api/risk":
                return self._json(monte_carlo(normalize(b.get("design", {})), 200))
            if u.path == "/api/launch":
                room = b.get("room")
                if room:
                    if not ROOMS.exists(room):
                        return self._json({"error": "No room with that code."}, 404)
                    if not ROOMS.all_approved(room):
                        return self._json({"error": "All four roles must approve first."}, 409)
                    b["design"] = ROOMS.get(room)["design"]
                res = launch(b)
                if room:
                    ROOMS.set_last_run(room, clean(res))
                return self._json(res)
            if u.path == "/api/room/create":
                code = ROOMS.create(b.get("scenario", "wildfire"))
                if b.get("design"):
                    ROOMS.replace_design(code, normalize(b["design"]))
                ROOMS.join(code, b["player"], [])
                return self._json(room_view(code))
            parts = u.path.strip("/").split("/")  # api/room/CODE/action
            if len(parts) == 4 and parts[1] == "room":
                code, action = parts[2].upper(), parts[3]
                if not ROOMS.exists(code):
                    return self._json({"error": "No room with that code."}, 404)
                p = str(b.get("player", ""))[:20]
                if action == "join":
                    roles = [r for r in b.get("roles", []) if r in C.ROLES]
                    taken = ROOMS.roles_taken(code, exclude=p)
                    if any(r in taken for r in roles):
                        return self._json({"error": "Role already taken."}, 409)
                    ROOMS.join(code, p, roles)
                elif action == "set":
                    if not ROOMS.set_field(code, p, b["field"], b["value"]):
                        return self._json({"error": "That belongs to another role."}, 403)
                elif action == "approve":
                    ROOMS.approve(code, p, b["role"], bool(b.get("value", True)))
                elif action == "say":
                    ROOMS.say(code, p, str(b.get("text", "")))
                return self._json(room_view(code))
        except Exception as e:  # noqa: BLE001
            return self._json({"error": str(e)}, 400)
        self._json({"error": "not found"}, 404)


def main():
    port = int(os.environ.get("PORT", 8600))
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Mission Architect on http://localhost:{port}")
    srv.serve_forever()


if __name__ == "__main__":
    main()

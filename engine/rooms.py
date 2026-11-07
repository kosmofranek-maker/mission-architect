"""Shared multiplayer state: a room holds one design that 1-4 players edit together.

Each player claims roles; a role may only edit its own fields. Every change bumps the
room version and clears approvals, so launch needs all four roles to approve the final design.
Thread-safe, in-memory (one Streamlit server process).
"""
from __future__ import annotations

import random
import string
import threading
import time

from . import catalog as C
from .model import blank_design

FIELD_OWNER = {f: r for r, info in C.ROLES.items() for f in info["owns"]}
# scenario/sandbox are mission-level: the manager owns them too
FIELD_OWNER.update({"scenario": "manager", "sandbox": "manager"})


class RoomStore:
    def __init__(self):
        self._rooms: dict[str, dict] = {}
        self._lock = threading.Lock()

    def create(self, scenario: str = "wildfire") -> str:
        with self._lock:
            while True:
                code = "".join(random.choices(string.ascii_uppercase.replace("O", "").replace("I", ""), k=4))
                if code not in self._rooms:
                    break
            self._rooms[code] = {"design": blank_design(scenario), "version": 0, "players": {},
                                 "approvals": {r: False for r in C.ROLES}, "chat": [], "last_run": None,
                                 "created": time.time()}
            return code

    def exists(self, code: str) -> bool:
        return code in self._rooms

    def get(self, code: str) -> dict:
        with self._lock:
            r = self._rooms[code]
            return {**r, "design": dict(r["design"]), "players": dict(r["players"]),
                    "approvals": dict(r["approvals"]), "chat": list(r["chat"])}

    def version(self, code: str) -> int:
        return self._rooms[code]["version"] if code in self._rooms else -1

    def join(self, code: str, player: str, roles: list[str]):
        with self._lock:
            r = self._rooms[code]
            r["players"][player] = {"roles": list(roles), "seen": time.time()}
            r["version"] += 1

    def roles_taken(self, code: str, exclude: str | None = None) -> dict[str, str]:
        r = self._rooms[code]
        return {role: p for p, info in r["players"].items() if p != exclude for role in info["roles"]}

    def set_field(self, code: str, player: str, field: str, value) -> bool:
        with self._lock:
            r = self._rooms[code]
            owner = FIELD_OWNER.get(field)
            if owner not in r["players"].get(player, {}).get("roles", []):
                return False
            if r["design"].get(field) == value:
                return True
            if field == "scenario":
                r["design"] = blank_design(value) | {"difficulty": r["design"]["difficulty"]}
            else:
                r["design"][field] = value
            r["approvals"] = {k: False for k in r["approvals"]}
            r["version"] += 1
            r["chat"].append({"t": time.time(), "who": player, "text": f"changed {field}"})
            r["chat"] = r["chat"][-50:]
            return True

    def replace_design(self, code: str, design: dict):
        with self._lock:
            r = self._rooms[code]
            r["design"] = dict(design)
            r["approvals"] = {k: False for k in r["approvals"]}
            r["version"] += 1

    def approve(self, code: str, player: str, role: str, value: bool = True) -> bool:
        with self._lock:
            r = self._rooms[code]
            if role not in r["players"].get(player, {}).get("roles", []):
                return False
            r["approvals"][role] = value
            r["version"] += 1
            return True

    def all_approved(self, code: str) -> bool:
        return all(self._rooms[code]["approvals"].values())

    def say(self, code: str, player: str, text: str):
        with self._lock:
            r = self._rooms[code]
            r["chat"].append({"t": time.time(), "who": player, "text": text[:300], "msg": True})
            r["chat"] = r["chat"][-50:]
            r["version"] += 1

    def set_last_run(self, code: str, run: dict):
        with self._lock:
            self._rooms[code]["last_run"] = run
            self._rooms[code]["version"] += 1

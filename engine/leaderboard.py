"""Tiny JSON-file leaderboard (one file, append + top-N per scenario)."""
from __future__ import annotations

import json
import threading
import time
from pathlib import Path

PATH = Path(__file__).resolve().parent.parent / "data" / "leaderboard.json"
_lock = threading.Lock()


def load(path: Path | None = None) -> list[dict]:
    path = path or PATH
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def add(entry: dict, path: Path | None = None) -> None:
    path = path or PATH
    with _lock:
        rows = load(path)
        rows.append({**entry, "time": time.time()})
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(rows[-2000:]))


def top(scenario: str, n: int = 10, path: Path | None = None) -> list[dict]:
    rows = [r for r in load(path) if r.get("scenario") == scenario]
    return sorted(rows, key=lambda r: -r["score"])[:n]

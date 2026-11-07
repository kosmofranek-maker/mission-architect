"""Final mission score (max 950) + grade + plain-language post-mission analysis."""
from __future__ import annotations

from . import catalog as C

MAX = {"science": 500, "budget": 150, "margins": 100, "reliability": 100, "team": 100}
GRADES = [(800, "S"), (650, "A"), (500, "B"), (350, "C"), (0, "F")]


def _sweet(m: float, lo=0.10, hi=0.40) -> float:
    """1.0 inside the sweet spot, linear ramp below, slow decay above (over-design wastes money)."""
    if m < 0:
        return 0.0
    if m < lo:
        return m / lo
    if m <= hi:
        return 1.0
    return max(0.5, 1 - (m - hi) * 0.5)


def role_goals(ev: dict, sim: dict | None = None) -> dict:
    data_ret = ev["data"]["return"]
    reserve = sim["reserve_end"] if sim else ev["cost"]["reserve"]
    sci = sim["science_score"] if sim else ev["science"]["score"]
    return {
        "manager": reserve >= 0.10,
        "systems": ev["mass"]["margin"] >= 0.15 and ev["power"]["margin"] >= 0.20,
        "science": sci >= 70,
        "comms": data_ret >= 0.80,
    }


def score(sim: dict) -> dict:
    ev = sim["evaluation"]
    if not sim["launched"]:
        return {"total": 0, "grade": "F", "parts": {k: 0 for k in MAX}, "max": MAX,
                "roles": role_goals(ev), "analysis": ["The design never passed review, so it did not launch."]}
    parts = {
        "science": min(MAX["science"], sim["science_score"] * 5),
        "budget": MAX["budget"] * max(0.0, min(1.0, sim["reserve_end"] / 0.25)),
        "margins": 50 * _sweet(ev["mass"]["margin"]) + 50 * _sweet(ev["power"]["margin"], 0.2, 1.0),
        "reliability": MAX["reliability"] * (sim["months_survived"] / max(1, sim["months_planned"]))
        * (1.0 if sim["outcome"] in ("success", "partial") else 0.5),
    }
    roles = role_goals(ev, sim)
    parts["team"] = 25 * sum(roles.values())
    total = round(sum(parts.values()))
    grade = next(g for t, g in GRADES if total >= t)
    if sim["outcome"] == "lost" and grade in "SA":
        grade = "B"
    return {"total": total, "grade": grade, "parts": {k: round(v) for k, v in parts.items()}, "max": MAX,
            "roles": roles, "analysis": analysis(sim, parts)}


def analysis(sim: dict, parts: dict) -> list[str]:
    """Why did it go this way? Short, specific, educational sentences."""
    ev = sim["evaluation"]
    out = []
    if sim["outcome"] == "lost":
        fatal = next((e for e in sim["events"] if e["impact"] == "fatal"), None)
        if fatal:
            out.append(f"The mission was lost in month {fatal['month']}: {fatal['text']} {fatal['why']}")
    elif sim["outcome"] == "cancelled":
        out.append("Budget cuts ate all reserves and operations were cancelled. A bigger reserve buys resilience.")
    if sim.get("program"):
        lost = [e for e in sim["events"] if e["kind"] in ("launch_failure", "landing_failure", "berth", "abort")]
        if lost:
            out.append(f"{len(lost)} flight(s) never delivered. Programs survive single failures only with spare supplies and margin.")
        if sim.get("shortage") is not None:
            out.append("The crew ran out of supplies and came home early. More cargo, earlier, keeps a reserve for bad luck.")
        out.append(f"Astronauts lived and worked there for {sim.get('crew_months', 0):.0f} crew-months.")
    weak = min(ev["science"]["goals"], key=lambda g: g["fraction"])
    if weak["fraction"] < 1:
        out.append(f"Weakest science goal: '{weak['label']}' at {weak['fraction']:.0%}. "
                   "More or better-matched instruments, or an orbit that favours it, would help.")
    if ev["data"]["return"] < 0.8:
        out.append(f"Only {ev['data']['return']:.0%} of the data made it home. The downlink was the bottleneck, "
                   "not the instruments.")
    if ev["power"]["margin"] > 1.0:
        out.append(f"Power margin was {ev['power']['margin']:.0%}: the solar array is oversized. "
                   "Smaller panels would save mass and money.")
    if ev["mass"]["margin"] > 0.6:
        out.append(f"You used only {1 - ev['mass']['margin']:.0%} of the rocket's capacity. "
                   "A smaller launcher could have funded another instrument.")
    if ev["radiation"]["deficit"]:
        out.append("The electronics were not hardened enough for the radiation environment. "
                   "Juno and Clipper put their computers in a titanium vault for this reason.")
    if sim.get("wheel_failures"):
        out.append(f"{sim['wheel_failures']} reaction wheel failure(s) reduced pointing quality. "
                   "A spare wheel (Precision ADCS or a flagship bus) protects against this.")
    good = [e for e in sim["events"] if e["kind"] == "discovery"]
    if good:
        out.append(f"{len(good)} surprise discoveries boosted science: long, healthy missions get lucky more often.")
    if sim["reserve_end"] < 0.1 and sim["outcome"] != "cancelled":
        out.append("Budget reserve ended below 10%. One more surprise could have ended the mission.")
    if not out:
        out.append("A well-balanced mission: good margins, solid science and money left over. Textbook!")
    return out

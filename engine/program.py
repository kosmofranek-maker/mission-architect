"""Programs: missions made of many launches (a space station, a Moon base, a crewed Mars expedition).

The design holds a manifest: a list of flights {"p": payload, "lv": rocket, "slot": n}. Partners add their own
flights on their own dates. evaluate_program() checks every flight (mass, crew rating, what must already be in
place), then plays the plan month by month: modules arrive, crews come and go, supplies are eaten, power is
balanced. simulate_program() replays the same plan with launch failures, crashed landers, late partners and
station life events. Both return the same shapes as the single-spacecraft engine so scoring and the UI reuse them.
"""
from __future__ import annotations

import math
import random

from . import catalog as C

def program_slots(sc: dict, start: int) -> list[dict]:
    """Launch slots: quarters after a year of preparation, or Mars launch windows."""
    from .model import month_label  # local import: model imports this module
    P = sc["program"]
    if P.get("windows"):
        rule = C.WINDOW_RULES[sc["destination"]]
        k = max(0, math.ceil((start + C.MIN_BUILD_MONTHS - rule["first"]) / rule["synodic"]))
        months = [rule["first"] + (k + i) * rule["synodic"] for i in range(P["slots"])]
    else:
        months = [start + C.MIN_BUILD_MONTHS + i * P["slot_months"] for i in range(P["slots"])]
    return [{"i": i, "month": m, "label": (f"{month_label(m)} window" if P.get("windows") else month_label(m))}
            for i, m in enumerate(months)]


def partner_flights(d: dict, sc: dict) -> list[dict]:
    place = sc["program"]["place"]
    out = []
    for pk in d["partners"]:
        offer = C.PARTNERS[pk].get("program", {}).get(place)
        if offer and offer["p"] in C.PAYLOADS:
            out.append({"p": offer["p"], "lv": None, "slot": min(offer["slot"], sc["program"]["slots"] - 1), "partner": pk})
    return out


def normalize_manifest(raw, sc: dict) -> list[dict]:
    P = sc["program"]
    out = []
    for f in (raw or [])[:16]:
        if not isinstance(f, dict) or f.get("p") not in P["payloads"]:
            continue
        lv = f.get("lv") if f.get("lv") in C.LAUNCH_VEHICLES else None
        try:
            slot = max(0, min(P["slots"] - 1, int(f.get("slot") or 0)))
        except (TypeError, ValueError):
            slot = 0
        out.append({"p": f["p"], "lv": lv, "slot": slot})
    return out


def _payload(key: str) -> dict:
    return C.PAYLOADS.get(key) or C.EXISTING[key]


def play_plan(sc: dict, flights: list[dict], m0: int, end: int, shocks: dict | None = None) -> dict:
    """Month-by-month: arrivals, crews, supplies, power. `flights` carry "arrival" months; shocks = extra use per month."""
    P = sc["program"]
    shocks = shocks or {}
    modules = [(k, m0 - 1) for k in P["existing"]]
    stock = float(P.get("stock0", 0))
    for k, _ in modules:
        stock += _payload(k).get("stock", 0)
    stays = []  # [arrive, leave, n]
    rows, crew_months, research_months = [], 0.0, 0.0
    shortage, power_short, bunk_short = None, None, None
    min_reserve = math.inf
    by_month: dict[int, list] = {}
    for fl in flights:
        by_month.setdefault(fl["arrival"], []).append(fl)
    evacuated = False
    for m in range(m0, end + 1):
        for fl in by_month.get(m, []):
            pay = C.PAYLOADS[fl["p"]]
            if pay["group"] == "module":
                modules.append((fl["p"], m))
                stock += pay.get("stock", 0)
            elif pay["group"] == "cargo":
                stock += pay.get("supplies", 0)
            elif pay["group"] == "crew" and fl.get("crew_ok", True):
                stays.append([m, m + P["stay"], pay["crew"]])
        present = [k for k, _ in modules]
        beds = sum(_payload(k).get("beds", 0) for k in present)
        want = sum(n for a, b, n in stays if a <= m < b)
        aboard = 0 if evacuated else min(want, beds)
        if want > beds and bunk_short is None:
            bunk_short = m
        gen = P.get("base_power", 0) + sum(_payload(k).get("power_gen", 0) for k in present)
        use = sum(_payload(k).get("power_use", 0) for k in present) + aboard * C.CREW_POWER_KW
        if aboard and use > gen and power_short is None:
            power_short = m
        eat = aboard * C.SUPPLY_KG_PER_CREW_MONTH + shocks.get(m, 0)
        stock -= eat
        if stock < 0 and aboard:
            if shortage is None:
                shortage = m
            evacuated = True  # out of food: the crew goes home
            stock = 0
        if aboard:
            min_reserve = min(min_reserve, stock / max(1.0, aboard * C.SUPPLY_KG_PER_CREW_MONTH))
            crew_months += aboard
            if any(_payload(k).get("research") for k in present):
                research_months += aboard
        rows.append({"month": m, "stock": max(0.0, stock), "crew": aboard, "beds": beds, "power_gen": gen, "power_use": use,
                     "modules": present})
    return {"rows": rows, "crew_months": crew_months, "research_months": research_months, "shortage": shortage,
            "power_short": power_short, "bunk_short": bunk_short,
            "min_reserve_months": (min_reserve if math.isfinite(min_reserve) else None)}


def goal_fractions(sc: dict, plan: dict, flights: list[dict], m0: int) -> dict:
    P = sc["program"]
    present_end = [k for k in plan["rows"][-1]["modules"]] if plan["rows"] else []
    need = P.get("need", [])
    frac = {"assembly": (sum(1 for k in need if k in present_end) / len(need)) if need else 1.0,
            "crew": plan["crew_months"] / P["crew_goal"] if P["crew_goal"] else 0.0,
            "research": plan["research_months"] / P["research_goal"] if P.get("research_goal") else 0.0}
    crew_arrivals = [f["arrival"] for f in flights if C.PAYLOADS[f["p"]]["group"] == "crew"]
    first_crew = min(crew_arrivals) if crew_arrivals else None
    if need and first_crew is not None:
        ready = all(any(f["p"] == k and f["arrival"] < first_crew for f in flights) for k in need)
        frac["predeploy"] = 1.0 if ready else 0.0
    else:
        frac["predeploy"] = 0.0
    crewed = [r for r in plan["rows"] if r["crew"]]
    if plan["shortage"] is not None and crew_arrivals:
        span = max(1, len([r for r in plan["rows"] if r["month"] >= first_crew]))
        frac["supplied"] = max(0.0, (plan["shortage"] - first_crew) / span)
    else:
        frac["supplied"] = 1.0 if crewed else 0.0
    return frac


def evaluate_program(d: dict, sc: dict, diff: dict, issues: list, _issue) -> dict:
    P = sc["program"]
    dest = C.DESTINATIONS[sc["destination"]]
    slots = program_slots(sc, d["start_month"])
    partners = [C.PARTNERS[p] for p in d["partners"]]
    arm = any(p.get("arm") for p in partners)
    rows = [dict(f, partner=None) for f in d["manifest"]] + partner_flights(d, sc)
    flights, payload_cost, launch_cost, margins = [], 0.0, 0.0, []
    if not d["manifest"]:
        _issue(issues, "blocker", "missing", "Plan your first flight.",
               "A program is a sequence of launches. Add flights from the catalog below the manifest.")
        issues[-1]["field"] = "manifest"
    for i, f in enumerate(rows):
        pay = C.PAYLOADS[f["p"]]
        slot = slots[f["slot"]]
        n = i + 1
        fl = {"i": i, "n": n, "p": f["p"], "name": pay["name"], "group": pay["group"], "slot": f["slot"],
              "slot_label": slot["label"], "launch": slot["month"], "arrival": slot["month"] + pay.get("cruise", 0),
              "mass": pay["mass"], "partner": f["partner"], "lv": f["lv"], "crew_ok": True, "problems": []}
        if f["partner"]:
            pp = C.PARTNERS[f["partner"]]
            fl.update(lv_name=f"{pp['rocket']} ({pp['name'].split(' (')[0]})", capacity=None, cost=0, margin=None)
        else:
            lv = C.LAUNCH_VEHICLES.get(f["lv"]) if f["lv"] else None
            cap = lv["capacity"][pay["target"]] if lv else 0
            fl.update(lv_name=lv["name"] if lv else None, capacity=cap, cost=pay["cost"] + (lv["cost"] if lv else 0))
            payload_cost += pay["cost"]
            launch_cost += lv["cost"] if lv else 0
            if not lv:
                fl["problems"].append("choose a rocket")
                _issue(issues, "blocker", "missing", f"Flight {n}: choose a rocket for the {pay['name']}.",
                       "Every payload needs its own launch vehicle.")
                issues[-1]["field"] = "manifest"
            elif cap <= 0:
                fl["problems"].append("rocket can't get there")
                _issue(issues, "blocker", "launch", f"Flight {n}: {lv['name']} cannot reach {C.LV_TARGET_LABEL[pay['target']]}.",
                       "Small rockets can't give enough energy for that trip.")
            elif pay["mass"] > cap:
                fl["problems"].append("too heavy")
                _issue(issues, "blocker", "launch",
                       f"Flight {n}: the {pay['name']} ({pay['mass'] / 1000:.1f} t) is too heavy for {lv['name']} ({cap / 1000:.1f} t).",
                       "Each launch can only lift so much. Pick a bigger rocket for this flight.")
            else:
                fl["margin"] = (cap - pay["mass"]) / cap
                margins.append(fl["margin"])
            if pay["group"] == "crew" and lv and f["lv"] not in C.CREW_RATED:
                fl["problems"].append("not rated for crew")
                fl["crew_ok"] = False
                _issue(issues, "blocker", "crew", f"Flight {n} carries astronauts, but {lv['name']} is not rated for crew.",
                       "Human-rated rockets have a launch escape system and extra safety checks. Use Falcon 9, Vulcan or SLS.")
        flights.append(fl)
    # what must already be in place, in launch order
    rank = {"module": 0, "stage": 1, "cargo": 2, "crew": 3}  # in one slot: modules dock first, crews arrive last
    order = sorted(flights, key=lambda x: (x["launch"], rank[x["group"]], bool(C.PAYLOADS[x["p"]].get("requires")), x["i"]))
    arrived: dict[str, int] = {k: -10**6 for k in P["existing"]}
    for fl in order:
        pay = C.PAYLOADS[fl["p"]]
        for req in pay.get("requires", []):
            ok = req in arrived and arrived[req] <= fl["arrival"] and (not pay.get("predeploy") or arrived[req] < fl["launch"])
            if not ok:
                need_name = C.PAYLOADS[req]["name"] if req in C.PAYLOADS else req
                fl["problems"].append(f"needs the {need_name} first")
                when = "landed in an earlier window" if pay.get("predeploy") else "in place"
                _issue(issues, "blocker", "order", f"Flight {fl['n']} ({pay['name']}) needs the {need_name} {when}.",
                       "Order matters: modules dock to the core, crews need somewhere to live, and nobody lands on Mars before "
                       "their habitat is there and working.")
                if pay["group"] == "crew":
                    fl["crew_ok"] = False
        if pay.get("needs_stages"):
            have = sum(1 for x in flights if x["p"] == "mtransit" and x["slot"] == fl["slot"])
            if have < pay["needs_stages"]:
                fl["problems"].append(f"needs {pay['needs_stages']} transit stages in the same window")
                fl["crew_ok"] = False
                _issue(issues, "blocker", "order",
                       f"Flight {fl['n']}: the crew needs {pay['needs_stages']} transit stage segments launched in the same window ({have} planned).",
                       "The ship to Mars is too big for any rocket: its segments are launched separately and joined in Earth "
                       "orbit just before the crew arrives.")
        if pay["group"] == "module" and fl["p"] not in arrived:
            arrived[fl["p"]] = fl["arrival"]
    m0 = slots[0]["month"]
    crew_ends = [f["arrival"] + P["stay"] for f in flights if C.PAYLOADS[f["p"]]["group"] == "crew"]
    end = max([m0 + 11] + [f["arrival"] for f in flights] + crew_ends)
    plan = play_plan(sc, [f for f in flights if f["crew_ok"] or C.PAYLOADS[f["p"]]["group"] != "crew"], m0, end)
    from .model import month_label
    if plan["shortage"] is not None:
        _issue(issues, "blocker", "supplies", f"The crew runs out of supplies in {month_label(plan['shortage'])}.",
               f"Each astronaut needs about {C.SUPPLY_KG_PER_CREW_MONTH} kg of food, water and air a month. Schedule cargo before then, "
               "or bring fewer people.")
    elif plan["min_reserve_months"] is not None and plan["min_reserve_months"] < 2:
        _issue(issues, "warning", "supplies", f"At the tightest moment only {plan['min_reserve_months']:.1f} months of spare supplies.",
               "If one cargo flight fails, the crew must come home. NASA keeps months of reserve on the ISS for this reason.")
    if plan["power_short"] is not None:
        r = next(x for x in plan["rows"] if x["month"] == plan["power_short"])
        _issue(issues, "blocker", "power", f"Not enough power from {month_label(plan['power_short'])}: {r['power_use']:.0f} kW needed, "
               f"{r['power_gen']:.0f} kW available.",
               "Every module and every astronaut needs electricity. Add solar trusses or a power unit before the crew grows.")
    if plan["bunk_short"] is not None:
        _issue(issues, "warning", "crew", f"In {month_label(plan['bunk_short'])} more astronauts arrive than there are bunks.",
               "Crews that overlap need beds for everyone. Extra people wait at home, and their seats are wasted.")
    # goals -> science score (0..100)
    frac = goal_fractions(sc, plan, flights, m0)
    goals = []
    for g in sc["goals"]:
        fr = min(1.0, frac.get(g["tag"], 0.0))
        goals.append({**g, "points": fr, "fraction": fr, "score": g["weight"] * fr, "met": fr >= 0.5})
        if g["required"] and fr < 0.5 and d["manifest"]:
            _issue(issues, "warning", "science", f"Required goal '{g['label']}' is only {fr:.0%} done.",
                   "Plan more flights (crews, cargo or modules) that serve this goal.")
    science = sum(g["score"] for g in goals)
    # money
    crewed_months = sum(1 for r in plan["rows"] if r["crew"])
    total_months = len(plan["rows"])
    share = sum(p["share"] for p in partners if not p.get("program", {}).get(P["place"]))
    cost = {"Modules, ships and landers": payload_cost, "Launches": launch_cost,
            "Integration & test (15%)": payload_cost * 0.15,
            "Ground operations": P["ops_month"] * crewed_months + 2 * total_months}
    if share:
        cost["Paid by partners"] = -payload_cost * share
    total_cost = sum(cost.values())
    budget = sc["budget"] * diff["budget_mult"]
    reserve = (budget - total_cost) / budget
    if total_cost > budget and not d["sandbox"]:
        _issue(issues, "blocker", "cost", f"The program costs {total_cost:,.0f} M$ but the budget is {budget:,.0f} M$.",
               "Fewer or smaller flights, cheaper rockets, or partners who pay part of the bill.")
    elif reserve < 0.1 and not d["sandbox"]:
        _issue(issues, "warning", "cost", f"Budget reserve only {reserve:.0%}.", "Programs this big always meet surprises.")
    if partners:
        _issue(issues, "info", "partners", "Partners: " + "; ".join(
            f"{p['name']} {p.get('program_gives', p['gives']).lower()}" for p in partners), "Shared programs cost each country less, "
            "but partner flights launch on the partner's own schedule and can be late.")
    peak = max(plan["rows"], key=lambda r: r["power_use"] - r["power_gen"]) if plan["rows"] else None
    power_margin = ((peak["power_gen"] - peak["power_use"]) / peak["power_use"]) if peak and peak["power_use"] else 0.5
    return {
        "slots": slots, "flights": flights, "plan": plan["rows"], "start": m0, "end": end,
        "crew_months": plan["crew_months"], "research_months": plan["research_months"],
        "shortage": plan["shortage"], "min_reserve_months": plan["min_reserve_months"], "fractions": frac, "arm": arm,
        "goals": goals, "science": science, "cost": cost, "total_cost": total_cost, "budget": budget, "reserve": reserve,
        "mass_margin": min(margins) if margins else 0.3, "power_margin": power_margin, "dest": dest,
        "crewed_months": crewed_months,
    }


# ------------------------------------------------------------------------------------------ simulation
def simulate_program(ev: dict, seed: int) -> dict:
    from .model import partner_delay_of
    rng = random.Random(seed)
    d, sc, prog = ev["design"], ev["scenario"], ev["program"]
    P = sc["program"]
    em = C.DIFFICULTY[d["difficulty"]]["event_mult"]
    budget = ev["cost"]["budget"]
    reserve = budget - ev["cost"]["total"]
    m0 = prog["start"]
    events = []

    def log(month, kind, text, why, impact="neutral"):
        events.append({"month": month - m0 + 1 if month >= m0 else 0, "kind": kind, "text": text, "why": why, "impact": impact})

    flights, shocks = [], {}
    berth = C.MODULE_BERTH_RISK * (0.4 if prog["arm"] else 1.0)
    for fl in sorted(prog["flights"], key=lambda x: (x["launch"], x["i"])):
        fl = dict(fl)
        pay = C.PAYLOADS[fl["p"]]
        who = f"Flight {fl['n']} ({pay['name']})"
        if fl["partner"] and rng.random() < partner_delay_of(fl["partner"], d) * em:
            slip = P["slot_months"]
            fl["launch"] += slip
            fl["arrival"] += slip
            log(fl["launch"], "slip", f"{C.PARTNERS[fl['partner']]['name'].split(' (')[0]} was late: {who} slipped {slip} months.",
                "Partners build on their own schedule. A delay on their side ripples through everyone's plan.", "bad")
        if rng.random() < 0.02 * em:
            if pay["group"] == "crew":
                log(fl["launch"], "abort", f"Launch abort! The escape system pulled the {who} crew to safety. The flight is lost.",
                    "Crew-rated rockets carry an escape tower or abort engines for exactly this moment.", "bad")
            else:
                log(fl["launch"], "launch_failure", f"Rocket failure: {who} was lost.",
                    "About one launch in fifty fails. Programs plan spare capacity for this.", "bad" if pay["group"] != "module" else "fatal")
            continue
        if pay.get("land_risk") and rng.random() < pay["land_risk"] * em:
            log(fl["arrival"], "landing_failure", f"{who} crashed while landing.",
                "Landing near a base is precise work: rocks, dust and darkness all add risk.", "bad")
            continue
        if pay.get("berth") and rng.random() < berth * em:
            log(fl["arrival"], "berth", f"{who} was damaged while docking and could not be used.",
                "Joining two 15-tonne modules gently is hard. A robotic arm grabs and berths them safely (Canadarm2).", "bad")
            continue
        if pay["group"] == "crew":
            log(fl["arrival"], "crew", f"{who}: {pay['crew']} astronauts arrived.", "A new crew settles in.", "good")
        elif pay["group"] == "cargo":
            log(fl["arrival"], "cargo", f"{who}: {pay['supplies'] / 1000:.1f} t of supplies delivered.", "Food, water, air and spares.", "good")
        elif pay["group"] == "module":
            log(fl["arrival"], "module", f"{who} in place.", "One more piece of the outpost works.", "good")
        flights.append(fl)
    # crew-related checks again with the flights that actually made it
    present_modules = {k for k in P["existing"]}
    for fl in flights:
        pay = C.PAYLOADS[fl["p"]]
        if pay["group"] == "module":
            present_modules.add(fl["p"])
    for fl in flights:
        pay = C.PAYLOADS[fl["p"]]
        if pay["group"] == "crew":
            needs = pay.get("requires", [])
            stages = sum(1 for x in flights if x["p"] == "mtransit" and x["slot"] == fl["slot"])
            if any(r not in present_modules for r in needs) or stages < pay.get("needs_stages", 0):
                fl["crew_ok"] = False
                log(fl["launch"], "scrub", f"Flight {fl['n']} was scrubbed: what the crew needs was lost earlier.",
                    "Nobody launches astronauts to a destination that isn't ready for them.", "bad")
    crew_ends = [f["arrival"] + P["stay"] for f in flights if C.PAYLOADS[f["p"]]["group"] == "crew"]
    end = max([prog["end"]] + [f["arrival"] for f in flights] + crew_ends)
    # life aboard: random leaks, broken recyclers, discoveries, budget cuts
    bonus = 0.0
    cancelled = None
    for m in range(m0, end + 1):
        if rng.random() < 0.02 * em:
            shocks[m] = shocks.get(m, 0) + 150
        if rng.random() < 0.012 * em:
            shocks[m] = shocks.get(m, 0) + 300
        if cancelled is None and rng.random() < 0.006 * em:
            cut = 0.05 * budget
            reserve -= cut
            log(m, "budget_cut", f"Lawmakers cut the program by {cut:,.0f} M$.", "Big programs are debated every year.", "bad")
            if reserve < 0:
                cancelled = m
                log(m, "budget_cut", "Out of reserves: the program was stopped early.",
                    "Without money for ground teams and new flights, everything stops.", "fatal")
    plan = play_plan(sc, [f for f in flights if f["crew_ok"] or C.PAYLOADS[f["p"]]["group"] != "crew"], m0,
                     cancelled if cancelled else end, shocks)
    for m, extra in sorted(shocks.items()):
        if any(r["month"] == m and r["crew"] for r in plan["rows"]):
            if extra >= 300:
                log(m, "life_support", "The water recycler broke: the crew used extra supplies until spares arrived.",
                    "Life support is the most important machine aboard. Spare parts ride on every cargo flight.", "bad")
            else:
                log(m, "leak", "A micrometeoroid made a tiny leak: the crew found it and patched it.",
                    "Dust grains hit at 10 km/s. Shields stop most of them.", "bad")
    if plan["shortage"] is not None:
        log(plan["shortage"], "evacuate", "Supplies ran out: the crew had to come home early.",
            "Every cargo flight that fails eats into the reserve. Plan spare supplies.", "bad")
    for r in plan["rows"]:
        if r["crew"] and rng.random() < 0.01:
            bonus += 0.04
            log(r["month"], "discovery", "Breakthrough! An experiment gave a result nobody expected.",
                "People in space do science no robot can. More crew time, more discoveries.", "good")
    frac = goal_fractions(sc, plan, flights, m0)
    realized = sum(g["weight"] * min(1.0, frac.get(g["tag"], 0.0)) for g in sc["goals"])
    planned = max(1e-9, ev["science"]["score"])
    sf = min(1.25, realized / planned + bonus)
    req_ok = all(min(1.0, frac.get(g["tag"], 0.0)) >= 0.5 for g in sc["goals"] if g["required"])
    outcome = "cancelled" if cancelled else ("success" if req_ok and sf >= 0.5 else "partial")
    if outcome == "success":
        log(plan["rows"][-1]["month"] if plan["rows"] else m0, "end", "Program complete. The last crew is home safely.",
            "Long programs are marathons: steady supply lines matter more than any single flight.", "good")
    timeline = []
    need = P.get("need", [])
    acc = 0.0
    for r in plan["rows"]:
        acc += r["crew"]
        timeline.append({"month": r["month"] - m0 + 1, "phase": "crewed" if r["crew"] else "assembly", "alive": True,
                         "science_fraction": min(1.25, sf * acc / max(1.0, plan["crew_months"])) if plan["crew_months"] else 0.0,
                         "battery_pct": 1.0, "reserve": reserve, "power_margin": ((r["power_gen"] - r["power_use"]) / r["power_use"]) if r["power_use"] else 1.0,
                         "rate": 1.0, "fuel_pct": None, "data_gb": 0, "stock_kg": r["stock"], "crew": r["crew"], "beds": r["beds"],
                         "modules": r["modules"], "assembled": (sum(1 for k in need if k in r["modules"]) / len(need)) if need else 1.0})
    return {"seed": seed, "launched": True, "outcome": outcome, "events": events, "timeline": timeline,
            "science_fraction": sf, "science_score": ev["science"]["score"] * sf, "months_survived": len(timeline),
            "months_planned": len(prog["plan"]), "reserve_end": reserve / budget, "evaluation": ev, "launch_delay": 0,
            "data_planned_gb": 0, "reserve_start": budget - ev["cost"]["total"], "program": True,
            "crew_months": plan["crew_months"], "shortage": plan["shortage"]}

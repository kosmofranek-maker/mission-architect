"""Crew vehicles you design yourself: a capsule, a lifting body or a winged shuttle that ferries astronauts to the
space station for several years. evaluate_vehicle() turns the choices into mass, safety per flight and cost per seat;
simulate_vehicle() flies every rotation with launch failures, aborts, re-entry and landing risks.
"""
from __future__ import annotations

import math
import random

from . import catalog as C

FIELDS = ["shape", "seats", "heatshield", "abort", "landing"]
ASK = {"shape": ("Choose a hull shape.", "Capsule, lifting body or winged shuttle: it decides almost everything else."),
       "seats": ("Choose how many seats.", "More seats per flight means fewer flights, but a heavier vehicle."),
       "heatshield": ("Choose a heat shield.", "Coming home at 28,000 km/h heats the vehicle to 1,600 C."),
       "abort": ("Choose a launch escape system.", "If the rocket fails, this is what saves the crew."),
       "landing": ("Choose how it lands.", "Parachutes, engines or wings: the last minutes of every flight."),
       "launch_vehicle": ("Choose a rocket rated for crew.", "Only human-rated rockets may carry astronauts.")}


def vehicle_numbers(d: dict, diff: dict) -> dict:
    V = C.VEHICLE
    shape, seats_o = V["shape"].get(d["shape"]), V["seats"].get(d["seats"])
    shield, abort, landing = V["heatshield"].get(d["heatshield"]), V["abort"].get(d["abort"]), V["landing"].get(d["landing"])
    seats = seats_o["n"] if seats_o else 4
    hull = (shape["base"] + shape["per_seat"] * seats) if shape else 0
    abort_mass = 0
    if abort:
        abort_mass = abort.get("mass_per_seat", 0) * seats + abort.get("mass", 0)
    mass = hull * (1 + (shield["frac"] if shield else 0) + (landing["frac"] if landing else 0)) + abort_mass
    p_launch = 0.02 * (1 - (abort["save"] if abort else 0))
    p_loss = p_launch + (shape["risk"] if shape else 0) + (shield["risk"] if shield else 0) + (landing["risk"] if landing else 0)
    return {"shape": shape, "seats": seats, "shield": shield, "abort": abort, "landing": landing, "hull": hull, "mass": mass,
            "p_launch": p_launch, "p_loss": p_loss}


def evaluate_vehicle(d: dict, sc: dict, diff: dict, issues: list, _issue) -> dict:
    spec = sc["vehicle"]
    n = vehicle_numbers(d, diff)
    for f in FIELDS + ["launch_vehicle"]:
        if d.get(f) is None:
            _issue(issues, "blocker", "missing", *ASK[f])
            issues[-1]["field"] = f
    shape, abort, landing, shield = n["shape"], n["abort"], n["landing"], n["shield"]
    if shape and abort and d["abort"] not in shape["fits"]:
        _issue(issues, "blocker", "abort", f"A {shape['name'].lower()} can't use a {abort['name'].lower()}.",
               "An escape tower sits on the nose of a capsule; a winged shuttle rides on the side of its rocket, so a tower can't pull it free.")
    if shape and landing and d["landing"] not in shape["fits"]:
        _issue(issues, "blocker", "landing", f"A {shape['name'].lower()} can't land with {landing['name'].lower()}.",
               "Only vehicles with wings or a lifting body can glide to a runway; only capsules hang under parachutes or land on engines.")
    if abort and abort.get("max_seats") and n["seats"] > abort["max_seats"]:
        _issue(issues, "blocker", "abort", f"Ejection seats work for at most {abort['max_seats']} people.",
               "With more seats there is no room or time for everyone to eject.")
    if abort and d["abort"] == "none":
        _issue(issues, "warning", "abort", "No escape system: if the rocket fails, the crew is lost.",
               "The Space Shuttle flew without one, and lost Challenger in 1986. Every crew vehicle since has an escape system.")
    lv = C.LAUNCH_VEHICLES.get(d["launch_vehicle"]) if d["launch_vehicle"] else None
    cap = lv["capacity"][spec["target"]] if lv else 0
    if lv and d["launch_vehicle"] not in C.CREW_RATED:
        _issue(issues, "blocker", "launch", f"{lv['name']} is not rated for crew.", "Use Falcon 9, Vulcan or SLS.")
    if lv and n["mass"] > cap:
        _issue(issues, "blocker", "launch", f"The vehicle ({n['mass'] / 1000:.1f} t) is too heavy for {lv['name']} ({cap / 1000:.1f} t).",
               "Fewer seats, a lighter shape, or a bigger crew-rated rocket.")
    flights = math.ceil(spec["seats_needed"] / n["seats"])
    reusable = bool(shield and shield["reusable"])
    per_vehicle = max(1, round(10 * (landing["reuse"] if landing else 1))) if reusable else 1
    vehicles = math.ceil(flights / per_vehicle)
    lv_cost = lv["cost"] if lv else 0
    lv_total = lv_cost * flights - (lv_cost * C.REUSE_DISCOUNT * max(0, flights - 1) if lv and lv.get("reusable") else 0)
    per_flight_ops = ((landing["ship"] if landing else 0) + (shield["refurb"] if shield else 0) + 10) * flights
    cost = {"Design and testing": shape["dev"] if shape else 0, f"Building {vehicles} vehicle(s)": (shape["build"] if shape else 0) * vehicles,
            f"{flights} launches": lv_total, "Refurbishing and recovery": per_flight_ops}
    if lv and lv.get("reusable") and flights > 1:
        _issue(issues, "info", "launch", f"{lv['name']} lands its first stage: {flights - 1} of {flights} launches reuse a booster.",
               "Reusable rockets fly the same first stage again, which cuts the price of every launch after the first.")
    total = sum(cost.values())
    seat_cost = total / spec["seats_needed"]
    one_in = 1 / n["p_loss"] if n["p_loss"] > 0 else 99999
    if all(d.get(f) for f in FIELDS) and n["p_loss"] > C.SAFETY_TARGET:
        _issue(issues, "warning", "safety", f"About 1 crew lost in {one_in:,.0f} flights; the goal is 1 in 270.",
               "Each part adds risk: the launch (unless an escape system saves the crew), re-entry heat and the landing.")
    frac = {"safety": min(1.0, C.SAFETY_TARGET / n["p_loss"]) if n["p_loss"] else 1.0,
            "seat_cost": min(1.0, 70 / seat_cost) if all(d.get(f) for f in FIELDS) else 0.0,
            "cargo": min(1.0, (shape.get("cargo", 0) if shape else 0) / 3000)}
    goals = []
    for g in sc["goals"]:
        fr = frac[g["tag"]] if all(d.get(f) for f in FIELDS) else 0.0
        goals.append({**g, "points": fr, "fraction": fr, "score": g["weight"] * fr, "met": fr >= 0.5})
    budget = sc["budget"] * diff["budget_mult"]
    reserve = (budget - total) / budget
    if total > budget and not d["sandbox"]:
        _issue(issues, "blocker", "cost", f"The program costs {total:,.0f} M$ but the budget is {budget:,.0f} M$.",
               "Reusable vehicles cost more to build but much less per flight. Fewer, bigger flights also help.")
    elif reserve < 0.1 and not d["sandbox"]:
        _issue(issues, "warning", "cost", f"Budget reserve only {reserve:.0%}.", "New vehicles always run into surprises in testing.")
    return {"n": n, "lv": lv, "capacity": cap, "flights": flights, "vehicles": vehicles, "per_vehicle": per_vehicle, "reusable": reusable,
            "one_in": one_in, "seat_cost": seat_cost, "goals": goals, "science": sum(g["score"] for g in goals),
            "cost": cost, "total": total, "budget": budget, "reserve": reserve,
            "mass_margin": (cap - n["mass"]) / cap if cap else 0.0, "years": spec["years"]}


def simulate_vehicle(ev: dict, seed: int) -> dict:
    rng = random.Random(seed)
    d, sc, v = ev["design"], ev["scenario"], ev["vehicle"]
    em = C.DIFFICULTY[d["difficulty"]]["event_mult"]
    budget = ev["cost"]["budget"]
    reserve = budget - ev["cost"]["total"]
    months = v["years"] * 12
    gap = months / v["flights"]
    events, timeline = [], []
    log = lambda m, k, t, w, i="neutral": events.append({"month": m, "kind": k, "text": t, "why": w, "impact": i})
    shape, shield, landing = C.VEHICLE["shape"][d["shape"]], C.VEHICLE["heatshield"][d["heatshield"]], C.VEHICLE["landing"][d["landing"]]
    abort = C.VEHICLE["abort"][d["abort"]]
    seats = C.VEHICLE["seats"][d["seats"]]["n"]
    flown, done, lost_crew, outcome = 0, 0, False, "success"
    next_flight = 1.0
    for m in range(1, months + 1):
        while not lost_crew and done < v["flights"] and m >= next_flight:
            done += 1
            n = done
            next_flight += gap
            if rng.random() < 0.02 * em:
                if rng.random() < abort["save"]:
                    log(m, "abort", f"Flight {n}: the rocket failed, and the {abort['name'].lower()} carried the crew to safety.",
                        "This is exactly what escape systems are for. The crew flies again on the next vehicle.", "bad")
                    continue
                log(m, "crew_loss", f"Flight {n}: the rocket failed and the crew could not escape.",
                    "Without a working escape system a launch failure is fatal. Real programs stop and rethink everything.", "fatal")
                lost_crew = True
                break
            if rng.random() < (shape["risk"] + shield["risk"]) * em:
                log(m, "crew_loss", f"Flight {n}: the vehicle broke up during re-entry.",
                    "Re-entry heat finds any weakness in the shield. Columbia was lost this way in 2003.", "fatal")
                lost_crew = True
                break
            if rng.random() < landing["risk"] * em:
                log(m, "landing", f"Flight {n}: a hard landing damaged the vehicle, but the crew walked away.",
                    "Landings are rough. The vehicle needs extra repairs.", "bad")
                reserve -= 20
            flown += seats
            log(m, "crew", f"Flight {n}: {seats} astronauts reached the station.", "Another crew rotation done.", "good")
            if shield["reusable"] and d["heatshield"] == "tiles" and rng.random() < 0.15:
                reserve -= 15
                log(m, "refurb", f"After flight {n} damaged tiles had to be replaced (15 M$).", "Tiles are fragile; every one is inspected.", "bad")
        if rng.random() < 0.004 * em:
            cut = 0.05 * budget
            reserve -= cut
            log(m, "budget_cut", f"Lawmakers cut the program by {cut:,.0f} M$.", "Crew programs are debated every year.", "bad")
            if reserve < 0:
                outcome = "cancelled"
                log(m, "budget_cut", "Out of reserves: the program was stopped.", "No money, no flights.", "fatal")
                break
        timeline.append({"month": m, "phase": "operations", "alive": not lost_crew, "science_fraction": 0.0, "battery_pct": 1.0,
                         "reserve": reserve, "power_margin": 1.0, "rate": 1.0, "fuel_pct": None, "data_gb": 0,
                         "flights_done": done, "seats_flown": flown})
        if lost_crew:
            break
    need = sc["vehicle"]["seats_needed"]
    seat_frac = flown / need
    frac = {"safety": 0.0 if lost_crew else ev["program_frac"]["safety"], "seat_cost": ev["program_frac"]["seat_cost"] * min(1.0, seat_frac),
            "cargo": ev["program_frac"]["cargo"] * min(1.0, seat_frac)}
    realized = sum(g["weight"] * frac[g["tag"]] for g in sc["goals"])
    sf = min(1.25, realized / max(1e-9, ev["science"]["score"]))
    for t in timeline:
        t["science_fraction"] = sf * t["seats_flown"] / max(1, flown) if flown else 0.0
    if lost_crew:
        outcome = "lost"
    elif outcome == "success" and seat_frac < 0.5:
        outcome = "partial"
    if outcome == "success":
        log(months, "end", f"Five years, {flown} seats to the station, every crew home safely.",
            "A steady, safe crew ferry is the backbone of any space station.", "good")
    return {"seed": seed, "launched": True, "outcome": outcome, "events": events, "timeline": timeline, "science_fraction": sf,
            "science_score": ev["science"]["score"] * sf, "months_survived": len(timeline), "months_planned": months,
            "reserve_end": reserve / budget, "evaluation": ev, "launch_delay": 0, "data_planned_gb": 0,
            "reserve_start": budget - ev["cost"]["total"], "vehicle": True, "seats_flown": flown, "flights_done": done}

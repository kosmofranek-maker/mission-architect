"""Month-by-month mission simulation with seeded random events.

simulate(design, seed) -> dict with timeline (for charts), event log and outcome.
The same seed + design always gives the same story, so runs can be shared and compared.
"""
from __future__ import annotations

import math
import random

from . import catalog as C
from .model import DV_MARGIN, evaluate, partner_delay_of

# base monthly probabilities (multiplied by difficulty event_mult)
P_SOLAR_STORM = 0.025
P_WHEEL_FAIL = 0.004
P_BUDGET_CUT = 0.008
P_DISCOVERY = 0.012
P_MICROMETEOROID = 0.002
P_SAFE_MODE = 0.015
BATTERY_FADE_YEAR = 0.03


def simulate(design: dict, seed: int = 1, evaluation: dict | None = None) -> dict:
    ev = evaluation or evaluate(design)
    d = ev["design"]
    if ev.get("kind") == "program":
        if not ev["ok"]:
            return {"seed": seed, "launched": False, "outcome": "not_launched", "events": [], "timeline": [],
                    "science_fraction": 0.0, "science_score": 0.0, "months_survived": 0, "months_planned": 0,
                    "reserve_end": ev["cost"]["reserve"], "evaluation": ev}
        from .program import simulate_program
        return simulate_program(ev, seed)
    if ev.get("kind") == "vehicle":
        if not ev["ok"]:
            return {"seed": seed, "launched": False, "outcome": "not_launched", "events": [], "timeline": [],
                    "science_fraction": 0.0, "science_score": 0.0, "months_survived": 0, "months_planned": 0,
                    "reserve_end": ev["cost"]["reserve"], "evaluation": ev}
        from .vehicle import simulate_vehicle
        return simulate_vehicle(ev, seed)
    rng = random.Random(seed)
    em = C.DIFFICULTY[d["difficulty"]]["event_mult"]
    cruise_m = round(ev["cruise_years"] * 12)
    sci_m_planned = round(ev["effective_years"] * 12)
    total_m = cruise_m + sci_m_planned
    events, timeline = [], []

    if not ev["ok"]:
        return {"seed": seed, "launched": False, "outcome": "not_launched", "events": [], "timeline": [],
                "science_fraction": 0.0, "science_score": 0.0, "months_survived": 0, "months_planned": total_m,
                "reserve_end": ev["cost"]["reserve"], "evaluation": ev}

    def log(month, kind, text, why, impact="neutral"):
        events.append({"month": month, "kind": kind, "text": text, "why": why, "impact": impact})

    budget = ev["cost"]["budget"]
    reserve = budget - ev["cost"]["total"]
    sch = ev["schedule"]
    tech = sch["risk_mult"]  # rushed projects are tested less, so glitches and launch failures are likelier
    delay = 0
    late = [C.PARTNERS[p]["name"].split(" (")[0] for p in ev["partners"]["keys"] if rng.random() < partner_delay_of(p, d) * em]
    if late or rng.random() < sch["slip"] * em:
        delay = sch["synodic"] or 4
        waste = budget * C.SLIP_COST_MONTH * delay
        reserve -= waste
        where = ev["destination"]["name"]
        who = f"{' and '.join(late)} hardware arrived late! " if late else "Late hardware! "
        log(0, "slip", (f"{who}The spacecraft missed the {where} window and waited {delay} months for the next one "
                        f"({waste:,.0f} M$)." if sch["synodic"] else
                        f"{who}Launch slipped {delay} months ({waste:,.0f} M$ to keep the team working)."),
            "Problems found in testing take time to fix. For planets you then wait for Earth and the target to line up again.",
            "bad")
        if reserve < 0:
            log(0, "budget_cut", "The delay used up every reserve. The project was cancelled before launch.",
                "Delays cost money: engineers must be paid while the spacecraft waits on the ground.", "fatal")
            return {"seed": seed, "launched": True, "outcome": "cancelled", "events": events, "timeline": [],
                    "science_fraction": 0.0, "science_score": 0.0, "months_survived": 0, "months_planned": total_m,
                    "reserve_end": reserve / budget, "evaluation": ev, "launch_delay": delay,
                    "data_planned_gb": 0, "reserve_start": budget - ev["cost"]["total"]}

    # launch itself: small failure chance (rockets fail ~2-3 %)
    if rng.random() < 0.02 * em * tech:
        log(0, "launch_failure", "Launch vehicle anomaly! The spacecraft is lost.",
            "Even mature rockets fail roughly 1 in 50 launches. That's why missions buy insurance or build spares.",
            "fatal")
        return {"seed": seed, "launched": True, "outcome": "lost", "events": events, "timeline": [],
                "science_fraction": 0.0, "science_score": 0.0, "months_survived": 0, "months_planned": total_m,
                "reserve_end": reserve / budget, "evaluation": ev, "launch_delay": delay,
                "data_planned_gb": 0, "reserve_start": budget - ev["cost"]["total"]}
    log(0, "launch", f"Liftoff on {C.LAUNCH_VEHICLES[d['launch_vehicle']]['name']}!",
        "The spacecraft separates and unfolds its solar arrays and antennas.", "good")
    recovered = {}
    if C.LAUNCH_VEHICLES[d["launch_vehicle"]].get("reusable"):
        if rng.random() < C.BOOSTER_LANDING:
            recovered[d["launch_vehicle"]] = 1
            log(0, "booster", "The first stage flew back and landed on the drone ship. It can fly again.",
                "Reusable boosters are refuelled, checked and launched again, which makes the next launch much cheaper.", "good")
        else:
            log(0, "booster", "The first stage tipped over on the landing ship. The spacecraft is fine.",
                "Landing a booster at sea is hard. This one is lost, but it was not needed any more.", "neutral")

    power_margin = ev["power"]["margin"]
    batt_ok_margin = ev["power"]["battery_usable_wh"] - ev["power"]["eclipse_need_wh"]
    batt_cap = ev["power"]["battery_usable_wh"]
    eclipse_need = ev["power"]["eclipse_need_wh"]
    spare_wheel = d["adcs"] == "precision" or d["bus"] == "flagship"
    wheels = d["adcs"] in ("wheels", "precision")
    wheel_fails = 0
    pointing_f = 1.0
    sci_acc = 0.0
    bonus = 0.0
    alive = True
    outcome = "success"
    months_done = 0
    rad_p = ev["radiation"]["monthly_risk"]
    hga = d["comms"] in ("xhga", "kahga")
    # resources tracked for the flight dashboard
    orb = ev["orbit_info"]
    dv_ins, dv_yr = orb.get("dv_insert", 0), orb.get("dv_per_year", 0)
    dv_ret = orb.get("dv_return", 0) if ev["edl"]["use"] == "return" else 0
    dv_total = (dv_ins + dv_yr * ev["years"] + dv_ret) * DV_MARGIN
    has_fuel = dv_total > 0 and 0 < ev["mass"]["propellant"] < float("inf")
    dv_used = 0.0
    data_month = ev["data"]["generated_gb_day"] * ev["data"]["return"] * 30.4
    data_acc = 0.0

    for m in range(1, total_m + 1):
        phase = "cruise" if m <= cruise_m else "science"
        rate = 1.0  # science productivity this month
        if phase == "science" and m == cruise_m + 1 and ev["edl"]["use"] == "land":
            if rng.random() < ev["edl"]["landing_risk"]:
                log(m, "landing_failure", "Touchdown signal never came. The lander crashed.",
                    "Landing is the most dangerous minute of any surface mission: about one in three Mars landings "
                    "has failed. Safer sites and hazard avoidance reduce the odds.", "fatal")
                alive, outcome = False, "lost"
            else:
                log(m, "landing", f"Touchdown on {ev['destination']['name']}! The landing system worked.",
                    "Parachutes, engines or airbags turned thousands of km/h into a gentle touchdown.", "good")
        elif phase == "science" and m == cruise_m + 1 and cruise_m > 0:
            # deep space is unforgiving: the one burn that captures the spacecraft must work first time
            if ev["design"]["scenario"] and ev["destination"].get("earth_au", 0) > 0.005 and rng.random() < 0.03 * em * tech:
                log(m, "insertion_failure", f"The orbit insertion burn at {ev['destination']['name']} failed. The spacecraft flew past and was lost.",
                    "Mars Climate Orbiter (1999) was lost because one team used pounds and another newtons. Arrival burns "
                    "happen far from Earth, with no second chance.", "fatal")
                alive, outcome = False, "lost"
            else:
                log(m, "arrival", f"Arrived at {ev['destination']['name']}: orbit insertion burn successful.",
                    "The engine fired to slow down enough to be captured by gravity.", "good")

        # battery ageing
        batt_cap *= (1 - BATTERY_FADE_YEAR / 12)
        if batt_cap < eclipse_need and phase == "science":
            if batt_ok_margin >= 0:  # first time it crosses
                log(m, "battery", "Battery has aged: instruments must switch off during eclipses.",
                    "Li-ion cells lose a few % capacity each year. A bigger battery gives margin for old age.", "bad")
            batt_ok_margin = -1
            rate *= 0.8

        # radiation
        if rng.random() < rad_p:
            log(m, "radiation", "A radiation hit destroyed the flight computer.",
                "Energetic particles in the environment exceeded what the electronics were hardened for.", "fatal")
            alive, outcome = False, "lost"
        elif ev["radiation"]["deficit"] and rng.random() < 0.05 * em:
            log(m, "radiation_reset", "Radiation flipped bits: computer reset, a week of data lost.",
                "Single-event upsets corrupt memory. Hardened chips and error correction reduce them.", "bad")
            rate *= 0.75

        if alive and rng.random() < P_SOLAR_STORM * em:
            sev = 0.5 if ev["destination"]["sun_au"] < 2 else 0.8
            log(m, "solar_storm", "Solar storm! Spacecraft entered safe mode for ~2 weeks.",
                "Coronal mass ejections flood space with particles. Spacecraft shut down instruments to protect themselves.",
                "bad")
            rate *= sev
            if power_margin < 0.1 and rng.random() < 0.3:
                log(m, "power", "Recovering from safe mode drained the battery; recovery took longer.",
                    "With a thin power margin there is no spare energy to warm up and restart quickly.", "bad")
                rate *= 0.7

        if alive and rng.random() < P_SAFE_MODE * em * tech * (1.5 if power_margin < 0.15 else 1.0):
            log(m, "safe_mode", "Software fault triggered safe mode. Engineers uploaded a patch.",
                "Flight software is huge; bugs show up in space. Good margins make recovery easier.", "bad")
            rate *= 0.85

        if alive and wheels and rng.random() < P_WHEEL_FAIL * em * tech * (0.5 if phase == "cruise" else 1.0):
            wheel_fails += 1
            if spare_wheel and wheel_fails == 1:
                log(m, "wheel", "A reaction wheel failed, but the spare wheel took over.",
                    "This spacecraft carries 4 wheels where 3 are enough: redundancy saved the mission.", "neutral")
            else:
                pointing_f = max(0.4, pointing_f * 0.75)
                log(m, "wheel", "A reaction wheel failed: pointing is now less stable.",
                    "Kepler and Dawn lost wheels too. Teams use thrusters or solar pressure to keep pointing, at a cost.",
                    "bad")
                if hga and wheel_fails == 2:
                    log(m, "wheel", "Second wheel lost: the high-gain dish can no longer hold Earth.",
                        "Narrow radio beams need steady pointing. The mission switches to a weak backup antenna.", "bad")
                    pointing_f = max(0.3, pointing_f * 0.6)

        if alive and rng.random() < P_MICROMETEOROID * em:
            if rng.random() < 0.15:
                log(m, "micrometeoroid", "A micrometeoroid punctured a propellant line. Mission over.",
                    "Tiny dust grains hit at 10+ km/s. Shielding blankets protect most of the craft.", "fatal")
                alive, outcome = False, "lost"
            else:
                log(m, "micrometeoroid", "Micrometeoroid hit a solar panel. Small power loss.",
                    "Dust impacts are common; arrays are designed to tolerate losing some cells.", "bad")
                power_margin -= 0.05

        if alive and rng.random() < P_BUDGET_CUT * em:
            cut = 0.08 * budget
            reserve -= cut
            log(m, "budget_cut", f"Congress cut the budget by {cut:,.0f} M$.",
                "Missions compete for money every year. Reserves absorb surprises like this.", "bad")
            if reserve < 0:
                log(m, "budget_cut", "Out of reserves: operations were cancelled early.",
                    "Without money for the team and antennas, a working spacecraft is switched off.", "fatal")
                alive, outcome = False, "cancelled"

        if alive and phase == "science" and rng.random() < P_DISCOVERY:
            bonus += 0.05
            log(m, "discovery", "Surprise discovery! The science team found something unexpected.",
                "Many missions' biggest results were not planned. Long, healthy missions find more.", "good")

        if power_margin < 0:
            rate *= 0.6

        if phase == "science" and m == cruise_m + 1:
            dv_used += dv_ins
        elif phase == "science":
            dv_used += dv_yr / 12
        if m == total_m:
            dv_used += dv_ret
        if phase == "science" and alive:
            data_acc += data_month * rate * pointing_f

        if phase == "science" and alive:
            sci_acc += rate * pointing_f
        months_done = m
        timeline.append({"month": m, "phase": phase, "alive": alive,
                         "science_fraction": sci_acc / sci_m_planned if sci_m_planned else 0,
                         "battery_pct": batt_cap / max(1e-9, ev["power"]["battery_usable_wh"]),
                         "reserve": reserve, "power_margin": power_margin, "rate": rate * pointing_f if alive else 0,
                         "fuel_pct": max(0.0, 1 - dv_used / dv_total) if has_fuel else None, "data_gb": data_acc})
        if not alive:
            break

    sample_loss = 0.0
    if alive and ev["edl"]["use"] == "return":
        if rng.random() < ev["edl"]["capsule_risk"] * em:
            sample_loss = sum(g["weight"] for g in ev["scenario"]["goals"] if g["tag"] == "sample") / 100
            log(total_m, "capsule", "The capsule's parachute failed: it hit the desert hard and the sample was contaminated.",
                "Genesis crashed in 2004 for exactly this reason. A backup parachute makes re-entry much safer.", "bad")
        else:
            log(total_m, "capsule", "The return capsule landed softly in the desert. Sample recovered!",
                "A heat shield survived a 12 km/s fireball, then parachutes opened on time.", "good")
    if alive:
        log(total_m, "end", "Mission complete. The spacecraft is decommissioned.",
            "Earth satellites are deorbited or moved to a graveyard orbit; others crash safely or are left parked.", "good")

    frac = (sci_acc / sci_m_planned if sci_m_planned else 0) * (1 - sample_loss) + bonus
    frac = min(frac, 1.25)
    if outcome == "success" and frac < 0.5:
        outcome = "partial"
    return {"seed": seed, "launched": True, "outcome": outcome, "events": events, "timeline": timeline,
            "science_fraction": frac, "science_score": ev["science"]["score"] * frac,
            "months_survived": months_done, "months_planned": total_m, "reserve_end": reserve / budget,
            "wheel_failures": wheel_fails, "evaluation": ev,
            "data_planned_gb": data_month * sci_m_planned, "reserve_start": budget - ev["cost"]["total"], "launch_delay": delay,
            "boosters_recovered": recovered}


def monte_carlo(design: dict, runs: int = 200, seed0: int = 1000) -> dict:
    """Run many seeds: success probability and score spread for the design review."""
    ev = evaluate(design)
    res = [simulate(design, seed0 + i, ev) for i in range(runs)]
    scores = sorted(r["science_score"] for r in res)
    ok = sum(r["outcome"] == "success" for r in res)
    return {"runs": runs, "success_rate": ok / runs, "science_p10": scores[int(0.1 * runs)],
            "science_median": scores[runs // 2], "science_p90": scores[int(0.9 * runs) - 1]}

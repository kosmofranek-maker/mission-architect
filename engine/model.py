"""Static evaluation of a spacecraft design: mass, power, data, cost, radiation, science.

evaluate(design) -> dict. Pure function, no randomness. The simulator and the UI both
build on top of it. Every issue carries a plain-language "why" so players learn from it.
"""
from __future__ import annotations

import math

from . import catalog as C

DEFAULT_DESIGN = {
    "scenario": "wildfire", "difficulty": "normal", "sandbox": False,
    "orbit": "sso", "launch_vehicle": "electron", "bus": "smallsat", "solar": "small", "rtg": 0,
    "battery": "b1000", "comms": "uhf", "ground": "commercial", "computer": "radtol",
    "adcs": "wheels", "propulsion": "mono", "instruments": ["thermal", "wac"], "years": 3,
}

RAD_RISK = {0: 0.0005, 1: 0.01, 2: 0.04, 3: 0.12, 4: 0.25}  # monthly fatal-hit risk by deficit
ORBIT_RADIATION = {"flyby": 3, "europa_orbit": 4}
SOLAR_DEGRADATION = {"earth": 0.02, "moon": 0.02, "mars": 0.02, "europa": 0.04}
RTG_DECAY = 0.04  # per year (MMRTG loses ~4-5 %/yr incl. thermocouple aging)
BUS_OPS = {"cubesat": 0.5, "smallsat": 3, "medium": 10, "flagship": 30}
INTEGRATION = 0.30
DV_MARGIN = 1.10
TANK_FRACTION = 0.08
HGA = {"xhga", "kahga"}


def default_design(scenario: str = "wildfire") -> dict:
    """A playable (not optimal) starting design for each scenario."""
    d = dict(DEFAULT_DESIGN, instruments=list(DEFAULT_DESIGN["instruments"]))
    d["scenario"] = scenario
    presets = {
        "wildfire": {"comms": "xlga"},
        "lunar_ice": {"orbit": "frozen", "launch_vehicle": "falcon9", "comms": "xlga", "ground": "dsn34",
                      "instruments": ["neutron", "lidar"], "years": 2},
        "mars_climate": {"orbit": "elliptical", "launch_vehicle": "falcon9", "bus": "medium", "solar": "large",
                         "battery": "b3000", "comms": "kahga", "ground": "dsn34", "propulsion": "biprop",
                         "instruments": ["sounder", "wac", "irspec"], "years": 4},
        "europa": {"orbit": "flyby", "launch_vehicle": "falcon_heavy", "bus": "flagship", "solar": "giant",
                   "battery": "b8000", "rtg": 1, "comms": "kahga", "ground": "dsn70", "computer": "radhard",
                   "propulsion": "biprop", "instruments": ["radar", "mag", "irspec", "wac"], "years": 4},
    }
    d.update(presets.get(scenario, {}))
    return d


COMPONENTS = {
    "orbit": ("Choose an orbit.", "Where you fly decides what you can see, how much shadow you get and how much fuel you need."),
    "instruments": ("Choose at least one instrument.", "Instruments are the reason the mission exists."),
    "bus": ("Choose a spacecraft bus.", "The bus is the body: structure, wiring and slots that hold everything together."),
    "solar": ("Choose a solar array (or 'No solar array' if you rely on RTGs).", "Without power the spacecraft is dead."),
    "battery": ("Choose a battery.", "Batteries keep the spacecraft alive while it is in a planet's shadow."),
    "adcs": ("Choose attitude control.", "Without it the spacecraft tumbles and can't point instruments or antennas."),
    "propulsion": ("Choose propulsion (or 'No propulsion').", "Engines get you into orbit and keep you there."),
    "comms": ("Choose an antenna.", "Without a radio no data ever reaches Earth."),
    "ground": ("Choose ground stations.", "Someone on Earth has to listen to your spacecraft."),
    "computer": ("Choose a flight computer.", "The computer runs the spacecraft and stores data between contacts."),
    "launch_vehicle": ("Choose a launch vehicle.", "Nothing reaches space without a rocket."),
}
FIELD_CATALOG = {"launch_vehicle": C.LAUNCH_VEHICLES, "bus": C.BUSES, "solar": C.SOLAR_ARRAYS, "battery": C.BATTERIES,
                 "comms": C.COMMS, "ground": C.GROUND, "computer": C.COMPUTERS, "adcs": C.ADCS,
                 "propulsion": C.PROPULSION}
EMPTY = {
    "launch_vehicle": {"name": "(none)", "cost": 0, "capacity": {k: 0 for k in C.LV_TARGET_LABEL}},
    "bus": {"name": "(no bus)", "mass": 0, "power": 0, "cost": 0, "max_dry": 0, "slots": 0, "rad_shield": 0},
    "solar": C.SOLAR_ARRAYS["none"], "propulsion": C.PROPULSION["none"],
    "battery": {"name": "(none)", "mass": 0, "wh": 0, "cost": 0},
    "comms": {"name": "(none)", "mass": 0, "power": 0, "cost": 0, "max_mbps": 0, "mbps_1au": 0},
    "ground": {"name": "(none)", "hours": 0, "gain": 0, "cost_year": 0, "max_earth_au": 99},
    "computer": {"name": "(none)", "mass": 0, "power": 0, "cost": 0, "storage_gb": 0, "rad": 0},
    "adcs": {"name": "(none)", "mass": 0, "power": 0, "cost": 0, "pointing_deg": 99, "needs_magnetic": False},
}


def blank_design(scenario: str = "wildfire") -> dict:
    """What a player starts with: an empty spacecraft. Every component must be chosen."""
    return {"scenario": scenario, "difficulty": "normal", "sandbox": False, "orbit": None, "launch_vehicle": None,
            "bus": None, "solar": None, "rtg": 0, "battery": None, "comms": None, "ground": None, "computer": None,
            "adcs": None, "propulsion": None, "instruments": [], "years": C.SCENARIOS[scenario]["min_years"]}


def options_for(design: dict) -> dict:
    """Valid choices for UI selectboxes given the scenario."""
    dest = C.SCENARIOS[design["scenario"]]["destination"]
    return {"orbit": list(C.ORBITS[dest].keys())}


def normalize(design: dict) -> dict:
    """Start from a blank design, keep known keys; unknown or invalid choices become None (= not chosen)."""
    sc = design.get("scenario") if design.get("scenario") in C.SCENARIOS else "wildfire"
    d = blank_design(sc)
    d.update({k: v for k, v in design.items() if k in d})
    d["scenario"] = sc
    dest = C.SCENARIOS[sc]["destination"]
    if d["orbit"] not in C.ORBITS[dest]:
        d["orbit"] = None
    for f, cat in FIELD_CATALOG.items():
        if d[f] not in cat:
            d[f] = None
    if d["difficulty"] not in C.DIFFICULTY:
        d["difficulty"] = "normal"
    d["sandbox"] = bool(d["sandbox"])
    d["instruments"] = [i for i in dict.fromkeys(d.get("instruments") or []) if i in C.INSTRUMENTS]
    d["rtg"] = max(0, min(C.RTG["max"], int(d.get("rtg") or 0)))
    d["years"] = max(1, min(15, int(d.get("years") or 1)))
    return d


def _issue(issues, severity, area, text, why):
    issues.append({"severity": severity, "area": area, "text": text, "why": why})


def evaluate(design: dict) -> dict:
    d = normalize(design)
    sc = C.SCENARIOS[d["scenario"]]
    dest_key = sc["destination"]
    dest = C.DESTINATIONS[dest_key]
    first_orbit = next(iter(C.ORBITS[dest_key].values()))
    orbit = C.ORBITS[dest_key][d["orbit"]] if d["orbit"] else {
        "name": "(no orbit)", "lv_target": first_orbit["lv_target"], "dv_insert": 0, "dv_per_year": 0, "eclipse_h": 0,
        "eclipse_frac": 0, "coverage": 0, "earth_view": 0, "cruise_years": 0, "max_years_no_prop": 99, "science": {}}
    part = {f: FIELD_CATALOG[f][d[f]] if d[f] else EMPTY[f] for f in FIELD_CATALOG}
    lv, bus, solar, batt = part["launch_vehicle"], part["bus"], part["solar"], part["battery"]
    comms, ground, comp, adcs, prop = part["comms"], part["ground"], part["computer"], part["adcs"], part["propulsion"]
    instr = {k: C.INSTRUMENTS[k] for k in d["instruments"]}
    diff = C.DIFFICULTY[d["difficulty"]]
    issues: list[dict] = []
    years = d["years"]
    cruise = orbit["cruise_years"]
    missing = [f for f in COMPONENTS if (not d[f] if f == "instruments" else d[f] is None)]
    for f in missing:
        _issue(issues, "blocker", "missing", *COMPONENTS[f])
        issues[-1]["field"] = f

    # ---------------------------------------------------------------- lifetime / propulsion
    eff_years = years
    if d["propulsion"] == "none" and years > orbit["max_years_no_prop"]:
        eff_years = orbit["max_years_no_prop"]
        _issue(issues, "warning", "propulsion",
               f"Without thrusters the orbit only lasts ~{orbit['max_years_no_prop']:g} years.",
               "Drag or gravity perturbations slowly change every orbit. Station-keeping burns fix it; "
               "with no propulsion your mission ends early.")
    if years < sc["min_years"]:
        _issue(issues, "warning", "schedule",
               f"Mission is shorter than the {sc['min_years']} years the science team asked for.",
               "Seasons, fire cycles and slow changes need long observation to be understood.")

    # ---------------------------------------------------------------- mass
    parts = {
        "Bus structure": bus["mass"], "Solar array": solar["mass"], "RTGs": C.RTG["mass"] * d["rtg"],
        "Battery": batt["mass"], "Comms": comms["mass"], "Computer": comp["mass"], "ADCS": adcs["mass"],
        "Propulsion": prop["mass"], "Instruments": sum(i["mass"] for i in instr.values()),
    }
    dry_parts = sum(parts.values())
    dv = (orbit["dv_insert"] + orbit["dv_per_year"] * years) * DV_MARGIN
    propellant = 0.0
    if prop["isp"] > 0:
        ratio = math.exp(dv / (prop["isp"] * C.G0)) - 1
        for _ in range(50):
            propellant = (dry_parts + TANK_FRACTION * propellant) * ratio
        if ratio * TANK_FRACTION >= 1 or not math.isfinite(propellant):
            propellant = float("inf")
    tanks = TANK_FRACTION * propellant if math.isfinite(propellant) else float("inf")
    dry = dry_parts + tanks
    wet = dry + propellant
    capacity = lv["capacity"][orbit["lv_target"]]
    mass_margin = (capacity - wet) / capacity if capacity > 0 and math.isfinite(wet) else -1.0

    if d["propulsion"] == "none" and orbit["dv_insert"] > 0:
        _issue(issues, "blocker", "propulsion", "This orbit needs an engine burn to get there, but you have no propulsion.",
               f"Reaching '{orbit['name']}' takes {orbit['dv_insert']} m/s of velocity change the rocket can't provide.")
    if d["propulsion"] == "coldgas" and propellant > prop["max_prop"]:
        _issue(issues, "blocker", "propulsion",
               f"Cold gas would need {propellant:,.0f} kg of gas (max {prop['max_prop']} kg).",
               "Cold gas has very low efficiency (Isp 70 s). Big velocity changes need a chemical engine.")
    if d["launch_vehicle"] is None:
        pass
    elif capacity <= 0:
        _issue(issues, "blocker", "launch", f"{lv['name']} cannot reach {C.LV_TARGET_LABEL[orbit['lv_target']]} at all.",
               "Small rockets can't give enough energy to escape Earth. Pick a bigger launch vehicle.")
    elif wet > capacity:
        _issue(issues, "blocker", "launch",
               f"Spacecraft ({wet:,.0f} kg) is heavier than the rocket can lift ({capacity:,} kg).",
               "Every kg of payload needs many kg of rocket. Cut mass or buy a bigger launcher.")
    elif mass_margin < diff["margin_req"]:
        _issue(issues, "warning", "launch", f"Mass margin is only {mass_margin:.0%}.",
               "Real spacecraft always grow during development. Engineers keep 10-30% margin for surprises.")
    if d["bus"] and dry > bus["max_dry"]:
        _issue(issues, "blocker", "bus", f"Dry mass {dry:,.0f} kg exceeds what the {bus['name']} can hold ({bus['max_dry']:,} kg).",
               "The structure, tanks and wiring are sized for a maximum load. Choose a bigger bus.")
    if d["bus"] and len(instr) > bus["slots"]:
        _issue(issues, "blocker", "bus", f"{len(instr)} instruments, but the bus has only {bus['slots']} slots.",
               "Each instrument needs space, a mounting point, cables and a clear field of view.")

    # ---------------------------------------------------------------- power
    life = cruise + years
    sunlit = solar["power_1au"] / dest["sun_au"] ** 2 * (1 - SOLAR_DEGRADATION[dest_key]) ** life
    rtg_w = C.RTG["power"] * d["rtg"] * (1 - RTG_DECAY) ** life
    gen = sunlit * (1 - orbit["eclipse_frac"]) + rtg_w
    dm = orbit.get("duty_mult", 1.0)
    loads = {
        "Bus": bus["power"], "Comms": comms["power"], "Computer": comp["power"], "ADCS": adcs["power"],
        "Propulsion": prop["power"], "Instruments": sum(i["power"] * i["duty"] * dm for i in instr.values()),
    }
    load = sum(loads.values())
    power_margin = (gen - load) / load if load else 0
    eclipse_need = orbit["eclipse_h"] * max(0.0, load - rtg_w)
    batt_usable = batt["wh"] * C.BATTERY_DOD
    if d["solar"] is None and not d["rtg"]:
        pass
    elif solar["power_1au"] == 0 and d["rtg"] == 0:
        _issue(issues, "blocker", "power", "No power source.", "Without solar panels or an RTG the spacecraft is dead on arrival.")
    elif gen < load:
        _issue(issues, "blocker", "power", f"Average power {gen:,.0f} W is less than the load {load:,.0f} W (end of life).",
               f"At {dest['sun_au']:g} AU sunlight is {1 / dest['sun_au'] ** 2:.0%} of Earth's, panels degrade every year "
               "and you spend time in shadow. Add panels/RTGs or remove power-hungry parts.")
    elif power_margin < 0.2:
        _issue(issues, "warning", "power", f"Power margin is only {power_margin:.0%}.",
               "NASA designs keep ~20-30% power margin: loads grow and panels age faster than planned.")
    if d["battery"] and eclipse_need > batt_usable:
        _issue(issues, "blocker", "power",
               f"Battery covers {batt_usable:,.0f} Wh, but eclipse needs {eclipse_need:,.0f} Wh.",
               f"The longest shadow lasts {orbit['eclipse_h']:g} h. Batteries must keep everything alive; "
               f"only {C.BATTERY_DOD:.0%} of capacity is used so they don't wear out.")

    # ---------------------------------------------------------------- pointing / ADCS
    if adcs["needs_magnetic"] and not dest["magnetic"]:
        _issue(issues, "blocker", "adcs", "Magnetorquers don't work here.",
               f"{dest['name']} has no strong global magnetic field to push against. Use reaction wheels.")
    if d["comms"] in HGA and d["adcs"] and adcs["pointing_deg"] > 0.5:
        _issue(issues, "blocker", "comms", "A high-gain dish needs precise pointing (better than 0.5°).",
               "A narrow radio beam that misses Earth is a lost signal. Magnetorquers are too coarse.")
    pointing = {}
    for k, i in instr.items():
        if not d["adcs"] or adcs["pointing_deg"] <= i["pointing_deg"]:
            pointing[k] = 1.0
        else:
            pointing[k] = max(0.15, math.sqrt(i["pointing_deg"] / adcs["pointing_deg"]))
            _issue(issues, "warning", "adcs", f"{i['name']} needs {i['pointing_deg']:g}° pointing; ADCS gives {adcs['pointing_deg']:g}°.",
                   "If the craft wobbles more than the instrument's field of view, images blur and data quality drops "
                   f"(quality x{pointing[k]:.2f}).")

    # ---------------------------------------------------------------- comms / data
    gen_gb = {k: i["data_mbps"] * i["duty"] * dm * 86400 / 1000 for k, i in instr.items()}
    total_gen = sum(gen_gb.values())
    if dest["earth_au"] > ground["max_earth_au"]:
        _issue(issues, "blocker", "comms", f"{ground['name']} can't hear you at {dest['name']}.",
               "Small dishes only catch signals from nearby satellites. Deep space needs the Deep Space Network.")
        rate = 0.0
    elif dest["earth_au"] == 0:
        rate = comms["max_mbps"] * ground["gain"]
    else:
        rate = min(comms["max_mbps"], comms["mbps_1au"] / dest["earth_au"] ** 2) * ground["gain"]
    hours = ground["hours"] * orbit["earth_view"]
    down_gb = rate * hours * 3600 / 1000
    alloc, remaining = {}, down_gb
    for n, k in enumerate(sorted(gen_gb, key=gen_gb.get)):
        share = remaining / (len(gen_gb) - n)
        alloc[k] = min(gen_gb[k], share)
        remaining -= alloc[k]
    ret = {k: (alloc[k] / gen_gb[k] if gen_gb[k] > 0 else 1.0) for k in gen_gb}
    gap_h = max(0.0, 24 - hours)
    store_need_gb = total_gen * gap_h / 24 / 8  # Gb -> GB
    if d["computer"] and store_need_gb > comp["storage_gb"]:
        f = comp["storage_gb"] / store_need_gb
        ret = {k: v * f for k, v in ret.items()}
        _issue(issues, "warning", "comms", f"Recorder overflows: needs {store_need_gb:,.0f} GB, has {comp['storage_gb']} GB.",
               "Between ground contacts data is stored on board. When memory fills up, new data is overwritten.")
    returned = sum(gen_gb[k] * ret[k] for k in gen_gb)
    data_return = returned / total_gen if total_gen else 1.0
    if total_gen and data_return < 0.8 and rate > 0:
        _issue(issues, "warning", "comms", f"Only {data_return:.0%} of collected data reaches Earth.",
               f"Radio signals weaken with distance squared. At {max(dest['earth_au'], 0):g} AU try a bigger dish, "
               "Ka-band, or DSN 70 m antennas. Or carry instruments that produce less data.")

    # ---------------------------------------------------------------- radiation
    env = ORBIT_RADIATION.get(d["orbit"], dest["radiation"])
    tolerance = comp["rad"] + bus["rad_shield"]
    deficit = max(0, env - tolerance)
    rad_month = RAD_RISK[min(deficit, 4)]
    survival = (1 - rad_month) ** (12 * life)
    if deficit and d["computer"]:
        _issue(issues, "warning", "radiation",
               f"Radiation ({C.RADIATION_LABEL[env]}) exceeds electronics tolerance: ~{1 - survival:.0%} chance of a fatal hit.",
               "High-energy particles flip bits and burn out chips. Use radiation-hardened computers or shielding.")

    # ---------------------------------------------------------------- cost
    hw = {
        "Bus": bus["cost"], "Power": solar["cost"] + C.RTG["cost"] * d["rtg"] + batt["cost"],
        "Comms": comms["cost"], "Computer": comp["cost"], "ADCS": adcs["cost"], "Propulsion": prop["cost"],
        "Instruments": sum(i["cost"] for i in instr.values()),
    }
    hardware = sum(hw.values())
    ops_year = ground["cost_year"] + BUS_OPS.get(d["bus"], 0)
    cost = {
        **hw, "Integration & test (30%)": hardware * INTEGRATION, "Launch": lv["cost"],
        "Operations": ops_year * (years + cruise),
    }
    total_cost = sum(cost.values())
    budget = sc["budget"] * diff["budget_mult"]
    reserve = (budget - total_cost) / budget
    if total_cost > budget and not d["sandbox"]:
        _issue(issues, "blocker", "cost", f"Mission costs {total_cost:,.0f} M$ but budget is {budget:,.0f} M$.",
               "NASA cancels missions that overrun. Cheaper rocket, fewer instruments or a smaller bus?")
    elif reserve < 0.1 and not d["sandbox"]:
        _issue(issues, "warning", "cost", f"Budget reserve only {reserve:.0%}.",
               "Projects keep 10-25% reserve for problems found during testing.")
    if d["rtg"]:
        _issue(issues, "info", "power", "RTGs need presidential launch approval and plutonium-238.",
               "Only a few kg of Pu-238 are produced per year, so RTGs are used when the Sun is too far.")

    # ---------------------------------------------------------------- science
    contrib = {g["tag"]: 0.0 for g in sc["goals"]}
    instr_value = {}
    for k, i in instr.items():
        v = 0.0
        for tag in i["tags"]:
            if tag in contrib:
                c = i["value"] * orbit["science"].get(tag, 1.0 if d["orbit"] else 0.0) * pointing[k] * ret[k]
                contrib[tag] += c
                v += c
        instr_value[k] = v
        if v == 0 and not any(t in contrib for t in i["tags"]):
            _issue(issues, "info", "science", f"{i['name']} doesn't serve any goal of this mission.",
                   "It adds mass, power and cost without helping the science goals. Consider removing it.")
    goals = []
    for g in sc["goals"]:
        frac = min(1.0, contrib[g["tag"]] / g["target"])
        goals.append({**g, "points": contrib[g["tag"]], "fraction": frac, "score": g["weight"] * frac,
                      "met": frac >= 0.5})
        if g["required"] and frac < 0.5:
            _issue(issues, "warning", "science", f"Required goal '{g['label']}' is only {frac:.0%} covered.",
                   "Without it the mission fails its main purpose. Add instruments with this capability, or a closer orbit.")
    base = sum(g["score"] for g in goals) * (0.6 + 0.4 * orbit["coverage"])
    if eff_years < sc["min_years"]:
        life_f = eff_years / sc["min_years"]
    else:
        life_f = 1 + min(0.15, 0.05 * (eff_years - sc["min_years"]))
    science = base * life_f

    blockers = [i for i in issues if i["severity"] == "blocker"]
    order = {"blocker": 0, "warning": 1, "info": 2}
    issues.sort(key=lambda i: order[i["severity"]])
    return {
        "design": d, "scenario": sc, "destination": dest, "orbit_info": orbit, "ok": not blockers,
        "issues": issues,
        "mass": {"parts": parts, "propellant": propellant, "tanks": tanks, "dry": dry, "wet": wet,
                 "capacity": capacity, "margin": mass_margin, "dv": dv, "bus_max_dry": bus["max_dry"]},
        "power": {"sunlit": sunlit, "rtg": rtg_w, "generation": gen, "loads": loads, "load": load,
                  "margin": power_margin, "eclipse_need_wh": eclipse_need, "battery_usable_wh": batt_usable},
        "data": {"generated_gb_day": total_gen, "downlink_gb_day": down_gb, "rate_mbps": rate,
                 "contact_hours": hours, "return": data_return, "per_instrument": ret,
                 "storage_need_gb": store_need_gb, "storage_gb": comp["storage_gb"]},
        "radiation": {"env": env, "tolerance": tolerance, "deficit": deficit, "monthly_risk": rad_month,
                      "survival": survival},
        "cost": {"items": cost, "total": total_cost, "budget": budget, "reserve": reserve, "ops_year": ops_year},
        "science": {"goals": goals, "base": base, "lifetime_factor": life_f, "score": science,
                    "per_instrument": instr_value, "pointing": pointing},
        "years": years, "effective_years": eff_years, "cruise_years": cruise,
    }

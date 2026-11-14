"""What the game takes from the NASA resources listed for the Space Mission Design Game challenge.

Everything here comes from the challenge's Resources tab:
  - "Design and Develop Science Missions" (NASA Small Spacecraft Systems Virtual Institute webinar, 2025):
    the four mission segments, the six-step process, "begin with the end in mind", example missions.
  - "Space mission concept development using concept maturity levels" (Wessen et al., JPL, 2013): CML 1-9.
  - Mission Design Lab (NASA Goddard): study types, disciplines, the master equipment list, "tall poles".
  - "CubeSat 101" (NASA CubeSat Launch Initiative): reserves, margins, schedule, testing, spare units, records.
  - "A Learning Game About Telescopes" (Webb): after the flight, show real NASA missions like yours.
  - GMAT, NASA Mission Viz, the 2023 VR challenge and the CSA games are linked from the in-game library.

brief(ev) is attached to every evaluation as ev["nasa"].
"""
from __future__ import annotations

from . import catalog as C

URL = {
    "sci": "https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf",
    "gmat": "https://software.nasa.gov/software/GSC-19468-1",
    "cml": "https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299",
    "mdl": "https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/",
    "viz": "https://nasa.github.io/mission-viz/",
    "webb": "https://science.nasa.gov/mission/webb/game-build-it-yourself/",
    "cubesat": "https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf",
    "vr": "https://www.spaceappschallenge.org/2023/challenges/visualize-a-space-mission-using-virtual-reality/",
    "csa": "https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp",
}
SOURCE = {"sci": "Design and Develop Science Missions", "cml": "Concept Maturity Levels (JPL)",
          "mdl": "Mission Design Lab (NASA Goddard)", "cubesat": "CubeSat 101 (NASA CSLI)"}

# The challenge's Resources tab, one entry per item, with what this game does with it.
RESOURCES = [
    {"key": "sci", "name": "Design and Develop Science Missions", "by": "NASA Small Spacecraft Systems Virtual Institute",
     "what": "How a science mission goes from a need to a flying spacecraft, and the four segments every mission has.",
     "used": "The review sheet and the mission report are sorted into the launch, space, ground and user segments. "
             "The six-step process is the strip at the top of the mission process sheet. "
             "'Begin with the end in mind' is why every mission starts with the client's goals, not with parts."},
    {"key": "cml", "name": "Concept Maturity Levels", "by": "NASA Jet Propulsion Laboratory",
     "what": "A nine-step scale that says how grown-up a mission idea is, from a sketch on a napkin to a reviewed design.",
     "used": "The CML ladder on the review sheet. You climb from CML 1 to CML 4 while you design, "
             "and CML 3 asks you to compare at least two designs before you settle on one."},
    {"key": "mdl", "name": "Mission Design Lab", "by": "NASA Goddard Space Flight Center",
     "what": "A room where engineers and scientists turn an idea into a checked mission design in about a week.",
     "used": "The four team roles work like the lab's discipline engineers. The mission report has a master equipment "
             "list like the lab's point design study. The handbook names your 'tall poles': the biggest drivers of mass and cost."},
    {"key": "cubesat", "name": "CubeSat 101", "by": "NASA CubeSat Launch Initiative",
     "what": "A guide for first-time small satellite builders, from the first idea to operations in orbit.",
     "used": "The build and test lab: 'test like you fly' and the second flight unit. The 10% budget reserve rule in the score. "
             "The margin, schedule and record-keeping advice in the handbook."},
    {"key": "webb", "name": "A Learning Game About Telescopes", "by": "NASA Science (Webb)",
     "what": "A game where science goals decide the wavelengths, instruments and optics of a space telescope.",
     "used": "After every flight the newspaper shows the real NASA mission closest to yours, with its mass, rocket and cost. "
             "The Exoplanet Hunter mission follows the same idea: the goal decides the telescope."},
    {"key": "gmat", "name": "General Mission Analysis Tool (GMAT)", "by": "NASA Goddard and partners",
     "what": "Free, open-source software that real teams use to design and optimise trajectories and launch windows.",
     "used": "The game's delta-v, launch windows and cruise times are simplified versions of what GMAT computes. "
             "Open it when you want to fly one of your orbits for real."},
    {"key": "viz", "name": "NASA Mission Viz", "by": "NASA",
     "what": "Web pages that show orbits and transfers in 3D, including an Earth to Moon flight.",
     "used": "The launch film draws the transfer arc and the final orbit for your destination in the same spirit."},
    {"key": "vr", "name": "Visualize a Space Mission Using Virtual Reality", "by": "NASA Space Apps Challenge 2023",
     "what": "An earlier challenge: show a whole mission, its concept, trajectory and timeline.",
     "used": "The launch film and the flight dashboard show the same three things: the concept, the path and the timeline, month by month."},
    {"key": "csa", "name": "Digital Games and Activities", "by": "Canadian Space Agency",
     "what": "Games, e-books and activities about space for all ages, and Canada's role in space.",
     "used": "A collection of space games for younger players: a good next stop after this one, and a reminder to explain every idea in plain words."},
]

# "Big Picture Process to Design & Develop a Space Mission" and where each step happens in the game.
PROCESS = [
    {"key": "need", "name": "Identify need & goals", "where": "The client's letter and the mission request."},
    {"key": "concept", "name": "Define concept", "where": "Orbit, launch date and the kind of spacecraft."},
    {"key": "requirements", "name": "Define requirements", "where": "Goal targets, budget, margins and the years of science."},
    {"key": "design", "name": "Design", "where": "The labs: every part of the spacecraft."},
    {"key": "build", "name": "Build & verify", "where": "The build and test lab, the review sheet and the risk check."},
    {"key": "implement", "name": "Implement", "where": "The stamp, the launch and the flight itself."},
]

CML_LEVELS = [
    {"level": 1, "name": "Cocktail napkin", "text": "The science questions are clear and there is a first sketch of the mission.",
     "todo": "Read the mission request and pick where to fly or what to carry."},
    {"level": 2, "name": "Initial feasibility", "text": "Every part is chosen and the basic numbers have been calculated.",
     "todo": "Choose every part so that mass, power, data and cost can be calculated."},
    {"level": 3, "name": "Trade space", "text": "Different designs have been compared for science return, cost and risk.",
     "todo": "Save this design to the drawer and compare it with a different one (button Compare)."},
    {"level": 4, "name": "Point design", "text": "One design is selected, down to the subsystems, with acceptable margins and reserves.",
     "todo": "Clear every blocker and keep 10% margin on mass and power and 10% budget reserve."},
]
CML_LATER = "CML 5 to 9 belong to the real project: baseline concept, integrated concept, preliminary baseline, then the " \
            "Preliminary and Critical Design Reviews."
POINT_MARGIN = 0.10

SEGMENT_INFO = {
    "launch": ("Launch segment", "The launch vehicle and services that get the spacecraft into space."),
    "space": ("Space segment", "The spacecraft and its instruments that collect the data."),
    "ground": ("Ground segment", "Ground stations and mission control that talk to the spacecraft and receive the data."),
    "user": ("User segment", "The scientists and the public who use the data."),
}
AREA_SEGMENT = {"launch": "launch", "window": "launch",
                "bus": "space", "power": "space", "adcs": "space", "propulsion": "space", "radiation": "space", "edl": "space",
                "orbit": "space", "schedule": "space",
                "comms": "ground", "data": "ground", "science": "user", "cost": "user"}
FIELD_SEGMENT = {"window": "launch", "launch_vehicle": "launch", "comms": "ground", "ground": "ground", "computer": "ground",
                 "instruments": "space"}

# Real missions to hold a player's design against. Round public figures; cost is the mission's life-cycle cost where
# NASA publishes one. mass = launch mass in kg, cost in M$, power in W (None where it does not compare).
NASA_MISSION = "https://science.nasa.gov/mission/"
REAL_MISSIONS = {
    "wildfire": [
        {"name": "Landsat 9", "year": 2021, "mass": 2711, "rocket": "Atlas V 401", "cost": 750, "power": None,
         "where": "Sun-synchronous orbit, 705 km", "url": NASA_MISSION + "landsat-9/",
         "lesson": "Landsat flies a Sun-synchronous orbit so every picture of a place is taken at the same local time. "
                   "That is what lets scientists compare a forest before and after a fire."},
        {"name": "PUNCH", "year": 2025, "mass": 256, "rocket": "Falcon 9 (shared ride)", "cost": 165, "power": None,
         "where": "Sun-synchronous orbit, four small satellites", "url": NASA_MISSION + "punch/",
         "lesson": "PUNCH studies the Sun, not fires, but it shows the small-satellite way: four 64 kg spacecraft "
                   "sharing a rocket instead of one big one."}],
    "storm_watch": [
        {"name": "GOES-16", "year": 2016, "mass": 5192, "rocket": "Atlas V 541", "cost": 2700, "power": 4000,
         "where": "Geostationary orbit, 35,786 km", "url": NASA_MISSION + "goes/",
         "lesson": "A geostationary satellite stays over one spot, so it can film a hurricane every 30 seconds. "
                   "The price is distance: it needs a big rocket and big instruments."}],
    "lunar_ice": [
        {"name": "Lunar Prospector", "year": 1998, "mass": 296, "rocket": "Athena II", "cost": 63, "power": 200,
         "where": "Polar lunar orbit, 100 km", "url": NASA_MISSION + "lunar-prospector/",
         "lesson": "A tiny, cheap spacecraft with a neutron spectrometer found hydrogen at the lunar poles. "
                   "It carried five simple instruments and no camera at all."}],
    "landing_scout": [
        {"name": "Lunar Reconnaissance Orbiter", "year": 2009, "mass": 1916, "rocket": "Atlas V 401", "cost": 504, "power": 1850,
         "where": "Polar lunar orbit, 50 km", "url": NASA_MISSION + "lro/",
         "lesson": "LRO maps the Moon from only 50 km up to find safe landing sites. Flying that low costs fuel "
                   "every month, so it later moved to a higher, cheaper orbit."}],
    "asteroid_prospector": [
        {"name": "NEAR Shoemaker", "year": 1996, "mass": 805, "rocket": "Delta II", "cost": 224, "power": 1800,
         "where": "Orbit around asteroid Eros", "url": NASA_MISSION + "near-shoemaker/",
         "lesson": "The first spacecraft to orbit an asteroid. Its first try at entering orbit failed and it had to "
                   "wait a year for a second chance, which is why insertion burns are so feared."},
        {"name": "Dawn", "year": 2007, "mass": 1218, "rocket": "Delta II Heavy", "cost": 467, "power": 10000,
         "where": "Orbited Vesta, then Ceres", "url": NASA_MISSION + "dawn/",
         "lesson": "Dawn used ion engines: tiny thrust, huge efficiency. That let one spacecraft orbit two different "
                   "worlds, which no chemical engine could have done."}],
    "venus_clouds": [
        {"name": "Magellan", "year": 1989, "mass": 3445, "rocket": "Space Shuttle Atlantis + IUS", "cost": 680, "power": 1200,
         "where": "Polar orbit around Venus", "url": NASA_MISSION + "magellan/",
         "lesson": "Cameras cannot see through the clouds of Venus, so Magellan carried one instrument: a radar. "
                   "It mapped 98% of the surface. It was built partly from spare parts of other missions."}],
    "lunar_lander": [
        {"name": "IM-1 Odysseus", "year": 2024, "mass": 1900, "rocket": "Falcon 9", "cost": 118, "power": None,
         "where": "Near the lunar south pole", "url": "https://www.nasa.gov/commercial-lunar-payload-services/",
         "lesson": "The first US Moon landing since Apollo. It touched down too fast, broke a leg and tipped over. "
                   "It still worked for a week: landing is the riskiest minute of a surface mission."}],
    "asteroid_sample": [
        {"name": "OSIRIS-REx", "year": 2016, "mass": 2110, "rocket": "Atlas V 411", "cost": 1160, "power": 3000,
         "where": "Asteroid Bennu and back", "url": NASA_MISSION + "osiris-rex/",
         "lesson": "Seven years of flying for a few seconds of touching the asteroid. It brought home 121.6 grams, "
                   "twice the goal. One of the capsule's parachutes did not open as planned and the main one saved it."}],
    "orbital_outpost": [
        {"name": "International Space Station", "year": 1998, "mass": 420000, "rocket": "42 assembly flights", "cost": 150000,
         "power": 100000, "where": "Low Earth orbit, 400 km", "url": "https://www.nasa.gov/international-space-station/",
         "lesson": "Too big for any rocket, so it was built in orbit over 13 years by 15 countries. "
                   "Every module had to fit the rocket that carried it, exactly like your manifest."}],
    "iss_resupply": [
        {"name": "Commercial Resupply Services", "year": 2008, "mass": None, "rocket": "Falcon 9 and Antares", "cost": 3500,
         "power": None, "where": "20 cargo flights to the ISS",
         "url": "https://www.nasa.gov/international-space-station/",
         "lesson": "NASA stopped building its own cargo ships and bought deliveries from two companies instead. "
                   "Two suppliers meant the station still got food when one rocket failed."}],
    "lunar_base": [
        {"name": "Artemis", "year": 2022, "mass": None, "rocket": "SLS, Falcon Heavy, Starship", "cost": None, "power": None,
         "where": "Lunar orbit and the south pole", "url": "https://www.nasa.gov/humans-in-space/artemis/",
         "lesson": "Artemis splits the job: one rocket for the crew, others for landers and cargo. "
                   "The south pole was chosen for sunlight and for ice in the dark craters."}],
    "mars_base": [
        {"name": "Mars Design Reference Architecture 5.0", "year": 2009, "mass": None, "rocket": "Heavy-lift rockets",
         "cost": None, "power": None, "where": "A study, not a flown mission",
         "url": "https://www.nasa.gov/humans-in-space/humans-to-mars/",
         "lesson": "NASA's plan sends cargo one launch window before the crew, about 26 months earlier. "
                   "Nobody leaves Earth until the habitat and the return fuel are already waiting on Mars."}],
    "crew_transport": [
        {"name": "Crew Dragon", "year": 2020, "mass": 12500, "rocket": "Falcon 9", "cost": 2600, "power": None,
         "where": "Low Earth orbit, to the ISS",
         "url": "https://www.nasa.gov/humans-in-space/commercial-space/commercial-crew-program/",
         "lesson": "A capsule with pusher escape engines built into its walls, a heat shield that burns away and an "
                   "ocean splashdown. NASA asked for no more than 1 loss of crew in 270 flights."}],
    "exoplanet_hunter": [
        {"name": "Kepler", "year": 2009, "mass": 1052, "rocket": "Delta II", "cost": 600, "power": 1100,
         "where": "Earth-trailing orbit around the Sun", "url": NASA_MISSION + "kepler/",
         "lesson": "Kepler stared at one patch of sky for four years and found more than 2,600 planets. "
                   "When two reaction wheels failed, engineers used sunlight pressure to keep it pointing."}],
    "mars_climate": [
        {"name": "Mars Reconnaissance Orbiter", "year": 2005, "mass": 2180, "rocket": "Atlas V 401", "cost": 720, "power": 2000,
         "where": "Polar orbit around Mars, 300 km", "url": NASA_MISSION + "mars-reconnaissance-orbiter/",
         "lesson": "MRO carries a 3 metre dish and has sent home more data than all other Mars missions together. "
                   "The antenna, not the cameras, set how much science it could do."}],
    "mars_rover": [
        {"name": "Perseverance", "year": 2020, "mass": 4000, "rocket": "Atlas V 541", "cost": 2700, "power": 110,
         "where": "Jezero crater, Mars", "url": NASA_MISSION + "mars-2020-perseverance/",
         "lesson": "Only about a quarter of the launch mass is the 1,025 kg rover. The rest is the cruise stage, heat shield "
                   "and sky crane. One nuclear generator gives it 110 W, day and night, through dust storms."}],
    "europa": [
        {"name": "Europa Clipper", "year": 2024, "mass": 6065, "rocket": "Falcon Heavy", "cost": 5200, "power": 700,
         "where": "Jupiter orbit, about 49 flybys of Europa", "url": NASA_MISSION + "europa-clipper/",
         "lesson": "Clipper does not orbit Europa: the radiation there would kill it in months. It dives in, "
                   "collects data and retreats. Its electronics sit in a metal vault and its solar wings span 30 metres."}],
}

# Advice, with the source it comes from. `when` decides whether it applies to the current design.
TIPS = [
    {"id": "reserve", "src": "cubesat", "stage": "launch",
     "text": "Keep a budget reserve of at least 10% for surprises. Problems found in testing always cost money.",
     "quote": "When possible, project reserves of at least 10% should be part of the budget to address any unexpected events."},
    {"id": "mass_margin", "src": "cubesat", "stage": "bus",
     "text": "Early mass numbers always grow. Leave a large, but still reasonable, margin under the rocket's limit.",
     "quote": "Be sure to include large, but still reasonable, margins on all values."},
    {"id": "schedule", "src": "cubesat", "stage": "launch",
     "text": "Pad the build schedule. A small satellite typically takes 18 to 24 months to build; a rushed one skips tests.",
     "quote": "Be conservative in planning and pad your build schedule with plenty of margin."},
    {"id": "tlyf", "src": "cubesat", "stage": "build",
     "text": "Test like you fly: run the spacecraft on the ground exactly as it will run in space, part by part, then together.",
     "quote": "Never assume that boards or subsystems that work well during standalone testing will work together."},
    {"id": "spare", "src": "cubesat", "stage": "build",
     "text": "A second flight unit costs far less than the first one. If the rocket fails, the mission can still fly.",
     "quote": "It's cheaper to build two satellites at once than to build one and later decide to build another."},
    {"id": "records", "src": "cubesat", "stage": "review",
     "text": "Keep records of what you tried. Save your designs to the drawer so the next attempt starts from knowledge, not memory.",
     "quote": "Keep excellent records of everything you do."},
    {"id": "trades", "src": "cml", "stage": "review",
     "text": "Do not marry your first design. Compare at least two different ones before you approve.",
     "quote": "Teams often move directly into point design without first having done sufficient trade space exploration."},
    {"id": "end_in_mind", "src": "sci", "stage": "instr",
     "text": "Begin with the end in mind: start from the data the scientists need, then choose instruments that deliver it.",
     "quote": "What type and quantity of data is needed to answer research questions?"},
    {"id": "user", "src": "sci", "stage": "comms",
     "text": "Data that never reaches the user segment is not science. Size the antenna and ground stations for what the instruments make.",
     "quote": "User segment: scientists and the public who will use the data collected by the mission."},
    {"id": "tall_pole", "src": "mdl", "stage": "review",
     "text": "Find the tall poles first: the one or two things that drive mass and cost. Fix those before you polish the rest.",
     "quote": "Identify tall poles and key trade studies."},
    {"id": "verify", "src": "sci", "stage": "review",
     "text": "For every requirement, know how you will check it. The review sheet is that check: a number against a limit.",
     "quote": "When identifying requirements, also plan how you will verify that design satisfies requirements."},
]


def _probe(ev: dict) -> bool:
    return ev.get("kind") not in ("program", "vehicle")


def _missing(ev: dict) -> list:
    return [i for i in ev["issues"] if i["area"] == "missing"]


def cml(ev: dict, trades: int = 0) -> dict:
    """Concept Maturity Level 1-4 of a design. `trades` = how many different designs the player has compared."""
    d = ev["design"]
    sketch = bool(d.get("orbit") or d.get("instruments") or d.get("manifest") or d.get("shape") or d.get("launch_vehicle"))
    feasible = sketch and not _missing(ev)
    reserve_ok = d.get("sandbox") or ev["cost"]["reserve"] >= POINT_MARGIN
    margins_ok = not _probe(ev) or (ev["mass"]["margin"] >= POINT_MARGIN and ev["power"]["margin"] >= POINT_MARGIN)
    point = bool(feasible and ev["ok"] and reserve_ok and margins_ok)
    done = [sketch, feasible, trades >= 2, point]
    level = 0
    for ok in done:
        if not ok:
            break
        level += 1
    steps = [{**s, "done": bool(done[i])} for i, s in enumerate(CML_LEVELS)]
    return {"level": level, "steps": steps, "skipped_trades": point and trades < 2, "later": CML_LATER}


def segments(ev: dict) -> list[dict]:
    """The four mission segments with the numbers that belong to each and how healthy each one is."""
    d, sc = ev["design"], ev["scenario"]
    state = {k: "ok" for k in SEGMENT_INFO}
    rank = {"ok": 0, "pending": 1, "warn": 2, "bad": 3}

    def bump(seg, s):
        if rank[s] > rank[state[seg]]:
            state[seg] = s

    for i in ev["issues"]:
        if i["area"] == "missing":
            bump(FIELD_SEGMENT.get(i.get("field"), "space"), "pending")
        elif i["severity"] != "info":
            bump(AREA_SEGMENT.get(i["area"], "space"), "bad" if i["severity"] == "blocker" else "warn")
    lines = {k: [] for k in SEGMENT_INFO}
    goals = ev["science"]["goals"]
    met = sum(1 for g in goals if g["met"])
    if _probe(ev):
        lv = C.LAUNCH_VEHICLES.get(d["launch_vehicle"] or "")
        m, p, da = ev["mass"], ev["power"], ev["data"]
        win = ev["schedule"]["window"]
        lines["launch"] = [["Rocket", lv["name"] if lv else "not chosen"],
                           ["Launch mass", f"{m['wet']:,.0f} of {m['capacity']:,.0f} kg" if lv and d["orbit"] and m["wet"] != float("inf") else "-"],
                           ["Launch date", win["label"] if win else "not chosen"]]
        lines["space"] = [["Spacecraft", C.BUSES[d["bus"]]["name"] if d["bus"] else "not chosen"],
                          ["Dry mass", f"{m['dry']:,.0f} kg"],
                          ["Power", f"{p['load']:,.0f} of {p['generation']:,.0f} W"],
                          ["Instruments", str(len(d["instruments"]))]]
        lines["ground"] = [["Stations", C.GROUND[d["ground"]]["name"] if d["ground"] else "not chosen"],
                           ["Contact", f"{da['contact_hours']:.1f} h a day"],
                           ["Downlink", f"{da['rate_mbps']:.2f} Mbps"],
                           ["Data reaching Earth", f"{da['return']:.0%}"]]
        lines["user"] = [["Goals met", f"{met} of {len(goals)}"],
                         ["Data delivered", f"{da['generated_gb_day'] * da['return']:.1f} Gb a day"],
                         ["Science", f"{ev['science']['score']:.0f} of 100"]]
    else:
        lines["launch"] = [["Launch", C.LAUNCH_VEHICLES[d["launch_vehicle"]]["name"] if d.get("launch_vehicle") else
                            (f"{len(ev['program']['flights'])} flights" if ev.get("program") else "not chosen")]]
        lines["space"] = [["Cost", f"{ev['cost']['total']:,.0f} of {ev['cost']['budget']:,.0f} M$"]]
        lines["ground"] = [["Mission control", "NASA Mission Control, Houston"]]
        lines["user"] = [["Goals met", f"{met} of {len(goals)}"], ["Result", f"{ev['science']['score']:.0f} of 100"]]
    return [{"key": k, "name": SEGMENT_INFO[k][0], "what": SEGMENT_INFO[k][1], "state": state[k], "lines": lines[k]}
            for k in SEGMENT_INFO]


def mel(ev: dict) -> dict:
    """Master equipment list: every item on the spacecraft with its mass, power draw and cost."""
    if not _probe(ev):
        return {"rows": [], "total": None}
    d, rows = ev["design"], []

    def add(group, o, n=1, power=None):
        if o and (o.get("mass") or o.get("cost")):
            rows.append({"group": group, "name": o["name"] + (f" x{n}" if n > 1 else ""), "mass": o.get("mass", 0) * n,
                         "power": (o.get("power", 0) if power is None else power) * n, "cost": o.get("cost", 0) * n})

    add("Structure", C.BUSES.get(d["bus"]))
    add("Power", C.SOLAR_ARRAYS.get(d["solar"]), power=0)
    if d["rtg"]:
        add("Power", C.RTG, d["rtg"], power=0)
    add("Power", C.BATTERIES.get(d["battery"]), power=0)
    add("Attitude control", C.ADCS.get(d["adcs"]))
    add("Propulsion", C.PROPULSION.get(d["propulsion"]))
    add("Communications", C.COMMS.get(d["comms"]))
    add("Avionics", C.COMPUTERS.get(d["computer"]))
    if d["edl"]:
        e = C.EDL[d["edl"]]
        rows.append({"group": "Landing", "name": e["name"], "mass": ev["edl"]["mass"], "power": 0, "cost": e["cost"]})
    for k in d["instruments"]:
        add("Payload", C.INSTRUMENTS[k])
    m = ev["mass"]
    finite = m["propellant"] != float("inf")
    if finite and m["tanks"]:
        rows.append({"group": "Propulsion", "name": "Propellant tanks", "mass": m["tanks"], "power": 0, "cost": 0})
    if finite and m["propellant"]:
        rows.append({"group": "Propulsion", "name": "Propellant", "mass": m["propellant"], "power": 0, "cost": 0})
    return {"rows": rows, "total": {"mass": sum(r["mass"] for r in rows), "power": sum(r["power"] for r in rows),
                                    "cost": sum(r["cost"] for r in rows)}}


def tall_poles(ev: dict) -> dict:
    """The biggest driver of mass and of cost (what a Mission Design Lab session looks for first)."""
    out = {}
    parts = {k: v for k, v in ev["mass"].get("parts", {}).items() if v}
    if _probe(ev):
        if ev["mass"]["propellant"] not in (0, float("inf")):
            parts["Propellant"] = ev["mass"]["propellant"]
        if parts and ev["mass"]["wet"] not in (0, float("inf")):
            k = max(parts, key=parts.get)
            out["mass"] = {"name": k, "share": parts[k] / ev["mass"]["wet"]}
    items = {k: v for k, v in ev["cost"]["items"].items() if v > 0}
    if items and ev["cost"]["total"] > 0:
        k = max(items, key=items.get)
        out["cost"] = {"name": k, "share": items[k] / sum(items.values())}
    return out


def tips(ev: dict, trades: int = 0) -> list[dict]:
    """Advice from the NASA documents; `active` marks the ones this design should hear right now."""
    d = ev["design"]
    probe = _probe(ev)
    win = ev["schedule"]["window"]
    useless = any(v == 0 for v in ev["science"].get("per_instrument", {}).values())
    when = {
        "reserve": not d.get("sandbox") and ev["cost"]["reserve"] < 0.10,
        "mass_margin": probe and bool(d["launch_vehicle"] and d["orbit"]) and ev["mass"]["margin"] < 0.15,
        "schedule": bool(win and win["rush"] >= 0.34),
        "tlyf": probe and d.get("testing") != "tlyf",
        "spare": probe and d.get("spare") != "spare",
        "records": trades < 1,
        "trades": trades < 2,
        "end_in_mind": probe and (not d["instruments"] or useless),
        "user": probe and bool(d["instruments"] and d["comms"] and d["ground"]) and ev["data"]["return"] < 0.8,
        "tall_pole": True,
        "verify": bool(ev["issues"]),
    }
    poles = tall_poles(ev)
    out = []
    for t in TIPS:
        text = t["text"]
        if t["id"] == "tall_pole" and poles:
            bits = [f"{p['name']} is {p['share']:.0%} of the {k}" for k, p in poles.items()]
            text += " Right now: " + " and ".join(bits) + "."
        out.append({**t, "text": text, "source": SOURCE[t["src"]], "url": URL[t["src"]], "active": bool(when[t["id"]])})
    return out


def real_compare(ev: dict) -> list[dict]:
    """The real missions closest to this one, with rows 'yours against the real one'."""
    d, out = ev["design"], []
    probe = _probe(ev)
    lv = C.LAUNCH_VEHICLES.get(d.get("launch_vehicle") or "")
    for r in REAL_MISSIONS.get(d["scenario"], []):
        rows = []
        wet = ev["mass"]["wet"]
        if probe and r["mass"] and wet and wet != float("inf"):
            rows.append({"label": "Launch mass", "yours": f"{wet:,.0f} kg", "real": f"about {r['mass']:,} kg", "ratio": wet / r["mass"]})
        if r["cost"]:
            rows.append({"label": "Cost", "yours": f"{ev['cost']['total']:,.0f} M$", "real": f"about {r['cost']:,} M$",
                         "ratio": ev["cost"]["total"] / r["cost"]})
        if probe and r["power"] and ev["power"]["generation"]:
            rows.append({"label": "Power", "yours": f"{ev['power']['generation']:,.0f} W", "real": f"about {r['power']:,} W",
                         "ratio": ev["power"]["generation"] / r["power"]})
        if lv or ev.get("program"):
            rows.append({"label": "Rocket", "yours": lv["name"] if lv else f"{len(ev['program']['flights'])} flights",
                         "real": r["rocket"], "ratio": None})
        note = ""
        mass_row = next((x for x in rows if x["label"] == "Launch mass"), None)
        if mass_row:
            q = mass_row["ratio"]
            note = (f"Your spacecraft is {1 / q:.1f} times lighter than {r['name']}." if q < 0.8 else
                    f"Your spacecraft is {q:.1f} times heavier than {r['name']}." if q > 1.25 else
                    f"Your spacecraft weighs about the same as {r['name']}.")
        out.append({"name": r["name"], "year": r["year"], "where": r["where"], "url": r["url"], "lesson": r["lesson"],
                    "rows": rows, "note": note})
    return out


def brief(ev: dict, trades: int = 0) -> dict:
    return {"cml": cml(ev, trades), "segments": segments(ev), "mel": mel(ev), "tips": tips(ev, trades),
            "real": real_compare(ev), "poles": tall_poles(ev)}

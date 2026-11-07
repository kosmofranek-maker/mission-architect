"""Game content: scenarios, orbits, launch vehicles, spacecraft parts and instruments.

Numbers are simplified but grounded in real missions (MRO, LRO, Juno, Europa Clipper,
CubeSats). They are rounded on purpose: the goal is to teach trade-offs, not to be a
precise engineering tool. Costs are in millions of US dollars (M$).
"""

G0 = 9.80665  # m/s^2, used in the rocket equation

# --------------------------------------------------------------------------------------
# Environments. "sun_au" drives solar power, "earth_au" drives communications,
# "radiation" is compared against computer tolerance, "magnetic" allows magnetorquers.
# --------------------------------------------------------------------------------------
DESTINATIONS = {
    "earth": {"name": "Earth orbit", "sun_au": 1.0, "earth_au": 0.0, "radiation": 1,
              "magnetic": True, "lv_target": None},
    "moon": {"name": "The Moon", "sun_au": 1.0, "earth_au": 0.00257, "radiation": 2,
             "magnetic": False, "lv_target": "tli"},
    "mars": {"name": "Mars", "sun_au": 1.52, "earth_au": 1.5, "radiation": 2,
             "magnetic": False, "lv_target": "mars"},
    "venus": {"name": "Venus", "sun_au": 0.72, "earth_au": 1.0, "radiation": 2,
              "magnetic": False, "lv_target": "venus",
              "blind": ["lidar", "hirise", "thermal"],
              "blind_why": "Venus is wrapped in thick sulfuric-acid clouds: light and lasers never reach the ground."},
    "asteroid": {"name": "Near-Earth asteroid", "sun_au": 1.1, "earth_au": 0.6, "radiation": 1,
                 "magnetic": False, "lv_target": "asteroid"},
    "europa": {"name": "Europa (Jupiter)", "sun_au": 5.2, "earth_au": 5.0, "radiation": 4,
               "magnetic": False, "lv_target": "jupiter"},
    # Surface missions: the "orbit" choice becomes a landing site. "atmosphere" decides which landing
    # systems work; "relay" means orbiters can forward data (Mars).
    "moon_surface": {"name": "Lunar south pole (surface)", "sun_au": 1.0, "earth_au": 0.00257, "radiation": 2,
                     "magnetic": False, "lv_target": "tli", "surface": True, "atmosphere": False},
    "mars_surface": {"name": "Mars (surface)", "sun_au": 1.52, "earth_au": 1.5, "radiation": 2,
                     "magnetic": False, "lv_target": "mars", "surface": True, "atmosphere": True, "relay": True},
}

RADIATION_LABEL = {1: "Low", 2: "Moderate", 3: "High", 4: "Extreme"}

# --------------------------------------------------------------------------------------
# Calendar and launch windows. Month 0 of the game is January 2027.
# Earth and Moon missions can launch any month: the date only decides how long the team has to build.
# Planets line up only once per synodic period; "first" = first window (months after Jan 2027);
# "cycle" = windows until the geometry repeats (Mars has good and poor windows on a ~15-year cycle).
# --------------------------------------------------------------------------------------
EPOCH_YEAR = 2027
MIN_BUILD_MONTHS = 12
WINDOW_RULES = {
    "mars": {"synodic": 26, "first": 23, "cycle": 7, "shift": 0.0},
    "mars_surface": {"synodic": 26, "first": 23, "cycle": 7, "shift": 0.0},
    "venus": {"synodic": 19, "first": 12, "cycle": 5, "shift": 0.6},
    "europa": {"synodic": 13, "first": 9, "cycle": 11, "shift": 3.0},
    "asteroid": {"synodic": 14, "first": 6, "cycle": 6, "shift": 2.1},
}
# --------------------------------------------------------------------------------------
# International partners. Each pays part of the hardware and/or brings hardware of its own, but every interface
# adds meetings, paperwork and a chance their part is late. Programs (stations, bases) get a flight instead.
# --------------------------------------------------------------------------------------
PARTNERS = {
    "esa": {"name": "ESA (Europe)", "share": 0.12, "delay": 0.08,
            "instrument": {"name": "European spectrometer", "mass": 16, "power": 18, "cost": 0, "data_mbps": 1.0,
                           "duty": 0.2, "value": 18, "tags": ["composition", "climate", "water"], "pointing_deg": 0.5},
            "gives": "Pays 12% of the hardware and adds a European spectrometer (uses one instrument slot).",
            "learn": "ESA built instruments for Juno, Cassini and Europa Clipper and flew its own probes to Mars, Venus and a comet.",
            "rocket": "Ariane 6", "program": {"station": {"p": "lab", "slot": 3}, "moon": {"p": "lcargo_l", "slot": 2},
                                              "mars": {"p": "mpower", "slot": 0}},
            "program_gives": "Builds a module or lander and launches it on Ariane 6 for free, on ESA's own date."},
    "jaxa": {"name": "JAXA (Japan)", "share": 0.10, "delay": 0.06,
             "instrument": {"name": "Japanese multiband camera", "mass": 9, "power": 12, "cost": 0, "data_mbps": 3.0,
                            "duty": 0.1, "value": 18, "tags": ["imaging", "topography", "thermal"], "pointing_deg": 0.5},
             "gives": "Pays 10% of the hardware and adds a Japanese multiband camera (uses one instrument slot).",
             "learn": "JAXA's Hayabusa missions brought back samples from two asteroids.",
             "rocket": "H3", "program": {"station": {"p": "cargo", "slot": 4}, "moon": {"p": "lrover", "slot": 3},
                                         "mars": {"p": "mcargo", "slot": 1}},
             "program_gives": "Builds and launches a cargo ship or rover on an H3 rocket for free, on JAXA's own date."},
    "csa": {"name": "CSA (Canada)", "share": 0.08, "delay": 0.05,
            "instrument": {"name": "Canadian laser altimeter", "mass": 12, "power": 18, "cost": 0, "data_mbps": 0.1,
                           "duty": 1.0, "value": 18, "tags": ["topography"], "pointing_deg": 0.1, "where": "orbit"},
            "instrument_surface": {"name": "Canadian X-ray rock spectrometer", "mass": 2, "power": 6, "cost": 0,
                                   "data_mbps": 0.05, "duty": 0.2, "value": 16, "tags": ["composition"], "pointing_deg": 10},
            "gives": "Pays 8% of the hardware and adds a Canadian instrument (uses one instrument slot).",
            "learn": "Canada built the laser that mapped asteroid Bennu, the X-ray spectrometer on Curiosity and the space station's robot arms.",
            "arm": True, "program_gives": "Adds a robotic arm: docking and berthing go wrong far less often, and it pays 8% of the hardware."},
    "isro": {"name": "ISRO (India)", "share": 0.06, "delay": 0.07, "tracking_h": 4,
             "gives": "Pays 6% of the hardware and lends its deep-space antennas: +4 hours of contact per day.",
             "learn": "India reached Mars orbit on its first try and landed near the Moon's south pole with Chandrayaan-3.",
             "program_gives": "Pays 6% of the hardware."},
}
MAX_PARTNERS = 2

# --------------------------------------------------------------------------------------
# Programs: missions built from many launches (a space station, a Moon base, a crewed Mars expedition).
# Each flight carries one payload. Flights are planned in slots: quarters near Earth and the Moon,
# launch windows for Mars. Supplies, bunks and power are tracked month by month.
# --------------------------------------------------------------------------------------
CREW_RATED = ["falcon9", "vulcan", "sls"]      # rockets with a launch escape system, certified for people
SUPPLY_KG_PER_CREW_MONTH = 75                  # food, water and air per person per month, with water recycling
CREW_POWER_KW = 1.5                            # life support, lights, computers per person
MODULE_BERTH_RISK = 0.03                       # chance a station module is damaged while docking

PAYLOADS = {
    # ---- Earth-orbit station
    "core": {"name": "Core module", "group": "module", "mass": 20000, "cost": 900, "target": "leo",
             "power_gen": 25, "power_use": 6, "berth": True,
             "learn": "Power, guidance, thrusters and docking ports. Everything else bolts onto it."},
    "hab": {"name": "Habitation module", "group": "module", "mass": 16000, "cost": 650, "target": "leo",
            "power_use": 8, "beds": 4, "stock": 1500, "requires": ["core"], "berth": True,
            "learn": "Bunks, galley, toilet and the machines that recycle water and air. Comes with 1.5 t of supplies."},
    "lab": {"name": "Laboratory module", "group": "module", "mass": 15000, "cost": 550, "target": "leo",
            "power_use": 10, "research": 1, "requires": ["core"], "berth": True,
            "learn": "Experiment racks for biology, medicine and materials in weightlessness."},
    "truss": {"name": "Solar truss (+40 kW)", "group": "module", "mass": 14000, "cost": 300, "target": "leo",
              "power_gen": 40, "requires": ["core"], "berth": True,
              "learn": "A long beam with huge solar wings and radiators. The ISS carries eight such wings."},
    "cargo": {"name": "Cargo ship (3 t supplies)", "group": "cargo", "mass": 8000, "cost": 80, "target": "leo",
              "supplies": 3000, "requires": ["core"],
              "learn": "An uncrewed ship full of food, water, air and spare parts. Leaves with the rubbish and burns up."},
    "cargo_l": {"name": "Large cargo ship (6 t supplies)", "group": "cargo", "mass": 15000, "cost": 140, "target": "leo",
                "supplies": 6000, "requires": ["core"],
                "learn": "Twice the supplies in one trip. Needs a bigger rocket."},
    "crew": {"name": "Crew capsule (4 seats)", "group": "crew", "mass": 13000, "cost": 120, "target": "leo", "crew": 4,
             "requires": ["hab"],
             "learn": "Four astronauts ride up, live aboard for six months and come home in the same capsule."},
    # ---- Moon base (a habitat and a small solar field are already on the surface)
    "lcargo": {"name": "Cargo lander (1.5 t supplies)", "group": "cargo", "mass": 6000, "cost": 120, "target": "tli",
               "supplies": 1500, "land_risk": 0.03,
               "learn": "A small robotic lander that touches down next to the base with supplies."},
    "lcargo_l": {"name": "Large cargo lander (4 t supplies)", "group": "cargo", "mass": 15000, "cost": 260,
                 "target": "tli", "supplies": 4000, "land_risk": 0.04,
                 "learn": "Bigger lander, more supplies per launch, but it needs a heavy rocket."},
    "lpower": {"name": "Fission power unit (40 kW)", "group": "module", "mass": 6000, "cost": 300, "target": "tli",
               "power_gen": 40, "land_risk": 0.03,
               "learn": "A small nuclear reactor: steady power through the 14-day lunar night, when solar panels give nothing."},
    "lrover": {"name": "Pressurized rover", "group": "module", "mass": 9000, "cost": 350, "target": "tli",
               "power_use": 3, "research": 1, "land_risk": 0.03,
               "learn": "A camper van for the Moon: two astronauts drive for weeks without spacesuits, exploring far away."},
    "lcrew_s": {"name": "Crew lander (2 seats)", "group": "crew", "mass": 10000, "cost": 300, "target": "tli", "crew": 2,
                "land_risk": 0.02, "learn": "Small and cheaper: fits a medium rocket, but brings only two astronauts."},
    "lcrew": {"name": "Crew lander (4 seats)", "group": "crew", "mass": 15000, "cost": 450, "target": "tli", "crew": 4,
              "land_risk": 0.02, "learn": "Four astronauts at once, but only the biggest crew-rated rocket can send it."},
    # ---- Mars base: send the hardware one launch window, the crew the next
    "mhab": {"name": "Surface habitat lander", "group": "module", "mass": 18000, "cost": 1200, "target": "mars",
             "cruise": 7, "beds": 4, "stock": 2000, "power_use": 10, "land_risk": 0.05,
             "learn": "The crew's home on Mars, landed empty and checked out before anyone leaves Earth. Carries 2 t of supplies."},
    "mpower": {"name": "Power and fuel plant lander", "group": "module", "mass": 14000, "cost": 700, "target": "mars",
               "cruise": 7, "power_gen": 30, "land_risk": 0.05,
               "learn": "30 kW of power, plus a machine that turns Martian air into rocket fuel for the trip home."},
    "mcargo": {"name": "Cargo lander (4 t supplies)", "group": "cargo", "mass": 15000, "cost": 400, "target": "mars",
               "cruise": 7, "supplies": 4000, "land_risk": 0.05,
               "learn": "Food, water and spare parts, landed and waiting before the crew arrives."},
    "mtransit": {"name": "Transit stage segment", "group": "stage", "mass": 30000, "cost": 500, "target": "leo",
                 "learn": "Engines, tanks and a living module, far too big for one rocket: launched in pieces and joined in Earth orbit."},
    "mcrew": {"name": "Crew vehicle (4 seats)", "group": "crew", "mass": 13000, "cost": 300, "target": "leo", "crew": 4,
              "cruise": 7, "needs_stages": 2, "requires": ["mhab"], "predeploy": True, "land_risk": 0.03,
              "learn": "Docks with two transit stage segments in Earth orbit, flies seven months to Mars and lands next to the habitat."},
}
EXISTING = {"base_hab": {"name": "Lunar habitat (already built)", "group": "module", "beds": 4, "stock": 0, "power_use": 8}}
PLACE_LABEL = {"station": "the station", "moon": "the Moon base", "mars": "the Mars base"}


SLIP_COST_MONTH = 0.004  # share of the budget burned per month of waiting (the "standing army")

# --------------------------------------------------------------------------------------
# Scenarios = mission objectives. Each goal is satisfied by instruments with that tag.
# "target" is how many quality-weighted science points saturate the goal.
# --------------------------------------------------------------------------------------
SCENARIOS = {
    "wildfire": {
        "name": "Wildfire Watch",
        "destination": "earth",
        "difficulty": "Beginner",
        "budget": 180,
        "min_years": 3,
        "pitch": "Detect wildfires early and map burned areas from Earth orbit.",
        "story": ("Fire agencies want daily images of forests and a thermal sensor that "
                  "spots hot spots before they spread. Revisit time matters more than "
                  "extreme sharpness."),
        "goals": [
            {"tag": "thermal", "label": "Detect hot spots (thermal)", "weight": 40, "target": 25, "required": True},
            {"tag": "imaging", "label": "Map burn scars (imaging)", "weight": 35, "target": 30, "required": True},
            {"tag": "climate", "label": "Track smoke & atmosphere", "weight": 25, "target": 20, "required": False},
        ],
    },
    "storm_watch": {
        "name": "Hurricane Sentinel",
        "destination": "earth",
        "difficulty": "Beginner",
        "budget": 320,
        "min_years": 5,
        "pitch": "Watch hurricanes form and grow, around the clock.",
        "orbit_bonus": {"geo": 1.5},
        "story": ("Forecasters lose track of storms between satellite passes. They want to see the "
                  "clouds move minute by minute and measure how warm the ocean beneath them is."),
        "goals": [
            {"tag": "climate", "label": "Profile storm atmosphere", "weight": 45, "target": 25, "required": True},
            {"tag": "imaging", "label": "Track cloud motion", "weight": 35, "target": 20, "required": True},
            {"tag": "thermal", "label": "Measure ocean heat", "weight": 20, "target": 20, "required": False},
        ],
    },
    "lunar_ice": {
        "name": "Lunar Ice Prospector",
        "destination": "moon",
        "difficulty": "Intermediate",
        "budget": 350,
        "min_years": 2,
        "pitch": "Find and map water ice in the Moon's permanently shadowed craters.",
        "story": ("Future astronauts need water. Ice hides in polar craters that never see "
                  "sunlight, so you must sense it indirectly and map the terrain around it."),
        "goals": [
            {"tag": "water", "label": "Detect water ice", "weight": 45, "target": 35, "required": True},
            {"tag": "topography", "label": "Map polar terrain", "weight": 30, "target": 25, "required": False},
            {"tag": "imaging", "label": "Image landing sites", "weight": 25, "target": 30, "required": False},
        ],
    },
    "landing_scout": {
        "name": "Artemis Landing Scout",
        "destination": "moon",
        "difficulty": "Intermediate",
        "budget": 480,
        "min_years": 2,
        "pitch": "Find safe landing spots for astronauts near the lunar south pole.",
        "story": ("A crew lander needs a flat patch the size of a tennis court, free of boulders. "
                  "That takes the sharpest camera you can carry, steady pointing and a lot of data."),
        "goals": [
            {"tag": "imaging", "label": "Image boulders (sharp)", "weight": 45, "target": 45, "required": True},
            {"tag": "topography", "label": "Measure slopes", "weight": 35, "target": 25, "required": True},
            {"tag": "water", "label": "Check for nearby ice", "weight": 20, "target": 25, "required": False},
        ],
    },
    "asteroid_prospector": {
        "name": "Asteroid Prospector",
        "destination": "asteroid",
        "difficulty": "Intermediate",
        "budget": 480,
        "min_years": 2,
        "pitch": "Map a near-Earth asteroid: its shape, its minerals and its water.",
        "story": ("The rock is only 500 m wide, its gravity is almost zero and sunlight pushes you around. "
                  "We want to know what it is made of, for planetary defense and future mining."),
        "goals": [
            {"tag": "composition", "label": "Identify minerals", "weight": 40, "target": 30, "required": True},
            {"tag": "topography", "label": "Model its shape", "weight": 35, "target": 25, "required": True},
            {"tag": "water", "label": "Find hydrated minerals", "weight": 25, "target": 20, "required": False},
        ],
    },
    "venus_clouds": {
        "name": "Venus Cloud Diver",
        "destination": "venus",
        "difficulty": "Advanced",
        "budget": 600,
        "min_years": 3,
        "pitch": "See through Venus' clouds, map its surface and study its runaway greenhouse.",
        "story": ("Venus is Earth's twin gone wrong: 465 C on the ground, clouds of acid above. Cameras "
                  "only see the cloud tops, so the surface must be mapped with radar."),
        "goals": [
            {"tag": "topography", "label": "Radar-map the surface", "weight": 40, "target": 30, "required": True},
            {"tag": "climate", "label": "Study the greenhouse air", "weight": 35, "target": 30, "required": True},
            {"tag": "composition", "label": "Sample cloud chemistry", "weight": 25, "target": 30, "required": False},
        ],
    },
    "lunar_lander": {
        "name": "Lunar Polar Lander",
        "kind": "lander",
        "destination": "moon_surface",
        "difficulty": "Intermediate",
        "budget": 560,
        "min_years": 1,
        "pitch": "Land near the lunar south pole and drill into the ice itself.",
        "story": ("Orbiters told us where the ice should be. Now we have to touch it: land, drill, and "
                  "survive nights that can last two weeks at -170 C."),
        "goals": [
            {"tag": "water", "label": "Measure ice in the soil", "weight": 45, "target": 35, "required": True},
            {"tag": "composition", "label": "Analyse the regolith", "weight": 35, "target": 25, "required": True},
            {"tag": "interior", "label": "Listen for moonquakes", "weight": 20, "target": 15, "required": False},
        ],
    },
    "asteroid_sample": {
        "name": "Asteroid Sample Return",
        "kind": "sample_return",
        "destination": "asteroid",
        "difficulty": "Advanced",
        "budget": 900,
        "min_years": 2,
        "pitch": "Touch an asteroid, grab a handful of it and bring it home to Earth.",
        "story": ("Labs on Earth can do what no spacecraft can. Map the rock, pick a safe spot, touch down "
                  "for five seconds, then fly the sample all the way back and land it in a desert."),
        "goals": [
            {"tag": "sample", "label": "Return a pristine sample", "weight": 50, "target": 30, "required": True},
            {"tag": "composition", "label": "Map minerals first", "weight": 30, "target": 25, "required": True},
            {"tag": "topography", "label": "Find a safe sample site", "weight": 20, "target": 20, "required": False},
        ],
    },
    "orbital_outpost": {
        "name": "Orbital Outpost",
        "kind": "program",
        "destination": "earth",
        "difficulty": "Advanced",
        "budget": 5600,
        "min_years": 2,
        "pitch": "Build a space station piece by piece and keep a crew living on it.",
        "story": ("No rocket can lift a whole station. Launch it in modules, bolt them together in orbit, "
                  "then keep astronauts aboard with crew rotations and cargo ships."),
        "program": {"place": "station", "slot_months": 3, "slots": 8, "stay": 6,
                    "payloads": ["core", "hab", "lab", "truss", "cargo", "cargo_l", "crew"],
                    "need": ["core", "hab", "lab", "truss"], "existing": [], "base_power": 0, "stock0": 0,
                    "crew_goal": 48, "research_goal": 36, "ops_month": 10},
        "goals": [
            {"tag": "assembly", "label": "Assemble the station", "weight": 35, "target": 1, "required": True},
            {"tag": "crew", "label": "Crew-months aboard", "weight": 35, "target": 1, "required": True},
            {"tag": "research", "label": "Research in the lab", "weight": 30, "target": 1, "required": False},
        ],
    },
    "lunar_base": {
        "name": "Lunar Base Supply Line",
        "kind": "program",
        "destination": "moon_surface",
        "difficulty": "Advanced",
        "budget": 6200,
        "min_years": 2,
        "pitch": "Keep astronauts living at a Moon base for two years: crews, cargo and power.",
        "story": ("A habitat already stands at the south pole. Now it needs people, food, water and enough "
                  "power to survive the long lunar nights. Every kilogram comes from Earth."),
        "program": {"place": "moon", "slot_months": 3, "slots": 8, "stay": 6,
                    "payloads": ["lcargo", "lcargo_l", "lpower", "lrover", "lcrew_s", "lcrew"],
                    "need": [], "existing": ["base_hab"], "base_power": 12, "stock0": 600,
                    "crew_goal": 36, "research_goal": 18, "ops_month": 14},
        "goals": [
            {"tag": "crew", "label": "Crew-months on the Moon", "weight": 40, "target": 1, "required": True},
            {"tag": "supplied", "label": "Never run out of supplies", "weight": 30, "target": 1, "required": True},
            {"tag": "research", "label": "Explore with a rover", "weight": 30, "target": 1, "required": False},
        ],
    },
    "mars_base": {
        "name": "First Crew to Mars",
        "kind": "program",
        "destination": "mars_surface",
        "difficulty": "Expert",
        "budget": 9500,
        "min_years": 2,
        "pitch": "Send a habitat, power and supplies ahead, then four astronauts to live on Mars.",
        "story": ("Mars windows open every 26 months. Land the base in one window, check it works, and only then "
                  "launch the crew in the next. Their ship is too big for one rocket: build it in orbit."),
        "program": {"place": "mars", "slot_months": 26, "slots": 3, "stay": 16, "windows": True,
                    "payloads": ["mhab", "mpower", "mcargo", "mtransit", "mcrew"],
                    "need": ["mhab", "mpower"], "existing": [], "base_power": 0, "stock0": 0,
                    "crew_goal": 64, "research_goal": 0, "ops_month": 20},
        "goals": [
            {"tag": "predeploy", "label": "Base ready before the crew", "weight": 30, "target": 1, "required": True},
            {"tag": "crew", "label": "Crew-months on Mars", "weight": 40, "target": 1, "required": True},
            {"tag": "supplied", "label": "Never run out of supplies", "weight": 30, "target": 1, "required": True},
        ],
    },
    "mars_climate": {
        "name": "Mars Climate Orbiter II",
        "destination": "mars",
        "difficulty": "Advanced",
        "budget": 650,
        "min_years": 4,
        "pitch": "Study Mars' dust storms, seasons and buried ice from orbit.",
        "story": ("Mars is 1.5 AU from the Sun and up to 2.5 AU from Earth. Solar power drops "
                  "to less than half, and your radio signal gets much weaker. Plan for it."),
        "goals": [
            {"tag": "climate", "label": "Profile the atmosphere", "weight": 35, "target": 30, "required": True},
            {"tag": "imaging", "label": "Watch dust storms", "weight": 20, "target": 25, "required": False},
            {"tag": "composition", "label": "Map surface minerals", "weight": 25, "target": 35, "required": False},
            {"tag": "subsurface", "label": "Find buried ice", "weight": 20, "target": 35, "required": False},
        ],
    },
    "mars_rover": {
        "name": "Mars Ancient Life Rover",
        "kind": "rover",
        "destination": "mars_surface",
        "difficulty": "Expert",
        "budget": 1100,
        "min_years": 2,
        "pitch": "Land a rover in an ancient lake and search the rocks for signs of past life.",
        "story": ("Billions of years ago Mars had rivers and lakes. If life ever started there, its traces "
                  "are locked in the mud of those old lake beds. Drive, drill, and look."),
        "goals": [
            {"tag": "life", "label": "Search for biosignatures", "weight": 45, "target": 35, "required": True},
            {"tag": "composition", "label": "Read the rock layers", "weight": 35, "target": 30, "required": True},
            {"tag": "imaging", "label": "Panoramas of the site", "weight": 20, "target": 15, "required": False},
        ],
    },
    "europa": {
        "name": "Europa Ocean Explorer",
        "destination": "europa",
        "difficulty": "Expert",
        "budget": 2400,
        "min_years": 4,
        "pitch": "Confirm the ocean under Europa's ice and judge if it could host life.",
        "story": ("Jupiter's radiation fries ordinary electronics, sunlight is 27x weaker than at "
                  "Earth and every bit of data crawls back across 5 AU. Flagship-class challenge."),
        "goals": [
            {"tag": "subsurface", "label": "Measure ice shell & ocean", "weight": 35, "target": 40, "required": True},
            {"tag": "fields", "label": "Ocean induction (magnetic)", "weight": 25, "target": 15, "required": True},
            {"tag": "composition", "label": "Analyse surface & plumes", "weight": 25, "target": 35, "required": False},
            {"tag": "imaging", "label": "Image the surface", "weight": 15, "target": 25, "required": False},
        ],
    },
}

# --------------------------------------------------------------------------------------
# Orbits per destination.
#   lv_target     – what the rocket must deliver to (Earth orbits differ by orbit)
#   dv_insert     – m/s the spacecraft must provide itself to reach the orbit
#   dv_per_year   – station-keeping m/s each year
#   eclipse_h     – longest time in shadow per orbit (battery must cover it)
#   eclipse_frac  – fraction of time in shadow (reduces solar energy)
#   science       – multiplier per instrument tag (closer = sharper, etc.)
#   coverage      – 0..1 fraction of the body the orbit can observe
#   earth_view    – fraction of the day Earth/ground can be contacted (deep space)
#   cruise_years  – travel time before science starts
#   max_years_no_prop – orbit decays/destabilises in this time if no propulsion
#   duty_mult     – optional: instruments only observe near the target (flybys)
# --------------------------------------------------------------------------------------
ORBITS = {
    "earth": {
        "leo": {"name": "Low Earth Orbit (400 km)", "lv_target": "leo", "dv_insert": 0, "dv_per_year": 60,
                "eclipse_h": 0.6, "eclipse_frac": 0.38, "coverage": 0.7, "earth_view": 1.0,
                "cruise_years": 0.0, "max_years_no_prop": 1.5,
                "science": {"imaging": 1.2, "thermal": 1.1, "climate": 0.9},
                "learn": ("Close to Earth: sharp images and cheap launch, but thin atmosphere drags "
                          "you down. Without thrusters the orbit decays in about a year or two.")},
        "sso": {"name": "Sun-synchronous (700 km)", "lv_target": "sso", "dv_insert": 0, "dv_per_year": 10,
                "eclipse_h": 0.6, "eclipse_frac": 0.35, "coverage": 1.0, "earth_view": 1.0,
                "cruise_years": 0.0, "max_years_no_prop": 25,
                "science": {"imaging": 1.1, "thermal": 1.2, "climate": 1.0},
                "learn": ("Polar orbit that passes over each place at the same local time every day. "
                          "Same lighting = easy to compare images. The classic Earth-observation choice.")},
        "geo": {"name": "Geostationary (35,786 km)", "lv_target": "gto", "dv_insert": 1500, "dv_per_year": 50,
                "eclipse_h": 1.2, "eclipse_frac": 0.01, "coverage": 0.4, "earth_view": 1.0,
                "cruise_years": 0.0, "max_years_no_prop": 1,
                "science": {"imaging": 0.5, "thermal": 0.8, "climate": 1.3},
                "learn": ("Hovers over one spot, so you watch continuously (great for weather) but "
                          "you are 90x farther away than LEO: images are much coarser.")},
    },
    "moon": {
        "llo": {"name": "Low polar lunar orbit (50 km)", "lv_target": "tli", "dv_insert": 900, "dv_per_year": 150,
                "eclipse_h": 0.8, "eclipse_frac": 0.4, "coverage": 1.0, "earth_view": 0.6,
                "cruise_years": 0.02, "max_years_no_prop": 0.5,
                "science": {"water": 1.3, "topography": 1.3, "imaging": 1.3},
                "learn": ("Skims the surface: best data, but the Moon's lumpy gravity (mascons) pulls the "
                          "orbit down. You need lots of fuel to stay up.")},
        "frozen": {"name": "Elliptical frozen orbit (30x200 km)", "lv_target": "tli", "dv_insert": 700,
                   "dv_per_year": 25, "eclipse_h": 0.9, "eclipse_frac": 0.35, "coverage": 0.9,
                   "earth_view": 0.65, "cruise_years": 0.02, "max_years_no_prop": 4,
                   "science": {"water": 1.1, "topography": 1.0, "imaging": 1.0},
                   "learn": ("A special orbit where gravity perturbations cancel out. Stays stable for years "
                             "with little fuel. Lowest point over the south pole.")},
        "nrho": {"name": "Near-rectilinear halo (Gateway)", "lv_target": "tli", "dv_insert": 450,
                 "dv_per_year": 10, "eclipse_h": 0.2, "eclipse_frac": 0.01, "coverage": 0.5,
                 "earth_view": 1.0, "cruise_years": 0.3, "max_years_no_prop": 1,
                 "science": {"water": 0.5, "topography": 0.4, "imaging": 0.6},
                 "learn": ("Very stretched orbit used by NASA's Gateway. Always sees Earth and almost never "
                           "in shadow, but most of the time it is 70,000 km away from the surface.")},
    },
    "mars": {
        "low": {"name": "Low circular orbit (300 km, aerobraking)", "lv_target": "mars", "dv_insert": 1100,
                "dv_per_year": 15, "eclipse_h": 0.7, "eclipse_frac": 0.36, "coverage": 1.0,
                "earth_view": 0.6, "cruise_years": 1.2, "max_years_no_prop": 10,
                "science": {"climate": 1.1, "imaging": 1.3, "composition": 1.3, "subsurface": 1.3},
                "learn": ("Brake into a big orbit, then dip into the atmosphere hundreds of times to shrink it "
                          "(aerobraking, as MRO did). Saves fuel but costs ~6 extra months.")},
        "elliptical": {"name": "Elliptical orbit (300 x 30,000 km)", "lv_target": "mars", "dv_insert": 900,
                       "dv_per_year": 5, "eclipse_h": 1.5, "eclipse_frac": 0.1, "coverage": 0.8,
                       "earth_view": 0.8, "cruise_years": 0.7, "max_years_no_prop": 20,
                       "science": {"climate": 1.2, "imaging": 0.8, "composition": 0.8, "subsurface": 0.6},
                       "learn": ("Swoops close once per orbit and spends most of the time far away, watching "
                                 "the whole planet (great for weather, worse for detail). Like MAVEN.")},
        "areostationary": {"name": "Areostationary (17,000 km)", "lv_target": "mars", "dv_insert": 1600,
                           "dv_per_year": 30, "eclipse_h": 1.2, "eclipse_frac": 0.02, "coverage": 0.4,
                           "earth_view": 0.95, "cruise_years": 0.7, "max_years_no_prop": 2,
                           "science": {"climate": 1.3, "imaging": 0.5, "composition": 0.3, "subsurface": 0.0},
                           "learn": ("Mars' version of geostationary. Constant weather view and great for "
                                     "relaying data, but radar can't reach the surface from this far.")},
    },
    "venus": {
        "low": {"name": "Low polar orbit (250 km, aerobraking)", "lv_target": "venus", "dv_insert": 1100,
                "dv_per_year": 20, "eclipse_h": 0.8, "eclipse_frac": 0.38, "coverage": 1.0, "earth_view": 0.6,
                "cruise_years": 0.6, "max_years_no_prop": 3,
                "science": {"topography": 1.3, "climate": 0.9, "composition": 1.0, "imaging": 1.1},
                "learn": ("Circles close over the poles so radar maps every strip of the planet (Magellan, "
                          "VERITAS). Aerobraking in the thick air takes months.")},
        "elliptical": {"name": "Polar elliptical orbit (250 x 66,000 km)", "lv_target": "venus", "dv_insert": 900,
                       "dv_per_year": 10, "eclipse_h": 1.0, "eclipse_frac": 0.05, "coverage": 0.7,
                       "earth_view": 0.85, "cruise_years": 0.4, "max_years_no_prop": 15,
                       "science": {"topography": 0.6, "climate": 1.3, "composition": 1.2, "imaging": 0.9},
                       "learn": ("Venus Express' 24-hour orbit: a quick low pass, then a long look at the whole "
                                 "cloud deck. Great for the atmosphere, weak for surface radar.")},
        "equatorial": {"name": "Equatorial cloud-tracking orbit", "lv_target": "venus", "dv_insert": 1000,
                       "dv_per_year": 15, "eclipse_h": 1.5, "eclipse_frac": 0.1, "coverage": 0.5,
                       "earth_view": 0.9, "cruise_years": 0.5, "max_years_no_prop": 8,
                       "science": {"topography": 0.3, "climate": 1.4, "composition": 1.0, "imaging": 1.2},
                       "learn": ("Like Akatsuki: drifts with the super-rotating clouds that circle Venus in four "
                                 "days. Best weather view, almost no surface mapping.")},
    },
    "asteroid": {
        "survey": {"name": "Survey station (7 km, hovering)", "lv_target": "asteroid", "dv_insert": 600, "dv_return": 350,
                   "dv_per_year": 40, "eclipse_h": 0.0, "eclipse_frac": 0.0, "coverage": 0.9, "earth_view": 0.8,
                   "cruise_years": 2.0, "max_years_no_prop": 0.2,
                   "science": {"composition": 1.0, "topography": 0.9, "water": 1.0, "imaging": 0.9},
                   "learn": ("Gravity is too weak to orbit far away, so you fly alongside the asteroid and keep "
                             "nudging back. Never in shadow, but you need thrusters the whole time.")},
        "orbit": {"name": "Terminator orbit (1 km)", "lv_target": "asteroid", "dv_insert": 620, "dv_return": 380,
                  "dv_per_year": 15, "eclipse_h": 0.0, "eclipse_frac": 0.0, "coverage": 1.0, "earth_view": 0.8,
                  "cruise_years": 2.2, "max_years_no_prop": 0.5,
                  "science": {"composition": 1.3, "topography": 1.4, "water": 1.3, "imaging": 1.3},
                  "learn": ("OSIRIS-REx's record: the tiniest orbit ever, riding the line between day and night "
                            "so sunlight pressure doesn't push you away. Sharp data, delicate flying.")},
        "flyby": {"name": "Single fast flyby", "lv_target": "asteroid", "dv_insert": 50,
                  "dv_per_year": 0, "eclipse_h": 0.0, "eclipse_frac": 0.0, "coverage": 0.4, "earth_view": 1.0,
                  "cruise_years": 1.5, "max_years_no_prop": 99, "duty_mult": 0.05,
                  "science": {"composition": 0.6, "topography": 0.5, "water": 0.6, "imaging": 0.8},
                  "learn": ("Cheap and simple: rush past at 5 km/s and take what you can in a few hours. "
                            "Almost no fuel, but very little data.")},
    },
    "moon_surface": {
        "rim": {"name": "Sunlit crater rim", "lv_target": "tli", "dv_insert": 900, "dv_per_year": 0,
                "eclipse_h": 30, "eclipse_frac": 0.15, "coverage": 0.6, "earth_view": 0.5, "cruise_years": 0.02,
                "max_years_no_prop": 99, "landing_risk": 0.04, "cold": 0.3,
                "science": {"water": 0.9, "composition": 1.0, "imaging": 1.0, "interior": 1.0},
                "learn": ("Peaks near the south pole see the Sun ~85% of the time, so shadows last a day or two, "
                          "not two weeks. The ground is sloped and Earth sits low on the horizon.")},
        "mare": {"name": "Flat equatorial plain", "lv_target": "tli", "dv_insert": 900, "dv_per_year": 0,
                 "eclipse_h": 354, "eclipse_frac": 0.5, "coverage": 0.4, "earth_view": 1.0, "cruise_years": 0.02,
                 "max_years_no_prop": 99, "landing_risk": 0.01, "cold": 0.6,
                 "science": {"water": 0.3, "composition": 1.1, "imaging": 1.0, "interior": 1.2},
                 "learn": ("Flat, safe and always facing Earth, like Apollo 11's site. But the night lasts 14 Earth "
                           "days at -170 C: no battery covers that, so you need RTGs or you freeze.")},
        "psr": {"name": "Inside a permanently shadowed crater", "lv_target": "tli", "dv_insert": 900,
                "dv_per_year": 0, "eclipse_h": 0, "eclipse_frac": 1.0, "coverage": 0.4, "earth_view": 0.3,
                "cruise_years": 0.02, "max_years_no_prop": 99, "landing_risk": 0.08, "cold": 0.9,
                "science": {"water": 1.6, "composition": 1.2, "imaging": 0.4, "interior": 1.0},
                "learn": ("Never sees sunlight, which is why the ice survives: the best place to dig. No Sun means "
                          "no solar power at all, only RTGs. Landing in total darkness is risky.")},
    },
    "mars_surface": {
        "plain": {"name": "Flat volcanic plain", "lv_target": "mars", "dv_insert": 0, "dv_per_year": 0,
                  "eclipse_h": 12.5, "eclipse_frac": 0.5, "coverage": 0.3, "earth_view": 0.4, "cruise_years": 0.6,
                  "max_years_no_prop": 99, "landing_risk": 0.02, "cold": 0.3,
                  "science": {"imaging": 0.9, "composition": 0.8, "water": 0.5, "life": 0.4, "interior": 1.2},
                  "learn": ("InSight picked the flattest, most boring place on Mars on purpose: safe to land, "
                            "but there is little to discover.")},
        "delta": {"name": "Ancient river delta in a crater", "lv_target": "mars", "dv_insert": 0, "dv_per_year": 0,
                  "eclipse_h": 12.5, "eclipse_frac": 0.5, "coverage": 0.6, "earth_view": 0.4, "cruise_years": 0.6,
                  "max_years_no_prop": 99, "landing_risk": 0.07, "cold": 0.35,
                  "science": {"imaging": 1.2, "composition": 1.3, "water": 1.0, "life": 1.5},
                  "learn": ("Perseverance's Jezero crater: a dried lake where life could have lived 3.5 billion "
                            "years ago. Cliffs, boulders and dunes make the landing risky.")},
        "polar": {"name": "Northern ice plains", "lv_target": "mars", "dv_insert": 0, "dv_per_year": 0,
                  "eclipse_h": 16, "eclipse_frac": 0.6, "coverage": 0.3, "earth_view": 0.4, "cruise_years": 0.6,
                  "max_years_no_prop": 99, "landing_risk": 0.04, "cold": 0.7,
                  "science": {"water": 1.5, "composition": 0.9, "life": 0.8, "imaging": 0.8},
                  "learn": ("Phoenix dug up water ice here. Long winter nights and a low Sun: solar power is weak, "
                            "and Phoenix froze after five months.")},
    },
    "europa": {
        "flyby": {"name": "Jupiter orbit, ~50 Europa flybys", "lv_target": "jupiter", "dv_insert": 1000,
                  "dv_per_year": 60, "eclipse_h": 3.0, "eclipse_frac": 0.03, "coverage": 0.8,
                  "earth_view": 0.9, "cruise_years": 5.5, "max_years_no_prop": 4, "duty_mult": 0.1,
                  "science": {"subsurface": 1.0, "fields": 1.1, "composition": 1.0, "imaging": 1.0},
                  "learn": ("The Europa Clipper strategy: orbit Jupiter and dive past Europa repeatedly, "
                            "escaping the worst radiation between passes. Your electronics survive longer.")},
        "europa_orbit": {"name": "Low Europa orbit (100 km)", "lv_target": "jupiter", "dv_insert": 2400,
                         "dv_per_year": 100, "eclipse_h": 1.5, "eclipse_frac": 0.4, "coverage": 1.0,
                         "earth_view": 0.5, "cruise_years": 6.5, "max_years_no_prop": 0.3,
                         "science": {"subsurface": 1.5, "fields": 1.4, "composition": 1.3, "imaging": 1.4},
                         "learn": ("Best possible data, but you sit inside Jupiter's radiation belt the whole "
                                   "time and need huge amounts of fuel to get captured.")},
    },
}

# --------------------------------------------------------------------------------------
# Launch vehicles: payload capacity in kg to each target (rounded public figures).
# --------------------------------------------------------------------------------------
LAUNCH_VEHICLES = {
    "electron": {"name": "Electron (Rocket Lab)", "cost": 8,
                 "capacity": {"leo": 300, "sso": 200, "gto": 0, "tli": 35, "mars": 0, "jupiter": 0, "venus": 0, "asteroid": 0},
                 "learn": "Tiny rocket for small satellites. Cheap, but only lifts a few hundred kg."},
    "falcon9": {"name": "Falcon 9 (SpaceX)", "cost": 70,
                "capacity": {"leo": 17500, "sso": 12000, "gto": 5500, "tli": 2500, "mars": 1500, "jupiter": 0, "venus": 1800, "asteroid": 1100},
                "learn": "Reusable workhorse. Great value near Earth, limited for deep space."},
    "vulcan": {"name": "Vulcan Centaur VC6 (ULA)", "cost": 115,
               "capacity": {"leo": 27000, "sso": 20000, "gto": 14000, "tli": 11000, "mars": 5000, "jupiter": 900, "venus": 5500, "asteroid": 4000},
               "learn": "Powerful high-energy upper stage (Centaur). Good for the Moon and Mars."},
    "falcon_heavy": {"name": "Falcon Heavy expendable (SpaceX)", "cost": 180,
                     "capacity": {"leo": 63800, "sso": 45000, "gto": 26700, "tli": 16000, "mars": 16800,
                                  "jupiter": 6500, "venus": 17000, "asteroid": 13000},
                     "learn": "Launched Europa Clipper (6,065 kg) toward Jupiter with gravity assists."},
    "sls": {"name": "SLS Block 1 (NASA)", "cost": 2000,
            "capacity": {"leo": 95000, "sso": 70000, "gto": 40000, "tli": 27000, "mars": 20000, "jupiter": 9000, "venus": 21000, "asteroid": 17000},
            "learn": "Most powerful option and fastest to Jupiter, but extremely expensive."},
}

LV_TARGET_LABEL = {"leo": "LEO", "sso": "SSO", "gto": "GTO", "tli": "trans-lunar", "mars": "Mars transfer",
                   "jupiter": "Jupiter transfer",
                   "venus": "Venus transfer", "asteroid": "asteroid rendezvous"}

# --------------------------------------------------------------------------------------
# Spacecraft subsystems. mass kg, power W (draw), cost M$.
# Bus "power" = avionics and housekeeping only. The model adds heaters (colder far from the Sun,
# bigger bus = more to keep warm, RTG waste heat helps) and scales wheels/engine power by bus size.
# --------------------------------------------------------------------------------------
BUSES = {
    "cubesat": {"name": "12U CubeSat", "mass": 6, "power": 5, "cost": 4, "max_dry": 26, "slots": 2,
                "rad_shield": 0,
                "learn": "Shoebox-sized. Very cheap, but tiny volume, little power and few instruments."},
    "smallsat": {"name": "SmallSat (ESPA-class)", "mass": 70, "power": 40, "cost": 30, "max_dry": 450,
                 "slots": 3, "rad_shield": 0,
                 "learn": "Fridge-sized. Common for focused Earth and lunar missions."},
    "medium": {"name": "Medium bus (MRO-class)", "mass": 320, "power": 120, "cost": 110, "max_dry": 2500,
               "slots": 6, "rad_shield": 0,
               "learn": "Car-sized planetary orbiter. Room for a full instrument suite."},
    "flagship": {"name": "Flagship bus (Clipper-class)", "mass": 900, "power": 180, "cost": 320, "max_dry": 7000,
                 "slots": 9, "rad_shield": 1,
                 "learn": "Huge and expensive. Includes a titanium radiation vault (+1 radiation tolerance)."},
}

SOLAR_ARRAYS = {
    "none": {"name": "No solar array", "mass": 0, "power_1au": 0, "cost": 0,
             "learn": "Only possible if you carry RTGs."},
    "body": {"name": "Body-mounted cells (60 W)", "mass": 1, "power_1au": 60, "cost": 0.5,
             "learn": "Cells glued to the sides. Fine for CubeSats only."},
    "compact": {"name": "Compact deployable array (250 W)", "mass": 4, "power_1au": 250, "cost": 2,
                "learn": "Two small folding wings. The usual choice for SmallSats near Earth."},
    "small": {"name": "Small deployable array (500 W)", "mass": 8, "power_1au": 500, "cost": 4,
              "learn": "Folding panels. Power falls with distance squared from the Sun."},
    "medium": {"name": "Medium array (2 kW)", "mass": 30, "power_1au": 2000, "cost": 12,
               "learn": "Typical for a Moon or Mars orbiter."},
    "large": {"name": "Large array (6 kW)", "mass": 90, "power_1au": 6000, "cost": 28,
              "learn": "Big wings. At Mars you still get ~2.6 kW."},
    "giant": {"name": "Giant arrays (18 kW at 1 AU)", "mass": 400, "power_1au": 18000, "cost": 70,
              "learn": "Europa Clipper-style 30 m wingspan. Only ~650 W left at Jupiter."},
}

RTG = {"name": "MMRTG (plutonium-238)", "mass": 45, "power": 110, "cost": 110, "max": 3, "waste_heat_w": 60,
       "learn": ("Nuclear battery: steady 110 W anywhere, day or night, and its waste heat keeps the spacecraft warm "
                 "(saves ~60 W of heaters). Very expensive and plutonium supply is limited, so max 3.")}

# Survival heaters at the coldest point of the mission (W at Jupiter distance, scaled by 1 - 1/AU^2).
BUS_HEATERS = {"cubesat": 4, "smallsat": 35, "medium": 140, "flagship": 220}
# Wheels and engine valve/line heaters grow with the size of the spacecraft.
BUS_SIZE = {"cubesat": 0.15, "smallsat": 0.5, "medium": 1.0, "flagship": 1.6}
COMMS_STANDBY = 0.15      # receiver + standby share of transmitter power outside ground contacts
INSTRUMENT_STANDBY = 0.10  # electronics/survival heaters while an instrument is not observing

BATTERIES = {
    "b200": {"name": "200 Wh Li-ion", "mass": 2, "wh": 200, "cost": 0.5},
    "b1000": {"name": "1 kWh Li-ion", "mass": 9, "wh": 1000, "cost": 1.5},
    "b3000": {"name": "3 kWh Li-ion", "mass": 26, "wh": 3000, "cost": 4},
    "b8000": {"name": "8 kWh Li-ion", "mass": 70, "wh": 8000, "cost": 9},
}
BATTERY_DOD = 0.6  # usable depth of discharge, protects battery life

COMMS = {
    "uhf": {"name": "UHF/S-band patch antenna", "mass": 2, "power": 12, "cost": 1.5,
            "max_mbps": 2, "mbps_1au": 0.0005,
            "learn": "Tiny antenna. Only useful near Earth."},
    "xlga": {"name": "X-band low-gain antenna", "mass": 6, "power": 35, "cost": 6,
             "max_mbps": 20, "mbps_1au": 0.03,
             "learn": "Wide beam, no pointing needed. Weak signal far away."},
    "xhga": {"name": "X-band high-gain dish (1.5 m)", "mass": 30, "power": 70, "cost": 20,
             "max_mbps": 100, "mbps_1au": 2.0,
             "learn": "Focused beam must be pointed at Earth. Standard deep-space link."},
    "kahga": {"name": "Ka-band high-gain dish (3 m)", "mass": 55, "power": 110, "cost": 40,
              "max_mbps": 300, "mbps_1au": 12.0,
              "learn": "Like MRO's: higher frequency + bigger dish = 6x the data rate. Rain on Earth can disturb it."},
}

# Landing systems (lander/rover) and sample-return capsules. Landing system mass = mass_fixed + frac x landed mass.
EDL = {
    "airbags": {"name": "Parachute + airbags", "use": "land", "mass_fixed": 60, "frac_air": 0.35, "frac_vac": 0.35,
                "cost": 40, "needs_atmosphere": True, "max_landed": 600, "risk_mult": 1.3,
                "learn": "Bounce to a stop inside giant airbags (Pathfinder, Spirit). Light and cheap, but only for "
                         "small landers on a world with air."},
    "retro": {"name": "Retro-rocket descent stage + legs", "use": "land", "mass_fixed": 80, "frac_air": 0.7,
              "frac_vac": 1.1, "cost": 60, "needs_atmosphere": False, "max_landed": 2500, "risk_mult": 1.0,
              "learn": "Engines fire all the way down (Apollo, Chang'e; on Mars with a heat shield first, like Phoenix). "
                       "On an airless world the descent fuel weighs as much as the lander."},
    "hazard": {"name": "Retro descent + hazard-avoidance lidar", "use": "land", "mass_fixed": 110, "frac_air": 0.7,
               "frac_vac": 1.1, "cost": 95, "needs_atmosphere": False, "max_landed": 2500, "risk_mult": 0.45,
               "learn": "A laser scans the ground in the last minute and steers away from boulders (Chang'e 3, "
                        "Perseverance's terrain-relative navigation). Halves the landing risk."},
    "skycrane": {"name": "Heat shield + parachute + sky crane", "use": "land", "mass_fixed": 400, "frac_air": 0.9,
                 "frac_vac": 0.9, "cost": 180, "needs_atmosphere": True, "max_landed": 1200, "risk_mult": 0.5,
                 "learn": "Curiosity and Perseverance: a rocket backpack lowers the rover on cables. Heavy and expensive, "
                          "but sets a car-sized rover down gently and precisely."},
    "capsule_s": {"name": "Small return capsule (~250 g sample)", "use": "return", "mass_fixed": 46, "frac_air": 0,
                  "frac_vac": 0, "cost": 30, "max_landed": 99999, "risk_mult": 1.0, "sample_mult": 1.0,
                  "learn": "Heat shield + parachute, lands in a desert (OSIRIS-REx, Hayabusa2). Simple and light."},
    "capsule_l": {"name": "Large capsule, backup parachute (~1 kg)", "use": "return", "mass_fixed": 90, "frac_air": 0,
                  "frac_vac": 0, "cost": 55, "max_landed": 99999, "risk_mult": 0.3, "sample_mult": 1.4,
                  "learn": "More sample and a spare parachute. Genesis (2004) crashed because its chute never opened."},
}
CAPSULE_RISK = 0.06  # chance a single-chute capsule fails on re-entry (scaled by risk_mult)

GROUND = {
    "uni": {"name": "University ground station", "hours": 1.0, "gain": 0.5, "cost_year": 0.5,
            "max_earth_au": 0.001,
            "learn": "One small dish. Satellite passes overhead a few times a day for minutes."},
    "commercial": {"name": "Commercial network (polar stations)", "hours": 5.0, "gain": 1.0, "cost_year": 3,
                   "max_earth_au": 0.01,
                   "learn": "Many stations worldwide: more passes per day."},
    "dsn34": {"name": "Deep Space Network 34 m", "hours": 8.0, "gain": 1.0, "cost_year": 8,
              "max_earth_au": 99,
              "learn": "NASA's antennas in California, Spain and Australia. Shared with every mission."},
    "relay": {"name": "Mars relay orbiters (UHF via MRO)", "hours": 2.0, "gain": 1.0, "cost_year": 2,
              "max_earth_au": 99, "relay_mbps": 4.0,
              "learn": "Orbiters overhead catch your data twice a sol and forward it to Earth with their big dishes. "
                       "Only exists at Mars."},
    "dsn70": {"name": "Deep Space Network 70 m (priority)", "hours": 10.0, "gain": 4.0, "cost_year": 22,
              "max_earth_au": 99,
              "learn": "The giant dishes collect 4x more signal. Expensive and in high demand."},
}

COMPUTERS = {
    "cubesat": {"name": "CubeSat board computer", "mass": 0.5, "power": 2, "cost": 0.3, "storage_gb": 16,
                "rad": 1, "learn": "Commercial chips. Cheap but radiation can crash or kill them."},
    "radtol": {"name": "Radiation-tolerant computer", "mass": 5, "power": 15, "cost": 4, "storage_gb": 128,
               "rad": 2, "learn": "Hardened parts. Good for the Moon and Mars."},
    "radhard": {"name": "RAD750-class computer", "mass": 11, "power": 25, "cost": 12, "storage_gb": 512,
                "rad": 3, "learn": "The computer on Curiosity and Juno. Slow but nearly unkillable."},
}

ADCS = {
    "magnetorquer": {"name": "Magnetorquers + sun sensors", "mass": 1, "power": 3, "cost": 0.5, "pointing_deg": 5.0,
                     "needs_magnetic": True,
                     "learn": "Pushes against Earth's magnetic field. Useless where there is no field."},
    "wheels": {"name": "Reaction wheels + star tracker", "mass": 25, "power": 40, "cost": 8, "pointing_deg": 0.05,
               "needs_magnetic": False,
               "learn": "Spinning wheels turn the craft; a star camera knows where it points."},
    "precision": {"name": "Precision ADCS (4 wheels, dual trackers, gyros)", "mass": 55, "power": 70, "cost": 20,
                  "pointing_deg": 0.005, "needs_magnetic": False,
                  "learn": "Needed for telescope-grade pointing, e.g. HiRISE-like cameras."},
}

PROPULSION = {
    "none": {"name": "No propulsion", "mass": 0, "isp": 0, "cost": 0, "power": 0,
             "learn": "Lightest, but you cannot change your orbit at all."},
    "coldgas": {"name": "Cold gas thrusters", "mass": 4, "isp": 70, "cost": 1, "power": 5, "max_prop": 15,
                "learn": "Simple compressed gas. Very low efficiency (Isp 70 s)."},
    "mono": {"name": "Hydrazine monopropellant", "mass": 30, "isp": 225, "cost": 8, "power": 20,
             "learn": "Reliable and common. Isp ~225 s."},
    "biprop": {"name": "Bipropellant main engine", "mass": 90, "isp": 320, "cost": 22, "power": 30,
               "learn": "Big engine for orbit capture at other planets. Isp ~320 s."},
}

# --------------------------------------------------------------------------------------
# Instruments. data_mbps while observing, duty = fraction of time observing,
# pointing_deg = required pointing accuracy, tags = which goals it serves.
# --------------------------------------------------------------------------------------
INSTRUMENTS = {
    "wac": {"name": "Wide-angle camera", "mass": 2, "power": 6, "cost": 5, "data_mbps": 4, "duty": 0.3,
            "value": 15, "where": "orbit", "tags": ["imaging"], "pointing_deg": 1.0,
            "learn": "Daily global pictures, like MARCI on MRO. Light and cheap."},
    "hirise": {"name": "High-resolution telescope camera", "mass": 65, "power": 60, "cost": 40, "data_mbps": 120,
               "duty": 0.04, "value": 40, "where": "orbit", "tags": ["imaging"], "pointing_deg": 0.005,
               "learn": "Sees objects the size of a desk from orbit (HiRISE). Produces enormous data volumes."},
    "thermal": {"name": "Thermal infrared imager", "mass": 10, "power": 15, "cost": 10, "data_mbps": 6,
                "duty": 0.3, "value": 25, "tags": ["thermal", "imaging"], "pointing_deg": 0.5,
                "learn": "Measures heat. Spots fires, warm vents and day/night temperature changes."},
    "irspec": {"name": "Imaging IR spectrometer", "mass": 33, "power": 45, "cost": 30, "data_mbps": 30,
               "duty": 0.1, "value": 35, "tags": ["composition", "climate"], "pointing_deg": 0.05,
               "learn": "Splits light into hundreds of colours to identify minerals and gases (CRISM, MISE)."},
    "neutron": {"name": "Neutron spectrometer", "mass": 14, "power": 8, "cost": 8, "data_mbps": 0.01, "duty": 1.0,
                "value": 30, "tags": ["water"], "pointing_deg": 10,
                "learn": "Cosmic rays knock neutrons out of the ground; hydrogen (water) absorbs them. Sees ice."},
    "lamp": {"name": "UV spectrograph (LAMP-style)", "mass": 6, "power": 5, "cost": 9, "data_mbps": 0.2, "duty": 0.5,
             "value": 20, "tags": ["water", "composition"], "pointing_deg": 0.5,
             "learn": "Uses faint starlight to see frost inside craters that never get sunlight."},
    "lidar": {"name": "Laser altimeter", "mass": 20, "power": 35, "cost": 15, "data_mbps": 0.1, "duty": 1.0,
              "value": 25, "where": "orbit", "tags": ["topography"], "pointing_deg": 0.05,
              "learn": "Times laser pulses to the ground to build 3D height maps (LOLA, MOLA)."},
    "radar": {"name": "Ice-penetrating radar", "mass": 50, "power": 110, "cost": 45, "data_mbps": 40,
              "duty": 0.05, "value": 40, "where": "orbit", "tags": ["subsurface", "water"], "pointing_deg": 1.0,
              "learn": "Radio waves pass through ice and bounce off layers below (SHARAD, REASON)."},
    "sar": {"name": "Synthetic aperture radar", "mass": 60, "power": 180, "cost": 50, "data_mbps": 20,
            "duty": 0.05, "value": 40, "where": "orbit", "tags": ["topography", "imaging"], "pointing_deg": 0.5,
            "learn": "Side-looking radar that builds images through clouds and darkness (Magellan, VERITAS)."},
    "mag": {"name": "Magnetometer on boom", "mass": 5, "power": 4, "cost": 4, "data_mbps": 0.005, "duty": 1.0,
            "value": 15, "tags": ["fields"], "pointing_deg": 10,
            "learn": "A salty ocean changes Jupiter's magnetic field around Europa. That's how Galileo found it."},
    "massspec": {"name": "Mass spectrometer", "mass": 25, "power": 60, "cost": 25, "data_mbps": 0.5, "duty": 0.1,
                 "value": 30, "tags": ["composition"], "pointing_deg": 5,
                 "learn": "Sniffs gas and dust molecules directly. Could taste plumes from Europa's ocean."},
    "sounder": {"name": "Atmospheric sounder", "mass": 9, "power": 12, "cost": 12, "data_mbps": 0.05, "duty": 1.0,
                "value": 25, "tags": ["climate"], "pointing_deg": 0.5,
                "learn": "Measures temperature, dust and water vapour at every altitude (Mars Climate Sounder)."},
    # Surface-only instruments ("where": "surface") need to touch the ground; "orbit" ones only work from orbit.
    "pancam": {"name": "Stereo mast cameras", "mass": 4, "power": 10, "cost": 8, "data_mbps": 2, "duty": 0.1,
               "value": 20, "tags": ["imaging"], "pointing_deg": 10, "where": "surface",
               "learn": "Two cameras on a mast, like human eyes, take 3D panoramas to plan every drive."},
    "drill": {"name": "Drill + sample oven (SAM-style)", "mass": 40, "power": 60, "cost": 45, "data_mbps": 0.5,
              "duty": 0.05, "value": 40, "tags": ["water", "composition", "life"], "pointing_deg": 10,
              "where": "surface",
              "learn": "Drills a few cm into rock, bakes the powder and sniffs the gases: ice, minerals, organics."},
    "raman": {"name": "Arm-mounted rock analyser (laser + X-ray)", "mass": 12, "power": 25, "cost": 30,
              "data_mbps": 1, "duty": 0.1, "value": 35, "tags": ["composition", "life"], "pointing_deg": 10,
              "where": "surface",
              "learn": "Zaps rocks with a laser and X-rays to map minerals and organic molecules (SHERLOC, PIXL)."},
    "seismo": {"name": "Seismometer", "mass": 30, "power": 8, "cost": 20, "data_mbps": 0.05, "duty": 1.0,
               "value": 20, "tags": ["interior"], "pointing_deg": 10, "where": "surface",
               "learn": "Feels quakes and meteorite impacts to reveal what is deep inside (Apollo, InSight)."},
    "tagsam": {"name": "Touch-and-go sampler arm", "mass": 40, "power": 30, "cost": 30, "data_mbps": 0.1,
               "duty": 0.01, "value": 35, "tags": ["sample"], "pointing_deg": 0.5,
               "learn": "Taps the surface for five seconds and blows gas to push dust into a collector (OSIRIS-REx)."},
    "particles": {"name": "Plasma & particle detector", "mass": 4, "power": 5, "cost": 3, "data_mbps": 0.02,
                  "duty": 1.0, "value": 10, "tags": ["fields"], "pointing_deg": 10,
                  "learn": "Counts charged particles. Helps interpret the magnetometer signal."},
}

DIFFICULTY = {
    "easy": {"name": "Cadet", "budget_mult": 1.3, "event_mult": 0.5, "margin_req": 0.05},
    "normal": {"name": "Engineer", "budget_mult": 1.0, "event_mult": 1.0, "margin_req": 0.10},
    "hard": {"name": "Flight Director", "budget_mult": 0.85, "event_mult": 1.6, "margin_req": 0.15},
}

ROLES = {
    "manager": {"name": "Mission Manager", "icon": "🧭",
                "owns": ["difficulty", "launch_vehicle", "years", "window", "partners"],
                "goal": "Keep at least 10% of the budget in reserve.",
                "learn": "Owns money and schedule. Says 'no' a lot."},
    "systems": {"name": "Systems Engineer", "icon": "🔧",
                "owns": ["bus", "solar", "rtg", "battery", "adcs", "propulsion", "edl", "manifest"],
                "goal": "Keep mass margin ≥ 15% and power margin ≥ 20%.",
                "learn": "Makes everything fit, fly and stay powered."},
    "science": {"name": "Science Lead", "icon": "🔭",
                "owns": ["orbit", "instruments"],
                "goal": "Reach a science score of at least 70.",
                "learn": "Wants every instrument and the closest possible orbit."},
    "comms": {"name": "Comms & Operations", "icon": "📡",
              "owns": ["comms", "ground", "computer"],
              "goal": "Return at least 80% of the data collected.",
              "learn": "Gets the data home. Every bit not downlinked is lost science."},
}

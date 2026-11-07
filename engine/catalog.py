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
    "europa": {"name": "Europa (Jupiter)", "sun_au": 5.2, "earth_au": 5.0, "radiation": 4,
               "magnetic": False, "lv_target": "jupiter"},
}

RADIATION_LABEL = {1: "Low", 2: "Moderate", 3: "High", 4: "Extreme"}

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
    "mars_climate": {
        "name": "Mars Climate Orbiter II",
        "destination": "mars",
        "difficulty": "Intermediate",
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
                 "capacity": {"leo": 300, "sso": 200, "gto": 0, "tli": 35, "mars": 0, "jupiter": 0},
                 "learn": "Tiny rocket for small satellites. Cheap, but only lifts a few hundred kg."},
    "falcon9": {"name": "Falcon 9 (SpaceX)", "cost": 70,
                "capacity": {"leo": 17500, "sso": 12000, "gto": 5500, "tli": 2500, "mars": 1500, "jupiter": 0},
                "learn": "Reusable workhorse. Great value near Earth, limited for deep space."},
    "vulcan": {"name": "Vulcan Centaur VC6 (ULA)", "cost": 115,
               "capacity": {"leo": 27000, "sso": 20000, "gto": 14000, "tli": 11000, "mars": 5000, "jupiter": 900},
               "learn": "Powerful high-energy upper stage (Centaur). Good for the Moon and Mars."},
    "falcon_heavy": {"name": "Falcon Heavy expendable (SpaceX)", "cost": 180,
                     "capacity": {"leo": 63800, "sso": 45000, "gto": 26700, "tli": 16000, "mars": 16800,
                                  "jupiter": 6500},
                     "learn": "Launched Europa Clipper (6,065 kg) toward Jupiter with gravity assists."},
    "sls": {"name": "SLS Block 1 (NASA)", "cost": 2000,
            "capacity": {"leo": 95000, "sso": 70000, "gto": 40000, "tli": 27000, "mars": 20000, "jupiter": 9000},
            "learn": "Most powerful option and fastest to Jupiter, but extremely expensive."},
}

LV_TARGET_LABEL = {"leo": "LEO", "sso": "SSO", "gto": "GTO", "tli": "trans-lunar", "mars": "Mars transfer",
                   "jupiter": "Jupiter transfer"}

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
            "value": 15, "tags": ["imaging"], "pointing_deg": 1.0,
            "learn": "Daily global pictures, like MARCI on MRO. Light and cheap."},
    "hirise": {"name": "High-resolution telescope camera", "mass": 65, "power": 60, "cost": 40, "data_mbps": 120,
               "duty": 0.04, "value": 40, "tags": ["imaging"], "pointing_deg": 0.005,
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
              "value": 25, "tags": ["topography"], "pointing_deg": 0.05,
              "learn": "Times laser pulses to the ground to build 3D height maps (LOLA, MOLA)."},
    "radar": {"name": "Ice-penetrating radar", "mass": 50, "power": 110, "cost": 45, "data_mbps": 40,
              "duty": 0.05, "value": 40, "tags": ["subsurface", "water"], "pointing_deg": 1.0,
              "learn": "Radio waves pass through ice and bounce off layers below (SHARAD, REASON)."},
    "mag": {"name": "Magnetometer on boom", "mass": 5, "power": 4, "cost": 4, "data_mbps": 0.005, "duty": 1.0,
            "value": 15, "tags": ["fields"], "pointing_deg": 10,
            "learn": "A salty ocean changes Jupiter's magnetic field around Europa. That's how Galileo found it."},
    "massspec": {"name": "Mass spectrometer", "mass": 25, "power": 60, "cost": 25, "data_mbps": 0.5, "duty": 0.1,
                 "value": 30, "tags": ["composition"], "pointing_deg": 5,
                 "learn": "Sniffs gas and dust molecules directly. Could taste plumes from Europa's ocean."},
    "sounder": {"name": "Atmospheric sounder", "mass": 9, "power": 12, "cost": 12, "data_mbps": 0.05, "duty": 1.0,
                "value": 25, "tags": ["climate"], "pointing_deg": 0.5,
                "learn": "Measures temperature, dust and water vapour at every altitude (Mars Climate Sounder)."},
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
                "owns": ["difficulty", "launch_vehicle", "years"],
                "goal": "Keep at least 10% of the budget in reserve.",
                "learn": "Owns money and schedule. Says 'no' a lot."},
    "systems": {"name": "Systems Engineer", "icon": "🔧",
                "owns": ["bus", "solar", "rtg", "battery", "adcs", "propulsion"],
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

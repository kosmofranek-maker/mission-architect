# NASA Space Apps 2026 — Space Mission Design Game: progress

Deadline: weekend of 2026-11-14/15. Solo dev (Franek), Python.

## Stack decision (changed 2026-11-07)
- Python engine (pure, tested) + **standalone web app** in a *Papers, Please* style: pixel art, desk, documents, stamps.
  No emoji anywhere (Franek's rule): icons are pixel sprites drawn in `web/sprites.js`.
- `server.py` (stdlib only) serves `web/` + JSON API on port 8600. Streamlit UI moved to `legacy/` (not used).
- UI text in English; talk to Franek in Polish.

## Done
- `engine/catalog.py` — all content: 4 scenarios (Wildfire Watch/Earth, Lunar Ice/Moon, Mars Climate/Mars, Europa Ocean/Jupiter), orbits per destination, 5 launch vehicles (capacity per target), buses, solar arrays, RTG, batteries, comms, ground stations, computers, ADCS, propulsion, 12 instruments, difficulty levels, 4 team roles.

- `engine/model.py` — evaluate(design): mass (rocket eq.), power (EOL, eclipse/battery), data (water-filling, recorder), radiation, cost, science, issues with "why". Flyby orbits use `duty_mult`. `default_design(scenario)` = playable presets (all 4 launchable).
- `engine/simulate.py` — monthly seeded sim (launch failure, radiation, solar storm, safe mode, wheels, micrometeoroid, budget cut, discovery, battery fade) + `monte_carlo`.
- `engine/scoring.py` — 950 pts (science 500, budget 150, margins 100, reliability 100, team 100), grades S/A/B/C/F, analysis.
- `engine/rooms.py` (multiplayer RoomStore: roles own fields, changes reset approvals, chat) + `engine/leaderboard.py` (data/leaderboard.json).
- `server.py` API: /api/catalog, /evaluate, /risk, /launch, /leaderboard, /room/create, /room/CODE[/join|set|approve|say].
- `web/`: title -> mission files (career unlocks / free + sandbox, difficulty) -> desk (client portrait + speech,
  mission request with goal bars + years, parts binder with 9 tabs, blueprint canvas, review sheet meters + issues,
  risk check, approve stamp) -> launch animation + teletype -> newspaper "The Orbital Times" with grade -> hall of fame.
  Team room lobby (claim roles), locked tabs for other roles, 4 approval stamps, 1.5 s polling, shared launch.
- Demo links: `/#play=<scenario>`, `/#launch=<scenario>`, `/#news=<scenario>`; `/#selftest` = in-browser click test (15 checks, passes).
- Tests: 23 pytest (engine, rooms, leaderboard, HTTP API).

- Blank start (Franek, 2026-11-07): every mission and team room starts with an EMPTY spacecraft (`blank_design`); unchosen
  parts are `None` -> "Choose X" blockers (area "missing"), meters show "needs ...", tabs show a red dot until filled.
  `default_design` presets remain only for tests and demo links (`#news=`, `#launch=`).
- Tutorial: Flight Director Rosa Quint, 15 steps (3 info + 9 "pick a part" tasks that auto-advance + review + risk + launch),
  spotlight on the active desk area. Title button "Tutorial", auto-starts on career Day 1 until done, "Help" button
  in the top bar replays it for the current mission. `#tutorial=N` opens step N.
- Fixed: team-room race where a stale evaluation/poll overwrote newer room state.
- Self-test `/#selftest`: 19 checks pass (tutorial, blank build-up, reject stamp, launch, newspaper, team room approvals).

- Juice (Franek, 2026-11-07): rubber-stamp animation (pixel stamp drops on the blueprint, ink mark with random tilt,
  desk shake, thud) for APPROVED and REJECTED; spinning-newspaper intro, grade stamp slams, score bars fill, score counts up
  (click the paper to skip); synthesized WebAudio SFX (thud, whoosh, teletype tick, launch rumble, paper), toggle in menu.
- Title: Tutorial button moved below the game modes. In-game Menu: Engineer's handbook (hints), Replay tutorial, Sound.
- Engineer's handbook: 10 stages with general hint, LIVE mission-specific tips computed from the current design
  (rockets that fit, best orbit for the goals, instruments per goal, buses that fit, array/battery sizing, pointing needed,
  fuel per engine, downlink per antenna, radiation level), current choices and issues of that stage, button to open the tab.
- Demo links added: `#hints=<scenario>`, `#stamp=<scenario>`. Self-test: 25 checks pass.

- Guidance by difficulty (Franek, 2026-11-07): Cadet = advisor suggests the next part (NEXT STEP box + "Show me",
  SUGGESTED card badge, client speech, handbook tips; can suggest RTGs); Engineer = exact problems with "why", no
  suggestions, handbook without tips; Flight Director = only "incomplete / does not meet requirements / concerns",
  meters uncoloured, no hints. Tutorial always runs at Cadet. Self-test proves the Cadet advisor alone builds a
  flight-ready design for all 4 missions.
- Mobile layout (`html.mobile`, set by fit() when width < 820 or narrow portrait): single scrolling column, sticky top bar
  with mini status strip, fixed bottom action bar, full-screen modals, tutorial box docked at the bottom.
  Self-test passes at phone size too (Chrome's minimum window is ~500 px, so screenshots below that are cropped).
- More SFX: button click, card select/deselect, tab page flip, error buzz, flight-ready chime, goal-met ding,
  countdown beeps, launch-failure boom, tutorial pop, suggestion jingle.
- Auto-deploy: push to main -> GitHub Actions tests -> Hetzner (see README).

- Power model tied to the rest of the design (2026-11-07): heaters = BUS_HEATERS[bus] * (1 - 1/AU^2) minus 60 W waste
  heat per RTG; wheels and engine power scale with bus size; transmitter at full power only during ground contact
  (15% standby); instruments draw 10% when not observing; bus "power" is avionics only. New Compact array (250 W).
  Power margin sweet spot now 20-100%. Power tab shows a live power budget. Desk sounds are physical (noise-based).
  Demo link `#design=<scenario>:<tab>`.

- Career grows to 8 days (2026-11-07): + Hurricane Sentinel (GEO gets a 1.5x scenario `orbit_bonus`), Artemis Landing
  Scout, Asteroid Prospector (new destination, survey/terminator/flyby orbits), Venus Cloud Diver (new destination;
  `blind` instruments: lidar, HiRISE, thermal can't see through clouds). New Synthetic aperture radar instrument.
  Launch vehicles got Venus and asteroid capacities. Presets for all 8 launchable; Cadet advisor builds all 8.
- Each client has an opening letter (typed out, slides in) and a press quote in The Orbital Times depending on outcome.
  Speech bubble types letter by letter with soft typewriter keys.
- Tabs are now labs along a corridor (web/labs.js): pixel doors with a red/green lamp for missing parts, animated
  lab scene banner per room, walking transition + door/footsteps sound. Demo links `#letter=<sc>`, `#career=all`.

- Title + launch film (2026-11-07, web/scenes.js): animated title (parallax stars, rotating Earth limb with clouds,
  satellite pass, rockets climbing from the horizon, meteors, mission patch). Launch: dawn pad with tower and lights,
  countdown, rocket drawn per launch vehicle (Electron .. SLS with boosters), steam clouds + camera shake, climb into
  black sky, booster separation, fairing separation + arrays unfolding over Earth, transfer arc to the destination,
  orbit with the craft passing behind the planet. Demo `#launch=<sc>:<seconds>`.
- Doors removed again (plain tabs, lab scenes stay). Cadet: no NEXT STEP box or highlighted cards; hints only in the
  client's speech bubble, shown from the first moment.

- Surface + sample-return missions (2026-11-07): scenario `kind` (orbiter/lander/rover/sample_return). New part `edl`
  (airbags, retro stage, hazard-avoidance retro, sky crane; small/large return capsule) with landing risk, landed-mass
  limits and "needs air" blockers. Destinations moon_surface / mars_surface: the orbit choice becomes a landing site
  (night length, sunlight, landing risk, cold). Mars relay orbiters as a ground option. Surface-only instruments
  (pancam, drill, raman, seismometer) and orbit-only ones. Sample return adds dv for the trip home and a capsule
  re-entry roll. Missions: Lunar Polar Lander, Asteroid Sample Return, Mars Ancient Life Rover (career = 11 days).
  Launch film gets a descent (parachute / sky crane / airbags / engines), touchdown and a driving rover.

- Design drawer + comparison (2026-11-07): save designs (menu / Compare button on the desk), every flown design is
  filed automatically with grade and score. Side-by-side table: cost, reserve, mass, margins, data, science, blockers,
  success odds and typical science from 200 simulated flights, last flight, and every part (differences highlighted),
  plus a plain-language verdict ("B is 40 M$ cheaper; A plans 8 more science points: you are trading money for
  science"). Load either design back onto the desk. Demo `#compare=<scenario>`.
- Flight dashboard under the launch film: power margin, battery health, fuel, data returned, budget reserve and
  science as LED gauges month by month (flash when they drop), latest event line and a live chart with event marks.
  Simulation timeline now carries fuel_pct and data_gb.

- Planning + programs + agency career (2026-11-07):
  - Launch tower arms and hold-down clamps sized to each rocket (Electron is held too).
  - Launch windows: 3 dates per mission (Earth/Moon any month; Mars 26, Venus 19, Jupiter 13, asteroid 14 months apart).
    Build time sets cost (rush overtime / standing army), risk (launch failure + glitches) and slip chance; window
    energy changes rocket capacity and cruise time. A slip = waiting a whole synodic period and paying the team.
  - International partners (ESA, JAXA, CSA, ISRO): pay part of the hardware, bring an instrument (takes a slot) or
    tracking antennas, add delay risk; max 2. In programs they build and launch a module/lander on their own date.
  - Programs (engine/program.py, web/program.js): manifest of flights in slots (quarters or Mars windows); Orbital
    Outpost (assemble a station, crew rotations, cargo), Lunar Base Supply Line (existing habitat, 14-day nights need
    fission power, 2- or 4-seat landers), First Crew to Mars (pre-deploy habitat + power one window, crew next window
    with 2 transit segments assembled in orbit). Month-by-month supplies (75 kg/crew/month), bunks and power; crew-rated
    rockets; sim with launch aborts, crashed landers, berthing damage (CSA arm helps), late partners, evacuations.
  - Career = agency HQ (web/career.js): calendar from Jan 2027, agency funds (annual budget by reputation, contract
    rewards, half of unspent money), reputation 0-100, contracts unlocked by prerequisites + reputation (14), research
    tree (21 technologies) that locks parts in career only, partner trust (0-3, halves delay risk at 2), 9 milestone
    medals, agency log. Demo `#hq=wildfire`.

- Reuse, invitations, ISS, own spaceship (2026-11-07): Falcon 9 and new New Glenn are reusable: boosters land
  (92%), a flight-proven booster makes a launch 40% cheaper (programs re-fly automatically; career keeps a fleet of up
  to 3 per rocket). From reputation 40 partner agencies invite you to joint missions (they pay 20-35%, bonus, trust).
  New missions: ISS Supply and Crew Rotation (the ISS already exists), Design a Crew Shuttle (kind "vehicle",
  engine/vehicle.py: hull shape, seats, heat shield, escape system, landing, crew-rated rocket; safety as 1 loss in N
  flights vs NASA's 1-in-270, cost per seat, reuse), Exoplanet Hunter at Sun-Earth L2 (halo / Kepler-like drift /
  TESS-like orbits, photometer, cold IR telescope, coronagraph). 17 missions. Station drawing redone (modules in one
  line, truss across the core, wings at truss ends, auto-scaled), real ISS look.

## Next
- Franek to play it and give visual feedback (the Reddit reference post could not be fetched; style is assumed from Papers, Please).
- Sound effects (stamp, teletype, launch) via WebAudio, optional.
- Balance pass: Wildfire/Lunar defaults reach A easily.
- Test multiplayer with 2 real browsers.
- git commit, deploy (Hetzner Docker or Render), demo video + screenshots for the submission.

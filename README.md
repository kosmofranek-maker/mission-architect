# Mission Architect

A pixel-art space mission design game for the **NASA Space Apps Challenge 2026**, inspired by the desk-and-paperwork
feel of *Papers, Please*.

You sit at the Mission Review Board. A client's letter lands on your desk: watch wildfires and hurricanes,
find lunar ice and safe landing sites, map an asteroid, see through Venus' clouds, study Mars' climate or confirm the
ocean under Europa's ice. You pick a rocket, an orbit, a spacecraft
bus, power, pointing, engine, radio, computer and instruments by walking between nine labs along one corridor
(launch office, flight dynamics, integration hangar, power lab and so on). The review sheet shows mass, power,
eclipse battery, data return, cost and science in real time, and explains every problem in plain language. Stamp the
design, watch the launch and the mission unfold month by month on the teletype, then read the verdict in
*The Orbital Times*.

## Features
- 17 missions: orbiters, a space telescope at L2, a lunar lander, a Mars rover, an asteroid sample return, your own
  crew spaceship design, and crewed programs built from many launches (ISS supply, own station, Moon base, crew to Mars), 3 difficulty levels, career as a space agency
  (calendar, funds, reputation, research tree, milestones), free design + sandbox. Each client writes an opening letter and is quoted in the newspaper afterwards.
- Real trade-offs: rocket equation, inverse-square solar power and radio signal, eclipses and batteries, pointing
  accuracy, data downlink and on-board storage, radiation tolerance, budget reserves.
- Seeded month-by-month simulation: launch failure, solar storms, safe modes, reaction-wheel failures,
  micrometeoroids, budget cuts and surprise discoveries. Same seed + same design = same story.
- Launch windows and build schedule: an early date means a rushed build, a late one means paying the team to wait.
- Risk check: 200 simulated missions give success odds and a science range.
- Design drawer: save designs and compare two side by side (cost, margins, science, success odds, parts).
- Live flight dashboard: power, battery, fuel, data, budget and science month by month during the flight.
- Score out of 950 with grade S to F and a post-mission analysis of *why* it went that way.
- Team room: up to 4 players (Mission Manager, Systems Engineer, Science Lead, Comms & Ops) edit one design live.
  Each role edits only its own parts; every change cancels approvals; launch needs all four stamps.
- Hall of fame per mission, design codes to share, all art drawn in code (no image files).

**Play online:** https://mission-architect.178-105-110-45.sslip.io

## Run
```
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt   # only pytest is needed
.venv/bin/python server.py          # http://localhost:8600
.venv/bin/python -m pytest -q       # engine + API tests
```
The server uses only the Python standard library. Open `http://localhost:8600/#selftest` to run an in-browser
click-through test of the UI (result appears in the tab title).

Docker: `docker build -t mission-architect . && docker run -p 8600:8600 mission-architect`

Production runs behind Caddy: `docker-compose.yml` joins the proxy's network, `deploy/Caddyfile.snippet` is the
site block, `deploy/deploy.sh` redeploys by hand. Every push to `main` runs the tests and auto-deploys via GitHub Actions
(`.github/workflows/deploy.yml`; one-time server setup in `deploy/install-autodeploy.sh`).

## Code map
- `engine/catalog.py` all game content (parts, orbits, missions), with the learning text.
- `engine/model.py` static design evaluation (mass, power, data, radiation, cost, science, issues).
- `engine/simulate.py` seeded mission simulation + Monte Carlo risk check.
- `engine/scoring.py` score, grade, analysis. `engine/rooms.py` multiplayer state. `engine/leaderboard.py` hall of fame.
- `engine/nasa.py` everything taken from NASA's challenge resources (see below). `web/nasa.js` shows it.
- `server.py` HTTP server + JSON API. `web/` the game client (HTML/CSS/JS, pixel sprites in `sprites.js`).

## NASA data and resources used
The challenge's Resources tab lists nine items. The game uses every one of them, and the in-game **NASA library**
(title screen and menu) shows the same list with links.

| Resource | What the game does with it |
|---|---|
| Design and Develop Science Missions (NASA S3VI) | The review sheet and the mission report are sorted into the four mission segments: launch, space, ground, user. The six-step process (need and goals, concept, requirements, design, build and verify, implement) is the strip on the mission process sheet. |
| Concept Maturity Levels (JPL, Wessen et al. 2013) | The CML ladder on the review sheet. A design climbs from CML 1 to CML 4, and CML 3 is only reached by comparing at least two designs. The approval stamp prints the level. |
| Mission Design Lab (NASA Goddard) | Team roles as discipline engineers, a master equipment list in the mission report, and "tall poles" (the biggest drivers of mass and cost) in the handbook. |
| CubeSat 101 (NASA CSLI) | The build and test lab: minimal testing, standard testing or "test like you fly", and an optional second flight unit. The 10% budget reserve rule in the score. Margin, schedule and record-keeping advice, quoted with its source. |
| A Learning Game About Telescopes (Webb) | After each flight the newspaper and the mission report show the real NASA mission closest to yours (17 missions, 19 real ones) with mass, cost, power and rocket side by side. |
| GMAT, NASA Mission Viz, the 2023 VR challenge | Linked from the library as the next step after the game's simplified orbits, windows and launch film. |
| CSA Digital Games and Activities | Linked from the library as a next stop for younger players. |

Demo links: `/#process=<mission>`, `/#advice=<mission>`, `/#report=<mission>`, `/#library`, `/#design=<mission>:build`.
A mission report can be printed or saved as a PDF, and "Copy link to this design" gives a `/#code=...` link that opens it.

## Sources and disclaimer
Numbers are simplified and rounded from public information about real missions and hardware (MRO, LRO, MAVEN, Juno,
Europa Clipper, CubeSats, Electron, Falcon 9/Heavy, Vulcan, SLS, the Deep Space Network). They are meant to teach
trade-offs, not to be an engineering tool. Characters and organisations in the game are fictional.
Real-mission figures in the comparison are rounded public numbers. This is a student project for the NASA Space Apps
Challenge; it is not made or endorsed by NASA.

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
- 14 missions: orbiters, a lunar lander, a Mars rover, an asteroid sample return and three crewed programs built from
  many launches (space station, Moon base supply line, first crew to Mars), 3 difficulty levels, career as a space agency
  (calendar, funds, reputation, research tree, partner trust, milestones), free design + sandbox. Each client writes an opening letter and is quoted in the newspaper afterwards.
- Real trade-offs: rocket equation, inverse-square solar power and radio signal, eclipses and batteries, pointing
  accuracy, data downlink and on-board storage, radiation tolerance, budget reserves.
- Seeded month-by-month simulation: launch failure, solar storms, safe modes, reaction-wheel failures,
  micrometeoroids, budget cuts and surprise discoveries. Same seed + same design = same story.
- Launch windows and build schedule; international partners (ESA, JAXA, CSA, ISRO) share cost but can be late.
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
- `server.py` HTTP server + JSON API. `web/` the game client (HTML/CSS/JS, pixel sprites in `sprites.js`).

## Sources and disclaimer
Numbers are simplified and rounded from public information about real missions and hardware (MRO, LRO, MAVEN, Juno,
Europa Clipper, CubeSats, Electron, Falcon 9/Heavy, Vulcan, SLS, the Deep Space Network). They are meant to teach
trade-offs, not to be an engineering tool. Characters and organisations in the game are fictional.

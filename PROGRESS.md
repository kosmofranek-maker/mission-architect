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

## Next
- Franek to play it and give visual feedback (the Reddit reference post could not be fetched; style is assumed from Papers, Please).
- Sound effects (stamp, teletype, launch) via WebAudio, optional.
- Balance pass: Wildfire/Lunar defaults reach A easily.
- Test multiplayer with 2 real browsers.
- git commit, deploy (Hetzner Docker or Render), demo video + screenshots for the submission.

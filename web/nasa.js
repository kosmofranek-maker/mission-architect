// What the game takes from NASA's resources for this challenge (engine/nasa.py): the CML ladder, the four mission
// segments, the six-step process, the advice, the master equipment list, real missions and the library.
"use strict";

// How many different designs of this mission the player has on the table: the current one plus saved alternatives.
function tradesNow() {
  if (!S.design) return 0;
  const key = (d) => JSON.stringify(PICKS.map((f) => d[f] ?? null));
  const cur = key(S.design);
  return 1 + new Set(drawer.of(S.design.scenario).map((x) => key(x.design)).filter((k) => k !== cur)).size;
}
const PICKS = ["orbit", "launch_vehicle", "bus", "solar", "rtg", "battery", "comms", "ground", "computer", "adcs", "propulsion",
  "edl", "instruments", "years", "window", "manifest", "testing", "spare", "priority", "processing", "shape", "seats", "heatshield", "abort", "landing"];

// The server's CML with the local trade count applied (team rooms get their evaluation without it).
function cmlNow(ev = S.ev) {
  if (!ev || !ev.nasa) return null;
  const steps = ev.nasa.cml.steps.map((s) => ({ ...s }));
  steps[2].done = tradesNow() >= 2;
  let level = 0;
  for (const s of steps) { if (!s.done) break; level++; }
  return { ...ev.nasa.cml, steps, level, skipped_trades: steps[3].done && !steps[2].done };
}
const cmlName = (c) => (c.level ? `CML ${c.level} · ${c.steps[c.level - 1].name}` : "CML 0 · blank page");

function renderCml() {
  const el = $("#cmlStrip"), c = cmlNow();
  if (!el || !c) return;
  el.innerHTML = `<span class="cml-t">CML</span>${c.steps.map((s) =>
    `<i class="${s.done ? "on" : ""} ${s.level === c.level + 1 ? "next" : ""}" title="CML ${s.level}: ${esc(s.name)}">${s.level}</i>`).join("")}
    <span class="cml-n">${esc(c.level ? c.steps[c.level - 1].name : "blank page")}</span><span class="cml-q">?</span>`;
  el.onclick = () => { SFX.page(); openProcess(); };
  if (renderCml._lvl != null && c.level > renderCml._lvl && S.introShown) { SFX.ding(); toast(`${icon("check")} Concept maturity: ${esc(cmlName(c))}`); }
  renderCml._lvl = c.level;
}

// A small heading on the review sheet for each of the four mission segments.
function segHead(key) {
  const s = S.ev && S.ev.nasa && S.ev.nasa.segments.find((x) => x.key === key);
  if (!s) return "";
  return `<div class="seg-head ${level() === "hard" ? "" : s.state}" data-seg="${key}" title="${esc(s.what)}"><span>${esc(s.name)}</span><i></i></div>`;
}

// Where the player is in NASA's six-step process.
function processStep() {
  const d = S.design, ev = S.ev;
  if (!ev) return 0;
  const missing = ev.issues.filter((i) => i.area === "missing").length;
  const started = PICKS.some((f) => !["years", "testing", "spare", "processing"].includes(f) && (Array.isArray(d[f]) ? d[f].length : d[f]));
  if (!started) return 0;
  if (ev.kind !== "program" && ev.kind !== "vehicle" && (!d.orbit || !d.window)) return 1;
  if (missing) return 3;
  if (!ev.ok) return 4;
  return 5;
}

// Evidence from the current evaluation, not a NASA approval or a prediction of flight success.
function mdlReviewHtml(ev) {
  const blockers = ev.issues.filter((i) => i.severity === "blocker");
  const warnings = ev.issues.filter((i) => i.severity === "warning");
  const goals = ev.science.goals;
  const missingGoals = goals.filter((g) => g.required && !g.met);
  const ready = blockers.length === 0 && missingGoals.length === 0;
  const quiet = typeof level === "function" && level() === "hard";
  const issues = (items) => (quiet ? "<li>The board does not explain itself at Flight Director level.</li>" : items.map((i) => `<li>${esc(i.text)}</li>`).join(""));
  const poles = Object.entries(ev.nasa.poles || {}).map(([kind, p]) =>
    `<li>${esc(kind)}: ${esc(p.name)} (${Math.round(p.share * 100)}% of the modelled total)</li>`).join("");
  return `<h4>MDL-inspired design review</h4>
    <p><b>${ready ? "Ready for the next design review" : "Revise the design before proceeding"}</b></p>
    <p>Educational review of the current design only. Not NASA approval or a mission success prediction.</p>
    <h5>Science requirements</h5><ul>${goals.map((g) =>
      `<li>${g.met ? "Met" : "Not met"} — ${esc(g.label)} (${g.required ? "required" : "optional"}); capability ${Number(g.points).toFixed(1)} / target ${Number(g.target).toFixed(1)} model units</li>`).join("")}</ul>
    <h5>Engineering blockers (${blockers.length})</h5>${blockers.length ? `<ul>${issues(blockers)}</ul>` : "<p>No critical blockers in this model.</p>"}
    <h5>Warnings (${warnings.length})</h5>${warnings.length ? `<ul>${issues(warnings)}</ul>` : "<p>No warnings in this evaluation.</p>"}
    <h5>Largest design drivers</h5>${poles ? `<ul>${poles}</ul>` : "<p>No comparable driver available for this design.</p>"}
    <p>Next: compare alternatives for science, cost and risk; then review equipment, margins and reserves before selecting a point design.</p>`;
}

function openProcess() {
  const ev = S.ev, c = cmlNow();
  if (!ev || !c) return;
  const step = processStep(), P = S.cat.NASA.PROCESS;
  const lvH = level() === "hard";
  $("#procMission").textContent = scen().name.toUpperCase();
  $("#procBody").innerHTML = `
    <h4>How NASA designs and develops a mission</h4>
    <div class="proc-steps">${P.map((p, i) => `<div class="${i < step ? "done" : i === step ? "now" : ""}"><b>${i + 1}. ${esc(p.name)}</b><span>${esc(p.where)}</span></div>`).join("")}</div>
    <h4>Concept maturity level: ${esc(cmlName(c))}</h4>
    <div class="cml-list">${c.steps.map((s) => `<div class="${s.done ? "done" : ""}">${icon(s.done ? "check" : "none", 14)}
      <span><b>CML ${s.level} · ${esc(s.name)}</b> ${esc(s.text)}${s.done ? "" : ` <em>To do: ${esc(s.todo)}</em>`}</span></div>`).join("")}</div>
    ${c.skipped_trades ? `<p class="proc-note">${icon("warn", 14)} You went straight to a point design. JPL's paper warns about exactly this: teams that skip the trade space never learn whether a cheaper or better design existed. You have ${tradesNow()} design on the table; save this one and try a different one.</p>` : ""}
    <p class="req-small">${esc(c.later)} Source: Wessen, Borden, Ziemer and Kwok, Jet Propulsion Laboratory, 2013.</p>
    ${mdlReviewHtml(ev)}
    <h4>The four segments of this mission</h4>
    <div class="seg-grid">${ev.nasa.segments.map((s) => `<div class="${lvH ? "" : s.state}"><b>${esc(s.name)}</b><small>${esc(s.what)}</small>
      ${s.lines.map(([k, v]) => `<div class="sl"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}${segNotes(s)}</div>`).join("")}</div>`;
  $("#proc").classList.remove("hidden");
}

// NASA advice page of the handbook: what applies to this design first, each with its source.
function nasaAdviceHtml() {
  const tips = (S.ev && S.ev.nasa ? S.ev.nasa.tips : []).map((t) => (t.id === "trades" ? { ...t, active: tradesNow() < 2 } : t.id === "records" ? { ...t, active: tradesNow() < 2 } : t));
  const row = (t) => `<div class="line tip ${t.active ? "act" : ""}">${icon(t.active ? "warn" : "check", 14)}<span><b>${esc(t.text)}</b>
    <q>${esc(t.quote)}</q> <a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.source)}</a></span></div>`;
  const act = tips.filter((t) => t.active), rest = tips.filter((t) => !t.active);
  return `<h4>Advice from NASA's own guides</h4>
    <p>These come from the documents NASA listed for this challenge. The quotes are theirs.</p>
    ${level() === "hard" ? `<p class="req-small">Flight Director rules: the handbook does not say which advice applies to you.</p>${tips.map((t) => row({ ...t, active: false })).join("")}`
      : `${act.length ? `<h4>Worth a look in your design</h4>${act.map(row).join("")}` : ""}
         ${rest.length ? `<h4>Already taken care of</h4>${rest.map(row).join("")}` : ""}`}
    <p><button class="btn small" id="hbLib">Open the NASA library</button> <button class="btn small" id="hbProc">Mission process and CML</button></p>`;
}

// One line the client can say when the design is otherwise fine.
function nasaTipLine() {
  if (!S.ev || !S.ev.nasa || level() === "hard") return "";
  const order = ["reserve", "mass_margin", "schedule", "trades", "tlyf", "spare"];
  const tips = S.ev.nasa.tips.filter((t) => (t.id === "trades" ? tradesNow() < 2 : t.active));
  const t = order.map((id) => tips.find((x) => x.id === id)).find(Boolean);
  return t ? ` One thing from ${t.source}: ${t.text.charAt(0).toLowerCase()}${t.text.slice(1)}` : "";
}

function openLibrary() {
  const N = S.cat.NASA;
  $("#libBody").innerHTML = `<p>NASA listed these resources for the Space Mission Design Game challenge. This is what each one is and what the game took from it.</p>
    ${N.RESOURCES.map((r) => `<div class="lib-item"><b>${esc(r.name)}</b><small>${esc(r.by)}</small>
      <p>${esc(r.what)}</p><p class="lib-used">${icon("check", 12)} ${esc(r.used)}</p>
      <a href="${esc(r.url)}" target="_blank" rel="noopener">Open the resource</a></div>`).join("")}
    <p class="req-small">Mission Architect is a student project for the NASA Space Apps Challenge 2026. It is not made or endorsed by NASA. Numbers are simplified from public mission data.</p>`;
  $("#library").classList.remove("hidden");
}

// The real NASA mission closest to the one just flown (newspaper box).
function realBox(res) {
  const real = res.evaluation.nasa && res.evaluation.nasa.real[0];
  if (!real) return "";
  const rows = real.rows.filter((r) => Math.max(r.yours.length, r.real.length) <= 22).slice(0, 3).map((r) => `<div class="rl"><span>${esc(r.label)}</span><span>${esc(r.yours)}</span><span>${esc(r.real)}</span></div>`).join("");
  return `<h5>The real one: ${esc(real.name)} (${real.year})</h5>
    <div class="real"><div class="rl rh"><span></span><span>Yours</span><span>NASA's</span></div>${rows}</div>`;
}

// Mission report: the flight sorted by segment, the master equipment list and the real missions. Prints to one page.
function openDossier(res = S.result) {
  if (!res) return;
  const ev = res.evaluation, N = ev.nasa, sim = res.sim, sc = res.score;
  const c = cmlNow(ev), lost = sim.outcome === "lost" || sim.outcome === "cancelled";
  const evOf = (seg) => sim.events.filter((e) => e.impact !== "neutral" && ({
    launch: ["launch", "launch_failure", "booster", "slip"], ground: [], user: ["discovery", "budget_cut"],
  }[seg] || []).includes(e.kind));
  const spaceEv = sim.events.filter((e) => e.impact !== "neutral" && !["launch", "launch_failure", "booster", "slip", "discovery", "budget_cut", "end"].includes(e.kind));
  const segEvents = (k) => (k === "space" ? spaceEv : evOf(k)).slice(0, 3).map((e) => `<div class="dl ${e.impact}">Month ${e.month}: ${esc(e.text)}</div>`).join("");
  const mel = N.mel;
  $("#dosBody").innerHTML = `
    <div class="dos-head"><div><b>${esc(ev.scenario.name)}</b><span>${esc(ev.destination.name)} · ${esc(S.cat.DIFFICULTY[res.design.difficulty].name)} · flight ${res.seed}${S.player ? ` · ${esc(S.player)}` : ""}</span></div>
      <div class="dos-grade" style="color:${GRADE_COL[sc.grade]};border-color:${GRADE_COL[sc.grade]}">${sc.grade}<small>${sc.total} pts</small></div></div>
    <p>${esc(headline(res)[0])}. The mission returned ${pct(sim.science_fraction)} of its planned science in ${sim.months_survived} of ${sim.months_planned} months
      and ended with ${pct(Math.max(0, sim.reserve_end))} of the budget in reserve. Concept maturity at approval: ${esc(cmlName(c))}.</p>
    <h4>The mission by segment</h4>
    <div class="seg-grid">${N.segments.map((s) => `<div class="${s.state}"><b>${esc(s.name)}</b>
      ${s.lines.map(([k, v]) => `<div class="sl"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}${segEvents(s.key)}</div>`).join("")}</div>
    <h4>Why it went this way</h4>
    ${sc.analysis.map((a) => `<p>${esc(a)}</p>`).join("")}
    <h4>Score: ${sc.total} of ${Object.values(sc.max).reduce((a, b) => a + b, 0)}</h4>
    <div class="seg-grid five">${Object.keys(sc.parts).map((k) => `<div><b>${{ science: "Science", budget: "Budget", margins: "Margins", reliability: "Reliability", team: "Team goals" }[k]}</b>${sc.parts[k]} of ${sc.max[k]}</div>`).join("")}</div>
    ${Object.entries(sc.roles).map(([k, ok]) => `<div class="sl"><span>${icon(ok ? "check" : "cross", 14)} ${esc(S.cat.ROLES[k].name)}: ${esc(S.cat.ROLES[k].goal)}</span><span>${ok ? "met" : "missed"}</span></div>`).join("")}
    ${mel.rows.length ? `<h4>Master equipment list</h4>
      <table class="cmp mel"><tr><th>Subsystem</th><th>Item</th><th>Mass</th><th>Power</th><th>Cost</th></tr>
      ${mel.rows.map((r) => `<tr><td>${esc(r.group)}</td><td>${esc(r.name)}</td><td>${fmt(r.mass)} kg</td><td>${r.power ? `${fmt(r.power)} W` : "-"}</td><td>${r.cost ? `${fmt(r.cost)} M$` : "-"}</td></tr>`).join("")}
      <tr class="tot"><td colspan="2">Total at launch</td><td>${fmt(mel.total.mass)} kg</td><td>${fmt(mel.total.power)} W</td><td>${fmt(mel.total.cost)} M$</td></tr></table>
      <p class="req-small">Power is each item's draw when switched on. Cost is hardware only: integration, testing, launch and operations are added on top (${fmt(ev.cost.total)} M$ in all).</p>` : ""}
    <h4>How NASA really did it</h4>
    ${N.real.map((r) => `<div class="real-card"><b>${esc(r.name)} (${r.year})</b><small>${esc(r.where)}</small>
      ${r.rows.length ? `<div class="real"><div class="rl rh"><span></span><span>Yours</span><span>NASA's</span></div>
        ${r.rows.map((x) => `<div class="rl"><span>${esc(x.label)}</span><span>${esc(x.yours)}</span><span>${esc(x.real)}</span></div>`).join("")}</div>` : ""}
      <p>${r.note ? `${esc(r.note)} ` : ""}${esc(r.lesson)}</p><a href="${esc(r.url)}" target="_blank" rel="noopener">Read about ${esc(r.name)} at NASA</a></div>`).join("")}
    <p class="req-small">Real figures are rounded public numbers. Design code: <code class="dos-code">${esc(btoa(JSON.stringify(res.design)))}</code></p>`;
  void lost;
  $("#dossier").classList.remove("hidden");
  $("#dosBody").scrollTop = 0;
}

const segNotes = (s) => (s.notes || []).map((n) => `<div class="sn">${esc(n)}</div>`).join("");

// ---------------------------------------------------------------------------- orbit view (our own sketch, not NASA Mission Viz)
// One orbit, not to scale: where the Sun is, where the planet's shadow falls, and where a ground station can hear you.
function orbitViewHtml() {
  if (isProgram() || kindNow() === "vehicle" || onSurface() || !S.design.orbit) return "";
  return `<div class="orbit-view"><canvas id="orbitCv" width="256" height="104" class="px"></canvas>
    <div class="ov-side"><b>ONE ORBIT, NOT TO SCALE</b><div id="orbitStatus"></div>
    <label>Time <input type="range" id="orbitT" min="0" max="100" value="${Math.round((S.orbitT || 0) * 100)}"></label>
    <button class="btn tiny" id="orbitPlay">${S.orbitHold ? "Play" : "Pause"}</button></div></div>`;
}
function orbitFacts() {
  const o = curOrbit(), ev = S.ev;
  const shadow = Math.max(0, Math.min(0.5, o.eclipse_frac || 0));
  const contact = ev && S.design.comms && S.design.ground ? Math.max(0, Math.min(1, ev.data.contact_hours / 24)) : 0;
  return { o, shadow, contact, ecc: /lliptical|flyby|Flyby|transfer/.test(o.name) ? 0.55 : 0 };
}
// Position on the orbit at time t (0..1). Angle 0 points away from the Sun, into the shadow.
function orbitPoint(t, f) {
  const a = t * Math.PI * 2, rx = 44 + 30 * f.ecc, ry = 34 - 8 * f.ecc;
  return { x: 128 + 30 * f.ecc + Math.cos(a) * rx, y: 52 - Math.sin(a) * ry, a };
}
function drawOrbitView() {
  const cv = document.getElementById("orbitCv"); if (!cv) return;
  const g = cv.getContext("2d"), f = orbitFacts(), t = S.orbitT || 0;
  const inArc = (x, mid, width) => { const d = Math.abs(((x - mid + 1.5) % 1) - 0.5); return d <= width / 2; };
  g.fillStyle = "#0d0c12"; g.fillRect(0, 0, 256, 104);
  for (let i = 0; i < 40; i++) { g.fillStyle = i % 3 ? "#3a3d55" : "#8c90b0"; g.fillRect((i * 67) % 256, (i * 41) % 104, 1, 1); }
  g.fillStyle = "#e8cf52"; for (let y = 8; y < 100; y += 12) g.fillRect(2, y, 8, 1);                 // sunlight from the left
  g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(128, 52 - 13, 128, 26);                                 // the planet's shadow
  for (let i = 0; i < 180; i++) {                                                                    // the orbit, coloured by what happens there
    const u = i / 180, p = orbitPoint(u, f), dark = inArc(u, 0, f.shadow), talk = inArc(u, 0.25, f.contact);
    g.fillStyle = dark ? "#5b534b" : talk ? "#7fd08a" : "#9cc0ea";
    g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }
  const im = new Image(); im.src = planet(PLANET_OF[destKey()], 32);
  const put = () => { g.imageSmoothingEnabled = false; g.drawImage(im, 128 - 13, 52 - 13, 26, 26); craft(); };
  const craft = () => { const p = orbitPoint(t, f); g.fillStyle = "#f4efe2"; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
    g.fillStyle = "#3d6fa8"; g.fillRect(Math.round(p.x) - 3, Math.round(p.y), 2, 1); g.fillRect(Math.round(p.x) + 2, Math.round(p.y), 2, 1); };
  if (im.complete) put(); else { im.onload = put; craft(); }
  const dark = inArc(t, 0, f.shadow), talk = inArc(t, 0.25, f.contact), el = document.getElementById("orbitStatus");
  if (el) el.innerHTML = `<div class="${dark ? "bad" : "good"}">${dark ? "In the planet's shadow: running on the battery" : "In sunlight: solar panels working"}</div>
    <div class="${talk ? "good" : ""}">${!S.design.comms || !S.design.ground ? "No antenna or ground station chosen yet" : talk ? `Ground contact: sending data at ${fmt(S.ev.data.rate_mbps, 2)} Mbps` : "No contact: data waits in the computer"}</div>
    <small>Shadow ${pct(f.shadow)} of each orbit · contact ${pct(f.contact)} of the day</small>`;
}
function wireOrbitView() {
  const sl = document.getElementById("orbitT"); if (!sl) return;
  sl.oninput = () => { S.orbitHold = true; S.orbitT = sl.value / 100; document.getElementById("orbitPlay").textContent = "Play"; drawOrbitView(); };
  document.getElementById("orbitPlay").onclick = (e) => { S.orbitHold = !S.orbitHold; e.target.textContent = S.orbitHold ? "Play" : "Pause"; };
  drawOrbitView();
}
function tickOrbitView() {
  const sl = document.getElementById("orbitT"); if (!sl || S.orbitHold) return;
  S.orbitT = ((S.orbitT || 0) + 0.01) % 1; sl.value = Math.round(S.orbitT * 100); drawOrbitView();
}

// ---------------------------------------------------------------------------- glossary (plain words for every term the game uses)
const GLOSSARY = [
  ["Payload", "The part of the spacecraft that does the job: the science instruments. Everything else exists to carry it."],
  ["Bus", "The body of the spacecraft: structure, wiring, computer, power and radio. Instruments bolt onto it."],
  ["Orbit", "The path a spacecraft follows around a planet. Low orbits see detail, high orbits see more at once."],
  ["Sun-synchronous orbit", "A polar orbit that passes over each place at the same local time every day, so pictures can be compared."],
  ["Geostationary orbit", "35,786 km up, where one lap takes one day. The satellite seems to hang over one spot."],
  ["Delta-v", "How much a spacecraft can change its speed, in metres per second. It is the real price of every manoeuvre."],
  ["Rocket equation", "To change speed you burn fuel, and the fuel itself has mass you must also push. More delta-v needs much more fuel."],
  ["Specific impulse (Isp)", "How efficient an engine is. Higher Isp means less fuel for the same delta-v."],
  ["Payload capacity", "The mass a rocket can deliver to a given orbit. It drops fast the farther you go."],
  ["Launch window", "The dates when Earth and the target line up. For Mars it opens about every 26 months."],
  ["Mass margin", "Spare capacity between what the spacecraft weighs and what the rocket lifts. Designs always get heavier."],
  ["Power budget", "The watts every part needs against the watts the arrays or RTGs make, at the end of the mission."],
  ["Eclipse", "Time spent in the planet's shadow. Solar panels make nothing there, so the battery has to carry the load."],
  ["RTG", "A generator that turns the heat of decaying plutonium into electricity. It works day and night, far from the Sun."],
  ["AU", "Astronomical unit: the distance from the Sun to Earth, about 150 million km. At 2 AU sunlight is four times weaker."],
  ["Attitude control (ADCS)", "The system that points the spacecraft: reaction wheels, magnets or thrusters."],
  ["Data rate", "How many megabits per second the radio can send. It falls with the square of the distance."],
  ["Downlink", "Sending data from the spacecraft to the ground. Data that is not downlinked is lost science."],
  ["Deep Space Network (DSN)", "NASA's three sites with giant dishes, in California, Spain and Australia, that talk to distant spacecraft."],
  ["Radiation hardening", "Building electronics that survive energetic particles. Needed near Jupiter and in deep space."],
  ["Entry, descent and landing (EDL)", "Everything between arriving at a world and standing on it: heat shield, parachute, engines."],
  ["Budget reserve", "Money kept back for problems found later. This game follows CubeSat 101 and asks for 10%."],
  ["Mission segment", "NASA splits a mission into four parts: launch, space, ground and user."],
  ["Concept maturity level (CML)", "JPL's scale for how grown-up a mission idea is, from a napkin sketch to a reviewed design."],
  ["Trade study", "Comparing different designs for the same goal by science, cost and risk before choosing one."],
  ["Master equipment list (MEL)", "The table of every item on the spacecraft with its mass, power and cost."],
  ["Monte Carlo", "Flying the same design hundreds of times with different luck to see the odds. The risk check does this."],
];
function glossaryHtml() {
  return `<h4>Glossary: the words on this desk, in plain language</h4>
    ${GLOSSARY.map(([t, d]) => `<div class="line"><span></span><span><b>${esc(t)}.</b> ${esc(d)}</span></div>`).join("")}`;
}

function wireNasa() {
  $("#procClose").onclick = () => $("#proc").classList.add("hidden");
  $("#procLib").onclick = () => { $("#proc").classList.add("hidden"); openLibrary(); };
  $("#procCompare").onclick = () => { $("#proc").classList.add("hidden"); openCompare(); };
  $("#libClose").onclick = () => $("#library").classList.add("hidden");
  $("#dosClose").onclick = () => $("#dossier").classList.add("hidden");
  $("#dosPrint").onclick = () => { document.documentElement.classList.add("printing"); window.print(); setTimeout(() => document.documentElement.classList.remove("printing"), 500); };
  $("#dosChallenge").onclick = async () => {
    const r = S.result, link = `${location.origin}${location.pathname}#challenge=${r.design.scenario}:${r.seed}:${r.design.difficulty}`;
    try { await navigator.clipboard.writeText(link); $("#dosMsg").textContent = `Challenge link copied: same mission, same luck. Your score to beat: ${r.score.total}.`; } catch { prompt("Copy this challenge link:", link); }
  };
  $("#dosCopy").onclick = async () => {
    const link = `${location.origin}${location.pathname}#code=${btoa(JSON.stringify(S.result.design))}`;
    try { await navigator.clipboard.writeText(link); $("#dosMsg").textContent = "Link to this design copied."; } catch { prompt("Copy this link:", link); }
  };
  $("#nReport").onclick = () => { SFX.page(); openDossier(); };
  $("#titleLib").onclick = () => { SFX.page(); openLibrary(); };
  $("#mLibrary").onclick = () => { $("#menu").classList.add("hidden"); openLibrary(); };
  $("#mProcess").onclick = () => { $("#menu").classList.add("hidden"); openProcess(); };
}

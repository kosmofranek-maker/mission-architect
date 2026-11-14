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
  "edl", "instruments", "years", "window", "manifest", "testing", "spare", "shape", "seats", "heatshield", "abort", "landing"];

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
  const started = PICKS.some((f) => f !== "years" && f !== "testing" && f !== "spare" && (Array.isArray(d[f]) ? d[f].length : d[f]));
  if (!started) return 0;
  if (ev.kind !== "program" && ev.kind !== "vehicle" && (!d.orbit || !d.window)) return 1;
  if (missing) return 3;
  if (!ev.ok) return 4;
  return 5;
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
    <h4>The four segments of this mission</h4>
    <div class="seg-grid">${ev.nasa.segments.map((s) => `<div class="${lvH ? "" : s.state}"><b>${esc(s.name)}</b><small>${esc(s.what)}</small>
      ${s.lines.map(([k, v]) => `<div class="sl"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}</div>`).join("")}</div>`;
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
  const rows = real.rows.slice(0, 3).map((r) => `<div class="rl"><span>${esc(r.label)}</span><span>${esc(r.yours)}</span><span>${esc(r.real)}</span></div>`).join("");
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

function wireNasa() {
  $("#procClose").onclick = () => $("#proc").classList.add("hidden");
  $("#procLib").onclick = () => { $("#proc").classList.add("hidden"); openLibrary(); };
  $("#procCompare").onclick = () => { $("#proc").classList.add("hidden"); openCompare(); };
  $("#libClose").onclick = () => $("#library").classList.add("hidden");
  $("#dosClose").onclick = () => $("#dossier").classList.add("hidden");
  $("#dosPrint").onclick = () => { document.documentElement.classList.add("printing"); window.print(); setTimeout(() => document.documentElement.classList.remove("printing"), 500); };
  $("#dosCopy").onclick = async () => {
    const link = `${location.origin}${location.pathname}#code=${btoa(JSON.stringify(S.result.design))}`;
    try { await navigator.clipboard.writeText(link); $("#dosMsg").textContent = "Link to this design copied."; } catch { prompt("Copy this link:", link); }
  };
  $("#nReport").onclick = () => { SFX.page(); openDossier(); };
  $("#titleLib").onclick = () => { SFX.page(); openLibrary(); };
  $("#mLibrary").onclick = () => { $("#menu").classList.add("hidden"); openLibrary(); };
  $("#mProcess").onclick = () => { $("#menu").classList.add("hidden"); openProcess(); };
}

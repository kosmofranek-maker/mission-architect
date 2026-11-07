// Mission Architect: game client. Talks to server.py (/api/*); all physics lives in the Python engine.
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n, d = 0) => (n == null || !isFinite(n) ? "∞" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (x) => `${Math.round((x || 0) * 100)}%`;

const ORDER = ["wildfire", "lunar_ice", "mars_climate", "europa"];
const PLANET_OF = { earth: "earth", moon: "moon", mars: "mars", europa: "europa" };
const GRADE_COL = { S: "#6a3d9a", A: "#3c6b25", B: "#1d4f8a", C: "#8a6410", F: "#a8322a" };
const PASS = ["S", "A", "B", "C"];

const CLIENTS = {
  wildfire: { name: "Chief Dana Okafor", org: "Regional Fire Service",
    look: { skin: "#a8724f", skinD: "#80543a", hair: "#1f1a17", hairStyle: "short", coat: "#7a3b26", shirt: "#d9cfb8", tie: "#2b2b2b", badge: true } },
  lunar_ice: { name: "Dr. Mei Tanaka", org: "Lunar Resources Office",
    look: { skin: "#e3c19c", skinD: "#b8957a", hair: "#16141a", hairStyle: "bun", coat: "#e8e4dc", shirt: "#3d6fa8", glasses: true } },
  mars_climate: { name: "Dr. Luis Herrera", org: "Planetary Climate Lab",
    look: { skin: "#c99a74", skinD: "#9e7454", hair: "#3b2a1e", hairStyle: "curly", coat: "#4b5a3a", shirt: "#e0d8c6", beard: true } },
  europa: { name: "Dr. Ingrid Solberg", org: "Outer Planets Program",
    look: { skin: "#efd2bd", skinD: "#c9a891", hair: "#d8c27a", hairStyle: "long", coat: "#2c3b55", shirt: "#e9e3d6", glasses: true, badge: true } },
};

const TABS = [
  { id: "launch", label: "Launch", icon: "rocket", role: "manager", fields: ["launch_vehicle"],
    hint: "The rocket must lift your fully fuelled spacecraft to where the mission starts. Bigger rockets cost much more." },
  { id: "orbit", label: "Orbit", icon: "orbit", role: "science", fields: ["orbit"],
    hint: "Closer orbits give sharper data but cost more fuel and shadow. Far orbits watch more at once." },
  { id: "bus", label: "Bus", icon: "bus", role: "systems", fields: ["bus"],
    hint: "The bus is the body: structure, wiring and slots for instruments. It limits how much you can carry." },
  { id: "power", label: "Power", icon: "bolt", role: "systems", fields: ["solar", "rtg", "battery"],
    hint: "Solar power falls with distance squared from the Sun. Batteries carry you through eclipses." },
  { id: "adcs", label: "Pointing", icon: "wheel", role: "systems", fields: ["adcs"],
    hint: "Attitude control keeps cameras and antennas pointed. Sharp instruments need steady pointing." },
  { id: "prop", label: "Engine", icon: "nozzle", role: "systems", fields: ["propulsion"],
    hint: "Engines change your orbit. Efficiency (Isp) decides how much propellant the rocket equation demands." },
  { id: "comms", label: "Comms", icon: "dish", role: "comms", fields: ["comms", "ground"],
    hint: "Data is useless until it reaches Earth. Signals weaken with distance squared." },
  { id: "computer", label: "Computer", icon: "chip", role: "comms", fields: ["computer"],
    hint: "Stores data between contacts and must survive the local radiation." },
  { id: "instr", label: "Instruments", icon: "telescope", role: "science", fields: ["instruments"],
    hint: "Pick instruments that serve the mission goals (dark tags). Watch mass, power and data volume." },
];

const FIELD_LABEL = { launch_vehicle: "Launch vehicle", orbit: "Orbit", bus: "Spacecraft bus", solar: "Solar array",
  rtg: "Nuclear power (RTG)", battery: "Battery", adcs: "Attitude control", propulsion: "Propulsion", comms: "Antenna",
  ground: "Ground stations", computer: "Flight computer", instruments: "Instruments" };

const S = {
  cat: null, design: null, ev: null, mode: "free", tab: "launch", player: "", started: false,
  room: null, version: -1, myRoles: [], approvals: {}, players: {}, lastRunSeen: null, poll: null,
  result: null, introShown: false,
};

// ---------------------------------------------------------------------------- utils
async function api(path, body) {
  const r = await fetch(`/api/${path}`, body ? { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body) } : undefined);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Synthesized sound effects (no audio files): stamp thud, paper whoosh, teletype tick, launch rumble.
const SFX = (() => {
  let ctx = null;
  const on = () => store.get("sound", true);
  const ac = () => {
    if (!on()) return null;
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  function tone(f0, f1, dur, vol, type = "sine") {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur);
  }
  function noise(dur, freq, vol, type = "lowpass", sweepTo = null, attack = 0.01) {
    const c = ac(); if (!c) return;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    src.buffer = buf; f.type = type; f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t);
  }
  return {
    thud() { tone(150, 40, 0.2, 0.7); noise(0.09, 1200, 0.4); },
    whoosh() { noise(1.3, 250, 0.22, "bandpass", 2600, 0.5); },
    tick() { tone(2200, 1400, 0.02, 0.04, "square"); },
    rumble() { noise(3.5, 160, 0.5, "lowpass", 60, 0.3); },
    paper() { noise(0.25, 2500, 0.12, "highpass"); },
    click() { tone(1500, 900, 0.035, 0.07, "square"); },
    select() { tone(520, 780, 0.07, 0.12, "triangle"); setTimeout(() => tone(780, 1040, 0.06, 0.1, "triangle"), 55); noise(0.05, 3000, 0.06, "highpass"); },
    deselect() { tone(700, 380, 0.09, 0.1, "triangle"); },
    page() { noise(0.16, 1800, 0.1, "bandpass", 4200, 0.03); },
    error() { tone(140, 110, 0.12, 0.12, "square"); setTimeout(() => tone(140, 100, 0.16, 0.12, "square"), 140); },
    chime() { [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, f, 0.35, 0.12), i * 110)); },
    ding() { tone(1320, 1320, 0.4, 0.09); tone(1980, 1980, 0.25, 0.04); },
    beep(hi) { tone(hi ? 1320 : 880, hi ? 1320 : 880, hi ? 0.45 : 0.12, 0.1, "square"); },
    boom() { noise(2.2, 900, 0.7, "lowpass", 50, 0.01); tone(90, 30, 1.2, 0.5); },
    pop() { tone(420, 900, 0.06, 0.1, "sine"); },
    suggest() { tone(990, 990, 0.08, 0.06); setTimeout(() => tone(1240, 1240, 0.12, 0.06), 90); },
  };
})();
// every button gets a soft mechanical click
document.addEventListener("click", (e) => { if (e.target.closest(".btn:not(:disabled)")) SFX.click(); }, true);

function toast(msg, ms = 2600) {
  const t = $("#toast"); t.innerHTML = msg; t.classList.remove("hidden");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add("hidden"), ms);
}
function show(id) { $$(".screen").forEach((s) => s.classList.toggle("active", s.id === id)); }
// Desktop/tablet landscape: the 1280x720 stage is scaled to fit. Phones / narrow portrait: a scrolling mobile layout.
function fit() {
  const mobile = innerWidth < 820 || (innerWidth < innerHeight && innerWidth < 1000);
  document.documentElement.classList.toggle("mobile", mobile);
  const st = $("#stage");
  if (mobile) { st.style.transform = ""; S.scale = 1; return; }
  const s = Math.min(innerWidth / 1280, innerHeight / 720);
  S.scale = s; st.style.transform = `scale(${s}) translate(-50%,-50%)`; st.style.transformOrigin = "0 0";
}
const isMobile = () => document.documentElement.classList.contains("mobile");
const canEdit = (field) => S.mode !== "team" || S.myRoles.includes(S.cat.FIELD_OWNER[field]);
const scen = () => S.cat.SCENARIOS[S.design.scenario];
const destKey = () => scen().destination;
// orbit may be unchosen (null): fall back to the destination's first orbit for display only
const curOrbit = () => S.cat.ORBITS[destKey()][S.design.orbit] || Object.values(S.cat.ORBITS[destKey()])[0];
// guidance level: easy = Cadet (suggests what to pick), normal = Engineer (says exactly what is wrong),
// hard = Flight Director (only says that requirements are not met)
const level = () => (S.design && S.design.difficulty) || "normal";

// ---------------------------------------------------------------------------- boot
async function boot() {
  fit(); addEventListener("resize", fit);
  stars($("#titleStars"), 220, 3);
  $("#titlePlanet").src = planet("europa", 64);
  S.player = store.get("player", "");
  $("#playerName").value = S.player;
  $("#playerName").addEventListener("input", (e) => { S.player = e.target.value.trim(); store.set("player", S.player); });
  S.cat = await api("catalog");
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  wireDesk(); wireLobby(); wireNews();
  // direct links for demos/screenshots: #play=<scenario>, #news=<scenario>
  if (location.hash === "#selftest") { const sc = document.createElement("script"); sc.src = "selftest.js"; document.body.appendChild(sc); }
  const [k, v] = location.hash.slice(1).split("=");
  if (k === "tutorial") { go("tutorial"); for (let n = 0; n < Number(v || 0); n++) tutAdvance(); }
  if (v && S.cat.SCENARIOS[v]) {
    S.mode = "free";
    if (k === "play") startMission(v);
    if (k === "hints") { startMission(v, S.cat.DEFAULTS[v]); await wait(400); openHints("power"); }
    if (k === "stamp") { startMission(v, S.cat.DEFAULTS[v]); await wait(400); stampAnim("ok"); }
    if (k === "news") { startMission(v, S.cat.DEFAULTS[v]); showNews(await api("launch", { design: S.design, save: false, seed: 7 })); }
    if (k === "launch") { startMission(v, S.cat.DEFAULTS[v]); playLaunch(await api("launch", { design: S.design, save: false, seed: 7 })); }
  }
}

function go(where) {
  stopPoll();
  if (where === "title") return show("title");
  if (where === "career" || where === "free") { S.mode = where; return openSelect(); }
  if (where === "tutorial") { S.mode = "career"; startMission("wildfire"); S.design.difficulty = "easy"; renderAll(); evaluateSoon(0); return startTutorial(true); }
  if (where === "team") { if (!S.player) return nameFirst(); return openLobby(); }
  if (where === "hall") return openHall();
}
function nameFirst() { $("#playerName").focus(); $("#playerName").placeholder = "Enter a name first"; }

// ---------------------------------------------------------------------------- mission select
function progress() { return store.get("career", {}); }
function unlocked(sc) {
  if (S.mode !== "career") return true;
  const i = ORDER.indexOf(sc); if (i <= 0) return true;
  const prev = progress()[ORDER[i - 1]]; return prev && PASS.includes(prev.grade);
}
function openSelect() {
  $("#selectTitle").textContent = S.mode === "career" ? "Career: choose today's mission file" : "Free design: any mission";
  $("#sandboxWrap").classList.toggle("hidden", S.mode !== "free");
  const diff = store.get("difficulty", "normal");
  $("#difficultySeg").innerHTML = Object.entries(S.cat.DIFFICULTY).map(([k, d]) =>
    `<button class="btn ${k === diff ? "on" : ""}" data-d="${k}">${d.name}</button>`).join("");
  $$("#difficultySeg button").forEach((b) => b.onclick = () => { store.set("difficulty", b.dataset.d); openSelect(); });
  const prog = progress();
  $("#folders").innerHTML = ORDER.map((k, i) => {
    const s = S.cat.SCENARIOS[k], lock = !unlocked(k), best = prog[k];
    return `<div class="folder ${lock ? "locked" : ""}" data-sc="${k}">
      ${best ? `<div class="f-best" style="color:${GRADE_COL[best.grade]}">${best.grade}</div>` : ""}
      <img class="px f-planet" src="${planet(PLANET_OF[s.destination], 48)}" alt="">
      <div class="f-name">${S.mode === "career" ? `Day ${i + 1}: ` : ""}${esc(s.name)}</div>
      <div class="f-lvl">${s.difficulty} &middot; ${esc(S.cat.DESTINATIONS[s.destination].name)}</div>
      <div>${esc(s.pitch)}</div>
      <div>${icon("coin")} Budget ${fmt(s.budget)} M$</div>
      ${lock ? `<div class="f-lock">${icon("lock", 64)}</div>` : ""}
    </div>`;
  }).join("");
  $$(".folder").forEach((f) => f.onclick = () => { if (f.classList.contains("locked")) return SFX.error(); SFX.page(); startMission(f.dataset.sc); });
  show("select");
}

function startMission(sc, design) {
  const d = design ? { ...design } : { ...S.cat.BLANK[sc], instruments: [] };
  if (!design) {
    d.difficulty = store.get("difficulty", "normal");
    d.sandbox = S.mode === "free" && $("#sandbox").checked;
  }
  S.design = d; S.tab = "orbit"; S.introShown = false; S.ev = null; S._prevOk = undefined; S._prevMet = null;
  openDesk();
  if (!design && S.mode === "career" && sc === "wildfire" && !store.get("tutorialDone", false) && !S.tut) startTutorial(true);
}

// ---------------------------------------------------------------------------- desk
function openDesk() {
  show("desk");
  $("#stampMark").classList.add("hidden");
  renderAll(); evaluateSoon(0);
}

let _evalTimer = null, _evalSeq = 0;
function evaluateSoon(ms = 90) {
  clearTimeout(_evalTimer);
  if (S.mode === "team") return; // in a room the server sends the evaluation with every state change
  _evalTimer = setTimeout(async () => {
    const seq = ++_evalSeq;
    try {
      const ev = await api("evaluate", { design: S.design });
      if (seq === _evalSeq) { S.ev = ev; renderEval(); }
    } catch (e) { toast(`Server error: ${esc(e.message)}`); }
  }, ms);
}

async function setField(field, value) {
  if (!canEdit(field)) {
    const role = S.cat.ROLES[S.cat.FIELD_OWNER[field]];
    SFX.error();
    return toast(`${icon("lock")} Only the ${role.name} may change that.`);
  }
  if (field === "instruments" && value.length < S.design.instruments.length) SFX.deselect(); else SFX.select();
  S.introShown = true;
  $("#stampMark").classList.add("hidden");
  if (S.mode === "team") {
    try { applyRoom(await api(`room/${S.room}/set`, { player: S.player, field, value })); }
    catch (e) { toast(esc(e.message)); }
    return;
  }
  S.design[field] = value;
  renderAll(); evaluateSoon();
}

function renderAll() {
  renderTop(); renderRequest(); renderTabs(); renderBinder(); drawBlueprint(); renderClient();
  if (S.ev) renderEval();
}

function renderEval() {
  if (!S.ev) return;
  S.advice = level() === "easy" ? advisor() : null;
  const met = S.ev.science.goals.filter((g) => g.met).length;
  if (S._prevOk === false && S.ev.ok) SFX.chime();
  else if (S._prevMet != null && met > S._prevMet) SFX.ding();
  S._prevOk = S.ev.ok; S._prevMet = met;
  renderTop(); renderRequest(); renderReview(); renderClient(); renderBinder(); drawBlueprint(); renderApprovals();
}

function renderTop() {
  const i = ORDER.indexOf(S.design.scenario);
  $("#tbDay").innerHTML = S.mode === "career" ? `${icon("calendar")} DAY ${i + 1}` :
    S.mode === "team" ? `${icon("person")} TEAM` : `${icon("calendar")} FREE DESIGN`;
  $("#tbRoom").innerHTML = S.mode === "team" ? ` &middot; ROOM <span class="code">${S.room}</span> &middot; ${Object.keys(S.players).length} engineer(s)` : "";
  $("#tbScenario").textContent = `${scen().name.toUpperCase()} · ${S.cat.DIFFICULTY[S.design.difficulty].name.toUpperCase()}${S.design.sandbox ? " · SANDBOX" : ""}`;
  if (S.ev) $("#tbBudget").innerHTML = `${icon("coin")} ${fmt(S.ev.cost.total)} / ${fmt(S.ev.cost.budget)} M$`;
}

// ---------------------------------------------------------------------------- Cadet advisor
const PICK_ORDER = ["orbit", "instruments", "bus", "solar", "battery", "adcs", "propulsion", "comms", "ground", "computer", "launch_vehicle"];
const FIELD_TAB = { orbit: "orbit", instruments: "instr", bus: "bus", solar: "power", battery: "power", adcs: "adcs",
  propulsion: "prop", comms: "comms", ground: "comms", computer: "computer", launch_vehicle: "launch", rtg: "power" };

function downlinkGb(commsKey, groundKey) {
  const c = S.cat, dest = c.DESTINATIONS[destKey()], x = c.COMMS[commsKey], g = c.GROUND[groundKey];
  if (dest.earth_au > g.max_earth_au) return 0;
  const rate = (dest.earth_au ? Math.min(x.max_mbps, x.mbps_1au / dest.earth_au ** 2) : x.max_mbps) * g.gain;
  return rate * g.hours * (S.design.orbit ? curOrbit().earth_view : 1) * 3.6;
}

function recommend(f) {
  const c = S.cat, d = S.design, ev = S.ev, dest = c.DESTINATIONS[destKey()], orbits = c.ORBITS[destKey()], sc = scen();
  const cheapest = (arr) => arr.sort((a, b) => (a[1].cost ?? a[1].cost_year) - (b[1].cost ?? b[1].cost_year))[0];
  const life = (d.orbit ? curOrbit().cruise_years : 0) + d.years;
  switch (f) {
    case "orbit": {
      const val = (o) => sc.goals.reduce((a, g) => a + g.weight * (o.science[g.tag] || 0), 0) * (0.6 + 0.4 * o.coverage);
      const [k, o] = Object.entries(orbits).sort((a, b) => val(b[1]) - val(a[1]))[0];
      return { key: k, why: `it gives the best science for this mission's goals (covers ${pct(o.coverage)} of the surface)` };
    }
    case "instruments": {
      const goals = (ev ? ev.science.goals : sc.goals.map((g) => ({ ...g, fraction: 0 })))
        .filter((g) => g.fraction < (g.required ? 0.5 : 1)).sort((a, b) => (b.required - a.required) || (b.weight - a.weight));
      for (const g of goals) {
        const cand = Object.entries(c.INSTRUMENTS).filter(([k, i]) => i.tags.includes(g.tag) && !d.instruments.includes(k))
          .sort((a, b) => b[1].value / (b[1].cost + 5) - a[1].value / (a[1].cost + 5));
        if (cand.length) return { key: cand[0][0], why: `it serves "${g.label}"${g.required ? ", a required goal" : ""}` };
      }
      return null;
    }
    case "bus": {
      const n = Math.max(1, d.instruments.length), base = ev && ev.mass.dry != null ? ev.mass.dry - (d.bus ? c.BUSES[d.bus].mass : 0) : 0;
      const fit = Object.entries(c.BUSES).filter(([, b]) => b.slots >= n && b.max_dry >= (base + b.mass) * 1.25);
      return fit.length ? { key: cheapest(fit)[0], why: `it is the cheapest bus with ${n}+ slot(s) that holds your parts with room to spare` }
        : { key: "flagship", why: "only the biggest bus can hold all this" };
    }
    case "solar": {
      if (!ev) return null;
      const sunF = 1 / dest.sun_au ** 2, deg = (1 - (destKey() === "europa" ? 0.04 : 0.02)) ** life;
      const ef = d.orbit ? curOrbit().eclipse_frac : 0.35, est = ev.power.load + (d.instruments.length ? 0 : 30) + 40;
      const need = Math.max(0, (est - ev.power.rtg) * 1.25 / (1 - ef) / sunF / deg);
      if (need === 0) return { key: "none", why: "your RTGs already cover the power" };
      const fit = Object.entries(c.SOLAR_ARRAYS).filter(([, a]) => a.power_1au >= need).sort((a, b) => a[1].power_1au - b[1].power_1au);
      return fit.length ? { key: fit[0][0], why: `it is the smallest array that powers ~${fmt(est)} W here with margin` }
        : { key: "giant", why: `even this is not enough this far from the Sun: also add RTGs in the Power tab` };
    }
    case "battery": {
      if (!ev) return null;
      const eh = d.orbit ? curOrbit().eclipse_h : 1, wh = eh * Math.max(0, ev.power.load + 40 - ev.power.rtg) / 0.6;
      const fit = Object.entries(c.BATTERIES).filter(([, b]) => b.wh >= wh * 1.1).sort((a, b) => a[1].wh - b[1].wh);
      return { key: fit.length ? fit[0][0] : "b8000", why: `the longest shadow lasts ${eh} h and you need ~${fmt(wh)} Wh stored` };
    }
    case "adcs": {
      const strict = Math.min(...d.instruments.map((k) => c.INSTRUMENTS[k].pointing_deg), ["xhga", "kahga"].includes(d.comms) ? 0.5 : 99, 99);
      const fit = Object.entries(c.ADCS).filter(([, a]) => a.pointing_deg <= strict && (!a.needs_magnetic || dest.magnetic));
      return { key: cheapest(fit.length ? fit : [["precision", c.ADCS.precision]])[0],
        why: strict < 99 ? `your most demanding part needs ${strict}° pointing` : "it is the cheapest option that works here" };
    }
    case "propulsion": {
      if (!d.orbit || !ev) return { key: "mono", why: "a reliable all-rounder" };
      const o = curOrbit(), dv = (o.dv_insert + o.dv_per_year * d.years) * 1.1;
      const dry = (ev.mass.dry ?? 0) - (ev.mass.tanks ?? 0) - (d.propulsion ? c.PROPULSION[d.propulsion].mass : 0);
      const opts = Object.entries(c.PROPULSION).map(([k, p]) => {
        if (!p.isp) return [k, o.dv_insert === 0 && o.max_years_no_prop >= d.years ? 0 : Infinity];
        const r = Math.exp(dv / (p.isp * 9.80665)) - 1, fuel = r * 0.08 >= 1 ? Infinity : ((dry + p.mass) * r) / (1 - 0.08 * r);
        return [k, p.max_prop && fuel > p.max_prop ? Infinity : p.mass + fuel * 1.08];
      }).sort((a, b) => a[1] - b[1]);
      return { key: opts[0][0], why: `engine + fuel is lightest for the ${fmt(dv)} m/s this mission needs` };
    }
    case "comms": {
      const need = ev ? ev.data.generated_gb_day : 1, g = d.ground || (dest.earth_au ? "dsn34" : "commercial");
      const okPoint = !d.adcs || c.ADCS[d.adcs].pointing_deg <= 0.5;
      const fit = Object.entries(c.COMMS).filter(([k]) => okPoint || !["xhga", "kahga"].includes(k));
      const good = fit.filter(([k]) => downlinkGb(k, g) >= need);
      if (good.length) return { key: cheapest(good)[0], why: `it sends home all ${fmt(need, 1)} Gb/day your instruments collect` };
      const best = fit.sort((a, b) => downlinkGb(b[0], g) - downlinkGb(a[0], g))[0];
      return { key: best[0], why: "it is the fastest link you can point" };
    }
    case "ground": {
      const need = ev ? ev.data.generated_gb_day : 1, x = d.comms || (dest.earth_au ? "xhga" : "xlga");
      const fit = Object.entries(c.GROUND).filter(([, g]) => dest.earth_au <= g.max_earth_au);
      const good = fit.filter(([k]) => downlinkGb(x, k) >= need);
      if (good.length) return { key: cheapest(good)[0], why: dest.earth_au ? "only the Deep Space Network can hear you this far, and it is enough" : "it gives enough contact time per day" };
      return { key: fit.sort((a, b) => downlinkGb(x, b[0]) - downlinkGb(x, a[0]))[0][0], why: "it collects the most data per day" };
    }
    case "computer": {
      const env = ev ? ev.radiation.env : dest.radiation, shield = d.bus === "flagship" ? 1 : 0, store = ev ? ev.data.storage_need_gb : 0;
      const fit = Object.entries(c.COMPUTERS).filter(([, x]) => x.rad + shield >= env && x.storage_gb >= store);
      return { key: cheapest(fit.length ? fit : [["radhard", c.COMPUTERS.radhard]])[0], why: `radiation here is ${c.RADIATION_LABEL[env].toLowerCase()}, and it survives that` };
    }
    case "launch_vehicle": {
      if (!ev || ev.mass.wet == null) return null;
      const tgt = curOrbit().lv_target, fit = Object.entries(c.LAUNCH_VEHICLES).filter(([, v]) => v.capacity[tgt] >= ev.mass.wet * 1.15);
      return fit.length ? { key: cheapest(fit)[0], why: `it is the cheapest rocket that lifts your ${fmt(ev.mass.wet)} kg with margin` }
        : { key: "sls", why: "nothing smaller can lift it; better cut mass" };
    }
  }
  return null;
}

function issueField(i) {
  const t = i.text;
  if (i.field) return i.field;
  return { launch: "launch_vehicle", propulsion: "propulsion", radiation: "computer", adcs: "adcs" }[i.area]
    || (i.area === "bus" ? (/slots/.test(t) ? "bus" : "bus") : null)
    || (i.area === "power" ? (/Battery|eclipse/i.test(t) ? "battery" : /RTG/.test(t) ? null : "solar") : null)
    || (i.area === "comms" ? (/high-gain/.test(t) ? "adcs" : /hear you/.test(t) ? "ground" : /Recorder/.test(t) ? "computer" : "comms") : null)
    || (i.area === "science" && /Required goal/.test(t) ? "instruments" : null);
}

// The next thing a Cadet should do: pick a missing part, or swap one that causes a problem.
function advisor() {
  const d = S.design, ev = S.ev;
  if (!ev) return null;
  for (const f of PICK_ORDER) {
    if (f === "instruments" ? !d.instruments.length : d[f] == null) {
      const r = recommend(f);
      if (r) return { ...r, field: f, action: "pick" };
    }
  }
  for (const sev of ["blocker", "warning"]) {
    for (const i of ev.issues.filter((x) => x.severity === sev)) {
      let f = issueField(i); if (!f) continue;
      let r = recommend(f);
      if (f === "solar" && r && r.key === d.solar && d.rtg < S.cat.RTG.max) {
        f = "rtg"; r = { key: d.rtg + 1, why: `sunlight is too weak here; each RTG adds ${S.cat.RTG.power} W, day and night` };
      }
      if (f === "rtg") return { ...r, field: f, action: "swap", issue: i };
      if (r && (f === "instruments" ? !d.instruments.includes(r.key) : d[f] !== r.key)) return { ...r, field: f, action: "swap", issue: i };
    }
  }
  return null;
}
const partName = (f, k) => (f === "rtg" ? `${S.cat.RTG.name} (${k} in total)` : optionsFor(f)[k].name);

function showSuggestion() {
  const a = S.advice; if (!a) return;
  S.tab = FIELD_TAB[a.field]; renderTabs(); renderBinder();
  const card = a.field === "rtg" ? $(".card.rtgcard") : document.querySelector(`.card[data-f="${a.field}"][data-k="${a.key}"]`);
  if (card) { card.scrollIntoView({ behavior: "smooth", block: "center" }); card.classList.remove("pulse"); void card.offsetWidth; card.classList.add("pulse"); }
  SFX.suggest();
}

function renderClient() {
  const c = CLIENTS[S.design.scenario];
  let mood = "neutral", text = `"${scen().story}"`;
  const ev = S.ev;
  if (S.introShown && ev) {
    const miss = ev.issues.filter((i) => i.area === "missing");
    const b = ev.issues.find((i) => i.severity === "blocker" && i.area !== "missing");
    const w = ev.issues.find((i) => i.severity === "warning");
    const lv = level(), a = S.advice;
    if (lv === "easy" && a) {
      mood = a.action === "pick" ? "neutral" : b ? "angry" : "neutral";
      const name = partName(a.field, a.key);
      text = a.action === "pick"
        ? `"Next we need ${FIELD_LABEL[a.field].toLowerCase()}. I suggest the ${name}: ${a.why}."`
        : `"${a.issue.text} Try the ${name}: ${a.why}."`;
    } else if (lv === "hard") {
      if (miss.length) { mood = "neutral"; text = `"The spacecraft is not complete yet."`; }
      else if (b) { mood = "angry"; text = `"This design does not meet our requirements."`; }
      else if (w) { mood = "neutral"; text = `"It meets the requirements. I still have concerns."`; }
      else { mood = "happy"; text = `"Requirements met. Proceed."`; }
    } else if (miss.length && !b) { mood = "neutral"; text = `"Good. ${miss.length} part${miss.length > 1 ? "s" : ""} still missing."`; }
    else if (b) { mood = "angry"; text = `"${b.text}" ${["Fix it before the board sees this.", "This will never fly.", "Try again."][b.text.length % 3]}`; }
    else if (w) { mood = "neutral"; text = `"It could fly, but: ${w.text.charAt(0).toLowerCase() + w.text.slice(1)}"`; }
    else { mood = "happy"; text = `"Excellent work. I can take this design to the board."`; }
  }
  const key = `${S.design.scenario}:${mood}`;
  if (renderClient._k !== key) { $("#clientImg").src = portrait(c.look, mood); renderClient._k = key; }
  $("#boothPlanet").src = planet(PLANET_OF[destKey()], 48);
  $("#clientName").textContent = `${c.name} · ${c.org}`;
  $("#speech").textContent = text;
}

function renderRequest() {
  const s = scen(), ev = S.ev;
  $("#reqId").textContent = `FILE ${ORDER.indexOf(S.design.scenario) + 1}-${s.destination.toUpperCase().slice(0, 3)}`;
  $("#reqGoals").innerHTML = s.goals.map((g, i) => {
    const G = ev ? ev.science.goals[i] : null, f = G ? G.fraction : 0;
    const cls = f >= 1 ? "" : f >= 0.5 ? "warn" : "bad";
    return `<div class="goal">${icon(G && G.met ? "check" : g.required ? "star" : "none", 14)}
      <span class="gl">${esc(g.label)}${g.required ? " *" : ""}</span>
      <div class="bar gbar ${cls}"><i style="width:${Math.min(100, f * 100)}%"></i><span class="mark" style="left:50%"></span></div>
      <small>${pct(f)}</small></div>`;
  }).join("") + `<div class="req-small">* required: needs at least 50%</div>`;
  $("#reqBudget").textContent = `${fmt(s.budget * S.cat.DIFFICULTY[S.design.difficulty].budget_mult)} M$`;
  $("#reqYears").textContent = `${S.design.years} yr`;
  const o = S.cat.ORBITS[destKey()][S.design.orbit];
  $("#reqCruise").textContent = `Scientists ask for ${s.min_years}+ years. ` + (!o ? "Cruise time depends on the orbit." : o.cruise_years ? `Plus ${o.cruise_years} yr cruise first.` : "Science starts right after launch.");
  $("#yearsDown").disabled = !canEdit("years"); $("#yearsUp").disabled = !canEdit("years");
}

function renderTabs() {
  $("#tabs").innerHTML = TABS.map((t) => {
    const locked = S.mode === "team" && !S.myRoles.includes(t.role);
    const todo = t.fields.some((f) => f !== "rtg" && (f === "instruments" ? !S.design.instruments.length : S.design[f] == null));
    return `<div class="tab ${t.id === S.tab ? "on" : ""} ${locked ? "locked" : ""}" data-tab="${t.id}">${icon(locked ? "lock" : t.icon, 14)}${t.label}${todo ? '<span class="todo" title="still to choose"></span>' : ""}</div>`;
  }).join("");
  $$("#tabs .tab").forEach((el) => el.onclick = () => { if (S.tab !== el.dataset.tab) SFX.page(); S.tab = el.dataset.tab; renderTabs(); renderBinder(); });
}

function optionsFor(field) {
  const c = S.cat;
  return { launch_vehicle: c.LAUNCH_VEHICLES, orbit: c.ORBITS[destKey()], bus: c.BUSES, solar: c.SOLAR_ARRAYS,
    battery: c.BATTERIES, adcs: c.ADCS, propulsion: c.PROPULSION, comms: c.COMMS, ground: c.GROUND,
    computer: c.COMPUTERS, instruments: c.INSTRUMENTS }[field];
}

function statLine(field, k, o) {
  const c = S.cat, dest = c.DESTINATIONS[destKey()];
  const tgt = curOrbit().lv_target;
  switch (field) {
    case "launch_vehicle": return `${fmt(o.capacity[tgt])} kg to ${c.LV_TARGET_LABEL[tgt]} · ${fmt(o.cost)} M$`;
    case "orbit": return `Δv ${o.dv_insert} m/s · covers ${pct(o.coverage)} · shadow ${o.eclipse_h} h`;
    case "bus": return `holds ${fmt(o.max_dry)} kg · ${o.slots} slots · ${o.mass} kg · ${o.cost} M$`;
    case "solar": return `${fmt(o.power_1au)} W at Earth, ${fmt(o.power_1au / dest.sun_au ** 2)} W here · ${o.mass} kg · ${o.cost} M$`;
    case "battery": return `${fmt(o.wh)} Wh · ${o.mass} kg · ${o.cost} M$`;
    case "adcs": return `${o.pointing_deg}° pointing · ${o.mass} kg · ${o.power} W · ${o.cost} M$`;
    case "propulsion": return o.isp ? `Isp ${o.isp} s · ${o.mass} kg · ${o.cost} M$` : "0 kg · 0 M$";
    case "comms": return `up to ${o.max_mbps} Mbps · ${o.mass} kg · ${o.power} W · ${o.cost} M$`;
    case "ground": return `${o.hours} h/day · signal x${o.gain} · ${o.cost_year} M$/yr`;
    case "computer": return `${o.storage_gb} GB · radiation lvl ${o.rad} · ${o.cost} M$`;
    case "instruments": return `${o.mass} kg · ${o.power} W · ${o.data_mbps} Mbps · ${o.cost} M$`;
  }
  return "";
}

function cardBad(field, k, o) {
  const c = S.cat, dest = c.DESTINATIONS[destKey()], tgt = curOrbit().lv_target;
  if (field === "launch_vehicle") return !o.capacity[tgt] || (S.ev && S.design.orbit && S.ev.mass.wet > o.capacity[tgt]);
  if (field === "adcs") return o.needs_magnetic && !dest.magnetic;
  if (field === "ground") return dest.earth_au > o.max_earth_au;
  return false;
}

function renderBinder() {
  const tab = TABS.find((t) => t.id === S.tab);
  const locked = S.mode === "team" && !S.myRoles.includes(tab.role);
  const goalTags = new Set(scen().goals.map((g) => g.tag));
  let h = locked ? `<div class="lock-banner">${icon("lock")} Classified: this section belongs to the ${S.cat.ROLES[tab.role].name}. You can read it but not change it.</div>` : "";
  h += `<p class="hint">${esc(tab.hint)}</p>`;
  for (const field of tab.fields) {
    h += `<h4>${FIELD_LABEL[field]}</h4>`;
    if (field === "rtg") {
      const R = S.cat.RTG;
      h += `<div class="cards"><div class="card rtgcard ${S.design.rtg ? "sel" : ""} ${S.advice && S.advice.field === "rtg" ? "suggest" : ""}" style="cursor:default">
        <div class="ci">${icon("rtg", 32)}</div><div class="cn">${esc(R.name)}</div>
        <div class="cs">${R.power} W each · ${R.mass} kg · ${R.cost} M$</div>
        <div class="stepper"><button class="btn tiny" data-rtg="-1" ${canEdit("rtg") ? "" : "disabled"}>-</button>
        <b>${S.design.rtg} / ${R.max}</b><button class="btn tiny" data-rtg="1" ${canEdit("rtg") ? "" : "disabled"}>+</button></div>
        <div class="cl">${esc(R.learn)}</div></div></div>`;
      continue;
    }
    const opts = optionsFor(field);
    h += `<div class="cards">` + Object.entries(opts).map(([k, o]) => {
      const sel = field === "instruments" ? S.design.instruments.includes(k) : S.design[field] === k;
      const tags = field === "instruments" ? `<div class="tagrow">${o.tags.map((t) => `<span class="tag ${goalTags.has(t) ? "hit" : ""}">${t}</span>`).join("")}</div>` : "";
      const sug = S.advice && S.advice.field === field && S.advice.key === k;
      return `<div class="card ${sel ? "sel" : ""} ${level() !== "hard" && cardBad(field, k, o) ? "bad" : ""} ${sug ? "suggest" : ""} ${locked ? "disabled" : ""}" data-f="${field}" data-k="${k}">
        <div class="ci">${icon(PART_ICON[field](k), 32)}</div>
        <div class="cn">${esc(o.name)}</div><div class="cs">${statLine(field, k, o)}</div>${tags}
        ${o.learn ? `<div class="cl">${esc(o.learn)}</div>` : ""}</div>`;
    }).join("") + `</div>`;
  }
  const binder = $("#binder"), top = binder.scrollTop;
  binder.innerHTML = h;
  binder.scrollTop = top;
  $$("#binder .card[data-f]").forEach((el) => el.onclick = () => {
    const f = el.dataset.f, k = el.dataset.k;
    if (f === "instruments") {
      const cur = S.design.instruments;
      setField(f, cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]);
    } else setField(f, k);
  });
  $$("#binder [data-rtg]").forEach((b) => b.onclick = () =>
    setField("rtg", Math.max(0, Math.min(S.cat.RTG.max, S.design.rtg + Number(b.dataset.rtg)))));
}

function meter(ic, label, frac, val, state, mark) {
  if (level() === "hard") { state = ""; mark = null; } // Flight Director: raw numbers only, judge them yourself
  return `<div class="meter">${icon(ic)}<span class="lbl">${label}</span>
    <div class="bar ${state}"><i style="width:${Math.max(0, Math.min(100, frac * 100))}%"></i>${mark != null ? `<span class="mark" style="left:${mark * 100}%"></span>` : ""}</div>
    <span class="val">${val}</span></div>`;
}

function renderReview() {
  const ev = S.ev, m = ev.mass, p = ev.power, d = ev.data, c = ev.cost, req = S.cat.DIFFICULTY[S.design.difficulty].margin_req;
  const mf = m.capacity ? (m.wet ?? Infinity) / m.capacity : 1;
  const pf = p.generation ? p.load / p.generation : 1;
  const D = S.design, battBad = D.battery && p.eclipse_need_wh > p.battery_usable_wh;
  const pending = (ic, label, need) => meter(ic, label, 0, `needs ${need}`, "", null);
  $("#meters").innerHTML =
    (!D.launch_vehicle || !D.orbit ? pending("weight", "MASS", !D.orbit ? "orbit" : "rocket") :
      meter("weight", "MASS", mf, m.capacity ? `${fmt(m.wet)}/${fmt(m.capacity)} kg` : "can't reach",
        mf > 1 ? "bad" : m.margin < req ? "warn" : "", 1 - req)) +
    (D.solar == null && !D.rtg ? pending("bolt", "POWER", "solar") :
      meter("bolt", "POWER", pf, `${fmt(p.load)}/${fmt(p.generation)} W`, pf > 1 ? "bad" : p.margin < 0.2 ? "warn" : "", 1 / 1.2)) +
    (!D.battery || !D.orbit ? pending("battery", "ECLIPSE", !D.orbit ? "orbit" : "battery") :
      meter("battery", "ECLIPSE", p.battery_usable_wh ? p.eclipse_need_wh / p.battery_usable_wh : 1,
        `${fmt(p.eclipse_need_wh)}/${fmt(p.battery_usable_wh)} Wh`, battBad ? "bad" : "")) +
    (!D.instruments.length || !D.comms || !D.ground ? pending("disk", "DATA", !D.instruments.length ? "instr." : !D.comms ? "antenna" : "ground") :
      meter("disk", "DATA", d.return, `${pct(d.return)} home`, d.return < 0.5 ? "bad" : d.return < 0.8 ? "warn" : "", 0.8)) +
    meter("coin", "COST", c.total / c.budget, `${fmt(c.total)}/${fmt(c.budget)} M$`,
      c.total > c.budget && !S.design.sandbox ? "bad" : c.reserve < 0.1 ? "warn" : "", 0.9) +
    meter("star", "SCIENCE", ev.science.score / 100, `${fmt(ev.science.score)} / 100`, ev.science.score < 40 ? "bad" : ev.science.score < 70 ? "warn" : "", 0.7);
  const lvH = level() === "hard", cell = (ic, v, st) => `<span class="ms ${lvH ? "" : st}">${icon(ic, 12)}${v}</span>`;
  $("#mStatus").innerHTML =
    cell("weight", D.launch_vehicle && D.orbit && m.capacity ? pct(mf) : "-", mf > 1 ? "bad" : m.margin < req ? "warn" : "") +
    cell("bolt", D.solar != null || D.rtg ? pct(pf) : "-", pf > 1 ? "bad" : p.margin < 0.2 ? "warn" : "") +
    cell("disk", D.instruments.length && D.comms && D.ground ? pct(d.return) : "-", d.return < 0.5 ? "bad" : d.return < 0.8 ? "warn" : "") +
    cell("coin", `${fmt(c.total)}/${fmt(c.budget)}`, c.total > c.budget && !D.sandbox ? "bad" : c.reserve < 0.1 ? "warn" : "") +
    cell("star", fmt(ev.science.score), ev.science.score < 40 ? "bad" : ev.science.score < 70 ? "warn" : "");
  const nb = ev.issues.filter((i) => i.severity === "blocker").length;
  $("#revStatus").innerHTML = nb ? (level() === "hard" ? `${icon("block", 12)} NOT READY` : `${icon("block", 12)} ${nb} BLOCKER${nb > 1 ? "S" : ""}`) : `${icon("check", 12)} FLIGHT READY`;
  const ICON_OF = { blocker: "block", warning: "warn", info: "info" };
  const lv = level(), a = S.advice;
  let html = "";
  if (lv === "easy" && a) {
    html += `<div class="advice">${icon("star")}<span><b>NEXT STEP:</b> ${a.action === "pick" ? `pick ${esc(FIELD_LABEL[a.field].toLowerCase())}` : `fix "${esc(a.issue.text)}"`}.
      Suggested: <b>${esc(partName(a.field, a.key))}</b>, because ${esc(a.why)}.</span><button class="btn small" id="showMe">Show me</button></div>`;
  }
  if (lv === "hard") {
    const miss = ev.issues.filter((i) => i.area === "missing").length, nb = ev.issues.filter((i) => i.severity === "blocker" && i.area !== "missing").length;
    const nw = ev.issues.filter((i) => i.severity === "warning").length;
    html += miss ? `<div class="issue">${icon("block")}<span>Spacecraft incomplete.</span></div>` : "";
    html += nb ? `<div class="issue">${icon("block")}<span>The design does not meet requirements.</span></div>` : "";
    html += nw ? `<div class="issue">${icon("warn")}<span>Reviewers have concerns.</span></div>` : "";
    html += !miss && !nb && !nw ? `<div class="issue">${icon("check")}<span>All requirements met.</span></div>` : "";
    html += `<div class="req-small">Flight Director rules: the board does not explain itself. Check the numbers.</div>`;
  } else {
    html += ev.issues.length ? ev.issues.map((i, n) =>
      `<div class="issue" data-n="${n}">${icon(ICON_OF[i.severity])}<span>${esc(i.text)}</span><span class="why">${esc(i.why)}</span></div>`).join("")
      : `<div class="issue">${icon("check")}<span>No findings. Nice, clean design.</span></div>`;
  }
  $("#issues").innerHTML = html;
  $$("#issues .issue[data-n]").forEach((el) => el.onclick = () => { SFX.paper(); el.classList.toggle("open"); });
  if ($("#showMe")) $("#showMe").onclick = showSuggestion;
  $("#bpLabel").textContent = S.design.bus ? `${S.cat.BUSES[S.design.bus].name} · dry ${fmt(m.dry)} kg · fuel ${fmt(m.propellant)} kg · Δv ${fmt(m.dv)} m/s` : "";
  const ready = ev.ok && (S.mode !== "team" || Object.values(S.approvals).every(Boolean));
  $("#launchBtn").textContent = S.mode === "team" ? "Launch" : "Approve & launch";
  $("#launchBtn").disabled = S.mode === "team" && !ready;
}

function renderApprovals() {
  const el = $("#approvals");
  if (S.mode !== "team") { el.innerHTML = ""; return; }
  el.innerHTML = Object.entries(S.cat.ROLES).map(([k, r]) => {
    const mine = S.myRoles.includes(k), on = S.approvals[k];
    return `<div class="appr ${mine ? "mine" : ""} ${on ? "on" : ""}" data-role="${k}" title="${esc(r.name)}">${on ? "OK<br>" : ""}${r.name.split(" ")[0]}</div>`;
  }).join("");
  $$("#approvals .appr.mine").forEach((a) => a.onclick = async () => {
    if (!S.ev.ok && !S.approvals[a.dataset.role]) return toast(`${icon("block")} Fix all blockers before approving.`);
    if (!S.approvals[a.dataset.role]) SFX.thud();
    try { applyRoom(await api(`room/${S.room}/approve`, { player: S.player, role: a.dataset.role, value: !S.approvals[a.dataset.role] })); }
    catch (e) { toast(esc(e.message)); }
  });
}

// ---------------------------------------------------------------------------- blueprint (spacecraft drawing)
function drawBlueprint() {
  const cv = $("#bp"), g = cv.getContext("2d"), W = cv.width, H = cv.height, d = S.design;
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  r(0, 0, W, H, "#1d3a5e");
  for (let x = 0; x < W; x += 10) r(x, 0, 1, H, "rgba(156,192,234,.15)");
  for (let y = 0; y < H; y += 10) r(0, y, W, 1, "rgba(156,192,234,.15)");
  const L = "#dce9f8", M = "#9cc0ea", D = "#5b86b8";
  let empty = $(".blueprint .bp-empty");
  if (!d.bus) {
    if (!empty) { empty = document.createElement("div"); empty.className = "bp-empty"; $(".blueprint").appendChild(empty); }
    empty.textContent = "No bus selected. Pick one in the BUS tab.";
    $("#bpSlots").textContent = d.instruments.length ? `${d.instruments.length} instrument(s) waiting for a bus` : "Empty drawing board";
    return;
  }
  if (empty) empty.remove();
  const cx = 100, cy = 58, s = { cubesat: 12, smallsat: 20, medium: 28, flagship: 36 }[d.bus];
  const wing = { none: 0, body: 0, small: 18, medium: 28, large: 40, giant: 56 }[d.solar] || 0;
  if (wing) {
    const ph = Math.max(10, s * 0.6);
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? cx - s / 2 - 4 - wing : cx + s / 2 + 4;
      r(side < 0 ? cx - s / 2 - 4 : cx + s / 2, cy - 1, 4, 2, M);
      r(x0, cy - ph / 2, wing, ph, D); r(x0, cy - ph / 2, wing, 1, L); r(x0, cy + ph / 2 - 1, wing, 1, L);
      r(x0, cy - ph / 2, 1, ph, L); r(x0 + wing - 1, cy - ph / 2, 1, ph, L);
      for (let x = x0 + 5; x < x0 + wing - 2; x += 5) r(x, cy - ph / 2, 1, ph, M);
    }
  }
  if (d.instruments.includes("mag")) { for (let i = 0; i < 34; i += 2) r(cx - s / 2 - i * 0.8, cy - s / 2 - i, 1, 1, L); r(cx - s / 2 - 29, cy - s / 2 - 36, 3, 3, "#f0a0b8"); }
  for (let k = 0; k < d.rtg; k++) { const x = cx + s / 2 + 3 + k * 6; r(x, cy + s / 2, 4, 10, M); r(x - 1, cy + s / 2 + 2, 6, 1, L); r(x - 1, cy + s / 2 + 6, 6, 1, L); }
  // bus box
  r(cx - s / 2, cy - s / 2, s, s, "#c9a24a"); r(cx - s / 2, cy - s / 2, s, 1, L); r(cx - s / 2, cy + s / 2 - 1, s, 1, L);
  r(cx - s / 2, cy - s / 2, 1, s, L); r(cx + s / 2 - 1, cy - s / 2, 1, s, L);
  if (d.solar === "body") r(cx - s / 2 + 1, cy - s / 2 + 1, s - 2, s / 3, D);
  // antenna
  const top = cy - s / 2;
  if (d.comms === "xhga" || d.comms === "kahga") {
    const R = d.comms === "xhga" ? 10 : 15;
    r(cx, top - 5, 1, 5, M);
    for (let x = -R; x <= R; x++) r(cx + x, top - 6 - R * 0.55 + (x * x) / (R * 1.8), 1, 1, L);
    r(cx, top - 6 - R * 0.6, 1, R * 0.6, M);
  } else if (d.comms === "xlga") { r(cx + s / 4, top - 8, 1, 8, L); r(cx + s / 4 - 1, top - 9, 3, 2, L); }
  else r(cx - 2, top - 2, 5, 2, L);
  if (d.propulsion && d.propulsion !== "none") {
    const nw = { coldgas: 2, mono: 4, biprop: 7 }[d.propulsion], b = cy + s / 2;
    for (let i = 0; i < nw + 2; i++) r(cx - nw / 2 - i / 2, b + i, nw + i, 1, M);
  }
  const COL = { imaging: "#7fd0f5", thermal: "#ff9a6b", climate: "#b6dd8a", composition: "#c48ee0", water: "#6fe0ec",
    topography: "#ffd96b", subsurface: "#a9bac4", fields: "#f07fa0" };
  d.instruments.forEach((k, i) => {
    const o = S.cat.INSTRUMENTS[k], n = d.instruments.length, x = cx - s / 2 + ((i + 1) * s) / (n + 1);
    r(x - 1, cy + s / 2 - 5, 3, 3, COL[o.tags[0]] || L);
  });
  const free = S.cat.BUSES[d.bus].slots - d.instruments.length;
  $("#bpSlots").textContent = free >= 0 ? `${free} free instrument slot(s)` : `${-free} instrument(s) too many!`;
}

// ---------------------------------------------------------------------------- desk wiring
function wireDesk() {
  $("#yearsDown").onclick = () => setField("years", Math.max(1, S.design.years - 1));
  $("#yearsUp").onclick = () => setField("years", Math.min(12, S.design.years + 1));
  $("#riskBtn").onclick = async () => {
    if (!S.ev || !S.ev.ok) return toast(`${icon("block")} Fix the blockers first: a design that can't launch has no risk profile.`);
    $("#riskBtn").disabled = true;
    try {
      const r = await api("risk", { design: S.design });
      toast(`${icon("clock")} 200 simulated missions: ${pct(r.success_rate)} full success. Science median ${fmt(r.science_median)}, worst 10% ${fmt(r.science_p10)}.`, 5000);
    } finally { $("#riskBtn").disabled = false; }
  };
  $("#launchBtn").onclick = doLaunch;
  $("#helpBtn").onclick = () => startTutorial(false);
  $("#tutNext").onclick = () => tutAdvance();
  $("#tutSkip").onclick = () => endTutorial(true);
  $("#menuBtn").onclick = () => { SFX.page(); $("#mMsg").textContent = ""; soundLabel(); $("#menu").classList.remove("hidden"); };
  $("#mResume").onclick = () => $("#menu").classList.add("hidden");
  $("#mHints").onclick = () => { $("#menu").classList.add("hidden"); openHints(); };
  $("#mTutorial").onclick = () => { $("#menu").classList.add("hidden"); endTutorial(false); startTutorial(S.mode !== "team"); };
  $("#mSound").onclick = () => { store.set("sound", !store.get("sound", true)); soundLabel(); };
  $("#hbClose").onclick = () => $("#hints").classList.add("hidden");
  $("#mQuit").onclick = () => { $("#menu").classList.add("hidden"); endTutorial(false); stopPoll(); S.room = null; show("title"); };
  $("#mReset").onclick = () => {
    $("#menu").classList.add("hidden");
    const dflt = { ...S.cat.BLANK[S.design.scenario], instruments: [], difficulty: S.design.difficulty, sandbox: S.design.sandbox };
    if (S.mode === "team") return toast("Clearing is disabled in team rooms.");
    S.design = dflt; renderAll(); evaluateSoon();
  };
  $("#mExport").onclick = async () => {
    const code = btoa(JSON.stringify(S.design));
    try { await navigator.clipboard.writeText(code); $("#mMsg").textContent = "Design code copied to clipboard."; }
    catch { prompt("Copy this design code:", code); }
  };
  $("#mImport").onclick = () => {
    const code = prompt("Paste a design code:");
    if (!code) return;
    try {
      const d = JSON.parse(atob(code.trim()));
      if (!S.cat.SCENARIOS[d.scenario]) throw new Error();
      if (S.mode === "team") return toast("Import is disabled in team rooms.");
      $("#menu").classList.add("hidden"); S.design = { ...S.cat.BLANK[d.scenario], ...d }; renderAll(); evaluateSoon(0);
    } catch { $("#mMsg").textContent = "That is not a valid design code."; }
  };
}

// A rubber stamp drops onto the blueprint, thumps, leaves an ink mark and lifts away (Papers, Please style).
function stampAnim(kind) {
  return new Promise((done) => {
    const tool = $("#stampTool"), bp = $(".blueprint"), col = $(".col-right"), mark = $("#stampMark");
    tool.src = stampTool(kind === "ok" ? "#4f7a34" : "#a8322a");
    const r = bp.getBoundingClientRect(), dr = $("#desk").getBoundingClientRect(), k = S.scale || 1;
    void col;
    tool.style.left = `${(r.left - dr.left + r.width / 2) / k - 48}px`;
    tool.style.top = `${(r.top - dr.top + r.height / 2) / k - 112}px`;
    mark.classList.add("hidden");
    tool.className = "px stamp-tool"; void tool.offsetWidth; tool.classList.add("down");
    setTimeout(() => {
      mark.className = `stamp-mark ${kind}`; mark.textContent = kind === "ok" ? "APPROVED" : "REJECTED";
      mark.style.setProperty("--rot", `${-17 + Math.random() * 10}deg`);
      const desk = $("#desk"); desk.classList.remove("shake"); void desk.offsetWidth; desk.classList.add("shake");
      SFX.thud();
    }, 160);
    setTimeout(() => { tool.className = "px stamp-tool up"; }, 330);
    setTimeout(() => { tool.className = "px stamp-tool hidden"; done(); }, 680);
  });
}

async function doLaunch() {
  if (!S.ev || S.stamping) return;
  S.stamping = true;
  try {
    if (!S.ev.ok) {
      await stampAnim("no");
      SFX.error();
      S.introShown = true; renderClient();
      return toast(level() === "hard" ? `${icon("block")} Rejected. The design does not meet requirements.`
        : `${icon("block")} The review board rejects the design. Open the blockers on the review sheet to see why.`);
    }
    $("#launchBtn").disabled = true;
    const name = `${scen().name}${S.player ? ` (${S.player})` : ""}`;
    const req = api("launch", { design: S.design, name, player: S.player, save: !S.noSave, room: S.mode === "team" ? S.room : undefined });
    await stampAnim("ok");
    const res = await req;
    S.lastRunSeen = res.seed;
    await wait(500);
    playLaunch(res);
  } catch (e) { toast(esc(e.message)); $("#launchBtn").disabled = false; }
  finally { S.stamping = false; }
}

// ---------------------------------------------------------------------------- engineer's handbook (hints per stage)
function soundLabel() { $("#mSound").textContent = `Sound: ${store.get("sound", true) ? "on" : "off"}`; }
const STAGE_AREAS = { launch: ["launch"], orbit: ["schedule"], bus: ["bus"], power: ["power"], adcs: ["adcs"],
  prop: ["propulsion"], comms: ["comms"], computer: ["radiation"], instr: ["science"], review: ["cost"] };
const STAGES = () => [...TABS, { id: "review", label: "Review & launch", icon: "check", fields: [],
  hint: "The review board only approves a design with zero blockers. Warnings are allowed but cost points." }];

function stageIssues(st) {
  if (!S.ev) return [];
  return S.ev.issues.filter((i) => (i.field && st.fields.includes(i.field)) || (STAGE_AREAS[st.id] || []).includes(i.area)
    || (st.id === "review" && i.severity === "blocker" && i.area !== "missing"));
}

function openHints(stageId) {
  const stages = STAGES();
  stageId = stageId || (S.tab && stages.find((x) => x.id === S.tab) ? S.tab : "orbit");
  $("#hbMission").textContent = `${scen().name.toUpperCase()} · ${S.cat.DESTINATIONS[destKey()].name.toUpperCase()}`;
  $("#hbNav").innerHTML = stages.map((st) => {
    const iss = stageIssues(st), worst = iss.some((i) => i.severity === "blocker") ? "block" : iss.some((i) => i.severity === "warning") ? "warn" : "check";
    return `<div class="${st.id === stageId ? "on" : ""}" data-s="${st.id}">${icon(st.icon, 14)}${st.label}${level() === "hard" ? "" : `<span class="st">${icon(worst, 12)}</span>`}</div>`;
  }).join("");
  $$("#hbNav [data-s]").forEach((el) => (el.onclick = () => openHints(el.dataset.s)));
  const st = stages.find((x) => x.id === stageId);
  const chosen = st.fields.filter((f) => f !== "rtg").map((f) => {
    const v = S.design[f];
    const name = f === "instruments" ? (v.length ? v.map((k) => S.cat.INSTRUMENTS[k].name).join(", ") : null) : v ? optionsFor(f)[v].name : null;
    return `<div class="line">${icon(name ? "check" : "none", 14)}<span>${FIELD_LABEL[f]}: ${name ? esc(name) : "<i>not chosen yet</i>"}</span></div>`;
  }).join("");
  const iss = stageIssues(st);
  const ICON_OF = { blocker: "block", warning: "warn", info: "info" };
  $("#hbBody").innerHTML = `
    <h4>${esc(st.label)}: what this stage is about</h4><p>${esc(st.hint)}</p>
    ${level() === "easy" ? `<h4>Tips for this mission</h4><ul>${stageTips(st.id).map((t) => `<li>${t}</li>`).join("")}</ul>`
      : `<p class="req-small">Mission-specific tips are only given at Cadet level.</p>`}
    <h4>Your design right now</h4>${chosen}
    ${level() === "hard" ? `<div class="line">${icon(iss.some((i) => i.severity === "blocker") ? "block" : "check", 14)}<span>${iss.some((i) => i.severity === "blocker") ? "This stage does not meet requirements." : "No objections from the board."}</span></div>`
      : iss.length ? iss.map((i) => `<div class="line">${icon(ICON_OF[i.severity], 14)}<span><b>${esc(i.text)}</b> ${esc(i.why)}</span></div>`).join("")
      : `<div class="line">${icon("check", 14)}<span>No problems in this stage.</span></div>`}
    ${st.id !== "review" ? `<p><button class="btn small" id="hbGo">Open the ${esc(st.label)} tab</button></p>` : ""}`;
  const goBtn = $("#hbGo");
  if (goBtn) goBtn.onclick = () => { $("#hints").classList.add("hidden"); S.tab = st.id; renderTabs(); renderBinder(); };
  $("#hints").classList.remove("hidden");
}

function stageTips(id) {
  const c = S.cat, ev = S.ev, d = S.design, sc = scen(), dest = c.DESTINATIONS[destKey()], orbits = c.ORBITS[destKey()];
  const orb = d.orbit ? orbits[d.orbit] : null, T = [];
  const names = (arr) => arr.map((x) => `<b>${esc(x)}</b>`).join(", ");
  const life = (orb ? orb.cruise_years : 0) + d.years;
  const dryParts = ev && ev.mass.dry != null && ev.mass.tanks != null ? ev.mass.dry - ev.mass.tanks : null;
  switch (id) {
    case "launch": {
      if (!orb) { T.push("Pick an orbit first: how much a rocket can lift depends on where it has to go."); break; }
      const wet = ev && ev.mass.wet, tgt = orb.lv_target;
      if (wet == null) T.push("Your propellant need is impossible with the current engine. Fix propulsion first.");
      else {
        const fit = Object.values(c.LAUNCH_VEHICLES).filter((v) => v.capacity[tgt] >= wet * 1.15).sort((a, b) => a.cost - b.cost);
        T.push(`Fully fuelled, your spacecraft weighs about <b>${fmt(wet)} kg</b> (parts chosen so far).`);
        T.push(fit.length ? `Rockets that lift it to ${c.LV_TARGET_LABEL[tgt]} with 15% margin, cheapest first: ${names(fit.map((v) => `${v.name} (${v.cost} M$)`))}.`
          : "No rocket can lift it with margin. Cut mass: smaller bus, fewer instruments, or a more efficient engine (less fuel).");
      }
      T.push("Launch is often 20-40% of a mission's cost: the cheapest rocket that fits is usually the right one.");
      break;
    }
    case "orbit": {
      const score = (o) => sc.goals.reduce((a, g) => a + g.weight * (o.science[g.tag] || 0), 0) / sc.goals.reduce((a, g) => a + g.weight, 0);
      const ranked = Object.values(orbits).sort((a, b) => score(b) * (0.6 + 0.4 * b.coverage) - score(a) * (0.6 + 0.4 * a.coverage));
      T.push(`Best science for these goals: <b>${esc(ranked[0].name)}</b> (science x${score(ranked[0]).toFixed(2)}, covers ${pct(ranked[0].coverage)}).`);
      const cheap = Object.values(orbits).sort((a, b) => a.dv_insert - b.dv_insert)[0];
      T.push(`Least fuel to reach: <b>${esc(cheap.name)}</b> (Δv ${cheap.dv_insert} m/s). Every 1000 m/s costs roughly 30-50% extra mass in propellant.`);
      const short = Object.values(orbits).filter((o) => o.max_years_no_prop < sc.min_years);
      if (short.length) T.push(`These orbits decay or drift within the mission without engine burns: ${names(short.map((o) => o.name))}.`);
      if (Object.values(orbits).some((o) => o.cruise_years)) T.push("Cruise years count toward ageing and operations cost, but produce no science.");
      break;
    }
    case "instr": {
      sc.goals.forEach((g) => {
        const fits = Object.values(c.INSTRUMENTS).filter((i) => i.tags.includes(g.tag)).sort((a, b) => b.value - a.value);
        T.push(`${g.required ? "<b>Required</b> " : ""}${esc(g.label)} (needs ${g.target} pts): ${names(fits.map((i) => `${i.name} ${i.value} pts, ${i.cost} M$`))}.`);
      });
      T.push("Points shrink with a poor orbit, shaky pointing or data that never reaches Earth. A goal saturates at 100%: extra instruments for a full goal are wasted.");
      break;
    }
    case "bus": {
      const n = d.instruments.length;
      T.push(n ? `You carry ${n} instrument(s), so you need at least ${n} slot(s).` : "Choose instruments first: they decide how many slots you need.");
      if (dryParts != null && dryParts > 0) {
        const fits = Object.values(c.BUSES).filter((b) => b.slots >= n && b.max_dry >= (dryParts - (d.bus ? c.BUSES[d.bus].mass : 0)) * 1.3 + b.mass).sort((a, b) => a.cost - b.cost);
        T.push(fits.length ? `Buses that fit your parts with room to spare, cheapest first: ${names(fits.map((b) => `${b.name} (${b.cost} M$)`))}.` : "Your parts are too heavy for any bus. Remove something heavy.");
      }
      if (destKey() === "europa") T.push("Only the flagship bus has a radiation vault (+1 tolerance). That matters a lot at Jupiter.");
      break;
    }
    case "power": {
      const sunF = 1 / dest.sun_au ** 2, deg = (1 - (destKey() === "europa" ? 0.04 : 0.02)) ** life;
      T.push(`Sunlight here is <b>${pct(sunF)}</b> of Earth's and panels lose ~${destKey() === "europa" ? 4 : 2}% per year (${pct(deg)} left at end of mission).`);
      if (ev && ev.power.load) {
        const rtgW = ev.power.rtg, ef = orb ? orb.eclipse_frac : 0.35, need = Math.max(0, (ev.power.load - rtgW) * 1.25 / (1 - ef) / sunF / deg);
        const arr = Object.values(c.SOLAR_ARRAYS).filter((a) => a.power_1au >= need && a.power_1au > 0).sort((a, b) => a.power_1au - b.power_1au)[0];
        T.push(`Your parts draw about <b>${fmt(ev.power.load)} W</b> on average. ` + (need === 0 ? "Your RTGs already cover it." : arr
          ? `Smallest array with ~25% margin: <b>${esc(arr.name)}</b>.` : `Even the biggest array is not enough here: add RTGs (${c.RTG.power} W each, ${c.RTG.cost} M$).`));
        if (orb) {
          const wh = orb.eclipse_h * Math.max(0, ev.power.load - rtgW) / 0.6, b = Object.values(c.BATTERIES).filter((x) => x.wh >= wh * 1.1).sort((a, b) => a.wh - b.wh)[0];
          T.push(`Longest shadow: ${orb.eclipse_h} h, so the battery must store ~${fmt(wh)} Wh. ` + (b ? `Smallest that works: <b>${esc(b.name)}</b>.` : "No single battery is big enough: reduce power draw or add RTGs."));
        }
      } else T.push("Choose parts first: the power you need is the sum of everything on board.");
      break;
    }
    case "adcs": {
      if (!dest.magnetic) T.push(`<b>Magnetorquers will not work</b> at ${esc(dest.name)}: there is no strong magnetic field to push against.`);
      const strict = Math.min(...d.instruments.map((k) => c.INSTRUMENTS[k].pointing_deg), ["xhga", "kahga"].includes(d.comms) ? 0.5 : 99);
      if (isFinite(strict) && strict < 99) {
        const ok = Object.values(c.ADCS).filter((a) => a.pointing_deg <= strict && (!a.needs_magnetic || dest.magnetic)).sort((a, b) => a.cost - b.cost);
        T.push(`Your most demanding part needs <b>${strict}°</b> pointing. Systems that deliver it: ${names(ok.map((a) => `${a.name} (${a.pointing_deg}°)`))}.`);
      } else T.push("Pick instruments and an antenna first: they decide how steady the pointing must be.");
      T.push("Pointing worse than an instrument needs blurs its data: it still works, but scores fewer points.");
      break;
    }
    case "prop": {
      const dv = ev ? ev.mass.dv : 0;
      if (!orb) { T.push("Pick an orbit first: it decides how much velocity change (Δv) you need."); break; }
      T.push(`This mission needs <b>${fmt(dv)} m/s</b> of Δv: ${orb.dv_insert} m/s to get into orbit plus ${orb.dv_per_year} m/s per year, +10% margin.`);
      if (orb.dv_insert > 0) T.push("<b>'No propulsion' is not possible here</b>: you must brake into orbit yourself.");
      if (dryParts != null && dryParts > 0) {
        const est = Object.values(c.PROPULSION).filter((p) => p.isp).map((p) => {
          const r = Math.exp(dv / (p.isp * 9.80665)) - 1, fuel = r * 0.08 >= 1 ? Infinity : ((dryParts - (d.propulsion ? c.PROPULSION[d.propulsion].mass : 0) + p.mass) * r) / (1 - 0.08 * r);
          return `${p.name}: ~${isFinite(fuel) ? fmt(fuel) : "∞"} kg fuel${p.max_prop ? ` (max ${p.max_prop} kg)` : ""}`;
        });
        T.push(`Fuel estimate for your current mass: ${names(est)}. Higher Isp = less fuel, but a heavier engine.`);
      }
      break;
    }
    case "comms": {
      if (!dest.earth_au) T.push("In Earth orbit any antenna works; contact time is the limit. University: 1 h/day, commercial network: 5 h/day.");
      else T.push(`Earth is about <b>${dest.earth_au} AU</b> away. University and commercial stations can't hear you: use the <b>Deep Space Network</b>. Signal strength falls with distance squared.`);
      if (ev && d.instruments.length) {
        T.push(`Your instruments produce <b>${fmt(ev.data.generated_gb_day, 1)} Gb/day</b>.`);
        const g = d.ground ? c.GROUND[d.ground] : (dest.earth_au ? c.GROUND.dsn34 : c.GROUND.commercial), view = orb ? orb.earth_view : 1;
        const rows = Object.values(c.COMMS).map((x) => {
          const rate = (dest.earth_au ? Math.min(x.max_mbps, x.mbps_1au / dest.earth_au ** 2) : x.max_mbps) * g.gain;
          return `${x.name}: ${fmt(rate * g.hours * view * 3.6, 1)} Gb/day`;
        });
        T.push(`Downlink per day with ${esc(g.name)}: ${names(rows)}.`);
      }
      T.push("High-gain dishes need attitude control better than 0.5°.");
      break;
    }
    case "computer": {
      const env = ev ? ev.radiation.env : dest.radiation, shield = d.bus === "flagship" ? 1 : 0;
      T.push(`Radiation here is <b>${c.RADIATION_LABEL[env]}</b> (level ${env}). Tolerance = computer level${shield ? " + 1 from the flagship vault" : ""}. Aim for at least ${env}.`);
      T.push(`Options: ${names(Object.values(c.COMPUTERS).map((x) => `${x.name}: level ${x.rad}, ${x.storage_gb} GB, ${x.cost} M$`))}.`);
      if (ev && ev.data.storage_need_gb) T.push(`Between ground contacts you must store about <b>${fmt(ev.data.storage_need_gb, 1)} GB</b>.`);
      break;
    }
    case "review": {
      if (ev) {
        const nb = ev.issues.filter((i) => i.severity === "blocker").length, nw = ev.issues.filter((i) => i.severity === "warning").length;
        T.push(`Right now: <b>${nb}</b> blocker(s), <b>${nw}</b> warning(s). Cost ${fmt(ev.cost.total)} of ${fmt(ev.cost.budget)} M$ (reserve ${pct(ev.cost.reserve)}).`);
      }
      T.push("Score (max 950): science 500, budget left 150 (full at 25% reserve), margins 100 (mass 10-40%, power 20-60%), reliability 100, team goals 100.");
      T.push("Use <b>Risk check</b> to fly the design 200 times before you stamp it.");
      T.push("Over-designing is penalised too: a huge power margin or a half-empty rocket wastes money.");
      break;
    }
  }
  return T;
}

// ---------------------------------------------------------------------------- tutorial
const MENTOR = { name: "Flight Director Rosa Quint",
  look: { skin: "#8d5a3b", skinD: "#6b4229", hair: "#c9c4bc", hairStyle: "short", coat: "#3b3f4a", shirt: "#e9e3d6", tie: "#a8322a", badge: true } };
const HERE = { left: 330, top: 470 }, LEFTBOX = { left: 10, top: 430 }, MIDBOX = { left: 330, top: 120 };
const isWildfire = () => S.design.scenario === "wildfire";
const TUT = [
  { el: ".booth", pos: { left: 330, top: 60 }, text: () =>
    `Welcome to the Mission Review Board, engineer. I'm Rosa Quint, Flight Director. Clients bring mission requests to this window. Today: ${CLIENTS[S.design.scenario].name} needs ${scen().pitch.charAt(0).toLowerCase() + scen().pitch.slice(1)}` },
  { el: ".request", pos: { left: 330, top: 300 }, text: () =>
    "This is the mission request. Goals marked * are required: each needs at least 50%. The budget is a hard limit. Use - and + to set how many years the science phase lasts." },
  { el: ".review", pos: { left: 330, top: 360 }, text: () =>
    "The review sheet checks your design live. Your spacecraft is empty, so the board lists everything you still need. Red marks are blockers: no launch until they are gone. Click any line to read why." },
  { el: ".col-mid", tab: "orbit", pos: LEFTBOX, done: () => S.design.orbit, text: () =>
    "Start with WHERE you will fly. Open cards in the binder and pick an orbit. Each card explains its trade-off." +
    (isWildfire() ? " Hint: Sun-synchronous passes over every forest at the same local time, so images are easy to compare." : "") },
  { el: ".col-mid", tab: "instr", pos: LEFTBOX, done: () => S.design.instruments.length, text: () =>
    "Now the reason we fly: instruments. Dark tags match this mission's goals. Pick at least one; watch the goal bars on the mission request fill up." +
    (isWildfire() ? " For fires, a Thermal infrared imager plus a Wide-angle camera work well." : "") },
  { el: ".col-mid", tab: "bus", pos: LEFTBOX, done: () => S.design.bus, text: () =>
    "Instruments need a body. Pick a bus with enough slots for your instruments. CubeSats are cheap but tiny; big buses are expensive." },
  { el: ".col-mid", tab: "power", pos: LEFTBOX, done: () => S.design.solar && S.design.battery, text: () =>
    `Power next. Pick a solar array AND a battery. Here sunlight is ${pct(1 / S.cat.DESTINATIONS[destKey()].sun_au ** 2)} of Earth's, and every orbit has time in shadow. Watch the POWER and ECLIPSE meters.` },
  { el: ".col-mid", tab: "adcs", pos: LEFTBOX, done: () => S.design.adcs, text: () =>
    "Instruments and antennas must point steadily. Pick attitude control. Magnetorquers are cheap but coarse and only work near Earth; reaction wheels are precise." },
  { el: ".col-mid", tab: "prop", pos: LEFTBOX, done: () => S.design.propulsion, text: () =>
    "Engines get you into your orbit and keep you there. Pick propulsion. The MASS meter now includes fuel from the rocket equation: bigger burns need much more fuel." },
  { el: ".col-mid", tab: "comms", pos: LEFTBOX, done: () => S.design.comms && S.design.ground, text: () =>
    "Data is worthless until it reaches Earth. Pick an antenna AND ground stations, then watch the DATA meter: aim for 80% or more." },
  { el: ".col-mid", tab: "computer", pos: LEFTBOX, done: () => S.design.computer, text: () =>
    "The flight computer stores data between ground passes and must survive the local radiation. Pick one." },
  { el: ".col-mid", tab: "launch", pos: LEFTBOX, done: () => S.design.launch_vehicle, text: () =>
    "Last part: the rocket. It must lift everything, fuel included. Cheaper is better, as long as it fits." },
  { el: ".review", pos: { left: 330, top: 380 }, done: () => S.ev && S.ev.ok, text: () =>
    "Now read the review sheet. Fix every red blocker (click it to see why). Yellow warnings are allowed but cost points. Swap parts until it says FLIGHT READY." },
  { el: "#riskBtn", pos: HERE, text: () =>
    "Optional: RISK CHECK flies your design 200 times and tells you the odds of success. Real teams do this too." },
  { el: "#launchBtn", pos: HERE, done: () => $("#launch").classList.contains("active"), text: () =>
    "When you're ready, stamp it. After the flight you'll read the verdict in The Orbital Times. Good luck, engineer!" },
];

function startTutorial(full) {
  const steps = full && S.mode !== "team" ? TUT : TUT.filter((st) => !st.done || st.el === "#launchBtn").filter((st) => S.mode !== "team" || !st.done);
  S.tut = { steps, i: -1, full };
  $("#tutImg").src = portrait(MENTOR.look, "happy");
  $("#tutName").textContent = MENTOR.name;
  clearInterval(S.tutTimer); S.tutTimer = setInterval(tutTick, 250);
  tutAdvance();
}
function tutAdvance() {
  if (!S.tut) return;
  $$(".tut-focus").forEach((e) => e.classList.remove("tut-focus"));
  S.tut.i++;
  // skip task steps that are already done (e.g. help opened mid-design)
  while (S.tut.i < S.tut.steps.length && S.tut.steps[S.tut.i].done && S.tut.steps[S.tut.i].done() && S.tut.steps[S.tut.i].el !== "#launchBtn") S.tut.i++;
  if (S.tut.i >= S.tut.steps.length) return endTutorial(S.tut.full);
  const st = S.tut.steps[S.tut.i];
  SFX.pop();
  if (st.tab && S.tab !== st.tab) { S.tab = st.tab; renderTabs(); renderBinder(); }
  const el = $(st.el); if (el) { el.classList.add("tut-focus"); if (isMobile()) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  const box = $("#tut"); box.classList.remove("hidden");
  box.style.left = st.pos.left + "px"; box.style.top = st.pos.top + "px";
  $("#tutText").textContent = st.text();
  $("#tutStep").textContent = `${S.tut.i + 1} / ${S.tut.steps.length}`;
  const task = !!st.done;
  $("#tutNext").classList.toggle("hidden", task);
  $("#tutWait").textContent = task ? (st.el === "#launchBtn" ? "Press APPROVE & LAUNCH" : "Your move...") : "";
}
function tutTick() {
  if (!S.tut) return;
  const st = S.tut.steps[S.tut.i];
  if (st && st.done && st.done()) {
    if (st.el === "#launchBtn") return endTutorial(S.tut.full);
    tutAdvance();
  }
}
function endTutorial(markDone) {
  clearInterval(S.tutTimer); S.tutTimer = null;
  if (S.tut && markDone) store.set("tutorialDone", true);
  S.tut = null;
  $$(".tut-focus").forEach((e) => e.classList.remove("tut-focus"));
  $("#tut").classList.add("hidden");
}

// ---------------------------------------------------------------------------- launch sequence
let _launchStop = null;
function playLaunch(res) {
  stopPoll();
  S.result = res;
  show("launch");
  const cv = $("#launchCanvas"), g = cv.getContext("2d"), W = 320, H = 180;
  const tt = $("#teletype"); tt.innerHTML = "";
  const failAtLaunch = res.sim.events.some((e) => e.kind === "launch_failure");
  const pImg = new Image(); pImg.src = planet(PLANET_OF[res.evaluation.destination ? destKeyOf(res.design) : "earth"], 64);
  const starCv = document.createElement("canvas"); starCv.width = W; starCv.height = H; stars(starCv, 160, res.seed);
  const smoke = [];
  const lines = buildTeletype(res);
  let li = 0, nextLine = 3.2, done = false, t0 = performance.now(), rumbled = false;
  const add = (l) => {
    SFX.tick();
    const div = document.createElement("div"); div.className = `ln ${l.cls || ""}`; div.textContent = l.text; tt.appendChild(div);
    while (tt.children.length > 26) tt.removeChild(tt.firstChild);
  };
  function frame(now) {
    if (done) return;
    const t = (now - t0) / 1000;
    const rise = Math.max(0, t - 2.0);
    const sec = Math.floor(t);
    if (sec !== frame._sec && t < 2) { frame._sec = sec; SFX.beep(false); }
    if (rise > 0 && !rumbled) { rumbled = true; SFX.beep(true); SFX.rumble(); }
    if (failAtLaunch && rise > 1.6 && !frame._boom) { frame._boom = true; SFX.boom(); }
    if (t < 4.2 || failAtLaunch) {
      const climb = (failAtLaunch ? Math.min(rise, 1.6) : rise) ** 2 * 18;
      const cam = Math.max(0, climb - 50), gy = 150 + cam, ry = 100 - climb + cam;
      const sky = Math.min(1, cam / 120);
      g.fillStyle = `rgb(${Math.round(70 * (1 - sky) + 13)},${Math.round(90 * (1 - sky) + 12)},${Math.round(120 * (1 - sky) + 18)})`;
      g.fillRect(0, 0, W, H);
      if (sky > 0.3) { g.globalAlpha = sky; g.drawImage(starCv, 0, 0); g.globalAlpha = 1; }
      g.fillStyle = "#3b4a2e"; g.fillRect(0, gy, W, H);
      g.fillStyle = "#555"; g.fillRect(140, gy - 60, 6, 60);
      for (let k = 0; k < 6; k++) g.fillRect(140, gy - 58 + k * 10, 14, 1);
      const boom = failAtLaunch && rise > 1.6;
      if (!boom) drawRocket(g, 160, ry, rise > 0);
      if (rise > 0 && !boom) for (let k = 0; k < 3; k++)
        smoke.push({ x: 160 + (Math.random() - .5) * 6, y: ry + 44, vx: (Math.random() - .5) * 30, vy: 10 + Math.random() * 20, a: 1 });
      if (boom) {
        const e = rise - 1.6;
        for (let k = 0; k < 48; k++) {
          g.fillStyle = ["#ffd96b", "#ff9a3c", "#b3372d", "#777"][k % 4];
          g.fillRect(160 + Math.cos(k * 2.4) * e * 70 * ((k % 5) / 5 + .3), ry + 20 + Math.sin(k * 2.4) * e * 55 * ((k % 3) / 3 + .3), 3, 3);
        }
      }
      smoke.forEach((p) => { p.x += p.vx / 60; p.y += p.vy / 60; p.a -= 0.012; g.fillStyle = `rgba(200,200,200,${Math.max(0, p.a)})`; g.fillRect(p.x, p.y, 3, 3); });
      while (smoke.length > 400) smoke.shift();
      g.fillStyle = "#f4efe2"; g.font = "10px monospace";
      if (t < 2) g.fillText(`T-${Math.ceil(2 - t)}`, 10, 16); else if (t < 3) g.fillText(boom ? "" : "LIFTOFF", 10, 16);
    } else {
      g.drawImage(starCv, 0, 0);
      g.imageSmoothingEnabled = false; g.drawImage(pImg, 190, 40, 100, 100);
      const ang = t * 0.8, sx = 240 + Math.cos(ang) * 70, sy = 90 + Math.sin(ang) * 22;
      drawCraft(g, sx, sy, res.design);
      g.fillStyle = "#9cc0ea"; g.font = "9px monospace";
      const tl = res.sim.timeline, mi = Math.min(tl.length - 1, Math.floor((li / Math.max(1, lines.length)) * tl.length));
      if (tl[mi]) { g.fillText(`MONTH ${tl[mi].month}  ${tl[mi].phase.toUpperCase()}`, 8, 14); g.fillText(`SCIENCE ${pct(tl[mi].science_fraction)}`, 8, 26); }
    }
    if (t > nextLine && li < lines.length) { const l = lines[li++]; add(l); nextLine = t + (l.pause || 0.12); }
    if (li >= lines.length && t > nextLine + 1.2) return finish();
    requestAnimationFrame(frame);
  }
  function finish() { if (done) return; done = true; showNews(res); }
  _launchStop = () => { if (!done) { lines.slice(li).forEach((l) => { const d = document.createElement("div"); d.className = `ln ${l.cls || ""}`; d.textContent = l.text; tt.appendChild(d); }); finish(); } };
  requestAnimationFrame(frame);
}
function destKeyOf(design) { return S.cat.SCENARIOS[design.scenario].destination; }

function drawRocket(g, x, y, fire) {
  const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };
  r(x - 1, y, 2, 2, "#b3372d"); r(x - 3, y + 2, 6, 6, "#b3372d"); r(x - 3, y + 8, 6, 30, "#f4efe2"); r(x - 2, y + 12, 4, 3, "#3d6fa8");
  r(x - 6, y + 30, 3, 10, "#b3372d"); r(x + 3, y + 30, 3, 10, "#b3372d"); r(x - 3, y + 38, 6, 3, "#4b4b4b");
  if (fire) { r(x - 2, y + 41, 4, 4 + Math.random() * 6, "#ff9a3c"); r(x - 1, y + 43, 2, 4 + Math.random() * 6, "#ffd96b"); }
}
function drawCraft(g, x, y, d) {
  const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };
  const s = { cubesat: 3, smallsat: 4, medium: 5, flagship: 6 }[d.bus], w = { none: 0, body: 0, small: 4, medium: 6, large: 8, giant: 11 }[d.solar];
  if (w) { r(x - s - w, y - 1, w, 3, "#3d6fa8"); r(x + s, y - 1, w, 3, "#3d6fa8"); }
  r(x - s / 2 - 1, y - s / 2, s + 1, s + 1, "#d8aa45");
}

function buildTeletype(res) {
  const L = [], sim = res.sim, ev = res.evaluation;
  L.push({ text: `MISSION CONTROL TELETYPE · SEED ${res.seed}`, cls: "month", pause: 0.4 });
  L.push({ text: `${ev.scenario.name.toUpperCase()} → ${ev.destination.name.toUpperCase()}`, pause: 0.6 });
  const byMonth = {};
  sim.events.forEach((e) => (byMonth[e.month] = byMonth[e.month] || []).push(e));
  (byMonth[0] || []).forEach((e) => L.push({ text: `M00 ${e.text}`, cls: e.impact, pause: 1.0 }));
  sim.timeline.forEach((t) => {
    const evs = byMonth[t.month] || [];
    evs.forEach((e) => L.push({ text: `M${String(t.month).padStart(2, "0")} ${e.text}`, cls: e.impact, pause: e.impact === "fatal" ? 1.6 : 0.9 }));
    if (!evs.length && t.month % 6 === 0)
      L.push({ text: `M${String(t.month).padStart(2, "0")} ${t.phase === "cruise" ? "cruising, all systems nominal" : `science ${pct(t.science_fraction)} collected`}`, cls: "month", pause: 0.18 });
  });
  L.push({ text: `END OF TRANSMISSION · OUTCOME: ${sim.outcome.toUpperCase()}`, pause: 0.8 });
  return L;
}

// ---------------------------------------------------------------------------- newspaper
function headline(res) {
  const n = res.evaluation.scenario.name.toUpperCase(), dest = res.evaluation.destination.name.toUpperCase(), o = res.sim.outcome, g = res.score.grade;
  if (res.sim.events.some((e) => e.kind === "launch_failure")) return [`Rocket fails: ${n} lost at launch`, "Investigators begin search for the cause. Engineers call it 'the price of spaceflight'."];
  if (o === "lost") return [`Contact lost with ${n}`, `Silence from ${dest} after ${res.sim.months_survived} months. Flight team holds vigil.`];
  if (o === "cancelled") return [`Budget axe falls on ${n}`, "Lawmakers pull the plug on a working spacecraft after reserves run dry."];
  if (o === "partial") return [`${n} limps through mission`, "Spacecraft survives, but scientists say much of the planned work is missing."];
  if (g === "S" || g === "A") return [`${n} triumphs at ${dest}`, "Scientists celebrate a flawless mission that delivered more than promised."];
  return [`${n} completes its mission`, "A solid result, though reviewers note room for improvement."];
}

function showNews(res) {
  show("news");
  S.result = res;
  const sc = res.score, sim = res.sim, [hl, sub] = headline(res);
  // career progress
  if (S.mode === "career") {
    const p = progress(), k = res.design.scenario;
    if (!p[k] || sc.total > p[k].score) { p[k] = { grade: sc.grade, score: sc.total }; store.set("career", p); }
  }
  const labels = { science: "Science", budget: "Budget left", margins: "Margins", reliability: "Reliability", team: "Team goals" };
  const day = ORDER.indexOf(res.design.scenario) + 1;
  const highlights = sim.events.filter((e) => e.impact !== "neutral" && !["launch", "end"].includes(e.kind)).slice(0, 3);
  $("#paper").innerHTML = `
    <div class="masthead">THE ORBITAL TIMES</div>
    <div class="dateline"><span>Vol. 1 · Day ${day}</span><span>${esc(S.cat.DIFFICULTY[res.design.difficulty].name)} edition</span><span>Seed ${res.seed}</span></div>
    <div class="headline">${esc(hl)}</div>
    <div class="subhead">${esc(sub)} The mission returned ${pct(sim.science_fraction)} of its planned science in ${sim.months_survived} of ${sim.months_planned} months.</div>
    <div class="grade-stamp" style="color:${GRADE_COL[sc.grade]};border-color:${GRADE_COL[sc.grade]}"><b>${sc.grade}</b><span>${sc.total} PTS</span></div>
    <div class="news-cols">
      <div>
        <canvas id="newsPhoto" width="240" height="75" class="px news-photo"></canvas>
        <h5>What the review board says</h5>
        ${sc.analysis.map((a) => `<p>${esc(a)}</p>`).join("")}
      </div>
      <div>
        <h5>Final score: <span id="finalScore">0</span> / ${Object.values(sc.max).reduce((a, b) => a + b, 0)}</h5>
        ${Object.keys(sc.parts).map((k) => `<div class="score-row"><span>${labels[k]}</span>
          <div class="bar"><i data-w="${(sc.parts[k] / sc.max[k]) * 100}" style="width:0;background:var(--ink)"></i></div><span>${sc.parts[k]}/${sc.max[k]}</span></div>`).join("")}
        <h5>Team goals</h5>
        ${Object.entries(sc.roles).map(([k, ok]) => `<div>${icon(ok ? "check" : "cross", 14)} ${esc(S.cat.ROLES[k].name)}: ${esc(S.cat.ROLES[k].goal)}</div>`).join("")}
        <h5>From the mission log</h5>
        ${highlights.length ? highlights.map((e) => `<p>Month ${e.month}: ${esc(e.text)}</p>`).join("") : "<p>A quiet mission. No surprises.</p>"}
      </div>
    </div>`;
  const pc = $("#newsPhoto"), g = pc.getContext("2d");
  stars(pc, 60, res.seed);
  const im = new Image(); im.onload = () => { g.imageSmoothingEnabled = false; g.drawImage(im, 150, 4, 68, 68); drawCraft(g, 90, 38, res.design); };
  im.src = planet(PLANET_OF[destKeyOf(res.design)], 48);
  animateNews(sc);
  const idx = ORDER.indexOf(res.design.scenario);
  const nextOk = S.mode === "career" && idx < ORDER.length - 1 && PASS.includes(sc.grade);
  $("#nNext").classList.toggle("hidden", S.mode === "team");
  $("#nNext").textContent = nextOk ? "Next day" : "Mission files";
}

// Spinning-newspaper intro, then the grade stamp slams down and the score counts up.
async function animateNews(sc) {
  const paper = $("#paper"), acts = $(".news-actions"), token = (animateNews.token = (animateNews.token || 0) + 1);
  paper.classList.remove("spin"); void paper.offsetWidth; paper.classList.add("spin");
  acts.classList.add("wait");
  SFX.whoosh();
  const finish = () => {
    $(".grade-stamp").classList.add("slam");
    $$("#paper .bar > i[data-w]").forEach((b) => (b.style.width = `${b.dataset.w}%`));
    $("#finalScore").textContent = sc.total; acts.classList.remove("wait");
  };
  paper.onclick = () => { animateNews.token++; finish(); };
  await wait(1400); if (token !== animateNews.token) return;
  $(".grade-stamp").classList.add("slam"); await wait(220); SFX.thud();
  const bars = $$("#paper .bar > i[data-w]");
  for (const b of bars) { if (token !== animateNews.token) return; b.style.width = `${b.dataset.w}%`; SFX.paper(); await wait(160); }
  const el = $("#finalScore"), t0 = performance.now();
  await new Promise((ok) => {
    const iv = setInterval(() => {
      const f = Math.min(1, (performance.now() - t0) / 900);
      if (token === animateNews.token) el.textContent = Math.round(sc.total * (1 - (1 - f) ** 3));
      if (f >= 1 || token !== animateNews.token) { clearInterval(iv); ok(); }
    }, 30);
  });
  if (token === animateNews.token) acts.classList.remove("wait");
}

function wireNews() {
  $("#skipBtn").onclick = () => _launchStop && _launchStop();
  $("#nRedesign").onclick = () => {
    if (S.mode === "team") { show("desk"); startPoll(); return renderAll(); }
    S.design = { ...S.result.design }; openDesk();
  };
  $("#nNext").onclick = () => {
    const idx = ORDER.indexOf(S.result.design.scenario);
    if (S.mode === "career" && idx < ORDER.length - 1 && PASS.includes(S.result.score.grade)) startMission(ORDER[idx + 1]);
    else openSelect();
  };
  $("#nHall").onclick = openHall;
}

// ---------------------------------------------------------------------------- hall of fame
async function openHall(sc) {
  show("hall");
  sc = typeof sc === "string" ? sc : (S.design ? S.design.scenario : "wildfire");
  $("#hallTabs").innerHTML = ORDER.map((k) => `<button class="btn ${k === sc ? "on" : ""}" data-sc="${k}">${esc(S.cat.SCENARIOS[k].name)}</button>`).join("");
  $$("#hallTabs button").forEach((b) => b.onclick = () => openHall(b.dataset.sc));
  const rows = await api(`leaderboard?scenario=${sc}&n=15`);
  $("#hallList").innerHTML = rows.length ? rows.map((r, i) => `<div class="hrow"><b>${i + 1}.</b><span>${esc(r.player || r.name)}</span>
      <span>${esc(S.cat.DIFFICULTY[r.difficulty].name)}</span><b style="color:${GRADE_COL[r.grade]}">${r.grade}</b><span>${r.score} pts</span>
      <button class="btn small" data-i="${i}">Fly it</button></div>`).join("")
    : "<p>No missions flown yet. Be the first engineer in the hall.</p>";
  $$("#hallList [data-i]").forEach((b) => b.onclick = () => { S.mode = "free"; startMission(sc, rows[b.dataset.i].design); });
}

// ---------------------------------------------------------------------------- team room
function wireLobby() {
  $("#createRoom").onclick = async () => {
    try { applyLobby(await api("room/create", { player: S.player, scenario: "wildfire" })); } catch (e) { $("#lobbyErr").textContent = e.message; }
  };
  $("#joinRoom").onclick = async () => {
    const code = $("#roomCode").value.trim().toUpperCase();
    try { applyLobby(await api(`room/${code}/join`, { player: S.player, roles: [] })); } catch (e) { $("#lobbyErr").textContent = e.message; }
  };
  $("#enterRoom").onclick = () => {
    if (!S.myRoles.length) return ($("#lobbyErr").textContent = "Claim at least one role first.");
    S.mode = "team"; S.tab = TABS.find((t) => S.myRoles.includes(t.role)).id; S.introShown = true;
    openDesk(); startPoll();
  };
}
function openLobby() {
  show("team"); $("#lobbyErr").textContent = "";
  $("#lobbyRoom").classList.toggle("hidden", !S.room);
  if (S.room) renderLobby();
}
function applyLobby(view) {
  S.room = view.code; S.myRoles = view.players[S.player] || [];
  applyRoomState(view);
  $("#lobbyRoom").classList.remove("hidden"); $("#lobbyErr").textContent = "";
  renderLobby();
}
function renderLobby() {
  $("#lobbyCode").textContent = S.room;
  const taken = {};
  Object.entries(S.players).forEach(([p, roles]) => roles.forEach((r) => (taken[r] = p)));
  $("#roleCards").innerHTML = Object.entries(S.cat.ROLES).map(([k, r]) => {
    const mine = S.myRoles.includes(k), by = taken[k];
    return `<div class="role-card ${mine ? "mine" : by ? "taken" : ""}" data-r="${k}"><b>${esc(r.name)}</b>
      ${esc(r.learn)}<br><i>${by ? `Claimed by ${esc(by)}` : "Free"}</i></div>`;
  }).join("");
  $$("#roleCards .role-card").forEach((c) => c.onclick = async () => {
    const k = c.dataset.r, roles = S.myRoles.includes(k) ? S.myRoles.filter((x) => x !== k) : [...S.myRoles, k];
    try { applyLobby(await api(`room/${S.room}/join`, { player: S.player, roles })); } catch (e) { $("#lobbyErr").textContent = e.message; }
  });
}
function applyRoomState(v) {
  S.version = v.version; S.design = v.design; S.ev = v.evaluation; S.approvals = v.approvals; S.players = v.players;
  S.myRoles = v.players[S.player] || S.myRoles;
}
function applyRoom(v) {
  if (v.version < S.version) return; // a slow poll answered after a newer change: ignore it
  _evalSeq++; clearTimeout(_evalTimer); // drop any pending solo evaluation
  const prevScenario = S.design && S.design.scenario;
  applyRoomState(v);
  if (prevScenario !== S.design.scenario) renderClient._k = null;
  if ($("#desk").classList.contains("active")) renderAll();
  if ($("#team").classList.contains("active")) renderLobby();
  if (v.last_run && v.last_run.seed !== S.lastRunSeen) { S.lastRunSeen = v.last_run.seed; playLaunch(v.last_run); }
}
function startPoll() {
  stopPoll();
  S.poll = setInterval(async () => {
    try {
      const v = await api(`room/${S.room}?since=${S.version}`);
      if (!v.unchanged) applyRoom(v);
    } catch (e) { toast(esc(e.message)); stopPoll(); }
  }, 1500);
}
function stopPoll() { if (S.poll) clearInterval(S.poll); S.poll = null; }

boot();

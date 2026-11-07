// Mission Architect: career mode as a space agency.
// The agency has a calendar, money, reputation, research and partners. Contracts unlock as you succeed;
// parts unlock through research; every flight changes the agency (reputation, funds, partner trust, medals).
"use strict";

// Contracts: which earlier successes (all groups, any mission inside a group) and how much reputation open them.
const CONTRACTS = {
  wildfire: { req: [], rep: 0, reward: 60 },
  storm_watch: { req: [], rep: 0, reward: 80 },
  lunar_ice: { req: [["wildfire", "storm_watch"]], rep: 0, reward: 110 },
  landing_scout: { req: [["lunar_ice"]], rep: 0, reward: 120 },
  lunar_lander: { req: [["landing_scout"]], rep: 15, reward: 150 },
  orbital_outpost: { req: [["wildfire", "storm_watch"]], rep: 25, reward: 400 },
  asteroid_prospector: { req: [["lunar_ice"]], rep: 10, reward: 130 },
  asteroid_sample: { req: [["asteroid_prospector"]], rep: 25, reward: 200 },
  venus_clouds: { req: [["asteroid_prospector", "mars_climate"]], rep: 25, reward: 160 },
  lunar_base: { req: [["orbital_outpost"], ["lunar_lander"]], rep: 40, reward: 450 },
  mars_climate: { req: [["lunar_ice"]], rep: 15, reward: 170 },
  mars_rover: { req: [["mars_climate"], ["lunar_lander"]], rep: 35, reward: 260 },
  europa: { req: [["mars_climate"]], rep: 50, reward: 350 },
  mars_base: { req: [["lunar_base"], ["mars_rover"]], rep: 60, reward: 800 },
};
const PARTNER_REP = { esa: 0, isro: 10, jaxa: 20, csa: 30 };
const MILESTONES = [
  { k: "orbit", name: "First satellite", sc: ["wildfire", "storm_watch"], icon: "orbit" },
  { k: "moon", name: "Reached the Moon", sc: ["lunar_ice", "landing_scout"], icon: "camera" },
  { k: "landing", name: "First landing", sc: ["lunar_lander"], icon: "chute" },
  { k: "station", name: "Space station", sc: ["orbital_outpost"], icon: "bus" },
  { k: "sample", name: "Sample returned", sc: ["asteroid_sample"], icon: "capsule" },
  { k: "planets", name: "Planetary explorer", sc: ["venus_clouds", "mars_climate", "europa"], icon: "telescope" },
  { k: "rover", name: "Rover on Mars", sc: ["mars_rover"], icon: "wheel" },
  { k: "moonbase", name: "People on the Moon", sc: ["lunar_base"], icon: "person" },
  { k: "mars", name: "People on Mars", sc: ["mars_base"], icon: "star" },
];
// Research: each technology unlocks parts. "basics" is owned from the start.
const TECH = {
  basics: { name: "Basic spacecraft", cost: 0, unlocks: { launch_vehicle: ["electron", "falcon9"], bus: ["cubesat", "smallsat"],
    solar: ["none", "body", "compact", "small"], battery: ["b200", "b1000"], comms: ["uhf", "xlga"], ground: ["uni", "commercial"],
    computer: ["cubesat", "radtol"], adcs: ["magnetorquer", "wheels"], propulsion: ["none", "coldgas", "mono"],
    instruments: ["wac", "thermal", "sounder", "neutron", "lamp"] } },
  heavy: { name: "Heavy launchers", cost: 80, unlocks: { launch_vehicle: ["vulcan", "falcon_heavy"] } },
  superheavy: { name: "Super-heavy launcher", cost: 150, unlocks: { launch_vehicle: ["sls"] } },
  bigbus: { name: "Large spacecraft buses", cost: 70, unlocks: { bus: ["medium", "flagship"] } },
  power: { name: "Big solar arrays and batteries", cost: 50, unlocks: { solar: ["medium", "large", "giant"], battery: ["b3000", "b8000"] } },
  nuclear: { name: "Radioisotope power (RTG)", cost: 120, unlocks: { rtg: ["rtg"] } },
  deepcomms: { name: "Deep-space communications", cost: 60, unlocks: { comms: ["xhga"], ground: ["dsn34"] } },
  kaband: { name: "Ka-band and 70 m dishes", cost: 90, unlocks: { comms: ["kahga"], ground: ["dsn70"] } },
  relay: { name: "Mars relay network", cost: 40, unlocks: { ground: ["relay"] } },
  radhard: { name: "Radiation-hardened electronics", cost: 70, unlocks: { computer: ["radhard"] } },
  precision: { name: "Precision pointing", cost: 60, unlocks: { adcs: ["precision"] } },
  biprop: { name: "Planetary engines", cost: 50, unlocks: { propulsion: ["biprop"] } },
  optics: { name: "Telescopes and spectrometers", cost: 80, unlocks: { instruments: ["hirise", "irspec", "massspec"] } },
  radar: { name: "Radar and lasers", cost: 70, unlocks: { instruments: ["lidar", "radar", "sar"] } },
  fields: { name: "Fields and particles", cost: 30, unlocks: { instruments: ["mag", "particles"] } },
  landing: { name: "Landing systems", cost: 90, unlocks: { edl: ["airbags", "retro"] } },
  precland: { name: "Precision landing", cost: 120, unlocks: { edl: ["hazard", "skycrane"] } },
  surface: { name: "Surface science", cost: 70, unlocks: { instruments: ["pancam", "drill", "raman", "seismo"] } },
  samples: { name: "Sample return", cost: 90, unlocks: { edl: ["capsule_s", "capsule_l"], instruments: ["tagsam"] } },
  human: { name: "Human spaceflight", cost: 150, unlocks: { payloads: ["core", "hab", "lab", "truss", "cargo", "cargo_l", "crew"] } },
  moonbase: { name: "Lunar surface outpost", cost: 150, unlocks: { payloads: ["lcargo", "lcargo_l", "lpower", "lrover", "lcrew_s", "lcrew"] } },
  marsbase: { name: "Mars expedition hardware", cost: 250, unlocks: { payloads: ["mhab", "mpower", "mcargo", "mtransit", "mcrew"] } },
};
const TECH_OF = {};
for (const [t, o] of Object.entries(TECH)) for (const [f, keys] of Object.entries(o.unlocks)) for (const k of keys) TECH_OF[`${f}:${k}`] = t;

const newAgency = (difficulty = "normal") => ({ v: 1, month: 0, funds: 150, rep: 5, difficulty, tech: ["basics"], trust: {},
  done: {}, log: [], medals: [], seen: [] });
const agency = () => store.get("agency", null);
const saveAgency = (a) => store.set("agency", a);
const inCareer = () => S.mode === "career" && !!agency();

function isUnlocked(field, key) {
  if (!inCareer()) return true;
  const t = TECH_OF[`${field}:${key}`];
  return !t || agency().tech.includes(t);
}
function avail(field, obj) {
  if (!inCareer()) return obj;
  return Object.fromEntries(Object.entries(obj).filter(([k]) => isUnlocked(field, k)));
}
function partnerOpen(pk) { return !inCareer() || agency().rep >= (PARTNER_REP[pk] || 0); }
// technologies a contract's reference design uses that the agency doesn't own yet
function researchNeeded(sc) {
  const a = agency(), d = S.cat.DEFAULTS[sc], need = new Set();
  const add = (f, k) => { const t = TECH_OF[`${f}:${k}`]; if (t && !a.tech.includes(t)) need.add(t); };
  for (const f of ["launch_vehicle", "bus", "solar", "battery", "comms", "ground", "computer", "adcs", "propulsion", "edl"]) if (d[f]) add(f, d[f]);
  (d.instruments || []).forEach((k) => add("instruments", k));
  if (d.rtg) add("rtg", "rtg");
  (d.manifest || []).forEach((f) => { add("payloads", f.p); add("launch_vehicle", f.lv); });
  return [...need];
}
const passed = (sc) => { const r = agency().done[sc]; return r && PASS.includes(r.grade); };
function contractState(sc) {
  const c = CONTRACTS[sc], a = agency();
  const missing = c.req.filter((grp) => !grp.some(passed));
  if (missing.length) return { open: false, why: `Needs: ${missing.map((grp) => grp.map((k) => S.cat.SCENARIOS[k].name).join(" or ")).join(" + ")}` };
  if (a.rep < c.rep) return { open: false, why: `Needs reputation ${c.rep}` };
  return { open: true };
}
const monthName = (m) => `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][((m % 12) + 12) % 12]} ${2027 + Math.floor(m / 12)}`;

// ---------------------------------------------------------------------------- headquarters screen
function openHQ() {
  if (!agency()) saveAgency(newAgency(store.get("difficulty", "normal")));
  S.mode = "career";
  const a = agency();
  show("hq");
  const stars = Math.floor(a.rep / 20);
  $("#hqName").textContent = `${(S.player || "Your").toUpperCase()} SPACE AGENCY`;
  $("#hqDate").textContent = monthName(a.month).toUpperCase();
  $("#hqFunds").textContent = `${fmt(a.funds)} M$`;
  $("#hqRep").innerHTML = `<div class="bar"><i style="width:${a.rep}%"></i></div><span>${a.rep} / 100 ${"&#9733;".repeat(stars)}${"&#9734;".repeat(5 - stars)}</span>`;
  $("#hqDiff").textContent = S.cat.DIFFICULTY[a.difficulty].name;
  $("#hqMedals").innerHTML = MILESTONES.map((m) => `<div class="medal ${a.medals.includes(m.k) ? "on" : ""}" title="${esc(m.name)}">${icon(m.icon, 20)}<span>${esc(m.name)}</span></div>`).join("");
  $("#hqPartners").innerHTML = Object.entries(S.cat.PARTNERS).map(([k, p]) => {
    const open = a.rep >= PARTNER_REP[k], t = a.trust[k] || 0;
    return `<div class="hq-partner ${open ? "" : "locked"}">${icon(`flag_${k}`, 16)}<b>${esc(p.name)}</b>
      <span>${open ? `trust ${"&#9679;".repeat(t)}${"&#9675;".repeat(3 - t)}` : `opens at reputation ${PARTNER_REP[k]}`}</span></div>`;
  }).join("");
  $("#hqLog").innerHTML = a.log.length ? a.log.slice(-14).reverse().map((l) => `<div class="hl"><span>${esc(monthName(l.month))}</span><span>${esc(l.text)}</span></div>`).join("")
    : `<p class="req-small">Nothing has flown yet. Pick a contract.</p>`;
  $("#hqContracts").innerHTML = ORDER.filter((k) => CONTRACTS[k]).map((k) => {
    const s = S.cat.SCENARIOS[k], st = contractState(k), best = a.done[k], need = st.open ? researchNeeded(k) : [];
    return `<div class="folder hq-folder ${st.open ? "" : "locked"} ${best && PASS.includes(best.grade) ? "done" : ""}" data-sc="${k}">
      <div class="f-kind">${KIND_LABEL[s.kind || "orbiter"]}</div>
      ${best ? `<div class="f-best" style="color:${GRADE_COL[best.grade]}">${best.grade}</div>` : ""}
      <img class="px f-planet" src="${planet(PLANET_OF[s.destination], 36)}" alt="">
      <div class="f-name">${esc(s.name)}</div>
      <div class="f-lvl">${s.difficulty} &middot; +${CONTRACTS[k].reward} M$</div>
      ${!st.open ? `<div class="f-why">${icon("lock", 12)} ${esc(st.why)}</div>`
        : best && PASS.includes(best.grade) ? `<div class="f-ok">Flown. Fly again to improve.</div>`
        : need.length ? `<div class="f-need">Research first: ${need.map((t) => esc(TECH[t].name)).join(", ")}</div>` : `<div class="f-ok">Ready to design</div>`}
    </div>`;
  }).join("");
  $$("#hqContracts .folder").forEach((f) => f.onclick = () => {
    if (f.classList.contains("locked")) { SFX.error(); return toast(esc(contractState(f.dataset.sc).why)); }
    SFX.page(); store.set("difficulty", a.difficulty); startMission(f.dataset.sc);
  });
  const newYear = $("#hqNextYear");
  newYear.onclick = () => { advanceTo(a.month + 12 - (a.month % 12)); toast("A year passes. The annual budget arrives in January."); openHQ(); };
  $("#hqResearch").onclick = () => openResearch();
  $("#hqReset").onclick = () => {
    if (!confirm("Start a new career? Your agency's history, money and research will be lost.")) return;
    saveAgency(newAgency(store.get("difficulty", "normal"))); openHQ();
  };
  $("#hqDiffSeg").innerHTML = a.log.length ? "" : Object.entries(S.cat.DIFFICULTY).map(([k, d]) => `<button class="btn small ${k === a.difficulty ? "on" : ""}" data-d="${k}">${d.name}</button>`).join("");
  $$("#hqDiffSeg button").forEach((b) => b.onclick = () => { const x = agency(); x.difficulty = b.dataset.d; saveAgency(x); openHQ(); });
}

// Time passes: every January the agency receives its budget (more if its reputation is high).
function advanceTo(month) {
  const a = agency();
  while (Math.floor(month / 12) > Math.floor(a.month / 12)) {
    a.month = (Math.floor(a.month / 12) + 1) * 12;
    const grant = Math.round(40 + a.rep * 1.5);
    a.funds += grant;
    a.log.push({ month: a.month, text: `Annual budget: +${grant} M$` });
  }
  a.month = Math.max(a.month, month);
  saveAgency(a);
}

function openResearch(focus) {
  const a = agency(), m = $("#research");
  $("#rsFunds").textContent = `${fmt(a.funds)} M$ available`;
  $("#rsList").innerHTML = Object.entries(TECH).filter(([k]) => k !== "basics").map(([k, t]) => {
    const own = a.tech.includes(k), parts = Object.entries(t.unlocks).flatMap(([f, keys]) => keys.map((x) => {
      const cat = { payloads: S.cat.PAYLOADS, rtg: { rtg: S.cat.RTG } }[f] || optionsFor(f, true);
      return (cat[x] || {}).name || x;
    }));
    return `<div class="rs-item ${own ? "own" : ""} ${k === focus ? "focus" : ""}" data-t="${k}"><div><b>${esc(t.name)}</b><small>${esc(parts.join(", "))}</small></div>
      ${own ? `<span class="rs-own">${icon("check", 14)} owned</span>` : `<button class="btn small" data-buy="${k}" ${a.funds < t.cost ? "disabled" : ""}>${t.cost} M$</button>`}</div>`;
  }).join("");
  $$("#rsList [data-buy]").forEach((b) => b.onclick = () => {
    const x = agency(), t = TECH[b.dataset.buy];
    if (x.funds < t.cost) return;
    x.funds -= t.cost; x.tech.push(b.dataset.buy); x.log.push({ month: x.month, text: `Research: ${t.name} (-${t.cost} M$)` });
    saveAgency(x); SFX.chime(); openResearch(b.dataset.buy);
    if ($("#desk").classList.contains("active")) { renderAll(); evaluateSoon(); } else if ($("#hq").classList.contains("active")) openHQ();
  });
  m.classList.remove("hidden");
  const f = $("#rsList .focus"); if (f) f.scrollIntoView({ block: "center" });
  $("#rsClose").onclick = () => m.classList.add("hidden");
}

// After a flight: reputation, money back, contract reward, partner trust, medals, calendar.
function applyCareerResult(res) {
  const a = agency(); if (!a || a.seen.includes(res.seed)) return null;
  const sc = res.design.scenario, sco = res.score, sim = res.sim, ev = res.evaluation;
  const repGain = { S: 12, A: 9, B: 6, C: 3, F: -4 }[sco.grade] + (sim.outcome === "lost" ? -6 : sim.outcome === "cancelled" ? -4 : 0);
  const savings = Math.max(0, Math.round(sim.reserve_end * ev.cost.budget * 0.5));
  const reward = Math.round(CONTRACTS[sc].reward * ({ S: 1.5, A: 1.2, B: 1.0, C: 0.6, F: 0 }[sco.grade]));
  a.rep = Math.max(0, Math.min(100, a.rep + repGain));
  a.funds += savings + reward;
  const ok = PASS.includes(sco.grade) && sim.outcome !== "lost";
  for (const p of res.design.partners || []) a.trust[p] = Math.max(0, Math.min(3, (a.trust[p] || 0) + (ok ? 1 : -1)));
  if (!a.done[sc] || sco.total > a.done[sc].score) a.done[sc] = { grade: sco.grade, score: sco.total };
  const newMedals = MILESTONES.filter((m) => !a.medals.includes(m.k) && ok && m.sc.includes(sc));
  newMedals.forEach((m) => a.medals.push(m.k));
  const launchMonth = (ev.schedule && ev.schedule.launch_month) || a.month;
  a.seen.push(res.seed); a.seen = a.seen.slice(-50);
  a.log.push({ month: launchMonth, text: `${S.cat.SCENARIOS[sc].name}: ${sco.grade} (${sim.outcome})` });
  saveAgency(a);
  // development of the next mission overlaps this one: the clock moves to a year before this launch, at least 6 months on
  advanceTo(Math.max(a.month + 6, launchMonth - 12 + (sim.launch_delay || 0)));
  return { repGain, savings, reward, rep: agency().rep, funds: agency().funds, medals: newMedals.map((m) => m.name),
    unlocked: ORDER.filter((k) => CONTRACTS[k] && contractState(k).open && !a.done[k]).map((k) => S.cat.SCENARIOS[k].name) };
}

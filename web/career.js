// Mission Architect: career mode as a space agency.
// The agency has a calendar, money, reputation and research. Contracts unlock as you succeed;
// parts unlock through research; every flight changes the agency (reputation, funds, medals).
"use strict";

// Contracts: which earlier successes (all groups, any mission inside a group) and how much reputation open them.
const CONTRACTS = {
  wildfire: { req: [], rep: 0, reward: 60 },
  storm_watch: { req: [], rep: 0, reward: 80 },
  lunar_ice: { req: [["wildfire", "storm_watch"]], rep: 0, reward: 110 },
  iss_resupply: { req: [["wildfire", "storm_watch"]], rep: 12, reward: 180 },
  crew_transport: { req: [["iss_resupply"]], rep: 20, reward: 300 },
  exoplanet_hunter: { req: [["storm_watch", "lunar_ice"]], rep: 20, reward: 200 },
  landing_scout: { req: [["lunar_ice"]], rep: 0, reward: 120 },
  lunar_lander: { req: [["landing_scout"]], rep: 15, reward: 150 },
  orbital_outpost: { req: [["iss_resupply"]], rep: 25, reward: 400 },
  asteroid_prospector: { req: [["lunar_ice"]], rep: 10, reward: 130 },
  asteroid_sample: { req: [["asteroid_prospector"]], rep: 25, reward: 200 },
  venus_clouds: { req: [["asteroid_prospector", "mars_climate"]], rep: 25, reward: 160 },
  lunar_base: { req: [["orbital_outpost"], ["lunar_lander"]], rep: 40, reward: 450 },
  mars_climate: { req: [["lunar_ice"]], rep: 15, reward: 170 },
  mars_rover: { req: [["mars_climate"], ["lunar_lander"]], rep: 35, reward: 260 },
  europa: { req: [["mars_climate"]], rep: 50, reward: 350 },
  mars_base: { req: [["lunar_base"], ["mars_rover"]], rep: 60, reward: 800 },
};
const MILESTONES = [
  { k: "orbit", name: "First satellite", sc: ["wildfire", "storm_watch"], icon: "orbit" },
  { k: "moon", name: "Reached the Moon", sc: ["lunar_ice", "landing_scout"], icon: "camera" },
  { k: "landing", name: "First landing", sc: ["lunar_lander"], icon: "chute" },
  { k: "iss", name: "Crew at the ISS", sc: ["iss_resupply"], icon: "person" },
  { k: "ship", name: "Own spaceship", sc: ["crew_transport"], icon: "capsule" },
  { k: "station", name: "Space station", sc: ["orbital_outpost"], icon: "bus" },
  { k: "telescope", name: "Space telescope", sc: ["exoplanet_hunter"], icon: "telescope" },
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
  heavy: { name: "Heavy launchers", cost: 80, unlocks: { launch_vehicle: ["vulcan", "falcon_heavy", "new_glenn"] } },
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
  astronomy: { name: "Space astronomy", cost: 90, unlocks: { instruments: ["photometer", "irtel", "coronagraph"] } },
  radar: { name: "Radar and lasers", cost: 70, unlocks: { instruments: ["lidar", "radar", "sar"] } },
  fields: { name: "Fields and particles", cost: 30, unlocks: { instruments: ["mag", "particles"] } },
  landing: { name: "Landing systems", cost: 90, unlocks: { edl: ["airbags", "retro"] } },
  precland: { name: "Precision landing", cost: 120, unlocks: { edl: ["hazard", "skycrane"] } },
  surface: { name: "Surface science", cost: 70, unlocks: { instruments: ["pancam", "drill", "raman", "seismo"] } },
  samples: { name: "Sample return", cost: 90, unlocks: { edl: ["capsule_s", "capsule_l"], instruments: ["tagsam"] } },
  human: { name: "Human spaceflight", cost: 150, unlocks: { payloads: ["cargo", "cargo_l", "crew"], shape: ["capsule"], seats: ["s2", "s4"],
    heatshield: ["ablative"], abort: ["tower", "none"], landing: ["ocean"] } },
  stations: { name: "Station modules", cost: 120, unlocks: { payloads: ["core", "hab", "lab", "truss"] } },
  reusecrew: { name: "Reusable crew vehicles", cost: 100, unlocks: { heatshield: ["metallic"], abort: ["pusher"], landing: ["land_chutes", "propulsive"] } },
  co_ng: { name: "Northrop Grumman contract", cost: 0, offer: true, unlocks: {} },
  co_sierra: { name: "Sierra Space contract", cost: 0, offer: true, unlocks: {} },
  co_axiom: { name: "Axiom Space contract", cost: 0, offer: true, unlocks: {} },
  spaceplanes: { name: "Spaceplanes", cost: 160, unlocks: { shape: ["lifting_body", "winged"], seats: ["s7"], heatshield: ["tiles"], abort: ["seats"], landing: ["runway"] } },
  moonbase: { name: "Lunar surface outpost", cost: 150, unlocks: { payloads: ["lcargo", "lcargo_l", "lpower", "lrover", "lcrew_s", "lcrew"] } },
  marsbase: { name: "Mars expedition hardware", cost: 250, unlocks: { payloads: ["mhab", "mpower", "mcargo", "mtransit", "mcrew"] } },
};
const TECH_OF = { "payloads:cargo_c": "co_ng", "payloads:cargo_dc": "co_sierra", "payloads:lab_c": "co_axiom" };
for (const [t, o] of Object.entries(TECH)) for (const [f, keys] of Object.entries(o.unlocks)) for (const k of keys) TECH_OF[`${f}:${k}`] = t;

const newAgency = (difficulty = "normal") => ({ v: 1, month: 0, funds: 150, rep: 5, difficulty, tech: ["basics"],
  done: {}, log: [], medals: [], seen: [], boosters: {}, research: [], world: [], offers: [], iss_due: null });
// Saved careers from older versions may mention companies, research or contracts that no longer exist: clean them up.
const agency = () => {
  const a = store.get("agency", null);
  if (!a || !S.cat) return a;
  const coKeys = new Set(COMPANIES.map((c) => c.k));
  a.offers = (a.offers || []).filter((o) => coKeys.has(o.k));
  a.research = (a.research || []).filter((r) => TECH[r.t]);
  a.tech = (a.tech || ["basics"]).filter((t) => TECH[t]);
  a.boosters = Object.fromEntries(Object.entries(a.boosters || {}).filter(([k]) => S.cat.LAUNCH_VEHICLES[k]));
  a.done = Object.fromEntries(Object.entries(a.done || {}).filter(([k]) => S.cat.SCENARIOS[k]));
  a.world = a.world || []; a.log = a.log || []; a.medals = a.medals || []; a.seen = a.seen || []; delete a.trust; delete a.invites;
  return a;
};
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
// technologies a contract's reference design uses that the agency doesn't own yet
function researchNeeded(sc) {
  const a = agency(), d = S.cat.DEFAULTS[sc], need = new Set();
  const add = (f, k) => { const t = TECH_OF[`${f}:${k}`]; if (t && !a.tech.includes(t) && !TECH[t].offer) need.add(t); };
  for (const f of ["launch_vehicle", "bus", "solar", "battery", "comms", "ground", "computer", "adcs", "propulsion", "edl",
    "shape", "seats", "heatshield", "abort", "landing"]) if (d[f]) add(f, d[f]);
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
  $("#hqName").textContent = `NASA MISSION OFFICE${S.player ? ` · ${S.player.toUpperCase()}` : ""}`;
  $("#hqDate").textContent = monthName(a.month).toUpperCase();
  $("#hqFunds").textContent = `${fmt(a.funds)} M$`;
  $("#hqRep").innerHTML = `<div class="bar"><i style="width:${a.rep}%"></i></div><span>${a.rep} / 100 ${"&#9733;".repeat(stars)}${"&#9734;".repeat(5 - stars)}</span>`;
  $("#hqDiff").textContent = S.cat.DIFFICULTY[a.difficulty].name;
  $("#hqMedals").innerHTML = MILESTONES.map((m) => `<div class="medal ${a.medals.includes(m.k) ? "on" : ""}" title="${esc(m.name)}">${icon(m.icon, 22)}<span>${esc(m.name)}</span></div>`).join("");
  $("#hqMedalCount").textContent = `${a.medals.length} / ${MILESTONES.length}`;
  const fleet = Object.entries(a.boosters || {}).filter(([, n]) => n > 0);
  $("#hqFleet").innerHTML = fleet.length ? fleet.map(([k, n]) => `<div class="hq-row">${icon("rocket", 18)}<b>${esc(S.cat.LAUNCH_VEHICLES[k].name.split(" (")[0])}</b><span>${n} booster${n > 1 ? "s" : ""}, next launch ${pct(S.cat.REUSE_DISCOUNT)} cheaper</span></div>`).join("")
    : `<p class="hq-empty">Fly Falcon 9 or New Glenn and land the first stage to build a fleet.</p>`;
  const offers = (a.offers || []).map((o, i) => { const c = COMPANIES.find((x) => x.k === o.k);
    return `<div class="invite">${icon("coin", 16)}<div><b>${esc(c.name)}</b> ${esc(c.pitch)} Until ${esc(monthName(o.until))}.</div>
      <button class="btn small" data-off="${i}">Sign contract</button></div>`; }).join("");
  $("#hqInvites").innerHTML = offers || `<p class="req-small">No offers right now. Companies write when your reputation grows.</p>`;
  $$("#hqInvites [data-off]").forEach((b) => b.onclick = () => {
    const x = agency(), o = x.offers.splice(+b.dataset.off, 1)[0], c = COMPANIES.find((y) => y.k === o.k);
    x.tech.push(`co_${o.k}`); x.log.push({ month: x.month, text: `Contract signed with ${c.name}: ${S.cat.PAYLOADS[c.payload].name} is available` });
    saveAgency(x); SFX.chime(); openHQ();
  });
  $("#hqLog").innerHTML = a.log.length ? a.log.slice(-14).reverse().map((l) => `<div class="hl ${l.world ? "world" : ""}"><span>${esc(monthName(l.month))}</span><span>${l.world ? icon("globe", 12) + " " : ""}${esc(l.text)}</span></div>`).join("")
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
        : need.length ? `<div class="f-need">Research first: ${need.map((t) => { const r = (a.research || []).find((x) => x.t === t); return esc(TECH[t].name) + (r ? ` (ready ${esc(monthName(r.done))})` : ""); }).join(", ")}</div>` : `<div class="f-ok">Ready to design</div>`}
    </div>`;
  }).join("");
  $$("#hqContracts .folder").forEach((f) => f.onclick = () => {
    if (f.classList.contains("locked")) { SFX.error(); return toast(esc(contractState(f.dataset.sc).why)); }
    SFX.page(); store.set("difficulty", a.difficulty); startMission(f.dataset.sc);
  });
  $("#hqNextYear").onclick = () => { SFX.page(); advanceTo(a.month + 3); toast("Three months pass."); openHQ(); };
  // research in progress, ISS supply deadline, news ticker
  $("#hqResearchNow").innerHTML = (a.research || []).length ? a.research.map((r) => `<div class="hq-row">${icon("flask", 18)}<b>${esc(TECH[r.t].name)}</b><span>ready ${esc(monthName(r.done))}</span></div>`).join("") : `<p class="hq-empty">Nothing running. Open Research to start a project.</p>`;
  const due = a.iss_due;
  $("#hqIss").innerHTML = due == null ? "" : `<div class="iss-due ${due - a.month <= 3 ? "late" : ""}">${icon("person", 14)}<span>ISS supplies needed by <b>${esc(monthName(due))}</b>
    (${Math.max(0, due - a.month)} months). Fly <i>ISS Supply and Crew Rotation</i> before then.</span></div>`;
  const news = (a.world || []).slice(-8).reverse();
  $("#hqTicker").innerHTML = news.length ? (() => { const items = news.map((w) => `<span class="${w.ok ? "good" : "bad"}">${esc(monthName(w.month))}: ${esc(w.text)}</span>`).join("");
      return `<div class="tick-run">${items}${items}</div>`; })()
    : `<span class="req-small">World news will appear here as time passes.</span>`;
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
  a.research = a.research || []; a.world = a.world || []; a.offers = a.offers || [];
  while (a.month < month) {
    a.month += 1;
    if (a.month % 12 === 0) {
      const grant = Math.round(40 + a.rep * 1.5);
      a.funds += grant;
      a.log.push({ month: a.month, text: `NASA budget for ${2027 + a.month / 12}: +${grant} M$` });
    }
    for (const r of a.research.filter((x) => x.done <= a.month)) {
      a.tech.push(r.t); a.log.push({ month: a.month, text: `Research complete: ${TECH[r.t].name}` });
    }
    a.research = a.research.filter((x) => x.done > a.month);
    worldNews(a);
    a.offers = a.offers.filter((o) => o.until > a.month);
    maybeOffer(a);
    if (a.iss_due == null && contractStateFor(a, "iss_resupply")) {
      a.iss_due = a.month + 15;
      a.log.push({ month: a.month, text: `NASA now keeps the ISS supplied: next delivery due ${monthName(a.iss_due)}` });
    }
    if (a.iss_due != null && a.month > a.iss_due) {
      a.rep = Math.max(0, a.rep - 5); a.iss_due = a.month + 6;
      a.log.push({ month: a.month, text: "The ISS ran low on supplies: crew rationing, reputation -5" });
    }
  }
  saveAgency(a);
}

// Other agencies fly too: their successes and failures appear on the news ticker.
const WORLD = [
  ["ESA", ["Mars orbiter", "comet probe", "Jupiter moons probe", "space telescope"], ["Aurora", "Rosetta-II", "Juice", "Ariel"]],
  ["JAXA", ["asteroid sampler", "lunar lander", "Mars moon probe"], ["Hayabusa", "SLIM", "MMX"]],
  ["ISRO", ["lunar lander", "Mars orbiter", "Venus orbiter", "crewed flight"], ["Chandrayaan", "Mangalyaan", "Shukrayaan", "Gaganyaan"]],
  ["CNSA", ["lunar sample return", "Mars rover", "space station module"], ["Chang'e", "Tianwen", "Tiangong"]],
  ["CSA", ["radar satellite", "lunar rover"], ["Radarsat", "Lunar Utility"]],
  ["KARI", ["lunar orbiter", "Earth observer"], ["Danuri", "Arirang"]],
];
function worldNews(a) {
  const rnd = _rng(a.month * 7919 + 13);
  if (rnd() > 0.22) return;
  const [ag, kinds, names] = WORLD[Math.floor(rnd() * WORLD.length)], i = Math.floor(rnd() * kinds.length);
  const name = `${names[i % names.length]}-${2 + Math.floor(rnd() * 6)}`, ok = rnd() < 0.72;
  const text = ok ? `${ag}'s ${name} ${kinds[i]} ${["succeeded", "reached its target", "returned its first data"][Math.floor(rnd() * 3)]}`
    : `${ag}'s ${name} ${kinds[i]} ${["was lost", "failed after launch", "lost contact on arrival"][Math.floor(rnd() * 3)]}`;
  a.world.push({ month: a.month, text, ok }); a.world = a.world.slice(-30);
  a.log.push({ month: a.month, text: `World: ${text}`, world: true });
}

// Companies offer their own hardware for the ISS; accepting adds it to your catalog.
const COMPANIES = [
  { k: "ng", name: "Northrop Grumman", payload: "cargo_c", pitch: "offers Cygnus cargo flights to the ISS: 3.7 t for 45 M$." },
  { k: "sierra", name: "Sierra Space", payload: "cargo_dc", pitch: "offers Dream Chaser cargo flights: 4.5 t up, experiments back to a runway." },
  { k: "axiom", name: "Axiom Space", payload: "lab_c", pitch: "offers to attach its commercial module to the ISS: two more bunks and lab space." },
];
function maybeOffer(a) {
  if (!contractStateFor(a, "iss_resupply") || a.month % 9 !== 0) return;
  const c = COMPANIES.find((x) => !a.tech.includes(`co_${x.k}`) && !a.offers.some((o) => o.k === x.k));
  if (!c) return;
  a.offers.push({ k: c.k, until: a.month + 12 });
  a.log.push({ month: a.month, text: `${c.name} ${c.pitch}` });
}

// What a locked card says: research it, or wait for the company's offer (contracts can't be researched).
function lockText(t) {
  const x = TECH[t];
  if (x.offer) { const c = COMPANIES.find((y) => `co_${y.k}` === t); return `Offered by ${c ? c.name : "a company"}: sign their contract at headquarters when the offer arrives`; }
  return `Research: ${x.name} (${x.cost} M$)`;
}
function openLock(t) {
  if (TECH[t] && TECH[t].offer) { SFX.error(); return toast("This comes from a company contract, not research. Watch the Company offers box at headquarters for their offer."); }
  SFX.page(); openResearch(t);
}
const researchMonths = (t) => Math.max(3, Math.round(t.cost / 15));   // bigger projects take longer
function openResearch(focus) {
  const a = agency(), m = $("#research");
  $("#rsFunds").textContent = `${fmt(a.funds)} M$ available`;
  $("#rsList").innerHTML = Object.entries(TECH).filter(([k, t]) => k !== "basics" && !t.offer).map(([k, t]) => {
    const own = a.tech.includes(k), parts = Object.entries(t.unlocks).flatMap(([f, keys]) => keys.map((x) => {
      const cat = { payloads: S.cat.PAYLOADS, rtg: { rtg: S.cat.RTG } }[f] || optionsFor(f, true);
      return (cat[x] || {}).name || x;
    }));
    const busy = (a.research || []).find((r) => r.t === k), months = researchMonths(t);
    return `<div class="rs-item ${own ? "own" : ""} ${k === focus ? "focus" : ""}" data-t="${k}"><div><b>${esc(t.name)}</b><small>${esc(parts.join(", "))}</small></div>
      ${own ? `<span class="rs-own">${icon("check", 14)} owned</span>` : busy ? `<span class="rs-own">ready ${esc(monthName(busy.done))}</span>`
        : `<button class="btn small" data-buy="${k}" ${a.funds < t.cost || (a.research || []).length >= 2 ? "disabled" : ""}>${t.cost} M$ · ${months} mo</button>`}</div>`;
  }).join("");
  $$("#rsList [data-buy]").forEach((b) => b.onclick = () => {
    const x = agency(), t = TECH[b.dataset.buy];
    if (x.funds < t.cost) return;
    x.funds -= t.cost; x.research = [...(x.research || []), { t: b.dataset.buy, done: x.month + researchMonths(t) }];
    x.log.push({ month: x.month, text: `Research started: ${t.name} (-${t.cost} M$, ${researchMonths(t)} months)` });
    saveAgency(x); SFX.chime(); openResearch(b.dataset.buy);
    if ($("#desk").classList.contains("active")) { renderAll(); evaluateSoon(); } else if ($("#hq").classList.contains("active")) openHQ();
  });
  m.classList.remove("hidden");
  const f = $("#rsList .focus"); if (f) f.scrollIntoView({ block: "center" });
  $("#rsClose").onclick = () => m.classList.add("hidden");
}

function contractStateFor(a, sc) {
  const c = CONTRACTS[sc], ok = (k) => a.done[k] && PASS.includes(a.done[k].grade);
  return c.req.every((grp) => grp.some(ok)) && a.rep >= c.rep;
}

// After a flight: reputation, money back, contract reward, medals, calendar.
function applyCareerResult(res) {
  const a = agency(); if (!a || a.seen.includes(res.seed)) return null;
  const sc = res.design.scenario, sco = res.score, sim = res.sim, ev = res.evaluation;
  const repGain = { S: 12, A: 9, B: 6, C: 3, F: -4 }[sco.grade] + (sim.outcome === "lost" ? -6 : sim.outcome === "cancelled" ? -4 : 0);
  const savings = Math.max(0, Math.round(sim.reserve_end * ev.cost.budget * 0.5));
  const reward = Math.round(CONTRACTS[sc].reward * ({ S: 1.5, A: 1.2, B: 1.0, C: 0.6, F: 0 }[sco.grade]));
  a.rep = Math.max(0, Math.min(100, a.rep + repGain));
  a.funds += savings + reward;
  const ok = PASS.includes(sco.grade) && sim.outcome !== "lost";
  if (!a.done[sc] || sco.total > a.done[sc].score) a.done[sc] = { grade: sco.grade, score: sco.total };
  // reusable rockets: a used booster is spent, landed boosters join the fleet (up to 3 per rocket type)
  a.boosters = a.boosters || {};
  const usedLv = res.design.launch_vehicle && ev.reused_booster ? [res.design.launch_vehicle] :
    ev.program ? [...new Set(ev.program.flights.filter((f) => f.reused).map((f) => f.lv))].filter((k) => (res.design.boosters || {})[k]) : [];
  usedLv.forEach((k) => { a.boosters[k] = Math.max(0, (a.boosters[k] || 0) - 1); });
  Object.entries(sim.boosters_recovered || {}).forEach(([k, n]) => { a.boosters[k] = Math.min(3, (a.boosters[k] || 0) + n); });
  const newMedals = MILESTONES.filter((m) => !a.medals.includes(m.k) && ok && m.sc.includes(sc));
  newMedals.forEach((m) => a.medals.push(m.k));
  const launchMonth = (ev.schedule && ev.schedule.launch_month) || a.month;
  a.seen.push(res.seed); a.seen = a.seen.slice(-50);
  a.log.push({ month: launchMonth, text: `${S.cat.SCENARIOS[sc].name}: ${sco.grade} (${sim.outcome})` });
  saveAgency(a);
  // development of the next mission overlaps this one: the clock moves to a year before this launch, at least 6 months on
  if (sc === "iss_resupply" && ok) { const x = agency(); x.iss_due = launchMonth + 24 + (sim.launch_delay || 0); saveAgency(x); }
  advanceTo(Math.max(a.month + 3, launchMonth + (sim.launch_delay || 0)));   // building the spacecraft takes until launch day
  return { repGain, savings, reward, rep: agency().rep, funds: agency().funds, medals: newMedals.map((m) => m.name),
    unlocked: ORDER.filter((k) => CONTRACTS[k] && contractState(k).open && !a.done[k]).map((k) => S.cat.SCENARIOS[k].name) };
}

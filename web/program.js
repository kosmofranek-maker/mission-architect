// Mission Architect: programs made of many launches (space station, Moon base, crewed Mars expedition).
// The desk shows a launch manifest instead of a parts binder: a plan chart, one row per flight and a payload catalog.
"use strict";

const isProgram = () => S.design && (S.cat.SCENARIOS[S.design.scenario].kind === "program");
const progSpec = () => scen().program;
const PAYLOAD_ICON = { core: "bus", hab: "bus", lab: "flask", truss: "solar", cargo: "capsule", cargo_l: "capsule", crew: "person",
  lcargo: "chute", lcargo_l: "chute", lpower: "rtg", lrover: "wheel", lcrew_s: "person", lcrew: "person",
  mhab: "bus", mpower: "solar", mcargo: "chute", mtransit: "nozzle", mcrew: "person" };
const kt = (kg) => `${fmt(kg / 1000, 1)} t`;

function bestLV(p) {
  const pay = S.cat.PAYLOADS[p], crew = pay.group === "crew";
  const fit = Object.entries(S.cat.LAUNCH_VEHICLES).filter(([k, v]) => v.capacity[pay.target] >= pay.mass * 1.03 && (!crew || S.cat.CREW_RATED.includes(k)))
    .sort((a, b) => a[1].cost - b[1].cost);
  return fit.length ? fit[0][0] : null;
}
function payloadStats(p) {
  const o = S.cat.PAYLOADS[p], bits = [`${kt(o.mass)}`, `${fmt(o.cost)} M$`];
  if (o.crew) bits.push(`${o.crew} crew`);
  if (o.supplies) bits.push(`${kt(o.supplies)} supplies`);
  if (o.power_gen) bits.push(`+${o.power_gen} kW`);
  if (o.beds) bits.push(`${o.beds} bunks`);
  if (o.power_use) bits.push(`uses ${o.power_use} kW`);
  if (o.land_risk) bits.push(`landing risk ${pct(o.land_risk)}`);
  return bits.join(" · ");
}

// ---------------------------------------------------------------------------- manifest binder
function renderManifest(head) {
  const P = progSpec(), ev = S.ev, pr = ev && ev.kind === "program" ? ev.program : null, man = S.design.manifest;
  const locked = S.mode === "team" && !canEdit("manifest");
  let h = head + `<div class="plan-wrap"><canvas id="planChart" width="520" height="132"></canvas></div>`;
  h += `<h4>Launch manifest${pr ? ` &middot; ${pr.flights.length} flight${pr.flights.length === 1 ? "" : "s"}` : ""}</h4>`;
  if (!pr || !pr.flights.length) h += `<p class="req-small">No flights yet. Add the first one from the catalog below.</p>`;
  else h += `<div class="manifest">` + pr.flights.map((fl) => {
    const lvSel = fl.partner ? `<span class="m-fixed">${esc(fl.lv_name)}</span>` :
      `<select data-lv="${fl.i}" ${locked ? "disabled" : ""}><option value="">choose rocket</option>${Object.entries(S.cat.LAUNCH_VEHICLES).map(([k, v]) => {
        const cap = v.capacity[S.cat.PAYLOADS[fl.p].target];
        return `<option value="${k}" ${k === fl.lv ? "selected" : ""}>${esc(v.name.split(" (")[0])} · ${cap ? kt(cap) : "can't reach"}${S.cat.CREW_RATED.includes(k) ? " · crew" : ""} · ${v.cost} M$</option>`;
      }).join("")}</select>`;
    const slot = fl.partner ? `<span class="m-fixed">${esc(fl.slot_label)}</span>` :
      `<span class="m-slot"><button class="btn tiny" data-sd="-1" data-i="${fl.i}" ${locked || fl.slot === 0 ? "disabled" : ""}>-</button><b>${esc(fl.slot_label)}</b><button class="btn tiny" data-sd="1" data-i="${fl.i}" ${locked || fl.slot >= P.slots - 1 ? "disabled" : ""}>+</button></span>`;
    const st = fl.problems.length ? `<span class="m-bad">${esc(fl.problems.join(", "))}</span>` :
      `<span class="m-ok">${icon("check", 12)} ${fl.margin != null ? `${pct(1 - fl.margin)} of the rocket` : "partner flight"}</span>`;
    return `<div class="mrow ${fl.partner ? "partner" : ""} ${fl.problems.length ? "bad" : ""}">
      <span class="m-n">${fl.n}</span>${icon(fl.partner ? `flag_${fl.partner}` : PAYLOAD_ICON[fl.p] || "star", 16)}
      <span class="m-name"><b>${esc(fl.name)}</b><small>${kt(fl.mass)}${fl.cost ? ` · ${fmt(fl.cost)} M$` : " · free"}</small></span>
      ${lvSel}${slot}${st}${fl.partner ? "" : `<button class="btn tiny m-del" data-del="${fl.i}" ${locked ? "disabled" : ""}>x</button>`}</div>`;
  }).join("") + `</div>`;
  h += `<h4>Add a flight</h4><div class="cards">` + P.payloads.map((k) => {
    const o = S.cat.PAYLOADS[k];
    return `<div class="card ${locked ? "disabled" : ""}" data-add="${k}"><div class="ci">${icon(PAYLOAD_ICON[k] || "star", 32)}</div>
      <div class="cn">${esc(o.name)}</div><div class="cs">${payloadStats(k)}</div><div class="cl">${esc(o.learn || "")}</div></div>`;
  }).join("") + `</div>`;
  const binder = $("#binder"), top = binder.scrollTop;
  binder.innerHTML = h; binder.scrollTop = top;
  drawLab($("#labCanvas"), "manifest", _labFrame);
  drawPlanChart();
  const put = (m) => setField("manifest", m);
  $$("#binder [data-lv]").forEach((s) => s.onchange = () => { const m = man.map((x) => ({ ...x })); m[+s.dataset.lv].lv = s.value || null; put(m); });
  $$("#binder [data-sd]").forEach((b) => b.onclick = () => {
    const m = man.map((x) => ({ ...x })), i = +b.dataset.i; m[i].slot = Math.max(0, Math.min(P.slots - 1, m[i].slot + Number(b.dataset.sd))); put(m);
  });
  $$("#binder [data-del]").forEach((b) => b.onclick = () => put(man.filter((_, i) => i !== +b.dataset.del)));
  $$("#binder [data-add]").forEach((c) => c.onclick = () => {
    if (man.length >= 16) return toast("16 flights is the most one program office can manage.");
    put([...man, { p: c.dataset.add, lv: bestLV(c.dataset.add), slot: defaultSlot(c.dataset.add) }]);
  });
}
function defaultSlot(p) {
  const P = progSpec(), man = S.design.manifest;
  if (P.windows) return ["mtransit", "mcrew"].includes(p) ? Math.min(1, P.slots - 1) : 0;
  if (p === "core") return 0;
  return Math.min(P.slots - 1, man.length ? Math.max(...man.map((f) => f.slot)) : 0);
}

// Plan chart: launch slots, flights, supplies on board (green) and crew aboard (blue band). Red line = supplies run out.
function drawPlanChart() {
  const cv = $("#planChart"); if (!cv) return;
  const g = cv.getContext("2d"), W = cv.width, H = cv.height, ev = S.ev;
  g.fillStyle = "#1d3a5e"; g.fillRect(0, 0, W, H);
  if (!ev || ev.kind !== "program") return;
  const pr = ev.program, rows = pr.plan, m0 = pr.start, m1 = Math.max(pr.end, pr.slots[pr.slots.length - 1].month + 3);
  const X = (m) => 30 + ((m - m0) / Math.max(1, m1 - m0)) * (W - 40);
  g.font = "9px Silkscreen, monospace"; g.textAlign = "center";
  pr.slots.forEach((s) => {
    g.fillStyle = "rgba(156,192,234,.25)"; g.fillRect(Math.round(X(s.month)), 0, 1, H - 14);
    g.fillStyle = "#9cc0ea"; g.fillText(s.label.replace(" window", ""), X(s.month), H - 3);
  });
  const maxStock = Math.max(1000, ...rows.map((r) => r.stock));
  // crew band
  rows.forEach((r) => { if (r.crew) { g.fillStyle = r.crew > r.beds ? "#b3372d" : "rgba(88,183,201,.55)"; g.fillRect(X(r.month), H - 30, Math.max(1, X(r.month + 1) - X(r.month)), Math.min(14, r.crew * 3)); } });
  // supplies line
  g.strokeStyle = "#8fe07a"; g.lineWidth = 2; g.beginPath();
  rows.forEach((r, i) => { const x = X(r.month), y = H - 34 - (r.stock / maxStock) * (H - 64); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.stroke();
  if (pr.shortage != null) { g.fillStyle = "#ff6b5b"; g.fillRect(Math.round(X(pr.shortage)), 6, 2, H - 20); }
  // flights stacked at their launch month
  const stack = {};
  pr.flights.forEach((fl) => {
    const k = fl.launch, n = (stack[k] = (stack[k] || 0) + 1) - 1, x = X(fl.launch) - 5, y = 4 + n * 12;
    const im = iconImg(fl.partner ? `flag_${fl.partner}` : PAYLOAD_ICON[fl.p] || "star");
    if (im.complete) g.drawImage(im, x, y, 11, 11); else im.onload = () => drawPlanChart();
    if (fl.problems.length) { g.fillStyle = "#ff6b5b"; g.fillRect(x + 10, y, 3, 3); }
  });
  g.textAlign = "left"; g.fillStyle = "#8fe07a"; g.fillText("supplies", 4, 10); g.fillStyle = "#58b7c9"; g.fillText("crew", 4, H - 18);
}
const _iconImgs = {};
function iconImg(name) {
  if (!_iconImgs[name]) { const im = new Image(); im.src = icon(name, 16).match(/src="([^"]+)"/)[1]; _iconImgs[name] = im; }
  return _iconImgs[name];
}

// ---------------------------------------------------------------------------- review sheet
function programMeters(ev) {
  const pr = ev.program, c = ev.cost;
  const fits = pr.flights.filter((f) => f.capacity).map((f) => f.mass / f.capacity), worst = fits.length ? Math.max(...fits) : 0;
  const peak = pr.plan.reduce((a, r) => (r.power_gen ? Math.max(a, r.power_use / r.power_gen) : a), 0);
  const res = pr.min_reserve_months, crewF = ev.science.goals.find((g) => g.tag === "crew");
  return meter("rocket", "ROCKETS", worst, pr.flights.length ? `worst ${pct(worst)} full` : "no flights", worst > 1 ? "bad" : worst > 0.95 ? "warn" : "", 0.95) +
    meter("bolt", "POWER", peak, peak ? `peak ${pct(peak)}` : "-", peak > 1 ? "bad" : peak > 0.85 ? "warn" : "", 1 / 1.2) +
    meter("battery", "SUPPLIES", pr.shortage != null ? 0 : res == null ? 0 : Math.min(1, res / 6),
      pr.shortage != null ? "run out!" : res == null ? "no crew" : `${fmt(res, 1)} mo spare`, pr.shortage != null ? "bad" : res != null && res < 2 ? "warn" : "", 2 / 6) +
    meter("person", "CREW", crewF ? crewF.fraction : 0, `${fmt(pr.crew_months)} crew-mo`, crewF && crewF.fraction < 0.5 ? "bad" : crewF && crewF.fraction < 1 ? "warn" : "", 0.5) +
    meter("coin", "COST", c.total / c.budget, `${fmt(c.total)}/${fmt(c.budget)} M$`, c.total > c.budget && !S.design.sandbox ? "bad" : c.reserve < 0.1 ? "warn" : "", 0.9) +
    meter("star", "GOALS", ev.science.score / 100, `${fmt(ev.science.score)} / 100`, ev.science.score < 40 ? "bad" : ev.science.score < 70 ? "warn" : "", 0.7);
}

// ---------------------------------------------------------------------------- the outpost drawing (blueprint, film, newspaper)
// state: { modules: [...keys present], crew: n }. pal: "blue" for the blueprint, otherwise real colours.
function drawOutpost(g, place, state, cx, cy, s = 1, pal = "real", t = 0) {
  const B = pal === "blue";
  const col = (real, blue) => (B ? blue : real);
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
  const mods = state.modules || [], count = (k) => mods.filter((m) => m === k).length;
  if (place === "station") {
    const trusses = count("truss");
    if (trusses) {
      r(-50, -16, 100, 2, col("#9c9284", "#9cc0ea"));
      for (let k = 0; k < trusses; k++) for (const side of [-1, 1]) {
        const x = side * (22 + k * 16) - (side < 0 ? 12 : 0);
        r(x, -34, 12, 16, col("#25456b", "#5b86b8")); r(x, -34, 12, 1, col("#8fb3e8", "#dce9f8")); r(x + 6, -34, 1, 16, col("#3d6fa8", "#9cc0ea"));
        r(x, -14, 12, 16, col("#25456b", "#5b86b8")); r(x, -14, 12, 1, col("#8fb3e8", "#dce9f8"));
      }
    }
    const order = mods.filter((k) => ["hab", "lab"].includes(k));
    if (mods.includes("core")) { r(-10, -5, 20, 10, col("#d8aa45", "#c9a24a")); r(-10, -5, 20, 1, col("#f4e7b0", "#dce9f8")); r(-2, -9, 4, 4, col("#b9b9b9", "#9cc0ea")); }
    order.forEach((k, i) => {
      const side = i % 2 ? -1 : 1, slot = Math.floor(i / 2), x = side > 0 ? 10 + slot * 18 : -28 - slot * 18;
      r(x, -4, 18, 8, col(k === "hab" ? "#e9e3d6" : "#c9d3c3", k === "hab" ? "#dce9f8" : "#9cc0ea"));
      r(x, -4, 18, 1, col("#ffffff", "#ffffff")); if (k === "lab") r(x + 4, -1, 10, 2, col("#3d6fa8", "#5b86b8"));
    });
    if (state.crew) { const x = 10 + Math.ceil(order.length / 2) * 18; r(x, -3, 5, 6, col("#f4efe2", "#ffffff")); r(x + 5, -2, 2, 4, col("#1d1a17", "#5b86b8")); }
    if (state.cargo) { const x = -28 - Math.ceil(order.length / 2) * 18 - 8; r(x, -3, 8, 6, col("#7d7d7d", "#9cc0ea")); }
    return;
  }
  // surface bases (moon / mars)
  const ground = col(place === "mars" ? "#b8703f" : "#8d8a84", "#5b86b8");
  r(-80, 12, 160, 2, ground);
  const habs = mods.filter((k) => ["base_hab", "mhab"].includes(k));
  habs.forEach((k, i) => {
    const x = -14 + i * 30;
    if (k === "base_hab") { r(x, 0, 24, 12, col("#e9e3d6", "#dce9f8")); r(x + 2, -4, 20, 4, col("#e9e3d6", "#dce9f8")); r(x + 6, -7, 12, 3, col("#e9e3d6", "#dce9f8")); r(x + 10, 4, 4, 8, col("#3b342d", "#5b86b8")); }
    else { r(x, -6, 26, 16, col("#e9e3d6", "#dce9f8")); r(x, -6, 26, 1, col("#ffffff", "#ffffff")); r(x + 3, 10, 2, 2, col("#9c9284", "#9cc0ea")); r(x + 21, 10, 2, 2, col("#9c9284", "#9cc0ea")); r(x + 10, 0, 6, 4, col("#58b7c9", "#9cc0ea")); }
  });
  if (place === "moon") { r(-70, 4, 4, 8, col("#9c9284", "#9cc0ea")); r(-74, -6, 12, 10, col("#25456b", "#5b86b8")); }   // the old solar field
  for (let k = 0; k < count("lpower"); k++) { const x = 40 + k * 14; r(x, 2, 5, 10, col("#5b534b", "#9cc0ea")); for (let y = 2; y < 12; y += 3) r(x - 4, y, 13, 1, col("#9c9284", "#dce9f8")); }
  for (let k = 0; k < count("mpower"); k++) { const x = 44 + k * 26; r(x, 4, 8, 8, col("#d8aa45", "#c9a24a")); r(x - 12, 2, 10, 4, col("#25456b", "#5b86b8")); r(x + 10, 2, 10, 4, col("#25456b", "#5b86b8")); }
  for (let k = 0; k < count("lrover"); k++) { const x = -60 + ((t * 0.5) % 30); r(x, 4, 16, 6, col("#e9e3d6", "#dce9f8")); r(x + 1, 10, 3, 3, col("#2e2925", "#5b86b8")); r(x + 12, 10, 3, 3, col("#2e2925", "#5b86b8")); r(x + 11, 5, 4, 2, col("#58b7c9", "#9cc0ea")); }
  for (let k = 0; k < (state.landers || 0); k++) { const x = -40 - k * 12; r(x, 4, 8, 5, col("#9c9284", "#9cc0ea")); r(x - 2, 9, 2, 3, col("#7d7d7d", "#9cc0ea")); r(x + 8, 9, 2, 3, col("#7d7d7d", "#9cc0ea")); }
  for (let k = 0; k < Math.min(6, state.crew || 0); k++) { const x = 18 + k * 5 + ((t + k * 7) % 20 < 10 ? 0 : 1); r(x, 6, 3, 3, col("#f4efe2", "#ffffff")); r(x, 9, 3, 3, col("#e9e3d6", "#dce9f8")); }
}
function outpostState(modules, crew, flights, upto) {
  const cargo = (flights || []).filter((f) => ["cargo", "cargo_l"].includes(f.p) && (upto == null || f.arrival <= upto)).length;
  const landers = (flights || []).filter((f) => ["lcargo", "lcargo_l", "mcargo"].includes(f.p) && (upto == null || f.arrival <= upto)).length;
  return { modules, crew, cargo: cargo > 0 && crew > 0, landers };
}
function drawProgramBlueprint(g, W, H) {
  const ev = S.ev, place = progSpec().place;
  const flights = ev && ev.kind === "program" ? ev.program.flights : [];
  const mods = [...progSpec().existing, ...flights.filter((f) => S.cat.PAYLOADS[f.p].group === "module").map((f) => f.p)];
  drawOutpost(g, place, outpostState(mods, flights.some((f) => S.cat.PAYLOADS[f.p].group === "crew") ? 4 : 0, flights, null), W / 2, H / 2 + (place === "station" ? 14 : 4), place === "station" ? 1.1 : 1.0, "blue");
  const crewMo = ev && ev.kind === "program" ? ev.program.crew_months : 0;
  $("#bpSlots").textContent = `${flights.length} flight(s) planned · ${fmt(crewMo)} crew-months`;
}

// ---------------------------------------------------------------------------- Cadet advisor for programs
// Follows the reference plan, then fixes whatever blocks it: rockets, order, supplies, power.
function programAdvisor() {
  const ev = S.ev, man = S.design.manifest, P = progSpec();
  if (!ev || ev.kind !== "program") return null;
  const pr = ev.program, slotLabel = (i) => pr.slots[i].label;
  const set = (m, text) => ({ program: true, text, apply: () => setField("manifest", m) });
  const clone = () => man.map((f) => ({ ...f }));
  // 1. blockers on existing flights
  for (const fl of pr.flights.filter((f) => !f.partner && f.problems.length)) {
    const name = fl.name;
    if (fl.problems.some((p) => /rocket|heavy|reach|crew/.test(p))) {
      const lv = bestLV(fl.p); if (!lv) continue;
      const m = clone(); m[fl.i].lv = lv;
      return set(m, `Flight ${fl.n}, the ${name}, should fly on ${S.cat.LAUNCH_VEHICLES[lv].name.split(" (")[0]}: it is the cheapest rocket${S.cat.PAYLOADS[fl.p].crew ? " rated for crew" : ""} that can lift it`);
    }
    if (fl.problems.some((p) => /transit stages/.test(p))) {
      return set([...clone(), { p: "mtransit", lv: bestLV("mtransit"), slot: fl.slot }], `The crew ship needs another transit stage segment in the ${slotLabel(fl.slot)}`);
    }
    if (fl.problems.some((p) => /first/.test(p)) && fl.slot < P.slots - 1) {
      const m = clone(); m[fl.i].slot = fl.slot + 1;
      return set(m, `Move flight ${fl.n} (${name}) to ${slotLabel(fl.slot + 1)}: what it needs must be in place first`);
    }
  }
  const blocker = (area) => ev.issues.find((i) => i.severity === "blocker" && i.area === area);
  if (blocker("power")) {
    const p = { station: "truss", moon: "lpower", mars: "mpower" }[P.place];
    return set([...clone(), { p, lv: bestLV(p), slot: 0 }], `We need more power: add a ${S.cat.PAYLOADS[p].name} early, in ${slotLabel(0)}`);
  }
  if (blocker("supplies") && pr.shortage != null) {
    const p = { station: "cargo", moon: "lcargo", mars: "mcargo" }[P.place];
    const cruise = S.cat.PAYLOADS[p].cruise || 0;
    let slot = 0; pr.slots.forEach((s) => { if (s.month + cruise < pr.shortage) slot = s.i; });
    return set([...clone(), { p, lv: bestLV(p), slot }], `The crew would run out of food. Send a ${S.cat.PAYLOADS[p].name} in ${slotLabel(slot)}`);
  }
  // 2. follow the reference plan
  const ref = (S.cat.DEFAULTS[S.design.scenario].manifest || []);
  const have = man.map((f) => `${f.p}@${f.slot}`), used = new Set();
  for (const f of ref) {
    const idx = have.findIndex((h, i) => h === `${f.p}@${f.slot}` && !used.has(i));
    if (idx >= 0) { used.add(idx); continue; }
    const why = S.cat.PAYLOADS[f.p].group === "crew" ? "astronauts are the point of the whole program" :
      S.cat.PAYLOADS[f.p].group === "cargo" ? "the crew eats about 75 kg of supplies a month each" : "it is the next piece of the outpost";
    return set([...clone(), { ...f }], `Next: the ${S.cat.PAYLOADS[f.p].name} on ${S.cat.LAUNCH_VEHICLES[f.lv].name.split(" (")[0]} in ${slotLabel(f.slot)}, because ${why}`);
  }
  return null;
}

// ---------------------------------------------------------------------------- handbook tips
function programTips() {
  const P = progSpec(), T = [], ev = S.ev;
  T.push(`Every astronaut eats, drinks and breathes about <b>${S.cat.SUPPLY_KG_PER_CREW_MONTH} kg a month</b>, even with water recycling. Crews stay ${P.stay} months.`);
  T.push(`Astronauts may only fly on rockets rated for crew: <b>${S.cat.CREW_RATED.map((k) => S.cat.LAUNCH_VEHICLES[k].name.split(" (")[0]).join(", ")}</b>.`);
  if (P.place === "station") T.push("The core module goes first: everything else docks to it. Solar trusses before the lab, or the lights go out.");
  if (P.place === "moon") T.push("The base's small solar field gives 12 kW: enough for two astronauts, not four. A fission unit works through the 14-day night.");
  if (P.place === "mars") T.push("Mars windows open every 26 months. Land the habitat and power plant in the first window; send the crew only in the next one, with two transit stage segments launched in the same window.");
  if (ev && ev.kind === "program" && ev.program.min_reserve_months != null) T.push(`Spare supplies at the tightest moment: <b>${fmt(ev.program.min_reserve_months, 1)} months</b>. Two or more lets you survive one failed cargo flight.`);
  T.push("Partners (Partners tab) build and launch some flights for free on their own dates, and a robotic arm makes docking safer.");
  return T;
}

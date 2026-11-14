// In-browser smoke test of the real UI. Open /#selftest; the result lands in document.title.
"use strict";
(async () => {
  const errs = []; addEventListener("error", (e) => errs.push(e.message)); addEventListener("unhandledrejection", (e) => errs.push(String(e.reason)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms = 5000) => { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) throw new Error("timeout: " + fn); await wait(50); } };
  const log = [];
  const ok = (cond, msg) => { if (!cond) throw new Error(msg); log.push(msg); };
  const has = (f, k) => S.ev && (Array.isArray(S.ev.design[f]) ? S.ev.design[f].includes(k) : S.ev.design[f] === k);
  const pick = async (tab, f, k) => {
    if (f === "rtg") {
      document.querySelector('.tab[data-tab="power"]').click();
      document.querySelector('[data-rtg="1"]').click();
      return until(() => S.ev && S.ev.design.rtg === k);
    }
    document.querySelector(`.tab[data-tab="${tab}"]`).click();
    document.querySelector(`.card[data-f="${f}"][data-k="${k}"]`).click();
    try { await until(() => has(f, k)); } catch { throw new Error(`pick ${f}=${k} failed in ${S.design.scenario} [now ${S.ev && S.ev.design[f]}, card ${!!document.querySelector(`.card[data-f="${f}"][data-k="${k}"]`)}] (mode ${S.mode}, toast "${$("#toast").textContent}", roles ${S.myRoles}, room ${S.room})`); }
  };
  const buildMars = async () => {
    await pick("orbit", "orbit", "elliptical"); await pick("launch", "window", "w2");
    for (const i of ["sounder", "wac", "irspec"]) await pick("instr", "instruments", i);
    await pick("bus", "bus", "medium");
    await pick("power", "solar", "large"); await pick("power", "battery", "b3000");
    await pick("adcs", "adcs", "wheels"); await pick("prop", "propulsion", "biprop");
    await pick("comms", "comms", "kahga"); await pick("comms", "ground", "dsn34");
    await pick("computer", "computer", "radtol");
  };
  try {
    await until(() => S.cat);
    S.player = "tester"; S.noSave = true; store.set("difficulty", "normal");
    // ---- tutorial
    document.querySelector('[data-go="tutorial"]').click();
    await until(() => !$("#letter").classList.contains("hidden"), 12000);
    $("#letterBody").click();
    ok(/forty thousand hectares/.test($("#letterBody").textContent) && $("#letterFrom").textContent === "Chief Dana Okafor", "client letter opens the mission");
    $("#letterGo").click();
    await until(() => S.tut && S.ev);
    ok($("#letter").classList.contains("hidden"), "letter closes, tutorial follows");
    S.noLetter = true;
    ok($("#desk").classList.contains("active") && !$("#tut").classList.contains("hidden"), "tutorial opens on desk");
    ok(S.ev.issues.filter((i) => i.area === "missing").length === 12, "blank design: 12 choices (incl. launch date)");
    ok(!S.design.bus && !S.design.orbit && !S.design.instruments.length, "no preset parts");
    for (let n = 0; n < 3; n++) $("#tutNext").click();
    ok(S.tut.i === 3 && $(".col-mid").classList.contains("tut-focus") && S.tab === "orbit", "tutorial waits for orbit");
    document.querySelector('.card[data-f="orbit"][data-k="sso"]').click();
    await until(() => S.tut && S.tut.i === 4, 3000);
    ok(S.tab === "instr", "tutorial advances to instruments after the pick");
    $("#tutSkip").click();
    ok(!S.tut && $("#tut").classList.contains("hidden"), "skip closes tutorial");
    ok($$("#tabs .tab").length === 10 && !$(".tab.door") && $("#labCanvas").dataset.lab === "instr", "10 plain tabs (with build and test), lab scene shown");
    document.querySelector('.tab[data-tab="power"]').click();
    ok($("#labCanvas").dataset.lab === "power" && $("#binder").classList.contains("walk-l") && /Power Lab/.test($(".lab-plate").textContent), "walking to the power lab");
    // ---- career: an agency with calendar, money, reputation, research and contracts
    { const old = newAgency(); old.offers = [{ k: "stellar", until: 99 }]; old.tech.push("co_stellar"); old.research = [{ t: "gone", done: 5 }];
      store.set("agency", old); go("career");
      ok($$("#hqContracts .folder").length > 0 && $("#hqLog"), "an old saved career still opens"); }
    store.set("agency", null); go("career");
    ok($("#hq").classList.contains("active") && $$("#hqContracts .folder").length === 17, "career opens agency HQ with 17 contracts");
    ok(!document.querySelector('#hqContracts [data-sc="wildfire"]').classList.contains("locked") && document.querySelector('#hqContracts [data-sc="lunar_ice"]').classList.contains("locked"), "first contracts open, later ones locked");
    $("#hqResearch").click();
    const f0 = agency().funds;
    document.querySelector('#rsList [data-buy="power"]').click();
    ok(agency().funds === f0 - 50 && agency().research.length === 1 && !agency().tech.includes("power"), "research costs funds and takes time");
    advanceTo(agency().month + 4);
    ok(agency().tech.includes("power") && /NASA/.test($("#hqName").textContent), "research completes after a few months; you work for NASA");
    $("#rsClose").click();
    document.querySelector('#hqContracts [data-sc="wildfire"]').click();
    await until(() => !$("#letter").classList.contains("hidden") || S.ev);
    if (!$("#letter").classList.contains("hidden")) $("#letterGo").click();
    await until(() => S.ev && S.ev.design.scenario === "wildfire");
    $("#tutSkip") && S.tut && $("#tutSkip").click();
    ok(/MAY 2027/.test($("#tbDay").textContent), "desk shows the agency calendar");
    document.querySelector('.tab[data-tab="bus"]').click();
    ok(document.querySelector('.card.research') && /Research: Large spacecraft buses/.test($("#binder").textContent), "locked parts point to research");
    loadDesign(S.cat.DEFAULTS.wildfire);
    await until(() => S.ev && S.ev.ok && S.ev.design.start_month === agency().month);
    $("#launchBtn").click();
    await until(() => $("#launch").classList.contains("active"), 6000);
    await wait(300); $("#skipBtn").click();
    await until(() => $("#news").classList.contains("active") && $(".agency-report"), 8000);
    ok(/Reputation \d+/.test($(".agency-report").textContent) && agency().log.length >= 1, "agency report after the flight");
    const passedNow = PASS.includes(S.result.score.grade) && S.result.sim.outcome !== "lost";
    $("#nNext").click();
    ok($("#hq").classList.contains("active") && agency().month > 0, "back at HQ, the calendar moved on");
    if (passedNow) ok(!document.querySelector('#hqContracts [data-sc="lunar_ice"]').classList.contains("locked"), "success opens the next contract");
    { const x = agency(); x.rep = 45; saveAgency(x); advanceTo(agency().month + 12); }
    openHQ();
    ok(agency().world.length >= 1 && $("#hqTicker .tick-run"), "news ticker shows other agencies' missions");
    ok(agency().iss_due != null, "the ISS needs regular supplies");
    store.set("agency", null);
    // ---- surface mission: landing tab, sites, airbags need air
    S.mode = "free"; openSelect();
    document.querySelector('.folder[data-sc="lunar_lander"]').click();
    await until(() => S.ev && S.ev.design.scenario === "lunar_lander");
    ok($$("#tabs .tab").length === 11 && document.querySelector('.tab[data-tab="edl"]') && /Site/.test($("#tabs").textContent), "lander: Site + Landing tabs");
    document.querySelector('.tab[data-tab="edl"]').click();
    ok(document.querySelector('.card[data-f="edl"][data-k="airbags"]').classList.contains("bad") && $("#labCanvas").dataset.lab === "edl", "airbags marked unusable on the airless Moon");
    document.querySelector('.tab[data-tab="instr"]').click();
    ok(document.querySelector('.card[data-k="drill"]') && !document.querySelector('.card[data-k="hirise"]'), "surface instruments only");
    // ---- program: manifest with flights, order rules, crew rating
    S.mode = "free"; openSelect();
    document.querySelector('.folder[data-sc="orbital_outpost"]').click();
    await until(() => S.ev && S.ev.design.scenario === "orbital_outpost");
    ok($$("#tabs .tab").length === 1 && $("#planChart") && $$('#binder [data-add]').length === 7, "program desk: manifest only, 7 payloads");
    document.querySelector('#binder [data-add="hab"]').click();
    await until(() => S.ev && S.ev.program.flights.length === 1);
    ok(S.ev.issues.some((i) => i.area === "order"), "habitat before the core is blocked");
    document.querySelector('#binder [data-add="core"]').click();
    await until(() => S.ev && S.ev.program.flights.length === 2);
    ok(!S.ev.issues.some((i) => i.area === "order") && S.ev.program.flights[1].lv === "new_glenn", "core fixes the order; cheapest rocket that lifts it");
    document.querySelector('#binder [data-del="0"]').click();
    await until(() => S.ev && S.ev.program.flights.length === 1);
    ok(true, "flight removed");
    // ---- design your own crew vehicle
    S.mode = "free"; openSelect();
    document.querySelector('.folder[data-sc="crew_transport"]').click();
    await until(() => S.ev && S.ev.design.scenario === "crew_transport");
    ok($$("#tabs .tab").length === 4 && S.tab === "hull", "spaceship desk: hull, heat shield, escape and landing, launch");
    await pick("hull", "shape", "winged"); await pick("hull", "seats", "s4");
    document.querySelector('.tab[data-tab="safety"]').click();
    ok(document.querySelector('.card[data-f="abort"][data-k="tower"]').classList.contains("bad"), "a winged shuttle cannot use an escape tower");
    await pick("safety", "abort", "none"); await pick("safety", "landing", "runway"); await pick("shield", "heatshield", "tiles");
    await pick("launch", "launch_vehicle", "falcon_heavy");
    ok(S.ev.issues.some((i) => /not rated for crew/.test(i.text)) && /1 loss in/.test($("#meters").textContent), "crew rating enforced, safety shown as 1 in X");
    // ---- the ISS is already in orbit
    S.mode = "free"; openSelect();
    document.querySelector('.folder[data-sc="iss_resupply"]').click();
    await until(() => S.ev && S.ev.design.scenario === "iss_resupply");
    document.querySelector('#binder [data-add="crew"]').click();
    await until(() => S.ev && S.ev.program.flights.length === 1);
    ok(!S.ev.issues.some((i) => i.area === "order"), "crew can fly straight to the existing ISS");
    // ---- solo, build from blank
    S.mode = "free"; openSelect();
    document.querySelector('.folder[data-sc="mars_climate"]').click();
    await until(() => S.ev && S.ev.scenario.name.startsWith("Mars"));
    ok($(".bp-empty") !== null, "empty blueprint placeholder");
    await buildMars();
    ok($(".bp-empty") === null, "blueprint drawn once a bus is chosen");
    await pick("launch", "launch_vehicle", "electron");
    ok(!S.ev.ok && S.ev.issues.some((i) => i.area === "launch"), "electron to Mars is blocked");
    $("#launchBtn").click();
    ok(!$("#stampTool").classList.contains("hidden"), "stamp tool drops");
    await until(() => $("#stampMark").textContent === "REJECTED" && $("#stampTool").classList.contains("hidden"));
    ok(true, "rejected stamp lands and tool lifts");
    // handbook from the in-game menu
    $("#menuBtn").click(); $("#mHints").click();
    ok(!$("#hints").classList.contains("hidden") && $$("#hbNav [data-s]").length === 12, "handbook opens with 12 stages (with build and NASA advice)");
    ok(/only given at Cadet/.test($("#hbBody").textContent) && /Your design right now/.test($("#hbBody").textContent), "engineer handbook: status, no tips");
    $("#hbClose").click();
    await pick("launch", "launch_vehicle", "falcon9");
    ok(S.ev.ok, "design flight ready: " + S.ev.issues.filter((i) => i.severity === "blocker").map((i) => i.text).join("; "));
    ok(!document.querySelector(".tab .todo"), "no tab left with missing parts");
    await pick("instr", "instruments", "radar");
    ok(S.ev.science.goals.find((g) => g.tag === "subsurface").fraction > 0, "radar adds subsurface science");
    $("#yearsUp").click(); await until(() => S.ev.design.years === 5); ok(true, "years stepper");
    $("#launchBtn").click();
    await until(() => $("#launch").classList.contains("active"), 4000);
    await wait(300); $("#skipBtn").click();
    await until(() => $("#news").classList.contains("active"));
    ok($("#paper").classList.contains("spin") && $(".news-actions").classList.contains("wait"), "newspaper spins in");
    await until(() => !$(".news-actions").classList.contains("wait") && $(".grade-stamp").classList.contains("slam"), 8000);
    ok($("#finalScore").textContent === String(S.result.score.total), "grade slams and score counts up");
    ok(/Luis Herrera, Planetary Climate Lab/.test($(".quote").textContent), "client quoted in the newspaper");
    ok(/MONTH \d+ \/ \d+/.test($("#flightDash").textContent) && $$("#flightDash .fd-g").length === 6, "flight dashboard with 6 resource gauges");
    ok(drawer.of("mars_climate").some((x) => x.flight && x.flight.seed === S.result.seed), "flown design filed in the drawer");
    $("#nCompare").click();
    await until(() => $$("table.cmp tr").length > 10 && /Success odds/.test($("#cmpBody").textContent), 15000);
    ok(/Total cost/.test($("#cmpBody").textContent) && $("#cmpVerdict").textContent.length > 5, "comparison table with risk odds + verdict");
    $("#cmpClose").click();
    ok(/THE ORBITAL TIMES/.test($("#paper").textContent) && $(".grade-stamp b").textContent.length === 1, "launch + newspaper with grade");
    ok(/The real one: Mars Reconnaissance Orbiter/i.test($("#paper").textContent), "newspaper shows the real NASA mission");
    $("#nReport").click();
    ok(!$("#dossier").classList.contains("hidden") && $$("#dosBody .seg-grid > div").length >= 4 && $$("#dosBody table.mel tr").length > 8
      && /Mars Reconnaissance Orbiter/.test($("#dosBody").textContent), "mission report: four segments, equipment list, real mission");
    $("#dosClose").click();
    ok(tradesNow() >= 1 && cmlNow().steps.length === 4, "concept maturity ladder computed");
    // ---- Cadet: follow the advisor's suggestions only, for every mission
    store.set("difficulty", "easy");
    for (const sc of ORDER) {
      S.mode = "free"; openSelect();
      document.querySelector(`.folder[data-sc="${sc}"]`).click();
      await until(() => S.ev && S.ev.design.scenario === sc && S.advice);
      if (sc === "wildfire") {
        ok(S.advice.field === "orbit" && /I suggest/.test($("#speech").dataset.full) && !$(".advice") && !$(".card.suggest"), "cadet: hint only in the client's speech");
      }
      for (let n = 0; n < 30 && S.advice && (isProgram() || !(S.ev.ok && !S.ev.issues.some((i) => i.severity === "blocker"))); n++) {
        const a = S.advice;
        if (a.program) {
          a.apply();
          await until(() => S.ev && JSON.stringify(S.ev.design.manifest) === JSON.stringify(S.design.manifest) && S.advice !== a);
          continue;
        }
        if (a.field === "instruments" && S.ev.design.instruments.includes(a.key)) break;
        await pick(FIELD_TAB[a.field], a.field, a.key);
      }
      if (sc === "mars_climate") {
        openHints("launch");
        ok(/Rockets that lift it|No rocket can lift/.test($("#hbBody").textContent), "cadet handbook: launch tips computed from the design");
        document.querySelector('#hbNav [data-s="power"]').click();
        ok(/Smallest array|RTGs already|biggest array/.test($("#hbBody").textContent), "cadet handbook: power tips suggest an array");
        $("#hbClose").click();
      }
      if (isProgram()) ok(S.ev.science.score >= 70, `cadet: program ${sc} reaches its goals (${S.ev.science.score})`);
      ok(S.ev.ok, `cadet: suggestions alone build a flight-ready ${sc} (left: ${S.ev.issues.filter((i) => i.severity === "blocker").map((i) => i.text).join("; ")})`);
    }
    // ---- Flight Director: only "requirements not met", no details, no coloured meters
    store.set("difficulty", "hard");
    S.mode = "free"; openSelect();
    document.querySelector('.folder[data-sc="wildfire"]').click();
    await until(() => S.ev && S.ev.design.difficulty === "hard");
    ok(/incomplete/.test($("#issues").textContent) && !/Choose/.test($("#issues").textContent), "director: blank design is just 'incomplete'");
    await pick("orbit", "orbit", "sso"); await pick("launch", "window", "w2");
    for (const i of ["thermal", "wac", "sounder"]) await pick("instr", "instruments", i);
    await pick("bus", "bus", "cubesat"); await pick("power", "solar", "small"); await pick("power", "battery", "b1000");
    await pick("adcs", "adcs", "wheels"); await pick("prop", "propulsion", "mono"); await pick("comms", "comms", "xlga");
    await pick("comms", "ground", "commercial"); await pick("computer", "computer", "radtol"); await pick("launch", "launch_vehicle", "falcon9");
    const txt = $("#issues").textContent + $("#speech").dataset.full;
    ok(/does not meet requirements/.test(txt) && !/slots|kg/.test(txt), "director: vague verdict, no details");
    ok(!document.querySelector("#meters .bar.bad, #meters .bar.warn, .card.suggest, .advice"), "director: no coloured meters or suggestions");
    store.set("difficulty", "normal");
    // ---- team room (one player holding all four roles), also starts blank
    stopPoll(); show("team");
    $("#createRoom").click();
    await until(() => S.room && $("#roleCards").children.length === 4);
    for (const r of ["manager", "systems", "science", "comms"]) {
      const before = S.myRoles.length;
      document.querySelector(`.role-card[data-r="${r}"]`).click();
      await until(() => S.myRoles.length === before + 1);
    }
    $("#enterRoom").click();
    await until(() => $("#desk").classList.contains("active") && S.ev);
    ok(!S.ev.design.bus, "team room starts blank");
    S.design.scenario = "wildfire";
    await pick("orbit", "orbit", "sso"); await pick("launch", "window", "w2");
    for (const i of ["thermal", "wac"]) await pick("instr", "instruments", i);
    await pick("bus", "bus", "smallsat"); await pick("power", "solar", "small"); await pick("power", "battery", "b1000");
    await pick("adcs", "adcs", "wheels"); await pick("prop", "propulsion", "mono"); await pick("comms", "comms", "xlga");
    await pick("comms", "ground", "commercial"); await pick("computer", "computer", "radtol"); await pick("launch", "launch_vehicle", "electron");
    ok($$("#cmlStrip i").length === 4 && $$("#meters .seg-head").length === 4, "review sheet: CML ladder and four mission segments");
    const costBefore = S.ev.cost.total;
    await pick("build", "testing", "tlyf"); await pick("build", "spare", "spare");
    await until(() => S.ev.build.spare && S.ev.cost.total > costBefore);
    ok(S.ev.schedule.risk_mult < 1 && S.ev.cost.items["Second flight unit"] > 0, "build lab: test like you fly and a second flight unit");
    $("#cmlStrip").click();
    ok(!$("#proc").classList.contains("hidden") && $$("#procBody .proc-steps div").length === 6 && $$("#procBody .seg-grid > div").length === 4, "mission process sheet: six steps, four segments");
    $("#procLib").click();
    ok(!$("#library").classList.contains("hidden") && $$("#libBody .lib-item").length === 9, "NASA library lists the nine challenge resources");
    $("#libClose").click();
    openHints("nasa");
    ok($$("#hbBody .tip").length >= 10 && /CubeSat 101/.test($("#hbBody").textContent), "handbook: NASA advice with sources");
    $("#hbClose").click();
    ok(S.ev.ok && $("#launchBtn").disabled, "team launch locked until approvals");
    for (const r of Object.keys(S.cat.ROLES)) {
      document.querySelector(`.appr[data-role="${r}"]`).click();
      await until(() => S.approvals[r]);
    }
    ok(!$("#launchBtn").disabled, "all approvals unlock launch");
    await pick("launch", "launch_vehicle", "falcon9");
    await until(() => !S.approvals.manager);
    ok(true, "change resets approvals");
    stopPoll();
    document.title = "SELFTEST PASS " + log.length;
  } catch (e) {
    document.title = "SELFTEST FAIL " + e.message + (errs.length ? " | JS errors: " + errs.join("; ") : "") + " | passed: " + log.join(", ");
  }
})();

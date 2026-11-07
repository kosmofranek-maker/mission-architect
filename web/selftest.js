// In-browser smoke test of the real UI. Open /#selftest; the result lands in document.title.
"use strict";
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms = 5000) => { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) throw new Error("timeout: " + fn); await wait(50); } };
  const log = [];
  const ok = (cond, msg) => { if (!cond) throw new Error(msg); log.push(msg); };
  const has = (f, k) => S.ev && (f === "instruments" ? S.ev.design.instruments.includes(k) : S.ev.design[f] === k);
  const pick = async (tab, f, k) => {
    document.querySelector(`.tab[data-tab="${tab}"]`).click();
    document.querySelector(`.card[data-f="${f}"][data-k="${k}"]`).click();
    try { await until(() => has(f, k)); } catch { throw new Error(`pick ${f}=${k} failed (mode ${S.mode}, toast "${$("#toast").textContent}", roles ${S.myRoles}, room ${S.room})`); }
  };
  const buildMars = async () => {
    await pick("orbit", "orbit", "elliptical");
    for (const i of ["sounder", "wac", "irspec"]) await pick("instr", "instruments", i);
    await pick("bus", "bus", "medium");
    await pick("power", "solar", "large"); await pick("power", "battery", "b3000");
    await pick("adcs", "adcs", "wheels"); await pick("prop", "propulsion", "biprop");
    await pick("comms", "comms", "kahga"); await pick("comms", "ground", "dsn34");
    await pick("computer", "computer", "radtol");
  };
  try {
    await until(() => S.cat);
    S.player = "tester"; S.noSave = true;
    // ---- tutorial
    document.querySelector('[data-go="tutorial"]').click();
    await until(() => S.tut && S.ev);
    ok($("#desk").classList.contains("active") && !$("#tut").classList.contains("hidden"), "tutorial opens on desk");
    ok(S.ev.issues.filter((i) => i.area === "missing").length === 11, "blank design: 11 parts to choose");
    ok(!S.design.bus && !S.design.orbit && !S.design.instruments.length, "no preset parts");
    for (let n = 0; n < 3; n++) $("#tutNext").click();
    ok(S.tut.i === 3 && $(".col-mid").classList.contains("tut-focus") && S.tab === "orbit", "tutorial waits for orbit");
    document.querySelector('.card[data-f="orbit"][data-k="sso"]').click();
    await until(() => S.tut && S.tut.i === 4, 3000);
    ok(S.tab === "instr", "tutorial advances to instruments after the pick");
    $("#tutSkip").click();
    ok(!S.tut && $("#tut").classList.contains("hidden"), "skip closes tutorial");
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
    ok(!$("#hints").classList.contains("hidden") && $$("#hbNav [data-s]").length === 10, "handbook opens with 10 stages");
    document.querySelector('#hbNav [data-s="launch"]').click();
    ok(/Rockets that lift it|No rocket can lift/.test($("#hbBody").textContent), "launch tips are computed from the design");
    document.querySelector('#hbNav [data-s="power"]').click();
    ok(/Smallest array|RTGs already|biggest array/.test($("#hbBody").textContent), "power tips suggest an array");
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
    ok(/THE ORBITAL TIMES/.test($("#paper").textContent) && $(".grade-stamp b").textContent.length === 1, "launch + newspaper with grade");
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
    await pick("orbit", "orbit", "sso");
    for (const i of ["thermal", "wac"]) await pick("instr", "instruments", i);
    await pick("bus", "bus", "smallsat"); await pick("power", "solar", "small"); await pick("power", "battery", "b1000");
    await pick("adcs", "adcs", "wheels"); await pick("prop", "propulsion", "mono"); await pick("comms", "comms", "xlga");
    await pick("comms", "ground", "commercial"); await pick("computer", "computer", "radtol"); await pick("launch", "launch_vehicle", "electron");
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
    document.title = "SELFTEST FAIL " + e.message + " | passed: " + log.join(", ");
  }
})();

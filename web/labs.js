// Every catalog tab is its own lab. Lab scenes are pixel art drawn in code and animate a little
// (lights, wheels, flames). LABS[id].door is the accent colour of the room.
"use strict";

const LABS = {
  launch:   { name: "Launch Contracts Office", door: "#8a3b2c" },
  orbit:    { name: "Flight Dynamics Lab", door: "#2f5d8a" },
  bus:      { name: "Integration Hangar", door: "#7a6a3a" },
  power:    { name: "Power Lab", door: "#b38a2a" },
  adcs:     { name: "Guidance & Control Lab", door: "#5d4a8a" },
  prop:     { name: "Propulsion Test Stand", door: "#8a5a2c" },
  edl:      { name: "Landing Test Hall", door: "#a8322a" },
  comms:    { name: "Communications Center", door: "#2f7a6a" },
  computer: { name: "Avionics Lab", door: "#3c5c25" },
  instr:    { name: "Science Instrument Lab", door: "#5f666c" },
  partners: { name: "International Office", door: "#1d3f8f" },
  manifest: { name: "Program Planning Office", door: "#3b5a6e" },
  hull:     { name: "Crew Vehicle Hangar", door: "#7a6a3a" },
  shield:   { name: "Heat Shield Arc-Jet Lab", door: "#8a5a2c" },
  safety:   { name: "Escape and Landing Test Range", door: "#a8322a" },
};

// ---------------------------------------------------------------------------- lab scenes (256 x 42)
const LAB_W = 256, LAB_H = 42;

function drawLab(canvas, id, t) {
  const g = canvas.getContext("2d");
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const rnd = _rng(_hash(id) + Math.floor(t / 3));
  const wall = (c, c2) => { r(0, 0, LAB_W, 34, c); r(0, 25, LAB_W, 9, c2); r(0, 25, LAB_W, 1, _darken(c2, 0.3)); r(0, 0, LAB_W, 2, "#1d1a17"); };
  const floor = (a, b) => { for (let x = 0; x < LAB_W; x += 8) r(x, 34, 8, 8, (x / 8) % 2 ? a : b); r(0, 34, LAB_W, 1, "#1d1a17"); };
  const lights = () => { for (let x = 24; x < LAB_W; x += 64) { r(x, 2, 18, 2, "#f4efe2"); r(x + 2, 4, 14, 1, "#c9c1a8"); } };
  const person = (x, coat, skin = "#c99a74", hair = "#2b2018", bob = 0) => {
    const y = 34 - 15;
    r(x + 1, y + bob, 4, 4, skin); r(x + 1, y + bob, 4, 1, hair);
    r(x, y + 4, 6, 7, coat); r(x + 2, y + 4, 2, 2, "#e9e3d6");
    r(x - 1, y + 5 + (t % 8 < 4 ? 0 : 1), 1, 4, coat); r(x + 6, y + 5, 1, 4, coat);
    r(x + 1, y + 11, 1, 4, "#2e2925"); r(x + 4, y + 11, 1, 4, "#2e2925");
  };
  const desk = (x, w) => { r(x, 26, w, 2, "#6b4a33"); r(x + 1, 28, 2, 6, "#4e3624"); r(x + w - 3, 28, 2, 6, "#4e3624"); };
  const screen = (x, y, w, h, c = "#0f1a14") => { r(x - 1, y - 1, w + 2, h + 2, "#1d1a17"); r(x, y, w, h, c); };
  const blink = (x, y, c, on) => r(x, y, 1, 1, on ? c : "#1d1a17");

  switch ({ hull: "bus", shield: "prop", safety: "edl" }[id] || id) {
    case "launch": {
      wall("#6b5a45", "#4e4133"); floor("#3e352c", "#463c31"); lights();
      // window with the pad
      r(140, 5, 100, 19, "#1d1a17"); for (let y = 0; y < 17; y++) r(141, 6 + y, 98, 1, ["#7fa6d0", "#8fb3e0", "#a9c6e8", "#c3d8ee"][Math.floor(y / 5)]);
      r(141, 20, 98, 3, "#5d7a3c"); r(190, 5, 1, 19, "#1d1a17");
      r(206, 7, 2, 13, "#7d7d7d"); for (let y = 8; y < 20; y += 3) r(204, y, 4, 1, "#7d7d7d");
      r(210, 8, 4, 12, "#f4efe2"); r(211, 6, 2, 2, "#b3372d"); r(210, 12, 4, 1, "#1d1a17");
      if (t % 6 < 3) { r(209, 20, 6, 1, "#e9e3d6"); r(207 + (t % 3), 19, 2, 1, "#c9c1a8"); }
      // rocket posters (the catalog)
      [[14, 6], [34, 9], [54, 4], [74, 2], [94, 0]].forEach(([x, h], i) => {
        r(x, 5, 14, 18, "#e9dfc6"); r(x, 5, 14, 1, "#9a7428");
        r(x + 6, 20 - 4 - h, 2, 4 + h, "#f4efe2"); r(x + 6, 19 - 4 - h, 2, 1, "#b3372d"); r(x + 5, 19, 4, 1, "#5b534b");
        if (i === 4) { r(x + 3, 20 - 4 - h + 3, 2, 3 + h - 3, "#d9792b"); r(x + 9, 20 - 4 - h + 3, 2, 3 + h - 3, "#d9792b"); }
      });
      desk(40, 46); r(46, 23, 8, 3, "#2e2925"); r(56, 24, 10, 2, "#e9dfc6"); r(68, 23, 10, 3, "#f4efe2");
      person(92, "#2c3b55", "#a8724f", "#1f1a17", t % 10 < 5 ? 0 : 1);
      break;
    }
    case "orbit": {
      wall("#3b4656", "#2c3542"); floor("#2a2d33", "#33373e"); lights();
      r(16, 4, 118, 21, "#6b4a33"); r(18, 6, 114, 17, "#23382c");                           // chalkboard
      const cx = 60, cy = 14;
      for (let a = 0; a < 6.28; a += 0.12) r(cx + Math.cos(a) * 32, cy + Math.sin(a) * 6, 1, 1, "#c9d3c3");
      for (let a = 0; a < 6.28; a += 0.2) r(cx + Math.cos(a) * 14, cy + Math.sin(a) * 4, 1, 1, "#9fb39a");
      r(cx - 3, cy - 3, 6, 6, "#3d6fa8"); r(cx - 2, cy - 3, 3, 2, "#5d8a3c");
      const a1 = t / 6, a2 = t / 3;
      r(cx + Math.cos(a1) * 32 - 1, cy + Math.sin(a1) * 6 - 1, 2, 2, "#e8cf52");
      r(cx + Math.cos(a2) * 14, cy + Math.sin(a2) * 4, 1, 1, "#d0607f");
      [[100, 8, 22], [100, 12, 16], [100, 16, 26], [100, 20, 12]].forEach(([x, y, w]) => r(x, y, w, 1, "#c9d3c3"));
      desk(150, 60); screen(158, 13, 22, 12); screen(186, 13, 22, 12);
      for (let x = 0; x < 20; x++) r(159 + x, 19 + Math.round(Math.sin((x + t) / 3) * 3), 1, 1, "#58b7c9");
      r(188, 15, 18, 8, "#0f1a14"); for (let i = 0; i < 4; i++) r(189, 15 + i * 2, 4 + ((t + i * 3) % 12), 1, "#5d8a3c");
      person(220, "#e8e4dc", "#e3c19c", "#16141a", t % 12 < 6 ? 0 : 1);
      break;
    }
    case "bus": {
      wall("#8a8f94", "#6d7378"); for (let x = 0; x < LAB_W; x += 32) r(x, 2, 1, 23, "#777c81");
      floor("#9a9a90", "#a6a69b"); for (let x = 0; x < LAB_W; x += 8) r(x, 34, 4, 1, "#e8cf52");
      r(0, 4, LAB_W, 2, "#d9792b"); const cx = 128 + Math.round(Math.sin(t / 10) * 2);       // crane rail + trolley
      r(cx - 6, 6, 12, 3, "#4b4b4b"); r(cx, 9, 1, 3, "#1d1a17"); r(cx - 2, 12, 5, 1, "#1d1a17");
      r(108, 30, 40, 4, "#5b534b"); r(114, 27, 2, 3, "#5b534b"); r(140, 27, 2, 3, "#5b534b"); // stand
      r(112, 13, 32, 14, "#9a7428"); r(113, 14, 30, 12, "#d8aa45");                         // spacecraft in gold foil
      for (let i = 0; i < 5; i++) r(115 + i * 6, 15 + (i % 2) * 5, 3, 2, "#e8cf52");
      r(102, 15, 10, 9, "#25456b"); r(144, 15, 10, 9, "#25456b"); r(102, 19, 10, 1, "#8fb3e8"); r(144, 19, 10, 1, "#8fb3e8");
      r(124, 9, 8, 4, "#e9e3d6"); r(127, 8, 2, 1, "#7d7d7d");                               // antenna
      person(80, "#f4efe2", "#e9e3d6", "#f4efe2", 0); r(81, 20, 4, 2, "#58b7c9");             // bunny suits
      person(170, "#f4efe2", "#e9e3d6", "#f4efe2", t % 10 < 5 ? 0 : 1); r(171, 20, 4, 2, "#58b7c9");
      r(20, 14, 26, 10, "#e9dfc6"); r(22, 16, 22, 1, "#1d1a17"); r(22, 19, 14, 1, "#1d1a17"); // checklist board
      r(210, 22, 20, 12, "#5b534b"); r(212, 24, 16, 8, "#7d7d7d");                          // tool cart
      break;
    }
    case "power": {
      wall("#4a4a3a", "#3a3a2e"); floor("#2e2c26", "#36342d");
      r(30, 3, 40, 4, "#e8cf52"); r(32, 4, 36, 2, "#fff6c8");                               // sun simulator
      for (let y = 7; y < 17; y++) for (let x = 28; x < 74; x++) if ((x + y + t) % 5 === 0 && Math.abs(x - 50) < 14 + (y - 7)) r(x, y, 1, 1, "#8a7a3a");
      for (let y = 0; y < 9; y++) r(30 + y, 17 + y, 40, 1, y % 3 === 0 ? "#8fb3e8" : "#25456b"); // tilted panel
      r(48, 26, 2, 8, "#5b534b");
      for (let k = 0; k < 3; k++) {                                                          // battery racks
        const x = 104 + k * 22; r(x, 8, 18, 26, "#4b4b4b"); r(x + 1, 9, 16, 24, "#2e2e2e");
        const lvl = (t + k * 4) % 16;
        for (let i = 0; i < 6; i++) r(x + 3, 30 - i * 4, 12, 2, i * 3 < lvl ? "#5d8a3c" : "#3c3c3c");
      }
      r(200, 14, 12, 20, "#4b4b4b"); for (let y = 15; y < 33; y += 3) r(196, y, 20, 1, "#7d7d7d");   // RTG
      r(204, 20, 4, 5, t % 8 < 4 ? "#b3372d" : "#d9792b");
      r(222, 6, 13, 11, "#e8cf52"); r(224, 8, 9, 7, "#1d1a17"); r(225, 9, 7, 5, "#e8cf52"); r(228, 10, 1, 2, "#1d1a17"); r(228, 13, 1, 1, "#1d1a17"); // hazard sign
      person(176, "#4b5a3a", "#c99a74", "#3b2a1e", t % 14 < 7 ? 0 : 1);
      break;
    }
    case "adcs": {
      wall("#3d3550", "#2e2840"); floor("#26222e", "#2e2938"); lights();
      screen(150, 5, 86, 18, "#05050a");                                                     // star projector
      for (let i = 0; i < 26; i++) { const x = 151 + Math.floor(rnd() * 84), y = 6 + Math.floor(rnd() * 16); r(x, y, 1, 1, rnd() > 0.3 ? "#f4efe2" : "#8c8a99"); }
      r(30, 27, 70, 3, "#7d7d7d"); r(34, 30, 3, 4, "#4b4b4b"); r(93, 30, 3, 4, "#4b4b4b");     // air-bearing table
      const cx = 64, cy = 18;
      for (let a = 0; a < 6.28; a += 0.25) r(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 1, 1, "#b9b9b9");
      for (let k = 0; k < 3; k++) { const a = t / 2 + k * 2.09; for (let d = 1; d < 7; d++) r(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1, 1, "#e9e3d6"); }
      r(cx - 1, cy - 1, 3, 3, "#d8aa45"); r(cx - 1, 25, 3, 2, "#5b534b");
      r(120, 18, 8, 6, "#2e2925"); r(126, 19, 4, 4, "#58b7c9"); r(123, 24, 1, 10, "#5b534b"); r(119, 33, 9, 1, "#5b534b"); // star tracker
      for (let x = 130; x < 150; x += 2) r(x, 20 - Math.floor((x - 130) / 4), 1, 1, "#58b7c9");
      person(14, "#2c3b55", "#efd2bd", "#d8c27a", t % 10 < 5 ? 0 : 1);
      break;
    }
    case "prop": {
      wall("#6e6a62", "#57534c"); floor("#4a4740", "#524e47");
      for (let i = 0; i < 18; i++) r(150 + rnd() * 90, 8 + rnd() * 20, 2, 1, "#4a4740");          // scorch
      r(60, 4, 3, 30, "#4b4b4b"); r(120, 4, 3, 30, "#4b4b4b"); r(60, 4, 63, 3, "#4b4b4b");      // steel frame
      r(70, 8, 12, 18, "#e9e3d6"); r(70, 8, 12, 2, "#b9b9b9"); r(88, 8, 12, 18, "#d9792b"); r(88, 8, 12, 2, "#9a5520"); // tanks
      r(104, 14, 10, 8, "#5b534b"); r(114, 12, 4, 12, "#7d7d7d"); r(118, 10, 4, 16, "#4b4b4b");  // engine pointing right
      const len = 40 + (t % 3) * 6;
      for (let i = 0; i < len; i++) {
        const w = 4 + Math.floor(i / 5), y0 = 18 - w / 2 + (rnd() > 0.7 ? 1 : 0);
        r(122 + i, y0, 1, w, i < 8 ? "#fff6c8" : i < 20 ? "#e8cf52" : i < 32 ? "#d9792b" : "#b3372d");
      }
      [10, 26].forEach((x, i) => r(x, 6, 4, 4, (t + i * 3) % 6 < 3 ? "#b3372d" : "#5a1a14"));   // warning lights
      r(6, 14, 34, 12, "#2e2925"); r(8, 16, 30, 8, "#58b7c9"); r(8, 16, 30, 1, "#8fd3e0");     // bunker window
      r(18, 18, 4, 4, "#c99a74"); r(17, 22, 6, 2, "#4b5a3a");
      break;
    }
    case "edl": {
      wall("#5a5048", "#463e37"); floor("#8a6a4a", "#94744f"); lights();
      r(30, 2, 3, 32, "#5b534b"); r(30, 2, 60, 2, "#5b534b");                                  // drop tower
      const drop = (t * 2) % 26;                                                             // test capsule under a canopy
      r(58, 4 + drop, 22, 3, "#b3372d"); r(60, 3 + drop, 18, 1, "#f4efe2"); r(64, 4 + drop, 4, 3, "#f4efe2");
      for (let i = 0; i < 5; i++) { r(60 + i, 7 + drop + i, 1, 1, "#b9b9b9"); r(77 - i, 7 + drop + i, 1, 1, "#b9b9b9"); }
      r(65, 12 + drop, 8, 5, "#9c9284"); r(64, 16 + drop, 10, 1, "#6b4a33");
      [[120, 22], [131, 20], [142, 23], [126, 27], [138, 28]].forEach(([x, y]) => {             // airbag cluster
        r(x, y, 11, 9, "#e8e4dc"); r(x + 1, y + 1, 9, 1, "#f4efe2"); r(x, y + 8, 11, 1, "#b9b6ae");
      });
      r(170, 10, 34, 24, "#4b4b4b"); r(172, 12, 30, 20, "#7d7d7d");                          // heat shield on a stand
      for (let y = 0; y < 8; y++) r(176 + y, 14 + y, 22 - y * 2, 1, y % 2 ? "#6b4a33" : "#8a5a2c");
      r(214, 8, 6, 26, "#5b534b"); r(206, 8, 22, 2, "#d9792b");                                // sky-crane rig
      r(212, 14, 1, 10 + (t % 8 < 4 ? 0 : 2), "#1d1a17"); r(222, 14, 1, 10 + (t % 8 < 4 ? 0 : 2), "#1d1a17");
      r(208, 24 + (t % 8 < 4 ? 0 : 2), 18, 6, "#d8aa45");
      person(100, "#4b5a3a", "#c48d63", "#2b2018", t % 12 < 6 ? 0 : 1);
      break;
    }
    case "comms": {
      wall("#1f2a33", "#18212a"); floor("#1d242b", "#232b33");
      r(14, 4, 136, 20, "#1d1a17"); r(15, 5, 134, 18, "#25456b");                           // world map
      [[20, 8, 22, 9], [36, 15, 10, 7], [66, 7, 14, 6], [70, 12, 12, 10], [88, 6, 34, 8], [118, 16, 14, 5]].forEach(([x, y, w, h]) => r(x, y, w, h, "#3c5c25"));
      [[30, 11], [74, 9], [128, 18]].forEach(([x, y], i) => r(x, y, 2, 2, (t + i * 4) % 12 < 8 ? "#e8cf52" : "#25456b")); // DSN sites
      desk(14, 136); for (let k = 0; k < 4; k++) {
        screen(20 + k * 32, 27, 24, 6); for (let x = 0; x < 24; x++) r(20 + k * 32 + x, 30 + Math.round(Math.sin((x * (k + 1) + t * 2) / 3) * 2), 1, 1, "#5d8a3c");
      }
      r(170, 4, 76, 26, "#1d1a17"); r(171, 5, 74, 24, "#0d0c12");                              // window: big dish at night
      for (let i = 0; i < 14; i++) r(172 + rnd() * 72, 6 + rnd() * 10, 1, 1, "#8c8a99");
      for (let x = -14; x <= 14; x++) r(208 + x, 12 + Math.round(x * x / 26), 1, 2, "#b9b9b9");
      r(207, 20, 2, 9, "#7d7d7d"); r(200, 27, 16, 2, "#5b534b"); r(207, 8, 2, 5, "#7d7d7d");
      if (t % 8 < 4) for (let i = 0; i < 3; i++) r(209 + i * 3, 6 - i * 2, 1, 1, "#58b7c9");
      break;
    }
    case "computer": {
      wall("#2b2f2b", "#222622"); floor("#1f221f", "#262a26"); lights();
      for (let k = 0; k < 3; k++) {                                                          // server racks
        const x = 14 + k * 24; r(x, 6, 20, 28, "#1d1a17"); r(x + 1, 7, 18, 26, "#3c3c3c");
        for (let y = 9; y < 32; y += 3) { r(x + 2, y, 16, 2, "#2e2e2e"); blink(x + 3, y, "#5d8a3c", rnd() > 0.3); blink(x + 5, y, "#d9792b", rnd() > 0.8); }
      }
      desk(100, 70); r(108, 23, 30, 3, "#3c5c25"); for (let i = 0; i < 6; i++) r(110 + i * 4, 24, 2, 1, "#d8aa45");
      r(114, 22, 6, 1, "#1d1a17"); r(142, 20, 10, 6, "#7d7d7d"); r(144, 19, 1, 1, "#b3372d");   // board + scope
      r(186, 8, 52, 26, "#5b534b"); r(188, 10, 48, 22, "#4b4b4b");                            // radiation chamber
      r(196, 14, 14, 12, "#1d1a17"); r(197, 15, 12, 10, t % 10 < 5 ? "#3d6fa8" : "#25456b");
      r(216, 14, 13, 11, "#e8cf52"); r(221, 18, 3, 3, "#1d1a17"); r(218, 16, 3, 2, "#1d1a17"); r(224, 16, 3, 2, "#1d1a17"); r(221, 22, 3, 2, "#1d1a17");
      person(160, "#e9e3d6", "#a87552", "#141012", t % 12 < 6 ? 0 : 1);
      break;
    }
    case "manifest": {
      wall("#3b4656", "#2c3542"); floor("#2a2d33", "#33373e"); lights();
      r(10, 4, 150, 20, "#e9dfc6"); r(10, 4, 150, 2, "#9a7428");                               // big planning board
      for (let x = 14; x < 158; x += 18) r(x, 7, 1, 16, "#c9c1a8");
      [[16, 9, 30, "#b3372d"], [34, 13, 40, "#3d6fa8"], [60, 17, 50, "#5d8a3c"], [90, 9, 36, "#d9792b"], [120, 13, 30, "#8a5aa6"]].forEach(([x, y, w, c]) => r(x, y, w, 3, c));
      r(16 + (t * 2) % 140, 6, 1, 18, "#b3372d");                                               // "today" line moving
      [[176, 10], [196, 6], [216, 12]].forEach(([x, h], i) => {                                 // rocket models on a shelf
        r(x, 24 - h - 8, 4, h + 8, "#f4efe2"); r(x + 1, 23 - h - 8, 2, 1, "#b3372d"); if (i === 1) { r(x - 3, 24 - h, 3, h, "#d9792b"); r(x + 4, 24 - h, 3, h, "#d9792b"); }
      });
      r(170, 24, 60, 2, "#6b4a33");
      person(60, "#2c3b55", "#e8c4a6", "#5a3a22", t % 10 < 5 ? 0 : 1); person(110, "#4b5a3a", "#6e4630", "#1a1716", t % 14 < 7 ? 0 : 1);
      break;
    }
    case "partners": {
      wall("#4a3b2e", "#3a2e24"); floor("#5a4632", "#634d37"); lights();
      [["#1d3f8f", "#f4efe2"], ["#f4efe2", "#bc002d"], ["#d52b1e", "#f4efe2"], ["#ff9933", "#138808"], ["#3d6fa8", "#f4efe2"]].forEach(([a, b], i) => {
        const x = 18 + i * 22, wave = (t + i) % 6 < 3 ? 0 : 1;                              // flags on poles
        r(x, 4, 1, 24, "#9c9284"); r(x + 1, 5 + wave, 12, 4, a); r(x + 1, 9 + wave, 12, 3, b);
      });
      r(140, 22, 90, 4, "#6b4a33"); r(146, 26, 3, 8, "#4e3624"); r(222, 26, 3, 8, "#4e3624");    // conference table
      [150, 172, 194, 214].forEach((x, i) => person(x, ["#2c3b55", "#5a3a6e", "#7a3b26", "#4b5a3a"][i], ["#e3c19c", "#8a5a3b", "#c99a74", "#efd2bd"][i], "#2b2018", (t + i * 3) % 10 < 5 ? 0 : 1));
      r(150, 4, 80, 14, "#1d1a17"); r(151, 5, 78, 12, "#25456b");                              // world map on the wall
      [[156, 8, 10, 5], [170, 7, 8, 7], [182, 6, 16, 6], [200, 10, 10, 5], [214, 7, 10, 6]].forEach(([x, y, w, h]) => r(x, y, w, h, "#3c5c25"));
      if (t % 8 < 4) r(225, 21, 2, 2, "#e8cf52");                                              // a signed paper
      break;
    }
    case "instr": {
      wall("#cfd6d8", "#aeb7ba"); floor("#b9c0c2", "#c4cbcd"); lights();
      r(10, 5, 40, 9, "#25456b"); r(12, 7, 36, 5, "#e9e3d6"); r(14, 9, 20, 1, "#25456b");       // clean room sign
      desk(20, 70); r(28, 16, 26, 7, "#f4efe2"); r(28, 16, 26, 1, "#b9b9b9"); r(54, 15, 5, 9, "#1d1a17"); r(55, 17, 3, 5, "#8fb3e8"); // telescope
      r(38, 23, 3, 3, "#7d7d7d"); r(64, 19, 12, 7, "#5b534b"); r(66, 21, 3, 2, "#e8cf52");
      screen(110, 6, 40, 14, "#0d0c12");                                                    // spectrum monitor
      ["#b3372d", "#d9792b", "#e8cf52", "#5d8a3c", "#3d6fa8", "#8a5aa6"].forEach((c, i) => r(112 + i * 6, 8, 6, 8, c));
      r(112 + (t * 2) % 36, 7, 1, 12, "#f4efe2"); r(112, 17, 36, 1, "#58b7c9");
      desk(100, 60); r(110, 22, 16, 4, "#e9e3d6"); r(130, 23, 8, 3, "#d8aa45");
      r(190, 10, 1, 24, "#7d7d7d"); r(184, 10, 40, 1, "#7d7d7d"); r(222, 8, 4, 4, "#d0607f");  // magnetometer boom
      person(166, "#f4efe2", "#e9e3d6", "#f4efe2", t % 10 < 5 ? 0 : 1); r(167, 20, 4, 2, "#58b7c9");
      person(236, "#e8e4dc", "#c48d63", "#2b2018", t % 14 < 7 ? 0 : 1);
      break;
    }
  }
}

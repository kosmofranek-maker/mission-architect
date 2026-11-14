// Pixel-art sprites drawn in code (no image files, no emoji). Every sprite becomes a data URL
// that is shown with `image-rendering: pixelated`, so it stays crisp at any scale.
"use strict";

const PAL = {
  ink: "#1d1a17", dark: "#2e2925", mid: "#5b534b", light: "#9c9284", paper: "#e9dfc6", white: "#f4efe2",
  red: "#b3372d", redD: "#7a231c", green: "#5d8a3c", greenD: "#3c5c25", blue: "#3d6fa8", blueD: "#25456b",
  blueL: "#8fb3e8", gold: "#d8aa45", goldD: "#9a7428", orange: "#d9792b", cyan: "#58b7c9", purple: "#8a5aa6",
  gray: "#7d7d7d", grayD: "#4b4b4b", grayL: "#b9b9b9", yellow: "#e8cf52", pink: "#d0607f", brown: "#6b4a33",
};

function _canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

function sprite(w, h, draw) {
  const c = _canvas(w, h), g = c.getContext("2d");
  const r = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  draw(r, g);
  return c.toDataURL();
}

// ---------------------------------------------------------------------------- 16x16 icons
const ICON_DRAW = {
  rocket(r) {
    r(7, 1, 2, 1, PAL.red); r(6, 2, 4, 2, PAL.red); r(6, 4, 4, 7, PAL.white); r(7, 5, 2, 2, PAL.blue);
    r(5, 8, 1, 4, PAL.red); r(10, 8, 1, 4, PAL.red); r(4, 10, 1, 3, PAL.red); r(11, 10, 1, 3, PAL.red);
    r(6, 11, 4, 1, PAL.grayD); r(7, 12, 2, 2, PAL.orange); r(7, 14, 2, 1, PAL.yellow);
  },
  bus(r) {
    r(3, 3, 10, 10, PAL.goldD); r(4, 4, 8, 8, PAL.gold); r(5, 5, 2, 1, PAL.yellow); r(4, 11, 8, 1, PAL.goldD);
    r(7, 1, 2, 2, PAL.grayL); r(7, 13, 2, 2, PAL.gray);
  },
  solar(r) {
    r(1, 4, 14, 8, PAL.blueL); r(2, 5, 12, 6, PAL.blueD);
    for (let x = 2; x < 14; x += 3) r(x, 5, 1, 6, PAL.blue); r(2, 7, 12, 1, PAL.blueL); r(7, 12, 2, 3, PAL.gray);
  },
  rtg(r) {
    r(6, 1, 4, 14, PAL.grayD); r(7, 1, 2, 14, PAL.gray);
    for (let y = 3; y < 14; y += 3) { r(3, y, 10, 1, PAL.grayD); r(4, y, 8, 1, PAL.gray); }
    r(7, 6, 2, 3, PAL.red);
  },
  battery(r) {
    r(3, 4, 10, 9, PAL.ink); r(4, 5, 8, 7, PAL.grayL); r(6, 2, 4, 2, PAL.ink); r(5, 9, 6, 2, PAL.green);
    r(5, 7, 6, 2, PAL.green); r(7, 6, 2, 1, PAL.white);
  },
  patch(r) { r(3, 6, 10, 6, PAL.goldD); r(4, 7, 8, 4, PAL.gold); r(7, 2, 2, 4, PAL.grayL); r(6, 1, 4, 1, PAL.grayL); },
  antenna(r) {
    r(7, 2, 2, 12, PAL.grayL); r(5, 13, 6, 2, PAL.gray); r(6, 1, 4, 2, PAL.white);
    r(3, 4, 1, 4, PAL.blueL); r(12, 4, 1, 4, PAL.blueL); r(1, 3, 1, 6, PAL.blueL); r(14, 3, 1, 6, PAL.blueL);
  },
  dish(r) {
    r(2, 3, 2, 2, PAL.white); r(3, 5, 2, 2, PAL.white); r(5, 7, 2, 2, PAL.white); r(7, 8, 3, 2, PAL.white);
    r(10, 7, 2, 2, PAL.white); r(12, 5, 2, 2, PAL.white); r(13, 3, 2, 2, PAL.white);
    r(4, 4, 9, 4, PAL.grayL); r(6, 6, 5, 2, PAL.grayL); r(8, 2, 1, 6, PAL.gray); r(8, 10, 1, 3, PAL.gray); r(6, 13, 5, 2, PAL.grayD);
  },
  station(r) {
    r(1, 13, 14, 2, PAL.greenD); r(7, 9, 2, 4, PAL.gray); r(5, 12, 6, 1, PAL.grayD);
    r(2, 3, 2, 2, PAL.white); r(3, 5, 2, 2, PAL.white); r(5, 7, 6, 2, PAL.white); r(11, 5, 2, 2, PAL.white); r(12, 3, 2, 2, PAL.white);
    r(4, 4, 8, 3, PAL.grayL); r(8, 1, 1, 4, PAL.gray);
  },
  chip(r) {
    r(4, 4, 8, 8, PAL.ink); r(5, 5, 6, 6, PAL.grayD); r(6, 6, 2, 2, PAL.green);
    for (let i = 5; i < 12; i += 2) { r(i, 2, 1, 2, PAL.grayL); r(i, 12, 1, 2, PAL.grayL); r(2, i, 2, 1, PAL.grayL); r(12, i, 2, 1, PAL.grayL); }
  },
  magnet(r) {
    r(3, 3, 3, 9, PAL.red); r(10, 3, 3, 9, PAL.blue); r(3, 11, 10, 2, PAL.grayL); r(5, 12, 6, 2, PAL.grayL);
    r(3, 3, 3, 2, PAL.white); r(10, 3, 3, 2, PAL.white);
  },
  wheel(r) {
    r(5, 2, 6, 1, PAL.grayL); r(3, 3, 10, 2, PAL.grayL); r(2, 5, 12, 6, PAL.grayL); r(3, 11, 10, 2, PAL.grayL); r(5, 13, 6, 1, PAL.grayL);
    r(4, 4, 8, 8, PAL.grayD); r(6, 6, 4, 4, PAL.gray); r(7, 7, 2, 2, PAL.white); r(7, 3, 2, 3, PAL.gray); r(7, 10, 2, 3, PAL.gray);
  },
  nozzle(r) {
    r(5, 1, 6, 4, PAL.grayL); r(6, 5, 4, 2, PAL.gray); r(5, 7, 6, 2, PAL.grayD); r(4, 9, 8, 2, PAL.grayD); r(3, 11, 10, 1, PAL.ink);
    r(6, 12, 4, 2, PAL.orange); r(7, 14, 2, 1, PAL.yellow);
  },
  globe(r) {
    r(5, 1, 6, 1, PAL.blueD); r(3, 2, 10, 2, PAL.blue); r(2, 4, 12, 8, PAL.blue); r(3, 12, 10, 2, PAL.blue); r(5, 14, 6, 1, PAL.blueD);
    r(4, 4, 4, 3, PAL.green); r(5, 7, 3, 3, PAL.green); r(9, 9, 3, 3, PAL.green); r(10, 3, 2, 2, PAL.green); r(1, 7, 14, 1, PAL.blueL);
  },
  chute(r) {
    r(3, 2, 10, 2, PAL.red); r(2, 3, 12, 2, PAL.white); r(1, 5, 14, 1, PAL.red); r(5, 3, 2, 3, PAL.red); r(9, 3, 2, 3, PAL.red);
    for (let i = 0; i < 6; i++) { r(2 + i, 6 + i, 1, 1, PAL.grayL); r(13 - i, 6 + i, 1, 1, PAL.grayL); }
    r(6, 12, 4, 3, PAL.gold); r(6, 12, 4, 1, PAL.goldD);
  },
  capsule(r) {
    r(7, 2, 2, 1, PAL.grayL); r(6, 3, 4, 2, PAL.grayL); r(5, 5, 6, 3, PAL.grayL); r(4, 8, 8, 3, PAL.grayL);
    r(3, 11, 10, 2, PAL.brown); r(4, 13, 8, 1, PAL.redD); r(6, 6, 2, 2, PAL.blueD);
  },
  drill(r) {
    r(5, 1, 6, 5, PAL.grayD); r(6, 2, 4, 3, PAL.gray); r(7, 6, 2, 7, PAL.grayL); r(7, 7, 1, 1, PAL.gray); r(8, 9, 1, 1, PAL.gray);
    r(7, 13, 2, 1, PAL.white); r(2, 14, 12, 2, PAL.brown); r(6, 13, 1, 1, PAL.brown); r(9, 13, 1, 1, PAL.brown);
  },
  seismo(r) {
    r(1, 8, 2, 1, PAL.green); r(3, 6, 1, 3, PAL.green); r(4, 3, 1, 9, PAL.green); r(5, 9, 1, 4, PAL.green); r(6, 5, 1, 5, PAL.green);
    r(7, 7, 1, 2, PAL.green); r(8, 8, 7, 1, PAL.green); r(0, 14, 16, 2, PAL.grayD);
  },
  none(r) { r(3, 3, 10, 10, PAL.mid); r(4, 4, 8, 8, PAL.dark); for (let i = 0; i < 8; i++) r(4 + i, 11 - i, 1, 1, PAL.light); },
  camera(r) {
    r(2, 5, 12, 8, PAL.ink); r(3, 6, 10, 6, PAL.grayD); r(4, 3, 4, 2, PAL.ink); r(6, 7, 4, 4, PAL.blueL); r(7, 8, 2, 2, PAL.blueD);
    r(11, 6, 1, 1, PAL.red);
  },
  telescope(r) {
    r(1, 6, 10, 4, PAL.white); r(2, 7, 8, 2, PAL.grayL); r(11, 5, 3, 6, PAL.ink); r(12, 6, 2, 4, PAL.blueL);
    r(5, 10, 2, 4, PAL.gray); r(3, 14, 6, 1, PAL.grayD);
  },
  flame(r) {
    r(7, 1, 2, 2, PAL.yellow); r(6, 3, 4, 2, PAL.orange); r(5, 5, 6, 3, PAL.orange); r(4, 8, 8, 4, PAL.red);
    r(6, 7, 4, 4, PAL.orange); r(7, 9, 2, 3, PAL.yellow); r(5, 12, 6, 2, PAL.redD);
  },
  prism(r) {
    r(7, 3, 2, 1, PAL.white); r(6, 4, 4, 2, PAL.white); r(5, 6, 6, 2, PAL.white); r(4, 8, 8, 2, PAL.white); r(3, 10, 10, 2, PAL.white);
    r(0, 6, 5, 1, PAL.white); r(11, 6, 5, 1, PAL.red); r(11, 7, 5, 1, PAL.orange); r(11, 8, 5, 1, PAL.yellow);
    r(11, 9, 5, 1, PAL.green); r(11, 10, 5, 1, PAL.blue); r(11, 11, 5, 1, PAL.purple);
  },
  atom(r) {
    r(7, 7, 2, 2, PAL.red); r(2, 7, 12, 1, PAL.cyan); r(7, 2, 1, 12, PAL.cyan);
    r(3, 3, 1, 1, PAL.cyan); r(4, 4, 1, 1, PAL.cyan); r(11, 11, 1, 1, PAL.cyan); r(12, 12, 1, 1, PAL.cyan);
    r(12, 3, 1, 1, PAL.cyan); r(11, 4, 1, 1, PAL.cyan); r(4, 11, 1, 1, PAL.cyan); r(3, 12, 1, 1, PAL.cyan); r(13, 7, 2, 2, PAL.white);
  },
  uv(r) {
    r(3, 3, 10, 10, PAL.purple); r(4, 4, 8, 8, PAL.ink); r(6, 6, 4, 4, PAL.purple); r(7, 7, 2, 2, PAL.white);
    r(1, 1, 1, 1, PAL.white); r(14, 2, 1, 1, PAL.white); r(13, 14, 1, 1, PAL.white);
  },
  laser(r) {
    r(1, 2, 6, 5, PAL.grayD); r(2, 3, 4, 3, PAL.gray); r(6, 4, 2, 1, PAL.red);
    for (let i = 0; i < 7; i++) r(7 + i, 5 + i, 1, 1, PAL.red); r(12, 13, 4, 1, PAL.brown); r(10, 14, 6, 2, PAL.brown);
  },
  radar(r) {
    r(1, 7, 3, 3, PAL.grayL); r(5, 5, 1, 7, PAL.cyan); r(6, 4, 1, 1, PAL.cyan); r(6, 12, 1, 1, PAL.cyan);
    r(8, 3, 1, 11, PAL.cyan); r(9, 2, 1, 1, PAL.cyan); r(9, 14, 1, 1, PAL.cyan); r(11, 1, 1, 15, PAL.cyan); r(14, 4, 1, 9, PAL.blueL);
  },
  magneto(r) {
    for (let i = 0; i < 10; i++) r(2 + i, 13 - i, 1, 1, PAL.grayL); r(11, 2, 4, 4, PAL.pink); r(12, 3, 2, 2, PAL.white);
    r(1, 12, 4, 3, PAL.gold);
  },
  flask(r) {
    r(6, 1, 4, 1, PAL.grayL); r(7, 2, 2, 4, PAL.white); r(5, 6, 6, 2, PAL.white); r(3, 8, 10, 6, PAL.white);
    r(4, 10, 8, 4, PAL.green); r(5, 9, 2, 1, PAL.green); r(6, 11, 1, 1, PAL.white); r(9, 12, 1, 1, PAL.white);
  },
  thermo(r) {
    r(7, 1, 3, 10, PAL.white); r(8, 3, 1, 8, PAL.red); r(6, 10, 5, 5, PAL.white); r(7, 11, 3, 3, PAL.red);
    r(11, 3, 2, 1, PAL.grayL); r(11, 6, 2, 1, PAL.grayL); r(2, 4, 4, 2, PAL.white); r(1, 5, 6, 2, PAL.white);
  },
  particles(r) {
    [[2, 3], [6, 1], [11, 4], [4, 8], [9, 9], [13, 11], [2, 13], [7, 13]].forEach(([x, y], i) =>
      r(x, y, 2, 2, i % 2 ? PAL.yellow : PAL.cyan));
    r(10, 6, 1, 1, PAL.white); r(5, 5, 1, 1, PAL.white);
  },
  weight(r) { r(6, 2, 4, 2, PAL.ink); r(5, 3, 1, 2, PAL.ink); r(10, 3, 1, 2, PAL.ink); r(3, 5, 10, 9, PAL.ink); r(4, 6, 8, 7, PAL.grayD); r(6, 8, 4, 1, PAL.light); },
  bolt(r) { r(8, 1, 3, 2, PAL.yellow); r(7, 3, 3, 2, PAL.yellow); r(5, 5, 7, 2, PAL.yellow); r(8, 7, 3, 2, PAL.yellow); r(7, 9, 3, 2, PAL.yellow); r(6, 11, 3, 2, PAL.yellow); r(5, 13, 2, 2, PAL.yellow); },
  disk(r) { r(2, 2, 12, 12, PAL.blueD); r(4, 2, 7, 4, PAL.grayL); r(8, 3, 2, 2, PAL.blueD); r(4, 8, 8, 6, PAL.white); r(5, 10, 6, 1, PAL.light); },
  coin(r) {
    r(5, 2, 6, 1, PAL.goldD); r(3, 3, 10, 10, PAL.goldD); r(5, 13, 6, 1, PAL.goldD); r(4, 4, 8, 8, PAL.gold);
    r(7, 4, 2, 8, PAL.goldD); r(6, 5, 4, 1, PAL.goldD); r(6, 7, 3, 1, PAL.goldD); r(7, 9, 3, 1, PAL.goldD); r(6, 10, 4, 1, PAL.goldD);
  },
  star(r) {
    r(7, 1, 2, 4, PAL.yellow); r(1, 5, 14, 3, PAL.yellow); r(4, 8, 8, 2, PAL.yellow); r(3, 10, 3, 3, PAL.yellow);
    r(10, 10, 3, 3, PAL.yellow); r(2, 13, 2, 1, PAL.yellow); r(12, 13, 2, 1, PAL.yellow); r(7, 6, 2, 2, PAL.white);
  },
  warn(r) {
    r(7, 1, 2, 2, PAL.yellow); r(6, 3, 4, 3, PAL.yellow); r(5, 6, 6, 3, PAL.yellow); r(4, 9, 8, 3, PAL.yellow); r(2, 12, 12, 3, PAL.yellow);
    r(7, 5, 2, 5, PAL.ink); r(7, 11, 2, 2, PAL.ink);
  },
  block(r) {
    r(5, 1, 6, 1, PAL.red); r(3, 2, 10, 2, PAL.red); r(2, 4, 12, 8, PAL.red); r(3, 12, 10, 2, PAL.red); r(5, 14, 6, 1, PAL.red);
    r(4, 7, 8, 2, PAL.white);
  },
  info(r) {
    r(5, 1, 6, 1, PAL.blue); r(3, 2, 10, 2, PAL.blue); r(2, 4, 12, 8, PAL.blue); r(3, 12, 10, 2, PAL.blue); r(5, 14, 6, 1, PAL.blue);
    r(7, 4, 2, 2, PAL.white); r(7, 7, 2, 5, PAL.white);
  },
  check(r) { r(12, 3, 2, 2, PAL.green); r(10, 5, 3, 2, PAL.green); r(8, 7, 3, 2, PAL.green); r(6, 9, 3, 2, PAL.green); r(2, 7, 2, 2, PAL.green); r(3, 9, 3, 2, PAL.green); r(5, 11, 2, 2, PAL.green); },
  cross(r) { for (let i = 0; i < 10; i++) { r(3 + i, 3 + i, 2, 2, PAL.red); r(12 - i, 3 + i, 2, 2, PAL.red); } },
  lock(r) { r(5, 2, 6, 1, PAL.grayL); r(4, 3, 2, 4, PAL.grayL); r(10, 3, 2, 4, PAL.grayL); r(3, 7, 10, 8, PAL.gold); r(7, 9, 2, 3, PAL.ink); },
  clock(r) {
    r(5, 1, 6, 1, PAL.ink); r(3, 2, 10, 12, PAL.ink); r(5, 14, 6, 1, PAL.ink); r(4, 3, 8, 10, PAL.white); r(2, 4, 12, 8, PAL.ink); r(3, 5, 10, 6, PAL.white);
    r(7, 4, 2, 5, PAL.ink); r(8, 8, 3, 1, PAL.ink);
  },
  orbit(r) {
    r(6, 6, 4, 4, PAL.blue); r(7, 7, 1, 1, PAL.green);
    r(1, 7, 1, 2, PAL.light); r(14, 7, 1, 2, PAL.light); r(2, 5, 2, 1, PAL.light); r(2, 10, 2, 1, PAL.light); r(12, 5, 2, 1, PAL.light);
    r(12, 10, 2, 1, PAL.light); r(4, 4, 8, 1, PAL.light); r(4, 11, 8, 1, PAL.light); r(12, 3, 2, 2, PAL.white);
  },
  person(r) { r(6, 2, 4, 4, PAL.light); r(4, 7, 8, 7, PAL.light); },
  radiation(r) {
    r(3, 3, 10, 10, PAL.yellow); r(7, 7, 2, 2, PAL.ink); r(5, 4, 2, 3, PAL.ink); r(9, 4, 2, 3, PAL.ink); r(6, 10, 4, 2, PAL.ink);
  },
  calendar(r) { r(2, 3, 12, 11, PAL.white); r(2, 3, 12, 3, PAL.red); r(4, 1, 1, 3, PAL.ink); r(11, 1, 1, 3, PAL.ink); for (let y = 7; y < 13; y += 2) for (let x = 4; x < 13; x += 2) r(x, y, 1, 1, PAL.mid); },
};

const _iconCache = {};
function icon(name, size = 16) {
  if (!ICON_DRAW[name]) name = "none";
  if (!_iconCache[name]) _iconCache[name] = sprite(16, 16, ICON_DRAW[name]);
  return `<img class="px icon" src="${_iconCache[name]}" width="${size}" height="${size}" alt="">`;
}

const PART_ICON = {
  launch_vehicle: () => "rocket", bus: () => "bus", solar: (k) => (k === "none" ? "none" : "solar"),
  battery: () => "battery", rtg: () => "rtg", ground: () => "station", computer: () => "chip",
  comms: (k) => ({ uhf: "patch", xlga: "antenna" }[k] || "dish"),
  adcs: (k) => (k === "magnetorquer" ? "magnet" : "wheel"),
  propulsion: (k) => (k === "none" ? "none" : "nozzle"), orbit: () => "orbit", window: () => "calendar",
  instruments: (k) => ({ wac: "camera", hirise: "telescope", thermal: "flame", irspec: "prism", neutron: "atom",
    lamp: "uv", lidar: "laser", radar: "radar", mag: "magneto", massspec: "flask", sounder: "thermo",
    particles: "particles", pancam: "camera", drill: "drill", raman: "laser", seismo: "seismo", tagsam: "flask",
    sar: "radar", photometer: "telescope", irtel: "telescope", coronagraph: "camera" }[k] || "star"),
  testing: (k) => ({ minimal: "warn", standard: "check", tlyf: "star" }[k]), spare: (k) => (k === "spare" ? "rocket" : "bus"),
  shape: (k) => (k === "capsule" ? "capsule" : "rocket"), seats: () => "person", heatshield: () => "flame",
  abort: (k) => (k === "none" ? "none" : "rocket"), landing: (k) => (k === "runway" ? "rocket" : k === "propulsive" ? "nozzle" : "chute"),
  edl: (k) => (k.startsWith("capsule") ? "capsule" : ["airbags", "skycrane"].includes(k) ? "chute" : "nozzle"),
};

// ---------------------------------------------------------------------------- portraits (client in the booth)
function _hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
function _rng(seed) { let s = seed || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296; }

function portrait(o, mood = "neutral") {
  return sprite(40, 48, (r) => {
    r(0, 0, 40, 48, "#3a3631");
    for (let y = 0; y < 48; y += 4) r(0, y, 40, 1, "#34302c");
    // shoulders + coat
    r(4, 38, 32, 10, o.coat); r(6, 36, 28, 2, o.coat); r(17, 36, 6, 12, o.shirt); r(19, 38, 2, 8, o.tie || o.shirt);
    r(14, 38, 3, 10, PAL.ink); r(23, 38, 3, 10, PAL.ink);
    if (o.badge) { r(26, 41, 5, 4, PAL.white); r(27, 42, 3, 1, PAL.blue); }
    // neck + head
    r(17, 31, 6, 6, o.skinD); r(12, 12, 16, 20, o.skin); r(13, 32, 14, 2, o.skin); r(11, 15, 1, 14, o.skin); r(28, 15, 1, 14, o.skin);
    r(10, 20, 2, 5, o.skinD); r(28, 20, 2, 5, o.skinD);
    // hair
    const h = o.hair;
    if (o.hairStyle === "short") { r(11, 9, 18, 5, h); r(11, 13, 2, 5, h); r(27, 13, 2, 5, h); }
    else if (o.hairStyle === "long") { r(10, 9, 20, 6, h); r(9, 13, 3, 20, h); r(28, 13, 3, 20, h); r(12, 14, 4, 2, h); }
    else if (o.hairStyle === "bun") { r(11, 9, 18, 5, h); r(16, 4, 8, 5, h); r(11, 13, 2, 4, h); r(27, 13, 2, 4, h); }
    else if (o.hairStyle === "bald") { r(11, 12, 2, 6, h); r(27, 12, 2, 6, h); r(13, 11, 14, 1, o.skinD); }
    else if (o.hairStyle === "curly") { for (let x = 9; x < 31; x += 3) { r(x, 8 + (x % 2), 3, 4, h); } r(9, 12, 3, 10, h); r(28, 12, 3, 10, h); }
    // brows/eyes
    const bro = mood === "angry" ? 1 : 0;
    r(14, 17 + bro, 4, 1, o.brow || h); r(22, 17 + bro, 4, 1, o.brow || h);
    if (mood === "angry") { r(17, 18, 1, 1, o.brow || h); r(22, 18, 1, 1, o.brow || h); }
    r(15, 20, 2, 2, PAL.white); r(23, 20, 2, 2, PAL.white); r(16, 20, 1, 2, PAL.ink); r(23, 20, 1, 2, PAL.ink);
    if (o.glasses) { r(13, 19, 6, 1, PAL.ink); r(21, 19, 6, 1, PAL.ink); r(13, 23, 6, 1, PAL.ink); r(21, 23, 6, 1, PAL.ink);
      r(13, 19, 1, 5, PAL.ink); r(18, 19, 1, 5, PAL.ink); r(21, 19, 1, 5, PAL.ink); r(26, 19, 1, 5, PAL.ink); r(19, 20, 2, 1, PAL.ink); }
    // nose + mouth
    r(19, 22, 2, 4, o.skinD); r(19, 26, 3, 1, o.skinD);
    if (mood === "happy") { r(16, 28, 8, 1, PAL.redD); r(15, 27, 1, 1, PAL.redD); r(24, 27, 1, 1, PAL.redD); }
    else if (mood === "angry") { r(16, 29, 8, 1, PAL.redD); r(15, 30, 1, 1, PAL.redD); r(24, 30, 1, 1, PAL.redD); }
    else r(16, 28, 8, 1, PAL.redD);
    if (o.beard) { r(12, 27, 16, 6, o.hair); r(16, 28, 8, 1, PAL.redD); r(14, 32, 12, 2, o.hair); }
  });
}

// ---------------------------------------------------------------------------- planets
function planet(kind, size = 48) {
  return sprite(size, size, (r) => {
    const R = size / 2 - 1, cx = size / 2, cy = size / 2, rnd = _rng(_hash(kind));
    const blobs = Array.from({ length: 14 }, () => [rnd() * size, rnd() * size, 3 + rnd() * 9]);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      if (kind === "asteroid" ? d > R * (0.78 + 0.13 * Math.sin(2 * th + 1) + 0.06 * Math.sin(5 * th)) * (Math.abs(dy) < R * 0.2 ? 1 : 0.97) : d > R) continue;
      let col;
      const inBlob = blobs.some(([bx, by, br]) => Math.hypot(x - bx, y - by) < br);
      if (kind === "earth") col = inBlob ? (y < 8 || y > size - 8 ? PAL.white : PAL.green) : PAL.blue;
      else if (kind === "moon") col = inBlob ? "#8d8a84" : "#b9b6ae";
      else if (kind === "mars") col = y < 5 ? PAL.white : inBlob ? "#9c4a2a" : "#c96a3c";
      else if (kind === "europa") {
        const band = Math.floor((y + Math.sin(x / 5) * 2) / 4) % 4;
        col = ["#c9a27a", "#e2cfb0", "#a8774f", "#ecdcc3"][band];
        if (Math.hypot(x - size * 0.66, y - size * 0.62) < size * 0.08) col = "#b5523a";
      } else if (kind === "venus") {
        const band = Math.floor((y + Math.sin(x / 4 + y / 9) * 3) / 5) % 3;
        col = ["#e6c88a", "#d9b06a", "#f1dcaa"][band];
      } else if (kind === "asteroid") {
        col = inBlob ? "#5e564c" : (x * 7 + y * 3) % 11 === 0 ? "#4a443c" : "#7d7366";
      } else col = PAL.gray;
      // terminator shading + dithering
      const shade = (dx + dy) / (R * 1.6);
      if (shade > 0.55 || (shade > 0.35 && (x + y) % 2 === 0)) col = _darken(col, 0.45);
      r(x, y, 1, 1, col);
    }
    if (kind === "europa") { // little Europa moon in front of Jupiter
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 16)
        r(size * 0.22 + x, size * 0.8 + y, 1, 1, (x + y > 3) ? "#8c8070" : "#e8dcc8");
    }
  });
}

function _darken(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - f)));
  return `rgb(${c.join(",")})`;
}

function stars(canvas, n = 180, seed = 7) {
  const g = canvas.getContext("2d"), rnd = _rng(seed);
  g.fillStyle = "#0d0c12"; g.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < n; i++) {
    g.fillStyle = rnd() > 0.85 ? "#f4efe2" : rnd() > 0.5 ? "#8c8a99" : "#4c4a5a";
    g.fillRect(Math.floor(rnd() * canvas.width), Math.floor(rnd() * canvas.height), 1, 1);
  }
}

// ---------------------------------------------------------------------------- rubber stamp tool (24x32)
function stampTool(ink) {
  return sprite(24, 32, (r) => {
    r(8, 0, 8, 2, "#7a4f2c"); r(6, 2, 12, 7, "#9b6a3c"); r(7, 3, 4, 2, "#c08a55"); r(6, 8, 12, 1, "#5e3c20"); // knob
    r(10, 9, 4, 9, "#7a4f2c"); r(11, 9, 1, 9, "#9b6a3c");                                                  // neck
    r(2, 18, 20, 7, "#4b4b4b"); r(3, 19, 18, 2, "#7d7d7d"); r(2, 24, 20, 1, "#2e2e2e");                     // metal block
    r(3, 25, 18, 4, "#2a2520"); r(3, 29, 18, 3, ink); r(4, 29, 3, 1, "#ffffff55");                          // rubber + ink
  });
}

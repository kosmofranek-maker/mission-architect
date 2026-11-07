// Animated pixel scenes: the title screen sky and the pieces of the launch sequence
// (Earth limb, launch vehicles per rocket type, launch pad). All drawn in code at 320x180.
"use strict";

// Curved Earth horizon seen from orbit. cy/R: circle centre and radius; off scrolls clouds/land.
function earthLimb(g, W, H, cy, R, off = 0, cx = W / 2) {
  const top = Math.max(0, Math.floor(cy - R - 4));
  for (let y = top; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d > R + 3) continue;
    let col;
    if (d > R) col = d > R + 2 ? "#1b2a55" : d > R + 1 ? "#3a64b0" : "#7fb0f0";              // atmosphere glow
    else {
      const u = (x + off) / 23, v = y / 7;
      const land = Math.sin(u * 1.3 + Math.sin(v * 0.7) * 2) + Math.sin(u * 0.37 + v * 0.9) > 1.1;
      const cloud = Math.sin(u * 2.1 + v * 1.7 + off / 40) + Math.sin(u * 0.8 - v * 2.3) > 1.25;
      col = cloud ? "#e9eef2" : land ? "#4f7a34" : "#2f5a9c";
      if (R - d < 3 && (x + y) % 2 === 0) col = "#8fb3e8";                                        // haze at the edge
      if (x / W > 0.88 || (x / W > 0.8 && (x + y) % 2 === 0)) col = _darken(col, 0.45);                          // night side
    }
    g.fillStyle = col; g.fillRect(x, y, 1, 1);
  }
}

// Launch vehicles, drawn from the top (x = centre, y = nose). Returns the y of the engine bottom.
const LV_SHAPE = {
  electron: { h: 30, w: 4, body: "#2a2a2e", band: "#5b5b60", nose: "#2a2a2e", boosters: 0 },
  falcon9: { h: 44, w: 5, body: "#f4efe2", band: "#1d1a17", nose: "#f4efe2", boosters: 0 },
  vulcan: { h: 44, w: 6, body: "#d98a3a", band: "#f4efe2", nose: "#f4efe2", boosters: 2, bcol: "#e9e3d6", bh: 18 },
  falcon_heavy: { h: 44, w: 5, body: "#f4efe2", band: "#1d1a17", nose: "#f4efe2", boosters: 2, bcol: "#f4efe2", bh: 34, bw: 5 },
  sls: { h: 52, w: 7, body: "#d9792b", band: "#f4efe2", nose: "#f4efe2", boosters: 2, bcol: "#f4efe2", bh: 40, bw: 4 },
};
function drawLV(g, lv, x, y, { fire = false, boosters = true, flicker = 0 } = {}) {
  const S = LV_SHAPE[lv] || LV_SHAPE.falcon9, r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };
  const w = S.w, h = S.h, x0 = x - Math.floor(w / 2), bot = y + h;
  r(x0 + 1, y, w - 2, 2, S.nose); r(x0, y + 2, w, 6, S.nose); r(x0, y + 8, w, h - 8, S.body);   // fairing + body
  r(x0, y + 8, w, 1, S.band); r(x0, y + Math.round(h * 0.45), w, 2, S.band);                       // stage bands
  r(x0 + w - 1, y + 2, 1, h - 2, "rgba(0,0,0,.25)"); r(x0, y + 2, 1, h - 2, "rgba(255,255,255,.25)");
  if (lv === "falcon9" || lv === "falcon_heavy") r(x0, y + 14, w, 2, "#1d1a17");                   // interstage
  r(x0 - 1, bot - 2, w + 2, 2, "#4b4b4b");                                                         // engine section
  if (S.boosters && boosters) {
    const bw = S.bw || 3, bh = S.bh;
    [x0 - bw - 1, x0 + w + 1].forEach((bx) => {
      r(bx, bot - bh, bw, bh, S.bcol); r(bx, bot - bh - 2, bw, 2, S.bcol === "#f4efe2" ? "#d8d0bc" : S.bcol);
      r(bx, bot - bh + 2, bw, 1, "#1d1a17"); if (fire) flame(g, bx + bw / 2, bot, flicker, 0.7);
    });
  }
  if (fire) flame(g, x, bot, flicker, w / 5);
  return bot;
}
function flame(g, x, y, f, s = 1) {
  const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };
  const L = (10 + f * 8) * s, W = Math.max(2, 4 * s);
  r(x - W / 2 - 1, y, W + 2, L * 0.9, "#b3372d"); r(x - W / 2, y, W, L, "#d9792b"); r(x - W / 4, y, Math.max(1, W / 2), L * 0.75, "#ffd96b");
  for (let k = 1; k < 4; k++) r(x - 1, y + k * L / 4, 2, 1, "#fff6c8");                            // shock diamonds
}

// Launch pad scene; gy = ground line on screen.
function drawPad(g, W, gy, armOut, blinkOn) {
  const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };
  for (let x = 0; x < W; x += 2) {                                                                 // far hills
    const h = 8 + Math.sin(x / 23) * 5 + Math.sin(x / 7.3) * 2;
    r(x, gy - h, 2, h, "#2a3324");
  }
  r(0, gy, W, 60, "#34402a"); r(0, gy, W, 1, "#4a5a3a");
  r(120, gy - 2, 80, 3, "#7d7d7d"); r(150, gy + 1, 20, 6, "#1d1a17");                                // pad + flame trench
  r(136, gy - 74, 8, 72, "#5b534b");                                                               // tower
  for (let y = gy - 72; y < gy - 4; y += 6) { r(136, y, 8, 1, "#3b342d"); r(137, y + 1, 1, 4, "#7d7d7d"); r(142, y + 1, 1, 4, "#7d7d7d"); }
  r(134, gy - 78, 12, 4, "#3b342d"); r(139, gy - 82, 2, 4, blinkOn ? "#ff3b2b" : "#5a1a14");
  if (armOut > 0) r(144, gy - 60, armOut, 2, "#7d7d7d");                                           // crew/umbilical arm
  [100, 220].forEach((x) => { r(x, gy - 20, 2, 20, "#4b4b4b"); r(x - 2, gy - 22, 6, 2, blinkOn ? "#e8cf52" : "#5b534b"); }); // light masts
}

// ---------------------------------------------------------------------------- title screen
function titleScene(canvas) {
  const g = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
  const rnd = _rng(42), layers = [0.02, 0.06, 0.15].map((sp, i) => ({ sp, pts: Array.from({ length: [90, 50, 22][i] }, () => [rnd() * W, rnd() * H * 0.8, rnd()]) }));
  const sat = { x: -20 }, rockets = [], meteors = [], moon = new Image();
  moon.src = planet("moon", 22); g.imageSmoothingEnabled = false;
  let t = 0;
  function frame() {
    if (!document.getElementById("title").classList.contains("active") || document.hidden) return;
    t++;
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, "#07060b"); grd.addColorStop(1, "#141a33");
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    layers.forEach((L, i) => L.pts.forEach((p) => {
      const x = ((p[0] - t * L.sp) % W + W) % W, tw = Math.sin(t / 9 + p[2] * 40) > 0.6;
      g.fillStyle = i === 2 ? (tw ? "#ffffff" : "#c9c4d8") : i === 1 ? "#8c8a99" : "#4c4a5a";
      g.fillRect(Math.floor(x), Math.floor(p[1]), i === 2 && tw ? 2 : 1, 1);
    }));
    if (moon.complete) g.drawImage(moon, 34, 22);
    // meteors
    if (rnd() < 0.006) meteors.push({ x: rnd() * W, y: rnd() * 40, life: 22 });
    meteors.forEach((m) => { for (let k = 0; k < 8; k++) { g.fillStyle = `rgba(255,255,255,${(1 - k / 8) * m.life / 22})`; g.fillRect(m.x - k * 2, m.y - k, 2, 1); } m.x += 4; m.y += 2; m.life--; });
    while (meteors.length && meteors[0].life <= 0) meteors.shift();
    // satellite crossing
    sat.x += 0.35; if (sat.x > W + 30) sat.x = -30;
    const sy = 120 - Math.sin(sat.x / W * Math.PI) * 30;
    g.fillStyle = "#3d6fa8"; g.fillRect(sat.x - 12, sy - 1, 8, 3); g.fillRect(sat.x + 5, sy - 1, 8, 3);
    g.fillStyle = "#8fb3e8"; g.fillRect(sat.x - 12, sy, 8, 1); g.fillRect(sat.x + 5, sy, 8, 1);
    g.fillStyle = "#d8aa45"; g.fillRect(sat.x - 3, sy - 3, 7, 6); g.fillStyle = "#f4efe2"; g.fillRect(sat.x, sy - 6, 1, 3);
    if (t % 20 < 4) { g.fillStyle = "#ff3b2b"; g.fillRect(sat.x + 3, sy - 3, 1, 1); }
    // Earth
    earthLimb(g, W, H, H + 342, 370, t * 0.25);
    // a rocket climbs from the horizon now and then
    if (t % 260 === 60) rockets.push({ s: 0, x: 60 + rnd() * 200 });
    rockets.forEach((rk) => {
      rk.s++;
      const p = rk.s / 160, x = rk.x + p * 70, y = H - 14 - p * 110 + p * p * 40;
      for (let k = 1; k < 30; k++) { const q = Math.max(0, p - k * 0.006), tx = rk.x + q * 70, ty = H - 14 - q * 110 + q * q * 40;
        g.fillStyle = `rgba(233,227,214,${0.5 * (1 - k / 30)})`; g.fillRect(tx, ty, 1, 1); }
      g.fillStyle = "#f4efe2"; g.fillRect(x, y - 2, 1, 3); g.fillStyle = rk.s % 4 < 2 ? "#ffd96b" : "#d9792b"; g.fillRect(x, y + 1, 1, 2);
    });
    while (rockets.length && rockets[0].s > 160) rockets.shift();
  }
  clearInterval(titleScene._iv);
  titleScene._iv = setInterval(frame, 60);
  frame();
  return frame;
}

// Round mission patch for the title (48x48).
function missionPatch() {
  return sprite(48, 48, (r) => {
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const d = Math.hypot(x + 0.5 - 24, y + 0.5 - 24);
      if (d > 23.5) continue;
      r(x, y, 1, 1, d > 21 ? "#1d1a17" : d > 19 ? "#c99a3c" : d > 18 ? "#1d1a17" : y > 34 ? "#2f5a9c" : "#141a33");
      const e = Math.hypot((x - 24) / 15, (y - 25) / 6);
      if (d < 18 && Math.abs(e - 1) < 0.08) r(x, y, 1, 1, "#e9e3d6");
    }
    [[12, 12], [33, 9], [36, 18], [16, 20], [28, 14]].forEach(([x, y]) => r(x, y, 1, 1, "#f4efe2"));
    r(23, 10, 2, 2, "#b3372d"); r(22, 12, 4, 3, "#b3372d"); r(22, 15, 4, 13, "#f4efe2"); r(23, 18, 2, 2, "#3d6fa8");
    r(20, 24, 2, 5, "#b3372d"); r(26, 24, 2, 5, "#b3372d"); r(22, 28, 4, 2, "#4b4b4b"); r(23, 30, 2, 3, "#ffd96b");
    r(22, 31, 1, 2, "#d9792b"); r(25, 31, 1, 2, "#d9792b");
    for (let x = 6; x < 42; x++) {
      const yy = 35 + Math.round(((x - 24) / 18) ** 2 * 3);
      if (Math.hypot(x - 24, yy - 24) < 18) r(x, yy, 1, 1, "#4f7a34");
    }
  });
}

// Mission Architect: game client. Talks to server.py (/api/*); all physics lives in the Python engine.
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n, d = 0) => (n == null || !isFinite(n) ? "∞" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (x) => `${Math.round((x || 0) * 100)}%`;

const ORDER = ["wildfire", "storm_watch", "iss_resupply", "lunar_ice", "crew_transport", "landing_scout", "lunar_lander", "orbital_outpost",
  "asteroid_prospector", "exoplanet_hunter", "asteroid_sample", "venus_clouds", "lunar_base", "mars_climate", "mars_rover", "europa", "mars_base"];
const PLANET_OF = { earth: "earth", moon: "moon", mars: "mars", europa: "europa", venus: "venus", asteroid: "asteroid",
  moon_surface: "moon", mars_surface: "mars", l2: "earth" };
const DEGRADE = { venus: 0.03, europa: 0.04, mars_surface: 0.08 }; // solar cell loss per year (mirrors engine/model.py)
const KIND_LABEL = { orbiter: "Orbiter", lander: "Lander", rover: "Rover", sample_return: "Sample return", program: "Crewed program", vehicle: "Design a spaceship" };
const GRADE_COL = { S: "#6a3d9a", A: "#3c6b25", B: "#1d4f8a", C: "#8a6410", F: "#a8322a" };
const PASS = ["S", "A", "B", "C"];

// Each client: who they are, the letter that opens the mission, and what they tell the press afterwards.
const CLIENTS = {
  wildfire: { name: "Chief Dana Okafor", org: "Regional Fire Service",
    look: { skin: "#a8724f", skinD: "#80543a", hair: "#1f1a17", hairStyle: "short", coat: "#7a3b26", shirt: "#d9cfb8", tie: "#2b2b2b", badge: true },
    letter: ["Engineer, last summer we lost forty thousand hectares of forest because nobody saw the fire until the smoke was on the evening news.",
      "I need eyes in orbit that pass over our forests every day, a heat sensor that finds hot spots while they are still small, and pictures to map the burn scars afterwards.",
      "My budget is small and my patience is smaller. Keep it simple and get it flying."],
    quotes: { good: "Our crews reached three fires before they grew past the size of a football field. This satellite pays for itself every week.",
      ok: "It works. Not perfect, but my crews read the maps every morning.",
      bad: "We needed eyes in the sky and got a very expensive lesson instead.",
      lost: "Back to watchtowers and binoculars, I suppose." } },
  storm_watch: { name: "Dr. Kofi Mensah", org: "Atlantic Storm Prediction Office",
    look: { skin: "#6e4630", skinD: "#4f3122", hair: "#1a1716", hairStyle: "bald", coat: "#2f4a5e", shirt: "#e6e0d2", tie: "#c9a227", glasses: true },
    letter: ["Hurricanes don't wait for a satellite to come back around. Between two passes a storm can double in strength, and we lose track of it.",
      "I want to see the clouds move minute by minute, profile the air inside the storm and measure how much heat the ocean feeds it.",
      "Think hard about where you park this thing. Some orbits never blink."],
    quotes: { good: "We watched the eye form six hours before landfall. People left in time. That is what this satellite is for.",
      ok: "Our forecasts are better. The coastal towns noticed.",
      bad: "The storm moved faster than our data did.",
      lost: "Hurricane season starts in June. Our satellite won't be there." } },
  lunar_ice: { name: "Dr. Mei Tanaka", org: "Lunar Resources Office",
    look: { skin: "#e3c19c", skinD: "#b8957a", hair: "#16141a", hairStyle: "bun", coat: "#e8e4dc", shirt: "#3d6fa8", glasses: true },
    letter: ["Every litre of water we launch from Earth costs as much as a small car. If the ice in the polar craters is real, astronauts can drink it, breathe it and turn it into rocket fuel.",
      "Those craters have not seen sunlight in two billion years. You cannot simply photograph the ice. You will have to find it some other way.",
      "Map the ground around it too. Someone will have to drive there one day."],
    quotes: { good: "We now know which crater to land next to. That map will hang on the wall of the first lunar base.",
      ok: "We found ice. Not as much detail as I hoped, but it's there.",
      bad: "The data is thin. We are still guessing where the ice is.",
      lost: "The Moon keeps its secrets a little longer." } },
  landing_scout: { name: "Cmdr. Jonah Reyes", org: "Artemis Crew Office",
    look: { skin: "#c48d63", skinD: "#9a6a47", hair: "#2b2018", hairStyle: "short", coat: "#d06a2a", shirt: "#e9e3d6", badge: true },
    letter: ["I'm the one who has to land there, so forgive me for being picky.",
      "I need pictures sharp enough to show a boulder the size of a desk, and slope maps so our lander doesn't tip over. One rock in the wrong place and four people don't come home.",
      "Sharp cameras need steady pointing and a big pipe for the data. Don't skimp on either."],
    quotes: { good: "I've already picked my parking spot. Thank you, engineer. I'll wave.",
      ok: "We have a landing zone. I'd still like a second option.",
      bad: "I'm not landing on a guess.",
      lost: "Looks like I'm landing with my eyes closed." } },
  asteroid_prospector: { name: "Dr. Priya Raman", org: "Planetary Defense Office",
    look: { skin: "#a87552", skinD: "#7f5638", hair: "#141012", hairStyle: "long", coat: "#5a3a6e", shirt: "#e9e3d6", glasses: true, badge: true },
    letter: ["This rock is five hundred metres wide and passes closer to Earth than the Moon every few decades. I'd like to know what it is made of before it comes back.",
      "Its gravity is a millionth of Earth's. You don't so much orbit it as tiptoe around it, so bring thrusters.",
      "Minerals tell us how strong it is, its shape tells us how it spins, and any water would make it worth mining."],
    quotes: { good: "We know its shape, its minerals and its water. If it ever heads our way, we'll know exactly how to push it.",
      ok: "Good data on the surface. The inside is still a mystery.",
      bad: "We flew all that way and came home with a blurry potato.",
      lost: "The asteroid is fine. Our spacecraft, less so." } },
  venus_clouds: { name: "Prof. Samuel Adeyemi", org: "Venus Atmosphere Group",
    look: { skin: "#7a4e34", skinD: "#5a3826", hair: "#cfc9bf", hairStyle: "curly", coat: "#7a6a3a", shirt: "#e9e3d6", beard: true },
    letter: ["Venus was once a lot like Earth. Then something went terribly wrong: 465 degrees on the ground and air thick enough to swim in.",
      "Your cameras will see nothing but cloud tops. To map the surface you'll need radar, and to understand the greenhouse you'll need to study the air itself.",
      "On the bright side, the Sun is twice as strong out there. Power should be the least of your problems."],
    quotes: { good: "We can finally see the volcanoes under the clouds, and we know how the greenhouse runs. Earth should pay attention.",
      ok: "The clouds gave up a few secrets. The ground, fewer.",
      bad: "Venus is still a cloudy mystery. We needed more.",
      lost: "Venus has eaten another spacecraft. She is very good at it." } },
  mars_climate: { name: "Dr. Luis Herrera", org: "Planetary Climate Lab",
    look: { skin: "#c99a74", skinD: "#9e7454", hair: "#3b2a1e", hairStyle: "curly", coat: "#4b5a3a", shirt: "#e0d8c6", beard: true },
    letter: ["Every few years a dust storm swallows the whole of Mars, and we still cannot predict when.",
      "Profile the atmosphere from top to bottom, watch the storms grow and, if you can, find the ice buried under the dust.",
      "Remember: the Sun is weaker there, Earth is far away and Mars eats spacecraft for breakfast."],
    quotes: { good: "For the first time we saw a global dust storm being born. Future astronauts will thank this team.",
      ok: "Solid climate data. The buried ice will have to wait.",
      bad: "We learned more about our mistakes than about Mars.",
      lost: "Mars wins this round." } },
  lunar_lander: { name: "Dr. Tomasz Wierzba", org: "Lunar Surface Science Office",
    look: { skin: "#e8c4a6", skinD: "#c29c80", hair: "#7a5a3a", hairStyle: "short", coat: "#3b5a6e", shirt: "#e9e3d6", tie: "#8a3b2c", glasses: true },
    letter: ["Orbiters have spent fifteen years telling us where the ice should be. I'm tired of maps. I want to hold it.",
      "Land at the south pole, drill into the soil and bake what comes up. If the seismometer hears the Moon creak, even better.",
      "Choose your landing spot with care. Some places have two-week nights at minus 170 degrees, and batteries do not survive that."],
    quotes: { good: "Water ice, measured with our own drill. The first lunar base just found its well.",
      ok: "We touched the ice. I'd have liked a few more holes.",
      bad: "We landed, but the drill brought back more questions than answers.",
      lost: "We made a new crater. Not the kind of science I had in mind." } },
  asteroid_sample: { name: "Dr. Amara Okonkwo-Lind", org: "Sample Curation Laboratory",
    look: { skin: "#8a5a3b", skinD: "#6b4229", hair: "#1a1716", hairStyle: "bun", coat: "#e8e4dc", shirt: "#6a3d9a", glasses: true, badge: true },
    letter: ["My lab has instruments the size of a house. None of them fit on a spacecraft, so the asteroid will have to come to us.",
      "Map it, choose a safe spot, touch it for five seconds and fly the sample home. The capsule must survive a fireball and land softly in the desert.",
      "One more thing: Genesis crashed in 2004 because a parachute did not open. I would rather not repeat history."],
    quotes: { good: "A clean sample older than the Earth is sitting in my clean room. Scientists will study it for fifty years.",
      ok: "We got a sample home. Smaller than I'd hoped, but pristine.",
      bad: "The capsule came back, but what's inside is not what we needed.",
      lost: "The sample is somewhere between here and the asteroid. Forever." } },
  mars_rover: { name: "Dr. Sofia Castellanos", org: "Astrobiology Institute",
    look: { skin: "#d9a57c", skinD: "#b07f5a", hair: "#3b2318", hairStyle: "long", coat: "#7a3b26", shirt: "#e9e3d6", badge: true },
    letter: ["Three and a half billion years ago there was a lake in that crater, fed by a river. On Earth, every lake like that was full of life.",
      "Send me a rover that can drive to the old shoreline, drill into the mud and read the rocks layer by layer.",
      "Landing there is dangerous: cliffs, boulders, dunes. Choose how you land as carefully as what you carry."],
    quotes: { good: "The rocks show organic molecules in exactly the layers where life would have lived. This changes everything.",
      ok: "We read the history of the lake. The question of life stays open.",
      bad: "The rover drove, but it never reached the rocks that mattered.",
      lost: "Another crater on Mars. This one is ours." } },
  orbital_outpost: { name: "Director Hana Novak", org: "Human Spaceflight Directorate",
    look: { skin: "#e8c4a6", skinD: "#c29c80", hair: "#5a3a22", hairStyle: "bun", coat: "#2c3b55", shirt: "#e9e3d6", tie: "#c9a227", badge: true },
    letter: ["No rocket in the world can lift a whole space station. So we will build one the way the ISS was built: piece by piece, in orbit.",
      "Core module first, then power, a home and a laboratory. Then people: crews of four, six months each, and cargo ships to feed them.",
      "Plan every launch. If one cargo ship fails, my astronauts must still have food on the table."],
    quotes: { good: "Four people are floating in our laboratory right now. Twenty launches ago that was a drawing on your desk.",
      ok: "The station flies and people live aboard. Not every module made it, but it's a start.",
      bad: "We have pieces in orbit, but not a station. That's a very expensive lesson in planning.",
      lost: "We have lost the program. The pieces will burn up in the atmosphere one day." } },
  lunar_base: { name: "Cmdr. Kwame Asante", org: "Artemis Base Camp",
    look: { skin: "#6e4630", skinD: "#4f3122", hair: "#1a1716", hairStyle: "short", coat: "#d06a2a", shirt: "#e9e3d6", badge: true },
    letter: ["I'm writing from the Moon. Well, from the training base in Houston, but my bags are packed.",
      "Our habitat at the south pole is ready, but it is empty: no people, a little food and a small solar field that dies every lunar night.",
      "Get crews up here, keep them fed, keep the lights on through two-week nights, and if you can, give us a rover to explore."],
    quotes: { good: "Two years on the Moon without one empty plate. The supply line worked like a train timetable.",
      ok: "We lived up there, and we learned. The next crews will have it easier.",
      bad: "We spent more time worrying about food than doing science.",
      lost: "The base is empty again. The Moon is patient; we'll be back." } },
  mars_base: { name: "Flight Director Lena Hoffmann", org: "Mars Exploration Program",
    look: { skin: "#efd2bd", skinD: "#c9a891", hair: "#8a5a3a", hairStyle: "long", coat: "#7a3b26", shirt: "#e9e3d6", tie: "#2b2b2b", glasses: true, badge: true },
    letter: ["Everything you have built so far leads here. Four people. Seven months to get there, sixteen months on the surface.",
      "Nothing waits for us on Mars. The habitat, the power plant and the food must land a whole window before the crew launches, and we check every bolt from Earth first.",
      "Their ship is too big for any rocket, so we launch it in pieces and join it in orbit. Plan it like lives depend on it. They do."],
    quotes: { good: "Four humans are standing on Mars, and they have a warm home, power and food. History will remember this team.",
      ok: "The crew made it and came home. Not everything went to plan, but humanity has been to Mars.",
      bad: "We reached Mars, but the crew spent the mission rationing instead of exploring.",
      lost: "The program ended before anyone set foot on Mars. We will try again in the next window." } },
  iss_resupply: { name: "Cmdr. Yuki Sato", org: "ISS Program Office",
    look: { skin: "#e3c19c", skinD: "#b8957a", hair: "#16141a", hairStyle: "short", coat: "#2c3b55", shirt: "#e9e3d6", tie: "#a8322a", badge: true },
    letter: ["The International Space Station has had people aboard every single day since the year 2000. I would like to keep that record going.",
      "Every six months a new crew of four must arrive, and cargo ships must bring food, water, air and spare parts. The station is big, but its pantry is not.",
      "Plan the flights so there is always a reserve. Cargo ships do fail sometimes, and the crew should never notice."],
    quotes: { good: "Two more years of people living in space, without one empty shelf. The record lives on.",
      ok: "The station stayed crewed. A few anxious weeks, but we made it.",
      bad: "We had to bring people home early. The station is empty for the first time in decades.",
      lost: "Today the station is dark. That has not happened since the year 2000." } },
  crew_transport: { name: "Eng. Marta Kowalczyk", org: "Commercial Crew Program",
    look: { skin: "#efd2bd", skinD: "#c9a891", hair: "#c9a86a", hairStyle: "long", coat: "#4b5a3a", shirt: "#e9e3d6", glasses: true, badge: true },
    letter: ["We need our own way to fly astronauts to the space station: forty seats over five years.",
      "You design the vehicle. A capsule or a spaceplane, thrown away or flown again, ocean or runway. The Space Shuttle was beautiful and lost two crews; capsules are plain but tough.",
      "My only hard rule: no more than one loss of crew in 270 flights. Everything else is your call."],
    quotes: { good: "Forty seats, five years, every crew home safe, at a price people said was impossible.",
      ok: "It flies and it is safe. It could be cheaper, but it works.",
      bad: "The vehicle works on paper. In practice it was slow, expensive and nervous.",
      lost: "We lost a crew. The program is grounded while we find out why." } },
  exoplanet_hunter: { name: "Dr. Aisha Bello", org: "Exoplanet Science Institute",
    look: { skin: "#7a4e34", skinD: "#5a3826", hair: "#1a1716", hairStyle: "bun", coat: "#3d3550", shirt: "#e9e3d6", glasses: true },
    letter: ["When I was a girl we knew of zero planets around other stars. Now we know thousands, and I want to know what their air is made of.",
      "Watch stars for the tiny dip when a planet passes in front, then look at those planets in infrared to read their atmospheres.",
      "Infrared telescopes must be very cold and very still. Find them a dark, quiet place, far from Earth's warmth."],
    quotes: { good: "We found water vapour in the air of a planet light-years away. My younger self would not believe it.",
      ok: "We found new planets. Their atmospheres will have to wait for the next telescope.",
      bad: "The telescope worked, but it was too warm or too shaky to see what we hoped.",
      lost: "Our telescope is silent. The planets are still out there, waiting." } },
  europa: { name: "Dr. Ingrid Solberg", org: "Outer Planets Program",
    look: { skin: "#efd2bd", skinD: "#c9a891", hair: "#d8c27a", hairStyle: "long", coat: "#2c3b55", shirt: "#e9e3d6", glasses: true, badge: true },
    letter: ["Under twenty kilometres of ice there may be more water than in all of Earth's oceans. Where there is water, there might be life.",
      "Jupiter's radiation will try to fry your electronics every single day, and sunlight out there is twenty-seven times weaker than at home.",
      "This is the flagship. The whole world will be watching. Take your time."],
    quotes: { good: "There is an ocean under the ice and it is salty. This is the most important discovery of my career.",
      ok: "We measured the ice shell. The ocean is real. Now we need to go back.",
      bad: "The radiation won. We learned a lot, but not what we came for.",
      lost: "Silence from Jupiter. The hardest kind of news." } },
};

const TABS = [
  { id: "launch", label: "Launch", icon: "rocket", role: "manager", fields: ["window", "launch_vehicle"],
    hint: "First the date, then the rocket. Planets line up only every so often; an early date leaves little time to build and test, a late one means paying the team to wait. The rocket must lift your fully fuelled spacecraft." },
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
  { id: "edl", label: "Landing", icon: "chute", role: "systems", fields: ["edl"],
    hint: "Entry, descent and landing. Parachutes and airbags need air; on airless worlds only rocket engines can slow you down. Safer systems weigh and cost more." },
  { id: "comms", label: "Comms", icon: "dish", role: "comms", fields: ["comms", "ground"],
    hint: "Data is useless until it reaches Earth. Signals weaken with distance squared." },
  { id: "computer", label: "Computer", icon: "chip", role: "comms", fields: ["computer"],
    hint: "Stores data between contacts and must survive the local radiation." },
  { id: "partners", label: "Partners", icon: "globe", role: "manager", fields: ["partners"],
    hint: "Other space agencies can share the cost and bring their own hardware. Every partner also adds meetings, interfaces and a chance that their part arrives late. Up to two." },
  { id: "instr", label: "Instruments", icon: "telescope", role: "science", fields: ["instruments"],
    hint: "Pick instruments that serve the mission goals (dark tags). Watch mass, power and data volume." },
];

const kindNow = () => scen().kind || "orbiter";
const onSurface = () => !!S.cat.DESTINATIONS[destKey()].surface;
// The tab list for the current mission: orbiters have no landing tab, surface missions pick a site instead of an orbit.
function tabs() {
  const k = kindNow();
  if (k === "vehicle") return [
    { id: "hull", label: "Hull", icon: "capsule", role: "systems", fields: ["shape", "seats"],
      hint: "Your own crew vehicle. The shape decides how it comes home, what escape system fits and how heavy it is. More seats mean fewer flights." },
    { id: "shield", label: "Heat shield", icon: "flame", role: "systems", fields: ["heatshield"],
      hint: "Coming home at 28,000 km/h heats the nose to 1,600 C. A shield that burns away is safe but single-use; reusable ones need care." },
    { id: "safety", label: "Escape & landing", icon: "chute", role: "systems", fields: ["abort", "landing"],
      hint: "If the rocket fails, the escape system saves the crew. The landing decides whether the vehicle can fly again." },
    { id: "launch", label: "Launch", icon: "rocket", role: "manager", fields: ["launch_vehicle"],
      hint: "Only rockets rated for crew may carry astronauts. Reusable rockets get cheaper with every flight." }];
  if (k === "program") return [
    { id: "manifest", label: "Manifest", icon: "calendar", role: "systems", fields: ["manifest"],
      hint: "Plan every launch: which payload, on which rocket, in which slot. Order matters, crews need somewhere to live and something to eat, and every rocket has a limit." },
    { ...TABS.find((t) => t.id === "partners"), hint: "Partners build and launch some flights for free, on their own dates, or make docking safer. Up to two." }];
  return TABS.filter((t) => t.id !== "edl" || k !== "orbiter").map((t) => {
    if (t.id === "edl" && k === "sample_return") return { ...t, label: "Return", icon: "capsule",
      hint: "The return capsule carries the sample through a fireball re-entry and parachutes it to the ground. The trip home also needs extra fuel." };
    if (t.id === "orbit" && onSurface()) return { ...t, label: "Site",
      hint: "Where you land decides sunlight and night length, how often you can talk to Earth, how risky the landing is and what you can study." };
    return t;
  });
}
function fieldLabel(f) {
  if (f === "edl" && kindNow() === "sample_return") return "Return capsule";
  if (f === "orbit" && onSurface()) return "Landing site";
  return FIELD_LABEL[f];
}
const FIELD_LABEL = { window: "Launch date", launch_vehicle: "Launch vehicle", orbit: "Orbit", bus: "Spacecraft bus", solar: "Solar array",
  rtg: "Nuclear power (RTG)", battery: "Battery", adcs: "Attitude control", propulsion: "Propulsion", comms: "Antenna",
  ground: "Ground stations", computer: "Flight computer", instruments: "Instruments", edl: "Landing system", partners: "Partners",
  shape: "Hull shape", seats: "Seats", heatshield: "Heat shield", abort: "Launch escape system", landing: "Landing" };
const MULTI = new Set(["instruments", "partners"]); // fields that hold a list

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

// Physical desk sounds, synthesized from filtered noise (no audio files, no electronic beeps):
// wooden knocks, switch clicks, paper rustle, typewriter strikes, a desk bell, the rubber stamp.
const SFX = (() => {
  let ctx = null, buf = null;
  const on = () => store.get("sound", true);
  const ac = () => {
    if (!on()) return null;
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    if (ctx.state === "suspended") ctx.resume();
    if (!buf) { // one shared second of white noise
      buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  };
  // a burst of noise through one filter; decay sets how long it rings
  function burst({ at = 0, type = "bandpass", freq = 1000, q = 1, vol = 0.3, attack = 0.001, decay = 0.05, sweep = null }) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + at, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; src.loop = true;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + attack + decay);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t, Math.random() * 0.5); src.stop(t + attack + decay + 0.02);
  }
  const knock = (freq, vol = 0.5, at = 0, decay = 0.07) => burst({ at, freq, q: 9, vol, decay });          // wood / desk
  const snap = (freq = 3500, vol = 0.25, at = 0) => burst({ at, type: "highpass", freq, vol, decay: 0.012 }); // switch, key
  const rustle = (dur = 0.2, vol = 0.12, at = 0, freq = 2500) => {                                            // paper
    const grains = Math.max(3, Math.round(dur / 0.03));
    for (let i = 0; i < grains; i++) burst({ at: at + i * dur / grains + Math.random() * 0.01, type: "bandpass", freq: freq * (0.7 + Math.random() * 0.8),
      q: 0.8, vol: vol * (0.5 + Math.random() * 0.5), attack: 0.004, decay: 0.03 + Math.random() * 0.03 });
  };
  const bell = (base, vol = 0.12, at = 0) => [1, 2.76, 5.4].forEach((m, i) =>                               // metal desk bell
    burst({ at, freq: base * m, q: 60, vol: vol / (i + 1), attack: 0.002, decay: 1.2 / (i + 1) }));
  return {
    thud() { knock(110, 0.9, 0, 0.16); knock(220, 0.5, 0, 0.08); burst({ type: "lowpass", freq: 600, vol: 0.5, decay: 0.09 }); rustle(0.08, 0.06, 0.02); },
    whoosh() { burst({ type: "bandpass", freq: 300, q: 0.7, vol: 0.22, attack: 0.5, decay: 0.8, sweep: 2600 }); rustle(0.5, 0.08, 0.7); },
    tick() { snap(2600, 0.12); knock(1700, 0.12, 0.004, 0.025); },                                  // teletype strike
    rumble() { burst({ type: "lowpass", freq: 160, vol: 0.55, attack: 0.3, decay: 3.4, sweep: 60 }); },
    paper() { rustle(0.18, 0.1); },
    click() { snap(3200, 0.18); snap(2400, 0.1, 0.035); },                                          // switch press + release
    select() { knock(190, 0.45, 0, 0.06); rustle(0.1, 0.07, 0.01, 3200); },                       // card laid on the desk
    deselect() { rustle(0.12, 0.08, 0, 2800); knock(260, 0.25, 0.08, 0.04); },                     // card picked up
    page() { rustle(0.22, 0.11, 0, 2000); },                                                       // binder page turned
    error() { knock(120, 0.6, 0, 0.09); knock(120, 0.6, 0.13, 0.09); },                            // two dull knocks
    chime() { bell(1650, 0.14); },                                                                  // desk service bell
    ding() { bell(2200, 0.07); },                                                                   // small bell
    beep(hi) { if (hi) { snap(1500, 0.3); knock(600, 0.5, 0, 0.12); } else { snap(2500, 0.2); knock(900, 0.25, 0.005, 0.03); } }, // relay clack
    boom() { burst({ type: "lowpass", freq: 900, vol: 0.8, decay: 2.2, sweep: 40 }); knock(60, 0.8, 0, 0.6); },
    pop() { rustle(0.09, 0.08, 0, 3500); },
    suggest() { knock(1400, 0.18, 0, 0.03); knock(1400, 0.18, 0.09, 0.03); },                      // pencil taps
    door(steps = 2) {                                                                              // latch, footsteps, door shuts
      snap(2200, 0.2); knock(700, 0.25, 0.01, 0.03);
      for (let i = 0; i < steps; i++) { knock(140, 0.35, 0.12 + i * 0.16, 0.06); burst({ at: 0.12 + i * 0.16, type: "lowpass", freq: 400, vol: 0.15, decay: 0.04 }); }
      knock(95, 0.5, 0.16 + steps * 0.16, 0.12); snap(1800, 0.12, 0.17 + steps * 0.16);
    },
    type() { snap(2800 + Math.random() * 900, 0.05); knock(1200 + Math.random() * 400, 0.06, 0.003, 0.015); }, // soft typewriter key
  };
})();
// every button gets a soft mechanical click
document.addEventListener("click", (e) => { if (e.target.closest(".btn:not(:disabled)")) SFX.click(); }, true);

function toast(msg, ms = 2600) {
  const t = $("#toast"); t.innerHTML = msg; t.classList.remove("hidden");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add("hidden"), ms);
}
function show(id) {
  $$(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  if (id === "title") titleScene($("#titleStars"));
}
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
  titleScene($("#titleStars"));
  $("#titlePlanet").src = planet("europa", 64);
  $("#titlePatch").src = missionPatch();
  S.player = store.get("player", "");
  $("#playerName").value = S.player;
  $("#playerName").addEventListener("input", (e) => { S.player = e.target.value.trim(); store.set("player", S.player); });
  S.cat = await api("catalog");
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  wireDesk(); wireLobby(); wireNews();
  // direct links for demos/screenshots: #play=<scenario>, #news=<scenario>
  if (location.hash === "#sounds") { // sound board for tuning the effects
    const names = { click: "Button (switch)", select: "Card on desk", deselect: "Card picked up", page: "Binder page", paper: "Paper",
      tick: "Teletype strike", error: "Error knocks", suggest: "Pencil taps", pop: "Tutorial rustle", chime: "Desk bell (flight ready)",
      ding: "Small bell (goal met)", thud: "Rubber stamp", beep: "Countdown relay", whoosh: "Spinning newspaper", rumble: "Launch rumble", boom: "Explosion" };
    const box = document.createElement("div"); box.className = "paper"; box.style.cssText = "position:absolute;inset:40px 240px;z-index:99;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start";
    box.innerHTML = `<h3 style="grid-column:span 2">Sound board</h3>` + Object.entries(names).map(([k, n]) => `<button class="btn" data-snd="${k}">${n}</button>`).join("");
    $("#title").appendChild(box);
    box.querySelectorAll("[data-snd]").forEach((b) => b.addEventListener("click", () => setTimeout(() => SFX[b.dataset.snd](), 120)));
  }
  if (location.hash === "#selftest") { const sc = document.createElement("script"); sc.src = "selftest.js"; document.body.appendChild(sc); }
  const [k, v] = location.hash.slice(1).split("=");
  if (k === "career") { S.mode = "career"; if (v === "all") store.set("career", Object.fromEntries(ORDER.slice(0, 5).map((o) => [o, { grade: "B", score: 600 }]))); openSelect(); }
  if (k === "tutorial") { go("tutorial"); for (let n = 0; n < Number(v || 0); n++) tutAdvance(); }
  if (v && S.cat.SCENARIOS[v.split(":")[0]]) {
    S.noLetter = true;
    S.mode = "free";
    if (k === "play") startMission(v);
    if (k === "design") { const [sc2, tab] = v.split(":"); startMission(sc2, S.cat.DEFAULTS[sc2]); if (tab) { S.tab = tab; renderTabs(); renderBinder(); } }
    if (k === "hints") { startMission(v, S.cat.DEFAULTS[v]); await wait(400); openHints("power"); }
    if (k === "letter") { S.mode = "career"; startMission(v); }
    if (k === "hq") { const x = newAgency(); x.month = 30; x.funds = 340; x.rep = 38; x.tech.push("deepcomms", "radar", "heavy"); x.trust = { esa: 2, isro: 1 };
      x.done = { wildfire: { grade: "A", score: 700 }, storm_watch: { grade: "B", score: 560 }, lunar_ice: { grade: "S", score: 820 } }; x.medals = ["orbit", "moon"];
      x.log = [{ month: 18, text: "Wildfire Watch: A (success)" }, { month: 24, text: "Annual budget: +97 M$" }, { month: 29, text: "Lunar Ice Prospector: S (success)" }];
      saveAgency(x); S.mode = "career"; openHQ(); if (v === "research") openResearch("bigbus"); }
    if (k === "station") { startMission(v, S.cat.DEFAULTS[v]); const g = document.createElement("canvas"); }
    if (k === "compare") {
      startMission(v, S.cat.DEFAULTS[v]); const e = drawer.add({ name: "Preset design", scenario: v, design: S.cat.DEFAULTS[v] });
      S.design = { ...S.design, launch_vehicle: "falcon_heavy", years: S.design.years + 2 }; renderAll(); openCompare("current", e.id);
    }
    if (k === "stamp") { startMission(v, S.cat.DEFAULTS[v]); await wait(400); stampAnim("ok"); }
    if (k === "news") { startMission(v, S.cat.DEFAULTS[v]); showNews(await api("launch", { design: S.design, save: false, seed: 7 })); }
    if (k === "launch") { const [sc3, at] = v.split(":"); startMission(sc3, S.cat.DEFAULTS[sc3]); playLaunch(await api("launch", { design: S.design, save: false, seed: 7 }), Number(at || 0)); }
  }
}

function go(where) {
  stopPoll();
  if (where === "title") return show("title");
  if (where === "career") return openHQ();
  if (where === "free") { S.mode = where; return openSelect(); }
  if (where === "tutorial") { S.mode = "career"; startMission("wildfire", null, { tutorial: true }); S.design.difficulty = "easy"; renderAll(); evaluateSoon(0); return; }
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
      <div class="f-kind">${KIND_LABEL[s.kind || "orbiter"]}</div>
      <div class="f-lvl">${s.difficulty} &middot; ${esc(S.cat.DESTINATIONS[s.destination].name)}</div>
      <div>${esc(s.pitch)}</div>
      <div>${icon("coin")} Budget ${fmt(s.budget)} M$</div>
      ${lock ? `<div class="f-lock">${icon("lock", 64)}</div>` : ""}
    </div>`;
  }).join("");
  $$(".folder").forEach((f) => f.onclick = () => { if (f.classList.contains("locked")) return SFX.error(); SFX.page(); startMission(f.dataset.sc); });
  show("select");
}

function startMission(sc, design, opts = {}) {
  const d = { ...S.cat.BLANK[sc], instruments: [], partners: [], ...(design || {}) }; // older saved designs lack newer fields
  if (!design) {
    d.difficulty = store.get("difficulty", "normal");
    d.sandbox = S.mode === "free" && $("#sandbox").checked;
  }
  if (S.mode === "career" && agency()) {                       // the agency calendar, partner trust and booster fleet shape the plan
    const a = agency(); d.start_month = a.month; d.trust = { ...a.trust }; d.difficulty = a.difficulty; d.sandbox = false;
    d.boosters = { ...(a.boosters || {}) };
    if (opts.invite) { d.joint = { partner: opts.invite.partner, share: opts.invite.share };
      if (!d.partners.includes(opts.invite.partner) && d.partners.length < S.cat.MAX_PARTNERS) d.partners = [...d.partners, opts.invite.partner]; }
  }
  S.design = d; S.tab = S.cat.SCENARIOS[sc].kind === "program" ? "manifest" : "orbit"; S.introShown = false; S.ev = null; S._prevOk = undefined; S._prevMet = null;
  openDesk();
  const tut = () => { if (opts.tutorial || (!design && S.mode === "career" && sc === "wildfire" && !store.get("tutorialDone", false) && !S.tut)) startTutorial(true); };
  if (!design && !S.noLetter) openLetter(tut); else tut();
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
  if (MULTI.has(field) && value.length < S.design[field].length) SFX.deselect(); else SFX.select();
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
  $("#tbDay").innerHTML = S.mode === "career" && agency() ? `${icon("calendar")} ${monthName(agency().month).toUpperCase()} &middot; AGENCY ${fmt(agency().funds)} M$` :
    S.mode === "team" ? `${icon("person")} TEAM` : `${icon("calendar")} FREE DESIGN`;
  $("#tbRoom").innerHTML = S.mode === "team" ? ` &middot; ROOM <span class="code">${S.room}</span> &middot; ${Object.keys(S.players).length} engineer(s)` : "";
  $("#tbScenario").textContent = `${scen().name.toUpperCase()} · ${S.cat.DIFFICULTY[S.design.difficulty].name.toUpperCase()}${S.design.sandbox ? " · SANDBOX" : ""}`;
  if (S.ev) $("#tbBudget").innerHTML = `${icon("coin")} ${fmt(S.ev.cost.total)} / ${fmt(S.ev.cost.budget)} M$`;
}

// ---------------------------------------------------------------------------- Cadet advisor
const PICK_ORDER = ["shape", "seats", "heatshield", "abort", "landing", "orbit", "window", "instruments", "bus", "solar", "battery", "adcs", "propulsion", "edl", "comms", "ground", "computer", "launch_vehicle"];
const FIELD_TAB = { shape: "hull", seats: "hull", heatshield: "shield", abort: "safety", landing: "safety", window: "launch", orbit: "orbit", instruments: "instr", bus: "bus", solar: "power", battery: "power", adcs: "adcs", edl: "edl",
  propulsion: "prop", comms: "comms", ground: "comms", computer: "computer", launch_vehicle: "launch", rtg: "power" };

function downlinkGb(commsKey, groundKey) {
  const c = S.cat, dest = c.DESTINATIONS[destKey()], x = c.COMMS[commsKey], g = c.GROUND[groundKey];
  if (g.relay_mbps) return g.relay_mbps * g.hours * 3.6;
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
        const cand = Object.entries(optionsFor("instruments")).filter(([k, i]) => i.tags.includes(g.tag) && !d.instruments.includes(k))
          .sort((a, b) => b[1].value / (b[1].cost + 5) - a[1].value / (a[1].cost + 5));
        if (cand.length) return { key: cand[0][0], why: `it serves "${g.label}"${g.required ? ", a required goal" : ""}` };
      }
      return null;
    }
    case "bus": {
      const n = Math.max(1, d.instruments.length + d.partners.filter((p) => S.cat.PARTNERS[p].instrument).length), base = ev && ev.mass.dry != null ? ev.mass.dry - (d.bus ? c.BUSES[d.bus].mass : 0) : 0;
      const fit = Object.entries(avail("bus", c.BUSES)).filter(([, b]) => b.slots >= n && b.max_dry >= (base + b.mass) * 1.25);
      return fit.length ? { key: cheapest(fit)[0], why: `it is the cheapest bus with ${n}+ slot(s) that holds your parts with room to spare` }
        : { key: "flagship", why: "only the biggest bus can hold all this" };
    }
    case "solar": {
      if (!ev) return null;
      const sunF = 1 / dest.sun_au ** 2, deg = (1 - (DEGRADE[destKey()] || 0.02)) ** life;
      const ef = d.orbit ? curOrbit().eclipse_frac : 0.35;
      if (ef >= 0.99) return { key: "none", why: "no sunlight ever reaches this site, so solar panels are useless; only RTGs work" };
      const est = ev.power.load + (d.instruments.length ? 0 : 30) + 40;
      const need = Math.max(0, (est - ev.power.rtg) * 1.25 / (1 - ef) / sunF / deg);
      if (need === 0) return { key: "none", why: "your RTGs already cover the power" };
      const fit = Object.entries(avail("solar", c.SOLAR_ARRAYS)).filter(([, a]) => a.power_1au >= need).sort((a, b) => a[1].power_1au - b[1].power_1au);
      return fit.length ? { key: fit[0][0], why: `it is the smallest array that powers ~${fmt(est)} W here with margin` }
        : { key: "giant", why: `even this is not enough this far from the Sun: also add RTGs in the Power tab` };
    }
    case "battery": {
      if (!ev) return null;
      const eh = d.orbit ? curOrbit().eclipse_h : 1, wh = eh * Math.max(0, ev.power.load + 40 - ev.power.rtg) / 0.6;
      const fit = Object.entries(avail("battery", c.BATTERIES)).filter(([, b]) => b.wh >= wh * 1.1).sort((a, b) => a[1].wh - b[1].wh);
      return { key: fit.length ? fit[0][0] : "b8000", why: `the longest shadow lasts ${eh} h and you need ~${fmt(wh)} Wh stored` };
    }
    case "adcs": {
      const strict = Math.min(...d.instruments.map((k) => c.INSTRUMENTS[k].pointing_deg), ["xhga", "kahga"].includes(d.comms) ? 0.5 : 99, 99);
      const fit = Object.entries(avail("adcs", c.ADCS)).filter(([, a]) => a.pointing_deg <= strict && (!a.needs_magnetic || dest.magnetic));
      return { key: cheapest(fit.length ? fit : [["precision", c.ADCS.precision]])[0],
        why: strict < 99 ? `your most demanding part needs ${strict}° pointing` : "it is the cheapest option that works here" };
    }
    case "propulsion": {
      if (!d.orbit || !ev) return { key: "mono", why: "a reliable all-rounder" };
      const o = curOrbit(), dv = (o.dv_insert + o.dv_per_year * d.years + (kindNow() === "sample_return" ? o.dv_return || 0 : 0)) * 1.1;
      const dry = (ev.mass.dry ?? 0) - (ev.mass.tanks ?? 0) - (d.propulsion ? c.PROPULSION[d.propulsion].mass : 0) + (ev.mass.edl || 0);
      const opts = Object.entries(avail("propulsion", c.PROPULSION)).map(([k, p]) => {
        if (!p.isp) return [k, o.dv_insert === 0 && o.max_years_no_prop >= d.years ? 0 : Infinity];
        const r = Math.exp(dv / (p.isp * 9.80665)) - 1, fuel = r * 0.08 >= 1 ? Infinity : ((dry + p.mass) * r) / (1 - 0.08 * r);
        return [k, p.max_prop && fuel > p.max_prop ? Infinity : p.mass + fuel * 1.08];
      }).sort((a, b) => a[1] - b[1]);
      return { key: opts[0][0], why: `engine + fuel is lightest for the ${fmt(dv)} m/s this mission needs` };
    }
    case "edl": {
      const opts = Object.entries(optionsFor("edl"));
      if (kindNow() === "sample_return") return { key: cheapest(opts)[0], why: "it brings the sample home for the least mass and money" };
      const landed = ev ? ev.edl.landed : 0, risky = d.orbit && curOrbit().landing_risk >= 0.05;
      const fit = opts.filter(([, o]) => (!o.needs_atmosphere || dest.atmosphere) && o.max_landed >= landed * 1.1);
      if (!fit.length) return { key: "retro", why: "nothing else can set down this much mass" };
      const pick = risky ? fit.sort((a, b) => a[1].risk_mult - b[1].risk_mult || a[1].cost - b[1].cost)[0] : cheapest(fit);
      return { key: pick[0], why: risky ? "this site is rough, so the safest landing you can carry is worth it"
        : `it is the cheapest system that can land ${fmt(landed)} kg ${dest.atmosphere ? "through this atmosphere" : "where there is no air to brake in"}` };
    }
    case "comms": {
      const need = ev ? ev.data.generated_gb_day : 1, g = d.ground || (dest.earth_au ? "dsn34" : "commercial");
      const okPoint = !d.adcs || c.ADCS[d.adcs].pointing_deg <= 0.5;
      const fit = Object.entries(avail("comms", c.COMMS)).filter(([k]) => okPoint || !["xhga", "kahga"].includes(k));
      const good = fit.filter(([k]) => downlinkGb(k, g) >= need);
      if (good.length) return { key: cheapest(good)[0], why: `it sends home all ${fmt(need, 1)} Gb/day your instruments collect` };
      const best = fit.sort((a, b) => downlinkGb(b[0], g) - downlinkGb(a[0], g))[0];
      return { key: best[0], why: "it is the fastest link you can point" };
    }
    case "ground": {
      const need = ev ? ev.data.generated_gb_day : 1, x = d.comms || (dest.earth_au ? "xhga" : "xlga");
      const fit = Object.entries(optionsFor("ground")).filter(([, g]) => g.relay_mbps || dest.earth_au <= g.max_earth_au);
      const good = fit.filter(([k]) => downlinkGb(x, k) >= need);
      if (good.length) return { key: cheapest(good)[0], why: dest.earth_au ? "only the Deep Space Network can hear you this far, and it is enough" : "it gives enough contact time per day" };
      return { key: fit.sort((a, b) => downlinkGb(x, b[0]) - downlinkGb(x, a[0]))[0][0], why: "it collects the most data per day" };
    }
    case "manifest": T.push(...programTips()); break;
    case "partners": {
      if (ev) T.push(ev.partners.keys.length ? `Your partners pay <b>${fmt(ev.partners.saving)} M$</b>; chance that someone is late: <b>${pct(ev.partners.delay)}</b>.` : "No partners yet: you pay for everything, and nobody else can make you late.");
      T.push("Partner instruments ride along for free but need an instrument slot, mass and power like any other.");
      T.push("A late partner can make a planetary mission miss its launch window: the next one may be years away.");
      break;
    }
    case "edl": {
      if (kindNow() === "sample_return") {
        T.push("The capsule is a separate stage: it adds mass, and the trip home needs extra Δv from your engine.");
        T.push(`Options: ${names(Object.values(optionsFor("edl")).map((x) => `${x.name}: ${x.mass_fixed} kg, sample x${x.sample_mult}, ${x.cost} M$`))}.`);
        T.push("A backup parachute cuts the chance of losing the sample in the last minute.");
        break;
      }
      T.push(dest.atmosphere ? "This world has air: parachutes, airbags and a sky crane all work." : "No air here: parachutes and airbags are useless. Only rocket engines can slow you down.");
      if (ev && ev.edl.landed) T.push(`Your landed mass is <b>${fmt(ev.edl.landed)} kg</b>. Airbags handle up to 600 kg, a sky crane up to 1,200 kg.`);
      if (orb) T.push(`This site's base landing risk is <b>${pct(orb.landing_risk)}</b>. Hazard avoidance multiplies it by 0.45, a sky crane by 0.5.`);
      break;
    }
    case "computer": {
      const env = ev ? ev.radiation.env : dest.radiation, shield = d.bus === "flagship" ? 1 : 0, store = ev ? ev.data.storage_need_gb : 0;
      const fit = Object.entries(avail("computer", c.COMPUTERS)).filter(([, x]) => x.rad + shield >= env && x.storage_gb >= store);
      return { key: cheapest(fit.length ? fit : [["radhard", c.COMPUTERS.radhard]])[0], why: `radiation here is ${c.RADIATION_LABEL[env].toLowerCase()}, and it survives that` };
    }
    case "partners": {
      const free = Object.entries(avail("partners", c.PARTNERS)).filter(([k]) => !d.partners.includes(k)).sort((a, b) => b[1].share - a[1].share);
      return free.length ? { key: free[0][0], why: `they pay ${pct(free[0][1].share)} of the hardware` } : null;
    }
    case "window": {
      const ws = Object.entries(optionsFor("window"));
      if (!ws.length) return null;
      const val = (w) => (w.synodic ? (w.energy - 1) * 1.5 : 0) - (w.cost_mult - 1) * 2 - Math.max(0, w.risk_mult - 1);
      const [k, w] = ws.sort((a, b) => val(b[1]) - val(a[1]))[0];
      return { key: k, why: `it leaves ${w.build_months} months to build${w.synodic && w.energy >= 1.04 ? " and the planets line up well" : ""}` };
    }
    case "shape": return { key: "capsule", why: "capsules are the simplest, lightest and safest way to bring people home" };
    case "seats": return { key: "s4", why: "one flight then carries a whole station crew" };
    case "heatshield": return { key: "metallic", why: "it survives many re-entries and needs little work between flights" };
    case "abort": {
      const fits = c.VEHICLE.shape[d.shape || "capsule"].fits;
      const k = ["tower", "pusher", "seats", "none"].find((x) => fits.includes(x) && (x !== "seats" || (c.VEHICLE.seats[d.seats || "s4"].n <= 2)));
      return { key: k, why: k === "tower" ? "an escape tower saves the crew 97% of the time" : "it is the best escape system this shape allows" };
    }
    case "landing": {
      const fits = c.VEHICLE.shape[d.shape || "capsule"].fits;
      const k = ["land_chutes", "runway", "ocean", "propulsive"].find((x) => fits.includes(x));
      return { key: k, why: k === "runway" ? "a winged vehicle can glide home to an airport" : "landing on dry ground keeps the vehicle reusable" };
    }
    case "launch_vehicle": {
      if (!ev || ev.mass.wet == null) return null;
      const tgt = curOrbit().lv_target, fit = Object.entries(avail("launch_vehicle", c.LAUNCH_VEHICLES)).filter(([k, v]) => v.capacity[tgt] * energy() >= ev.mass.wet * 1.15 && (kindNow() !== "vehicle" || c.CREW_RATED.includes(k)));
      return fit.length ? { key: cheapest(fit)[0], why: `it is the cheapest rocket that lifts your ${fmt(ev.mass.wet)} kg with margin` }
        : { key: "sls", why: "nothing smaller can lift it; better cut mass" };
    }
  }
  return null;
}

function issueField(i) {
  const t = i.text;
  if (i.field) return i.field;
  if (i.area === "cost" && /budget is/.test(t) && S.design.partners.length < S.cat.MAX_PARTNERS) return "partners";
  return { window: "window", launch: "launch_vehicle", propulsion: "propulsion", radiation: "computer", adcs: "adcs", edl: "edl", orbit: "orbit" }[i.area]
    || (i.area === "bus" ? (/slots/.test(t) ? "bus" : "bus") : null)
    || (i.area === "power" ? (/Battery|eclipse/i.test(t) ? "battery" : /RTG/.test(t) ? null : "solar") : null)
    || (i.area === "comms" ? (/high-gain/.test(t) ? "adcs" : /hear you/.test(t) ? "ground" : /Recorder/.test(t) ? "computer" : "comms") : null)
    || (i.area === "science" && /Required goal/.test(t) ? "instruments" : null);
}

// The next thing a Cadet should do: pick a missing part, or swap one that causes a problem.
function advisor() {
  if (isProgram()) return programAdvisor();
  const d = S.design, ev = S.ev;
  if (!ev) return null;
  const fieldsHere = new Set(tabs().flatMap((t) => t.fields));
  for (const f of PICK_ORDER) {
    if (!fieldsHere.has(f)) continue;
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
      if (f === "battery" && r && r.key === d.battery && d.rtg < S.cat.RTG.max) {
        f = "rtg"; r = { key: d.rtg + 1, why: "the night here is too long for any battery; an RTG keeps you powered and warm until sunrise" };
      }
      if (f === "rtg") return { ...r, field: f, action: "swap", issue: i };
      if (r && (MULTI.has(f) ? !d[f].includes(r.key) : d[f] !== r.key)) return { ...r, field: f, action: "swap", issue: i };
    }
  }
  return null;
}
const partName = (f, k) => (f === "rtg" ? `${S.cat.RTG.name} (${k} in total)` : (optionsFor(f, true)[k] || {}).name || k);

function renderClient() {
  const c = CLIENTS[S.design.scenario];
  let mood = "neutral", text = `"${scen().story}"`;
  const ev = S.ev;
  if (ev && (S.introShown || (level() === "easy" && S.advice))) { // Cadet hears the first hint straight away
    const miss = ev.issues.filter((i) => i.area === "missing");
    const b = ev.issues.find((i) => i.severity === "blocker" && i.area !== "missing");
    const w = ev.issues.find((i) => i.severity === "warning");
    const lv = level(), a = S.advice;
    if (lv === "easy" && !a && inCareer() && ev.issues.some((i) => i.severity === "blocker")) { mood = "neutral"; text = `"With the parts we own I can't make this work. Some technology is still locked: visit Research at headquarters."`; }
    else if (lv === "easy" && a && a.program) { mood = b ? "angry" : "neutral"; text = `"${a.text}."`; }
    else if (lv === "easy" && a) {
      mood = a.action === "pick" ? "neutral" : b ? "angry" : "neutral";
      const name = partName(a.field, a.key);
      text = a.action === "pick"
        ? `"Next we need ${fieldLabel(a.field).toLowerCase()}. I suggest the ${name}: ${a.why}."`
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
  typeSpeech(text);
}

// The client speaks letter by letter with a soft typewriter patter; a click shows it all at once.
function typeSpeech(text) {
  const el = $("#speech");
  if (el.dataset.full === text) return;
  el.dataset.full = text;
  clearInterval(typeSpeech._iv);
  let n = 0;
  const step = () => {
    n = Math.min(text.length, n + 2);
    el.textContent = text.slice(0, n);
    if (n % 6 < 2 && text[n - 1] !== " ") SFX.type();
    if (n >= text.length) clearInterval(typeSpeech._iv);
  };
  typeSpeech._iv = setInterval(step, 28); step();
  el.onclick = () => { clearInterval(typeSpeech._iv); el.textContent = text; };
}

// ---------------------------------------------------------------------------- incoming letter (mission start)
function openLetter(then) {
  const c = CLIENTS[S.design.scenario], s = scen(), m = $("#letter");
  $("#letterImg").src = portrait(c.look, "neutral");
  $("#letterFrom").textContent = c.name;
  $("#letterOrg").textContent = c.org;
  $("#letterDay").textContent = S.mode === "career" ? `DAY ${ORDER.indexOf(S.design.scenario) + 1}` : "FREE DESIGN";
  $("#letterPitch").innerHTML = `${icon("coin")} ${fmt(s.budget * S.cat.DIFFICULTY[S.design.difficulty].budget_mult)} M$ &middot; ${esc(S.cat.DESTINATIONS[s.destination].name)} &middot; ${s.min_years}+ yr`;
  const body = $("#letterBody");
  body.innerHTML = c.letter.map(() => "<p></p>").join("") + `<p class="sig">${esc(c.name)}</p>`;
  m.classList.remove("hidden");
  const box = m.querySelector(".letter"); box.classList.remove("slide"); void box.offsetWidth; box.classList.add("slide");
  SFX.paper(); setTimeout(() => SFX.paper(), 250);
  const token = (openLetter.token = (openLetter.token || 0) + 1);
  const ps = $$("#letterBody p:not(.sig)");
  let done = false;
  const finish = () => { done = true; ps.forEach((p, i) => (p.textContent = c.letter[i])); };
  body.onclick = finish;
  (async () => {
    await wait(450);
    for (let i = 0; i < ps.length && !done; i++) {
      for (let n = 0; n <= c.letter[i].length && !done; n += 2) {
        if (token !== openLetter.token) return;
        ps[i].textContent = c.letter[i].slice(0, n);
        if (n % 6 === 0) SFX.type();
        await wait(16);
      }
      await wait(160);
    }
    finish();
  })();
  $("#letterGo").onclick = () => { openLetter.token++; m.classList.add("hidden"); SFX.page(); if (then) then(); };
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
  $("#reqYears").closest(".req-line").classList.toggle("hidden", isProgram() || kindNow() === "vehicle");
  if (kindNow() === "vehicle") $("#reqCruise").textContent = `Fly ${s.vehicle.seats_needed} astronaut seats to the space station over ${s.vehicle.years} years.`;
  if (isProgram()) {
    const P = s.program, sl = ev && ev.kind === "program" ? ev.program.slots : null;
    $("#reqCruise").textContent = `${P.slots} launch slots${P.windows ? " (Mars windows, 26 months apart)" : `, one every ${P.slot_months} months`}${sl ? ` from ${sl[0].label}` : ""}. Crews stay ${P.stay} months.`;
  }
}

function renderTabs() {
  $("#tabs").innerHTML = tabs().map((t) => {
    const locked = S.mode === "team" && !S.myRoles.includes(t.role);
    const todo = t.fields.some((f) => f !== "rtg" && f !== "partners" && (f === "instruments" || f === "manifest" ? !(S.design[f] || []).length : S.design[f] == null));
    return `<div class="tab ${t.id === S.tab ? "on" : ""} ${locked ? "locked" : ""}" data-tab="${t.id}" title="${esc(LABS[t.id].name)}">${icon(locked ? "lock" : t.icon, 14)}${t.label}${todo ? '<span class="todo" title="still to choose"></span>' : ""}</div>`;
  }).join("");
  $$("#tabs .tab").forEach((el) => el.onclick = () => goLab(el.dataset.tab));
  const cur = $("#tabs .tab.on"); if (cur && isMobile()) cur.scrollIntoView({ block: "nearest", inline: "center" });
}

// Move to another lab: footsteps, the room slides in from that side.
function goLab(id) {
  if (S.tab === id) return;
  const from = tabs().findIndex((t) => t.id === S.tab), to = tabs().findIndex((t) => t.id === id);
  S.tab = id; renderTabs(); renderBinder();
  const b = $("#binder"); b.scrollTop = 0;
  b.classList.remove("walk-l", "walk-r"); void b.offsetWidth; b.classList.add(to > from ? "walk-r" : "walk-l");
  SFX.door(Math.min(4, Math.abs(to - from)));
}
let _labFrame = 0;
setInterval(() => {
  const c = document.getElementById("labCanvas");
  if (c && $("#desk").classList.contains("active") && !document.hidden) drawLab(c, c.dataset.lab, ++_labFrame);
}, 160);

function optionsFor(field, all = false) {
  const o = optionsForAll(field);
  if (all || !o || !inCareer() || field === "window" || field === "orbit") return o;
  return Object.fromEntries(Object.entries(o).filter(([k]) => (field === "partners" ? partnerOpen(k) : isUnlocked(field, k))));
}
function optionsForAll(field) {
  const c = S.cat, dest = c.DESTINATIONS[destKey()], use = { lander: "land", rover: "land", sample_return: "return" }[kindNow()];
  const keep = (obj, fn) => Object.fromEntries(Object.entries(obj).filter(([k, o]) => fn(o, k)));
  if (field === "edl") return keep(c.EDL, (o) => o.use === use);
  if (["shape", "seats", "heatshield", "abort", "landing"].includes(field)) return c.VEHICLE[field];
  if (field === "partners") return Object.fromEntries(Object.entries(c.PARTNERS).map(([k, p]) => [k, { ...p,
    learn: `${kindNow() === "program" ? p.program_gives || p.gives : p.gives} ${p.learn}` }]));
  if (field === "window") return Object.fromEntries(((S.ev && S.ev.windows) || []).map((w) => [w.key, { ...w, name: windowName(w), learn: windowLearn(w) }]));
  if (field === "ground") return keep(c.GROUND, (o) => !o.relay_mbps || dest.relay);
  if (field === "instruments") return keep(c.INSTRUMENTS, (o) => !o.where || (o.where === "surface") === !!dest.surface);
  return { launch_vehicle: c.LAUNCH_VEHICLES, orbit: c.ORBITS[destKey()], bus: c.BUSES, solar: c.SOLAR_ARRAYS,
    battery: c.BATTERIES, adcs: c.ADCS, propulsion: c.PROPULSION, comms: c.COMMS, ground: c.GROUND,
    computer: c.COMPUTERS, instruments: c.INSTRUMENTS }[field];
}

const energy = () => (S.ev && S.ev.schedule && S.ev.schedule.window ? S.ev.schedule.window.energy : 1);
function windowName(w) { return `${w.label}${w.synodic ? ` (${S.cat.DESTINATIONS[destKey()].name.split(" (")[0]} window)` : ""}`; }
function windowLearn(w) {
  const t = [];
  if (w.rush >= 0.34) t.push(`Only ${w.build_months} months to build: overtime costs more and tests get skipped.`);
  else if (w.slow > 0) t.push(`${w.build_months} months to build: plenty of time to test, but the team must be paid while it waits.`);
  else t.push(`${w.build_months} months to build: a normal schedule.`);
  if (w.synodic) t.push(w.energy >= 1.04 ? "Planets line up well: the rocket lifts more and the cruise is shorter." :
    w.energy < 0.95 ? "A poor alignment: the rocket lifts less and the cruise takes longer." : "An average alignment.");
  if (w.synodic) t.push(`Miss it and the next ${S.cat.DESTINATIONS[destKey()].name.split(" (")[0]} window is ${w.synodic} months later.`);
  return t.join(" ");
}
function statLine(field, k, o) {
  const c = S.cat, dest = c.DESTINATIONS[destKey()];
  const tgt = curOrbit().lv_target;
  switch (field) {
    case "launch_vehicle": return `${fmt(o.capacity[tgt] * energy())} kg to ${c.LV_TARGET_LABEL[tgt]} · ${fmt(o.cost)} M$`;
    case "shape": return `${fmt(o.base / 1000, 1)} t + ${o.per_seat} kg/seat · design ${fmt(o.dev)} M$ · build ${o.build} M$${o.cargo ? ` · ${kt(o.cargo)} cargo` : ""}`;
    case "seats": return `${o.n} astronauts per flight · ${Math.ceil(40 / o.n)} flights for 40 seats`;
    case "heatshield": return `${o.reusable ? "reusable" : "single use"} · +${Math.round(o.frac * 100)}% mass · loses 1 crew in ${fmt(1 / o.risk)}`;
    case "abort": return `saves the crew ${pct(o.save)} of the time · ${o.mass_per_seat ? `${o.mass_per_seat} kg/seat` : `${fmt(o.mass)} kg`}`;
    case "landing": return `${o.reuse >= 1 ? "fully reusable" : `reuse ${pct(o.reuse)}`} · ${o.ship} M$/flight · loses 1 crew in ${fmt(1 / o.risk)}`;
    case "partners": {
      if (kindNow() === "program") { const off = o.program && o.program[progSpec().place];
        return off ? `builds ${S.cat.PAYLOADS[off.p].name} · delay risk ${pct(o.delay)}` : o.arm ? `robotic arm · pays ${pct(o.share)}` : `pays ${pct(o.share)} of hardware`; }
      return `pays ${pct(o.share)} of hardware · delay risk ${pct(o.delay)}`;
    }
    case "window": return `build ${o.build_months} mo · rocket ${o.energy >= 1 ? "+" : ""}${Math.round((o.energy - 1) * 100)}% · cost x${o.cost_mult} · risk x${o.risk_mult}`;
    case "orbit": return onSurface() ? `night ${o.eclipse_h ? `${o.eclipse_h} h` : "forever"} · sunlit ${pct(1 - o.eclipse_frac)} · landing risk ${pct(o.landing_risk)}`
      : `Δv ${o.dv_insert} m/s · covers ${pct(o.coverage)} · shadow ${o.eclipse_h} h`;
    case "edl": return o.use === "return" ? `${o.mass_fixed} kg · sample x${o.sample_mult} · ${o.cost} M$`
      : `${o.needs_atmosphere ? "needs air" : "works anywhere"} · up to ${fmt(o.max_landed)} kg · risk x${o.risk_mult} · ${o.cost} M$`;
    case "bus": return `holds ${fmt(o.max_dry)} kg · ${o.slots} slots · ${o.mass} kg · ${o.cost} M$`;
    case "solar": return `${fmt(o.power_1au)} W at Earth, ${fmt(o.power_1au / dest.sun_au ** 2)} W here · ${o.mass} kg · ${o.cost} M$`;
    case "battery": return `${fmt(o.wh)} Wh · ${o.mass} kg · ${o.cost} M$`;
    case "adcs": return `${o.pointing_deg}° pointing · ${o.mass} kg · ${o.power} W · ${o.cost} M$`;
    case "propulsion": return o.isp ? `Isp ${o.isp} s · ${o.mass} kg · ${o.cost} M$` : "0 kg · 0 M$";
    case "comms": return `up to ${o.max_mbps} Mbps · ${o.mass} kg · ${o.power} W · ${o.cost} M$`;
    case "ground": return o.relay_mbps ? `${o.relay_mbps} Mbps relay · ${o.hours} h/sol · ${o.cost_year} M$/yr` : `${o.hours} h/day · signal x${o.gain} · ${o.cost_year} M$/yr`;
    case "computer": return `${o.storage_gb} GB · radiation lvl ${o.rad} · ${o.cost} M$`;
    case "instruments": return `${o.mass} kg · ${o.power} W · ${o.data_mbps} Mbps · ${o.cost} M$`;
  }
  return "";
}

function cardBad(field, k, o) {
  const c = S.cat, dest = c.DESTINATIONS[destKey()], tgt = curOrbit().lv_target;
  if (field === "launch_vehicle" && kindNow() === "vehicle" && !S.cat.CREW_RATED.includes(k)) return true;
  if (["abort", "landing"].includes(field) && S.design.shape) return !c.VEHICLE.shape[S.design.shape].fits.includes(k) || (field === "abort" && o.max_seats && S.design.seats && c.VEHICLE.seats[S.design.seats].n > o.max_seats);
  if (field === "launch_vehicle") return !o.capacity[tgt] || (S.ev && S.design.orbit && S.ev.mass.wet > o.capacity[tgt] * energy());
  if (field === "adcs") return o.needs_magnetic && !dest.magnetic;
  if (field === "ground") return !o.relay_mbps && dest.earth_au > o.max_earth_au;
  if (field === "edl") return (o.needs_atmosphere && !dest.atmosphere) || (S.ev && S.ev.edl.landed > o.max_landed);
  return false;
}

function renderBinder() {
  const tab = tabs().find((t) => t.id === S.tab) || tabs().find((t) => t.id === "orbit") || tabs()[0];
  S.tab = tab.id;
  const locked = S.mode === "team" && !S.myRoles.includes(tab.role);
  const goalTags = new Set(scen().goals.map((g) => g.tag));
  const role = S.cat.ROLES[tab.role];
  if (tab.id === "manifest") {
    const head = `<div class="lab-banner"><canvas id="labCanvas" data-lab="manifest" width="${LAB_W}" height="${LAB_H}" class="px"></canvas>
      <div class="lab-plate"><b>${esc(LABS.manifest.name)}</b><span>${esc(role.name)}'s lab</span></div></div>
      ${locked ? `<div class="lock-banner">${icon("lock")} Classified: the manifest belongs to the ${role.name}. You can read it but not change it.</div>` : ""}
      <p class="hint">${esc(tab.hint)}</p>`;
    return renderManifest(head);
  }
  let h = `<div class="lab-banner"><canvas id="labCanvas" data-lab="${tab.id}" width="${LAB_W}" height="${LAB_H}" class="px"></canvas>
    <div class="lab-plate"><b>${esc(LABS[tab.id].name)}</b><span>${esc(role.name)}'s lab</span></div></div>`;
  h += locked ? `<div class="lock-banner">${icon("lock")} Classified: this section belongs to the ${S.cat.ROLES[tab.role].name}. You can read it but not change it.</div>` : "";
  h += `<p class="hint">${esc(tab.hint)}</p>`;
  if (tab.id === "power" && S.ev && S.ev.power.load) {
    const P = S.ev.power, rows = Object.entries(P.loads).filter(([, w]) => w >= 0.5);
    h += `<div class="pbudget"><b>POWER BUDGET (average, end of mission)</b>
      ${rows.map(([k, w]) => `<div><span>${esc(k)}</span><span>${fmt(w)} W</span></div>`).join("")}
      <div class="tot"><span>Total need</span><span>${fmt(P.load)} W</span></div>
      <div><span>Solar (avg incl. shadow)</span><span>${fmt(P.generation - P.rtg)} W</span></div>
      ${P.rtg ? `<div><span>RTGs</span><span>${fmt(P.rtg)} W</span></div>` : ""}
      <div class="tot"><span>Available</span><span>${fmt(P.generation)} W</span></div></div>`;
  }
  for (const field of tab.fields) {
    h += `<h4>${fieldLabel(field)}</h4>`;
    if (field === "rtg") {
      const R = S.cat.RTG;
      h += `<div class="cards"><div class="card rtgcard ${S.design.rtg ? "sel" : ""} " style="cursor:default">
        <div class="ci">${icon("rtg", 32)}</div><div class="cn">${esc(R.name)}</div>
        <div class="cs">${R.power} W each · ${R.mass} kg · ${R.cost} M$</div>
        <div class="stepper"><button class="btn tiny" data-rtg="-1" ${canEdit("rtg") ? "" : "disabled"}>-</button>
        <b>${S.design.rtg} / ${R.max}</b><button class="btn tiny" data-rtg="1" ${canEdit("rtg") && isUnlocked("rtg", "rtg") ? "" : "disabled"}>+</button></div>
        ${isUnlocked("rtg", "rtg") ? "" : `<div class="lockline" data-tech="nuclear">${icon("lock", 12)} Research: ${TECH.nuclear.name} (${TECH.nuclear.cost} M$)</div>`}
        <div class="cl">${esc(R.learn)}</div></div></div>`;
      continue;
    }
    const opts = optionsFor(field, true);
    h += `<div class="cards">` + Object.entries(opts).map(([k, o]) => {
      const sel = MULTI.has(field) ? S.design[field].includes(k) : S.design[field] === k;
      const lockT = field === "partners" ? (!partnerOpen(k) ? `Opens at agency reputation ${PARTNER_REP[k]}` : null)
        : !isUnlocked(field, k) ? `Research: ${TECH[TECH_OF[`${field}:${k}`]].name} (${TECH[TECH_OF[`${field}:${k}`]].cost} M$)` : null;
      if (lockT && !sel) return `<div class="card research" data-tech="${field === "partners" ? "" : TECH_OF[`${field}:${k}`]}">
        <div class="ci">${icon(PART_ICON[field](k), 32)}</div><div class="cn">${esc(o.name)}</div><div class="cs">${statLine(field, k, o)}</div>
        <div class="lockline">${icon("lock", 12)} ${esc(lockT)}</div></div>`;
      const tags = field === "instruments" ? `<div class="tagrow">${o.tags.map((t) => `<span class="tag ${goalTags.has(t) ? "hit" : ""}">${t}</span>`).join("")}</div>` : "";
      return `<div class="card ${sel ? "sel" : ""} ${level() !== "hard" && cardBad(field, k, o) ? "bad" : ""} ${locked ? "disabled" : ""}" data-f="${field}" data-k="${k}">
        <div class="ci">${icon(PART_ICON[field](k), 32)}</div>
        <div class="cn">${esc(o.name)}</div><div class="cs">${statLine(field, k, o)}</div>${tags}
        ${o.learn ? `<div class="cl">${esc(o.learn)}</div>` : ""}</div>`;
    }).join("") + `</div>`;
  }
  const binder = $("#binder"), top = binder.scrollTop;
  binder.innerHTML = h;
  binder.scrollTop = top;
  drawLab($("#labCanvas"), tab.id, _labFrame);
  $$("#binder .card[data-f]").forEach((el) => el.onclick = () => {
    const f = el.dataset.f, k = el.dataset.k;
    if (MULTI.has(f)) {
      const cur = S.design[f];
      if (f === "partners" && !cur.includes(k) && cur.length >= S.cat.MAX_PARTNERS) {
        SFX.error(); return toast(`At most ${S.cat.MAX_PARTNERS} partners: each one adds meetings, interfaces and delay risk.`);
      }
      setField(f, cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]);
    } else setField(f, k);
  });
  $$("#binder [data-tech]").forEach((el) => el.onclick = () => { if (el.dataset.tech) { SFX.page(); openResearch(el.dataset.tech); } else { SFX.error(); toast("Partners join agencies with a better reputation. Fly successful missions first."); } });
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
  if (ev.kind === "program") $("#meters").innerHTML = programMeters(ev); else if (ev.kind === "vehicle") $("#meters").innerHTML = vehicleMeters(ev); else $("#meters").innerHTML =
    (!D.launch_vehicle || !D.orbit ? pending("weight", "MASS", !D.orbit ? "orbit" : "rocket") :
      meter("weight", "MASS", mf, m.capacity ? `${fmt(m.wet)}/${fmt(m.capacity)} kg` : "can't reach",
        mf > 1 ? "bad" : m.margin < req ? "warn" : "", 1 - req)) +
    (D.solar == null && !D.rtg ? pending("bolt", "POWER", "solar") :
      meter("bolt", "POWER", pf, `${fmt(p.load)}/${fmt(p.generation)} W`, pf > 1 ? "bad" : p.margin < 0.2 ? "warn" : "", 1 / 1.2)) +
    (!D.battery || !D.orbit ? pending("battery", onSurface() ? "NIGHT" : "ECLIPSE", !D.orbit ? "orbit" : "battery") :
      meter("battery", onSurface() ? "NIGHT" : "ECLIPSE", p.battery_usable_wh ? p.eclipse_need_wh / p.battery_usable_wh : 1,
        `${fmt(p.eclipse_need_wh)}/${fmt(p.battery_usable_wh)} Wh`, battBad ? "bad" : "")) +
    (!D.instruments.length || !D.comms || !D.ground ? pending("disk", "DATA", !D.instruments.length ? "instr." : !D.comms ? "antenna" : "ground") :
      meter("disk", "DATA", d.return, `${pct(d.return)} home`, d.return < 0.5 ? "bad" : d.return < 0.8 ? "warn" : "", 0.8)) +
    (ev.edl.use === "land" ? (!D.edl || !D.orbit ? pending("chute", "LANDING", !D.orbit ? "site" : "system")
      : meter("chute", "LANDING", 1 - ev.edl.landing_risk, `${pct(1 - ev.edl.landing_risk)} safe`, ev.edl.landing_risk > 0.06 ? "warn" : "", 0.94)) : "") +
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
  const lv = level();
  let html = "";
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
  if (isProgram()) { if (empty) empty.remove(); return drawProgramBlueprint(g, W, H); }
  if (kindNow() === "vehicle") { if (empty) empty.remove(); drawVehicle(g, d, W / 2, H / 2 + 6, d.shape === "winged" ? 2.4 : 3, "blue");
    $("#bpSlots").textContent = S.ev && S.ev.vehicle ? `${fmt(S.ev.vehicle.mass / 1000, 1)} t · ${S.ev.vehicle.seats} seats · ${S.ev.vehicle.flights} flights` : "Your crew vehicle"; return; }
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
  const kind = kindNow();
  if (kind === "lander" && d.edl) for (const side of [-1, 1]) {                         // landing legs
    for (let i = 0; i < 12; i++) r(cx + side * (s / 2 + i * 0.8), cy + s / 2 - 2 + i, 1, 1, L);
    r(cx + side * (s / 2 + 10) - 2, cy + s / 2 + 10, 5, 2, M);
  }
  if (kind === "rover") {                                                               // six wheels on rockers + mast camera
    r(cx - s / 2 - 6, cy + s / 2 + 2, s + 12, 1, M);
    [-1, 0, 1].forEach((k) => { const x = cx + k * (s / 2 + 2); r(x - 3, cy + s / 2 + 3, 7, 7, D); r(x - 2, cy + s / 2 + 4, 5, 5, L); r(x, cy + s / 2 + 6, 1, 1, D); });
    r(cx - s / 2 + 3, cy - s / 2 - 16, 1, 16, M); r(cx - s / 2, cy - s / 2 - 19, 7, 3, L);
  }
  if (kind === "sample_return" && d.edl) {                                              // capsule on the side + sampler arm
    const x0 = cx - s / 2 - 12, y0 = cy - s / 2 + 2;
    for (let i = 0; i < 6; i++) r(x0 + 5 - i, y0 + i, 2 + i * 2, 1, "#c9a24a"); r(x0 - 1, y0 + 6, 14, 2, L);
  }
  if (d.instruments.includes("tagsam")) { for (let i = 0; i < 16; i++) r(cx + s / 2 - 2 + i * 0.6, cy + s / 2 + i, 1, 1, L); r(cx + s / 2 + 6, cy + s / 2 + 16, 5, 2, M); }
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
    topography: "#ffd96b", subsurface: "#a9bac4", fields: "#f07fa0", life: "#8ee07a", interior: "#e0a070", sample: "#f4efe2" };
  d.instruments.forEach((k, i) => {
    const o = S.cat.INSTRUMENTS[k], n = d.instruments.length, x = cx - s / 2 + ((i + 1) * s) / (n + 1);
    r(x - 1, cy + s / 2 - 5, 3, 3, COL[o.tags[0]] || L);
  });
  const free = S.cat.BUSES[d.bus].slots - d.instruments.length - d.partners.filter((p) => S.cat.PARTNERS[p].instrument).length;
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
  $("#menuBtn").onclick = () => { SFX.page(); $("#mMsg").textContent = ""; soundLabel(); $("#mHQ").classList.toggle("hidden", S.mode !== "career"); $("#menu").classList.remove("hidden"); };
  $("#mHQ").onclick = () => { $("#menu").classList.add("hidden"); endTutorial(false); openHQ(); };
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
  $("#designsBtn").onclick = () => { SFX.page(); openCompare(); };
  $("#mCompare").onclick = () => { $("#menu").classList.add("hidden"); openCompare(); };
  $("#mSave").onclick = () => { const e = saveCurrentDesign(); if (e) $("#mMsg").textContent = `Saved "${e.name}" to the drawer.`; };
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

// ---------------------------------------------------------------------------- design drawer + side-by-side comparison
// Saved designs live in this browser (a drawer per player). Every flown design is filed automatically with its result.
const drawer = {
  all() { return store.get("designs", []); },
  of(sc) { return this.all().filter((x) => x.scenario === sc).sort((a, b) => b.at - a.at); },
  add(entry) {
    const all = this.all().filter((x) => !(entry.flight && x.flight && x.flight.seed === entry.flight.seed && x.scenario === entry.scenario));
    all.push({ id: `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), ...entry });
    store.set("designs", all.slice(-40)); return all[all.length - 1];
  },
  remove(id) { store.set("designs", this.all().filter((x) => x.id !== id)); },
  get(id) { return this.all().find((x) => x.id === id); },
};
function saveCurrentDesign() {
  const n = drawer.of(S.design.scenario).length + 1;
  const name = (prompt("Name this design:", `${scen().name} draft ${n}`) || "").trim();
  if (!name) return null;
  SFX.paper();
  return drawer.add({ name: name.slice(0, 40), scenario: S.design.scenario, design: { ...S.design, instruments: [...S.design.instruments] } });
}

const PROG_CMP_ROWS = [
  ["Total cost", (e) => e.cost.total, "low", (v) => `${fmt(v)} M$`],
  ["Budget reserve", (e) => e.cost.reserve, "high", pct],
  ["Flights", (e) => e.program.flights.length, "low", (v) => `${v}`],
  ["Crew-months", (e) => e.program.crew_months, "high", (v) => fmt(v)],
  ["Spare supplies (worst)", (e) => e.program.min_reserve_months ?? 0, "high", (v) => `${fmt(v, 1)} months`],
  ["Goals", (e) => e.science.score, "high", (v) => `${fmt(v)} / 100`],
  ["Blockers", (e) => e.issues.filter((i) => i.severity === "blocker").length, "low", (v) => (v ? `${v}` : "none")],
];
const CMP_ROWS = [
  ["Total cost", (e) => e.cost.total, "low", (v) => `${fmt(v)} M$`],
  ["Budget reserve", (e) => e.cost.reserve, "high", pct],
  ["Launch mass", (e) => e.mass.wet, "low", (v, e) => `${fmt(v)} / ${fmt(e.mass.capacity)} kg`],
  ["Mass margin", (e) => e.mass.margin, "high", pct],
  ["Power margin", (e) => e.power.margin, "high", pct],
  ["Data reaching Earth", (e) => e.data.return, "high", pct],
  ["Planned science", (e) => e.science.score, "high", (v) => `${fmt(v)} / 100`],
  ["Blockers", (e) => e.issues.filter((i) => i.severity === "blocker").length, "low", (v) => (v ? `${v}` : "none")],
];
async function openCompare(aId, bId) {
  const sc = S.design.scenario, list = drawer.of(sc);
  const opts = [{ id: "current", name: "Current design on the desk" }, ...list];
  const fill = (sel, val) => { sel.innerHTML = opts.map((o) => `<option value="${o.id}" ${o.id === val ? "selected" : ""}>${esc(o.name)}${o.flight ? ` (${o.flight.grade}, ${o.flight.score} pts)` : ""}</option>`).join(""); };
  aId = aId || "current"; bId = bId || (list.find((x) => x.id !== aId) || { id: "current" }).id;
  fill($("#cmpA"), aId); fill($("#cmpB"), bId);
  $("#cmpA").onchange = () => openCompare($("#cmpA").value, $("#cmpB").value);
  $("#cmpB").onchange = () => openCompare($("#cmpA").value, $("#cmpB").value);
  $("#cmpMission").textContent = scen().name.toUpperCase();
  $("#compare").classList.remove("hidden");
  const pick = (id) => (id === "current" ? { name: "Current design", design: S.design } : drawer.get(id));
  const A = pick(aId), B = pick(bId);
  $("#cmpMsg").textContent = list.length ? "" : "The drawer is empty: save this design, change it, then compare.";
  $("#cmpDel").disabled = bId === "current"; $("#cmpLoadA").disabled = $("#cmpLoadB").disabled = S.mode === "team";
  $("#cmpSave").onclick = () => { const e = saveCurrentDesign(); if (e) openCompare(aId === "current" ? e.id : aId, "current"); };
  $("#cmpLoadA").onclick = () => loadDesign(A.design); $("#cmpLoadB").onclick = () => loadDesign(B.design);
  $("#cmpDel").onclick = () => { if (confirm(`Delete "${B.name}" from the drawer?`)) { drawer.remove(bId); openCompare(aId === bId ? "current" : aId); } };
  $("#cmpClose").onclick = () => $("#compare").classList.add("hidden");
  $("#cmpBody").innerHTML = `<p class="req-small">Running both designs through the review board...</p>`; $("#cmpVerdict").textContent = "";
  const token = (openCompare.token = (openCompare.token || 0) + 1);
  const [ea, eb] = await Promise.all([api("evaluate", { design: A.design }), api("evaluate", { design: B.design })]);
  if (token !== openCompare.token) return;
  const draw = (ra, rb) => {
    const better = (va, vb, dir) => (va === vb || va == null || vb == null ? [0, 0] : (dir === "low" ? va < vb : va > vb) ? [1, 0] : [0, 1]);
    const rowsDef = ea.kind === "program" ? PROG_CMP_ROWS : CMP_ROWS;
    const num = rowsDef.map(([label, get, dir, f]) => [label, get(ea), get(eb), dir, f]);
    if (ra && rb) num.push(["Success odds (200 flights)", ra.success_rate, rb.success_rate, "high", pct],
      ["Typical science", ra.science_median, rb.science_median, "high", (v) => fmt(v)]);
    const flight = (x) => (x.flight ? `${x.flight.grade} · ${x.flight.score} pts` : "not flown");
    const fields = [...tabs().flatMap((t) => t.fields), "years"];
    const partName2 = (d, f) => f === "manifest" ? (d.manifest || []).map((x) => `${S.cat.PAYLOADS[x.p].name.split(" (")[0]} (${x.lv ? S.cat.LAUNCH_VEHICLES[x.lv].name.split(" (")[0] : "?"}, slot ${x.slot + 1})`).join("; ") || "-" : f === "years" ? `${d.years} yr` : f === "rtg" ? `${d.rtg || 0}` : MULTI.has(f)
      ? ((d[f] || []).length ? d[f].map((k) => partName(f, k)).join(", ") : "-") : d[f] ? partName(f, d[f]) : "-";
    $("#cmpBody").innerHTML = `<table class="cmp"><tr><th></th><th class="cmp-a">A: ${esc(A.name)}</th><th class="cmp-b">B: ${esc(B.name)}</th></tr>
      ${num.map(([label, va, vb, dir, f]) => { const [wa, wb] = better(va, vb, dir);
        return `<tr><td>${label}</td><td class="${wa ? "win" : ""}">${f(va, ea)}</td><td class="${wb ? "win" : ""}">${f(vb, eb)}</td></tr>`; }).join("")}
      <tr><td>Last flight</td><td>${flight(A)}</td><td>${flight(B)}</td></tr>
      <tr class="sep"><td colspan="3">Parts</td></tr>
      ${fields.map((f) => { const pa = partName2(ea.design, f), pb = partName2(eb.design, f);
        return `<tr class="${pa !== pb ? "diff" : ""}"><td>${f === "rtg" ? "RTGs" : f === "years" ? "Science phase" : fieldLabel(f)}</td><td>${esc(pa)}</td><td>${esc(pb)}</td></tr>`; }).join("")}
      </table>`;
    // plain-language verdict: there is rarely one perfect answer
    const V = [], ba = ea.issues.find((i) => i.severity === "blocker"), bb = eb.issues.find((i) => i.severity === "blocker");
    if (ba) V.push(`A can't launch yet: ${ba.text}`);
    if (bb) V.push(`B can't launch yet: ${bb.text}`);
    const dc = ea.cost.total - eb.cost.total, ds = ea.science.score - eb.science.score;
    if (Math.abs(dc) >= 1) V.push(`${dc < 0 ? "A" : "B"} is ${fmt(Math.abs(dc))} M$ cheaper.`);
    if (Math.abs(ds) >= 1) V.push(`${ds > 0 ? "A" : "B"} plans ${fmt(Math.abs(ds))} more science points.`);
    if (ra && rb && Math.abs(ra.success_rate - rb.success_rate) >= 0.02) V.push(`${ra.success_rate > rb.success_rate ? "A" : "B"} survives more often (${pct(Math.max(ra.success_rate, rb.success_rate))} vs ${pct(Math.min(ra.success_rate, rb.success_rate))}).`);
    if (!ba && !bb && dc * ds > 0) V.push("Neither is simply better: you are trading money for science.");
    if (!V.length) V.push("These two designs are practically the same.");
    $("#cmpVerdict").innerHTML = V.map((x) => `<span>${esc(x)}</span>`).join(" ");
  };
  draw(null, null);
  if (ea.ok && eb.ok) {
    const [ra, rb] = await Promise.all([api("risk", { design: A.design }), api("risk", { design: B.design })]);
    if (token === openCompare.token) draw(ra, rb);
  }
}
function loadDesign(design) {
  if (S.mode === "team") return toast("Loading is disabled in team rooms.");
  $("#compare").classList.add("hidden");
  startMission(design.scenario, { ...design, instruments: [...design.instruments] });
  toast("Design loaded onto the desk.");
}

// ---------------------------------------------------------------------------- engineer's handbook (hints per stage)
function soundLabel() { $("#mSound").textContent = `Sound: ${store.get("sound", true) ? "on" : "off"}`; }
const STAGE_AREAS = { launch: ["launch"], orbit: ["schedule"], bus: ["bus"], power: ["power"], adcs: ["adcs"],
  prop: ["propulsion"], edl: ["edl"], partners: ["partners"], comms: ["comms"], computer: ["radiation"], instr: ["science"], review: ["cost"] };
const STAGES = () => [...tabs(), { id: "review", label: "Review & launch", icon: "check", fields: [],
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
    const name = f === "manifest" ? (v.length ? `${v.length} flight(s)` : null) : MULTI.has(f) ? (v.length ? v.map((k) => partName(f, k)).join(", ") : null) : v ? partName(f, v) : null;
    return `<div class="line">${icon(name ? "check" : "none", 14)}<span>${fieldLabel(f)}: ${name ? esc(name) : "<i>not chosen yet</i>"}</span></div>`;
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
        const fit = Object.values(c.LAUNCH_VEHICLES).filter((v) => v.capacity[tgt] * energy() >= wet * 1.15).sort((a, b) => a.cost - b.cost);
        if (energy() !== 1) T.push(`Your launch window changes what every rocket can lift by ${Math.round((energy() - 1) * 100)}%.`);
        T.push(`Fully fuelled, your spacecraft weighs about <b>${fmt(wet)} kg</b> (parts chosen so far).`);
        T.push(fit.length ? `Rockets that lift it to ${c.LV_TARGET_LABEL[tgt]} with 15% margin, cheapest first: ${names(fit.map((v) => `${v.name} (${v.cost} M$)`))}.`
          : "No rocket can lift it with margin. Cut mass: smaller bus, fewer instruments, or a more efficient engine (less fuel).");
      }
      T.push("Launch is often 20-40% of a mission's cost: the cheapest rocket that fits is usually the right one.");
      const ws = Object.values(optionsFor("window"));
      if (ws.length) T.push(`Launch dates: ${names(ws.map((w) => `${w.label}: ${w.build_months} months to build, rocket ${Math.round((w.energy - 1) * 100)}%, risk x${w.risk_mult}`))}.`);
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
      const sunF = 1 / dest.sun_au ** 2, deg = (1 - (DEGRADE[destKey()] || 0.02)) ** life;
      T.push(`Sunlight here is <b>${pct(sunF)}</b> of Earth's and panels lose ~${Math.round((DEGRADE[destKey()] || 0.02) * 100)}% per year (${pct(deg)} left at end of mission).`);
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
    case "edl": {
      if (kindNow() === "sample_return") {
        T.push("The capsule is a separate stage: it adds mass, and the trip home needs extra Δv from your engine.");
        T.push(`Options: ${names(Object.values(optionsFor("edl")).map((x) => `${x.name}: ${x.mass_fixed} kg, sample x${x.sample_mult}, ${x.cost} M$`))}.`);
        T.push("A backup parachute cuts the chance of losing the sample in the last minute.");
        break;
      }
      T.push(dest.atmosphere ? "This world has air: parachutes, airbags and a sky crane all work." : "No air here: parachutes and airbags are useless. Only rocket engines can slow you down.");
      if (ev && ev.edl.landed) T.push(`Your landed mass is <b>${fmt(ev.edl.landed)} kg</b>. Airbags handle up to 600 kg, a sky crane up to 1,200 kg.`);
      if (orb) T.push(`This site's base landing risk is <b>${pct(orb.landing_risk)}</b>. Hazard avoidance multiplies it by 0.45, a sky crane by 0.5.`);
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
      T.push("Score (max 950): science 500, budget left 150 (full at 25% reserve), margins 100 (mass 10-40%, power 20-100%), reliability 100, team goals 100.");
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
  { el: ".col-mid", tab: "launch", pos: LEFTBOX, done: () => S.design.launch_vehicle && S.design.window, text: () =>
    "Pick a launch date first: a close date leaves little time to build and test, a far one means waiting. " +
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

// ---------------------------------------------------------------------------- flight dashboard (resources during the flight)
const DASH = [
  { k: "power", label: "POWER", ic: "bolt" }, { k: "battery", label: "BATTERY", ic: "battery" },
  { k: "fuel", label: "FUEL", ic: "nozzle" }, { k: "data", label: "DATA HOME", ic: "disk" },
  { k: "budget", label: "RESERVE", ic: "coin" }, { k: "science", label: "SCIENCE", ic: "star" },
];
const fmtGb = (gb) => (gb >= 1000 ? `${fmt(gb / 1000, 1)} Tb` : `${fmt(gb)} Gb`);
const DASH_PROGRAM = [
  { k: "power", label: "POWER", ic: "bolt" }, { k: "supplies", label: "SUPPLIES", ic: "battery" },
  { k: "crew", label: "CREW ABOARD", ic: "person" }, { k: "modules", label: "ASSEMBLED", ic: "bus" },
  { k: "budget", label: "RESERVE", ic: "coin" }, { k: "science", label: "GOALS", ic: "star" },
];
const DASH_VEHICLE = [
  { k: "flights", label: "FLIGHTS", ic: "rocket" }, { k: "seats", label: "SEATS FLOWN", ic: "person" },
  { k: "safety", label: "SAFETY GOAL", ic: "chute" }, { k: "fleet", label: "FLEET", ic: "capsule" },
  { k: "budget", label: "RESERVE", ic: "coin" }, { k: "science", label: "GOALS", ic: "star" },
];
function dashValues(res, e) {
  const ev = res.evaluation, sim = res.sim, rs = sim.reserve_start || 0;
  if (sim.vehicle) {
    const v = (f, text, st) => ({ f: Math.max(0, Math.min(1, f)), text, st }), V = ev.vehicle, need = ev.scenario.vehicle.seats_needed;
    e = e || { flights_done: 0, seats_flown: 0, reserve: rs, science_fraction: 0, alive: true };
    return {
      flights: v(e.flights_done / V.flights, `${e.flights_done} / ${V.flights}`, ""),
      seats: v(e.seats_flown / need, `${e.seats_flown} / ${need}`, ""),
      safety: v(e.alive === false ? 0 : Math.min(1, V.one_in / 270), e.alive === false ? "crew lost" : `1 in ${fmt(V.one_in)}`, e.alive === false ? "bad" : V.one_in < 270 ? "warn" : ""),
      fleet: v(1, `${V.vehicles} built, ${V.reusable ? `up to ${V.per_vehicle} flights each` : "single use"}`, ""),
      budget: v(rs > 0 ? e.reserve / rs : 0, `${fmt(e.reserve)} M$`, e.reserve < 0 ? "bad" : ""),
      science: v(e.science_fraction, pct(e.science_fraction), ""),
    };
  }
  if (sim.program) {
    const v = (f, text, st) => ({ f: Math.max(0, Math.min(1, f)), text, st });
    e = e || { power_margin: 1, stock_kg: 0, crew: 0, beds: 0, assembled: 0, reserve: rs, science_fraction: 0 };
    const pm = e.power_margin, eat = Math.max(1, e.crew) * S.cat.SUPPLY_KG_PER_CREW_MONTH, months = e.stock_kg / eat;
    return {
      power: v((pm + 0.25) / 1.25, `${pm >= 0 ? "+" : ""}${pct(pm)} margin`, pm < 0 ? "bad" : pm < 0.15 ? "warn" : ""),
      supplies: v(months / 6, `${fmt(e.stock_kg / 1000, 1)} t (${fmt(months, 1)} mo)`, e.crew && months < 1 ? "bad" : e.crew && months < 2 ? "warn" : ""),
      crew: v(e.beds ? e.crew / e.beds : 0, `${e.crew} / ${e.beds} bunks`, ""),
      modules: v(e.assembled, pct(e.assembled), ""),
      budget: v(rs > 0 ? e.reserve / rs : 0, `${fmt(e.reserve)} M$`, e.reserve < 0 ? "bad" : rs > 0 && e.reserve < rs * 0.5 ? "warn" : ""),
      science: v(e.science_fraction, pct(e.science_fraction), ""),
    };
  }
  const battNeed = ev.power.battery_usable_wh ? ev.power.eclipse_need_wh / ev.power.battery_usable_wh : 0;
  const v = (f, text, st) => ({ f: Math.max(0, Math.min(1, f)), text, st });
  if (!e) e = { power_margin: ev.power.margin, battery_pct: 1, fuel_pct: ev.mass.propellant > 0 ? 1 : null, data_gb: 0,
    reserve: rs, science_fraction: 0 };
  const pm = e.power_margin;
  return {
    power: v((pm + 0.25) / 1.25, `${pm >= 0 ? "+" : ""}${pct(pm)} margin`, pm < 0 ? "bad" : pm < 0.15 ? "warn" : ""),
    battery: v(e.battery_pct, `${pct(e.battery_pct)} health`, e.battery_pct < battNeed ? "bad" : e.battery_pct < 0.9 ? "warn" : ""),
    fuel: e.fuel_pct == null ? v(0, "no tanks", "off") : v(e.fuel_pct, `${pct(e.fuel_pct)} left`, e.fuel_pct < 0.05 ? "bad" : e.fuel_pct < 0.15 ? "warn" : ""),
    data: v(sim.data_planned_gb ? e.data_gb / sim.data_planned_gb : 0, fmtGb(e.data_gb), ""),
    budget: v(rs > 0 ? e.reserve / rs : 0, `${fmt(e.reserve)} M$`, e.reserve < 0 ? "bad" : rs > 0 && e.reserve < rs * 0.5 ? "warn" : ""),
    science: v(e.science_fraction, pct(e.science_fraction), ""),
  };
}
function renderDash(res, mi, stage) {
  const box = $("#flightDash"), sim = res.sim, tl = sim.timeline, e = mi != null ? tl[mi] : null;
  const vals = dashValues(res, e), prev = renderDash._prev || {};
  const lostAtLaunch = sim.events.some((x) => x.kind === "launch_failure");
  const clock = stage || (e ? `MONTH ${e.month} / ${sim.months_planned} · ${e.phase.toUpperCase()}` : "");
  const evs = e ? sim.events.filter((x) => x.month <= e.month && !["launch"].includes(x.kind)) : [];
  const last = lostAtLaunch && stage !== "COUNTDOWN" ? sim.events[0] : evs[evs.length - 1];
  const status = last ? `<span class="${last.impact}">M${String(last.month).padStart(2, "0")} ${esc(last.text)}</span>`
    : `<span>${stage === "COUNTDOWN" ? "All stations: go for launch." : "All systems nominal."}</span>`;
  box.innerHTML = `<div class="fd-head"><span>${icon("dish", 14)} MISSION CONTROL &middot; RESOURCES</span><span>${clock}</span></div>
    <div class="fd-grid">${(sim.vehicle ? DASH_VEHICLE : sim.program ? DASH_PROGRAM : DASH).map((g) => {
      const x = vals[g.k], lit = Math.round(x.f * 20), hit = prev[g.k] != null && x.f < prev[g.k] - 0.03 && g.k !== "fuel";
      return `<div class="fd-g ${x.st} ${hit ? "hit" : ""}"><div class="fd-l">${icon(g.ic, 14)}${g.label}</div>
        <div class="leds">${Array.from({ length: 20 }, (_, i) => `<i class="${i < lit ? "on" : ""}"></i>`).join("")}</div>
        <div class="fd-v">${x.text}</div></div>`;
    }).join("")}</div>
    <div class="fd-status">${status}</div>
    <div class="fd-chart"><canvas id="fdChart" width="780" height="44"></canvas>
      <div class="fd-key"><b style="color:#6cc24a">science</b> <b style="color:#58b7c9">${sim.program ? "supplies" : "data home"}</b> <b style="color:#e0a83a">power margin</b> <b style="color:#d8aa45">reserve</b></div></div>`;
  const cv = $("#fdChart"), g = cv.getContext("2d"), W = cv.width, H = cv.height, n = Math.max(1, sim.months_planned);
  g.fillStyle = "#141613"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#2b2e28"; for (let m = 0; m <= n; m += 12) g.fillRect(Math.round(m / n * (W - 1)), 0, 1, H);
  const upto = mi == null ? -1 : mi, rs = sim.reserve_start || 1, dp = sim.data_planned_gb || 1;
  [["science_fraction", "#6cc24a", (x) => x], sim.program ? ["stock_kg", "#58b7c9", (x) => x / 8000] : ["data_gb", "#58b7c9", (x) => x / dp], ["power_margin", "#e0a83a", (x) => (x + 0.25) / 1.25],
    ["reserve", "#d8aa45", (x) => x / rs]].forEach(([k, col, f]) => {
    g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= upto; i++) {
      const x = tl[i].month / n * (W - 1), y = H - 2 - Math.max(0, Math.min(1, f(tl[i][k]))) * (H - 4);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  });
  sim.events.filter((x) => x.impact === "bad" || x.impact === "fatal").forEach((x) => {
    if (mi != null && x.month <= tl[upto].month) { g.fillStyle = x.impact === "fatal" ? "#e0533f" : "#f0c46a"; g.fillRect(Math.round(x.month / n * (W - 1)) - 1, 0, 3, 5); }
  });
  renderDash._prev = Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, x.f]));
}

// ---------------------------------------------------------------------------- launch sequence
let _launchStop = null;
// Launch film: countdown on the pad, liftoff with steam clouds and camera shake, climb into black sky,
// booster separation, fairing opens and the spacecraft unfolds, transfer to the destination, then orbit.
// The mission-control teletype runs alongside.
const LT = { lift: 3.2, space: 8.6, transfer: 11.6, orbit: 14.6 };
function playLaunch(res, skipTo = 0) {
  stopPoll();
  S.result = res;
  show("launch");
  const cv = $("#launchCanvas"), g = cv.getContext("2d"), W = 320, H = 180;
  g.imageSmoothingEnabled = false;
  const tt = $("#teletype"); tt.innerHTML = "";
  renderDash._prev = null; renderDash(res, null, "COUNTDOWN");
  let dashKey = "";
  const d = res.design, dest = destKeyOf(d), atEarth = dest === "earth", isProg = !!res.sim.program;
  const lv = isProg ? ((res.evaluation.program.flights.find((f) => f.lv) || {}).lv || "falcon9") : d.launch_vehicle;
  const isVeh = !!res.sim.vehicle, landed = res.sim.boosters_recovered && Object.keys(res.sim.boosters_recovered).length > 0;
  const failAtLaunch = !isProg && res.sim.events.some((e) => e.kind === "launch_failure");
  const pImg = new Image(); pImg.src = planet(PLANET_OF[dest], 64);
  const eImg = new Image(); eImg.src = planet("earth", 32);
  const starCv = document.createElement("canvas"); starCv.width = W; starCv.height = H; stars(starCv, 160, res.seed);
  const limbCv = document.createElement("canvas"); limbCv.width = W; limbCv.height = H;
  earthLimb(limbCv.getContext("2d"), W, H, H + 250, 300, res.seed);
  const clouds = [], trail = [], debris = [];
  const lines = buildTeletype(res);
  const cruise = (S.cat.ORBITS[dest][d.orbit] || {}).cruise_years || 0;
  let li = 0, nextLine = 3.2, done = false, t0 = performance.now() - skipTo * 1000, rumbled = false, sepSound = false, deploySound = false;
  const add = (l) => {
    SFX.tick();
    const div = document.createElement("div"); div.className = `ln ${l.cls || ""}`; div.textContent = l.text; tt.appendChild(div);
    while (tt.children.length > 26) tt.removeChild(tt.firstChild);
  };
  const text = (s, x, y, size = 10, col = "#f4efe2", align = "left") => {
    g.font = `${size}px Silkscreen, monospace`; g.textAlign = align;
    g.fillStyle = "#000"; g.fillText(s, x + 1, y + 1); g.fillStyle = col; g.fillText(s, x, y); g.textAlign = "left";
  };
  const lerp = (a, b, f) => a + (b - a) * f;
  const mix = (c1, c2, f) => `rgb(${c1.map((v, i) => Math.round(lerp(v, c2[i], f))).join(",")})`;

  function rocketPhase(t) {
    const rise = Math.max(0, t - LT.lift);
    const climb = (failAtLaunch ? Math.min(rise, 1.6) : rise) ** 2 * 16;
    const cam = Math.max(0, climb - 46), gy = 150 + cam;
    const shake = rise > 0 && rise < 3 && !failAtLaunch ? Math.round((Math.random() - .5) * 3 * (3 - rise) / 3) : 0;
    g.save(); g.translate(shake, Math.round((Math.random() - .5) * Math.abs(shake)));
    // sky: dawn bands fading into black as we climb
    const dark = Math.min(1, cam / 260);
    const bands = [[24, 32, 74], [52, 62, 120], [120, 100, 140], [214, 128, 92], [240, 180, 110]];
    for (let y = 0; y < H; y += 4) {
      const f = Math.min(bands.length - 1.001, (y + cam * 0.4) / H * (bands.length - 1)), i = Math.floor(f);
      const c = bands[i].map((v, k) => lerp(v, bands[i + 1][k], f - i));
      g.fillStyle = mix(c, [6, 6, 12], dark); g.fillRect(-4, y, W + 8, 4);
    }
    if (dark > 0.2) { g.globalAlpha = dark; g.drawImage(starCv, 0, 0); g.globalAlpha = 1; }
    const armOut = t < LT.lift - 1.2 ? 1 : Math.max(0, (LT.lift - 0.2 - t) / 1.0);               // arms swing away just before ignition
    if (gy < H + 90) drawPad(g, W, gy, armOut, Math.floor(t * 2) % 2 === 0, lv, rise <= 0.05);
    // steam venting before liftoff, huge clouds at liftoff
    if (t < LT.lift && Math.random() < 0.3) clouds.push({ x: 160 + (Math.random() - .5) * 8, wy: -20 - Math.random() * 20, vx: (Math.random() - .5) * 6, vy: -3, s: 2, a: 0.6 });
    if (rise > 0 && rise < 3.5 && !failAtLaunch) for (let k = 0; k < 4; k++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      clouds.push({ x: 160 + dir * 8, wy: 2, vx: dir * (30 + Math.random() * 50), vy: -4 - Math.random() * 10, s: 3 + Math.random() * 4, a: 0.95 });
    }
    const boom = failAtLaunch && rise > 1.6;
    const ry = 150 - 4 - (LV_SHAPE[lv] || LV_SHAPE.falcon9).h - climb + cam;
    if (!boom) {
      const bot = drawLV(g, lv, 160, ry, { fire: rise > 0, boosters: rise < 4.4, flicker: Math.random() });
      if (rise > 0.2) trail.push({ x: 160 + (Math.random() - .5) * 3, wy: bot - cam - 150 + 12, a: 0.7 });
    }
    if (rise >= 4.4 && LV_SHAPE[lv] && LV_SHAPE[lv].boosters) {           // spent boosters tumble away
      if (!sepSound) { sepSound = true; SFX.beep(false); }
      const e = rise - 4.4, S2 = LV_SHAPE[lv];
      g.fillStyle = S2.bcol;
      g.fillRect(160 - S2.w - 6 - e * 14, ry + S2.h - (S2.bh || 18) + e * e * 30, S2.bw || 3, S2.bh || 18);
      g.fillRect(160 + S2.w + 3 + e * 14, ry + S2.h - (S2.bh || 18) + e * e * 30, S2.bw || 3, S2.bh || 18);
    }
    if (boom) {
      if (!debris.length) for (let k = 0; k < 70; k++) debris.push({ x: 160, y: ry + 20, vx: (Math.random() - .5) * 90, vy: (Math.random() - .8) * 70, c: ["#ffd96b", "#ff9a3c", "#b3372d", "#5b534b"][k % 4] });
      debris.forEach((p) => { p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 0.8; g.fillStyle = p.c; g.fillRect(p.x, p.y, 3, 3); });
      if (rise < 2.1) { g.fillStyle = `rgba(255,240,200,${(2.1 - rise) * 1.4})`; g.fillRect(-4, -4, W + 8, H + 8); }
    }
    trail.forEach((p) => { p.a -= 0.006; p.x += (Math.random() - .5) * .4; g.fillStyle = `rgba(220,215,205,${Math.max(0, p.a)})`; g.fillRect(p.x - 1, p.wy + cam + 150 - 12, 3, 3); });
    clouds.forEach((p) => {
      p.x += p.vx / 60; p.wy += p.vy / 60; p.vx *= 0.985; p.s += 0.05; p.a -= 0.003;
      const y = p.wy + gy, s = Math.round(p.s);
      g.fillStyle = `rgba(233,229,220,${Math.max(0, p.a)})`; g.fillRect(p.x - s, y - s / 2, s * 2, s); g.fillRect(p.x - s / 2, y - s, s, s * 2);
      g.fillStyle = `rgba(160,155,150,${Math.max(0, p.a * 0.6)})`; g.fillRect(p.x - s, y + s - 1, s * 2, 1);
    });
    while (clouds.length > 500) clouds.shift();
    while (trail.length > 300) trail.shift();
    g.restore();
    // overlay text
    if (t < LT.lift) {
      const n = Math.ceil(LT.lift - t);
      text(`T-${n}`, W / 2, 50, 24, "#ffd96b", "center");
      text(`${S.cat.LAUNCH_VEHICLES[lv].name.toUpperCase()}`, 8, H - 8, 8, "#e9e3d6");
    } else if (rise < 1.4 && !failAtLaunch) text("LIFTOFF", W / 2, 50, 20, "#f4efe2", "center");
    else if (boom && rise < 4) text("VEHICLE LOST", W / 2, 50, 18, "#ff6b5b", "center");
    else if (rise > 4.3 && rise < 5.3 && LV_SHAPE[lv] && LV_SHAPE[lv].boosters) text("BOOSTER SEPARATION", W / 2, 30, 10, "#9cc0ea", "center");
    else if (landed && rise > 3.6 && rise < 5.4) {                          // reusable first stage flies home and lands
      const f = (rise - 3.6) / 1.8, bx = 40 + f * 10, by = 30 + f * 112;
      g.fillStyle = "#2b3a67"; g.fillRect(14, 150, 70, 6); g.fillStyle = "#e8cf52"; g.fillRect(44, 149, 10, 1);
      g.fillStyle = "#f4efe2"; g.fillRect(bx - 2, by - 22, 4, 22); g.fillStyle = "#1d1a17"; g.fillRect(bx - 2, by - 14, 4, 2);
      if (f < 0.97) flame(g, bx, by, Math.random(), 0.6); else { g.fillStyle = "#7d7d7d"; g.fillRect(bx - 4, by - 1, 2, 2); g.fillRect(bx + 2, by - 1, 2, 2); }
      text(f < 0.97 ? "FIRST STAGE RETURNING" : "FIRST STAGE LANDED", W / 2, 30, 10, "#8fe07a", "center");
    }
    else if (rise > 1.5) text(`ALT ${Math.round(climb * 0.35)} KM`, 8, 16, 8, "#9cc0ea");
  }

  function deployPhase(t) {
    const e = (t - LT.space) / (LT.transfer - LT.space);
    g.drawImage(starCv, 0, 0);
    g.drawImage(limbCv, 0, 30 - e * 20);
    const x = 150 + e * 30, y = 80 - e * 10;
    // upper stage below, fairing halves drift apart, spacecraft unfolds
    const sep = Math.min(1, Math.max(0, (e - 0.15) * 3));
    g.fillStyle = "#e9e3d6"; g.fillRect(x - 3, y + 8 + sep * 22, 6, 16); g.fillStyle = "#4b4b4b"; g.fillRect(x - 3, y + 24 + sep * 22, 6, 2);
    if (sep < 1 || e < 0.6) {
      g.fillStyle = "#f4efe2";
      g.fillRect(x - 5 - e * 40, y - 6 + e * 18, 4, 14); g.fillRect(x + 1 + e * 40, y - 6 + e * 18, 4, 14);
    }
    const unfold = Math.min(1, Math.max(0, (e - 0.45) * 2.5));
    if (unfold > 0 && !deploySound) { deploySound = true; SFX.click(); }
    const craft = { ...d, solar: unfold < 1 ? (unfold > 0.5 ? "small" : "body") : d.solar };
    g.save(); g.translate(x, y); g.scale(2, 2); drawCraft(g, 0, 0, craft); g.restore();
    text(e < 0.45 ? "FAIRING SEPARATION" : unfold < 1 ? "SOLAR ARRAYS DEPLOYING" : "SPACECRAFT HEALTHY", W / 2, 22, 10, "#9cc0ea", "center");
  }

  function transferPhase(t) {
    const e = Math.min(1, (t - LT.transfer) / (LT.orbit - LT.transfer));
    g.drawImage(starCv, 0, 0);
    const sx = 160, sy = 100;
    g.fillStyle = "#d9792b"; g.fillRect(sx - 9, sy - 1, 18, 2); g.fillRect(sx - 1, sy - 9, 2, 18);
    g.fillStyle = "#ffd96b"; g.fillRect(sx - 5, sy - 5, 10, 10); g.fillStyle = "#fff6c8"; g.fillRect(sx - 3, sy - 3, 6, 6);
    const ex = 70, ey = 120, px = 270, py = 60;
    for (let k = 0; k <= 40; k++) {                                       // transfer arc (half an ellipse)
      const f = k / 40, ax = lerp(ex, px, f), ay = lerp(ey, py, f) - Math.sin(f * Math.PI) * 50;
      if (k % 2 === 0) { g.fillStyle = f < e ? "#e8cf52" : "#5b5b70"; g.fillRect(ax, ay, 1, 1); }
    }
    g.drawImage(eImg, ex - 16, ey - 16);
    g.drawImage(pImg, px - 16, py - 16, 32, 32);
    const cx = lerp(ex, px, e), cy = lerp(ey, py, e) - Math.sin(e * Math.PI) * 50;
    drawCraft(g, cx, cy, d);
    text(`CRUISE TO ${S.cat.DESTINATIONS[dest].name.toUpperCase()}`, 8, 16, 8, "#9cc0ea");
    text(`${(cruise * e).toFixed(1)} / ${cruise} YR`, 8, 28, 8, "#e9e3d6");
  }

  function orbitPhase(t) {
    g.drawImage(starCv, 0, 0);
    const ang = t * 0.8, sx = 230 + Math.cos(ang) * 75, sy = 92 + Math.sin(ang) * 22, behind = Math.sin(ang) < 0;
    if (behind) drawCraft(g, sx, sy, d);
    g.drawImage(pImg, 180, 42, 100, 100);
    if (!behind) drawCraft(g, sx, sy, d);
    const tl = res.sim.timeline, mi = Math.min(tl.length - 1, Math.floor((li / Math.max(1, lines.length)) * tl.length));
    if (tl[mi]) {
      text(`MONTH ${tl[mi].month}  ${tl[mi].phase.toUpperCase()}`, 8, 16, 8, "#9cc0ea");
      text(`SCIENCE ${pct(tl[mi].science_fraction)}`, 8, 28, 8, "#e9e3d6");
      g.fillStyle = "#2e2925"; g.fillRect(8, 34, 80, 4); g.fillStyle = "#5d8a3c"; g.fillRect(8, 34, 80 * tl[mi].science_fraction, 4);
    }
    if (tl[mi] && Math.floor(t * 3) % 3 === 0) { g.fillStyle = "#58b7c9"; g.fillRect(sx - 8, sy - 6, 1, 1); g.fillRect(sx - 11, sy - 8, 1, 1); } // downlink sparkle
  }


  // Lander / rover: descent under a parachute or on engines, touchdown, then life on the surface.
  const kindL = S.cat.SCENARIOS[d.scenario].kind || "orbiter", surfaceMission = kindL === "lander" || kindL === "rover";
  const crashed = res.sim.events.some((e) => e.kind === "landing_failure");
  const isMars = dest === "mars_surface", gyS = 140;
  const groundCv = document.createElement("canvas"); groundCv.width = W; groundCv.height = H;
  if (surfaceMission || (isProg && dest.endsWith("_surface"))) {
    const gg = groundCv.getContext("2d"), rnd = _rng(res.seed);
    if (isMars) for (let y = 0; y < gyS; y++) { gg.fillStyle = mix([196, 140, 92], [233, 196, 140], y / gyS); gg.fillRect(0, y, W, 1); }
    else gg.drawImage(starCv, 0, 0);
    for (let x = 0; x < W; x += 2) {                                         // distant hills / crater rims
      const h = 10 + Math.sin(x / 31 + res.seed) * 6 + Math.sin(x / 9) * 2;
      gg.fillStyle = isMars ? "#a9623a" : "#6f6c66"; gg.fillRect(x, gyS - h, 2, h);
    }
    gg.fillStyle = isMars ? "#b8703f" : "#8d8a84"; gg.fillRect(0, gyS, W, H - gyS);
    for (let i = 0; i < 70; i++) {                                           // rocks and craters
      const x = rnd() * W, y = gyS + 3 + rnd() * (H - gyS - 6), w = 1 + Math.floor(rnd() * 4);
      gg.fillStyle = isMars ? (rnd() > 0.5 ? "#7a3f22" : "#d08a55") : (rnd() > 0.5 ? "#5e5b55" : "#b9b6ae");
      gg.fillRect(x, y, w, Math.max(1, w - 1));
    }
  }
  const eSmall = new Image(); eSmall.src = planet("earth", 16);
  function drawSurfaceCraft(x0, y0, wheelsTurn) {
    g.save(); g.translate(Math.round(x0), Math.round(y0)); g.scale(2, 2);
    const x = 0, y = 0, r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };
    const s = { cubesat: 6, smallsat: 9, medium: 12, flagship: 15 }[d.bus] || 10;
    if (d.solar && !["none", "body"].includes(d.solar)) { r(x - s - 8, y - s / 2, 8, 2, "#3d6fa8"); r(x + s / 2 + 1, y - s / 2, 8, 2, "#3d6fa8"); }
    r(x - s / 2, y - s, s, s * 0.7, "#d8aa45"); r(x - s / 2, y - s, s, 1, "#f4e7b0");
    if (d.rtg) { r(x - s / 2 - 4, y - s * 0.7, 3, 6, "#5b534b"); r(x - s / 2 - 5, y - s * 0.6, 5, 1, "#7d7d7d"); }
    if (kindL === "rover") {
      r(x + s / 2 - 3, y - s - 9, 1, 9, "#9c9284"); r(x + s / 2 - 5, y - s - 11, 5, 3, "#e9e3d6");
      r(x - s / 2 - 4, y - 6, s + 8, 1, "#5b534b");                                       // rocker-bogie arms
      [-1, 0, 1].forEach((k) => { const wx = x + k * (s / 2 + 2); r(wx - 2, y - 4, 4, 4, "#2e2925"); r(wx - 1, y - 3, 2, 2, "#7d7d7d"); r(wx - 1 + (wheelsTurn % 2), y - 3, 1, 1, "#1d1a17"); r(wx, y - 6, 1, 2, "#5b534b"); });
    } else {
      r(x - s / 2 - 3, y - 4, 2, 4, "#9c9284"); r(x + s / 2 + 1, y - 4, 2, 4, "#9c9284"); r(x - s / 2 - 4, y, 4, 1, "#7d7d7d"); r(x + s / 2, y, 4, 1, "#7d7d7d");
      r(x - 1, y - s - 5, 1, 5, "#9c9284"); r(x - 3, y - s - 6, 5, 1, "#e9e3d6");
    }
    g.restore();
  }
  // Programs: the station or base grows as flights arrive; crews come and go.
  const place = isProg ? S.cat.SCENARIOS[d.scenario].program.place : null;
  function programPhase(t) {
    if (place === "station") { g.drawImage(starCv, 0, 0); g.drawImage(limbCv, 0, 40); }
    else { g.drawImage(groundCv, 0, 0); if (place === "moon" && eSmall.complete) g.drawImage(eSmall, 262, 18); }
    const tl = res.sim.timeline, mi = Math.min(tl.length - 1, Math.floor((li / Math.max(1, lines.length)) * tl.length));
    const e = tl[Math.max(0, mi)] || { modules: S.cat.SCENARIOS[d.scenario].program.existing, crew: 0, stock_kg: 0, month: 0 };
    const abs = res.evaluation.program.start + e.month - 1;
    drawOutpost(g, place, outpostState(e.modules, e.crew, res.evaluation.program.flights, abs), 160, place === "station" ? 80 : gyS - 12, place === "station" ? 1.5 : 2, "real", t * 10);
    text(`MONTH ${e.month}  CREW ${e.crew}`, 8, 16, 8, "#f4efe2");
    text(`SUPPLIES ${fmt((e.stock_kg || 0) / 1000, 1)} T`, 8, 28, 8, "#e9e3d6");
  }
  // Your crew vehicle flies to the space station again and again.
  function vehiclePhase(t) {
    g.drawImage(starCv, 0, 0); g.drawImage(limbCv, 0, 40);
    drawOutpost(g, "station", { modules: ["iss"], crew: 4 }, 200, 80, 1.3, "real");
    const k = ((t - LT.space) % 4) / 4, x = 20 + Math.min(1, k * 1.3) * 120, y = 70 + Math.sin(k * 3) * 4;
    drawVehicle(g, d, x, y, 1.2, "real");
    const tl = res.sim.timeline, mi = Math.min(tl.length - 1, Math.floor((li / Math.max(1, lines.length)) * tl.length)), e = tl[Math.max(0, mi)] || {};
    text(`FLIGHT ${e.flights_done || 0} / ${res.evaluation.vehicle.flights}`, 8, 16, 8, "#f4efe2");
    text(`SEATS ${e.seats_flown || 0} / ${S.cat.SCENARIOS[d.scenario].vehicle.seats_needed}`, 8, 28, 8, "#e9e3d6");
  }
  const tracks = [];
  function surfacePhase(t) {
    const e = t - LT.orbit, desc = 3.6;
    g.drawImage(groundCv, 0, 0);
    if (!isMars && eSmall.complete) g.drawImage(eSmall, 262, 18);
    const edl = d.edl, chute = isMars && edl !== "retro" && edl !== "hazard";
    if (e < desc) {
      const f = e / desc, x = 160, y = -10 + (gyS - (-10)) * (1 - (1 - f) ** 2);
      if (edl === "airbags" && f > 0.75) {                                    // bouncing airbag ball
        const b = (f - 0.75) / 0.25, by = gyS - 8 - Math.abs(Math.sin(b * Math.PI * 3)) * 20 * (1 - b);
        g.fillStyle = "#e8e4dc"; g.fillRect(x - 8 + b * 30, by - 8, 16, 16); g.fillStyle = "#b9b6ae"; g.fillRect(x - 8 + b * 30, by + 6, 16, 2);
      } else {
        if (chute && f < 0.7) {                                               // parachute
          g.fillStyle = "#f4efe2"; g.fillRect(x - 16, y - 58, 32, 6); g.fillStyle = "#b3372d"; g.fillRect(x - 16, y - 58, 10, 6); g.fillRect(x + 6, y - 58, 10, 6);
          g.fillStyle = "#b9b9b9"; for (let k = 0; k < 16; k++) { g.fillRect(x - 15 + k * 0.8, y - 52 + k * 2, 1, 1); g.fillRect(x + 15 - k * 0.8, y - 52 + k * 2, 1, 1); }
        }
        if (edl === "skycrane" && f > 0.6) {                                   // descent stage above, rover on cables
          g.fillStyle = "#7d7d7d"; g.fillRect(x - 14, y - 52, 28, 6); flame(g, x - 12, y - 46, Math.random(), 0.6); flame(g, x + 12, y - 46, Math.random(), 0.6);
          g.fillStyle = "#1d1a17"; g.fillRect(x - 6, y - 46, 1, 22); g.fillRect(x + 6, y - 46, 1, 22);
        } else if (!chute || f >= 0.7) flame(g, x, y, Math.random(), 0.6);
        drawSurfaceCraft(x, y, 0);
      }
      if (f > 0.8) for (let k = 0; k < 12; k++) {                             // dust kicked up
        g.fillStyle = isMars ? "rgba(214,160,110,.6)" : "rgba(200,198,190,.6)";
        g.fillRect(160 + (Math.random() - .5) * 80 * f, gyS - Math.random() * 10, 3, 2);
      }
      text(f < 0.7 && chute ? "PARACHUTE DEPLOYED" : edl === "skycrane" && f > 0.6 ? "SKY CRANE" : "POWERED DESCENT", W / 2, 22, 10, "#f4efe2", "center");
      return;
    }
    if (crashed) {
      const k = Math.min(1, (e - desc) / 1.5);
      for (let i = 0; i < 40; i++) { g.fillStyle = ["#ffd96b", "#ff9a3c", "#5b534b", "#b3372d"][i % 4]; g.fillRect(160 + Math.cos(i * 2.4) * k * 60 * ((i % 5) / 5 + .3), gyS - 4 + Math.sin(i * 2.4) * k * 25 - k * 10, 3, 3); }
      text("SIGNAL LOST", W / 2, 50, 18, "#ff6b5b", "center");
      return;
    }
    const drive = kindL === "rover" ? (e - desc) * 6 : 0;
    const rx = kindL === "rover" ? 60 + (drive % 200) : 160;
    if (kindL === "rover") { tracks.push(rx); while (tracks.length > 300) tracks.shift(); g.fillStyle = isMars ? "#8a4a28" : "#6f6c66"; tracks.forEach((tx) => { if (tx < rx) g.fillRect(tx, gyS + 1, 1, 1); }); }
    drawSurfaceCraft(rx, gyS, Math.floor(drive));
    if (Math.floor(t * 2) % 4 === 0) { g.fillStyle = "#58b7c9"; g.fillRect(rx + 8, gyS - 44, 2, 2); g.fillRect(rx + 13, gyS - 50, 2, 2); }
    const tl = res.sim.timeline, mi = Math.min(tl.length - 1, Math.floor((li / Math.max(1, lines.length)) * tl.length));
    if (tl[mi]) {
      text(`${isMars ? "SOL" : "DAY"} ${Math.round(tl[mi].month * (isMars ? 29.6 : 30.4))}  ${kindL.toUpperCase()}`, 8, 16, 8, "#f4efe2");
      text(`SCIENCE ${pct(tl[mi].science_fraction)}`, 8, 28, 8, "#e9e3d6");
      g.fillStyle = "#2e2925"; g.fillRect(8, 34, 80, 4); g.fillStyle = "#5d8a3c"; g.fillRect(8, 34, 80 * tl[mi].science_fraction, 4);
    }
  }

  function frame(now) {
    if (done) return;
    const t = (now - t0) / 1000;
    const sec = Math.floor(t);
    if (sec !== frame._sec && t < LT.lift) { frame._sec = sec; SFX.beep(false); }
    if (t >= LT.lift && !rumbled) { rumbled = true; SFX.beep(true); SFX.rumble(); }
    if (failAtLaunch && t - LT.lift > 1.6 && !frame._boom) { frame._boom = true; SFX.boom(); }
    if (failAtLaunch || t < LT.space) rocketPhase(t);
    else if (isProg) programPhase(t);
    else if (isVeh) vehiclePhase(t);
    else if (t < LT.transfer) deployPhase(t);
    else if (!atEarth && t < LT.orbit) transferPhase(t);
    else if (surfaceMission) surfacePhase(t);
    else orbitPhase(t);
    if (t > nextLine && li < lines.length) { const l = lines[li++]; add(l); nextLine = t + (l.pause || 0.12); }
    {
      const tl = res.sim.timeline, stage = t < LT.lift ? "COUNTDOWN" : t < LT.space && !tl.length ? "ASCENT" : null;
      const mi = tl.length && t >= LT.space ? Math.min(tl.length - 1, Math.floor((li / Math.max(1, lines.length)) * tl.length)) : null;
      const key = `${stage}|${mi}`;
      if (key !== dashKey) { dashKey = key; renderDash(res, mi, stage || (mi == null ? (failAtLaunch ? "VEHICLE LOST" : "ASCENT") : null)); }
    }
    if (li >= lines.length && t > nextLine + 1.2 && (failAtLaunch || t > (isProg || isVeh ? LT.space + 4 : atEarth ? LT.transfer : LT.orbit) + 2)) return finish();
    requestAnimationFrame(frame);
  }
  function finish() { if (done) return; done = true; showNews(res); }
  _launchStop = () => { if (!done) { lines.slice(li).forEach((l) => { const dv = document.createElement("div"); dv.className = `ln ${l.cls || ""}`; dv.textContent = l.text; tt.appendChild(dv); });
    if (res.sim.timeline.length) renderDash(res, res.sim.timeline.length - 1); finish(); } };
  requestAnimationFrame(frame);
}
function destKeyOf(design) { return S.cat.SCENARIOS[design.scenario].destination; }

function drawCraft(g, x, y, d) {
  const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };
  const s = { cubesat: 3, smallsat: 4, medium: 5, flagship: 6 }[d.bus], w = { none: 0, body: 0, small: 4, medium: 6, large: 8, giant: 11 }[d.solar];
  if (w) { r(x - s - w, y - 1, w, 3, "#3d6fa8"); r(x + s, y - 1, w, 3, "#3d6fa8"); }
  r(x - s / 2 - 1, y - s / 2, s + 1, s + 1, "#d8aa45");
}

function buildTeletype(res) {
  const L = [], sim = res.sim, ev = res.evaluation;
  L.push({ text: `MISSION CONTROL TELETYPE · SEED ${res.seed}`, cls: "month", pause: 0.4 });
  if (ev.schedule && ev.schedule.window) L.push({ text: `LAUNCH DATE ${ev.schedule.window.label.toUpperCase()}${res.sim.launch_delay ? ` + ${res.sim.launch_delay} MONTHS DELAY` : ""}`, pause: 0.5 });
  L.push({ text: `${ev.scenario.name.toUpperCase()} → ${ev.destination.name.toUpperCase()}`, pause: 0.6 });
  const byMonth = {};
  sim.events.forEach((e) => (byMonth[e.month] = byMonth[e.month] || []).push(e));
  (byMonth[0] || []).forEach((e) => L.push({ text: `M00 ${e.text}`, cls: e.impact, pause: 1.0 }));
  sim.timeline.forEach((t) => {
    const evs = byMonth[t.month] || [];
    evs.forEach((e) => L.push({ text: `M${String(t.month).padStart(2, "0")} ${e.text}`, cls: e.impact, pause: e.impact === "fatal" ? 1.6 : 0.9 }));
    if (!evs.length && t.month % 6 === 0)
      L.push({ text: `M${String(t.month).padStart(2, "0")} ${sim.vehicle ? `flights ${t.flights_done}, ${t.seats_flown} seats flown` : sim.program ? `crew ${t.crew}, supplies ${fmt(t.stock_kg / 1000, 1)} t` : t.phase === "cruise" ? "cruising, all systems nominal" : `science ${pct(t.science_fraction)} collected`}`, cls: "month", pause: 0.18 });
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
  // career: the agency learns from every flight
  const career = S.mode === "career" && agency() && res.sim.launched ? applyCareerResult(res) : null;
  if (res.sim.launched) drawer.add({ name: `Flight ${res.seed} · ${sc.grade}`, scenario: res.design.scenario, design: res.design,
    flight: { score: sc.total, grade: sc.grade, outcome: sim.outcome, seed: res.seed } });
  const labels = { science: "Science", budget: "Budget left", margins: "Margins", reliability: "Reliability", team: "Team goals" };
  const day = ORDER.indexOf(res.design.scenario) + 1;
  const c = CLIENTS[res.design.scenario];
  const lost = sim.events.some((e) => e.kind === "launch_failure") || sim.outcome === "lost";
  const tone = lost ? "lost" : (["cancelled", "partial"].includes(sim.outcome) || sc.grade === "F") ? "bad" : ["S", "A"].includes(sc.grade) ? "good" : "ok";
  const quote = `<div class="quote"><img class="px" src="${portrait(c.look, { good: "happy", ok: "neutral", bad: "angry", lost: "angry" }[tone])}" alt="">
    <p>"${esc(c.quotes[tone])}"<i>${esc(c.name)}, ${esc(c.org)}</i></p></div>`;
  const highlights = sim.events.filter((e) => e.impact !== "neutral" && !["launch", "end"].includes(e.kind)).slice(0, 2);
  $("#paper").innerHTML = `
    <div class="masthead">THE ORBITAL TIMES</div>
    <div class="dateline"><span>Vol. 1 · Day ${day}</span><span>${esc(S.cat.DIFFICULTY[res.design.difficulty].name)} edition</span><span>Seed ${res.seed}</span></div>
    <div class="headline">${esc(hl)}</div>
    <div class="subhead">${esc(sub)} The mission returned ${pct(sim.science_fraction)} of its planned science in ${sim.months_survived} of ${sim.months_planned} months.</div>
    <div class="grade-stamp" style="color:${GRADE_COL[sc.grade]};border-color:${GRADE_COL[sc.grade]}"><b>${sc.grade}</b><span>${sc.total} PTS</span></div>
    <div class="news-cols">
      <div>
        <canvas id="newsPhoto" width="240" height="75" class="px news-photo"></canvas>
        ${quote}
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
  const im = new Image(); im.onload = () => { g.imageSmoothingEnabled = false; g.drawImage(im, 150, 4, 68, 68); if (res.sim.vehicle) { drawOutpost(g, "station", { modules: ["iss"], crew: 4 }, 110, 38, 0.72); drawVehicle(g, res.design, 40, 38, 0.9); } else if (res.sim.program) { const ls = res.sim.timeline[res.sim.timeline.length - 1] || {}; drawOutpost(g, S.cat.SCENARIOS[res.design.scenario].program.place, outpostState(ls.modules || [], ls.crew || 0, res.evaluation.program.flights, null), 90, 38, S.cat.SCENARIOS[res.design.scenario].program.place === "station" ? 0.72 : 1); } else drawCraft(g, 90, 38, res.design); };
  im.src = planet(PLANET_OF[destKeyOf(res.design)], 48);
  animateNews(sc);
  const idx = ORDER.indexOf(res.design.scenario);
  const nextOk = false;
  $("#nNext").classList.toggle("hidden", S.mode === "team");
  $("#nNext").textContent = S.mode === "career" ? "Back to headquarters" : "Mission files";
  if (career) {
    const box = document.createElement("div"); box.className = "agency-report";
    box.innerHTML = `<b>AGENCY REPORT</b> Reputation ${career.rep} (${career.repGain >= 0 ? "+" : ""}${career.repGain}) &middot; funds ${fmt(career.funds)} M$
      (+${fmt(career.reward)} reward, +${fmt(career.savings)} unspent)${career.medals.length ? ` &middot; medal: ${esc(career.medals.join(", "))}` : ""}
      ${career.unlocked.length ? `<br>New contracts available: ${esc(career.unlocked.join(", "))}` : ""}`;
    $("#paper").appendChild(box);
  }
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
    if (S.mode === "career") openHQ();
    else openSelect();
  };
  $("#nHall").onclick = openHall;
  $("#nCompare").onclick = () => {
    const mine = drawer.of(S.result.design.scenario), cur = mine.find((x) => x.flight && x.flight.seed === S.result.seed);
    S.design = { ...S.result.design };
    openCompare(cur ? cur.id : "current", (mine.find((x) => x !== cur) || { id: "current" }).id);
  };
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
    S.mode = "team"; S.tab = tabs().find((t) => S.myRoles.includes(t.role)).id; S.introShown = true;
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

// CRT cricket. Pick a mode, read the delivery, line up with the ball's shadow, and time
// Space / tap on the meter as the ball reaches the bat.

// Timing windows in ms either side of the sweet spot, so every delivery speed is equally fair.
const ZONES = [[35, 6], [75, 4], [115, 2], [160, 1]];
const LATE_MS = 160; // sweet spot sits this long before the ball reaches the stumps
const METER_MS = [-450, LATE_MS]; // span shown on the timing meter
const REACH = 11; // how far (lateral units) the bat can be from the ball's line and still connect
const MAX_POS = 40;
const RUNUP = 0.75; // seconds of bowler run-up before release
const BAT_REST = 0.35, BAT_BACK = -2.2, BAT_FOLLOW = 2.5; // bat angles (0 = straight down)
const ROPE_RX = 0.62, ROPE_RY = 0.42; // boundary rope ellipse, as fractions of W / H
const FIRE_STREAK = 3; // boundaries in a row before "on fire" bonus kicks in
const FIRE_BONUS = 2;
const SITE = "https://nayanp11.github.io/Nayan-Patil-Portfolio/#cricket";
const TRICOLOUR = ["#FF9933", "#FFFFFF", "#138808"];

const MODES = [
  { id: "chase", name: "CHASE", desc: "2 overs · 3 wickets · chase the target", balls: 12, wkts: 3, target: (r) => 18 + Math.floor(r() * 10) },
  { id: "super", name: "SUPER OVER", desc: "6 balls · 2 wickets · big target", balls: 6, wkts: 2, target: (r) => 14 + Math.floor(r() * 6) },
  { id: "endless", name: "ENDLESS", desc: "3 wickets · no ball limit · go big", balls: Infinity, wkts: 3, target: null },
  { id: "daily", name: "DAILY CHALLENGE", desc: "same deliveries for everyone today", balls: 12, wkts: 3, target: (r) => 22 + Math.floor(r() * 8), seeded: true },
];

const DELIVERY = {
  pace: { label: "PACE", hint: "Line up and time it.", bounce: 0.62 },
  slower: { label: "SLOWER BALL", hint: "Wait for it...", bounce: 0.62 },
  spin: { label: "SPIN", hint: "It will TURN after the bounce. Re-adjust!", bounce: 0.62 },
  bouncer: { label: "BOUNCER", hint: "Hold ↓ to duck, or hook it if you dare.", bounce: 0.42 },
  yorker: { label: "YORKER", hint: "At your toes. Tiny timing window!", bounce: 0.97 },
};

const LINES = {
  6: ["SIX! Kya shot hai!", "Into the stands! Someone get that ball back.", "Maximum! Pure timing."],
  4: ["FOUR! Races to the rope.", "Cracking drive, four runs.", "Beautiful timing, boundary!"],
  2: ["Pushed into the gap, they come back for two.", "Good running, two more."],
  1: ["Nudged away for a single.", "Quick single, strike rotated."],
  dot: ["Dot ball. Well left.", "Beaten! That one just missed off stump.", "Defended solidly. No run."],
  bowled: ["BOWLED HIM! Stumps everywhere.", "Clean bowled! Timber!", "Through the gate and OUT."],
  caught: ["Edged and... CAUGHT! What a grab.", "Skied it, and taken at long-on. OUT."],
  hook6: ["HOOKED FOR SIX! Fearless!", "Pulled off the eyebrows, into the crowd!"],
  topEdge: ["Top edge... and taken! The bouncer did its job.", "Gloved it up, CAUGHT behind."],
  ducked: ["Ducked under it. Sensible.", "Sways out of the way, well judged."],
  helmet: ["OUCH! Hit on the helmet. Physio's coming out.", "Takes it on the grille! Shake it off."],
  keeper: ["Swing and a miss, sails through to the keeper.", "Flashed at it, nothing doing."],
  yorker6: ["Dug out the yorker and LAUNCHED it! Unreal.", "Yorker, scooped for SIX!"],
};
const SAY = {
  6: ["That's a massive six!", "Kya shot hai! Six!", "Into the stands!"],
  4: ["Four runs!", "Cracking shot, that's four!"],
  out: ["He's gone!", "Bowled him!", "Out!"],
  helmet: ["Ooh, that hit the helmet!"],
  fire: ["He is on fire!"],
  won: ["What a chase! Nayan eleven win it!"],
  lost: ["Oh no. Recruiters eleven take it."],
  endless: ["What an innings!"],
};
const pick = (a) => a[(Math.random() * a.length) | 0];

// Deterministic RNG so the Daily Challenge bowls the same balls to everyone.
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function makeDelivery(i, rnd) {
  const r = rnd();
  let type = i === 0 ? "pace" : r < 0.42 ? "pace" : r < 0.62 ? "yorker" : r < 0.78 ? "bouncer" : "spin";
  let dur = 1.35 - rnd() * 0.45 - Math.min(i, 24) * 0.012;
  if (type === "pace" && rnd() < 0.18) (type = "slower"), (dur += 0.35);
  if (type === "spin") dur += 0.3;
  let drift = rnd() < 0.55 ? (rnd() - 0.5) * 10 : (rnd() < 0.5 ? -1 : 1) * (18 + rnd() * 12);
  let turn = 0;
  if (type === "spin") {
    turn = (rnd() < 0.5 ? -1 : 1) * (40 + rnd() * 30);
    drift = -turn * 0.38 + (rnd() - 0.5) * 20; // starts wide, turns back toward the stumps
  }
  if (type === "yorker") drift = (rnd() - 0.5) * 10;
  if (type === "bouncer") drift = (rnd() - 0.5) * 16;
  return { type, dur: Math.max(0.75, dur), drift, turn };
}

/* ---------- sound: everything synthesized, no files ---------- */
function makeAudio() {
  let ac = null, noiseBuf = null;
  let muted = false, voiceOn = false;
  try {
    muted = localStorage.getItem("cricket-muted") === "1";
    voiceOn = localStorage.getItem("cricket-voice") === "1";
  } catch (e) {}
  const ensure = () => {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { return null; }
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  };
  const out = (gain, t0, attack, decay) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    g.connect(ac.destination);
    return g;
  };
  const noise = (t0, dur, filter, freq, q, gain, attack = 0.002) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = filter; f.frequency.value = freq; f.Q.value = q;
    src.connect(f).connect(out(gain, t0, attack, dur));
    src.start(t0); src.stop(t0 + attack + dur + 0.05);
  };
  const tone = (t0, type, f0, f1, dur, gain) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    o.connect(out(gain, t0, 0.003, dur));
    o.start(t0); o.stop(t0 + dur + 0.05);
  };
  const play = (fn) => { if (!muted && ensure()) fn(ac.currentTime); };

  // Stadium ambience: a low, slowly swelling crowd murmur that loops under everything.
  let amb = null;
  const AMB_LEVEL = 0.05;
  const startAmbience = () => {
    if (amb || muted || !ensure()) return;
    const t = ac.currentTime;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(AMB_LEVEL, t + 2);
    gain.connect(ac.destination);
    [[420, 0.6], [950, 0.9]].forEach(([freq, q], i) => {
      const src = ac.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      src.playbackRate.value = 0.9 + i * 0.15; // decorrelate the two layers
      const f = ac.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
      const layer = ac.createGain();
      layer.gain.value = i ? 0.45 : 1;
      // slow random-ish swell, like a crowd reacting between balls
      const lfo = ac.createOscillator();
      lfo.frequency.value = 0.07 + i * 0.05;
      const depth = ac.createGain();
      depth.gain.value = 0.35;
      lfo.connect(depth).connect(layer.gain);
      src.connect(f).connect(layer).connect(gain);
      src.start(t); lfo.start(t);
    });
    amb = gain;
  };
  const setAmbience = (on) => {
    if (!amb) return on && startAmbience();
    amb.gain.setTargetAtTime(on ? AMB_LEVEL : 0.0001, ac.currentTime, 0.3);
  };

  // Pick one female voice and keep it, so every line sounds like the same commentator.
  let voice;
  const FEMALE = /veena|heera|neerja|kalpana|swara|female|samantha|karen|moira|tessa|serena|zira|susan|fiona|victoria/i;
  const chooseVoice = () => {
    const vs = window.speechSynthesis?.getVoices() || [];
    if (!vs.length) return;
    const en = vs.filter((v) => /^en/i.test(v.lang));
    const natural = /premium|enhanced|natural|neural/i; // the less robotic system voices, when installed
    voice =
      en.find((v) => natural.test(v.name) && FEMALE.test(v.name)) ||
      en.find((v) => natural.test(v.name)) ||
      en.find((v) => v.lang === "en-IN" && FEMALE.test(v.name)) ||
      en.find((v) => FEMALE.test(v.name)) ||
      en.find((v) => v.default) ||
      null;
  };
  chooseVoice();
  window.speechSynthesis?.addEventListener?.("voiceschanged", chooseVoice);
  return {
    unlock() { if (ensure()) startAmbience(); },
    stop() { if (amb) amb.gain.setTargetAtTime(0.0001, ac.currentTime, 0.2); setTimeout(() => ac?.close(), 800); },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem("cricket-muted", muted ? "1" : "0"); } catch (e) {}
      if (muted) speechSynthesis?.cancel();
      setAmbience(!muted);
    },
    bat: (power) => play((t) => { tone(t, "sine", 1100, 500, 0.09, 0.35 + power * 0.3); noise(t, 0.05, "bandpass", 2600, 1.2, 0.4 + power * 0.3); }),
    bounce: () => play((t) => tone(t, "sine", 160, 70, 0.1, 0.25)),
    stumps: () => play((t) => { [0, 0.05, 0.12].forEach((d) => noise(t + d, 0.06, "bandpass", 3200, 2, 0.5)); tone(t, "triangle", 420, 300, 0.15, 0.3); }),
    crowd: (level, dur = 1.6) => play((t) => { noise(t, dur, "bandpass", 700, 0.6, 0.15 + level * 0.25, 0.25); noise(t, dur * 0.8, "lowpass", 1800, 0.5, 0.05 + level * 0.1, 0.3); }),
    groan: () => play((t) => noise(t, 0.9, "lowpass", 380, 0.7, 0.18, 0.15)),
    click: () => play((t) => tone(t, "square", 900, 900, 0.03, 0.08)),
    get voiceOn() { return voiceOn; },
    toggleVoice() {
      voiceOn = !voiceOn;
      try { localStorage.setItem("cricket-voice", voiceOn ? "1" : "0"); } catch (e) {}
      if (!voiceOn) speechSynthesis?.cancel();
    },
    // Dhol: bass "dha" and sharp "tin" strokes, the IPL boundary soundtrack.
    dhol(bars = 1) {
      play((t) => {
        const beat = 0.14;
        const pattern = "B.TTB.T.B.TTBTTT"; // B = bass stroke, T = treble stroke
        for (let i = 0; i < pattern.length * bars; i++) {
          const c = pattern[i % pattern.length];
          const at = t + i * beat;
          if (c === "B") { tone(at, "sine", 120, 55, 0.28, 0.5); noise(at, 0.04, "lowpass", 400, 1, 0.2); }
          if (c === "T") { tone(at, "triangle", 420, 330, 0.08, 0.18); noise(at, 0.05, "bandpass", 1500, 3, 0.25); }
        }
      });
    },
    // Stadium air horn: two short brassy blasts.
    horn() {
      play((t) => {
        [0, 0.32].forEach((d) => {
          [233, 294, 349].forEach((f) => {
            const o = ac.createOscillator();
            o.type = "sawtooth";
            o.frequency.value = f;
            const lp = ac.createBiquadFilter();
            lp.type = "lowpass"; lp.frequency.value = 1800;
            o.connect(lp).connect(out(0.06, t + d, 0.02, 0.24));
            o.start(t + d); o.stop(t + d + 0.3);
          });
        });
      });
    },
    say(text) {
      if (muted || !voiceOn || !window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice === undefined) chooseVoice();
      if (voice) u.voice = voice;
      u.rate = 1.08;
      u.volume = 0.9;
      speechSynthesis.speak(u);
    },
  };
}

export function startCricket({ color, onExit }) {
  const cv = document.createElement("canvas");
  cv.className = "cricket";
  const closeBtn = document.createElement("button");
  closeBtn.className = "cricket-close";
  closeBtn.type = "button";
  closeBtn.textContent = "[ esc ]";
  document.body.append(cv, closeBtn);
  document.body.classList.add("in-game");
  const ctx = cv.getContext("2d");
  const dpr = Math.min(devicePixelRatio, 2);
  let W, H;
  const resize = () => {
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize);
  const sfx = makeAudio();
  speechSynthesis?.getVoices(); // warm the voice list

  const bestKey = (m) => (m.seeded ? `cricket-best-daily-${today()}` : `cricket-best-${m.id}`);
  const getBest = (m) => { try { return +localStorage.getItem(bestKey(m)) || 0; } catch (e) { return 0; } };

  const g = { state: "menu", menuSel: 0, buttons: [], particles: [], shake: 0, slowmo: 0, cheer: 0, flash: 0, toast: "", toastT: 0 };
  if (location.search.includes("debug")) window.__cricket = { g, latAt: (t) => latAt(t) }; // test hook

  function newGame(mode) {
    const rnd = mode.seeded ? seeded("nayan-cricket-" + today()) : Math.random;
    Object.assign(g, {
      mode, rnd,
      target: mode.target ? mode.target(rnd) : null,
      runs: 0, wkts: 0, ball: 0, fours: 0, sixes: 0, streak: 0, log: [],
      state: "ready", // ready → runup → delivery → result → (ready | over)
      d: makeDelivery(0, rnd), t: 0, sweet: 0.88, press: null, swungAt: null, bounced: false,
      line: "Line up with the ball's shadow, then swing in the zone. SPACE to face.", pop: "", popT: 0,
      hit: null, swingT: 0, swingFrom: 0, batAng: BAT_REST, runT: 0, stumpsT: 0, waitUntil: 0, pos: 0, duck: false, duckUntil: 0,
      missMsg: "", best: getBest(mode),
    });
    g.sweet = 1 - LATE_MS / 1000 / g.d.dur;
  }

  function bowl() {
    if (g.ball > 0) g.d = makeDelivery(g.ball, g.rnd);
    Object.assign(g, { state: "runup", runT: 0, t: 0, swungAt: null, hit: null, stumpsT: 0, press: null, missMsg: "", bounced: false });
    g.sweet = 1 - LATE_MS / 1000 / g.d.dur;
    g.line = `${DELIVERY[g.d.type].label}: ${DELIVERY[g.d.type].hint}`;
  }

  // Ball position along the pitch: lateral line (spin turns after the bounce) and height.
  const latAt = (t) => g.d.drift * t + (g.d.turn ? g.d.turn * Math.max(0, t - 0.62) : 0);
  const heightAt = (t) => {
    const b = DELIVERY[g.d.type].bounce;
    if (g.d.type === "yorker") return Math.sin((Math.PI * Math.min(t, b)) / b) * 60 * (1 - Math.min(t, b) / b * 0.3);
    if (t < b) return Math.sin((Math.PI * t) / b) * (g.d.type === "bouncer" ? 50 : 70);
    if (g.d.type === "bouncer") return Math.pow((t - b) / (1 - b), 0.8) * 120;
    return Math.sin(((t - b) / (1 - b)) * Math.PI * 0.5) * 30;
  };
  const onStumps = () => g.d.type !== "bouncer" && Math.abs(latAt(1)) < 8;
  const zoneScale = () => (g.d.type === "yorker" ? 0.6 : 1);
  const relMs = () => (g.t - g.sweet) * g.d.dur * 1000;

  function burst(n, x, y, spread = 1) {
    for (let i = 0; i < n; i++) {
      g.particles.push({
        x, y, vx: (Math.random() - 0.5) * 900 * spread, vy: -Math.random() * 700 * spread - 100,
        c: TRICOLOUR[i % 3], r: Math.random() * 6, life: 1.6 + Math.random(),
      });
    }
  }

  function settle(outcome, special) {
    g.ball++;
    const { cx } = geo();
    if (typeof outcome === "number") {
      const boundary = outcome >= 4;
      const bonus = boundary && g.streak >= FIRE_STREAK ? FIRE_BONUS : 0;
      g.streak = boundary ? g.streak + 1 : 0;
      g.runs += outcome + bonus;
      if (outcome === 6) g.sixes++;
      if (outcome === 4) g.fours++;
      g.log.push(outcome);
      g.pop = (outcome === 6 ? "SIX!" : outcome === 4 ? "FOUR!" : `+${outcome}`) + (bonus ? ` +${bonus}` : "");
      g.line = pick(LINES[special || outcome]) + (bonus ? `  🔥 ON FIRE bonus +${bonus}!` : "");
      if (outcome === 6) {
        g.slowmo = 0.9; g.shake = 16; g.flash = 1; g.cheer = 1;
        burst(140, cx, H * 0.2, 1.2);
        sfx.crowd(1, 2.2);
        sfx.horn();
        setTimeout(() => sfx.dhol(2), 500);
        sfx.say(pick(SAY[6]));
      } else if (outcome === 4) {
        g.shake = 7; g.cheer = 0.6;
        burst(40, cx, H * 0.25, 0.7);
        sfx.crowd(0.6);
        sfx.dhol(1);
        sfx.say(pick(SAY[4]));
      }
      if (g.streak === FIRE_STREAK) {
        g.line = `🔥 ON FIRE! ${FIRE_STREAK} boundaries in a row. Every boundary now +${FIRE_BONUS}!`;
        setTimeout(() => sfx.say(SAY.fire[0]), 900);
      }
    } else if (outcome === "dot") {
      g.streak = 0;
      g.log.push("dot");
      g.pop = "DOT";
      g.line = special ? pick(LINES[special]) : g.missMsg || pick(LINES.dot);
      if (special === "helmet") { g.shake = 12; sfx.groan(); sfx.say(SAY.helmet[0]); }
    } else {
      g.streak = 0;
      g.wkts++;
      g.log.push("out");
      g.pop = "OUT!";
      g.shake = 10;
      g.line = pick(LINES[special || outcome]) + (g.missMsg ? "  " + g.missMsg.split("!")[0] + "." : "");
      sfx.groan();
      sfx.say(pick(SAY.out));
    }
    g.popT = 1;
    g.state = "result";
    g.waitUntil = performance.now() + (outcome === 6 ? 2400 : outcome === 4 ? 1700 : 1400);
  }

  function finishIfOver() {
    const m = g.mode;
    const won = g.target !== null && g.runs >= g.target;
    if (!won && g.ball < m.balls && g.wkts < m.wkts) return false;
    g.state = "over";
    g.won = won;
    g.newBest = g.runs > g.best;
    if (g.newBest) {
      g.best = g.runs;
      try { localStorage.setItem(bestKey(m), g.runs); } catch (e) {}
    }
    g.pop = g.target === null ? `${g.runs} RUNS` : won ? "YOU WON!" : "LOST";
    g.popT = 1;
    if (won) { burst(220, W / 2, H * 0.15, 1.4); g.cheer = 1; sfx.crowd(1, 3); sfx.horn(); sfx.dhol(2); }
    sfx.say(pick(g.target === null ? SAY.endless : won ? SAY.won : SAY.lost));
    g.line = g.target === null
      ? `Innings over: ${g.runs} off ${g.ball} balls.${g.newBest ? " NEW BEST!" : ""}`
      : won
        ? `Chased it down with ${m.balls - g.ball} balls to spare.${g.newBest ? " NEW BEST!" : ""}`
        : `Fell ${g.target - g.runs} short.`;
    return true;
  }

  function swing() {
    if (g.state === "ready") return bowl();
    if (g.state !== "delivery" || g.swungAt !== null || g.duck) return;
    g.swungAt = g.t;
    g.swingT = 1;
    g.swingFrom = g.batAng;
    const rel = relMs();
    g.press = rel;
    const d = Math.abs(rel);
    const runs = (ZONES.find(([ms]) => d < ms * zoneScale()) || [0, 0])[1];
    const timing = rel < 0 ? "Too early" : "Too late";
    if (!runs) {
      g.line = g.missMsg = `${timing} by ${Math.round(d)}ms! Swing and a miss...`;
      return;
    }
    if (g.d.type !== "bouncer" && Math.abs(latAt(g.t) - g.pos) > REACH) {
      g.line = g.missMsg = "Right timing, wrong line! Line your reach bracket up with the ball's shadow.";
      return;
    }
    sfx.bat(runs / 6);
    if (g.d.type === "bouncer" && runs < 4 && Math.random() < 0.5) return (g.hit = { caught: true }), settle("caught", "topEdge");
    if (runs < 4 && Math.random() < 0.25) return (g.hit = { caught: true }), settle("caught");
    // Direction out into the field: anywhere on the far half of the ground.
    g.hit = { runs, theta: Math.PI * (1.15 + Math.random() * 0.7), k: 0, trail: [], landed: false };
    const special = runs === 6 && g.d.type === "bouncer" ? "hook6" : runs === 6 && g.d.type === "yorker" ? "yorker6" : null;
    settle(runs, special);
    if (runs === 6) g.line = "PERFECT TIMING! " + g.line;
    else if (!g.line.includes("ON FIRE")) g.line += `  (${timing.toLowerCase()} by ${Math.round(d)}ms)`;
  }

  // Ball reached the stumps without a scoring shot.
  function ballDone() {
    if (g.d.type === "bouncer") {
      if (g.duck) return settle("dot", "ducked");
      if (g.swungAt === null) return settle("dot", "helmet");
      return settle("dot", "keeper");
    }
    if (onStumps()) {
      g.stumpsT = 0.01;
      sfx.stumps();
      return settle("bowled");
    }
    settle("dot");
  }

  function startMode(i) {
    sfx.click();
    newGame(MODES[i]);
  }

  async function copyCard() {
    const m = g.mode;
    const emoji = { 6: "6️⃣", 4: "4️⃣", 2: "2️⃣", 1: "1️⃣", dot: "⚪", out: "🔴" };
    const balls = g.log.map((x) => emoji[x]).join("");
    const ov = `${Math.floor(g.ball / 6)}.${g.ball % 6}`;
    const head = m.seeded ? `DAILY ${today()}` : m.name;
    const result = g.target === null ? `${g.runs}/${g.wkts} (${ov} ov)` : `${g.runs}/${g.wkts} (${ov} ov) · target ${g.target} · ${g.won ? "WON ✅" : "LOST ❌"}`;
    const text = `🏏 NAYAN XI vs RECRUITERS XI · ${head}\n${result}\n${balls}\nBeat me → ${SITE}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      g.toast = "Score card copied! Paste it anywhere.";
    } catch (e) {
      g.toast = "Couldn't copy. Screenshot it instead!";
    }
    g.toastT = 2.5;
  }

  let alive = true;
  const held = { left: false, right: false };
  const dirOf = (k) => (k === "ArrowLeft" || k === "a" || k === "A" ? "left" : k === "ArrowRight" || k === "d" || k === "D" ? "right" : null);
  const onKey = (e) => {
    sfx.unlock();
    const k = e.key;
    if (k === "Escape") { e.preventDefault(); return quit(); }
    if (k === "m" || k === "M") return sfx.toggle();
    if (k === "v" || k === "V") return sfx.toggleVoice();
    if (g.state === "menu") {
      if (k >= "1" && k <= String(MODES.length)) return startMode(+k - 1);
      if (k === "ArrowDown" || k === "ArrowUp") { e.preventDefault(); sfx.click(); g.menuSel = (g.menuSel + (k === "ArrowDown" ? 1 : MODES.length - 1)) % MODES.length; }
      if (k === " " || k === "Enter") { e.preventDefault(); startMode(g.menuSel); }
      return;
    }
    if (g.state === "over") {
      if (k === " " || k === "Enter") { e.preventDefault(); newGame(g.mode); }
      if (k === "c" || k === "C") copyCard();
      if (k === "b" || k === "B") g.state = "menu";
      return;
    }
    if (k === " " || k === "Enter") { e.preventDefault(); swing(); }
    if (k === "ArrowDown" || k === "s" || k === "S") { e.preventDefault(); g.duck = true; }
    const dir = dirOf(k);
    if (dir) { e.preventDefault(); held[dir] = true; }
  };
  const onKeyUp = (e) => {
    const dir = dirOf(e.key);
    if (dir) held[dir] = false;
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") g.duck = false;
  };
  // Mouse / finger x sets where the batter stands.
  const posFromPointer = (e) => {
    if (g.state === "menu" || g.state === "over") return;
    const { cx } = geo();
    const unit = (project(g.sweet, 60).x - cx) / 60;
    g.pos = Math.max(-MAX_POS, Math.min(MAX_POS, (e.clientX - cx) / unit));
  };
  const onPointer = (e) => {
    sfx.unlock();
    const b = g.buttons.find((b) => e.clientX >= b.x && e.clientX <= b.x + b.w && e.clientY >= b.y && e.clientY <= b.y + b.h);
    if (b) return b.action();
    if (g.state === "menu" || g.state === "over") return;
    if (e.clientY > H - 70) { g.duck = true; g.duckUntil = performance.now() + 700; return; } // tap the bottom strip to duck
    posFromPointer(e);
    swing();
  };
  // Defer so the Enter that launched the game doesn't also trigger an action.
  setTimeout(() => {
    if (!alive) return;
    addEventListener("keydown", onKey);
    addEventListener("keyup", onKeyUp);
  }, 0);
  cv.addEventListener("pointermove", posFromPointer);
  cv.addEventListener("pointerdown", onPointer);
  closeBtn.addEventListener("click", () => quit());

  let raf, last = performance.now();
  function quit() {
    alive = false;
    cancelAnimationFrame(raf);
    removeEventListener("keydown", onKey);
    removeEventListener("keyup", onKeyUp);
    removeEventListener("resize", resize);
    speechSynthesis?.cancel();
    sfx.stop();
    cv.remove();
    document.body.classList.remove("in-game");
    closeBtn.remove();
    onExit?.();
  }

  /* ---------- drawing ---------- */
  const font = (px) => `${px}px VT323, monospace`;
  const geo = () => {
    const portrait = H > W * 1.1;
    const nearW = portrait ? Math.min(W * 0.4, H * 0.2) : Math.min(W, H) * 0.22;
    return { cx: W / 2, horizon: H * (portrait ? 0.3 : 0.26), batY: H * (portrait ? 0.74 : 0.8), farW: nearW * 0.23, nearW };
  };
  // Draw text wrapped to maxW, growing upward from baseline y so the last line sits at y.
  const fillWrapped = (text, x, y, maxW, lh) => {
    const lines = [];
    let cur = "";
    for (const w of text.split(" ")) {
      const next = cur ? cur + " " + w : w;
      if (ctx.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    lines.push(cur);
    lines.slice(-3).forEach((l, i, a) => ctx.fillText(l, x, y - (a.length - 1 - i) * lh));
  };
  // Map ball progress (0..1) and lateral offset to screen position.
  const project = (t, lat) => {
    const { cx, horizon, batY, farW, nearW } = geo();
    const p = t * t * 0.55 + t * 0.45; // ease so it accelerates toward you
    const w = farW + (nearW - farW) * p;
    return { x: cx + (lat / 60) * w, y: horizon + (batY - horizon) * p, s: w / nearW };
  };

  function stumps(x, y, s, fallen) {
    ctx.lineWidth = Math.max(1, 3 * s);
    for (let i = -1; i <= 1; i++) {
      const sx = x + i * 9 * s;
      const tilt = fallen ? i * 0.6 * fallen + 0.2 * fallen : 0;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx + Math.sin(tilt) * 46 * s, y - Math.cos(tilt) * 46 * s);
      ctx.stroke();
    }
    if (!fallen) {
      ctx.beginPath();
      ctx.moveTo(x - 11 * s, y - 47 * s);
      ctx.lineTo(x + 11 * s, y - 47 * s);
      ctx.stroke();
    }
  }

  function animateBat(dt) {
    if (g.swingT > 0) {
      g.swingT = Math.max(0, g.swingT - dt * 4);
      const p = 1 - g.swingT;
      g.batAng = g.swingFrom + (BAT_FOLLOW - g.swingFrom) * (1 - (1 - p) ** 3);
      return;
    }
    const swung = g.swungAt !== null;
    const target =
      g.duck ? 1.4 :
      g.state === "runup" ? BAT_REST - 0.5 * Math.min(1, g.runT / RUNUP) :
      g.state === "delivery" && !swung ? BAT_BACK :
      swung && g.state !== "ready" ? BAT_FOLLOW : BAT_REST;
    g.batAng += (target - g.batAng) * Math.min(1, dt * (g.state === "delivery" ? 9 : 5));
  }

  // Pixel-art batter facing the bowler. (x, y) = feet, u = scale unit, ang = bat angle.
  function drawBatter(x, y, u, ang, crouch) {
    const dark = "rgba(0,0,0,.55)";
    const cy = crouch * 30; // ducking drops the upper body
    const r = (rx, ry, w, h, c) => { if (c) ctx.fillStyle = c; ctx.fillRect(x + rx * u, y + ry * u, w * u, h * u); ctx.fillStyle = color; };
    // shoes + pads with straps
    r(-13, -5, 10, 5); r(3, -5, 10, 5);
    r(-12, -38 + cy * 0.4, 9, 33 - cy * 0.4); r(3, -38 + cy * 0.4, 9, 33 - cy * 0.4);
    [-30, -21, -12].forEach((sy) => { if (sy > -38 + cy * 0.4) { r(-12, sy, 9, 1.5, dark); r(3, sy, 9, 1.5, dark); } });
    r(-8, -38 + cy * 0.4, 1, 33 - cy * 0.4, dark); r(7, -38 + cy * 0.4, 1, 33 - cy * 0.4, dark);
    // trousers, shirt, collar, belt
    r(-12, -52 + cy * 0.7, 24, 15);
    r(-14, -82 + cy, 28, 31);
    r(-2.5, -82 + cy, 5, 6, dark);
    r(-14, -55 + cy, 28, 2, dark);
    // helmet: dome, peak, grille
    ctx.beginPath(); ctx.arc(x, y + (-92 + cy) * u, 10 * u, Math.PI, 0); ctx.fill();
    r(-10, -92 + cy, 20, 9);
    r(-13, -93 + cy, 26, 3);
    [-88, -85].forEach((gy) => r(-8, gy + cy, 16, 1.2, dark));
    r(-1, -90 + cy, 2, 7, dark);
    // hands sit on an arc in front of the chest, following the bat
    const hx = x + (-3 - Math.sin(ang) * 14) * u;
    const hy = y + (-56 + cy - (1 - Math.cos(ang)) * 12) * u;
    ctx.lineCap = "round";
    ctx.lineWidth = 5 * u;
    ctx.beginPath();
    ctx.moveTo(x - 12 * u, y + (-77 + cy) * u); ctx.lineTo(hx, hy);
    ctx.moveTo(x + 12 * u, y + (-77 + cy) * u); ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.lineCap = "butt";
    // bat: handle, gloves, blade with a rounded toe and a spine line
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.fillRect(-1.5 * u, -4 * u, 3 * u, 18 * u);
    ctx.fillRect(-4.5 * u, -3 * u, 9 * u, 7 * u);
    ctx.beginPath();
    ctx.moveTo(-4.5 * u, 14 * u); ctx.lineTo(4.5 * u, 14 * u);
    ctx.lineTo(4.5 * u, 52 * u); ctx.quadraticCurveTo(4.5 * u, 56 * u, 0, 56 * u);
    ctx.quadraticCurveTo(-4.5 * u, 56 * u, -4.5 * u, 52 * u); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(-0.6 * u, 18 * u, 1.2 * u, 34 * u);
    ctx.fillStyle = color;
    ctx.restore();
  }

  // Tiny bowler at the far end: jogs in during the run-up, arm whirls over at release.
  function drawBowler(x, y, now) {
    const run = g.state === "runup" ? g.runT / RUNUP : 0;
    const k = 0.32 + run * 0.08;
    const by = y - 4 - Math.abs(Math.sin(now / 70)) * 3 * (run > 0 ? 1 : 0.2);
    const r = (rx, ry, w, h) => ctx.fillRect(x + rx * k, by + ry * k, w * k, h * k);
    const stride = run > 0 ? Math.sin(now / 60) * 6 : 0;
    r(-6 + stride, -30, 5, 30); r(1 - stride, -30, 5, 30);
    r(-8, -64, 16, 34);
    ctx.beginPath(); ctx.arc(x, by - 72 * k, 7 * k, 0, Math.PI * 2); ctx.fill();
    const arm = run > 0.6 ? Math.PI * 2 * ((run - 0.6) / 0.4) : g.state === "delivery" ? Math.PI * 2 : 0.3;
    ctx.lineWidth = Math.max(1.5, 4 * k);
    ctx.beginPath();
    ctx.moveTo(x, by - 60 * k);
    ctx.lineTo(x + Math.sin(arm) * 30 * k, by - 60 * k - Math.cos(arm) * 30 * k);
    ctx.stroke();
  }

  function drawField(now, crowdOnly) {
    const { cx, horizon, batY, farW, nearW } = geo();
    // outfield rings
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.ellipse(cx, batY - 40, W * 0.22 * r, H * 0.09 * r, 0, Math.PI, 0);
      ctx.stroke();
    }
    // crowd along the top of the stands; jumps when they cheer
    ctx.globalAlpha = 0.45;
    const N = Math.floor(W / 14);
    for (let i = 0; i < N; i++) {
      const a = Math.PI + (i / (N - 1)) * Math.PI;
      const x = cx + Math.cos(a) * W * 0.75, y = batY - 40 + Math.sin(a) * H * 0.52;
      if (y > H * 0.42 || (x < Math.max(16, W * 0.04) + 340 && y < 200)) continue; // keep clear of the scoreboard
      const jump = g.cheer * Math.abs(Math.sin(now / 90 + i * 1.7)) * 9;
      ctx.fillRect(x - 2, y - 7 - jump, 4, 6);
      ctx.fillRect(x - 1.5, y - 10 - jump, 3, 3);
    }
    if (crowdOnly) return (ctx.globalAlpha = 1);
    // boundary rope
    g.ropeFlash = Math.max(0, (g.ropeFlash || 0) - 0.02);
    ctx.globalAlpha = 0.35 + g.ropeFlash * 0.65;
    ctx.lineWidth = 2 + g.ropeFlash * 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.ellipse(cx, batY - 40, W * ROPE_RX, H * ROPE_RY, 0, Math.PI, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    // pitch + creases
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - farW, horizon); ctx.lineTo(cx + farW, horizon);
    ctx.lineTo(cx + nearW, batY + 30); ctx.lineTo(cx - nearW, batY + 30); ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    [0.08, 0.93].forEach((t) => {
      const a = project(t, -60), b = project(t, 60);
      ctx.beginPath(); ctx.moveTo(a.x - 12, a.y); ctx.lineTo(b.x + 12, b.y); ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function button(label, x, y, w, h, action, primary) {
    g.buttons.push({ x, y, w, h, action });
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    if (primary) { ctx.fillRect(x, y, w, h); ctx.fillStyle = "#000"; }
    else ctx.strokeRect(x, y, w, h);
    ctx.textAlign = "center";
    ctx.font = font(Math.min(24, h * 0.6, w / 6.5));
    ctx.fillText(label, x + w / 2, y + h * 0.68);
    ctx.fillStyle = color;
  }

  function drawMenu(now) {
    const { cx } = geo();
    ctx.textAlign = "center";
    ctx.shadowBlur = 20;
    ctx.font = font(Math.min(84, W * 0.12));
    ctx.fillText("NAYAN XI", cx, H * 0.17);
    ctx.globalAlpha = 0.6;
    ctx.font = font(Math.min(28, W * 0.05));
    ctx.fillText("vs  RECRUITERS XI", cx, H * 0.17 + 34);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 6;
    const rowH = Math.min(70, H * 0.1), w = Math.min(560, W - 32), x0 = cx - w / 2, y0 = H * 0.3;
    MODES.forEach((m, i) => {
      const y = y0 + i * (rowH + 10);
      const sel = g.menuSel === i;
      g.buttons.push({ x: x0, y, w, h: rowH, action: () => startMode(i) });
      ctx.globalAlpha = sel ? 1 : 0.55;
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(x0, y, w, rowH);
      if (sel) { ctx.globalAlpha = 0.12; ctx.fillRect(x0, y, w, rowH); ctx.globalAlpha = 1; }
      ctx.textAlign = "left";
      ctx.font = font(Math.min(30, rowH * 0.45));
      ctx.fillText(`[${i + 1}] ${m.name}`, x0 + 16, y + rowH * 0.45);
      ctx.globalAlpha = sel ? 0.8 : 0.45;
      ctx.font = font(Math.min(18, rowH * 0.28));
      ctx.fillText(m.desc, x0 + 16, y + rowH * 0.8);
      ctx.textAlign = "right";
      ctx.fillText(`BEST ${getBest(m)}`, x0 + w - 16, y + rowH * 0.45);
    });
    ctx.globalAlpha = 0.6;
    ctx.textAlign = "center";
    ctx.font = font(18);
    const tips = [
      "TIP: watch the ball's SHADOW and keep it inside your reach bracket.",
      "TIP: spinners drift wide, then turn back in after the bounce.",
      "TIP: 3 boundaries in a row and you're ON FIRE: +2 per boundary.",
      "TIP: yorkers have a tiny window. Bouncers: hold ↓ to duck.",
    ];
    ctx.fillText(tips[Math.floor(now / 4000) % tips.length], cx, H - 44);
    fillWrapped("↑/↓ + SPACE or tap a mode  ·  M = sound " + (sfx.muted ? "OFF" : "ON") + "  ·  V = commentary voice " + (sfx.voiceOn ? "ON" : "OFF") + "  ·  ESC = quit", cx, H - 18, W - 32, 18);
    ctx.globalAlpha = 1;
  }

  function drawOver() {
    const { cx } = geo();
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.shadowBlur = 24;
    ctx.font = font(Math.min(130, W * 0.18));
    ctx.fillText(g.pop, cx, H * 0.3);
    ctx.shadowBlur = 6;
    ctx.font = font(Math.min(34, W * 0.06));
    ctx.fillText(`${g.runs}/${g.wkts}  ·  ${Math.floor(g.ball / 6)}.${g.ball % 6} overs${g.target !== null ? `  ·  target ${g.target}` : ""}`, cx, H * 0.3 + 52);
    ctx.globalAlpha = 0.7;
    ctx.font = font(22);
    const sr = g.ball ? Math.round((g.runs / g.ball) * 100) : 0;
    fillWrapped(`6s ${g.sixes}   4s ${g.fours}   strike rate ${sr}   best ${g.best}${g.newBest ? "  ★ NEW BEST" : ""}`, cx, H * 0.3 + 84, W - 32, 22);
    ctx.globalAlpha = 1;
    // ball-by-ball strip
    const sz = Math.min(26, (W - 40) / Math.max(12, g.log.length));
    const sx = cx - (g.log.length * sz) / 2;
    ctx.font = font(sz * 0.8);
    g.log.forEach((x, i) => {
      const bx = sx + i * sz;
      if (x === "out") { ctx.fillRect(bx + 2, H * 0.3 + 102, sz - 4, sz - 4); ctx.fillStyle = "#000"; }
      else ctx.strokeRect(bx + 2, H * 0.3 + 102, sz - 4, sz - 4);
      ctx.fillText(x === "out" ? "W" : x === "dot" ? "·" : String(x), bx + sz / 2, H * 0.3 + 102 + sz * 0.7);
      ctx.fillStyle = color;
    });
    const bw = Math.min(200, (W - 48) / 3), bh = 46, by = H * 0.3 + 150, gap = 12;
    const bx0 = cx - (bw * 3 + gap * 2) / 2;
    button("PLAY AGAIN", bx0, by, bw, bh, () => newGame(g.mode), true);
    button("COPY CARD", bx0 + bw + gap, by, bw, bh, copyCard);
    button("MODES", bx0 + (bw + gap) * 2, by, bw, bh, () => (g.state = "menu"));
    ctx.globalAlpha = 0.55;
    ctx.font = font(18);
    ctx.fillText("SPACE = again  ·  C = copy score card  ·  B = modes", cx, by + bh + 30);
    ctx.globalAlpha = 1;
  }

  // Ball flight after a scoring shot: 1s and 2s roll into the gaps, fours race along the
  // ground to the rope, sixes sail high over it into the crowd.
  function drawHit(dt, startX, groundY, startLift) {
    const h = g.hit;
    const { cx, batY } = geo();
    const dur = h.runs === 6 ? 1.35 : h.runs === 4 ? 1.05 : 0.8;
    h.k = Math.min(1, h.k + dt / dur);
    const reach = h.runs === 6 ? 1.2 : h.runs === 4 ? 1 : h.runs === 2 ? 0.55 : 0.38;
    const dx = Math.max(24, Math.min(W - 24, cx + Math.cos(h.theta) * W * ROPE_RX * reach));
    const dy = batY - 40 + Math.sin(h.theta) * H * ROPE_RY * reach;
    const s = 1 - (1 - h.k) ** 2; // quick off the bat, slowing as it travels
    const gx = startX + (dx - startX) * s;
    const gy = groundY + (dy - groundY) * s;
    let lift = startLift * (1 - s);
    if (h.runs === 6) lift += Math.sin(Math.PI * h.k) * H * 0.3;
    else if (h.runs === 4) lift += Math.abs(Math.sin(h.k * Math.PI * 3)) * 16 * (1 - h.k);
    const size = Math.max(2, 7 - 5 * s);
    if (!h.landed) {
      h.trail.push([gx, gy - lift]);
      if (h.trail.length > 18) h.trail.shift();
    }
    h.trail.forEach(([x, y], i) => {
      ctx.globalAlpha = (i / h.trail.length) * 0.35;
      ctx.beginPath(); ctx.arc(x, y, size * 0.7, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.ellipse(gx, gy, size, size * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(gx, gy - lift, size, 0, Math.PI * 2); ctx.fill();
    if (h.k >= 1 && !h.landed) {
      h.landed = true;
      if (h.runs >= 4) {
        g.ropeFlash = 1;
        burst(h.runs === 6 ? 50 : 20, gx, gy - lift, 0.35);
        g.cheer = 1;
      }
    }
  }

  function drawParticles(dt) {
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const p = g.particles[i];
      p.life -= dt;
      if (p.life <= 0) { g.particles.splice(i, 1); continue; }
      p.vy += 900 * dt;
      p.vx *= 0.99;
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 8;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = p.c;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
    }
  }

  function draw(now, realDt) {
    g.buttons = [];
    // slow motion after a six
    g.slowmo = Math.max(0, g.slowmo - realDt);
    const dt = realDt * (g.slowmo > 0 ? 0.3 : 1);
    const { cx, horizon, batY, nearW } = geo();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(0, 0, W, H);
    g.shake = Math.max(0, g.shake - realDt * 30);
    if (g.shake) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    g.cheer = Math.max(0, g.cheer - realDt * 0.4);
    drawField(now, g.state === "menu");

    if (g.state === "menu") {
      drawMenu(now);
      drawParticles(realDt);
      return;
    }

    // far stumps + bowler
    stumps(cx, horizon, 0.3, 0);
    if (g.state === "runup") {
      g.runT += dt;
      if (g.runT >= RUNUP) { g.state = "delivery"; g.t = 0; }
    }
    drawBowler(cx, horizon, now);
    // delivery type + speed gun under the far stumps
    if (g.state === "runup" || g.state === "delivery") {
      const kmh = Math.round(158 - (g.d.dur - 0.75) * 55);
      ctx.textAlign = "center";
      ctx.font = font(22);
      ctx.fillText(`${DELIVERY[g.d.type].label}  ${kmh} km/h`, cx, horizon + 26);
    }

    // near stumps
    if (g.stumpsT) g.stumpsT = Math.min(1, g.stumpsT + dt * 3);
    stumps(cx, batY, 1, g.stumpsT);

    // hit zone: where the ball is at perfect timing
    const zone = project(g.sweet, latAt(g.sweet) * 0);
    const zy = zone.y - heightAt(g.sweet) * zone.s;
    const inZone = g.state === "delivery" && g.swungAt === null && Math.abs(relMs()) < ZONES[2][0] * zoneScale();
    ctx.globalAlpha = inZone ? 0.9 : 0.35;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = inZone ? 3 : 1.5;
    ctx.beginPath(); ctx.ellipse(cx, zy, nearW * 0.55, 26, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (inZone) { ctx.globalAlpha = 0.15; ctx.fill(); }
    // reach bracket: the ball's shadow must pass between these marks
    const rA = project(g.sweet, g.pos - REACH).x, rB = project(g.sweet, g.pos + REACH).x;
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rA, zone.y - 8); ctx.lineTo(rA, zone.y); ctx.lineTo(rB, zone.y); ctx.lineTo(rB, zone.y - 8);
    ctx.stroke();
    ctx.globalAlpha = inZone ? 1 : 0.5;
    ctx.textAlign = "right";
    ctx.font = font(inZone ? 22 : 16);
    ctx.fillText(inZone ? "HIT NOW! ▶" : "hit zone ▶", cx - nearW * 0.6, zy + 5);
    ctx.globalAlpha = 1;

    // batter
    if (g.duckUntil && performance.now() > g.duckUntil) { g.duck = false; g.duckUntil = 0; }
    g.pos = Math.max(-MAX_POS, Math.min(MAX_POS, g.pos + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * 70 * dt));
    const tipX = project(g.sweet, g.pos).x;
    animateBat(dt);
    g.crouch = (g.crouch || 0) + ((g.duck ? 1 : 0) - (g.crouch || 0)) * Math.min(1, dt * 14);
    const u = nearW / 110;
    drawBatter(tipX + 3 * u + Math.sin(BAT_REST) * 70 * u, batY + 6, u, g.batAng, g.crouch);

    // ball
    if (g.state === "delivery" || (g.state === "result" && !g.hit && !g.stumpsT)) {
      if (g.state === "delivery") g.t += dt / g.d.dur;
      const t = Math.min(g.t, 1.08);
      if (!g.bounced && t >= DELIVERY[g.d.type].bounce) { g.bounced = true; sfx.bounce(); }
      const p = project(t, latAt(t));
      const hgt = heightAt(Math.min(t, 1)) * p.s;
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 7 * p.s, 2.5 * p.s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y - hgt, Math.max(2, 7 * p.s), 0, Math.PI * 2); ctx.fill();
      if (g.state === "delivery" && g.t >= 1) ballDone();
    }
    if (g.hit && !g.hit.caught) drawHit(dt, tipX, zone.y, zone.y - zy);

    // scoreboard
    ctx.shadowBlur = 6;
    ctx.textAlign = "left";
    const pad = Math.max(16, W * 0.04);
    ctx.font = font(18);
    ctx.globalAlpha = 0.6;
    ctx.fillText(`NAYAN XI vs RECRUITERS XI · ${g.mode.seeded ? "DAILY " + today() : g.mode.name}`, pad, pad + 14);
    ctx.globalAlpha = 1;
    ctx.font = font(Math.min(64, W * 0.11));
    ctx.fillText(`${g.runs}/${g.wkts}`, pad, pad + 66);
    ctx.font = font(20);
    const overs = `${Math.floor(g.ball / 6)}.${g.ball % 6}`;
    const maxOv = g.mode.balls === Infinity ? "" : `/${g.mode.balls / 6}`;
    ctx.fillText(`OVERS ${overs}${maxOv}` + (g.target !== null ? `   TARGET ${g.target}` : ""), pad, pad + 92);
    ctx.globalAlpha = 0.6;
    const left = g.mode.balls - g.ball;
    ctx.fillText(g.target !== null ? `NEED ${Math.max(0, g.target - g.runs)} OFF ${left}   BEST ${g.best}` : `WICKETS LEFT ${g.mode.wkts - g.wkts}   BEST ${g.best}`, pad, pad + 114);
    ctx.globalAlpha = 1;
    // this over: last six balls
    const thisOver = g.log.slice(g.log.length - (g.ball % 6 || (g.ball ? 6 : 0)));
    ctx.font = font(18);
    ctx.fillText("THIS OVER  " + thisOver.map((x) => (x === "out" ? "W" : x === "dot" ? "·" : x)).join(" "), pad, pad + 138);
    if (g.streak >= FIRE_STREAK) {
      ctx.shadowBlur = 18;
      ctx.font = font(24);
      ctx.fillStyle = TRICOLOUR[Math.floor(now / 150) % 3];
      ctx.fillText(`🔥 ON FIRE x${g.streak}  (+${FIRE_BONUS} per boundary)`, pad, pad + 166);
      ctx.fillStyle = color;
      ctx.shadowBlur = 6;
    }
    ctx.textAlign = "right";
    ctx.globalAlpha = 0.6;
    ctx.font = font(16);
    ctx.fillText(`[M] sound ${sfx.muted ? "OFF" : "ON"} · [V] voice ${sfx.voiceOn ? "ON" : "OFF"}`, W - 16, 66);
    ctx.globalAlpha = 1;

    // timing meter (FC-penalty style); yorkers shrink the zones
    const mw = Math.min(560, W * 0.84), mh = 16, mx = cx - mw / 2, my = H - (W < 700 ? 112 : 92);
    const toX = (ms) => mx + ((ms - METER_MS[0]) / (METER_MS[1] - METER_MS[0])) * mw;
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(mx, my, mw, mh);
    [...ZONES].reverse().forEach(([ms, r]) => {
      ctx.globalAlpha = { 1: 0.22, 2: 0.4, 4: 0.65, 6: 1 }[r];
      const x0 = toX(-ms * zoneScale()), x1 = Math.min(toX(ms * zoneScale()), mx + mw);
      ctx.fillRect(x0, my, x1 - x0, mh);
    });
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);
    ctx.font = font(14);
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.7;
    ctx.fillText(g.d.type === "yorker" ? "PERFECT (TIGHT!)" : "PERFECT", toX(0), my - 6);
    ctx.textAlign = "left";
    ctx.fillText("EARLY", mx, my - 6);
    ctx.textAlign = "right";
    ctx.fillText("STUMPS", mx + mw, my - 6);
    ctx.globalAlpha = 1;
    const marker = (ms, h, w) => {
      const x = Math.max(mx, Math.min(mx + mw, toX(ms)));
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - w / 2, my - h, w, mh + h * 2);
      ctx.fillStyle = color;
      ctx.shadowBlur = 6;
    };
    if (g.state === "delivery" && relMs() >= METER_MS[0]) marker(relMs(), 6, 3);
    if (g.press !== null && g.state !== "ready") marker(g.press, 10, 5);

    // commentary
    ctx.shadowBlur = 6;
    ctx.textAlign = "center";
    const narrow = W < 700;
    ctx.font = font(Math.min(26, Math.max(18, W * 0.05)));
    fillWrapped(g.line, cx, H - 40, W - 32, 20);
    ctx.font = font(narrow ? 14 : 16);
    ctx.globalAlpha = 0.5;
    ctx.fillText(narrow ? "TAP = swing · DRAG = move · TAP HERE = duck" : "←/→ MOUSE = move · SPACE/TAP = swing · ↓ = duck (tap here) · M = sound · ESC = quit", cx, H - 14);
    ctx.globalAlpha = 1;

    // big pop
    if (g.popT > 0 && g.state !== "over") {
      g.popT = Math.max(0, g.popT - dt * 0.8);
      ctx.globalAlpha = Math.min(1, g.popT * 1.5);
      ctx.textAlign = "center";
      ctx.font = font(Math.min(160, W * 0.22) * (1.15 - g.popT * 0.15));
      ctx.shadowBlur = 24;
      ctx.fillText(g.pop, cx, H * 0.5);
      ctx.globalAlpha = 1;
    }

    drawParticles(dt);

    if (g.flash > 0) {
      g.flash = Math.max(0, g.flash - realDt * 3);
      ctx.globalAlpha = g.flash * 0.5;
      ctx.fillStyle = "#fff";
      ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
    }

    if (g.state === "result" && now > g.waitUntil && !finishIfOver()) {
      g.state = "ready";
      g.line = "Next ball. Press SPACE when ready.";
    }
    if (g.state === "over") drawOver();

    if (g.toastT > 0) {
      g.toastT -= realDt;
      ctx.textAlign = "center";
      ctx.font = font(24);
      ctx.fillText(g.toast, cx, H * 0.12);
    }
  }

  (function loop(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(now, dt);
    raf = requestAnimationFrame(loop);
  })(performance.now());
}

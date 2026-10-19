// CRT cricket: chase a target in 2 overs. Time Space / tap as the ball reaches the bat.

const BALLS = 12;
const WICKETS = 3;
// Timing windows in ms either side of the sweet spot, so every delivery speed is equally fair.
const ZONES = [[35, 6], [75, 4], [115, 2], [160, 1]];
const LATE_MS = 160; // sweet spot sits this long before the ball reaches the stumps
const METER_MS = [-450, LATE_MS]; // span shown on the timing meter
const REACH = 11; // how far (lateral units) the bat can be from the ball's line and still connect
const MAX_POS = 40;
const RUNUP = 0.75; // seconds of bowler run-up before release
const BAT_REST = 0.35, BAT_BACK = -2.2, BAT_FOLLOW = 2.5; // bat angles (0 = straight down)

const LINES = {
  6: ["SIX! Kya shot hai!", "Into the stands! Someone get that ball back.", "Maximum! Pure timing."],
  4: ["FOUR! Races to the rope.", "Cracking drive, four runs.", "Beautiful timing, boundary!"],
  2: ["Pushed into the gap, they come back for two.", "Good running, two more."],
  1: ["Nudged away for a single.", "Quick single, strike rotated."],
  dot: ["Dot ball. Well left.", "Beaten! That one just missed off stump.", "Defended solidly. No run."],
  bowled: ["BOWLED HIM! Stumps everywhere.", "Clean bowled! Timber!", "Through the gate and OUT."],
  caught: ["Edged and... CAUGHT! What a grab.", "Skied it, and taken at long-on. OUT."],
};
const pick = (a) => a[(Math.random() * a.length) | 0];

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

  let best = 0;
  try { best = +localStorage.getItem("cricket-best") || 0; } catch (e) {}

  const g = {};
  function newGame() {
    Object.assign(g, {
      target: 18 + ((Math.random() * 10) | 0),
      runs: 0, wkts: 0, ball: 0,
      state: "ready", // ready → delivery → result → (ready | over)
      t: 0, dur: 1.2, sweet: 0.88, press: null, swungAt: null, onStumps: true, drift: 0,
      line: "Move into the ball's line (watch its shadow), swing in the zone. SPACE to start.", pop: "", popT: 0,
      hit: null, swingT: 0, swingFrom: 0, batAng: BAT_REST, runT: 0, stumpsT: 0, waitUntil: 0, pos: 0,
    });
  }
  newGame();

  function bowl() {
    g.state = "runup";
    g.runT = 0;
    g.t = 0;
    g.swungAt = null;
    g.hit = null;
    g.stumpsT = 0;
    g.press = null;
    g.missMsg = "";
    g.dur = 1.35 - Math.random() * 0.45 - g.ball * 0.012; // slowly gets quicker
    if (Math.random() < 0.15) g.dur += 0.35; // slower ball
    g.sweet = 1 - LATE_MS / 1000 / g.dur; // progress where the ball meets the bat
    g.onStumps = Math.random() < 0.55;
    g.drift = g.onStumps ? (Math.random() - 0.5) * 10 : (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 12);
    g.line = g.dur > 1.3 ? "Bowler runs in... looks like a slower one." : "Bowler runs in...";
  }

  function settle(outcome) {
    g.ball++;
    if (typeof outcome === "number") {
      g.runs += outcome;
      g.pop = outcome === 6 ? "SIX!" : outcome === 4 ? "FOUR!" : `+${outcome}`;
      g.line = pick(LINES[outcome]);
    } else if (outcome === "dot") {
      g.pop = "DOT";
      g.line = g.missMsg || pick(LINES.dot);
    } else {
      g.wkts++;
      g.pop = "OUT!";
      g.line = pick(LINES[outcome]) + (g.missMsg ? "  " + g.missMsg.split("!")[0] + "." : "");
    }
    g.popT = 1;
    g.state = "result";
    g.waitUntil = performance.now() + 1300;
  }

  function finishIfOver() {
    const won = g.runs >= g.target;
    if (!won && g.ball < BALLS && g.wkts < WICKETS) return false;
    g.state = "over";
    if (g.runs > best) {
      best = g.runs;
      try { localStorage.setItem("cricket-best", best); } catch (e) {}
    }
    g.pop = won ? "YOU WON!" : "LOST";
    g.popT = 1;
    g.line = won
      ? `Chased it down with ${BALLS - g.ball} balls to spare. Press SPACE to play again.`
      : `Fell ${g.target - g.runs} short. Press SPACE for a rematch.`;
    return true;
  }

  const relMs = () => (g.t - g.sweet) * g.dur * 1000;

  function swing() {
    if (g.state === "ready") return bowl();
    if (g.state === "over") return newGame(), bowl();
    if (g.state !== "delivery" || g.swungAt !== null) return;
    g.swungAt = g.t;
    g.swingT = 1;
    g.swingFrom = g.batAng;
    const rel = relMs();
    g.press = rel;
    const d = Math.abs(rel);
    let runs = (ZONES.find(([ms]) => d < ms) || [0, 0])[1];
    const offLine = Math.abs(g.drift * g.t - g.pos) > REACH;
    if (runs && offLine) {
      g.missMsg = "Right timing, wrong line! Line your reach bracket up with the ball's shadow.";
      g.line = g.missMsg;
      return;
    }
    if (runs && runs < 4 && Math.random() < 0.25) return (g.hit = { caught: true }), settle("caught");
    const timing = rel < 0 ? "Too early" : "Too late";
    if (!runs) g.line = g.missMsg = `${timing} by ${Math.round(d)}ms! Swing and a miss...`;
    if (runs) {
      g.hit = { vx: (Math.random() - 0.5) * 900, vy: -(500 + runs * 120), x: 0, y: 0, k: 0 };
      settle(runs);
      if (runs === 6) g.line = "PERFECT TIMING! " + g.line;
      else g.line += `  (${timing.toLowerCase()} by ${Math.round(d)}ms)`;
    }
  }

  let alive = true;
  const held = { left: false, right: false };
  const dirOf = (k) => (k === "ArrowLeft" || k === "a" || k === "A" ? "left" : k === "ArrowRight" || k === "d" || k === "D" ? "right" : null);
  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); return quit(); }
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); swing(); }
    const dir = dirOf(e.key);
    if (dir) { e.preventDefault(); held[dir] = true; }
  };
  const onKeyUp = (e) => { const dir = dirOf(e.key); if (dir) held[dir] = false; };
  // Mouse / finger x sets where the batter stands.
  const posFromPointer = (e) => {
    const { cx } = geo();
    const unit = (project(g.sweet, 60).x - cx) / 60;
    g.pos = Math.max(-MAX_POS, Math.min(MAX_POS, (e.clientX - cx) / unit));
  };
  // Defer so the Enter that launched the game doesn't also bowl the first ball.
  setTimeout(() => {
    if (!alive) return;
    addEventListener("keydown", onKey);
    addEventListener("keyup", onKeyUp);
  }, 0);
  cv.addEventListener("pointermove", posFromPointer);
  cv.addEventListener("pointerdown", (e) => { posFromPointer(e); swing(); });
  closeBtn.addEventListener("click", () => quit());

  let raf, last = performance.now();
  function quit() {
    alive = false;
    cancelAnimationFrame(raf);
    removeEventListener("keydown", onKey);
    removeEventListener("keyup", onKeyUp);
    removeEventListener("resize", resize);
    cv.remove();
    document.body.classList.remove("in-game");
    closeBtn.remove();
    onExit?.();
  }

  /* ---------- drawing ---------- */
  const font = (px) => `${px}px VT323, monospace`;
  const geo = () => {
    const cx = W / 2, horizon = H * 0.26, batY = H * 0.8;
    return { cx, horizon, batY, farW: Math.min(W, H) * 0.05, nearW: Math.min(W, H) * 0.22 };
  };
  // Map ball progress (0..1) and lateral offset to screen position.
  const project = (t, lat) => {
    const { cx, horizon, batY, farW, nearW } = geo();
    const p = t * t * 0.55 + t * 0.45; // ease so it accelerates toward you
    const w = farW + (nearW - farW) * p;
    return { x: cx + (lat / 60) * w, y: horizon + (batY - horizon) * p, s: w / nearW };
  };
  const height = (t) => (t < 0.62 ? Math.sin((Math.PI * t) / 0.62) * 70 : Math.sin(((t - 0.62) / 0.38) * Math.PI * 0.5) * 30);

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
      g.state === "runup" ? BAT_REST - 0.5 * Math.min(1, g.runT / RUNUP) :
      g.state === "delivery" && !swung ? BAT_BACK :
      swung && g.state !== "ready" ? BAT_FOLLOW : BAT_REST;
    g.batAng += (target - g.batAng) * Math.min(1, dt * (g.state === "delivery" ? 9 : 5));
  }

  // Pixel-art batter facing the bowler. (x, y) = feet, u = scale unit, ang = bat angle.
  function drawBatter(x, y, u, ang) {
    const dark = "rgba(0,0,0,.55)";
    const r = (rx, ry, w, h, c) => { if (c) ctx.fillStyle = c; ctx.fillRect(x + rx * u, y + ry * u, w * u, h * u); ctx.fillStyle = color; };
    // shoes + pads with straps
    r(-13, -5, 10, 5); r(3, -5, 10, 5);
    r(-12, -38, 9, 33); r(3, -38, 9, 33);
    [-30, -21, -12].forEach((sy) => { r(-12, sy, 9, 1.5, dark); r(3, sy, 9, 1.5, dark); });
    r(-8, -38, 1, 33, dark); r(7, -38, 1, 33, dark);
    // trousers, shirt, collar
    r(-12, -52, 24, 15);
    r(-14, -82, 28, 31);
    r(-2.5, -82, 5, 6, dark);
    r(-14, -55, 28, 2, dark); // belt
    // helmet: dome, peak, grille
    ctx.beginPath(); ctx.arc(x, y - 92 * u, 10 * u, Math.PI, 0); ctx.fill();
    r(-10, -92, 20, 9);
    r(-13, -93, 26, 3);
    [-88, -85].forEach((gy) => r(-8, gy, 16, 1.2, dark));
    r(-1, -90, 2, 7, dark);
    // hands sit on an arc in front of the chest, following the bat
    const hx = x + (-3 - Math.sin(ang) * 14) * u;
    const hy = y + (-56 - (1 - Math.cos(ang)) * 12) * u;
    ctx.lineCap = "round";
    ctx.lineWidth = 5 * u;
    ctx.beginPath();
    ctx.moveTo(x - 12 * u, y - 77 * u); ctx.lineTo(hx, hy);
    ctx.moveTo(x + 12 * u, y - 77 * u); ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.lineCap = "butt";
    // bat: handle, grip, blade with a rounded toe and a spine line
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.fillRect(-1.5 * u, -4 * u, 3 * u, 18 * u);
    ctx.fillRect(-4.5 * u, -3 * u, 9 * u, 7 * u); // gloves
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
    r(-6 + stride, -30, 5, 30); r(1 - stride, -30, 5, 30); // legs
    r(-8, -64, 16, 34); // body
    ctx.beginPath(); ctx.arc(x, by - 72 * k, 7 * k, 0, Math.PI * 2); ctx.fill();
    const arm = run > 0.6 ? Math.PI * 2 * ((run - 0.6) / 0.4) : g.state === "delivery" ? Math.PI * 2 : 0.3;
    ctx.lineWidth = Math.max(1.5, 4 * k);
    ctx.beginPath();
    ctx.moveTo(x, by - 60 * k);
    ctx.lineTo(x + Math.sin(arm) * 30 * k, by - 60 * k - Math.cos(arm) * 30 * k);
    ctx.stroke();
  }

  function draw(now, dt) {
    const { cx, horizon, batY, farW, nearW } = geo();
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    // outfield rings + pitch
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.ellipse(cx, batY - 40, W * 0.22 * r, H * 0.09 * r, 0, Math.PI, 0);
      ctx.stroke();
    }
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

    // far stumps + bowler
    stumps(cx, horizon, 0.3, 0);
    if (g.state === "runup") {
      g.runT += dt;
      if (g.runT >= RUNUP) { g.state = "delivery"; g.t = 0; }
    }
    drawBowler(cx, horizon, now);

    // near stumps
    if (g.stumpsT) g.stumpsT = Math.min(1, g.stumpsT + dt * 3);
    stumps(cx, batY, 1, g.stumpsT);

    // hit zone: where the ball is at perfect timing
    const zone = project(g.sweet, 0);
    const zy = zone.y - height(g.sweet) * zone.s;
    const inZone = g.state === "delivery" && g.swungAt === null && Math.abs(relMs()) < ZONES[2][0];
    ctx.globalAlpha = inZone ? 0.9 : 0.35;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = inZone ? 3 : 1.5;
    ctx.beginPath(); ctx.ellipse(cx, zy, nearW * 0.55, 26, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (inZone) { ctx.globalAlpha = 0.15; ctx.fill(); }
    // reach bracket: the ball's shadow must pass between these marks
    const rA = project(g.sweet, g.pos - REACH).x, rB = project(g.sweet, g.pos + REACH).x;
    const gy = zone.y;
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rA, gy - 8); ctx.lineTo(rA, gy); ctx.lineTo(rB, gy); ctx.lineTo(rB, gy - 8);
    ctx.stroke();
    ctx.globalAlpha = inZone ? 1 : 0.5;
    ctx.textAlign = "right";
    ctx.font = font(inZone ? 22 : 16);
    ctx.fillText(inZone ? "HIT NOW! ▶" : "hit zone ▶", cx - nearW * 0.6, zy + 5);
    ctx.globalAlpha = 1;

    // batter: stands beside the stumps, bat comes down on the ball's line
    g.pos = Math.max(-MAX_POS, Math.min(MAX_POS, g.pos + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * 70 * dt));
    const tipX = project(g.sweet, g.pos).x; // where the bat meets the ball
    animateBat(dt);
    const u = nearW / 110;
    drawBatter(tipX + 3 * u + Math.sin(BAT_REST) * 70 * u, batY + 6, u, g.batAng);

    // ball
    if (g.state === "delivery" || (g.state === "result" && !g.hit && !g.stumpsT)) {
      if (g.state === "delivery") g.t += dt / g.dur;
      const t = Math.min(g.t, 1.08);
      const p = project(t, g.drift * t);
      const hgt = height(Math.min(t, 1)) * p.s;
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 7 * p.s, 2.5 * p.s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y - hgt, Math.max(2, 7 * p.s), 0, Math.PI * 2); ctx.fill();
      if (g.state === "delivery" && g.t >= 1) {
        if (g.onStumps) { g.stumpsT = 0.01; settle("bowled"); }
        else settle("dot");
      }
    }
    if (g.hit && !g.hit.caught) {
      const h = g.hit;
      h.k += dt;
      h.x = h.vx * h.k;
      h.y = h.vy * h.k + 600 * h.k * h.k;
      const s = Math.max(0.15, 1 - h.k * 0.9);
      ctx.beginPath(); ctx.arc(tipX + h.x * 0.6, zy + h.y * 0.6, 7 * s, 0, Math.PI * 2); ctx.fill();
    }

    // scoreboard
    ctx.shadowBlur = 6;
    ctx.textAlign = "left";
    const pad = Math.max(16, W * 0.04);
    ctx.font = font(18);
    ctx.globalAlpha = 0.6;
    ctx.fillText("NAYAN XI  vs  RECRUITERS XI", pad, pad + 14);
    ctx.globalAlpha = 1;
    ctx.font = font(Math.min(64, W * 0.11));
    ctx.fillText(`${g.runs}/${g.wkts}`, pad, pad + 66);
    ctx.font = font(20);
    const overs = `${Math.floor(g.ball / 6)}.${g.ball % 6}`;
    ctx.fillText(`OVERS ${overs}/2   TARGET ${g.target}`, pad, pad + 92);
    const need = Math.max(0, g.target - g.runs);
    ctx.globalAlpha = 0.6;
    ctx.fillText(g.state === "over" ? `BEST ${best}` : `NEED ${need} OFF ${BALLS - g.ball}   BEST ${best}`, pad, pad + 114);
    ctx.globalAlpha = 1;

    // big pop
    if (g.popT > 0) {
      g.popT = Math.max(g.state === "over" ? 1 : 0, g.popT - dt * 0.8);
      ctx.globalAlpha = Math.min(1, g.popT * 1.5);
      ctx.textAlign = "center";
      ctx.font = font(Math.min(160, W * 0.22) * (1.15 - g.popT * 0.15));
      ctx.shadowBlur = 24;
      ctx.fillText(g.pop, cx, H * 0.5);
      ctx.globalAlpha = 1;
    }

    // timing meter (FC-penalty style)
    const mw = Math.min(560, W * 0.84), mh = 16, mx = cx - mw / 2, my = H - 92;
    const toX = (ms) => mx + ((ms - METER_MS[0]) / (METER_MS[1] - METER_MS[0])) * mw;
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(mx, my, mw, mh);
    [...ZONES].reverse().forEach(([ms, r]) => {
      ctx.globalAlpha = { 1: 0.22, 2: 0.4, 4: 0.65, 6: 1 }[r];
      const x0 = toX(-ms), x1 = Math.min(toX(ms), mx + mw);
      ctx.fillRect(x0, my, x1 - x0, mh);
    });
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);
    ctx.font = font(14);
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.7;
    ctx.fillText("PERFECT", toX(0), my - 6);
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
    ctx.font = font(Math.min(26, W * 0.055));
    ctx.fillText(g.line, cx, H - 36);
    ctx.font = font(16);
    ctx.globalAlpha = 0.5;
    ctx.fillText("←/→ or MOUSE = move   ·   SPACE / CLICK / TAP = swing   ·   ESC = quit", cx, H - 12);
    ctx.globalAlpha = 1;

    if (g.state === "result" && now > g.waitUntil && !finishIfOver()) {
      g.state = "ready";
      g.line = "Next ball. Press SPACE when ready.";
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

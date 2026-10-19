import { profile, projects, skills, experience } from "./data.js";
import { initTerminal } from "./terminal.js";

if (window.gsap) gsap.registerPlugin(ScrollTrigger);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const phosphorHex = () => getComputedStyle(document.documentElement).getPropertyValue("--ph").trim();
const store = {
  get: (k, s = localStorage) => { try { return s.getItem(k); } catch (e) { return null; } },
  set: (k, v, s = localStorage) => { try { s.setItem(k, v); } catch (e) {} },
};

/* ---------- render content from data.js ---------- */
$("#about-text").innerHTML = profile.about.map((p) => `<p>${esc(p)}</p>`).join("");
$("#facts").innerHTML = profile.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
$("#timeline").innerHTML = experience
  .map(
    (e) => `<li>
      <span class="when">[${esc(e.when)}]</span>
      <h3>${esc(e.title)}${e.org.includes("TBA") ? '<span class="tag-tba">details soon</span>' : ""}</h3>
      <div class="org">@ ${esc(e.org)}</div>
      ${e.points.map((p) => `<p>${esc(p)}</p>`).join("")}
    </li>`
  )
  .join("");
$("#work-track").innerHTML = projects
  .map((p, i) => {
    const screen = p.image
      ? `<img src="${p.image}" alt="${esc(p.title)} screenshot" loading="lazy" /><div class="tint"></div>`
      : `<div class="printer"><span class="label">printing… layer ${"▮".repeat(3)}</span><div class="head"></div><div class="layers">${Array.from(
          { length: 14 },
          (_, j) => `<div class="layer" style="width:${30 + Math.sin(j / 2.2) * 22 + j * 1.5}%;animation-delay:${j * 0.38}s"></div>`
        ).join("")}</div></div>`;
    return `<article class="project" id="p-${p.id}">
      <figure class="monitor screen">${screen}</figure>
      <div>
        <div class="idx">${String(i + 1).padStart(2, "0")}</div>
        <h3>${esc(p.title)}</h3>
        <p class="sub">${esc(p.subtitle)} · ${esc(p.year)}</p>
        <ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="chips">${p.stack.map((s) => `<span>${esc(s)}</span>`).join("")}</div>
        ${p.link ? `<a class="btn ghost" href="${p.link}" target="_blank" rel="noopener" data-magnetic>[ view source ]</a>` : `<span class="hud-dim">// repo goes public soon</span>`}
      </div>
    </article>`;
  })
  .join("");
const allSkills = Object.values(skills).flat();
const marqueeHTML = (list) => [...list, ...list].map((s) => `<span>${esc(s)}</span>`).join("");
$("#marquee-a").innerHTML = marqueeHTML(allSkills.slice(0, Math.ceil(allSkills.length / 2)));
$("#marquee-b").innerHTML = marqueeHTML(allSkills.slice(Math.ceil(allSkills.length / 2)));
const tree = ["<span class='k'>nayan@stack</span>"];
Object.entries(skills).forEach(([cat, items], ci, arr) => {
  const last = ci === arr.length - 1;
  tree.push(`${last ? "└──" : "├──"} ${cat}/`);
  items.forEach((s, si) => tree.push(`${last ? "    " : "│   "}${si === items.length - 1 ? "└──" : "├──"} <span class="k">${esc(s)}</span>`));
});
tree.push(`\n<span class='k'>${Object.keys(skills).length} directories, ${allSkills.length} packages</span>`);
$("#skill-tree").innerHTML = tree.join("\n");
$("#coords").textContent = `${profile.coords} · NAVI MUMBAI.IN`;

/* ---------- text scramble ---------- */
const GLYPHS = "!<>-_\\/[]{}=+*^?#01アカサタナनमकखग";
function scramble(el, finalText = el.dataset.final || el.textContent, duration = 900) {
  el.dataset.final = finalText;
  if (reducedMotion) return Promise.resolve((el.textContent = finalText));
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const reveal = Math.floor(p * finalText.length);
      el.textContent = [...finalText]
        .map((c, i) => (i < reveal || c === " " ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
        .join("");
      p < 1 ? requestAnimationFrame(tick) : resolve();
    };
    requestAnimationFrame(tick);
  });
}

/* ---------- boot sequence ---------- */
const GREETINGS = [
  ["नमस्कार", true],
  ["வணக்கம்", false],
  ["নমস্কার", false],
  ["ನಮಸ್ಕಾರ", false],
  ["नमस्ते", true],
  ["HELLO.", false],
];
const BOOT_LINES = [
  "NAYAN-OS BIOS v26.10  (c) 2026 Patil Systems",
  "CPU: Caffeine-free Chai Core i7 @ 4.20GHz ......... OK",
  "MEM CHECK 640K ........................................ OK",
  "Loading kernel modules: react node mongo python sql ... OK",
  "Mounting /dev/creativity .............................. OK",
  "Linking uplink → MUMBAI-NODE 19.03N 73.02E ............ OK",
];
async function boot() {
  const el = $("#boot");
  const done = () => {
    el.classList.add("off");
    document.body.classList.remove("booting");
    setTimeout(() => el.remove(), 700);
    intro();
  };
  if (reducedMotion || store.get("booted", sessionStorage)) return done();
  store.set("booted", "1", sessionStorage);
  document.body.classList.add("booting");
  let skipped = false;
  const skip = () => { if (!skipped) { skipped = true; done(); } };
  $("#boot-skip").addEventListener("click", skip);
  addEventListener("keydown", skip, { once: true });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = $("#boot-log");
  for (const line of BOOT_LINES) {
    if (skipped) return;
    log.textContent += line + "\n";
    await wait(170);
  }
  const g = $("#boot-greet");
  for (const [word, deva] of GREETINGS) {
    if (skipped) return;
    g.classList.toggle("deva", deva);
    g.textContent = word;
    await wait(word === "HELLO." ? 700 : 330);
  }
  skip();
}

/* ---------- hero intro + typed taglines ---------- */
function intro() {
  scramble($(".hero-name"), "NAYAN PATIL", 1400);
  if (window.gsap && !reducedMotion) {
    gsap.from([".eyebrow", ".hero-tag", ".hero-cta", ".hud"], { opacity: 0, y: 16, duration: 0.8, stagger: 0.12, delay: 0.3 });
  }
  typeLoop();
}
async function typeLoop() {
  const el = $("#typed");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (reducedMotion) return (el.textContent = profile.taglines[0]);
  for (let i = 0; ; i = (i + 1) % profile.taglines.length) {
    const t = profile.taglines[i];
    for (let c = 1; c <= t.length; c++) { el.textContent = t.slice(0, c); await wait(45 + Math.random() * 40); }
    await wait(1800);
    for (let c = t.length; c >= 0; c--) { el.textContent = t.slice(0, c); await wait(22); }
    await wait(300);
  }
}

/* ---------- HUD: clock, scroll %, active nav ---------- */
const clockEl = $("#clock");
const tickClock = () =>
  (clockEl.textContent = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false }) + " IST");
tickClock();
setInterval(tickClock, 1000);
const pctEl = $("#scroll-pct");
addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  pctEl.textContent = "SCR " + String(Math.round((scrollY / max) * 100) || 0).padStart(3, "0") + "%";
}, { passive: true });
const navLinks = [...document.querySelectorAll(".nav a")];
const navObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
  }),
  { rootMargin: "-45% 0px -50% 0px" }
);
["about", "log", "work", "stack", "telemetry", "contact"].forEach((id) => navObserver.observe(document.getElementById(id)));

/* ---------- phosphor toggle ---------- */
let hero = null;
function setPhosphor(name) {
  document.documentElement.dataset.phosphor = name;
  store.set("phosphor", name);
  $("#phosphor-label").textContent = name === "amber" ? "P3" : "P1";
  hero?.setColor(phosphorHex());
  drawDither();
}
$("#phosphor-toggle").addEventListener("click", () =>
  setPhosphor(document.documentElement.dataset.phosphor === "amber" ? "green" : "amber")
);
$("#phosphor-label").textContent = document.documentElement.dataset.phosphor === "amber" ? "P3" : "P1";

/* ---------- dithered portrait ---------- */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function drawDither() {
  const img = $("#dither-src");
  const cv = $("#dither");
  if (!img.complete || !img.naturalWidth) return;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  // Cover-crop to the canvas, biased toward the top so the face stays in frame.
  const scale = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
  const sw = cv.width / scale, sh = cv.height / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * 0.15, sw, sh, 0, 0, cv.width, cv.height);
  let data;
  try { data = ctx.getImageData(0, 0, cv.width, cv.height); } catch (e) { return; } // tainted on file://
  const [r, g, b] = phosphorHex().match(/\w\w/g).map((h) => parseInt(h, 16));
  const d = data.data;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      const i = (y * cv.width + x) * 4;
      const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
      const contrast = Math.min(1, Math.max(0, (lum - 0.5) * 1.5 + 0.55));
      const on = contrast > (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
      d[i] = on ? r : 0; d[i + 1] = on ? g : 0; d[i + 2] = on ? b : 0; d[i + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
}
$("#dither-src").addEventListener("load", drawDither);
drawDither();

/* ---------- cursor + magnetic buttons ---------- */
if (finePointer && !reducedMotion) {
  const cur = $("#cursor");
  document.body.classList.add("has-cursor");
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; cur.style.opacity = 1; });
  (function loop() {
    cx += (x - cx) * 0.25; cy += (y - cy) * 0.25;
    const big = cur.classList.contains("hover");
    cur.style.transform = `translate(${cx - (big ? 22 : 7)}px, ${cy - (big ? 22 : 11)}px)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener("pointerover", (e) => cur.classList.toggle("hover", !!e.target.closest("a, button, input, textarea")));
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
}

/* ---------- scroll animations ---------- */
function initScroll() {
  if (!window.gsap || reducedMotion) return;
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: ".hero", start: "top top", end: "bottom top", scrub: true,
    onUpdate: (s) => hero?.setScatter(s.progress),
  });
  gsap.to(".hero-inner", { yPercent: -40, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  document.querySelectorAll(".section-title").forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => scramble(el, undefined, 700) })
  );
  gsap.utils.toArray(".timeline li, .about-text p, .facts, .panel, .term-form label, .links li").forEach((el) =>
    gsap.from(el, { opacity: 0, x: -24, duration: 0.7, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%" } })
  );
  gsap.from(".about-photo", { clipPath: "inset(0 0 100% 0)", duration: 1.2, ease: "steps(24)", scrollTrigger: { trigger: ".about-photo", start: "top 80%" } });
  gsap.from(".skill-tree", { clipPath: "inset(0 0 100% 0)", duration: 1.4, ease: "steps(30)", scrollTrigger: { trigger: ".skill-tree", start: "top 85%" } });

  // Pinned horizontal project scroll on desktop.
  ScrollTrigger.matchMedia({
    "(min-width: 961px)": () => {
      const track = $("#work-track");
      const dist = () => track.scrollWidth - innerWidth;
      const tween = gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: { trigger: "#work", start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true },
      });
      gsap.utils.toArray(".project").forEach((p) =>
        gsap.from(p.querySelectorAll("h3, .sub, li, .chips, .btn"), {
          opacity: 0, y: 30, stagger: 0.05,
          scrollTrigger: { trigger: p, containerAnimation: tween, start: "left 75%" },
        })
      );
    },
  });
}

/* ---------- GitHub telemetry ---------- */
async function loadGitHub() {
  const user = profile.githubUser;
  const cacheKey = "gh-cache";
  let data;
  try {
    const cached = JSON.parse(store.get(cacheKey, sessionStorage) || "null");
    if (cached && Date.now() - cached.t < 10 * 60 * 1000) data = cached.data;
    else {
      const [u, r] = await Promise.all([
        fetch(`https://api.github.com/users/${user}`).then((x) => { if (!x.ok) throw 0; return x.json(); }),
        fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`).then((x) => { if (!x.ok) throw 0; return x.json(); }),
      ]);
      data = { u, r };
      store.set(cacheKey, JSON.stringify({ t: Date.now(), data }), sessionStorage);
    }
  } catch (e) {
    $("#gh-stats").innerHTML = `<h4>uplink</h4><p class="hud-dim">signal lost (GitHub rate limit?). <a href="${profile.github}" target="_blank" rel="noopener">view profile directly →</a></p>`;
    return;
  }
  const { u, r } = data;
  const repos = r.filter((x) => !x.fork);
  const since = new Date(u.created_at).getFullYear();
  $("#gh-stats").innerHTML = `<h4>// uplink: ${esc(u.login)}</h4>
    <div class="stat-row">
      <div><b data-count="${u.public_repos}">0</b><small>repos</small></div>
      <div><b data-count="${new Set(repos.map((x) => x.language).filter(Boolean)).size}">0</b><small>languages</small></div>
      <div><b data-count="${since}">0</b><small>coding on gh since</small></div>
    </div>`;
  const langs = {};
  repos.forEach((x) => x.language && (langs[x.language] = (langs[x.language] || 0) + 1));
  const total = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
  $("#gh-langs").innerHTML = `<h4>// languages by repo</h4>` +
    Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l, n]) => {
      const pct = Math.round((n / total) * 100);
      const blocks = Math.round(pct / 4);
      return `<div class="lang"><span>${esc(l)}</span><span class="bar">${"█".repeat(blocks)}<span class="hud-dim">${"░".repeat(25 - blocks)}</span></span><span>${pct}%</span></div>`;
    }).join("");
  $("#gh-repos").innerHTML = `<h4>// recent activity</h4>` +
    repos.slice(0, 6).map((x) => `<a class="repo" href="${x.html_url}" target="_blank" rel="noopener">
      <span>${esc(x.name)}</span><span class="meta">${esc(x.language || "—")}</span>
      <span class="meta">${new Date(x.pushed_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span></a>`).join("");
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = +el.dataset.count;
    if (reducedMotion || !window.gsap) return (el.textContent = end);
    const obj = { v: end > 1000 ? end - 30 : 0 };
    gsap.to(obj, { v: end, duration: 1.6, ease: "power2.out", onUpdate: () => (el.textContent = Math.round(obj.v)),
      scrollTrigger: { trigger: el, start: "top 90%" } });
  });
  window.ScrollTrigger?.refresh();
}

/* ---------- contact form ---------- */
$("#contact-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const status = $("#form-status");
  const fd = new FormData(form);
  status.textContent = "transmitting…";
  try {
    const res = await fetch(form.action, { method: "POST", body: fd, headers: { Accept: "application/json" } });
    if (!res.ok) throw 0;
    form.reset();
    status.textContent = "✔ transmission received. I'll get back to you soon.";
  } catch (err) {
    status.textContent = `✘ transmission failed. email me directly: ${profile.email}`;
  }
});

/* ---------- matrix rain (Devanagari + code) ---------- */
function matrixRain() {
  const cv = $("#matrix");
  const ctx = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight;
  cv.classList.add("on");
  const chars = "अआइईउऊएऐओकखगघचछजझटठडढणतथदधनपफबभमयरलवशसह०१२३४५६७८९{}<>/=;01".split("");
  const size = 18;
  const drops = Array(Math.ceil(cv.width / size)).fill(0).map(() => Math.random() * -50);
  const color = phosphorHex();
  let running = true;
  const stop = () => { running = false; cv.classList.remove("on"); removeEventListener("keydown", stop); };
  cv.onclick = stop;
  // Defer so the keypress that started the rain doesn't also stop it.
  setTimeout(() => running && addEventListener("keydown", stop), 0);
  setTimeout(stop, 15000);
  (function draw() {
    if (!running) return;
    ctx.fillStyle = "rgba(0,0,0,.08)";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.font = `${size}px "Tiro Devanagari Hindi", monospace`;
    drops.forEach((y, i) => {
      ctx.fillStyle = Math.random() > 0.975 ? "#fff" : color;
      ctx.fillText(chars[(Math.random() * chars.length) | 0], i * size, y * size);
      drops[i] = y * size > cv.height && Math.random() > 0.975 ? 0 : y + 1;
    });
    if (Math.random() > 0.995) {
      ctx.fillStyle = "#fff"; ctx.font = `48px "Tiro Devanagari Hindi"`;
      ctx.fillText("नमस्ते", cv.width / 2 - 70, cv.height / 2);
    }
    requestAnimationFrame(draw);
  })();
}

/* ---------- terminal + konami ---------- */
const term = initTerminal({ onTheme: setPhosphor, onMatrix: matrixRain });
document.querySelectorAll("[data-open-terminal]").forEach((b) => b.addEventListener("click", term.open));
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let kPos = 0;
addEventListener("keydown", (e) => {
  const typing = e.target.matches("input, textarea");
  if (e.key === "`" && !typing) { e.preventDefault(); term.toggle(); return; }
  if (typing) return;
  kPos = e.key === KONAMI[kPos] ? kPos + 1 : e.key === KONAMI[0] ? 1 : 0;
  if (kPos === KONAMI.length) { kPos = 0; matrixRain(); }
});
console.log("%c> hey, you opened devtools. press ` on the page for the real terminal.", `color:${phosphorHex()};font-family:monospace;font-size:14px`);

/* ---------- go ---------- */
import("./hero3d.js")
  .then((m) => { hero = m.initHero($("#hero-canvas"), { reducedMotion }); hero?.setColor(phosphorHex()); })
  .catch(() => {})
  .finally(initScroll);
loadGitHub();
boot();

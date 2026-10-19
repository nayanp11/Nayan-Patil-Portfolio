import { profile, projects, skills, experience } from "./data.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const link = (href, text = href) => `<a href="${href}" target="_blank" rel="noopener">${esc(text)}</a>`;

const NEOFETCH = String.raw`
    _   __   ____         nayan@portfolio
   / | / /  / __ \        ---------------
  /  |/ /  / /_/ /        OS: NayanOS 26.10 (chai edition)
 / /|  /  / ____/         Host: Navi Mumbai, IN
/_/ |_/  /_/              Role: ${profile.role}
                          Shell: zsh + javascript
                          Uptime: since 2020 (B.Sc. CS)
                          Packages: react, node, mongodb, python, sql
                          Security: AES-256-GCM, WebAuthn
                          Fuel: cutting chai ☕ (refills: ∞)`;

const CHAI = [
  String.raw`
       (  )   (   )  )
        ) (   )  (  (
        ( )  (    ) )
       _____________
      <_____________> ___
      |             |/ _ \
      |   C H A I   | | | |
      |             |_| |_|
   ___|_____________|\___/___
  \_________________________/`,
  String.raw`
        (   )  (  )  (
       )  (   )  ) (
        (   )(   (   )
       _____________
      <_____________> ___
      |             |/ _ \
      |   C H A I   | | | |
      |             |_| |_|
   ___|_____________|\___/___
  \_________________________/`,
];

const FILES = {
  "about.txt": () => profile.about.join("\n\n"),
  "skills.json": () => JSON.stringify(skills, null, 2),
  "contact.txt": () => `email:    ${profile.email}\nlinkedin: ${profile.linkedin}\ngithub:   ${profile.github}`,
  "secrets.env": () => "permission denied: nice try 😏",
};

export function initTerminal({ onTheme, onMatrix, onCricket }) {
  const root = document.getElementById("terminal");
  const out = document.getElementById("term-out");
  const input = document.getElementById("term-in");
  const history = [];
  let hIdx = 0;
  let greeted = false;

  const print = (html, cls = "") => {
    const div = document.createElement("div");
    if (cls) div.className = cls;
    div.innerHTML = html;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
    return div;
  };

  const commands = {
    help: {
      desc: "list commands",
      run: () =>
        Object.entries(commands)
          .filter(([, c]) => c.desc)
          .map(([k, c]) => `  ${k.padEnd(16)}${c.desc}`)
          .join("\n") + "\n\n  psst: there are hidden commands too.",
    },
    whoami: { desc: "who is this guy", run: () => `${profile.name} — ${profile.role}\n\n${profile.about.join("\n\n")}` },
    neofetch: { desc: "system info", run: () => NEOFETCH },
    projects: {
      desc: "list projects",
      run: () =>
        projects.map((p, i) => `  [${i + 1}] ${p.title.padEnd(22)}${p.stack.join(", ")}`).join("\n") +
        "\n\n  type 'open <n>' to jump to one",
    },
    open: {
      desc: "open project <n>",
      run: ([n]) => {
        const p = projects[Number(n) - 1];
        if (!p) return { err: "usage: open <1-" + projects.length + ">" };
        close();
        document.getElementById("p-" + p.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return `opening ${p.title}…`;
      },
    },
    experience: { desc: "career log", run: () => experience.map((e) => `  ${e.when.padEnd(14)}${e.title} @ ${e.org}`).join("\n") },
    skills: {
      desc: "tech stack",
      run: () => Object.entries(skills).map(([k, v]) => `  ${k.padEnd(10)}${v.join(" · ")}`).join("\n"),
    },
    github: { desc: "github profile", run: () => link(profile.github) },
    linkedin: { desc: "linkedin profile", run: () => link(profile.linkedin) },
    resume: {
      desc: "download resume",
      run: () => {
        window.open(profile.resume, "_blank");
        return "opening resume.pdf…";
      },
    },
    contact: { desc: "get in touch", run: () => `email:    ${link("mailto:" + profile.email, profile.email)}\nlinkedin: ${link(profile.linkedin)}` },
    theme: {
      desc: "theme green|amber",
      run: ([t]) => {
        if (!["green", "amber"].includes(t)) return { err: "usage: theme green|amber" };
        onTheme(t);
        return `phosphor set to ${t}`;
      },
    },
    play: {
      desc: "play cricket 🏏",
      run: ([g]) => {
        if (g !== "cricket") return { err: "usage: play cricket" };
        close();
        onCricket();
        return "padding up… 🏏";
      },
    },
    date: { desc: "time in Mumbai", run: () => new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" },
    ls: { desc: "list files", run: () => Object.keys(FILES).join("   ") },
    cat: {
      desc: "read a file",
      run: ([f]) => (FILES[f] ? esc(FILES[f]()) : { err: `cat: ${esc(f || "")}: no such file` }),
    },
    history: { desc: "command history", run: () => history.map((h, i) => `  ${i + 1}  ${esc(h)}`).join("\n") },
    clear: { desc: "clear screen", run: () => ((out.innerHTML = ""), "") },
    exit: { desc: "close terminal", run: () => (close(), "") },

    // hidden
    chai: { run: () => brewChai() },
    coffee: { run: () => "☕ 404: coffee not found. This is a chai household. Try 'chai'." },
    cricket: { run: () => "did you mean: play cricket" },
    matrix: { run: () => (close(), onMatrix(), "") },
    namaste: { run: () => "🙏 नमस्ते! Thanks for stopping by." },
    sudo: {
      run: (args) => {
        const a = args.join(" ");
        if (a === "hire-nayan" || a === "hire nayan") return hire();
        if (a.startsWith("rm")) return { err: "nice try. this portfolio is immutable (like my audit logs on Ethereum)." };
        return { err: "nayan is not in the sudoers file. This incident will be reported to his mom." };
      },
    },
    hire: { run: () => "did you mean: sudo hire-nayan" },
    pwd: { run: () => "/home/nayan/portfolio" },
    cd: { run: () => "you're already where you need to be." },
    echo: { run: (args) => esc(args.join(" ")) },
  };

  function brewChai() {
    const pre = print("", "");
    let i = 0;
    const id = setInterval(() => {
      pre.textContent = CHAI[i++ % 2];
      out.scrollTop = out.scrollHeight;
      if (i > 12) {
        clearInterval(id);
        print("chai break mode: ON ☕  — brewing patience, debugging later.");
      }
    }, 300);
    return null;
  }

  function hire() {
    const steps = ["[sudo] verifying recruiter credentials… ok", "checking skills… ok", "checking chai supply… ok", "compiling offer letter… ██████████ 100%"];
    steps.forEach((s, i) => setTimeout(() => print(s), i * 450));
    setTimeout(
      () => print(`\n✔ hire-nayan succeeded.\n  next step: ${link("mailto:" + profile.email + "?subject=Let's%20work%20together", profile.email)}`),
      steps.length * 450
    );
    return null;
  }

  function run(raw) {
    const line = raw.trim();
    print(`<span class="prompt">nayan@portfolio:~$</span> ${esc(line)}`, "cmd");
    if (!line) return;
    history.push(line);
    hIdx = history.length;
    const [name, ...args] = line.split(/\s+/);
    const cmd = commands[name.toLowerCase()];
    if (!cmd) return print(`command not found: ${esc(name)}. type 'help'.`, "err");
    const res = cmd.run(args);
    if (res && typeof res === "object") print(res.err, "err");
    else if (res) print(res);
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      run(input.value);
      input.value = "";
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hIdx > 0) input.value = history[--hIdx];
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      hIdx = Math.min(history.length, hIdx + 1);
      input.value = history[hIdx] || "";
    } else if (e.key === "Tab") {
      e.preventDefault();
      const match = Object.keys(commands).filter((c) => commands[c].desc && c.startsWith(input.value));
      if (match.length === 1) input.value = match[0] + " ";
      else if (match.length) print(match.join("   "));
    } else if (e.key === "Escape" || e.key === "`") {
      e.preventDefault();
      close();
    }
  });
  document.getElementById("term-close").addEventListener("click", () => close());
  root.addEventListener("click", () => input.focus());

  function open() {
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    if (!greeted) {
      greeted = true;
      print(`NayanOS 26.10 — type <b>help</b> to begin. try <b>neofetch</b>.\n`);
    }
    input.focus();
    setTimeout(() => input.focus(), 50);
  }
  function close() {
    root.classList.remove("open");
    root.setAttribute("aria-hidden", "true");
    input.blur();
  }
  const isOpen = () => root.classList.contains("open");

  return { open, close, toggle: () => (isOpen() ? close() : open()), isOpen };
}

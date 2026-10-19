// Single source of truth for site content. Update this file when the resume changes;
// the page sections and the terminal both read from here.

export const profile = {
  name: "Nayan Patil",
  role: "Software Developer",
  location: "Navi Mumbai, IN",
  coords: "19.03°N 73.02°E",
  email: "nayancpatil10@gmail.com",
  github: "https://github.com/nayanp11",
  githubUser: "nayanp11",
  linkedin: "https://www.linkedin.com/in/nayan-patil-02914a23a/",
  resume: "assets/Nayan Patil Resume.pdf",
  taglines: [
    "builds full-stack web apps",
    "takes machines apart to see how they work",
    "encrypts things for fun",
    "turns ideas into 3D prints",
    "breaks things (ethically)",
    "runs on chai & javascript",
  ],
  about: [
    "I'm a software developer from Navi Mumbai, and I've always been curious about how things work. As a kid that meant opening up whatever machine I could get a screwdriver into. Now it mostly means code: I like building things end to end, from the interface people use to the APIs and data behind it.",
    "Recently I've been learning 3D printing, and I really enjoy it. I'd like to help people make things they actually want, especially students who need parts or prototypes for their projects.",
    "Away from the keyboard I play football and spend a fair amount of time on games. Basically, if it's tech, I'm interested.",
  ],
  facts: [
    ["location", "Navi Mumbai, Maharashtra"],
    ["education", "MCA · SIES College of Management Studies"],
    ["prev", "B.Sc. Computer Science · CGPA 8.36"],
    ["status", "open to software roles"],
    ["off-screen", "football, games, 3D printing"],
    ["fuel", "cutting chai ☕"],
  ],
};

// TODO(nayan): fill company name + dates for the internship from the updated resume.
export const experience = [
  {
    kind: "work",
    when: "2026",
    title: "Cybersecurity Intern",
    org: "Company TBA",
    points: ["Hands-on work in the security field. Details coming with the updated resume."],
  },
  {
    kind: "work",
    when: "2025 — now",
    title: "Founder · 3D Printing Business",
    org: "Self-employed",
    points: ["Running a small 3D printing business and building the software that powers it."],
  },
  {
    kind: "education",
    when: "2024 — now",
    title: "Master of Computer Applications",
    org: "SIES College of Management Studies, Nerul",
    points: ["Certifications: Programming in Java and Cloud Computing (NPTEL)."],
  },
  {
    kind: "education",
    when: "2020 — 2023",
    title: "B.Sc. Computer Science",
    org: "SIES College of Arts, Science & Commerce",
    points: ["Graduated with a CGPA of 8.36 / 10."],
  },
];

export const projects = [
  {
    id: "eqzone",
    title: "EQ Zone",
    subtitle: "Web-based equalizer platform",
    year: "2024—25",
    stack: ["React", "Node.js", "MongoDB", "JWT", "Web Audio"],
    image: "assets/projects/eqzone.png",
    link: "https://github.com/nayanp11/EQ-Zone--Web-Based-Equalizer-Platform",
    points: [
      "Responsive equalizer for earphones with customizable audio filters.",
      "JWT-based auth and REST APIs in Node.js.",
      "Used interaction data and feedback to find performance wins.",
    ],
  },
  {
    id: "pcbuilder",
    title: "AI PC Builder",
    subtitle: "Smart PC configuration tool",
    year: "2025",
    stack: ["React", "Node.js", "MongoDB", "Tailwind", "JWT"],
    image: "assets/projects/pcbuilder.png",
    link: "https://github.com/nayanp11/AI-Powered-PC-Builder",
    points: [
      "Suggests optimal, compatible component combinations.",
      "Rule-based recommendation engine over structured parts data.",
      "Compatibility checks and validation for every build.",
    ],
  },
  {
    id: "vault",
    title: "Decentralized Vault",
    subtitle: "Password manager · biometric + PIN",
    year: "2025",
    stack: ["MERN", "Ethereum", "IPFS", "AES-256-GCM", "WebAuthn"],
    image: "assets/projects/Passwordmanager.png",
    link: "https://github.com/nayanp11/Blockchain-Password-Manager",
    points: [
      "Client-side AES-256-GCM encryption with secure key derivation.",
      "Encrypted vaults on IPFS, immutable audit logs on Ethereum.",
      "Validated with a user survey of 80+ responses.",
    ],
  },
  {
    // TODO(nayan): real name, stack and link once the app is ready.
    id: "printapp",
    title: "Print Shop OS",
    subtitle: "App for my 3D printing business",
    year: "IN DEV",
    stack: ["In development"],
    image: null,
    link: null,
    points: [
      "Orders, quotes and print queue for a real 3D printing business.",
      "Currently being built. Watch this space.",
    ],
  },
];

export const skills = {
  frontend: ["javascript", "react", "tailwind", "html / css"],
  backend: ["node.js", "express", "rest apis", "jwt auth"],
  data: ["python", "sql", "mongodb", "power bi", "tableau"],
  security: ["aes-256-gcm", "webauthn", "blockchain / ipfs"],
  tools: ["git", "linux", "vs code", "java"],
};

// Fade-in on scroll (Intersection Observer)
const faders = document.querySelectorAll(".fade-in");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
    }
  });
});
faders.forEach(fade => observer.observe(fade));

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Creative cursor bubble effect
const bubbleCanvas = document.createElement('canvas');
bubbleCanvas.style.position = 'fixed';
bubbleCanvas.style.top = 0;
bubbleCanvas.style.left = 0;
bubbleCanvas.style.width = '100vw';
bubbleCanvas.style.height = '100vh';
bubbleCanvas.style.pointerEvents = 'none';
bubbleCanvas.style.zIndex = 9999;
document.body.appendChild(bubbleCanvas);

const ctx = bubbleCanvas.getContext('2d');
let bubbles = [];
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

function resizeCanvas() {
  bubbleCanvas.width = window.innerWidth;
  bubbleCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

document.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  // Alternate between green and grey for dual-tone effect
  const colors = [
    'rgba(76, 175, 80, 0.22)',   // Green (primary)
    'rgba(76, 175, 80, 0.45)',   // Green (accent)
    'rgba(33, 37, 41, 0.18)',    // Grey (dark)
    'rgba(120, 144, 156, 0.22)'  // Grey (light)
  ];
  // Alternate or randomize between green and grey
  const color = colors[Math.floor(Math.random() * colors.length)];
  bubbles.push({
    x: mouse.x,
    y: mouse.y,
    r: Math.random() * 8 + 8,
    alpha: 1,
    color: color,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 1.2) * 1.7
  });
});

function animateBubbles() {
  ctx.clearRect(0, 0, bubbleCanvas.width, bubbleCanvas.height);
  bubbles.forEach((b, i) => {
    ctx.globalAlpha = b.alpha;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
    b.x += b.vx;
    b.y += b.vy;
    b.alpha -= 0.012;
    b.r *= 0.985;
    if (b.alpha <= 0.02 || b.r < 2) {
      bubbles.splice(i, 1);
    }
  });
  ctx.globalAlpha = 1;
  requestAnimationFrame(animateBubbles);
}
animateBubbles();
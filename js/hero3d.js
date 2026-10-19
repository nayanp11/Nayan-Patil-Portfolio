import * as THREE from "three";

// Particle sphere that breathes, dodges the cursor and scatters as you scroll.
export function initHero(canvas, { reducedMotion }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  } catch (e) {
    return null; // no WebGL: the hero just shows text
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const COUNT = window.innerWidth < 700 ? 3500 : 7000;
  const pos = new Float32Array(COUNT * 3);
  const rnd = new Float32Array(COUNT * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    pos.set([Math.cos(t) * r * 2, y * 2, Math.sin(t) * r * 2], i * 3);
    rnd.set([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 3));

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(10, 10) },
    uScatter: { value: 0 },
    uColor: { value: new THREE.Color("#33ff77") },
    uSize: { value: renderer.getPixelRatio() * 2.4 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uScatter, uSize;
      uniform vec2 uMouse;
      attribute vec3 aRand;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float n = sin(p.x * 2.1 + uTime * .7) * sin(p.y * 2.7 + uTime * .9) * sin(p.z * 2.3 + uTime * .5);
        p *= 1.0 + n * .18;
        p += aRand * uScatter * 9.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec4 clip = projectionMatrix * mv;
        vec2 ndc = clip.xy / clip.w;
        vec2 d = ndc - uMouse;
        float f = smoothstep(.35, .0, length(d));
        clip.xy += normalize(d + 1e-4) * f * .25 * clip.w;
        gl_Position = clip;
        gl_PointSize = uSize * (5.0 / -mv.z) * (1.0 + f);
        vAlpha = (.3 + .7 * (1.0 - smoothstep(4.0, 8.0, -mv.z))) * (1.0 - uScatter * .6);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - .5);
        if (d > .5) discard;
        gl_FragColor = vec4(uColor, vAlpha * smoothstep(.5, .1, d));
      }`,
  });
  const sphere = new THREE.Points(geo, mat);

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.05, 1)),
    new THREE.LineBasicMaterial({ color: uniforms.uColor.value, transparent: true, opacity: 0.35 })
  );

  const group = new THREE.Group();
  group.add(sphere, wire);
  scene.add(group);

  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Sit right of the text on wide screens, centered behind it on narrow ones.
    group.position.x = w > 900 ? 2.2 : 0;
    group.scale.setScalar(w > 900 ? 1 : 0.8);
  }
  layout();
  window.addEventListener("resize", layout);

  const target = new THREE.Vector2(10, 10);
  window.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    target.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  });

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uMouse.value.lerp(target, 0.08);
    group.rotation.y = t * 0.12 + uniforms.uMouse.value.x * 0.3;
    group.rotation.x = uniforms.uMouse.value.y * -0.2;
    wire.rotation.y = -t * 0.3;
    wire.rotation.z = t * 0.17;
    renderer.render(scene, camera);
  }
  if (reducedMotion) renderer.render(scene, camera);
  else frame();

  return {
    setScatter(v) { uniforms.uScatter.value = v; if (reducedMotion) renderer.render(scene, camera); },
    setColor(hex) { uniforms.uColor.value.set(hex); if (reducedMotion) renderer.render(scene, camera); },
  };
}

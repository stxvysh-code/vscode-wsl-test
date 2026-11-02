// ART TONIR — 3D-сцена главного экрана.
// Бокс студии: световой потолок из LED-ламп с Y-коннекторами (как в реальном боксе),
// мокрый бетонный пол с отражениями, графитовые стены, кислотно-жёлтая колонна.
// Интерактив: соты под курсором загораются золотом, по клику/тапу по потолку расходится волна света.
//
// Производительность: 2 точечных источника, сниженная плотность пикселей, 30 кадров/с в простое,
// автоматическое снижение качества на слабых устройствах, полная пауза, когда главный экран не виден.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const html = document.documentElement;
const hero = document.querySelector('[data-hero]');
const canvas = hero && hero.querySelector('.hero__gl');

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

if (hero && canvas) {
  if (!webglOK()) html.classList.add('no-gl');
  else {
    try { init(); } catch (e) { console.warn('3D отключено:', e); html.classList.add('no-gl'); }
  }
}

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 4;
  return t;
}

function init() {
  // ?shot=poster|stage — служебный режим для рендера статичных картинок (tools/render-assets.mjs)
  const SHOT = new URLSearchParams(location.search).get('shot');
  const reduce = !!SHOT || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
  const DPR_MAX = SHOT ? 1 : Math.min(devicePixelRatio || 1, coarse ? 1.15 : 1.35);
  let DPR = DPR_MAX;
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  const BG = 0x060607;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.052);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 90);
  const camBase = SHOT === 'stage' ? new THREE.Vector3(0, 1.05, 7.2) : new THREE.Vector3(0, 1.55, 6.6);
  const lookBase = SHOT === 'stage' ? new THREE.Vector3(0, 1.55, -6) : new THREE.Vector3(0.4, 1.95, -4);

  /* ---------- комната ---------- */
  const W = 11, H = 4.3, Z0 = 8, Z1 = -34;
  const roomLen = Z0 - Z1, zMid = (Z0 + Z1) / 2;

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W + 2, roomLen), new THREE.MeshLambertMaterial({ color: 0x0b0b0c }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, zMid); scene.add(ceil);

  // стены: графитовый профлист
  const prof = canvasTex(256, 32, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const k = (Math.sin((x / w) * Math.PI * 2 * 4) * 0.5 + 0.5);
      const v = Math.round(28 + k * 46);
      g.fillStyle = `rgb(${v},${v + 2},${v + 6})`; g.fillRect(x, 0, 1, h);
    }
  }, [roomLen / 2.4, 1]);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, map: prof, bumpMap: prof, bumpScale: 2.5, roughness: 0.45, metalness: 0.5 });
  const wallGeo = new THREE.PlaneGeometry(roomLen, H);
  const wl = new THREE.Mesh(wallGeo, wallMat); wl.rotation.y = Math.PI / 2; wl.position.set(-W / 2, H / 2, zMid); scene.add(wl);
  const wr = new THREE.Mesh(wallGeo, wallMat); wr.rotation.y = -Math.PI / 2; wr.position.set(W / 2, H / 2, zMid); scene.add(wr);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ color: 0x1a1b1e }));
  back.position.set(0, H / 2, Z1); scene.add(back);

  // кислотно-жёлтая кирпичная колонна (как в боксе)
  const brick = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#d8d21e'; g.fillRect(0, 0, w, h);
    const bh = 28, bw = 96;
    for (let y = 0; y < h; y += bh) {
      const off = (y / bh) % 2 ? bw / 2 : 0;
      g.fillStyle = 'rgba(60,58,0,.55)'; g.fillRect(0, y, w, 3);
      for (let x = -bw + off; x < w; x += bw) {
        g.fillRect(x, y, 3, bh);
        g.fillStyle = `rgba(255,255,200,${Math.random() * 0.12})`; g.fillRect(x + 3, y + 3, bw - 3, bh - 3);
        g.fillStyle = 'rgba(60,58,0,.55)';
      }
    }
  });
  const colMat = new THREE.MeshLambertMaterial({ map: brick, emissive: 0xd8d21e, emissiveIntensity: 0.07, emissiveMap: brick });
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.9, H, 0.9), colMat);
  column.position.set(-W / 2 + 0.45, H / 2, -6.5); scene.add(column);
  const column2 = column.clone(); column2.position.set(W / 2 - 0.45, H / 2, -19); scene.add(column2);

  // пол: отражение + пятна «мокрого бетона»
  const floorGeo = new THREE.PlaneGeometry(W, roomLen);
  const REFL = 0.4;
  const reflector = new Reflector(floorGeo, { clipBias: 0.003, textureWidth: 512, textureHeight: 512, color: 0x9a9a9a });
  reflector.rotation.x = -Math.PI / 2; reflector.position.set(0, 0, zMid); scene.add(reflector);
  const wet = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(0.6, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    const id = g.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 40; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    g.putImageData(id, 0, 0);
  }, [3, 9]);
  const concrete = new THREE.Mesh(floorGeo, new THREE.MeshLambertMaterial({ color: 0x2a2a2c, transparent: true, alphaMap: wet, opacity: 0.94, depthWrite: false }));
  concrete.rotation.x = -Math.PI / 2; concrete.position.set(0, 0.003, zMid); scene.add(concrete);

  /* ---------- световой потолок: соты из LED-ламп ---------- */
  const R = 1.35;
  const SQ = Math.sqrt(3);
  const edges = new Map();
  const verts = new Map();
  const key = (x, z) => `${x.toFixed(2)}:${z.toFixed(2)}`;
  for (let r = -2; r < Math.ceil(roomLen / (1.5 * R)) + 2; r++) {
    for (let q = -6; q <= 6; q++) {
      const cx = SQ * R * (q + (r % 2 ? 0.5 : 0));
      const cz = Z0 - 1.5 * R * r;
      if (Math.abs(cx) > W / 2 + 1 || cz < Z1 - 1 || cz > Z0 + 1) continue;
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k + Math.PI / 6;
        pts.push([cx + R * Math.cos(a), cz + R * Math.sin(a)]);
      }
      for (let k = 0; k < 6; k++) {
        const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % 6];
        const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
        if (Math.abs(mx) > W / 2 - 0.35 || mz < Z1 + 0.5 || mz > Z0) continue;
        const kk = key(mx, mz);
        if (!edges.has(kk)) edges.set(kk, { mx, mz, ang: Math.atan2(z2 - z1, x2 - x1) });
        verts.set(key(x1, z1), [x1, z1]);
      }
    }
  }
  const E = Array.from(edges.values());
  const N = E.length;
  const tubes = new THREE.InstancedMesh(new THREE.BoxGeometry(R * 0.8, 0.05, 0.085), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), N);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  const tubeCol = new THREE.Color();
  const LED = 2.1; // HDR-яркость для свечения
  const GOLD = new THREE.Color(1.0, 0.55, 0.16);
  const delays = new Float32Array(N), base = new Float32Array(N), glow = new Float32Array(N);
  E.forEach((e, i) => {
    q4.setFromAxisAngle(up, -e.ang);
    m4.compose(new THREE.Vector3(e.mx, H - 0.03, e.mz), q4, s1);
    tubes.setMatrixAt(i, m4);
    delays[i] = 0.15 + ((Z0 - e.mz) / roomLen) * 1.15 + Math.random() * 0.35;
    base[i] = reduce ? 1 : 0;
  });
  tubes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  tubes.instanceColor.setUsage(THREE.DynamicDrawUsage);
  scene.add(tubes);
  const V = Array.from(verts.values()).filter(([x, z]) => Math.abs(x) < W / 2 - 0.2 && z > Z1 && z < Z0);
  const conn = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), new THREE.MeshLambertMaterial({ color: 0x9aa0a8, emissive: 0x2a2a2a }), V.length);
  V.forEach(([x, z], i) => { m4.makeTranslation(x, H - 0.03, z); conn.setMatrixAt(i, m4); });
  scene.add(conn);

  function paintLamps() {
    for (let i = 0; i < N; i++) {
      const g = glow[i], b = base[i] * LED * (1 - 0.2 * g);   // чуть ниже яркость — золото не выгорает в белый
      tubeCol.setRGB(1 + (GOLD.r - 1) * g, 1 + (GOLD.g - 1) * g, 1 + (GOLD.b - 1) * g).multiplyScalar(b);
      tubes.setColorAt(i, tubeCol);
    }
    tubes.instanceColor.needsUpdate = true;
  }

  // освещение: мягкий общий свет + 2 точечных + направленный ключевой и золотой контровой
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x0a0a0a, 0.45));
  const pls = [];
  [[-2.6, 1.5], [2.6, -2.5]].forEach(([x, z]) => {
    const p = new THREE.PointLight(0xf2f5ff, 0, 18, 1.4);
    p.position.set(x, H - 0.5, z); scene.add(p); pls.push(p);
  });
  const PL = 16;
  const keyL = new THREE.DirectionalLight(0xfff3e0, 1.5);
  keyL.position.set(-4, 5, 7); scene.add(keyL);
  const keyRim = new THREE.DirectionalLight(0xc5a465, 0.8);
  keyRim.position.set(6, 1, -2); scene.add(keyRim);

  // пыль в свете ламп
  const dustN = coarse ? 140 : 320;
  const dpos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dpos[i * 3] = (Math.random() - 0.5) * W; dpos[i * 3 + 1] = Math.random() * H; dpos[i * 3 + 2] = 6 - Math.random() * 22; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dot = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  scene.add(new THREE.Points(dgeo, new THREE.PointsMaterial({ size: 0.035, map: dot, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff4dd })));

  /* ---------- постобработка ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.32, 0.95);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let useBloom = true;

  /* ---------- раскладка по размеру холста ---------- */
  function layout() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(DPR);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(DPR);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.fov = w / h < 0.75 ? 60 : w / h < 1.25 ? 52 : 42;   // телефон — шире угол, чтобы потолок был виден целиком
    camera.updateProjectionMatrix();
    reflector.getRenderTarget().setSize(Math.round(w * DPR * REFL), Math.round(h * DPR * REFL));
    poke();
  }
  let rzT;
  const onResize = () => { clearTimeout(rzT); rzT = setTimeout(() => { layout(); if (reduce) renderOnce(); }, 120); };
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(canvas); else addEventListener('resize', onResize);

  /* ---------- управление: камера за мышью, золотая подсветка сот, волна по клику ---------- */
  let lastPoke = performance.now();
  function poke() { lastPoke = performance.now(); }
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, cx: 0, cy: 0, over: false };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ceilPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), H - 0.03), hit = new THREE.Vector3();
  let hover = null;              // точка на потолке под курсором
  const waves = [];              // волны света от кликов
  function ceilingAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.direction.y <= 0.02) return null;
    return ray.ray.intersectPlane(ceilPlane, hit) ? { x: hit.x, z: hit.z } : null;
  }
  if (!coarse) {
    addEventListener('pointermove', (e) => {
      ptr.tx = (e.clientX / innerWidth) * 2 - 1; ptr.ty = (e.clientY / innerHeight) * 2 - 1;
      ptr.cx = e.clientX; ptr.cy = e.clientY;
      const r = hero.getBoundingClientRect();
      ptr.over = e.clientY >= r.top && e.clientY <= r.bottom;
      poke();
    }, { passive: true });
  }
  hero.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, label')) return;
    const p = ceilingAt(e.clientX, e.clientY);
    if (p) { waves.push({ x: p.x, z: p.z, t: 0 }); poke(); }
  });
  addEventListener('scroll', poke, { passive: true });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) poke(); }, { threshold: 0 }).observe(canvas);

  /* ---------- цикл ---------- */
  let started = false, introT = 0, last = performance.now(), lastDraw = 0, simT = 0;
  const tmpLook = new THREE.Vector3();
  let level = 0, samples = [];

  function intro(t) {
    let on = 0;
    for (let i = 0; i < N; i++) {
      const dt = t - delays[i];
      let b;
      if (dt < 0) b = 0;
      else if (dt < 0.42) { const n = Math.sin((t + i * 13.7) * 91.3) * 437.1; b = (n - Math.floor(n)) > 0.45 ? 1 : 0.08; }
      else b = 1;
      base[i] = b; on += b;
    }
    const k = on / N;
    pls.forEach((p) => (p.intensity = PL * k));
    colMat.emissiveIntensity = 0.07 * k;
  }

  // целевая подсветка каждой лампы: пятно под курсором + кольца волн
  function updateGlow(dt) {
    let any = false;
    if (ptr.over && !coarse) hover = ceilingAt(ptr.cx, ptr.cy); else hover = null;
    for (let w = waves.length - 1; w >= 0; w--) { waves[w].t += dt; if (waves[w].t > 2.8) waves.splice(w, 1); }
    for (let i = 0; i < N; i++) {
      let g = 0;
      if (hover) { const dx = E[i].mx - hover.x, dz = E[i].mz - hover.z; g = Math.exp(-(dx * dx + dz * dz) / 4.5); }
      for (let w = 0; w < waves.length; w++) {
        const wv = waves[w], d = Math.hypot(E[i].mx - wv.x, E[i].mz - wv.z), r = wv.t * 7, fade = 1 - wv.t / 2.8;
        g = Math.max(g, Math.exp(-((d - r) * (d - r)) / 2.2) * fade);
      }
      glow[i] += (g - glow[i]) * Math.min(1, dt * 9);   // dt здесь — реальное время
      if (glow[i] > 0.004) any = true; else glow[i] = 0;
    }
    return any || waves.length > 0;
  }

  function degrade() {
    level++;
    if (level === 1) { useBloom = false; }
    if (level === 2) { DPR = 1; layout(); }
    if (level >= 3) { DPR = 0.8; layout(); }
    samples = [];
  }

  function scrollProg() {
    const r = hero.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / r.height));
  }

  // dt — сглаженный шаг для камеры и пыли; rt — реальное время: включение ламп и волны идут
  // с одинаковой скоростью на любом устройстве, даже если кадров мало
  function draw(dt, rt) {
    simT += dt;
    if (introT < 2.4) { introT += rt; intro(introT); }
    const glowing = updateGlow(rt);
    paintLamps();

    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    const sp = scrollProg();
    camera.position.set(camBase.x + ptr.x * 0.45, camBase.y - ptr.y * 0.18 + sp * 0.5, camBase.z - sp * 3.2);
    tmpLook.set(lookBase.x + ptr.x * 0.25, lookBase.y - ptr.y * 0.1 + sp * 0.6, lookBase.z);
    camera.lookAt(tmpLook);

    const pa = dgeo.attributes.position.array;
    for (let i = 0; i < dustN; i++) { pa[i * 3 + 1] += dt * 0.05; if (pa[i * 3 + 1] > H) pa[i * 3 + 1] = 0; }
    dgeo.attributes.position.needsUpdate = true;

    if (useBloom) composer.render(); else renderer.render(scene, camera);
    return glowing;
  }

  let glowingNow = false;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    // в простое (нет мыши/скролла 2.5 с, интро закончилось, подсветка погасла) — 30 кадров в секунду
    const idle = introT >= 2.4 && !glowingNow && now - lastPoke > 2500;
    if (idle && now - lastDraw < 32) return;
    const rt = Math.min((now - last) / 1000, 0.25), dt = Math.min(rt, 0.05);
    last = now;
    glowingNow = draw(dt, rt);
    lastDraw = now;
    if (!started) { started = true; html.classList.add('gl-on'); }
    if (!idle && level < 3) {
      samples.push(now - (frame.prev || now));
      if (samples.length > 45) {
        samples.sort((a, b) => a - b);
        if (samples[Math.floor(samples.length / 2)] > 24) degrade(); else samples = [];
      }
    }
    frame.prev = now;
  }

  function renderOnce() {
    base.fill(1); glow.fill(0);
    intro(10); base.fill(1);
    paintLamps();
    camera.position.copy(camBase); camera.lookAt(lookBase);
    composer.render();
    html.classList.add('gl-on');
  }

  layout();
  paintLamps();
  if (reduce) renderOnce();
  else requestAnimationFrame(frame);
}

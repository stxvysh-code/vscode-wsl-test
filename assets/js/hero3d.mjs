// ART TONIR — 3D-сцена главного экрана.
// Бокс студии: световой потолок из LED-ламп с Y-коннекторами (как в реальном боксе),
// мокрый бетонный пол с отражениями, графитовые стены, кислотно-жёлтая колонна.
// В центре — боковое стекло автомобиля, на которое «накатывается» тонировочная плёнка.
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
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mobile = innerWidth < 760;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: 'high-performance', alpha: false });
  let DPR = Math.min(devicePixelRatio || 1, coarse ? 1.3 : 1.6);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  const BG = 0x060607;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.052);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 90);
  const camBase = new THREE.Vector3(0, 1.55, 6.6);
  const lookBase = new THREE.Vector3(0.4, 1.95, -4);

  /* ---------- комната ---------- */
  const W = 11, H = 4.3, Z0 = 8, Z1 = -34;
  const roomLen = Z0 - Z1, zMid = (Z0 + Z1) / 2;

  // потолок
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W + 2, roomLen), new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, zMid); scene.add(ceil);

  // стены: графитовый профлист
  const prof = canvasTex(256, 32, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const k = (Math.sin((x / w) * Math.PI * 2 * 4) * 0.5 + 0.5);
      const v = Math.round(28 + k * 46);
      g.fillStyle = `rgb(${v},${v + 2},${v + 6})`; g.fillRect(x, 0, 1, h);
    }
  }, [roomLen / 2.4, 1]);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a8f99, map: prof, bumpMap: prof, bumpScale: 2.5, roughness: 0.45, metalness: 0.55 });
  const wallGeo = new THREE.PlaneGeometry(roomLen, H);
  const wl = new THREE.Mesh(wallGeo, wallMat); wl.rotation.y = Math.PI / 2; wl.position.set(-W / 2, H / 2, zMid); scene.add(wl);
  const wr = new THREE.Mesh(wallGeo, wallMat); wr.rotation.y = -Math.PI / 2; wr.position.set(W / 2, H / 2, zMid); scene.add(wr);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.8 }));
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
  const colMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.85, emissive: 0xd8d21e, emissiveIntensity: 0.06, emissiveMap: brick });
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.9, H, 0.9), colMat);
  column.position.set(-W / 2 + 0.45, H / 2, -6.5); scene.add(column);
  const column2 = column.clone(); column2.position.set(W / 2 - 0.45, H / 2, -19); scene.add(column2);

  // пол: отражение + пятна «мокрого бетона»
  const floorGeo = new THREE.PlaneGeometry(W, roomLen);
  const reflector = new Reflector(floorGeo, {
    clipBias: 0.003,
    textureWidth: Math.round(innerWidth * DPR * 0.5),
    textureHeight: Math.round(innerHeight * DPR * 0.5),
    color: 0x9a9a9a,
  });
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
  const concrete = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.9, transparent: true, alphaMap: wet, opacity: 0.94, depthWrite: false }));
  concrete.rotation.x = -Math.PI / 2; concrete.position.set(0, 0.003, zMid); scene.add(concrete);

  /* ---------- световой потолок: соты из LED-ламп ---------- */
  const R = 1.35;               // радиус соты
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
  const tubeLen = R * 0.8;
  const tubeGeo = new THREE.BoxGeometry(tubeLen, 0.05, 0.085);
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const tubes = new THREE.InstancedMesh(tubeGeo, tubeMat, E.length);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  const tubeCol = new THREE.Color();
  const LED = 2.1; // HDR-яркость для bloom
  const delays = [];
  const zSpan = Z0 - Z1;
  E.forEach((e, i) => {
    q4.setFromAxisAngle(up, -e.ang);
    m4.compose(new THREE.Vector3(e.mx, H - 0.03, e.mz), q4, s1);
    tubes.setMatrixAt(i, m4);
    delays.push(0.15 + ((Z0 - e.mz) / zSpan) * 1.15 + Math.random() * 0.35);
    tubes.setColorAt(i, tubeCol.setScalar(reduce ? LED : 0));
  });
  tubes.instanceColor.setUsage(THREE.DynamicDrawUsage);
  scene.add(tubes);
  // Y-коннекторы
  const V = Array.from(verts.values()).filter(([x, z]) => Math.abs(x) < W / 2 - 0.2 && z > Z1 && z < Z0);
  const conn = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.4, metalness: 0.6, emissive: 0x222222 }), V.length);
  V.forEach(([x, z], i) => { m4.makeTranslation(x, H - 0.03, z); conn.setMatrixAt(i, m4); });
  scene.add(conn);

  // освещение (имитация света ламп)
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x0a0a0a, 0.25));
  const pls = [];
  [[-2.4, 3], [2.4, 3], [-2.4, -3.5], [2.4, -3.5], [0, -10], [0, -17]].forEach(([x, z]) => {
    const p = new THREE.PointLight(0xf2f5ff, 0, 14, 1.6);
    p.position.set(x, H - 0.5, z); scene.add(p); pls.push(p);
  });
  const PL = 9;
  const keyL = new THREE.DirectionalLight(0xfff3e0, 1.4);
  keyL.position.set(-4, 5, 7); scene.add(keyL);
  const keyRim = new THREE.DirectionalLight(0xc5a465, 0.8);
  keyRim.position.set(6, 1, -2); scene.add(keyRim);

  /* ---------- стекло с тонировкой ---------- */
  const env = (() => {
    const es = new THREE.Scene();
    es.background = new THREE.Color(0x030303);
    const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 4.3) });
    for (let i = 0; i < 26; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.12), sm);
      b.position.set((Math.random() - 0.5) * 10, 3.6, (Math.random() - 0.5) * 10);
      b.rotation.y = Math.floor(Math.random() * 3) * (Math.PI / 3);
      es.add(b);
    }
    const y = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.85, 0.05) }));
    y.position.set(-4, 1.5, -2); es.add(y);
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromScene(es, 0.03);
    pm.dispose();
    return rt.texture;
  })();

  const shape = new THREE.Shape();
  shape.moveTo(-1.62, -0.56);
  shape.lineTo(1.42, -0.56);
  shape.quadraticCurveTo(1.56, -0.56, 1.56, -0.42);
  shape.lineTo(1.56, 0.44);
  shape.quadraticCurveTo(1.56, 0.6, 1.38, 0.63);
  shape.quadraticCurveTo(0.45, 0.76, -0.38, 0.6);
  shape.quadraticCurveTo(-1.02, 0.44, -1.58, -0.36);
  shape.quadraticCurveTo(-1.7, -0.56, -1.62, -0.56);

  const glassGroup = new THREE.Group();
  const glassGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 32 });
  glassGeo.translate(0, 0, -0.0175);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.35, ior: 1.5,
    envMap: env, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, attenuationColor: new THREE.Color(0.85, 0.95, 0.92), attenuationDistance: 2.5,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glassGroup.add(glass);

  const filmGeo = new THREE.ShapeGeometry(shape, 32);
  filmGeo.computeBoundingBox();
  const bb = filmGeo.boundingBox;
  const filmMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      uProg: { value: reduce ? 1 : 0 }, uTint: { value: 0.6 }, uTime: { value: 0 },
      uMin: { value: new THREE.Vector2(bb.min.x, bb.min.y) }, uMax: { value: new THREE.Vector2(bb.max.x, bb.max.y) },
    },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uProg, uTint, uTime; uniform vec2 uMin, uMax; varying vec2 vP;
      void main(){
        vec2 p = (vP - uMin) / (uMax - uMin);
        float x = p.x + (p.y - 0.5) * 0.16;
        float edge = uProg * 1.2 - 0.1;
        float covered = smoothstep(edge + 0.006, edge - 0.006, x);
        float alpha = covered * mix(0.06, 0.94, uTint);
        vec3 col = vec3(0.010, 0.010, 0.014);
        float live = step(0.001, uProg) * step(uProg, 0.999);
        float glint = exp(-abs(x - edge) * 60.0) * live;
        float ahead = smoothstep(edge + 0.3, edge, x) * (1.0 - covered) * live;
        float s = fract(p.x * 0.7 - p.y * 0.5 - uTime * 0.045);
        float stripe = smoothstep(0.05, 0.0, abs(s - 0.5)) * covered * 0.16;
        col += vec3(1.0, 0.9, 0.7) * glint * 2.2 + vec3(0.85, 0.9, 1.0) * stripe * 2.0;
        alpha = clamp(alpha + glint * 0.85 + ahead * 0.10 + stripe, 0.0, 1.0);
        gl_FragColor = vec4(col + vec3(0.6, 0.75, 0.8) * ahead * 0.25, alpha);
      }`,
  });
  const film = new THREE.Mesh(filmGeo, filmMat);
  film.position.z = 0.032;
  glassGroup.add(film);

  // золотая окантовка
  const pts = shape.getPoints(80).map((p) => new THREE.Vector3(p.x, p.y, 0));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const rim = new THREE.Mesh(new THREE.TubeGeometry(curve, 260, 0.016, 8, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.77 * 1.6, 0.64 * 1.6, 0.4 * 1.6), toneMapped: false }));
  glassGroup.add(rim);

  // фрагмент двери: глянцевый чёрный лак, в котором отражаются лампы
  const door = new THREE.Shape();
  door.moveTo(-1.95, -0.66);
  door.lineTo(1.78, -0.66);
  door.quadraticCurveTo(1.86, -0.66, 1.86, -0.74);
  door.lineTo(1.86, -1.62);
  door.quadraticCurveTo(1.86, -1.86, 1.62, -1.88);
  door.lineTo(-1.5, -1.88);
  door.quadraticCurveTo(-1.86, -1.86, -1.92, -1.5);
  door.quadraticCurveTo(-2.04, -1.0, -1.95, -0.66);
  const doorGeo = new THREE.ExtrudeGeometry(door, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 6, curveSegments: 24 });
  doorGeo.translate(0, 0, -0.1);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xe9e9e6, metalness: 0.15, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.03, envMap: env, envMapIntensity: 1.3 });
  glassGroup.add(new THREE.Mesh(doorGeo, paint));
  // ручка двери
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x111113, metalness: 0.8, roughness: 0.15, clearcoat: 1, envMap: env, envMapIntensity: 2 }));
  handle.position.set(0.95, -0.98, 0.04);
  glassGroup.add(handle);
  // уплотнитель по линии окна
  const seal = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.05, 0.06), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.7 }));
  seal.position.set(-0.04, -0.6, 0.0);
  glassGroup.add(seal);
  scene.add(glassGroup);

  // пыль в свете ламп
  const dustN = mobile ? 180 : 420;
  const dpos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dpos[i * 3] = (Math.random() - 0.5) * W; dpos[i * 3 + 1] = Math.random() * H; dpos[i * 3 + 2] = 6 - Math.random() * 22; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dot = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: 0.035, map: dot, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff4dd }));
  scene.add(dust);

  /* ---------- постобработка ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.42, 0.32, 0.95);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let useBloom = true;

  /* ---------- раскладка под экран ---------- */
  function layout() {
    mobile = innerWidth < 760;
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(DPR);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 58 : 42;
    camera.updateProjectionMatrix();
    reflector.getRenderTarget().setSize(Math.round(w * DPR * 0.5), Math.round(h * DPR * 0.5));
    glassGroup.visible = w / h >= 0.8;
    if (w / h < 0.8) { // портрет / телефон: только световой потолок
      glassGroup.position.set(0.55, 2.95, -1.4);
      glassGroup.scale.setScalar(0.56);
    } else if (w < 1180) {
      glassGroup.position.set(2.3, 2.4, -1.0);
      glassGroup.scale.setScalar(0.64);
    } else {
      glassGroup.position.set(2.75, 2.42, -0.8);
      glassGroup.scale.setScalar(0.72);
    }
    glassBase.copy(glassGroup.position);
  }
  const glassBase = new THREE.Vector3();
  layout();
  addEventListener('resize', () => { layout(); if (reduce) renderOnce(); });

  /* ---------- управление ---------- */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { ptr.tx = (e.clientX / innerWidth) * 2 - 1; ptr.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  let tintTarget = 0.6;
  const hudIn = document.querySelector('[data-hud-in]');
  const hudOut = document.querySelector('[data-hud-out]');
  if (hudIn) {
    const upd = () => {
      tintTarget = hudIn.value / 100;
      if (hudOut) hudOut.textContent = hudIn.value + '%';
      hudIn.style.setProperty('--p', (hudIn.value / hudIn.max) * 100 + '%');
      if (reduce) { filmMat.uniforms.uTint.value = tintTarget; renderOnce(); }
    };
    hudIn.addEventListener('input', upd); upd();
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);

  /* ---------- цикл ---------- */
  const clock = new THREE.Clock();
  let started = false, introT = 0, filmStart = 2.0, slow = 0, frames = 0;
  const tmpLook = new THREE.Vector3();

  function setLights(t) {
    let on = 0;
    for (let i = 0; i < E.length; i++) {
      const dt = t - delays[i];
      let b;
      if (dt < 0) b = 0;
      else if (dt < 0.42) { const n = Math.sin((t + i * 13.7) * 91.3) * 437.1; b = (n - Math.floor(n)) > 0.45 ? 1 : 0.08; }
      else b = 1;
      on += b;
      tubes.setColorAt(i, tubeCol.setScalar(b * LED));
    }
    tubes.instanceColor.needsUpdate = true;
    const k = on / E.length;
    pls.forEach((p) => (p.intensity = PL * k));
    colMat.emissiveIntensity = 0.06 * k;
    return k;
  }

  function scrollProg() {
    const r = hero.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / r.height));
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (!started) { started = true; html.classList.add('gl-on'); }

    // интро: лампы включаются, затем плёнка накатывается
    if (introT < 2.4) { introT += dt; setLights(introT); }
    if (introT > filmStart && filmMat.uniforms.uProg.value < 1) {
      filmMat.uniforms.uProg.value = Math.min(1, filmMat.uniforms.uProg.value + dt / 1.7);
    }
    filmMat.uniforms.uTime.value = t;
    filmMat.uniforms.uTint.value += (tintTarget - filmMat.uniforms.uTint.value) * Math.min(1, dt * 6);

    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    const sp = scrollProg();
    camera.position.set(camBase.x + ptr.x * 0.45, camBase.y - ptr.y * 0.18 + sp * 0.5, camBase.z - sp * 3.2);
    tmpLook.set(lookBase.x + ptr.x * 0.25, lookBase.y - ptr.y * 0.1 + sp * 0.6, lookBase.z);
    camera.lookAt(tmpLook);

    glassGroup.position.set(glassBase.x, glassBase.y + Math.sin(t * 0.9) * 0.05, glassBase.z);
    glassGroup.rotation.set(0.04 + ptr.y * 0.08 + Math.sin(t * 0.6) * 0.02, -0.5 + ptr.x * 0.28 + Math.sin(t * 0.4) * 0.05 - sp * 0.6, 0.015);

    const pa = dgeo.attributes.position.array;
    for (let i = 0; i < dustN; i++) { pa[i * 3 + 1] += dt * 0.05; if (pa[i * 3 + 1] > H) pa[i * 3 + 1] = 0; }
    dgeo.attributes.position.needsUpdate = true;

    if (useBloom) composer.render(); else renderer.render(scene, camera);

    // адаптивное качество
    frames++;
    if (frames > 30 && frames < 150 && dt > 0.034) slow++;
    if (slow > 50 && useBloom) { useBloom = false; DPR = 1; renderer.setPixelRatio(1); layout(); }
  }

  function renderOnce() {
    setLights(10);
    filmMat.uniforms.uProg.value = 1;
    camera.position.copy(camBase); camera.lookAt(lookBase);
    glassGroup.rotation.set(0.04, -0.5, 0.015);
    composer.render();
    html.classList.add('gl-on');
  }

  if (reduce) renderOnce();
  else requestAnimationFrame(frame);
}

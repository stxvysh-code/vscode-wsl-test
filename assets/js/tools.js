/* ART TONIR — интерактивные визуализаторы и онлайн-запись */
(function () {
  'use strict';
  var d = document, w = window;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var DATA = w.AT_DATA || { services: [] };
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var money = function (n) { return n.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽'; };
  var waLink = function (t) { return DATA.wa + '?text=' + encodeURIComponent(t); };
  var svcBy = function (name) { return DATA.services.find(function (s) { return s.name === name; }); };
  var dpr = Math.min(w.devicePixelRatio || 1, 2);

  function fillRange(r) { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%'); }
  $$('input[type="range"]').forEach(function (r) { fillRange(r); r.addEventListener('input', function () { fillRange(r); }); });

  function radios(group, attr, cb) {
    var btns = $$('[' + attr + ']', group);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-checked', x === b); });
        cb(b.getAttribute(attr));
      });
    });
  }

  function whenVisible(el, cb) {
    if (!('IntersectionObserver' in w)) return cb(true);
    new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting); }); }, { threshold: 0.05 }).observe(el);
  }

  function sizeCanvas(cv) {
    var r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    return { w: r.width, h: r.height };
  }

  /* ---------- 1. Тонировка ---------- */
  $$('[data-tool="tint"]').forEach(function (root) {
    var car = $('.car', root), front = $('.tint--front', root);
    var rear = $('[data-in="rear"]', root), outR = $('[data-out="rear"]', root), outS = $('[data-out="sum"]', root), btn = $('[data-tool-wa]', root);
    var mode = 'none';
    var P = {
      rear: (svcBy('Тонирование задней полусферы') || { price: 8000 }).price,
      athermal: (svcBy('Атермальное тонирование') || { price: 5000 }).price,
      gost: (svcBy('Тонирование по ГОСТ / хамелеон') || { price: 8000 }).price,
    };
    var FRONT = { none: [0, '#000'], athermal: [0.16, '#2d6b6a'], gost: [0.3, '#050506'], chameleon: [0.55, ''] };
    var NAMES = { none: 'без плёнки', athermal: 'атермальная плёнка', gost: 'тонирование по ГОСТ', chameleon: 'плёнка «хамелеон»' };
    function upd() {
      var v = +rear.value;
      car.style.setProperty('--tint-rear', Math.min(0.985, Math.pow(v / 100, 0.7)));
      outR.textContent = v + '%';
      var f = FRONT[mode];
      car.style.setProperty('--tint-front', f[0]);
      if (f[1]) car.style.setProperty('--front-col', f[1]);
      front.classList.toggle('is-cham', mode === 'chameleon');
      var sum = (v > 0 ? P.rear : 0) + (mode === 'athermal' ? P.athermal : (mode === 'gost' || mode === 'chameleon') ? P.gost : 0);
      outS.textContent = sum ? 'от ' + money(sum) : '—';
      var parts = [];
      if (v > 0) parts.push('тонирование задней полусферы (на сайте выбрал затемнение ≈' + v + '%)');
      if (mode !== 'none') parts.push('передние стёкла — ' + NAMES[mode]);
      btn.href = waLink('Здравствуйте! Хочу записаться в ART TONIR на тонировку: ' + (parts.length ? parts.join('; ') : 'нужна консультация') + '.');
    }
    rear.addEventListener('input', upd);
    radios(root, 'data-front', function (m) { mode = m; upd(); });
    upd();
    // лёгкая «демо-анимация» ползунка при первом показе
    if (!reduce) {
      var done = false;
      whenVisible(root, function (vis) {
        if (!vis || done) return; done = true;
        var t0 = performance.now(), from = 0, to = +rear.value;
        (function step(t) {
          var k = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - k, 3);
          rear.value = Math.round(from + (to - from) * e); fillRange(rear); upd();
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }
  });

  /* ---------- 2. Цвет / винил ---------- */
  $$('[data-tool="color"]').forEach(function (root) {
    var car = $('.car', root), btn = $('[data-tool-wa]', root), anti = $('[data-antichrome]', root), outS = $('[data-out="sum"]', root);
    var color = '#4f5a3a', colorName = 'Олива', finish = 'gloss';
    var FIN = { gloss: 'глянец', satin: 'сатин', matte: 'мат' };
    var pc = (svcBy('Замена цвета / мат / глянец') || { price: 150000 }).price;
    var pa = (svcBy('Антихром') || { price: 5000 }).price;
    function upd() {
      car.style.setProperty('--body', color);
      car.setAttribute('data-finish', finish);
      car.classList.toggle('is-antichrome', anti.checked);
      outS.textContent = 'от ' + money(pc + (anti.checked ? pa : 0));
      btn.href = waLink('Здравствуйте! Хочу обсудить замену цвета в ART TONIR: на сайте примерил цвет «' + colorName + '», ' + FIN[finish] + (anti.checked ? ', плюс антихром' : '') + '.');
    }
    $$('[data-color]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-color]', root).forEach(function (x) { x.setAttribute('aria-checked', x === b); });
        color = b.getAttribute('data-color'); colorName = b.getAttribute('aria-label'); upd();
      });
    });
    radios(root, 'data-finish', function (f) { finish = f; upd(); });
    anti.addEventListener('change', upd);
    upd();
  });

  /* ---------- 3. Камень в капот (антигравийная плёнка) ---------- */
  $$('[data-tool="stone"]').forEach(function (root) {
    var stage = $('.tool__stage', root), cv = $('canvas', stage), g = cv.getContext('2d');
    var film = $('[data-film]', root), outC = $('[data-out="chips"]', root), outState = $('[data-out="state"]', root);
    var S = sizeCanvas(cv), chips = [], stones = [], rings = [], debris = [], count = 0, running = false, last = 0, auto = 0;
    w.addEventListener('resize', function () { S = sizeCanvas(cv); });
    film.addEventListener('change', function () {
      outState.textContent = film.checked ? 'Плёнка: включена' : 'Плёнка: выключена';
      if (film.checked) { chips = []; count = 0; outC.textContent = '0'; }
    });
    function throwAt(x, y) {
      var sx = x + (Math.random() - 0.5) * S.w * 0.4, sy = S.h + 30;
      stones.push({ x: sx, y: sy, tx: x, ty: y, t: 0, dur: 0.32 + Math.random() * 0.12, r: 3 + Math.random() * 4, rot: Math.random() * 6 });
    }
    stage.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect();
      throwAt(e.clientX - r.left, e.clientY - r.top);
      auto = 4;
    });
    function impact(s) {
      if (film.checked) {
        rings.push({ x: s.tx, y: s.ty, t: 0 });
        for (var i = 0; i < 6; i++) debris.push({ x: s.tx, y: s.ty, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260 - 60, t: 0, c: '#9a9590' });
      } else {
        var spikes = [];
        for (var k = 0; k < 7; k++) spikes.push({ a: Math.random() * Math.PI * 2, l: 4 + Math.random() * 10 });
        chips.push({ x: s.tx, y: s.ty, r: 2.5 + Math.random() * 3.5, spikes: spikes });
        count++; outC.textContent = count;
        for (var j = 0; j < 8; j++) debris.push({ x: s.tx, y: s.ty, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 200, t: 0, c: '#f5f3ef' });
      }
    }
    function drawPanel() {
      var W = S.w, H = S.h;
      var gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#2b2e33'); gr.addColorStop(0.35, '#121315'); gr.addColorStop(0.36, '#0c0c0e'); gr.addColorStop(1, '#050506');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // отражения ламп на лаке
      g.save(); g.globalAlpha = 0.85;
      g.strokeStyle = 'rgba(244,247,255,.85)'; g.lineWidth = 3; g.lineCap = 'round';
      g.shadowColor = 'rgba(244,247,255,.9)'; g.shadowBlur = 14;
      var lines = [[0.12, 0.16, 0.36, 0.1], [0.36, 0.1, 0.46, 0.2], [0.46, 0.2, 0.72, 0.14], [0.72, 0.14, 0.86, 0.22], [0.2, 0.3, 0.42, 0.26]];
      lines.forEach(function (l) { g.beginPath(); g.moveTo(l[0] * W, l[1] * H); g.lineTo(l[2] * W, l[3] * H); g.stroke(); });
      g.restore();
      // изгиб капота
      var hl = g.createLinearGradient(0, H * 0.5, 0, H * 0.62);
      hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.5, 'rgba(255,255,255,.06)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = hl; g.fillRect(0, H * 0.5, W, H * 0.12);
      if (film.checked) {
        g.save();
        g.strokeStyle = 'rgba(230,207,152,.55)'; g.lineWidth = 1.5; g.setLineDash([6, 6]);
        g.strokeRect(14, 14, W - 28, H - 28);
        var fg = g.createLinearGradient(0, 0, W, H);
        fg.addColorStop(0, 'rgba(255,255,255,.05)'); fg.addColorStop(0.5, 'rgba(255,255,255,0)'); fg.addColorStop(1, 'rgba(197,164,101,.06)');
        g.fillStyle = fg; g.fillRect(14, 14, W - 28, H - 28);
        g.restore();
      }
    }
    function loop(t) {
      if (!running) return;
      requestAnimationFrame(loop);
      var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      auto -= dt;
      if (auto < 0) { auto = 1.1 + Math.random() * 0.8; throwAt(S.w * (0.2 + Math.random() * 0.6), S.h * (0.25 + Math.random() * 0.5)); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPanel();
      chips.forEach(function (c) {
        g.save(); g.translate(c.x, c.y);
        g.strokeStyle = 'rgba(245,243,239,.55)'; g.lineWidth = 1;
        c.spikes.forEach(function (s) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(s.a) * s.l, Math.sin(s.a) * s.l); g.stroke(); });
        g.fillStyle = '#d9d6d0'; g.beginPath(); g.arc(0, 0, c.r, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#6b6e72'; g.beginPath(); g.arc(0.6, 0.6, c.r * 0.55, 0, Math.PI * 2); g.fill();
        g.restore();
      });
      rings = rings.filter(function (r) {
        r.t += dt; var k = r.t / 0.7; if (k > 1) return false;
        g.strokeStyle = 'rgba(230,207,152,' + (1 - k) + ')'; g.lineWidth = 2;
        g.beginPath(); g.arc(r.x, r.y, 6 + k * 46, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(216,210,30,' + (0.6 - k * 0.6) + ')';
        g.beginPath(); g.arc(r.x, r.y, 3 + k * 22, 0, Math.PI * 2); g.stroke();
        return true;
      });
      debris = debris.filter(function (p) {
        p.t += dt; if (p.t > 0.8) return false;
        p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        g.fillStyle = p.c; g.globalAlpha = 1 - p.t / 0.8; g.fillRect(p.x, p.y, 2, 2); g.globalAlpha = 1;
        return true;
      });
      stones = stones.filter(function (s) {
        s.t += dt; var k = Math.min(1, s.t / s.dur);
        var x = s.x + (s.tx - s.x) * k, y = s.y + (s.ty - s.y) * k - Math.sin(k * Math.PI) * 30;
        var sc = 2.4 - k * 1.4;
        g.save(); g.translate(x, y); g.rotate(s.rot + k * 8); g.scale(sc, sc);
        g.fillStyle = '#8b857c'; g.beginPath(); g.moveTo(-s.r, 0); g.lineTo(-s.r * 0.3, -s.r); g.lineTo(s.r, -s.r * 0.4); g.lineTo(s.r * 0.7, s.r * 0.8); g.lineTo(-s.r * 0.6, s.r); g.closePath(); g.fill();
        g.restore();
        if (k >= 1) { impact(s); return false; }
        return true;
      });
    }
    whenVisible(stage, function (vis) { if (vis && !running) { running = true; S = sizeCanvas(cv); requestAnimationFrame(loop); } else if (!vis) running = false; });
  });

  /* ---------- 4. Шумоизоляция: синтез звука дороги ---------- */
  $$('[data-tool="noise"]').forEach(function (root) {
    var playBtn = $('[data-noise-play]', root), iso = $('[data-iso]', root), cv = $('canvas', root), g = cv.getContext('2d'), outState = $('[data-out="state"]', root);
    var S = sizeCanvas(cv), ctx = null, master, lp, an, buf, playing = false, running = false, phase = 0, level = 1, levelT = 1;
    w.addEventListener('resize', function () { S = sizeCanvas(cv); });
    function build() {
      var AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      var len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), ch = b.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) { var wht = Math.random() * 2 - 1; last = (last + 0.02 * wht) / 1.02; ch[i] = last * 3.2 + wht * 0.035; }
      var src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
      var rumble = ctx.createOscillator(); rumble.type = 'sawtooth'; rumble.frequency.value = 42;
      var rg = ctx.createGain(); rg.gain.value = 0.05;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.35; var lg = ctx.createGain(); lg.gain.value = 0.03; lfo.connect(lg); lg.connect(rg.gain);
      lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000; lp.Q.value = 0.4;
      master = ctx.createGain(); master.gain.value = 0;
      an = ctx.createAnalyser(); an.fftSize = 256; buf = new Uint8Array(an.frequencyBinCount);
      src.connect(lp); rumble.connect(rg); rg.connect(lp); lp.connect(master); master.connect(an); an.connect(ctx.destination);
      src.start(); rumble.start(); lfo.start();
      return true;
    }
    function applyIso() {
      levelT = iso.checked ? 0.38 : 1;
      outState.textContent = iso.checked ? 'С шумоизоляцией' : 'Без шумоизоляции';
      if (!ctx) return;
      var t = ctx.currentTime;
      lp.frequency.cancelScheduledValues(t); lp.frequency.setTargetAtTime(iso.checked ? 520 : 9000, t, 0.25);
      if (playing) { master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(iso.checked ? 0.16 : 0.42, t, 0.25); }
    }
    playBtn.addEventListener('click', function () {
      if (!ctx && !build()) { playBtn.querySelector('span').textContent = 'Звук не поддерживается'; return; }
      if (ctx.state === 'suspended') ctx.resume();
      playing = !playing;
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(playing ? (iso.checked ? 0.16 : 0.42) : 0, t, 0.2);
      playBtn.querySelector('span').textContent = playing ? 'Выключить звук' : 'Включить звук дороги';
      playBtn.classList.toggle('is-added', playing);
    });
    iso.addEventListener('change', applyIso);
    applyIso();
    function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var W = S.w, H = S.h;
      g.clearRect(0, 0, W, H);
      level += (levelT - level) * 0.06;
      phase += 0.03;
      var bars = 48, bw = W / bars;
      if (playing && an) an.getByteFrequencyData(buf);
      for (var i = 0; i < bars; i++) {
        var hi = i / bars;
        var v;
        if (playing && an) v = buf[Math.floor(i * 1.2)] / 255;
        else v = 0.25 + 0.55 * Math.abs(Math.sin(phase * 1.3 + i * 0.45) * Math.cos(phase * 0.7 + i * 0.13));
        v *= level * (1 - hi * (1 - level) * 0.9);
        var bh = Math.max(4, v * H * 0.7);
        var x = i * bw + bw * 0.2, y = H / 2 - bh / 2;
        var gr = g.createLinearGradient(0, y, 0, y + bh);
        gr.addColorStop(0, level > 0.7 ? 'rgba(216,210,30,.95)' : 'rgba(230,207,152,.95)'); gr.addColorStop(1, 'rgba(197,164,101,.25)');
        g.fillStyle = gr;
        g.beginPath();
        if (g.roundRect) g.roundRect(x, y, bw * 0.6, bh, 3); else g.rect(x, y, bw * 0.6, bh);
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, H / 2, W, 1);
    }
    whenVisible(root, function (vis) {
      if (vis && !running) { running = true; S = sizeCanvas(cv); requestAnimationFrame(loop); }
      else if (!vis) { running = false; if (playing && ctx) { playing = false; master.gain.setTargetAtTime(0, ctx.currentTime, 0.1); playBtn.querySelector('span').textContent = 'Включить звук дороги'; playBtn.classList.remove('is-added'); } }
    });
  });

  /* ---------- 5. Антидождь: до / после ---------- */
  $$('[data-tool="rain"]').forEach(function (root) {
    var stage = $('.tool__stage', root), cv = $('canvas', stage), g = cv.getContext('2d'), split = $('.split', stage);
    var S = sizeCanvas(cv), X = 0.5, running = false, last = 0;
    var left = [], right = [];
    w.addEventListener('resize', function () { S = sizeCanvas(cv); });
    function setX(clientX) {
      var r = stage.getBoundingClientRect();
      X = Math.min(0.95, Math.max(0.05, (clientX - r.left) / r.width));
      split.style.setProperty('--x', X * 100 + '%');
    }
    var drag = false;
    stage.addEventListener('pointerdown', function (e) { drag = true; setX(e.clientX); stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', function (e) { if (drag) setX(e.clientX); });
    stage.addEventListener('pointerup', function () { drag = false; });
    stage.style.touchAction = 'pan-y';
    function spawn() {
      // обычное стекло: плоские растекающиеся пятна и подтёки
      if (left.length < 140) left.push({ x: Math.random(), y: Math.random(), r: 3 + Math.random() * 9, sx: 0.8 + Math.random() * 0.8, vy: 0, a: 0, trail: Math.random() < 0.25 });
      // гидрофоб: маленькие круглые капли, быстро скатываются
      if (right.length < 160) right.push({ x: Math.random(), y: Math.random() * 0.8, r: 1.5 + Math.random() * 3, vy: 0, a: 0, roll: Math.random() < 0.55 });
    }
    function drop(x, y, r, sx, alpha, round) {
      g.save(); g.translate(x, y); g.scale(sx, round ? 1 : 0.8);
      var gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      gr.addColorStop(0, 'rgba(255,255,255,' + 0.9 * alpha + ')');
      gr.addColorStop(0.35, 'rgba(210,225,235,' + 0.25 * alpha + ')');
      gr.addColorStop(0.85, 'rgba(20,24,30,' + 0.35 * alpha + ')');
      gr.addColorStop(1, 'rgba(255,255,255,' + 0.5 * alpha + ')');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    function loop(t) {
      if (!running) return;
      requestAnimationFrame(loop);
      var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      for (var k = 0; k < 3; k++) spawn();
      var W = S.w, H = S.h, sx = X * W;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      // левая часть: мутная плёнка воды
      g.save(); g.beginPath(); g.rect(0, 0, sx, H); g.clip();
      g.fillStyle = 'rgba(200,210,220,.10)'; g.fillRect(0, 0, sx, H);
      left.forEach(function (p) {
        p.a = Math.min(1, p.a + dt * 2);
        if (p.r > 9) { p.vy += dt * 6; p.y += p.vy * dt * 0.02; }
        if (p.trail) { g.strokeStyle = 'rgba(220,230,240,' + 0.12 * p.a + ')'; g.lineWidth = p.r * 0.9; g.beginPath(); g.moveTo(p.x * W, p.y * H - 30); g.lineTo(p.x * W, p.y * H); g.stroke(); }
        drop(p.x * W, p.y * H, p.r, p.sx, p.a * 0.75, false);
        if (Math.random() < 0.002) p.r += 1;
      });
      left = left.filter(function (p) { return p.y < 1.05; });
      if (left.length > 130) left.splice(0, 1);
      g.restore();
      // правая часть: чистое стекло, бусинки скатываются
      g.save(); g.beginPath(); g.rect(sx, 0, W - sx, H); g.clip();
      right.forEach(function (p) {
        p.a = Math.min(1, p.a + dt * 3);
        if (p.roll) { p.vy += dt * 2.2; p.y += p.vy * dt; }
        drop(p.x * W, p.y * H, p.r, 1, p.a, true);
      });
      right = right.filter(function (p) { return p.y < 1.05; });
      if (right.length > 150) right.splice(0, 2);
      g.restore();
    }
    whenVisible(stage, function (vis) { if (vis && !running) { running = true; S = sizeCanvas(cv); requestAnimationFrame(loop); } else if (!vis) running = false; });
  });

  /* ---------- 6. Онлайн-запись ---------- */
  var book = $('[data-booking]');
  if (book) {
    var form = $('.wiz', book), panes = $$('.wiz__pane', book), stepsLi = $$('.wiz__steps li', book), bar = $('.wiz__bar span', book);
    var prev = $('[data-wiz-prev]', book), next = $('[data-wiz-next]', book), send = $('[data-wiz-send]', book), alt = $('[data-wiz-alt]', book), sumEl = $('[data-wiz-sum]', book), summary = $('[data-summary]', book);
    var step = 0;
    var dateIn = form.elements.date;
    if (dateIn) { var td = new Date(); dateIn.min = td.toISOString().slice(0, 10); }
    // подставляем смету
    var pre = (w.ATsmeta && w.ATsmeta.get()) || [];
    try { var q = new URLSearchParams(location.search).get('s'); if (q) pre = pre.concat(q.split(',')); } catch (e) {}
    $$('input[name="svc"]', form).forEach(function (i) { if (pre.indexOf(i.value) > -1) i.checked = true; });
    function chosen() { return $$('input[name="svc"]:checked', form).map(function (i) { return i.value; }); }
    function calc() {
      var ids = chosen().filter(function (x) { return x !== 'consult'; });
      var sum = ids.reduce(function (a, id) { var s = DATA.services.find(function (x) { return x.id === id; }); return a + (s ? s.price : 0); }, 0);
      sumEl.textContent = sum ? 'от ' + money(sum) : '—';
      return sum;
    }
    function fmtDate(v) { if (!v) return ''; var p = v.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
    function message() {
      var f = form.elements, ids = chosen();
      var names = ids.map(function (id) { if (id === 'consult') return 'консультация'; var s = DATA.services.find(function (x) { return x.id === id; }); return s ? s.name + ' (' + s.priceText + ')' : ''; }).filter(Boolean);
      var sum = calc();
      var t = 'Здравствуйте! Хочу записаться в ART TONIR.';
      if (f.name.value.trim()) t += '\nМеня зовут ' + f.name.value.trim() + '.';
      if (names.length) t += '\nУслуги: ' + names.join('; ') + '.';
      if (sum) t += '\nОриентир по прайсу: от ' + sum.toLocaleString('ru-RU') + ' ₽.';
      var car = f.car.value.trim() + (f.year.value.trim() ? ', ' + f.year.value.trim() + ' г.' : '');
      if (car.trim()) t += '\nАвтомобиль: ' + car + '.';
      var when = [fmtDate(f.date.value), f.time.value].filter(Boolean).join(' в ');
      if (when) t += '\nУдобно: ' + when + '.';
      if (f.comment.value.trim()) t += '\nКомментарий: ' + f.comment.value.trim();
      return t;
    }
    function render() {
      panes.forEach(function (p, i) { p.classList.toggle('is-on', i === step); });
      stepsLi.forEach(function (li, i) { li.classList.toggle('is-on', i === step); li.classList.toggle('is-done', i < step); });
      bar.style.width = ((step + 1) / panes.length) * 100 + '%';
      prev.disabled = step === 0;
      var lastStep = step === panes.length - 1;
      next.hidden = lastStep; send.hidden = !lastStep; alt.hidden = !lastStep;
      if (lastStep) {
        var m = message();
        summary.textContent = m;
        send.href = waLink(m);
      }
      calc();
    }
    next.addEventListener('click', function () { if (step < panes.length - 1) { step++; render(); form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); } });
    prev.addEventListener('click', function () { if (step > 0) { step--; render(); } });
    form.addEventListener('input', function () { if (step === panes.length - 1) render(); else calc(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    $('[data-wiz-tg]', book).addEventListener('click', function () {
      var m = message();
      var go = function () { w.open(DATA.tg, '_blank', 'noopener'); };
      if (navigator.clipboard) navigator.clipboard.writeText(m).then(function () { if (w.ATtoast) w.ATtoast('Текст скопирован — вставьте его в чат'); go(); }, go); else go();
    });
    render();
  }
})();

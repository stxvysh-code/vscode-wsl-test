/* ART TONIR — интерактивы на реальных фото студии и онлайн-запись */
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
  var DPR = Math.min(w.devicePixelRatio || 1, 1.75);
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var smooth = function (a, b, v) { var t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  function fillRange(r) { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%'); }
  $$('input[type="range"]').forEach(function (r) { fillRange(r); r.addEventListener('input', function () { fillRange(r); }); });

  function radios(group, attr, cb) {
    var btns = $$('[' + attr + ']', group);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-checked', x === b); });
        cb(b.getAttribute(attr), b);
      });
    });
  }

  // колбэк при появлении/уходе из вида; near — заранее (для загрузки)
  function watch(el, cb, near) {
    if (!('IntersectionObserver' in w)) return cb(true);
    new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting); }); }, { rootMargin: near || '0px', threshold: 0.01 }).observe(el);
  }

  function fitCanvas(cv) {
    var r = cv.getBoundingClientRect();
    var W = Math.max(1, Math.round(r.width * DPR)), H = Math.max(1, Math.round(r.height * DPR));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    return { w: r.width, h: r.height };
  }

  function loadImg(src) {
    return new Promise(function (res, rej) { var i = new Image(); i.decoding = 'async'; i.onload = function () { res(i); }; i.onerror = rej; i.src = src; });
  }
  function canvasOf(W, H) { var c = d.createElement('canvas'); c.width = W; c.height = H; return c; }

  /* ---------- общие данные фото GLC: снимок + маски стёкол и кузова (tools/masks.py) ---------- */
  var glcP = null;
  function glcAssets() {
    if (glcP) return glcP;
    glcP = Promise.all([loadImg('assets/img/tools/glc.webp'), loadImg('assets/img/tools/glc-windows.webp')]).then(function (r) {
      var photo = r[0], mk = r[1], W = photo.naturalWidth, H = photo.naturalHeight;
      var c = canvasOf(W, H), g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(mk, 0, 0, W, H);
      var md = g.getImageData(0, 0, W, H).data;
      g.clearRect(0, 0, W, H); g.drawImage(photo, 0, 0, W, H);
      var px = g.getImageData(0, 0, W, H);
      function alphaMask(ch) {
        var cc = canvasOf(W, H), gg = cc.getContext('2d'), id = gg.createImageData(W, H), o = id.data;
        for (var i = 0; i < md.length; i += 4) { o[i] = o[i + 1] = o[i + 2] = 255; o[i + 3] = md[i + ch]; }
        gg.putImageData(id, 0, 0); return cc;
      }
      // «блики»: только яркие отражения на стекле — их тонировка не гасит
      var hc = canvasOf(W, H), hg = hc.getContext('2d'), hid = hg.createImageData(W, H), ho = hid.data, p = px.data;
      for (var i = 0; i < p.length; i += 4) {
        var L = (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255;
        ho[i] = p[i]; ho[i + 1] = p[i + 1]; ho[i + 2] = p[i + 2]; ho[i + 3] = 255 * smooth(0.42, 0.85, L);
      }
      hg.putImageData(hid, 0, 0);
      var paint = new Uint8Array(W * H);
      for (var j = 0, k = 2; j < paint.length; j++, k += 4) paint[j] = md[k];
      return { photo: photo, W: W, H: H, px: px, rear: alphaMask(0), front: alphaMask(1), paint: paint, hi: hc };
    });
    return glcP;
  }

  /* ---------- 1. Тонировка на реальном фото ---------- */
  $$('[data-tool="tint"]').forEach(function (root) {
    var stage = $('.tool__stage', root), cv = $('.tool__cv', stage), g = cv.getContext('2d');
    var rear = $('[data-in="rear"]', root), outR = $('[data-out="rear"]', root), outS = $('[data-out="sum"]', root), badge = $('[data-out="state"]', root), btn = $('[data-tool-wa]', root);
    var P = {
      rear: (svcBy('Тонирование задней полусферы') || { price: 8000 }).price,
      athermal: (svcBy('Атермальное тонирование') || { price: 5000 }).price,
      gost: (svcBy('Тонирование по ГОСТ / хамелеон') || { price: 8000 }).price,
    };
    var NAMES = { none: 'без плёнки', athermal: 'атермальная', gost: 'по ГОСТ', chameleon: 'хамелеон' };
    var A = null, mode = 'none', shownMode = 'none', rearV = 0;
    var L = { rear: null, rearOld: null, front: null, frontOld: null };
    var anim = null, raf = 0, visible = false, demoDone = false, chamT = 0;
    var tmp = null, tg = null;
    // границы групп стёкол в пикселях фото (для «ракеля»)
    var BOX = { rear: [240, 380, 812, 500], front: [818, 376, 1004, 492] };

    function layer(mask, spec, t) {
      if (!spec) return null;
      var c = canvasOf(A.W, A.H), x = c.getContext('2d');
      x.drawImage(A.photo, 0, 0);
      x.fillStyle = 'rgba(3,4,6,' + spec.dark + ')'; x.fillRect(0, 0, A.W, A.H);
      if (spec.tint) { x.globalCompositeOperation = 'multiply'; x.fillStyle = spec.tint; x.fillRect(0, 0, A.W, A.H); }
      if (spec.cham) {
        var gr = x.createLinearGradient(BOX.front[0], BOX.front[1], BOX.front[2], BOX.front[3]), s = (t || 0) % 1;
        ['#6b3cff', '#18c5b5', '#3f7bff', '#b04cff', '#6b3cff'].forEach(function (col, i) { gr.addColorStop(((i / 4) + s) % 1, col); });
        x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.75; x.fillStyle = gr; x.fillRect(0, 0, A.W, A.H); x.globalAlpha = 1;
      }
      x.globalCompositeOperation = 'source-over';
      x.globalAlpha = Math.min(0.85, spec.dark * 0.9); x.drawImage(A.hi, 0, 0); x.globalAlpha = 1;   // отражения остаются
      x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0);
      return c;
    }
    var rearSpec = function (v) { return v > 0 ? { dark: Math.min(0.97, Math.pow(v / 100, 0.75)) } : null; };
    var FRONT = { none: null, athermal: { dark: 0.1, tint: 'rgba(120,205,210,.55)' }, gost: { dark: 0.3 }, chameleon: { dark: 0.22, cham: true } };

    function glint(group, p) {
      // светящаяся кромка ракеля, видимая только на стекле
      var b = BOX[group], x0 = b[0] + (b[2] - b[0] + 60) * p - 30;
      tg.clearRect(0, 0, A.W, A.H);
      var gr = tg.createLinearGradient(x0 - 26, 0, x0 + 26, 0);
      gr.addColorStop(0, 'rgba(255,240,210,0)'); gr.addColorStop(0.5, 'rgba(255,244,220,.95)'); gr.addColorStop(1, 'rgba(255,240,210,0)');
      tg.save(); tg.translate(x0, (b[1] + b[3]) / 2); tg.rotate(0.22); tg.translate(-x0, -(b[1] + b[3]) / 2);
      tg.fillStyle = gr; tg.fillRect(x0 - 26, b[1] - 60, 52, b[3] - b[1] + 120); tg.restore();
      tg.globalCompositeOperation = 'destination-in'; tg.drawImage(group === 'rear' ? A.rear : A.front, 0, 0); tg.globalCompositeOperation = 'source-over';
      return tmp;
    }
    function clipSweep(x, group, p) {
      var b = BOX[group], x0 = b[0] + (b[2] - b[0] + 60) * p - 30, cy = (b[1] + b[3]) / 2, k = Math.tan(0.22);
      x.beginPath();
      x.moveTo(0, 0); x.lineTo(x0 + k * (0 - cy), 0); x.lineTo(x0 + k * (A.H - cy), A.H); x.lineTo(0, A.H); x.closePath();
    }

    function render() {
      var s = fitCanvas(cv);
      g.setTransform(cv.width / A.W, 0, 0, cv.height / A.H, 0, 0);
      g.clearRect(0, 0, A.W, A.H);
      g.drawImage(A.photo, 0, 0);
      ['rear', 'front'].forEach(function (grp) {
        var cur = L[grp], old = L[grp + 'Old'];
        if (anim && anim.group === grp) {
          if (old) g.drawImage(old, 0, 0);
          if (cur) { g.save(); clipSweep(g, grp, anim.p); g.clip(); g.drawImage(cur, 0, 0); g.restore(); }
          if (anim.p > 0 && anim.p < 1) { g.globalCompositeOperation = 'lighter'; g.drawImage(glint(grp, anim.p), 0, 0); g.globalCompositeOperation = 'source-over'; }
        } else if (cur) g.drawImage(cur, 0, 0);
      });
      void s;
    }

    function loop(t) {
      raf = 0;
      if (!visible) return;
      var need = false;
      if (anim) {
        if (!anim.t0) anim.t0 = t;
        anim.p = Math.min(1, ease((t - anim.t0) / anim.dur));
        if (anim.p >= 1) { L[anim.group + 'Old'] = null; anim = null; }
        need = true;
      }
      if (shownMode === 'chameleon') {
        if (!loop.last || t - loop.last > 50) { chamT += 0.012; L.front = layer(A.front, FRONT.chameleon, chamT); loop.last = t; }
        need = true;
      }
      render();
      if (need) raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(loop); }

    function sweep(group, dur) {
      if (reduce) { L[group + 'Old'] = null; anim = null; kick(); return; }
      anim = { group: group, dur: dur || 1100, p: 0, t0: 0 };
      kick();
    }

    function setRear(v, withSweep) {
      var old = L.rear;
      rearV = v;
      L.rear = layer(A.rear, rearSpec(v));
      if (withSweep) { L.rearOld = old; sweep('rear', 1500); } else kick();
    }
    function setFront(m) {
      var old = L.front;
      shownMode = m;
      L.front = layer(A.front, FRONT[m], chamT);
      L.frontOld = old;
      sweep('front', 1000);
    }

    function ui() {
      var v = +rear.value;
      outR.textContent = v + '%';
      var sum = (v > 0 ? P.rear : 0) + (mode === 'athermal' ? P.athermal : (mode === 'gost' || mode === 'chameleon') ? P.gost : 0);
      outS.textContent = sum ? 'от ' + money(sum) : '—';
      badge.textContent = 'Задняя полусфера · ' + v + '%' + (mode !== 'none' ? ' · Передние: ' + NAMES[mode] : '');
      var parts = [];
      if (v > 0) parts.push('тонирование задней полусферы (на сайте выбрал затемнение ≈' + v + '%)');
      if (mode !== 'none') parts.push('передние стёкла — ' + (mode === 'athermal' ? 'атермальная плёнка' : mode === 'gost' ? 'тонирование по ГОСТ' : 'плёнка «хамелеон»'));
      btn.href = waLink('Здравствуйте! Хочу записаться в ART TONIR на тонировку: ' + (parts.length ? parts.join('; ') : 'нужна консультация') + '.');
    }

    rear.addEventListener('input', function () { ui(); if (A) setRear(+rear.value, false); });
    radios(root, 'data-front', function (m) { mode = m; ui(); if (A) setFront(m); });
    ui();

    var started = false;
    watch(stage, function (vis) {
      if (vis && !started) {
        started = true;
        glcAssets().then(function (a) {
          A = a; tmp = canvasOf(A.W, A.H); tg = tmp.getContext('2d');
          stage.classList.add('is-ready');
          L.front = layer(A.front, FRONT[mode], 0); shownMode = mode;
          if (!demoDone) { demoDone = true; L.rearOld = null; setRear(+rear.value, true); }
          kick();
        }).catch(function () { /* фото останется без интерактива */ });
      }
    }, '300px');
    watch(stage, function (vis) { visible = vis; if (vis && A) kick(); });
    w.addEventListener('resize', function () { if (A) kick(); });
  });

  /* ---------- 2. Примерка цвета: перекраска кузова по маске ---------- */
  $$('[data-tool="color"]').forEach(function (root) {
    var stage = $('.tool__stage', root), cv = $('.tool__cv', stage), g = cv.getContext('2d');
    var badge = $('[data-out="state"]', root), btn = $('[data-tool-wa]', root);
    var A = null, cur = null, next = null, anim = null, raf = 0, visible = false;
    var color = null, colorName = '', finish = 'gloss', tmp = null, tg = null, paintMask = null;
    var FIN = { gloss: 'глянец', satin: 'сатин', matte: 'мат' };
    var BX = [120, 330, 1240, 820];

    function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
    function recolor(rgb, fin) {
      var src = A.px.data, out = new ImageData(new Uint8ClampedArray(src), A.W, A.H), o = out.data, m = A.paint;
      var spK = fin === 'gloss' ? 1 : fin === 'satin' ? 0.45 : 0;
      var flat = fin === 'gloss' ? 1 : fin === 'satin' ? 0.75 : 0.45;
      var r = rgb[0], gC = rgb[1], b = rgb[2], Lref = 0.87;
      var lift = fin === 'matte' ? 34 : fin === 'satin' ? 16 : 0;   // мягкий рассеянный отблеск матовой плёнки
      for (var j = 0, i = 0; j < m.length; j++, i += 4) {
        var a = m[j];
        if (!a) continue;
        var L = (0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2]) / 255;
        var sh = L / Lref;
        sh = 0.9 + (sh - 0.9) * flat;
        if (sh < 0) sh = 0;
        var base = Math.min(sh, 1.08);
        var sp = spK * smooth(0.93, 0.995, L);
        var nr = r * base + lift * L, ng = gC * base + lift * L, nb = b * base + lift * L;
        nr = nr + (245 - nr) * sp; ng = ng + (247 - ng) * sp; nb = nb + (250 - nb) * sp;
        var k = a / 255;
        o[i] = src[i] + (nr - src[i]) * k; o[i + 1] = src[i + 1] + (ng - src[i + 1]) * k; o[i + 2] = src[i + 2] + (nb - src[i + 2]) * k;
      }
      var c = canvasOf(A.W, A.H); c.getContext('2d').putImageData(out, 0, 0);
      return c;
    }
    function render() {
      fitCanvas(cv);
      g.setTransform(cv.width / A.W, 0, 0, cv.height / A.H, 0, 0);
      g.clearRect(0, 0, A.W, A.H);
      g.drawImage(cur || A.photo, 0, 0);
      if (anim && next) {
        var x0 = BX[0] + (BX[2] - BX[0] + 120) * anim.p - 60, cy = (BX[1] + BX[3]) / 2, k = Math.tan(0.18);
        g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(x0 + k * (0 - cy), 0); g.lineTo(x0 + k * (A.H - cy), A.H); g.lineTo(0, A.H); g.closePath(); g.clip();
        g.drawImage(next, 0, 0); g.restore();
        if (anim.p > 0 && anim.p < 1) {
          tg.clearRect(0, 0, A.W, A.H);
          var gr = tg.createLinearGradient(x0 - 34, 0, x0 + 34, 0);
          gr.addColorStop(0, 'rgba(255,240,210,0)'); gr.addColorStop(0.5, 'rgba(255,246,228,.9)'); gr.addColorStop(1, 'rgba(255,240,210,0)');
          tg.save(); tg.translate(x0, cy); tg.rotate(0.18); tg.translate(-x0, -cy); tg.fillStyle = gr; tg.fillRect(x0 - 34, 0, 68, A.H); tg.restore();
          tg.globalCompositeOperation = 'destination-in'; tg.drawImage(paintMask, 0, 0); tg.globalCompositeOperation = 'source-over';
          g.globalCompositeOperation = 'lighter'; g.drawImage(tmp, 0, 0); g.globalCompositeOperation = 'source-over';
        }
      }
    }
    function loop(t) {
      raf = 0;
      if (!visible) return;
      if (anim) {
        if (!anim.t0) anim.t0 = t;
        anim.p = Math.min(1, ease((t - anim.t0) / anim.dur));
        if (anim.p >= 1) { cur = next; next = null; anim = null; }
      }
      render();
      if (anim) raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(loop); }
    function apply() {
      if (!A || !color) return;
      var res = recolor(hex(color), finish);
      if (reduce) { cur = res; kick(); return; }
      if (anim && next) cur = next;
      next = res; anim = { p: 0, t0: 0, dur: 1300 };
      kick();
    }
    function ui() {
      badge.textContent = color ? colorName + ' · ' + FIN[finish] : 'Оригинальный цвет';
      btn.href = waLink('Здравствуйте! Хочу обсудить замену цвета в ART TONIR' + (color ? ': на сайте примерил цвет «' + colorName + '», ' + FIN[finish] : '') + '.');
    }
    $$('[data-color]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-color]', root).forEach(function (x) { x.setAttribute('aria-checked', x === b); });
        color = b.getAttribute('data-color'); colorName = b.getAttribute('aria-label'); ui(); apply();
      });
    });
    radios(root, 'data-finish', function (f) { finish = f; ui(); apply(); });
    ui();

    var started = false;
    watch(stage, function (vis) {
      if (vis && !started) {
        started = true;
        glcAssets().then(function (a) {
          A = a; tmp = canvasOf(A.W, A.H); tg = tmp.getContext('2d');
          paintMask = canvasOf(A.W, A.H);
          var pg = paintMask.getContext('2d'), id = pg.createImageData(A.W, A.H), o = id.data;
          for (var j = 0, i = 0; j < A.paint.length; j++, i += 4) { o[i] = o[i + 1] = o[i + 2] = 255; o[i + 3] = A.paint[j]; }
          pg.putImageData(id, 0, 0);
          stage.classList.add('is-ready');
          kick();
          // демонстрация: через мгновение машина «оклеивается» в оливковый
          setTimeout(function () { if (!color) { var b = $('[data-color="#56603f"]', root); if (b) b.click(); } }, reduce ? 0 : 700);
        }).catch(function () {});
      }
    }, '300px');
    watch(stage, function (vis) { visible = vis; if (vis && A) kick(); });
    w.addEventListener('resize', function () { if (A) kick(); });
  });

  /* ---------- 3. Камень в капот: реальное фото чёрного BMW X6 ---------- */
  $$('[data-tool="stone"]').forEach(function (root) {
    var stage = $('.tool__stage', root), cv = $('.tool__cv', stage), g = cv.getContext('2d');
    var film = $('[data-film]', root), outC = $('[data-out="chips"]', root), outState = $('[data-out="state"]', root);
    var SW = 1320, SH = 918;   // координаты исходного фото
    var HOOD = [[449, 297], [620, 264], [792, 257], [911, 271], [1056, 317], [1188, 363], [1247, 396], [1228, 436], [1109, 429], [924, 436], [739, 422], [634, 436], [554, 396], [475, 370]];
    var WING = [[429, 383], [620, 433], [647, 455], [581, 462], [502, 491], [455, 462]];
    var chips = [], stones = [], rings = [], debris = [], count = 0, running = false, last = 0, auto = 1.2, S = { w: 1, h: 1 };
    function inside(poly, x, y) {
      var c = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    }
    function randomHood() {
      for (var n = 0; n < 40; n++) { var x = 470 + Math.random() * 760, y = 265 + Math.random() * 170; if (inside(HOOD, x, y)) return [x, y]; }
      return [820, 340];
    }
    film.addEventListener('change', function () {
      outState.textContent = film.checked ? 'Плёнка: включена' : 'Плёнка: выключена';
      if (film.checked) { chips = []; count = 0; outC.textContent = '0'; }
    });
    function throwAt(x, y) {
      // x, y — в координатах фото
      stones.push({ sx: x - 140 + Math.random() * 280, sy: SH + 60, tx: x, ty: y, t: 0, dur: 0.34 + Math.random() * 0.1, r: 6 + Math.random() * 5, rot: Math.random() * 6 });
    }
    stage.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * SW, y = (e.clientY - r.top) / r.height * SH;
      if (!inside(HOOD, x, y) && !inside(WING, x, y)) { var p = randomHood(); x = p[0]; y = p[1]; }
      throwAt(x, y); auto = 3.5;
    });
    function impact(s) {
      if (film.checked) {
        rings.push({ x: s.tx, y: s.ty, t: 0 });
        for (var i = 0; i < 7; i++) debris.push({ x: s.tx, y: s.ty, vx: (Math.random() - 0.5) * 380, vy: -Math.random() * 380 - 80, t: 0, c: '#b7b1a8' });
      } else {
        var spikes = [];
        for (var k = 0; k < 7; k++) spikes.push({ a: Math.random() * Math.PI * 2, l: 7 + Math.random() * 14 });
        chips.push({ x: s.tx, y: s.ty, r: 4 + Math.random() * 4, spikes: spikes, rot: Math.random() * 6 });
        count++; outC.textContent = count;
        for (var j = 0; j < 9; j++) debris.push({ x: s.tx, y: s.ty, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 300, t: 0, c: '#f0ece4' });
      }
    }
    function loop(t) {
      if (!running) return;
      requestAnimationFrame(loop);
      var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      auto -= dt;
      if (auto < 0) { auto = 1.4 + Math.random() * 0.9; var p = randomHood(); throwAt(p[0], p[1]); }
      S = fitCanvas(cv);
      g.setTransform(cv.width / SW, 0, 0, cv.height / SH, 0, 0);
      g.clearRect(0, 0, SW, SH);
      if (film.checked) { // тонкий блик плёнки по капоту
        g.save(); g.beginPath(); HOOD.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.clip();
        var sx = ((t / 2600) % 1) * 1100 + 300, gr = g.createLinearGradient(sx - 120, 0, sx + 120, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(230,207,152,.13)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, SW, SH); g.restore();
      }
      chips.forEach(function (c) {
        g.save(); g.translate(c.x, c.y); g.rotate(c.rot);
        g.strokeStyle = 'rgba(235,232,226,.65)'; g.lineWidth = 1.6;
        c.spikes.forEach(function (s) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(s.a) * s.l, Math.sin(s.a) * s.l * 0.6); g.stroke(); });
        g.fillStyle = '#e4e0d8'; g.beginPath(); g.ellipse(0, 0, c.r * 1.3, c.r * 0.8, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#7c7f84'; g.beginPath(); g.ellipse(0.4, 0.3, c.r * 0.6, c.r * 0.4, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      });
      rings = rings.filter(function (r) {
        r.t += dt; var k = r.t / 0.75; if (k > 1) return false;
        g.save(); g.translate(r.x, r.y); g.scale(1, 0.55);
        g.strokeStyle = 'rgba(230,207,152,' + (1 - k) + ')'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(0, 0, 8 + k * 60, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(216,210,30,' + (0.7 - k * 0.7) + ')'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(0, 0, 4 + k * 28, 0, Math.PI * 2); g.stroke();
        g.restore();
        return true;
      });
      debris = debris.filter(function (p) {
        p.t += dt; if (p.t > 0.7) return false;
        p.vy += 1100 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        g.fillStyle = p.c; g.globalAlpha = 1 - p.t / 0.7; g.fillRect(p.x, p.y, 2.5, 2.5); g.globalAlpha = 1;
        return true;
      });
      stones = stones.filter(function (s) {
        s.t += dt; var k = Math.min(1, s.t / s.dur);
        var x = s.sx + (s.tx - s.sx) * k, y = s.sy + (s.ty - s.sy) * k - Math.sin(k * Math.PI) * 60;
        var sc = 3 - k * 2;
        g.save(); g.translate(x, y); g.rotate(s.rot + k * 9); g.scale(sc, sc);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(1.5, 2, s.r, s.r * 0.7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#8e877c'; g.beginPath(); g.moveTo(-s.r, 0); g.lineTo(-s.r * 0.3, -s.r); g.lineTo(s.r, -s.r * 0.4); g.lineTo(s.r * 0.7, s.r * 0.8); g.lineTo(-s.r * 0.6, s.r); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-s.r * 0.2, -s.r * 0.4, s.r * 0.3, 0, Math.PI * 2); g.fill();
        g.restore();
        if (k >= 1) { impact(s); return false; }
        return true;
      });
      void S;
    }
    watch(stage, function (vis) { if (vis && !running) { running = true; stage.classList.add('is-ready'); requestAnimationFrame(loop); } else if (!vis) running = false; });
  });

  /* ---------- 4. Шумоизоляция: реальное фото + синтез звука дороги ---------- */
  $$('[data-tool="noise"]').forEach(function (root) {
    var stage = $('.tool__stage', root), playBtn = $('[data-noise-play]', root), iso = $('[data-iso]', root), cv = $('.tool__cv', stage), g = cv.getContext('2d'), outState = $('[data-out="state"]', root);
    var S = { w: 1, h: 1 }, ctx = null, master, lp, an, buf, playing = false, running = false, phase = 0, level = 1, levelT = 1, last = 0;
    function build() {
      var AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      var len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), ch = b.getChannelData(0), lst = 0;
      for (var i = 0; i < len; i++) { var wht = Math.random() * 2 - 1; lst = (lst + 0.02 * wht) / 1.02; ch[i] = lst * 3.2 + wht * 0.035; }
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
      levelT = iso.checked ? 0.36 : 1;
      outState.textContent = iso.checked ? 'С шумоизоляцией' : 'Без шумоизоляции';
      stage.classList.toggle('is-quiet', iso.checked);
      if (!ctx) return;
      var t = ctx.currentTime;
      lp.frequency.cancelScheduledValues(t); lp.frequency.setTargetAtTime(iso.checked ? 520 : 9000, t, 0.25);
      if (playing) { master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(iso.checked ? 0.16 : 0.42, t, 0.25); }
    }
    function stop() { if (playing && ctx) { playing = false; master.gain.setTargetAtTime(0, ctx.currentTime, 0.1); playBtn.querySelector('span').textContent = 'Включить звук дороги'; playBtn.classList.remove('is-added'); } }
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
    function loop(t) {
      if (!running) return;
      requestAnimationFrame(loop);
      if (t - last < 30) return;   // ~30 кадров/с достаточно для эквалайзера
      last = t;
      S = fitCanvas(cv);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      var W = S.w, H = S.h, base = H * 0.86, maxH = H * 0.42;
      g.clearRect(0, 0, W, H);
      var sh = g.createLinearGradient(0, H * 0.35, 0, H);
      sh.addColorStop(0, 'rgba(8,8,9,0)'); sh.addColorStop(1, 'rgba(8,8,9,.82)');
      g.fillStyle = sh; g.fillRect(0, H * 0.35, W, H * 0.65);
      level += (levelT - level) * 0.12;
      phase += 0.06;
      var bars = W < 500 ? 32 : 48, bw = W / bars;
      if (playing && an) an.getByteFrequencyData(buf);
      var gr = g.createLinearGradient(0, base - maxH, 0, base);
      gr.addColorStop(0, level > 0.7 ? 'rgba(216,210,30,.95)' : 'rgba(230,207,152,.95)'); gr.addColorStop(1, 'rgba(197,164,101,.35)');
      g.fillStyle = gr;
      for (var i = 0; i < bars; i++) {
        var hi = i / bars, v;
        if (playing && an) v = buf[Math.floor(i * (buf.length / bars) * 0.8)] / 255;
        else v = 0.25 + 0.55 * Math.abs(Math.sin(phase * 1.3 + i * 0.45) * Math.cos(phase * 0.7 + i * 0.13));
        v *= level * (1 - hi * (1 - level) * 0.9);
        var bh = Math.max(3, v * maxH);
        g.fillRect(i * bw + bw * 0.22, base - bh, bw * 0.56, bh);
      }
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, base + 2, W, 1);
    }
    watch(stage, function (vis) {
      if (vis && !running) { running = true; stage.classList.add('is-ready'); requestAnimationFrame(loop); }
      else if (!vis) { running = false; stop(); }
    });
  });

  /* ---------- 5. Антидождь: до / после, капли-линзы ---------- */
  $$('[data-tool="rain"]').forEach(function (root) {
    var stage = $('.tool__stage', root), cv = $('canvas', stage), g = cv.getContext('2d'), split = $('.split', stage), bgImg = $('.tool__bgimg', stage);
    var S = { w: 1, h: 1 }, X = 0.5, running = false, last = 0;
    var leftLayer = null, lg = null, beads = [], leftCount = 0, sharp = null, bead = {};
    function setX(clientX) {
      var r = stage.getBoundingClientRect();
      X = Math.min(0.95, Math.max(0.05, (clientX - r.left) / r.width));
      split.style.setProperty('--x', X * 100 + '%');
    }
    var drag = false;
    stage.addEventListener('pointerdown', function (e) { drag = true; setX(e.clientX); try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
    stage.addEventListener('pointermove', function (e) { if (drag) setX(e.clientX); });
    stage.addEventListener('pointerup', function () { drag = false; });
    stage.style.touchAction = 'pan-y';

    function setup() {
      S = fitCanvas(cv);
      var W = cv.width, H = cv.height;
      leftLayer = canvasOf(W, H); lg = leftLayer.getContext('2d'); leftCount = 0;
      // резкая версия фона — то, что видно сквозь каплю (перевёрнуто, как в линзе)
      sharp = canvasOf(W, H);
      var sg = sharp.getContext('2d'), iw = bgImg.naturalWidth || 1280, ih = bgImg.naturalHeight || 890;
      var sc = Math.max(W / iw, H / ih), dw = iw * sc, dh = ih * sc;
      try { sg.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh); } catch (e) {}
      // готовые спрайты бусин (гидрофобные капли)
      [3, 4, 5, 6, 7].forEach(function (r) {
        var R = Math.round(r * DPR), c = canvasOf(R * 2 + 2, R * 2 + 2), x = c.getContext('2d');
        var gr = x.createRadialGradient(R * 0.7, R * 0.6, R * 0.1, R + 1, R + 1, R);
        gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.3, 'rgba(225,235,245,.35)'); gr.addColorStop(0.85, 'rgba(15,18,22,.45)'); gr.addColorStop(1, 'rgba(255,255,255,.55)');
        x.fillStyle = gr; x.beginPath(); x.arc(R + 1, R + 1, R, 0, Math.PI * 2); x.fill();
        bead[r] = c;
      });
      // обычное стекло: мутная плёнка воды
      lg.fillStyle = 'rgba(205,214,224,.13)'; lg.fillRect(0, 0, W, H);
    }
    function lensDrop(x, y, r, flat) {
      // капля-линза: перевёрнутый и уменьшенный фон внутри, тёмная кромка и блик
      var ry = r * (flat ? 0.78 : 1);
      lg.save();
      lg.beginPath(); lg.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); lg.clip();
      lg.translate(x, y); lg.scale(1, -1);
      var s = 4;
      lg.drawImage(sharp, x - r * s, y - ry * s, r * s * 2, ry * s * 2, -r, -ry, r * 2, ry * 2);
      lg.setTransform(1, 0, 0, 1, 0, 0);
      var rim = lg.createRadialGradient(x, y, r * 0.55, x, y, r);
      rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(10,12,16,.55)');
      lg.fillStyle = rim; lg.fillRect(x - r, y - ry, r * 2, ry * 2);
      lg.restore();
      lg.fillStyle = 'rgba(255,255,255,.85)';
      lg.beginPath(); lg.ellipse(x - r * 0.35, y - ry * 0.4, r * 0.22, ry * 0.16, -0.5, 0, Math.PI * 2); lg.fill();
    }
    function spawnLeft() {
      if (leftCount > 260) { lg.globalAlpha = 0.12; lg.fillStyle = 'rgb(205,214,224)'; lg.fillRect(0, 0, leftLayer.width, leftLayer.height); lg.globalAlpha = 1; leftCount = 120; }
      var W = leftLayer.width, H = leftLayer.height;
      var r = (4 + Math.random() * 11) * DPR, x = Math.random() * W, y = Math.random() * H;
      if (Math.random() < 0.25) { // подтёк
        lg.strokeStyle = 'rgba(225,232,240,.16)'; lg.lineWidth = r * 0.9; lg.lineCap = 'round';
        lg.beginPath(); lg.moveTo(x, y - r * 5); lg.lineTo(x + (Math.random() - 0.5) * r, y); lg.stroke();
      }
      lensDrop(x, y, r, true);
      leftCount++;
    }
    function loop(t) {
      if (!running) return;
      requestAnimationFrame(loop);
      var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      if (!leftLayer || cv.width !== Math.round(cv.getBoundingClientRect().width * DPR)) setup();
      var W = cv.width, H = cv.height, sx = X * W;
      if (Math.random() < 0.45) spawnLeft();
      if (beads.length < 70 && Math.random() < 0.6) beads.push({ x: Math.random() * W, y: Math.random() * H * 0.85, r: [3, 4, 5, 6, 7][Math.floor(Math.random() * 5)], vy: 0, a: 0, roll: Math.random() < 0.6 });
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      g.save(); g.beginPath(); g.rect(0, 0, sx, H); g.clip(); g.drawImage(leftLayer, 0, 0); g.restore();
      g.save(); g.beginPath(); g.rect(sx, 0, W - sx, H); g.clip();
      beads.forEach(function (p) {
        p.a = Math.min(1, p.a + dt * 3);
        if (p.roll) { p.vy += dt * 2.4 * H; p.y += p.vy * dt * 0.35; }
        g.globalAlpha = p.a; var spr = bead[p.r]; g.drawImage(spr, p.x - spr.width / 2, p.y - spr.height / 2);
      });
      g.globalAlpha = 1;
      g.restore();
      beads = beads.filter(function (p) { return p.y < H + 20; });
    }
    var go = function () { if (!running) { running = true; stage.classList.add('is-ready'); leftLayer = null; requestAnimationFrame(loop); } };
    watch(stage, function (vis) {
      if (vis) { if (bgImg.complete && bgImg.naturalWidth) go(); else bgImg.addEventListener('load', go, { once: true }); }
      else running = false;
    });
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

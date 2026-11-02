/* ART TONIR — основной скрипт сайта.
   Работает и без GSAP/Lenis: контент виден всегда, анимации — прогрессивное улучшение. */
(function () {
  'use strict';
  var d = document, w = window, html = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var gsap = w.gsap, ST = w.ScrollTrigger;
  var ANIM = !!(gsap && ST && !reduce);
  w.__AT_READY = true;
  if (!ANIM) { html.classList.remove('anim'); html.classList.add('no-anim'); }
  else { gsap.registerPlugin(ST); html.classList.add('anim'); }

  var store = {
    get: function (k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var DATA = w.AT_DATA || { services: [] };
  var money = function (n) { return n.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽'; };

  /* ---------- toast ---------- */
  var toastEl = $('.toast'), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }
  w.ATtoast = toast;

  /* ---------- Lenis: плавный скролл ---------- */
  var lenis = null;
  if (w.Lenis && !reduce) {
    lenis = new w.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    if (ANIM) {
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  w.ATlenis = lenis;
  function scrollToEl(el) {
    var off = -(parseInt(getComputedStyle(html).getPropertyValue('--hdr'), 10) || 76) - 70;
    if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.3 });
    else w.scrollTo({ top: el.getBoundingClientRect().top + w.pageYOffset + off, behavior: reduce ? 'auto' : 'smooth' });
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var el = id && d.getElementById(id);
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
    history.replaceState(null, '', '#' + id);
  });

  /* ---------- шапка ---------- */
  var hdr = $('[data-hdr]'), lastY = 0;
  function onScroll() {
    var y = w.pageYOffset;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 20);
      var hide = y > 400 && y > lastY + 2 && !html.classList.contains('menu-open');
      var show = y < lastY - 2 || y < 400;
      if (hide) { hdr.classList.add('is-hidden'); d.body.classList.add('hdr-hidden'); }
      else if (show) { hdr.classList.remove('is-hidden'); d.body.classList.remove('hdr-hidden'); }
    }
    lastY = y;
  }
  w.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- мобильное меню ---------- */
  var burger = $('.burger'), mmenu = $('#mmenu');
  function setMenu(open) {
    html.classList.toggle('menu-open', open);
    if (burger) { burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню'); }
    if (mmenu) mmenu.setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
    d.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger) burger.addEventListener('click', function () { setMenu(!html.classList.contains('menu-open')); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && html.classList.contains('menu-open')) setMenu(false); });
  if (mmenu) $$('a', mmenu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* ---------- переходы между страницами: «плёнка» ---------- */
  var pt = $('.pt');
  function enter() {
    if (!html.classList.contains('pt-in') || !pt) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        pt.classList.add('is-enter');
        html.classList.remove('pt-in');
        setTimeout(function () { pt.classList.remove('is-enter'); pt.querySelector('.pt__film').style.transition = 'none'; requestAnimationFrame(function () { pt.querySelector('.pt__film').style.transition = ''; }); }, 900);
      });
    });
  }
  var fromPT = html.classList.contains('pt-in'), T0 = performance.now();
  enter();
  w.addEventListener('pageshow', function (e) { if (e.persisted && pt) { pt.classList.remove('is-leave'); html.classList.remove('pt-in'); } });
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a || !pt || reduce) return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(tel|mailto|viber|https?):/i.test(href)) return;
    if (!/\.html(#.*)?$/.test(href)) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    pt.classList.remove('is-enter');
    pt.classList.add('is-leave');
    try { sessionStorage.setItem('at-pt', '1'); } catch (err) {}
    setTimeout(function () { location.href = a.href; }, 620);
  });

  /* ---------- курсор ---------- */
  if (fine && !reduce) {
    var cur = $('.cursor'), ring = cur && $('.cursor__ring', cur), dot = cur && $('.cursor__dot', cur), lbl = cur && $('.cursor__label', cur);
    if (cur) {
      html.classList.add('has-cursor');
      var mx = -100, my = -100, rx = -100, ry = -100;
      w.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)'; }, { passive: true });
      (function loop() {
        rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
        ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
        requestAnimationFrame(loop);
      })();
      d.addEventListener('mouseover', function (e) {
        var t = e.target.closest('[data-cursor]');
        var l = e.target.closest('a, button, label, summary, [role="radio"], input[type="range"]');
        if (t) { cur.classList.add('is-label'); cur.classList.remove('is-link'); lbl.textContent = t.getAttribute('data-cursor'); }
        else { cur.classList.remove('is-label'); cur.classList.toggle('is-link', !!l); }
      });
      d.addEventListener('mouseleave', function () { mx = my = -100; });
    }
  }

  /* ---------- магнитные кнопки ---------- */
  if (fine && !reduce) {
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.3;
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- 3D-наклон карточек ---------- */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', px * 100 + '%');
        el.style.setProperty('--my', py * 100 + '%');
        el.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * 5) + 'deg) rotateY(' + ((px - 0.5) * 6) + 'deg)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- появление фото: 11 разных типов ----------
     rise, led, wipe-l, wipe-r, pill, diag, focus — маски/фокус;
     hex — соты из центра с золотым контуром (как лампы в боксе); blinds — LED-полосы загораются по очереди;
     flip — фото откидывается панелью; lamp — фото «включается» с мерцанием ламп и бликом. */
  var IMG_FROM = {
    rise: 'inset(100% 0% 0% 0%)', led: 'inset(0% 0% 100% 0%)', 'wipe-l': 'inset(0% 100% 0% 0%)', 'wipe-r': 'inset(0% 0% 0% 100%)',
    pill: 'inset(26% 32% 26% 32% round 999px)', diag: 'polygon(0% 0%, 0% 0%, -30% 100%, -30% 100%)'
  };
  var IMG_TO = {
    rise: 'inset(0% 0% 0% 0%)', led: 'inset(0% 0% 0% 0%)', 'wipe-l': 'inset(0% 0% 0% 0%)', 'wipe-r': 'inset(0% 0% 0% 0%)',
    pill: 'inset(0% 0% 0% 0% round 0px)', diag: 'polygon(0% 0%, 130% 0%, 100% 100%, -30% 100%)'
  };
  function hexPts(r) {
    var p = [];
    for (var k = 0; k < 6; k++) { var a = Math.PI / 3 * k + Math.PI / 6; p.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]); }
    return p;
  }
  function hexClip(r) { return 'polygon(' + hexPts(r).map(function (q) { return q[0].toFixed(2) + '% ' + q[1].toFixed(2) + '%'; }).join(', ') + ')'; }
  function stairClip(xs) {   // LED-полосы: лесенка из N горизонтальных полос, у каждой своя длина (0–100%)
    var n = xs.length, pts = ['0% 0%'];
    for (var i = 0; i < n; i++) { var y0 = (i / n * 100).toFixed(2), y1 = ((i + 1) / n * 100).toFixed(2), x = xs[i].toFixed(2); pts.push(x + '% ' + y0 + '%', x + '% ' + y1 + '%'); }
    pts.push('0% 100%');
    return 'polygon(' + pts.join(', ') + ')';
  }
  function deco(el, cls, tag) { var n = d.createElement(tag || 'i'); n.className = cls; n.setAttribute('aria-hidden', 'true'); el.appendChild(n); return n; }
  function revealImg(el, delay) {
    if (el.__rev) return;
    el.__rev = true;
    if (!ANIM) { el.classList.add('is-revealed'); return; }
    var type = el.getAttribute('data-img'), im = el.querySelector('img');
    if (el.hasAttribute('data-img-noscale')) im = null;   // у фонов свой «наезд» по скроллу
    var junk = [];
    var done = function () {
      el.classList.add('is-revealed');
      // снимаем только то, что меняла анимация: трансформацию контейнера не трогаем — у части фото есть параллакс
      gsap.set(el, { clearProps: 'clipPath,opacity,filter' });
      if (type === 'flip' || type === 'focus') gsap.set(el, { rotationX: 0, y: 0, transformPerspective: 0 });
      if (im) gsap.set(im, { clearProps: 'transform' });   // чтобы снова работало увеличение фото при наведении
      junk.forEach(function (n) { n.remove(); });
    };
    var tl = gsap.timeline({ delay: delay || 0, onComplete: done });
    var zoom = function (from, dur) { if (im) tl.fromTo(im, { scale: from }, { scale: 1, duration: dur, ease: 'expo.out' }, 0); };

    if (type === 'focus') {
      tl.fromTo(el, { opacity: 0, y: 46, filter: fine ? 'blur(12px)' : 'blur(0px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.15, ease: 'power3.out' });
      zoom(1.12, 1.6);
      return;
    }
    if (type === 'hex') {
      var o = { r: 0 }, svgNS = 'http://www.w3.org/2000/svg';
      var svg = d.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'img-hex'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
      var poly = d.createElementNS(svgNS, 'polygon'); svg.appendChild(poly); el.appendChild(svg); junk.push(svg);
      var paint = function () { el.style.clipPath = hexClip(o.r); poly.setAttribute('points', hexPts(o.r).map(function (q) { return q[0] + ',' + q[1]; }).join(' ')); };
      paint();
      tl.to(o, { r: 96, duration: 1.5, ease: 'expo.inOut', onUpdate: paint }, 0)
        .to(svg, { opacity: 0, duration: 0.5 }, 1.0);
      zoom(1.3, 2.1);
      return;
    }
    if (type === 'blinds') {
      var N = 6, st = { p: 0 }, xs = [];
      var paintB = function () {
        for (var i = 0; i < N; i++) { var k = Math.min(1, Math.max(0, st.p * (1 + (N - 1) * 0.16) - i * 0.16)); xs[i] = 100 * (1 - Math.pow(1 - k, 3)); }
        el.style.clipPath = stairClip(xs);
      };
      paintB();
      tl.to(st, { p: 1, duration: 1.45, ease: 'power1.inOut', onUpdate: paintB }, 0);
      zoom(1.16, 2);
      return;
    }
    if (type === 'flip') {
      tl.fromTo(el, { transformPerspective: 1100, rotationX: 72, transformOrigin: '50% 100%', opacity: 0, filter: 'brightness(.35)' },
        { rotationX: 0, opacity: 1, filter: 'brightness(1)', duration: 1.35, ease: 'expo.out' }, 0);
      zoom(1.08, 1.6);
      return;
    }
    if (type === 'lamp') {
      var sw = deco(el, 'img-sweep'); junk.push(sw);
      gsap.set(sw, { xPercent: -70, opacity: 0 });
      tl.set(el, { filter: 'brightness(.05)' }, 0)
        .to(el, { filter: 'brightness(.95)', duration: 0.06 }, 0.05)
        .to(el, { filter: 'brightness(.12)', duration: 0.08 }, 0.13)
        .to(el, { filter: 'brightness(.85)', duration: 0.05 }, 0.3)
        .to(el, { filter: 'brightness(.3)', duration: 0.1 }, 0.38)
        .to(el, { filter: 'brightness(1)', duration: 0.6, ease: 'power2.out' }, 0.55)
        .to(sw, { opacity: 1, duration: 0.2 }, 0.6)
        .to(sw, { xPercent: 70, duration: 1.1, ease: 'power2.inOut' }, 0.6)
        .to(sw, { opacity: 0, duration: 0.3 }, 1.4);
      zoom(1.1, 2);
      return;
    }

    var dur = type === 'pill' ? 1.55 : type === 'diag' ? 1.45 : type === 'led' ? 1.35 : 1.25;
    tl.fromTo(el, { clipPath: IMG_FROM[type] }, { clipPath: IMG_TO[type], duration: dur, ease: type === 'pill' ? 'expo.inOut' : 'power4.inOut' }, 0);
    zoom(1.22, dur + 0.6);
    if (type === 'led') {
      var line = deco(el, 'img-led'); junk.push(line);
      tl.fromTo(line, { top: '0%', opacity: 1 }, { top: '100%', duration: dur, ease: 'power4.inOut' }, 0)
        .to(line, { opacity: 0, duration: 0.35 });
    }
    if (type === 'wipe-l' || type === 'wipe-r') {   // золотая кромка, как у ракеля при оклейке
      var edge = deco(el, 'img-edge'); junk.push(edge);
      var L = type === 'wipe-l';
      tl.fromTo(edge, { left: L ? '0%' : '100%', opacity: 1 }, { left: L ? '100%' : '0%', duration: dur, ease: 'power4.inOut' }, 0)
        .to(edge, { opacity: 0, duration: 0.3 });
    }
  }

  /* ---------- FAQ: плавное раскрытие ---------- */
  $$('.faq__item').forEach(function (det) {
    var sum = $('summary', det), body = $('.faq__a', det);
    sum.addEventListener('click', function (e) {
      if (reduce || !body.animate) return;
      e.preventDefault();
      if (det.open) {
        var h = body.offsetHeight;
        body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = function () { det.open = false; refresh(); };
      } else {
        det.open = true;
        var h2 = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: h2 + 'px', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = refresh;
      }
    });
  });
  function refresh() { if (ANIM) ST.refresh(); }

  /* ---------- копировать ---------- */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy');
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Адрес скопирован'); }, function () { toast(t); });
    });
  });

  /* ---------- карусель отзывов ---------- */
  $$('[data-carousel]').forEach(function (car) {
    car.style.overflowX = 'auto';
    car.style.scrollbarWidth = 'none';
    var track = $('.carousel__track', car);
    var down = false, sx = 0, sl = 0, moved = 0;
    car.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = car.scrollLeft; car.classList.add('is-drag'); });
    w.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; moved = Math.abs(dx); car.scrollLeft = sl - dx; });
    w.addEventListener('pointerup', function () { down = false; car.classList.remove('is-drag'); });
    car.addEventListener('click', function (e) { if (moved > 6) e.preventDefault(); }, true);
    var step = function () { var c = $('.rv', track); return c ? c.offsetWidth + 18 : 400; };
    var sec = car.closest('section');
    var prev = sec && $('[data-car-prev]', sec), next = sec && $('[data-car-next]', sec);
    if (prev) prev.addEventListener('click', function () { car.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { car.scrollBy({ left: step(), behavior: 'smooth' }); });
  });

  /* ---------- галерея: фильтр + лайтбокс ---------- */
  var gallery = $('[data-gallery]');
  if (gallery) {
    var items = $$('.gitem', gallery);
    $$('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = btn.getAttribute('data-filter');
        $$('[data-filter]').forEach(function (b) { b.setAttribute('aria-selected', b === btn); });
        items.forEach(function (it) {
          var show = f === 'all' || it.getAttribute('data-tag') === f;
          it.classList.toggle('is-hidden', !show);
          if (show) { var t = $('[data-img]', it); if (t) revealImg(t, 0); }
        });
        if (ANIM) { gsap.fromTo(items.filter(function (i) { return !i.classList.contains('is-hidden'); }), { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.6, ease: 'power3.out', clearProps: 'transform' }); refresh(); }
      });
    });
    var lb = $('.lb'), lbImg = $('.lb__fig img', lb), lbCap = $('.lb__cap', lb), lbN = $('.lb__n', lb), lbi = 0, list = [];
    var show = function (i) {
      lbi = (i + list.length) % list.length;
      var it = list[lbi];
      lbImg.style.opacity = 0;
      var im = new Image();
      im.onload = function () { lbImg.src = im.src; lbImg.alt = it.getAttribute('data-cap'); lbImg.style.opacity = 1; };
      im.src = it.getAttribute('href');
      lbImg.style.transition = 'opacity .35s';
      lbCap.textContent = it.getAttribute('data-cap');
      lbN.textContent = String(lbi + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
    };
    var open = function (it) {
      list = items.filter(function (i) { return !i.classList.contains('is-hidden'); });
      show(list.indexOf(it));
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop();
      d.body.style.overflow = 'hidden';
      $('.lb__x', lb).focus();
    };
    var close = function () { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); if (lenis) lenis.start(); d.body.style.overflow = ''; };
    items.forEach(function (it) { it.addEventListener('click', function (e) { e.preventDefault(); open(it); }); });
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', function () { show(lbi - 1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { show(lbi + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    d.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(lbi - 1);
      if (e.key === 'ArrowRight') show(lbi + 1);
    });
    var tx = 0;
    lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) show(lbi + (dx < 0 ? 1 : -1)); });
    if (location.hash) { var target = d.getElementById(location.hash.slice(1)); if (target && target.classList.contains('gitem')) setTimeout(function () { scrollToEl(target); }, 500); }
  }

  /* ---------- табы прайса ---------- */
  var tabs = $('[data-tabs]');
  if (tabs && 'IntersectionObserver' in w) {
    var links = $$('a', tabs);
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) {
          var on = l.getAttribute('href') === '#' + en.target.id;
          l.classList.toggle('is-on', on);
          if (on) { var tr = tabs.querySelector('.tabs__in'); tr.scrollTo({ left: l.offsetLeft - 20, behavior: 'smooth' }); }
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(function (l) { var s = d.getElementById(l.getAttribute('href').slice(1)); if (s) io.observe(s); });
  }

  /* ---------- СМЕТА ---------- */
  var KEY = 'at-smeta';
  var sel = store.get(KEY, []).filter(function (id) { return DATA.services.some(function (s) { return s.id === id; }); });
  var fab = $('.smeta-fab'), drawer = $('.smeta');
  function svc(id) { return DATA.services.find(function (s) { return s.id === id; }); }
  function smetaText() {
    var lines = sel.map(function (id) { var s = svc(id); return '• ' + s.name + ' — ' + s.priceText; });
    var sum = sel.reduce(function (a, id) { return a + svc(id).price; }, 0);
    return 'Здравствуйте! Хочу записаться в ART TONIR.\nСобрал смету на сайте:\n' + lines.join('\n') + '\nОриентир: от ' + sum.toLocaleString('ru-RU') + ' ₽';
  }
  function renderSmeta() {
    var sum = sel.reduce(function (a, id) { return a + svc(id).price; }, 0);
    $$('[data-add]').forEach(function (b) {
      var on = sel.indexOf(b.getAttribute('data-add')) > -1;
      b.classList.toggle('is-added', on);
      var sp = $('span', b);
      if (sp) sp.textContent = on ? 'В смете' : 'В смету';
      var use = $('use', b);
      if (use) use.setAttribute('href', on ? '#i-check' : '#i-plus');
    });
    if (!fab) return;
    $$('[data-smeta-count]').forEach(function (n) { n.textContent = sel.length; });
    $$('.mbar__smeta').forEach(function (b) { b.hidden = sel.length === 0; });
    fab.hidden = sel.length === 0;
    $('[data-smeta-sum]', fab).textContent = sel.length ? 'от ' + money(sum) : '';
    var list = $('[data-smeta-list]', drawer);
    list.innerHTML = sel.map(function (id) {
      var s = svc(id);
      return '<li><img src="' + s.img + '" alt="" loading="lazy"><div><b>' + s.name + '</b><span>' + s.priceText + '</span></div><button type="button" data-remove="' + id + '" aria-label="Убрать ' + s.name + '"><svg class="ic" aria-hidden="true"><use href="#i-close"/></svg></button></li>';
    }).join('');
    $('[data-smeta-empty]', drawer).hidden = sel.length > 0;
    $('[data-smeta-total]', drawer).textContent = sel.length ? 'от ' + money(sum) : '0 ₽';
    $('[data-smeta-wa]', drawer).href = DATA.wa + '?text=' + encodeURIComponent(sel.length ? smetaText() : 'Здравствуйте! Хочу записаться в ART TONIR.');
    d.dispatchEvent(new CustomEvent('at:smeta', { detail: sel.slice() }));
  }
  w.ATsmeta = { get: function () { return sel.slice(); } };
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) $('.smeta__x', drawer).focus();
  }
  d.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) {
      var id = add.getAttribute('data-add'), i = sel.indexOf(id);
      if (i > -1) { sel.splice(i, 1); toast('Убрано из сметы'); }
      else { sel.push(id); toast('Добавлено в смету · ' + svc(id).name); if (fab) { fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump'); } }
      store.set(KEY, sel); renderSmeta();
    }
    var rm = e.target.closest('[data-remove]');
    if (rm) { sel = sel.filter(function (x) { return x !== rm.getAttribute('data-remove'); }); store.set(KEY, sel); renderSmeta(); }
    if (e.target.closest('[data-smeta-open]')) setDrawer(true);
    if (e.target.closest('[data-smeta-close]')) setDrawer(false);
    if (e.target.closest('[data-smeta-clear]')) { sel = []; store.set(KEY, sel); renderSmeta(); }
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) setDrawer(false); });
  renderSmeta();

  /* ==========================================================================
     GSAP-анимации
     ========================================================================== */
  if (!ANIM) {
    $$('.marquee__track').forEach(function (t) { t.classList.add('css-run'); });
    return;
  }

  // разбивка заголовков на слова
  function splitWords(el) {
    var out = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { out.push(d.createTextNode(' ')); return; }
          var wsp = d.createElement('span'); wsp.className = 'w';
          var inner = d.createElement('span'); inner.textContent = part; wsp.appendChild(inner); out.push(wsp);
        });
      } else if (n.nodeName === 'EM') {
        n.textContent.split(/\s+/).filter(Boolean).forEach(function (part, i) {
          if (i) out.push(d.createTextNode(' '));
          var wsp = d.createElement('span'); wsp.className = 'w';
          var em = d.createElement('em'); em.textContent = part; wsp.appendChild(em); out.push(wsp);
        });
      } else if (n.nodeName === 'BR') { out.push(n); }
      else { var wsp2 = d.createElement('span'); wsp2.className = 'w'; var inn = d.createElement('span'); inn.appendChild(n.cloneNode(true)); wsp2.appendChild(inn); out.push(wsp2); }
    });
    el.textContent = '';
    out.forEach(function (n) { el.appendChild(n); });
  }
  $$('[data-split]').forEach(splitWords);
  gsap.set('[data-split] .w > *', { y: 0, yPercent: 105 });
  ST.batch('[data-split]', { start: 'top 90%', once: true, onEnter: function (els) { els.forEach(function (el) { el.__shown = true; gsap.to($$('.w > *', el), { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06, overwrite: true }); }); } });

  var small = w.matchMedia('(max-width: 760px)').matches;
  ST.batch('[data-reveal]', {
    start: small ? 'top 97%' : 'top 92%', once: true,
    onEnter: function (els) { els.forEach(function (el) { el.__shown = true; }); gsap.to(els, { opacity: 1, y: 0, duration: small ? 0.6 : 1, ease: 'power3.out', stagger: small ? 0.05 : 0.08, overwrite: true, clearProps: 'transform' }); }
  });

  // счётчики
  $$('[data-count]').forEach(function (el) {
    var raw = el.getAttribute('data-count'), dec = (raw.split('.')[1] || '').length, target = parseFloat(raw), o = { v: 0 };
    // реальное значение видно до анимации — счётчик никогда не «застрянет» на нуле
    ST.create({ trigger: el, start: 'top bottom', once: true, onEnter: function () {
      o.v = 0; el.textContent = (0).toFixed(dec);
      gsap.to(o, { v: target, duration: 1.8, ease: 'power3.out', onUpdate: function () { el.textContent = o.v.toFixed(dec); }, onComplete: function () { el.textContent = raw; } });
    } });
  });
  $$('.score').forEach(function (s) { ST.create({ trigger: s, start: 'top 85%', once: true, onEnter: function () { s.classList.add('is-in'); } }); });

  // бегущая строка, реагирует на скорость скролла
  $$('.marquee').forEach(function (m) {
    var t = $('.marquee__track', m);
    var tl = gsap.to(t, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    var dir = 1;
    ST.create({ trigger: m, start: 'top bottom', end: 'bottom top', onUpdate: function (self) {
      var v = self.getVelocity();
      dir = v < 0 ? -1 : 1;
      gsap.to(tl, { timeScale: dir * Math.min(5, 1 + Math.abs(v) / 400), duration: 0.2, overwrite: true });
      gsap.to(tl, { timeScale: dir, duration: 1.2, delay: 0.2, overwrite: false });
    } });
  });

  // манифест: слова загораются по скроллу
  $$('[data-words]').forEach(function (el) {
    var wds = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) return;
      var frag = d.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; }
        var s = d.createElement('span'); s.className = 'wd'; s.textContent = p; frag.appendChild(s); wds.push(s);
      });
      el.replaceChild(frag, n);
    });
    el.classList.add('is-split');
    ST.create({ trigger: el, start: 'top 85%', end: 'bottom 62%', scrub: true, onUpdate: function (self) {
      var k = Math.round(self.progress * wds.length);
      wds.forEach(function (s, i) { s.classList.toggle('on', i < k); });
    } });
  });

  // стопка карточек услуг
  var cards = $$('.stack__card');
  ST.matchMedia({ '(min-width: 961px) and (min-height: 720px)': function () {
    cards.forEach(function (c, i) {
      if (i === cards.length - 1) return;
      gsap.to(c, { scale: 0.93, '--d': 0.55, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 30%', scrub: true } });
    });
    return function () { gsap.set(cards, { clearProps: 'transform,--d' }); };
  } });

  // параллакс
  $$('[data-parallax]').forEach(function (el) {
    gsap.fromTo(el, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // шаги: линия прогресса
  var line = $('.steps__line span');
  if (line) gsap.fromTo(line, { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: '.steps__list', start: 'top 75%', end: 'bottom 60%', scrub: true } });

  // горизонтальная галерея на главной
  var hs = $('[data-hscroll]');
  if (hs) {
    var track = $('[data-htrack]', hs), cnt = $('[data-hcount]', hs), n = $$('.wcard:not(.wcard--more)', track).length;
    ST.matchMedia({
      '(min-width: 961px)': function () {
        var dist = function () { return Math.max(0, track.scrollWidth - w.innerWidth); };
        var tw = gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: {
          trigger: hs, start: 'top top', end: function () { return '+=' + dist(); }, scrub: 0.6, pin: true, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) { if (cnt) cnt.textContent = String(Math.min(n, 1 + Math.floor(self.progress * n))).padStart(2, '0'); }
        } });
        // каждая карточка появляется, когда въезжает в экран при горизонтальной прокрутке
        // те, что видны сразу, — при прокрутке вниз; остальные — когда въезжают в экран при горизонтальной прокрутке
        $$('[data-img]', track).forEach(function (el, k) {
          var visibleAtStart = el.getBoundingClientRect().left < w.innerWidth * 0.9;
          if (visibleAtStart) ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { revealImg(el, k * 0.12); } });
          else ST.create({ trigger: el, containerAnimation: tw, start: 'left 90%', once: true, onEnter: function () { revealImg(el, 0); } });
        });
        $$('.wcard__img img', track).forEach(function (im) {
          gsap.fromTo(im, { xPercent: -6, scale: 1.12 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: im.parentElement, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
        });
        return function () { gsap.set(track, { x: 0 }); };
      }
    });
  }

  // интро главного экрана
  var heroT = $$('.hero__title .ln > span');
  if (heroT.length) {
    var delay = html.classList.contains('pt-in') ? 0.7 : 0.25;
    var tl = gsap.timeline({ delay: delay });
    tl.from('.hero__eyebrow', { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out' })
      .from(heroT, { yPercent: 125, duration: 1.2, ease: 'expo.out', stagger: 0.09 }, '-=0.5')
      .from('.hero__meta > *, .hero__btns > *', { opacity: 0, y: 24, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, '-=0.8')
      .from('.stat', { opacity: 0, y: 20, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, '-=0.8')
      .from('.hero__word span', { opacity: 0, yPercent: 20, duration: 2, stagger: 0.15, ease: 'expo.out' }, 0.2);
    gsap.to('.hero__word', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    ST.matchMedia({ '(min-width: 761px)': function () {
      gsap.to('.hero__in', { yPercent: -12, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center center', end: 'bottom top', scrub: true } });
    } });
  }

  // большой футер-вордмарк
  var fw = $('.ftr__word');
  if (fw) gsap.from($$('span', fw), { yPercent: 60, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: fw, start: 'top 95%' } });

  // герои внутренних страниц
  var pm = $('.phero__media img');
  if (pm) ST.matchMedia({ '(min-width: 961px)': function () {
    gsap.to(pm.parentElement, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.phero', start: 'top top', end: 'bottom top', scrub: true } });
  } });

  // фото: появление по скроллу (разные маски) + плавный «наезд» фона в призывах
  var imgs = $$('[data-img]').filter(function (el) { return !el.closest('[data-htrack]'); });
  ST.batch(imgs, { start: 'top 88%', once: true, onEnter: function (els) {
    var wait = fromPT && performance.now() - T0 < 1400 ? 0.55 : 0;
    els.forEach(function (el, i) { revealImg(el, wait + i * 0.12 + (el.closest('.phero') ? 0.3 : 0)); });
  } });
  // горизонтальная лента «Наши работы» на телефоне: карточка появляется, когда въезжает в ленту
  var htrack = $('[data-htrack]');
  if (htrack && 'IntersectionObserver' in w) {
    var hio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var r = e.target.getBoundingClientRect();
        if (r.top < w.innerHeight && r.bottom > 0 && !w.matchMedia('(min-width: 961px)').matches) { revealImg(e.target, 0); hio.unobserve(e.target); }
      });
    }, { root: htrack, threshold: 0.2 });
    $$('[data-img]', htrack).forEach(function (el) { hio.observe(el); });
  }
  $$('.cta__bg img').forEach(function (im) {
    gsap.fromTo(im, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: im.closest('.cta'), start: 'top bottom', end: 'center center', scrub: true } });
  });

  // страховка: если блок уже на экране, но не появился (сбой расчёта позиций) — показать его.
  // Проверяем только ещё не показанные элементы, в простое браузера; когда показано всё — останавливаемся.
  var pending = $$('[data-img], [data-reveal], [data-split]');
  function inView(el) { var r = el.getBoundingClientRect(); return r.height > 0 && r.top < w.innerHeight * 0.96 && r.bottom > 0 && r.left < w.innerWidth * 0.96 && r.right > 0; }
  function sweep() {
    pending = pending.filter(function (el) {
      var isImg = el.hasAttribute('data-img');
      if (isImg ? el.__rev : el.__shown) return false;
      if (!inView(el)) return true;
      if (isImg) revealImg(el, 0);
      else if (el.hasAttribute('data-split')) { el.__shown = true; gsap.to($$('.w > *', el), { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.05 }); }
      else { el.__shown = true; gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', clearProps: 'transform' }); }
      return false;
    });
    if (!pending.length) clearInterval(sweepT);
  }
  var sweepT = setInterval(function () { (w.requestIdleCallback || setTimeout)(sweep, { timeout: 600 }); }, 1500);

  w.addEventListener('load', function () { ST.refresh(); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ST.refresh(); });
})();

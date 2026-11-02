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

  /* ---------- проявление фото (плёнка уходит) ---------- */
  var tintIO = 'IntersectionObserver' in w ? new IntersectionObserver(function (ents) {
    ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); tintIO.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;
  $$('[data-tint]').forEach(function (el) { tintIO ? tintIO.observe(el) : el.classList.add('is-in'); });

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
          if (show) { var t = $('[data-tint]', it); if (t) t.classList.add('is-in'); }
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
    fab.hidden = sel.length === 0;
    $('[data-smeta-count]', fab).textContent = sel.length;
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
  ST.batch('[data-split]', { start: 'top 90%', once: true, onEnter: function (els) { els.forEach(function (el) { gsap.to($$('.w > *', el), { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06, overwrite: true }); }); } });

  ST.batch('[data-reveal]', {
    start: 'top 92%', once: true,
    onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08, overwrite: true, clearProps: 'transform' }); }
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
    ST.create({ trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: function (self) {
      var k = Math.round(self.progress * wds.length);
      wds.forEach(function (s, i) { s.classList.toggle('on', i < k); });
    } });
    $$('.pill', el).forEach(function (p) { gsap.from(p, { width: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 75%' } }); });
  });

  // стопка карточек услуг
  var cards = $$('.stack__card');
  cards.forEach(function (c, i) {
    if (i === cards.length - 1) return;
    gsap.to(c, { scale: 0.93, '--d': 0.55, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 30%', scrub: true } });
  });

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
      .from(heroT, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.09 }, '-=0.5')
      .from('.hero__meta > *, .hero__btns > *', { opacity: 0, y: 24, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, '-=0.8')
      .from('.hero__hud', { opacity: 0, x: 30, duration: 1, ease: 'power3.out' }, '-=0.6')
      .from('.stat', { opacity: 0, y: 20, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, '-=0.8')
      .from('.hero__word span', { opacity: 0, yPercent: 20, duration: 2, stagger: 0.15, ease: 'expo.out' }, 0.2);
    gsap.to('.hero__word', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__in', { yPercent: -12, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center center', end: 'bottom top', scrub: true } });
  }

  // большой футер-вордмарк
  var fw = $('.ftr__word');
  if (fw) gsap.from($$('span', fw), { yPercent: 60, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: fw, start: 'top 95%' } });

  // герои внутренних страниц
  var pm = $('.phero__media img');
  if (pm) gsap.to(pm, { yPercent: 12, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.phero', start: 'top top', end: 'bottom top', scrub: true } });

  w.addEventListener('load', function () { ST.refresh(); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ST.refresh(); });
})();

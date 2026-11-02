// Генератор страниц сайта ART TONIR.
// Все факты берутся из data/site.json (собрано из карточки 2ГИС).
// Запуск:  node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/img/manifest.json'), 'utf8'));
// Укажите домен, когда он появится (например 'https://arttonir.ru') — подставится в canonical, og:url и sitemap.
const SITE_URL = '';
const VERSION = '1';

/* ───────────────────────── helpers ───────────────────────── */
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nb = (s) => String(s).replace(/ (₽)/g, ' $1').replace(/(\d) (\d)/g, '$1 $2');
const money = (n) => n.toLocaleString('ru-RU').replace(/\s/g, ' ');
const PHONE = D.contacts.phone;
const TEL = D.contacts.phone_href;
const TG = D.contacts.telegram;
const VK = D.contacts.vk;
const VIBER = D.contacts.viber;
const WA_BASE = D.contacts.whatsapp;
const wa = (text = 'Здравствуйте! Хочу записаться в ART TONIR.') => `${WA_BASE}?text=${encodeURIComponent(text)}`;
const waService = (name) => wa(`Здравствуйте! Хочу записаться в ART TONIR на услугу «${name}».`);
const GIS_FIRM = 'https://2gis.ru/biysk/firm/2815279048724091';
const GIS_REVIEWS = 'https://2gis.ru/biysk/firm/2815279048724091/tab/reviews';
const { lat, lon } = D.location;
const YA_ROUTE = `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto`;
const R = D.rating_2gis;

function img(src, alt, { sizes = '100vw', cls = '', eager = false, attrs = '' } = {}) {
  // src — путь без суффикса ширины, например 'gallery/01_black-fullsize-suv_yard'
  const isSvc = src.startsWith('services/');
  const widths = isSvc ? [400, 800] : [640, 1280];
  const files = widths.map((w) => `assets/img/${src}-${w}.webp`);
  const big = MANIFEST[files[1]];
  if (!big) throw new Error('Нет картинки: ' + files[1]);
  const srcset = files.map((f) => `${f} ${MANIFEST[f][0]}w`).join(', ');
  return `<img src="${files[1]}" srcset="${srcset}" sizes="${sizes}" width="${big[0]}" height="${big[1]}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${attrs ? ' ' + attrs : ''}>`;
}
const imgUrl = (src, w = 1280) => `assets/img/${src}-${w}.webp`;

/* ───────────────────────── данные ───────────────────────── */
// Порядок направлений на сайте: тонировка — главное (в 2ГИС студия подписана «Тонинг-центр»).
const CATS = [
  {
    slug: 'tonirovka', key: 'Тонирование любой сложности', short: 'Тонировка', h1: 'Тонирование <em>любой сложности</em>',
    hero: 'gallery/02_white-sedan-xiaomi-su7-like_vertical', heroAlt: 'Белый спортивный седан после тонировки у бокса ART TONIR',
    lead: 'Задняя полусфера, атермальная плёнка, тонирование по ГОСТ и декоративный «хамелеон». Сделаем аккуратно и в назначенное время.',
    seoTitle: 'Тонировка автомобиля в Бийске — от 5 000 ₽ | ART TONIR',
    seoDesc: 'Тонировка авто в Бийске: задняя полусфера от 8 000 ₽, атермальная плёнка от 5 000 ₽, по ГОСТ и хамелеон от 8 000 ₽. Рейтинг 5.0 в 2ГИС. Запись в WhatsApp.',
    tool: 'tint', works: ['07_skoda-kodiaq-black_snow', '17_bmw-x6-black_snow', '13_chery-tiggo-grey-front_vertical', '10_bmw-black-crossover-rear_yard'],
    faq: [0, 1, 2],
  },
  {
    slug: 'antigravijnaya-plenka', key: 'Оклейка антигравийной плёнкой', short: 'Антигравийная плёнка', h1: 'Антигравийная <em>плёнка</em>',
    hero: 'gallery/08_white-suv-in-studio_wrap-process', heroAlt: 'Белый внедорожник в боксе ART TONIR во время оклейки плёнкой',
    lead: 'Полная оклейка кузова прозрачным, матовым или цветным полиуретаном — защита от сколов, царапин, реагентов и выгорания. Плюс защита элементов салона.',
    seoTitle: 'Антигравийная плёнка в Бийске — оклейка кузова полиуретаном | ART TONIR',
    seoDesc: 'Оклейка кузова полиуретановой плёнкой в Бийске: прозрачный и матовый полиуретан от 180 000 ₽, цветной от 200 000 ₽, элементы салона от 2 000 ₽. ART TONIR.',
    tool: 'stone', works: ['21_toyota-rav4-white_studio_vertical', '15_mercedes-glc-coupe-white-front', '01_black-fullsize-suv_yard', '16_mercedes-glc-coupe-white-rear'],
    faq: [4, 5],
  },
  {
    slug: 'vinil', key: 'Оклейка цветными и виниловыми плёнками', short: 'Винил и антихром', h1: 'Винил, цвет <em>и антихром</em>',
    hero: 'gallery/22_lada-niva-forest-wrap-roofbox_vertical', heroAlt: 'Нива с виниловой оклейкой «лес» и автобоксом на крыше',
    lead: 'Замена цвета без покраски — мат, глянец. Индивидуальная графика для мототехники и антихром: хром в чёрный глянец или мат.',
    seoTitle: 'Оклейка авто винилом, замена цвета и антихром в Бийске | ART TONIR',
    seoDesc: 'Замена цвета авто плёнкой в Бийске от 150 000 ₽, брендирование мототехники от 20 000 ₽, антихром 5 000 ₽. Мат и глянец без покраски. ART TONIR, рейтинг 5.0.',
    tool: 'color', works: ['12_snowmobile-red-black-wrap_studio_vertical', '20_mercedes-v-class-black_yard', '04_bmw-pair-black-white_yard', '25_red-suv_yard'],
    faq: [],
  },
  {
    slug: 'shumoizolyaciya', key: 'Шумо/виброизоляция', short: 'Шумоизоляция', h1: 'Шумо- и <em>виброизоляция</em>',
    hero: 'gallery/18_white-suv-hood-open_master-at-work_vertical', heroAlt: 'Мастер ART TONIR работает с белым кроссовером в боксе',
    lead: 'Колёсные арки, двери, багажное отделение. Если нужно — аккуратно снимем и установим центральную торпеду.',
    seoTitle: 'Шумоизоляция автомобиля в Бийске — арки, двери, багажник | ART TONIR',
    seoDesc: 'Шумоизоляция авто в Бийске: двери от 7 500 ₽, багажное отделение 25 000 ₽, колёсные арки от 30 000 ₽, снятие и установка торпеды от 30 000 ₽. ART TONIR.',
    tool: 'noise', works: ['19_dark-grey-offroad-suv_vertical', '03_white-ford-raptor_yard', '23_range-rover-white_snow', '06_mazda-cx5-beige_yard'],
    faq: [],
  },
  {
    slug: 'polirovka', key: 'Полировка', short: 'Полировка', h1: 'Полировка <em>и керамика</em>',
    hero: 'gallery/15_mercedes-glc-coupe-white-front', heroAlt: 'Белый Mercedes GLC Coupe у бокса ART TONIR',
    lead: 'Полировка кузова с керамическим защитным составом, антидождь на стёкла и восстановление прозрачности фар.',
    seoTitle: 'Полировка авто, керамика, антидождь и полировка фар в Бийске | ART TONIR',
    seoDesc: 'Полировка кузова с керамикой в Бийске от 40 000 ₽, антидождь на стёкла от 4 000 ₽, полировка фар от 1 000 ₽. ART TONIR — рейтинг 5.0 в 2ГИС, запись в WhatsApp.',
    tool: 'rain', works: ['05_bmw-grey-crossover-rear_snow', '24_white-crossover_dirt-yard', '14_chery-tiggo-grey-side_vertical', '15_mercedes-glc-coupe-white-front'],
    faq: [],
  },
];

let sid = 0;
const SERVICES = [];
for (const c of CATS) {
  const src = D.services.find((s) => s.category === c.key);
  c.items = src.items.map((it) => {
    sid++;
    const id = 's' + String(sid).padStart(2, '0');
    const name = it.name.replace(/^Кузовок/, 'Кузов');
    const imgs = it.photos.map((p) => 'services/' + path.basename(p, '.jpg'));
    const o = { id, name, priceText: nb(it.price_text), price: it.price_rub_from, from: it.price_text.startsWith('от'), desc: it.description, imgs, cat: c.slug, catName: c.short };
    SERVICES.push(o);
    return o;
  });
  c.min = Math.min(...c.items.map((i) => i.price));
  c.cover = c.items[0].imgs[0];
}
CATS.forEach((c, i) => (c.num = String(i + 1).padStart(2, '0')));

const GAL_ALT = {};
const GALLERY = D.photos.gallery
  .filter((p) => !/CUSTOMER/.test(p.file))
  .map((p) => {
    const src = 'gallery/' + path.basename(p.file, '.jpg');
    const name = path.basename(p.file, '.jpg');
    const tag = /studio|in-studio|master/.test(name) ? 'studio' : /snow/.test(name) ? 'winter' : 'yard';
    const vertical = /vertical/.test(name);
    GAL_ALT[name] = p.description;
    return { src, name, alt: p.description, tag, vertical, date: p.uploaded };
  });
const gal = (name) => GALLERY.find((g) => g.name === name);

const FAQ = D.faq_questions_from_2gis.map((f) => ({
  q: f.q,
  a: f.known
    ? f.known
        .replace('Из прайса: ', 'По прайсу: ')
        .replace(' — по телефону/WhatsApp.', ' — уточните по телефону или в WhatsApp.')
        .replace('По отзывам клиентов — да (полиуретан на фары, в т.ч. фотохромный). Цену уточнить.', 'Да — клиенты в отзывах пишут о бронировании фар полиуретаном, в том числе фотохромным. Стоимость уточните по телефону или в WhatsApp.')
    : 'Уточните по телефону или в WhatsApp — ответим.',
}));

const REVIEWS = D.reviews;
const EXTRA = D.services_without_price;

/* ───────────────────────── иконки ───────────────────────── */
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-wa" viewBox="0 0 24 24"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.92-4.66-4.1-.13-.18-1.11-1.48-1.11-2.82 0-1.34.7-2 .95-2.27.25-.27.54-.34.72-.34h.52c.17 0 .4-.06.62.48.24.56.8 1.94.87 2.08.07.14.11.3.02.48-.09.18-.14.3-.27.46l-.41.48c-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.34Z"/></symbol>
<symbol id="i-tg" viewBox="0 0 24 24"><path fill="currentColor" d="M21.94 4.3 18.9 19.04c-.23 1.02-.83 1.27-1.69.79l-4.66-3.43-2.25 2.16c-.25.25-.46.46-.94.46l.34-4.76 8.66-7.83c.38-.34-.08-.52-.58-.19L7.07 13.02l-4.6-1.44c-1-.31-1.02-1 .21-1.48l18-6.94c.83-.3 1.56.2 1.26 1.14Z"/></symbol>
<symbol id="i-phone" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M5 3.5h3.2l1.6 4.3-2.1 1.4a11.5 11.5 0 0 0 7.1 7.1l1.4-2.1 4.3 1.6V19a1.6 1.6 0 0 1-1.7 1.6C10.3 20.1 3.9 13.7 3.4 5.2A1.6 1.6 0 0 1 5 3.5Z"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6"/></symbol>
<symbol id="i-arrow-up" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M8 7h9v9"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path fill="currentColor" d="m12 2.6 2.8 6 6.6.7-4.9 4.5 1.4 6.5L12 17l-5.9 3.3 1.4-6.5-4.9-4.5 6.6-.7L12 2.6Z"/></symbol>
<symbol id="i-vk" viewBox="0 0 24 24"><path fill="currentColor" d="M12.8 18.2C6.3 18.2 2.6 13.8 2.4 6.3h3.3c.1 5.5 2.6 7.8 4.5 8.3V6.3h3.1v4.7c1.9-.2 3.9-2.4 4.6-4.7H21c-.5 2.9-2.6 5.1-4.1 6 1.5.7 3.9 2.6 4.8 5.9h-3.4c-.7-2.2-2.5-4-4.9-4.2v4.2h-.6Z"/></symbol>
<symbol id="i-viber" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12 3c5 0 8.5 1.6 8.5 7.5S17 18 12 18c-.8 0-1.6-.1-2.3-.2L6.5 21v-3.9C4.4 16 3.5 13.9 3.5 10.5 3.5 4.6 7 3 12 3Zm-2.2 4.2c-.5-.3-1.1 0-1.4.5-.5.8 0 2.5 1.6 4.2 1.6 1.7 3.4 2.4 4.3 1.9.5-.3.8-.9.4-1.4l-.9-.8c-.3-.3-.8-.3-1.1 0l-.4.4c-.9-.4-1.8-1.3-2.2-2.2l.4-.4c.3-.3.3-.8 0-1.1l-.7-1.1ZM13 6.5a4 4 0 0 1 3.5 3.6M13 8.6a2 2 0 0 1 1.5 1.5"/></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 1.8"/></symbol>
<symbol id="i-card" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M3.5 6.5h17v11h-17zM3.5 10h17M7 14.5h3"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></symbol>
<symbol id="i-door" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V21M3 21h18M15 12h.01"/></symbol>
<symbol id="i-list" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></symbol>
<symbol id="i-sound" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></symbol>
<symbol id="i-bolt" viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 2 4 14h6.5L9.5 22 20 9.5h-6.6L13.5 2Z"/></symbol>
</svg>`;
const ic = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const stars = (n = 5) => `<span class="stars" aria-label="${n} из 5">${ic('star').repeat(n)}</span>`;

/* ───────────────────────── общие блоки ───────────────────────── */
const LOGO = fs.readFileSync(path.join(ROOT, 'assets/img/logo/logo.svg'), 'utf8')
  .replace(/<svg[^>]*>/, '<svg viewBox="0 0 776 776" aria-hidden="true" focusable="false">');

const brand = (cls = '') => `<a class="brand ${cls}" href="index.html" aria-label="ART TONIR — на главную">
  <span class="brand__badge">${LOGO}</span>
  <span class="brand__txt"><b>ART TONIR</b><i>Tuning Studio</i></span>
</a>`;

function header(active) {
  const a = (k) => (k === active ? ' aria-current="page"' : '');
  const mega = CATS.map((c) => `<a class="mega__card" href="${c.slug}.html">
        <span class="mega__img">${img(c.cover, c.short, { sizes: '220px' })}</span>
        <span class="mega__num">${c.num}</span>
        <span class="mega__name">${c.short}</span>
        <span class="mega__price">от ${money(c.min)}&nbsp;₽</span>
      </a>`).join('');
  return `<header class="hdr" data-hdr>
  <div class="container hdr__in">
    ${brand()}
    <nav class="nav" aria-label="Основное меню">
      <div class="nav__dd">
        <a href="uslugi.html"${a('uslugi')} class="nav__link">Услуги и цены <svg class="ic ic--xs" aria-hidden="true"><use href="#i-plus"/></svg></a>
        <div class="mega" role="group" aria-label="Направления">
          <div class="mega__grid">${mega}</div>
          <a class="mega__all" href="uslugi.html">Весь прайс — 16 позиций ${ic('arrow')}</a>
        </div>
      </div>
      <a class="nav__link" href="raboty.html"${a('raboty')}>Работы</a>
      <a class="nav__link" href="otzyvy.html"${a('otzyvy')}>Отзывы</a>
      <a class="nav__link" href="studiya.html"${a('studiya')}>Студия</a>
      <a class="nav__link" href="kontakty.html"${a('kontakty')}>Контакты</a>
    </nav>
    <div class="hdr__act">
      <a class="hdr__phone" href="${TEL}">${ic('phone', 'ic ic--sm')}<span>${PHONE}</span></a>
      <a class="btn btn--gold btn--sm" href="zapis.html" data-magnetic><span>Записаться</span>${ic('arrow')}</a>
      <button class="burger" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mmenu"><span></span><span></span></button>
    </div>
  </div>
</header>
<div class="mmenu" id="mmenu" aria-hidden="true">
  <div class="mmenu__grid" aria-hidden="true"></div>
  <nav class="mmenu__nav" aria-label="Мобильное меню">
    <a href="index.html"><i>00</i>Главная</a>
    <a href="uslugi.html"><i>01</i>Услуги и цены</a>
    <div class="mmenu__sub">${CATS.map((c) => `<a href="${c.slug}.html">${c.short}</a>`).join('')}</div>
    <a href="raboty.html"><i>02</i>Работы</a>
    <a href="otzyvy.html"><i>03</i>Отзывы</a>
    <a href="studiya.html"><i>04</i>Студия</a>
    <a href="kontakty.html"><i>05</i>Контакты</a>
    <a href="zapis.html"><i>06</i>Онлайн-запись</a>
  </nav>
  <div class="mmenu__foot">
    <a class="btn btn--gold" href="${wa()}" target="_blank" rel="noopener">${ic('wa')}<span>Записаться в WhatsApp</span></a>
    <a class="mmenu__phone" href="${TEL}">${PHONE}</a>
    <p>${esc(D.location.address_short)} · 09:00–19:00, по записи</p>
  </div>
</div>`;
}

function footer() {
  return `<footer class="ftr">
  <div class="container">
    <div class="ftr__top">
      <div class="ftr__cta">
        <p class="eyebrow">Запись</p>
        <p class="ftr__big">Пишите — <em>подберём</em><br>и запишем</p>
        <div class="btn-row">
          <a class="btn btn--gold" href="${wa()}" target="_blank" rel="noopener" data-magnetic>${ic('wa')}<span>Записаться в WhatsApp</span></a>
          <a class="btn btn--ghost" href="${TEL}">${ic('phone')}<span>Позвонить</span></a>
          <a class="btn btn--icon" href="${TG}" target="_blank" rel="noopener" aria-label="Telegram">${ic('tg')}</a>
        </div>
      </div>
      <div class="ftr__cols">
        <div>
          <p class="ftr__h">Услуги</p>
          ${CATS.map((c) => `<a href="${c.slug}.html">${c.short}</a>`).join('')}
          <a href="uslugi.html">Весь прайс</a>
        </div>
        <div>
          <p class="ftr__h">Студия</p>
          <a href="raboty.html">Наши работы</a>
          <a href="otzyvy.html">Отзывы</a>
          <a href="studiya.html">О студии</a>
          <a href="kontakty.html">Контакты</a>
          <a href="zapis.html">Онлайн-запись</a>
        </div>
        <div>
          <p class="ftr__h">Контакты</p>
          <a href="${TEL}">${PHONE}</a>
          <a href="kontakty.html">${esc(D.location.address_short)}</a>
          <span>09:00–19:00, по записи</span>
          <div class="socials">
            <a href="${wa()}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('wa')}</a>
            <a href="${TG}" target="_blank" rel="noopener" aria-label="Telegram">${ic('tg')}</a>
            <a href="${VIBER}" aria-label="Viber">${ic('viber')}</a>
            <a href="${VK}" target="_blank" rel="noopener" aria-label="ВКонтакте">${ic('vk')}</a>
          </div>
        </div>
      </div>
    </div>
    <div class="ftr__word" aria-hidden="true"><span>ART</span><span>TONIR</span></div>
    <div class="ftr__bottom">
      ${brand('brand--sm')}
      <p>${esc(D.business.legal_entity)} · Цены ориентировочные и не являются публичной офертой.</p>
      <p>Рейтинг и отзывы — по данным <a href="${GIS_FIRM}" target="_blank" rel="noopener">2ГИС</a></p>
    </div>
  </div>
</footer>`;
}

const mobileBar = () => `<div class="mbar" aria-label="Быстрая связь">
  <a class="mbar__main" href="${wa()}" target="_blank" rel="noopener">${ic('wa')}<span>Записаться</span></a>
  <a href="${TEL}" aria-label="Позвонить">${ic('phone')}<span>Звонок</span></a>
  <a href="${TG}" target="_blank" rel="noopener" aria-label="Telegram">${ic('tg')}<span>Telegram</span></a>
</div>`;

const smeta = () => `<button class="smeta-fab" type="button" data-smeta-open aria-label="Открыть смету" hidden>
  ${ic('list')}<span class="smeta-fab__txt">Смета</span><b data-smeta-count>0</b><span class="smeta-fab__sum" data-smeta-sum></span>
</button>
<aside class="smeta" aria-hidden="true" aria-label="Смета">
  <div class="smeta__scrim" data-smeta-close></div>
  <div class="smeta__panel" role="dialog" aria-modal="true" aria-labelledby="smeta-title">
    <div class="smeta__head">
      <p class="eyebrow">Предварительно</p>
      <h2 id="smeta-title">Ваша смета</h2>
      <button class="smeta__x" type="button" data-smeta-close aria-label="Закрыть">${ic('close')}</button>
    </div>
    <ul class="smeta__list" data-smeta-list></ul>
    <div class="smeta__empty" data-smeta-empty>Добавляйте услуги кнопкой «${ic('plus', 'ic ic--xs')} В смету» — посчитаем ориентир.</div>
    <div class="smeta__foot">
      <div class="smeta__total"><span>Итого, ориентир</span><b data-smeta-total>0 ₽</b></div>
      <p class="smeta__note">Цены «от» — точная стоимость зависит от автомобиля и материалов. Не является публичной офертой.</p>
      <a class="btn btn--gold btn--block" data-smeta-wa href="${wa()}" target="_blank" rel="noopener">${ic('wa')}<span>Отправить в WhatsApp</span></a>
      <a class="btn btn--ghost btn--block" href="zapis.html">Оформить запись ${ic('arrow')}</a>
      <button class="smeta__clear" type="button" data-smeta-clear>Очистить</button>
    </div>
  </div>
</aside>`;

const chrome = () => `<div class="pt" aria-hidden="true"><div class="pt__film"><span class="pt__edge"></span><span class="pt__logo">${LOGO}</span></div></div>
<div class="cursor" aria-hidden="true"><div class="cursor__ring"><span class="cursor__label"></span></div><div class="cursor__dot"></div></div>
<div class="toast" role="status" aria-live="polite"></div>`;

function schema() {
  const o = {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: 'ART TONIR (Арт Тонир)',
    alternateName: ['Арт Тонир', 'ART TONIR Tuning Studio', 'Art Tonir'],
    description: 'Тюнинг-студия в Бийске: тонировка, антигравийная плёнка, оклейка винилом, шумоизоляция, полировка.',
    image: (SITE_URL || '') + '/assets/img/og.jpg',
    logo: (SITE_URL || '') + '/assets/img/logo/logo-512.png',
    telephone: '+79132403666',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Советская улица, 217/7, ГСК «Берег», бокс 226',
      addressLocality: 'Бийск',
      addressRegion: 'Алтайский край',
      postalCode: '659321',
      addressCountry: 'RU',
    },
    geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lon },
    openingHours: '09:00-19:00',
    paymentAccepted: 'Наличные, оплата через банк, перевод с карты',
    priceRange: '₽₽',
    sameAs: [VK, GIS_FIRM],
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '5.0', ratingCount: R.ratings_count, reviewCount: R.reviews_count, bestRating: '5' },
  };
  if (SITE_URL) o.url = SITE_URL + '/';
  return `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
}

function page({ file, title, desc, active, body, bodyClass = '', scripts = [], importmap = false, preload = '' }) {
  const canonical = SITE_URL ? `<link rel="canonical" href="${SITE_URL}/${file === 'index.html' ? '' : file}">\n<meta property="og:url" content="${SITE_URL}/${file === 'index.html' ? '' : file}">` : '';
  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0B0B0B">
${canonical}
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="ART TONIR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE_URL}/assets/img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/logo/logo-32.png">
<link rel="apple-touch-icon" href="assets/img/logo/logo-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600;1,700&family=JetBrains+Mono:wght@400;500&family=Rye&display=swap">
<link rel="stylesheet" href="assets/css/main.css?v=${VERSION}">
${preload}
<script>(function(d){var h=d.documentElement;h.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){h.classList.add('anim');setTimeout(function(){if(!window.__AT_READY){h.classList.remove('anim')}},4000)}try{if(sessionStorage.getItem('at-pt')){h.classList.add('pt-in');sessionStorage.removeItem('at-pt')}}catch(e){}})(document)</script>
${importmap ? `<script type="importmap">{"imports":{"three":"./assets/vendor/three/three.module.min.js","three/addons/":"./assets/vendor/three/addons/"}}</script>` : ''}
${schema()}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Перейти к содержанию</a>
${SPRITE}
${chrome()}
${header(active)}
<main id="main">
${body}
</main>
${footer()}
${mobileBar()}
${smeta()}
<script src="assets/vendor/gsap.min.js" defer></script>
<script src="assets/vendor/ScrollTrigger.min.js" defer></script>
<script src="assets/vendor/lenis.min.js" defer></script>
<script src="assets/js/data.js?v=${VERSION}" defer></script>
<script src="assets/js/app.js?v=${VERSION}" defer></script>
${scripts.map((s) => (s.endsWith('.mjs') ? `<script type="module" src="${s}?v=${VERSION}"></script>` : `<script src="${s}?v=${VERSION}" defer></script>`)).join('\n')}
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, file), html.replace(/\n{3,}/g, '\n\n'));
  PAGES.push(file);
}
const PAGES = [];

/* ───────────────────────── блоки контента ───────────────────────── */
const btnWA = (text = 'Записаться в WhatsApp', href = wa(), cls = 'btn btn--gold') => `<a class="${cls}" href="${href}" target="_blank" rel="noopener" data-magnetic>${ic('wa')}<span>${text}</span></a>`;
const btnCall = (cls = 'btn btn--ghost') => `<a class="${cls}" href="${TEL}">${ic('phone')}<span>Позвонить</span></a>`;
const btnTG = () => `<a class="btn btn--icon" href="${TG}" target="_blank" rel="noopener" aria-label="Написать в Telegram">${ic('tg')}</a>`;

const eyebrow = (t) => `<p class="eyebrow" data-reveal>${t}</p>`;
const ratingChip = () => `<a class="chip chip--rating" href="${GIS_REVIEWS}" target="_blank" rel="noopener">${ic('star', 'ic ic--gold')} <b>5.0</b> в 2ГИС · ${R.ratings_count} оценки · ${R.reviews_count} отзыва</a>`;
const hoursChip = () => `<span class="chip">${ic('clock')} Работаем по записи, 09:00–19:00</span>`;

const marquee = (words, cls = '') => `<div class="marquee ${cls}" aria-hidden="true"><div class="marquee__track">${[0, 1].map(() => `<div class="marquee__row">${words.map((w, i) => `<span class="${i % 2 ? 'o' : ''}">${w}</span><i>✦</i>`).join('')}</div>`).join('')}</div></div>`;

function serviceRow(s, i) {
  const pics = s.imgs.map((p, k) => img(p, `${s.name} — ART TONIR, Бийск${k ? ' (фото 2)' : ''}`, { sizes: '(max-width: 760px) 92vw, 440px' })).join('');
  return `<article class="svc" id="${s.id}" data-reveal>
  <div class="svc__media${s.imgs.length > 1 ? ' svc__media--duo' : ''}" data-tint>${pics}</div>
  <div class="svc__body">
    <p class="svc__idx">${s.id.replace('s', '№ ')}</p>
    <h3 class="svc__name">${esc(s.name)}</h3>
    <p class="svc__price"><b>${s.priceText}</b></p>
    <p class="svc__desc">${esc(s.desc)}</p>
    <div class="btn-row">
      ${btnWA('Записаться', waService(s.name), 'btn btn--gold btn--sm')}
      <button class="btn btn--ghost btn--sm" type="button" data-add="${s.id}">${ic('plus')}<span>В смету</span></button>
    </div>
  </div>
</article>`;
}

function faqList(items) {
  return `<div class="faq">${items.map((f, i) => `<details class="faq__item" data-reveal${i === 0 ? ' open' : ''}>
    <summary><span class="faq__n">${String(i + 1).padStart(2, '0')}</span><span class="faq__q">${esc(f.q)}</span><span class="faq__pm" aria-hidden="true"></span></summary>
    <div class="faq__a"><p>${esc(f.a)}</p></div>
  </details>`).join('')}</div>`;
}

function reviewCard(r, opts = {}) {
  return `<figure class="rv${opts.cls ? ' ' + opts.cls : ''}">
  <div class="rv__top">${stars(r.stars)}<span class="rv__src">Отзыв из 2ГИС</span></div>
  <blockquote class="rv__text">${esc(r.text)}</blockquote>
  <figcaption class="rv__who"><span class="rv__ava" aria-hidden="true">${esc(r.author.trim()[0])}</span><span><b>${esc(r.author)}</b><time>${esc(r.date)}</time></span>${r.note && r.note.includes('выбран') ? '<span class="rv__pick">Выбран компанией</span>' : ''}</figcaption>
</figure>`;
}

function ctaBlock({ title = 'Запишитесь в <em>ART TONIR</em>', text = 'Напишите в WhatsApp или позвоните — подскажем по вариантам и подберём удобное время.', photo = 'gallery/10_bmw-black-crossover-rear_yard', alt = 'Чёрный BMW, вид сзади, у бокса ART TONIR' } = {}) {
  return `<section class="cta" data-cursor-zone>
  <div class="cta__bg" data-parallax>${img(photo, alt, { sizes: '100vw' })}</div>
  <div class="container cta__in">
    ${eyebrow('Запишитесь сейчас')}
    <h2 class="h2 cta__title" data-split>${title}</h2>
    <p class="cta__text" data-reveal>${text}</p>
    <div class="btn-row" data-reveal>${btnWA()}${btnCall()}${btnTG()}</div>
    <p class="cta__addr" data-reveal>${ic('pin', 'ic ic--sm')} ${esc(D.location.address_short)}</p>
  </div>
</section>`;
}

function crumbs(items) {
  return `<nav class="crumbs" aria-label="Хлебные крошки"><a href="index.html">Главная</a>${items.map(([t, h]) => (h ? `<span>/</span><a href="${h}">${t}</a>` : `<span>/</span><span aria-current="page">${t}</span>`)).join('')}</nav>`;
}

/* SVG-автомобиль для визуализаторов (вид сбоку) */
function carSVG(mode) {
  return `<svg class="car" viewBox="0 0 1000 560" role="img" aria-label="Схема автомобиля сбоку">
  <defs>
    <linearGradient id="g-body-${mode}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/>
      <stop offset=".38" stop-color="#fff" stop-opacity=".06"/>
      <stop offset=".42" stop-color="#000" stop-opacity=".0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".5"/>
    </linearGradient>
    <linearGradient id="g-sky-${mode}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e9eef3"/><stop offset=".55" stop-color="#9aa6b2"/><stop offset="1" stop-color="#5d6772"/>
    </linearGradient>
    <linearGradient id="g-cham-${mode}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6b3cff"/><stop offset=".35" stop-color="#18c5b5"/><stop offset=".7" stop-color="#3f7bff"/><stop offset="1" stop-color="#b04cff"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="-0.6 0;0.6 0;-0.6 0" dur="6s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="g-chrome-${mode}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#8d949b"/><stop offset="1" stop-color="#e8ebee"/></linearGradient>
    <radialGradient id="g-rim-${mode}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3a3d42"/><stop offset=".75" stop-color="#1b1c1f"/><stop offset="1" stop-color="#0c0c0d"/></radialGradient>
    <clipPath id="c-glass-${mode}"><path d="M190 186C214 152 244 128 292 121L318 120V188H190Z M334 119H486V188H334Z M502 117H560C592 117 614 124 632 136L698 184V188H502Z"/></clipPath>
  </defs>
  <linearGradient id="g-fade-${mode}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="m-fade-${mode}" maskUnits="userSpaceOnUse" x="0" y="392" width="1000" height="300"><rect x="0" y="392" width="1000" height="300" fill="url(#g-fade-${mode})"/></mask>
  <use href="#car-main-${mode}" class="car__refl-g" transform="translate(0 784) scale(1 -1)" mask="url(#m-fade-${mode})"/>
  <ellipse class="car__shadow" cx="520" cy="392" rx="440" ry="16"/>
  <g id="car-main-${mode}">
  <path class="car__body" d="M122 320C104 318 98 302 98 286L100 238C101 216 108 202 124 194L162 172C204 132 240 112 302 104L560 100C600 99 628 106 654 122L744 182C802 188 870 196 908 210C932 220 944 236 946 256L948 290C948 308 938 318 920 320H844A78 78 0 0 0 690 320H336A78 78 0 0 0 182 320Z"/>
  <path class="car__shade" fill="url(#g-body-${mode})" d="M122 320C104 318 98 302 98 286L100 238C101 216 108 202 124 194L162 172C204 132 240 112 302 104L560 100C600 99 628 106 654 122L744 182C802 188 870 196 908 210C932 220 944 236 946 256L948 290C948 308 938 318 920 320H844A78 78 0 0 0 690 320H336A78 78 0 0 0 182 320Z"/>
  <path class="car__gloss" d="M170 214C400 204 700 204 920 224" />
  <path class="car__sill" d="M340 306H688"/>
  <g class="car__glass" clip-path="url(#c-glass-${mode})">
    <rect x="180" y="110" width="530" height="90" fill="url(#g-sky-${mode})"/>
    <g class="car__inside"><rect x="236" y="138" width="34" height="40" rx="12"/><rect x="398" y="134" width="40" height="46" rx="14"/><rect x="556" y="136" width="40" height="44" rx="14"/><path d="M620 170h70v14h-70z"/></g>
    <path class="car__refl" d="M260 110 L330 110 L250 200 L180 200Z M520 110 L560 110 L480 200 L440 200Z"/>
    <path class="tint tint--rear" d="M180 110H494V200H180Z"/>
    <path class="tint tint--front" d="M494 110H710V200H494Z"/>
  </g>
  <path class="car__pillars" d="M318 118H334V190H318Z M486 116H502V190H486Z"/>
  <path class="car__chrome" d="M188 190H700"/>
  <path class="car__lines" d="M494 192V300 M334 192C334 230 330 270 318 300 M700 196V280C702 296 696 304 688 306 M470 214h22 M664 214h22"/>
  <path class="car__mirror" d="M690 176C700 168 722 168 730 176L734 192H700Z"/>
  <path class="car__tail" d="M100 218C100 208 106 202 116 200L132 196V226L102 230Z"/>
  <path class="car__head" d="M892 214C912 216 930 224 938 236L940 244H902C896 236 892 226 892 214Z"/>
  <path class="car__grille" d="M940 262H948V282H942Z"/>
  ${[258, 766].map((x) => `<g class="car__wheel" transform="translate(${x} 330)"><circle r="62" class="car__tire"/><circle r="44" fill="url(#g-rim-${mode})"/><g class="car__spokes">${[0, 72, 144, 216, 288].map((a) => `<path transform="rotate(${a})" d="M-5 -10 L-9 -40 L9 -40 L5 -10Z"/>`).join('')}</g><circle r="9" class="car__hub"/></g>`).join('')}
  </g>
</svg>`;
}

function toolBlock(kind) {
  if (kind === 'tint') {
    return `<section class="section tool tool--tint" data-tool="tint">
  <div class="container tool__grid">
    <div class="tool__text">
      ${eyebrow('Визуализатор')}
      <h2 class="h2" data-split>Подберите <em>затемнение</em></h2>
      <p class="lead" data-reveal>Двигайте ползунок — посмотрите, как меняется задняя полусфера. Для лобового и передних боковых стёкол — плёнки в пределах норм светопропускания (по ГОСТ) или атермальная.</p>
      <div class="tool__ctrl" data-reveal>
        <label class="range"><span class="range__lbl">Задняя полусфера <b data-out="rear">60%</b></span><input type="range" min="0" max="95" value="60" data-in="rear" aria-label="Затемнение задней полусферы"></label>
        <div class="seg" role="radiogroup" aria-label="Передние стёкла">
          <span class="seg__lbl">Передние стёкла</span>
          <button type="button" role="radio" aria-checked="true" data-front="none">Без плёнки</button>
          <button type="button" role="radio" aria-checked="false" data-front="athermal">Атермальная</button>
          <button type="button" role="radio" aria-checked="false" data-front="gost">По ГОСТ</button>
          <button type="button" role="radio" aria-checked="false" data-front="chameleon">Хамелеон</button>
        </div>
      </div>
      <div class="tool__sum" data-reveal><span>Ориентир по прайсу</span><b data-out="sum">от 8 000 ₽</b></div>
      <div class="btn-row" data-reveal><a class="btn btn--gold" data-tool-wa href="${wa()}" target="_blank" rel="noopener">${ic('wa')}<span>Записаться с этим выбором</span></a></div>
      <p class="tool__note">Визуализация условная: реальный оттенок зависит от плёнки и автомобиля.</p>
    </div>
    <div class="tool__stage tool__stage--car" data-reveal>
      <div class="hexbg" aria-hidden="true"></div>
      ${carSVG('tint')}
    </div>
  </div>
</section>`;
  }
  if (kind === 'color') {
    const sw = [['#0d0d0f', 'Чёрный'], ['#f2f2ef', 'Белый'], ['#8f9396', 'Серый'], ['#4f5a3a', 'Олива'], ['#7b1e22', 'Бордо'], ['#1f3a68', 'Синий'], ['#c5a465', 'Золото'], ['#d8d21e', 'Кислотный']];
    return `<section class="section tool tool--color" data-tool="color">
  <div class="container tool__grid">
    <div class="tool__text">
      ${eyebrow('Визуализатор')}
      <h2 class="h2" data-split>Примерьте <em>новый цвет</em></h2>
      <p class="lead" data-reveal>Цвет, фактура и антихром — посмотрите, как может измениться машина без покраски.</p>
      <div class="tool__ctrl" data-reveal>
        <div class="swatches" role="radiogroup" aria-label="Цвет плёнки">${sw.map(([c, n], i) => `<button type="button" role="radio" aria-checked="${i === 3}" data-color="${c}" style="--c:${c}" aria-label="${n}" title="${n}"></button>`).join('')}</div>
        <div class="seg" role="radiogroup" aria-label="Фактура">
          <span class="seg__lbl">Фактура</span>
          <button type="button" role="radio" aria-checked="true" data-finish="gloss">Глянец</button>
          <button type="button" role="radio" aria-checked="false" data-finish="satin">Сатин</button>
          <button type="button" role="radio" aria-checked="false" data-finish="matte">Мат</button>
        </div>
        <label class="switch"><input type="checkbox" data-antichrome><span class="switch__ui" aria-hidden="true"></span><span>Антихром — хром в чёрный</span></label>
      </div>
      <div class="tool__sum" data-reveal><span>Ориентир по прайсу</span><b data-out="sum">от 150 000 ₽</b></div>
      <div class="btn-row" data-reveal><a class="btn btn--gold" data-tool-wa href="${wa()}" target="_blank" rel="noopener">${ic('wa')}<span>Обсудить цвет в WhatsApp</span></a></div>
      <p class="tool__note">Цвета на экране условные. Палитру плёнок в наличии уточняйте у мастера.</p>
    </div>
    <div class="tool__stage tool__stage--car" data-reveal>
      <div class="hexbg" aria-hidden="true"></div>
      ${carSVG('color')}
    </div>
  </div>
</section>`;
  }
  if (kind === 'stone') {
    return `<section class="section tool tool--stone" data-tool="stone">
  <div class="container tool__grid">
    <div class="tool__text">
      ${eyebrow('Интерактив')}
      <h2 class="h2" data-split>Камень <em>в капот</em></h2>
      <p class="lead" data-reveal>Нажимайте на панель — по ней полетят камни с дороги. Включите плёнку и сравните. Полиуретан берёт удар на себя и защищает лак от сколов, царапин, реагентов и выгорания.</p>
      <div class="tool__ctrl" data-reveal>
        <label class="switch switch--big"><input type="checkbox" data-film checked><span class="switch__ui" aria-hidden="true"></span><span>Полиуретановая плёнка</span></label>
        <div class="tool__meter"><span>Сколов на ЛКП</span><b data-out="chips">0</b></div>
      </div>
      <div class="btn-row" data-reveal>${btnWA('Записаться на оклейку', waService('Кузов целиком в полиуретановую плёнку'))}</div>
      <p class="tool__note">Демонстрация условная.</p>
    </div>
    <div class="tool__stage tool__stage--panel" data-reveal data-cursor="Бросить">
      <canvas aria-label="Интерактивная панель: нажмите, чтобы бросить камень"></canvas>
      <span class="tool__badge" data-out="state">Плёнка: включена</span>
    </div>
  </div>
</section>`;
  }
  if (kind === 'noise') {
    return `<section class="section tool tool--noise" data-tool="noise">
  <div class="container tool__grid">
    <div class="tool__text">
      ${eyebrow('Послушайте')}
      <h2 class="h2" data-split>Дорога — <em>тише</em></h2>
      <p class="lead" data-reveal>Включите звук дороги и переключите шумоизоляцию. Так ощущается разница: меньше гула от шин, камней и неровностей покрытия.</p>
      <div class="tool__ctrl" data-reveal>
        <button class="btn btn--ghost" type="button" data-noise-play>${ic('sound')}<span>Включить звук дороги</span></button>
        <label class="switch switch--big"><input type="checkbox" data-iso><span class="switch__ui" aria-hidden="true"></span><span>Шумоизоляция</span></label>
      </div>
      <div class="btn-row" data-reveal>${btnWA('Записаться на шумоизоляцию', waService('Шумоизоляция'))}</div>
      <p class="tool__note">Условная демонстрация, звук синтезирован. Насколько станет тише — зависит от автомобиля и объёма работ.</p>
    </div>
    <div class="tool__stage tool__stage--wave" data-reveal>
      <canvas aria-hidden="true"></canvas>
      <span class="tool__badge" data-out="state">Без шумоизоляции</span>
    </div>
  </div>
</section>`;
  }
  if (kind === 'rain') {
    return `<section class="section tool tool--rain" data-tool="rain">
  <div class="container tool__grid">
    <div class="tool__text">
      ${eyebrow('Интерактив')}
      <h2 class="h2" data-split>Антидождь: <em>до и после</em></h2>
      <p class="lead" data-reveal>Тяните разделитель. Слева — обычное стекло, справа — с гидрофобным покрытием: вода собирается в капли и скатывается, стекло проще очищать от воды и грязи.</p>
      <div class="tool__sum" data-reveal><span>Антидождь на стёкла</span><b>от 4&nbsp;000&nbsp;₽</b></div>
      <div class="btn-row" data-reveal>${btnWA('Записаться', waService('Антидождь на стёкла'))}</div>
      <p class="tool__note">Демонстрация условная.</p>
    </div>
    <div class="tool__stage tool__stage--rain" data-reveal data-cursor="Тянуть">
      ${img('gallery/23_range-rover-white_snow', '', { sizes: '(max-width: 900px) 92vw, 640px', cls: 'tool__bgimg' })}
      <canvas aria-label="Сравнение: обычное стекло и стекло с антидождём"></canvas>
      <div class="split" style="--x:50%"><span class="split__line"></span><span class="split__knob">${ic('arrow')}</span></div>
      <span class="tool__badge tool__badge--l">Обычное стекло</span>
      <span class="tool__badge tool__badge--r">С антидождём</span>
    </div>
  </div>
</section>`;
  }
  return '';
}

/* ───────────────────────── ГЛАВНАЯ ───────────────────────── */
function buildIndex() {
  const stats = [
    ['5.0', 'рейтинг в 2ГИС', '5.0'],
    [String(R.ratings_count), 'оценки клиентов'],
    [String(R.reviews_count), 'отзыва в 2ГИС'],
    ['16', 'услуг в прайсе'],
  ];
  const works = ['17_bmw-x6-black_snow', '21_toyota-rav4-white_studio_vertical', '03_white-ford-raptor_yard', '12_snowmobile-red-black-wrap_studio_vertical', '15_mercedes-glc-coupe-white-front', '22_lada-niva-forest-wrap-roofbox_vertical', '04_bmw-pair-black-white_yard', '02_white-sedan-xiaomi-su7-like_vertical'].map(gal);

  const body = `
<section class="hero" data-hero>
  <canvas class="hero__gl" aria-hidden="true"></canvas>
  <div class="hero__fallback" aria-hidden="true">${img('gallery/21_toyota-rav4-white_studio_vertical', '', { sizes: '100vw', eager: true })}</div>
  <div class="hero__vignette" aria-hidden="true"></div>
  <div class="hero__word" aria-hidden="true"><span>ART</span><span>TONIR</span></div>
  <div class="container hero__in">
    <div class="hero__content">
      <p class="eyebrow hero__eyebrow"><span class="dot"></span>Тюнинг-студия · Бийск</p>
      <h1 class="hero__title">
        <span class="ln"><span>Тонировка,</span></span>
        <span class="ln"><span><em>антигравийная плёнка</em></span></span>
        <span class="ln"><span>и шумоизоляция</span></span>
        <span class="ln ln--sm"><span>в Бийске</span></span>
      </h1>
      <div class="hero__meta">${ratingChip()}${hoursChip()}</div>
      <div class="btn-row hero__btns">${btnWA()}${btnCall()}${btnTG()}</div>
    </div>
    <div class="hero__hud" data-hud>
      <div class="hud__head"><span class="hud__dot"></span>Попробуйте: затонируйте стекло</div>
      <label class="range range--hud"><span class="range__lbl">Затемнение <b data-hud-out>60%</b></span><input type="range" min="0" max="95" value="60" data-hud-in aria-label="Затемнение стекла в 3D-сцене"></label>
      <div class="hud__foot"><a href="tonirovka.html">Всё о тонировке ${ic('arrow', 'ic ic--xs')}</a></div>
    </div>
  </div>
  <div class="hero__stats">
    <div class="container stats">${stats.map(([n, l]) => `<div class="stat"><b data-count="${n}">${n}</b><span>${l}</span></div>`).join('')}</div>
  </div>
  <div class="hero__scroll" aria-hidden="true"><span></span>Листайте</div>
</section>

${marquee(['Тонирование любой сложности', 'Антигравийная плёнка', 'Замена цвета', 'Антихром', 'Шумоизоляция', 'Полировка', 'Антидождь', 'Полировка фар'])}

<section class="section manifesto">
  <div class="container">
    ${eyebrow('ART TONIR · Tuning Studio')}
    <p class="manifesto__text" data-words>Тонируем стёкла <span class="pill">${img('gallery/02_white-sedan-xiaomi-su7-like_vertical', '', { sizes: '160px' })}</span> бронируем кузов полиуретаном <span class="pill">${img('gallery/08_white-suv-in-studio_wrap-process', '', { sizes: '160px' })}</span> меняем цвет винилом <span class="pill">${img('gallery/22_lada-niva-forest-wrap-roofbox_vertical', '', { sizes: '160px' })}</span> глушим шум и полируем — в боксе со световым потолком в ГСК «Берег». Строго по записи.</p>
    <figure class="manifesto__quote" data-reveal>
      <blockquote>«Приняли как и была записана машина. Минута в минуту, день в день.»</blockquote>
      <figcaption>${stars()} Александр Симаков, отзыв из 2ГИС</figcaption>
    </figure>
  </div>
</section>

<section class="section services" id="uslugi">
  <div class="container">
    <div class="sec-head">
      <div>
        ${eyebrow('Услуги и цены')}
        <h2 class="h2" data-split>Пять направлений — <em>один бокс</em></h2>
      </div>
      <p class="sec-head__aside" data-reveal>16 позиций в прайсе. Цены — как у владельца в 2ГИС (обновлено 9 сентября 2026).<br><a class="link" href="uslugi.html">Весь прайс ${ic('arrow', 'ic ic--xs')}</a></p>
    </div>
    <div class="stack">
      ${CATS.map((c, i) => `<article class="stack__card" style="--i:${i}">
        <a class="stack__link" href="${c.slug}.html" aria-label="${c.short} — подробнее"></a>
        <div class="stack__body">
          <div class="stack__top"><span class="stack__num">${c.num}<i>/05</i></span><span class="stack__from">от ${money(c.min)}&nbsp;₽</span></div>
          <h3 class="stack__title">${c.short}</h3>
          <ul class="stack__list">${c.items.map((s) => `<li><span>${esc(s.name)}</span><b>${s.priceText}</b></li>`).join('')}</ul>
          <span class="stack__more">Подробнее ${ic('arrow')}</span>
        </div>
        <div class="stack__media" data-tint>${img(c.hero, c.heroAlt, { sizes: '(max-width: 900px) 92vw, 640px' })}</div>
      </article>`).join('')}
    </div>
  </div>
</section>

${toolBlock('tint').replace('class="section tool tool--tint"', 'class="section tool tool--tint tool--home"')}

<section class="works" data-hscroll>
  <div class="works__pin">
    <div class="container works__head">
      <div>
        ${eyebrow('Наши работы')}
        <h2 class="h2" data-split>Из нашего <em>бокса</em></h2>
      </div>
      <p class="works__count" aria-hidden="true"><b data-hcount>01</b> / ${String(works.length).padStart(2, '0')}</p>
    </div>
    <div class="works__track" data-htrack>
      ${works.map((g, i) => `<a class="wcard${g.vertical ? ' wcard--v' : ''}" href="raboty.html#${g.name}" data-cursor="Смотреть">
        <span class="wcard__img" data-tint>${img(g.src, g.alt, { sizes: g.vertical ? '360px' : '620px' })}</span>
        <span class="wcard__cap"><i>${String(i + 1).padStart(2, '0')}</i>${esc(g.alt)}</span>
      </a>`).join('')}
      <a class="wcard wcard--more" href="raboty.html">
        <span>Все работы</span><b>${GALLERY.length} фото</b>${ic('arrow-up', 'ic ic--lg')}
      </a>
    </div>
  </div>
</section>

<section class="section trust">
  <div class="container">
    <div class="sec-head">
      <div>
        ${eyebrow('Почему нам доверяют')}
        <h2 class="h2" data-split>Только <em>факты</em></h2>
      </div>
      <p class="sec-head__aside" data-reveal>Цифры и цитаты — из карточки студии в 2ГИС.</p>
    </div>
    <div class="bento">
      <a class="bento__c bento__c--rating" href="${GIS_REVIEWS}" target="_blank" rel="noopener" data-reveal data-tilt>
        <span class="bento__lbl">Рейтинг в 2ГИС</span>
        <b class="bento__big" data-count="5.0">5.0</b>
        ${stars()}
        <span class="bento__sub">${R.ratings_count} оценки · ${R.reviews_count} отзыва · ${R.photos_count} фото</span>
        <span class="tags">${R.top_review_tags.map((t) => `<span>${t}</span>`).join('')}</span>
      </a>
      <div class="bento__c bento__c--photo" data-reveal data-tilt>
        ${img('gallery/21_toyota-rav4-white_studio_vertical', 'Бокс ART TONIR со световым потолком', { sizes: '(max-width: 900px) 92vw, 420px' })}
        <span class="bento__over"><b>Свой бокс</b>ГСК «Берег», бокс 226 — световой потолок, тепло и чисто</span>
      </div>
      <div class="bento__c" data-reveal data-tilt>
        ${ic('clock', 'ic ic--lg ic--gold')}
        <b class="bento__mid">По записи</b>
        <span class="bento__sub">09:00–19:00. «Запись была за месяц вперёд. Приняли как и была записана машина».</span>
      </div>
      <div class="bento__c" data-reveal data-tilt>
        ${ic('card', 'ic ic--lg ic--gold')}
        <b class="bento__mid">Удобная оплата</b>
        <span class="bento__sub">${D.payment.join(' · ')}</span>
      </div>
      <div class="bento__c bento__c--quote" data-reveal data-tilt>
        <span class="bento__lbl">Клиенты о мастерах</span>
        <blockquote>«Парни большие профессионалы! Особое внимание и уважение Максиму.»</blockquote>
        <span class="bento__sub">Руслан Газиев, отзыв из 2ГИС</span>
      </div>
      <div class="bento__c bento__c--acid" data-reveal data-tilt>
        <span class="bento__lbl">В 2ГИС с отзывами</span>
        <b class="bento__big">2019</b>
        <span class="bento__sub">Самый ранний отзыв о студии — 17 марта 2019</span>
      </div>
    </div>
  </div>
</section>

<section class="section steps">
  <div class="container">
    <div class="sec-head">
      <div>
        ${eyebrow('Как записаться')}
        <h2 class="h2" data-split>Четыре <em>шага</em></h2>
      </div>
      <p class="sec-head__aside" data-reveal>Без сайтов-посредников: пишете напрямую мастерам.</p>
    </div>
    <ol class="steps__list" data-steps>
      <li data-reveal><span class="steps__n">01</span><b>Напишите или позвоните</b><span>WhatsApp, Telegram или ${PHONE}</span></li>
      <li data-reveal><span class="steps__n">02</span><b>Подберём решение</b><span>Расскажем о вариантах и сориентируем по цене</span></li>
      <li data-reveal><span class="steps__n">03</span><b>Приезжайте ко времени</b><span>Работаем по предварительной записи, 09:00–19:00</span></li>
      <li data-reveal><span class="steps__n">04</span><b>Забирайте автомобиль</b><span>Советская, 217/7, ГСК «Берег», бокс 226</span></li>
    </ol>
    <div class="steps__line" aria-hidden="true"><span></span></div>
  </div>
</section>

<section class="section reviews">
  <div class="container">
    <div class="sec-head">
      <div>
        ${eyebrow('Отзывы')}
        <h2 class="h2" data-split>Говорят <em>клиенты</em></h2>
      </div>
      <div class="sec-head__aside sec-head__aside--btns" data-reveal>
        <button class="btn btn--icon" type="button" data-car-prev aria-label="Предыдущие отзывы">${ic('arrow', 'ic ic--flip')}</button>
        <button class="btn btn--icon" type="button" data-car-next aria-label="Следующие отзывы">${ic('arrow')}</button>
      </div>
    </div>
  </div>
  <div class="carousel" data-carousel data-cursor="Тянуть">
    <div class="carousel__track">${REVIEWS.map((r) => reviewCard(r)).join('')}</div>
  </div>
  <div class="container reviews__foot" data-reveal>
    <a class="btn btn--ghost" href="${GIS_REVIEWS}" target="_blank" rel="noopener"><span>Все ${R.reviews_count} отзыва в 2ГИС</span>${ic('arrow-up')}</a>
    <a class="link" href="otzyvy.html">Отзывы на сайте ${ic('arrow', 'ic ic--xs')}</a>
  </div>
</section>

<section class="section faq-sec">
  <div class="container faq-sec__grid">
    <div>
      ${eyebrow('Вопросы и ответы')}
      <h2 class="h2" data-split>Часто <em>спрашивают</em></h2>
      <p class="lead" data-reveal>Не нашли ответ? Напишите — подскажем.</p>
      <div class="btn-row" data-reveal>${btnWA('Спросить в WhatsApp', wa('Здравствуйте! У меня вопрос по услугам ART TONIR.'), 'btn btn--ghost')}</div>
    </div>
    ${faqList(FAQ)}
  </div>
</section>

${ctaBlock()}
`;
  page({
    file: 'index.html',
    title: 'Тонировка и антигравийная плёнка в Бийске — ART TONIR',
    desc: 'Тюнинг-студия ART TONIR в Бийске: тонировка от 5 000 ₽, антигравийная плёнка, оклейка винилом, шумоизоляция и полировка. Рейтинг 5.0 в 2ГИС, запись в WhatsApp.',
    active: 'index',
    body,
    bodyClass: 'is-home',
    scripts: ['assets/js/tools.js', 'assets/js/hero3d.mjs'],
    importmap: true,
    preload: `<link rel="modulepreload" href="assets/vendor/three/three.module.min.js">`,
  });
}

/* ───────────────────────── УСЛУГИ ───────────────────────── */
function buildServices() {
  const body = `
<section class="phero phero--text">
  <div class="phero__grid" aria-hidden="true"></div>
  <div class="container">
    ${crumbs([['Услуги и цены']])}
    <h1 class="h1" data-split>Услуги <em>и цены</em></h1>
    <p class="lead" data-reveal>5 направлений и 16 позиций. Цены указаны владельцем в 2ГИС (обновлено 9 сентября 2026) — это ориентир «от»: точная стоимость зависит от автомобиля и материалов.</p>
    <div class="hero__meta" data-reveal>${ratingChip()}${hoursChip()}</div>
  </div>
</section>

<nav class="tabs" aria-label="Направления" data-tabs>
  <div class="container tabs__in">${CATS.map((c) => `<a href="#${c.slug}">${c.short}</a>`).join('')}<a href="#extra">Ещё</a></div>
</nav>

${CATS.map((c) => `<section class="section pricecat" id="${c.slug}">
  <div class="container">
    <div class="pricecat__head">
      <span class="pricecat__num">${c.num}</span>
      <h2 class="h2" data-split>${c.key === 'Шумо/виброизоляция' ? 'Шумо- и виброизоляция' : c.key}</h2>
      <a class="link" href="${c.slug}.html">Подробнее о направлении ${ic('arrow', 'ic ic--xs')}</a>
    </div>
    <div class="pgrid">${c.items.map((s) => `<article class="pcard" data-reveal data-tilt>
      <div class="pcard__img" data-tint>${img(s.imgs[0], `${s.name} — ART TONIR`, { sizes: '(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 400px' })}</div>
      <div class="pcard__body">
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.desc)}</p>
        <div class="pcard__foot">
          <b>${s.priceText}</b>
          <div class="pcard__btns">
            <button class="btn btn--icon btn--sm" type="button" data-add="${s.id}" aria-label="Добавить «${esc(s.name)}» в смету">${ic('plus')}</button>
            <a class="btn btn--gold btn--sm" href="${waService(s.name)}" target="_blank" rel="noopener">${ic('wa')}<span>Записаться</span></a>
          </div>
        </div>
      </div>
    </article>`).join('')}</div>
  </div>
</section>`).join('')}

<section class="section extra" id="extra">
  <div class="container">
    <div class="sec-head">
      <div>
        ${eyebrow('Также делаем')}
        <h2 class="h2" data-split>Цена — <em>по запросу</em></h2>
      </div>
      <p class="sec-head__aside" data-reveal>Этих работ нет в прайсе, но они указаны в карточке студии или в отзывах клиентов. Стоимость уточните по телефону или в WhatsApp.</p>
    </div>
    <ul class="extra__list">${EXTRA.map((e) => `<li data-reveal><span>${esc(e.name)}</span><a href="${waService(e.name)}" target="_blank" rel="noopener">Узнать цену ${ic('arrow-up', 'ic ic--xs')}</a></li>`).join('')}</ul>
  </div>
</section>

<section class="section faq-sec">
  <div class="container faq-sec__grid">
    <div>
      ${eyebrow('Вопросы о ценах')}
      <h2 class="h2" data-split>Часто <em>спрашивают</em></h2>
    </div>
    ${faqList(FAQ)}
  </div>
</section>

${ctaBlock({ title: 'Соберите <em>смету</em> и запишитесь', text: 'Отметьте услуги кнопкой «+» — отправим список мастеру в WhatsApp одним сообщением.' })}
`;
  page({
    file: 'uslugi.html',
    title: 'Услуги и цены — тонировка, плёнка, шумоизоляция в Бийске | ART TONIR',
    desc: 'Прайс ART TONIR в Бийске: тонировка от 5 000 ₽, полиуретановая плёнка от 180 000 ₽, замена цвета от 150 000 ₽, шумоизоляция от 7 500 ₽, полировка фар от 1 000 ₽.',
    active: 'uslugi',
    body,
  });
}

/* ───────────────────────── СТРАНИЦЫ НАПРАВЛЕНИЙ ───────────────────────── */
function buildCategory(c, idx) {
  const prev = CATS[(idx + CATS.length - 1) % CATS.length];
  const next = CATS[(idx + 1) % CATS.length];
  const faqItems = c.faq.map((i) => FAQ[i]);
  const body = `
<section class="phero">
  <div class="phero__media" data-tint="hero">${img(c.hero, c.heroAlt, { sizes: '(max-width: 900px) 100vw, 50vw', eager: true })}</div>
  <div class="container phero__in">
    ${crumbs([['Услуги', 'uslugi.html'], [c.short]])}
    <p class="eyebrow">Направление ${c.num} / 05</p>
    <h1 class="h1" data-split>${c.h1}</h1>
    <p class="lead" data-reveal>${c.lead}</p>
    <div class="phero__price" data-reveal><span>Цены</span><b>от ${money(c.min)}&nbsp;₽</b></div>
    <div class="btn-row" data-reveal>${btnWA('Записаться в WhatsApp', waService(c.short))}${btnCall()}${btnTG()}</div>
    <div class="phero__chips" data-reveal>${c.items.map((s) => `<a href="#${s.id}">${esc(s.name)}</a>`).join('')}</div>
  </div>
</section>

<section class="section svc-list">
  <div class="container">
    <div class="sec-head">
      <div>
        ${eyebrow('Прайс направления')}
        <h2 class="h2" data-split>${c.items.length} ${c.items.length === 4 ? 'позиции' : 'позиции'} — <em>${c.short.toLowerCase()}</em></h2>
      </div>
      <p class="sec-head__aside" data-reveal>Описания — от владельца студии. Цены ориентировочные и не являются публичной офертой.</p>
    </div>
    ${c.items.map(serviceRow).join('')}
  </div>
</section>

${toolBlock(c.tool)}

<section class="section relworks">
  <div class="container">
    <div class="sec-head">
      <div>
        ${eyebrow('Машины из нашего бокса')}
        <h2 class="h2" data-split>Наши <em>работы</em></h2>
      </div>
      <p class="sec-head__aside" data-reveal><a class="link" href="raboty.html">Вся галерея — ${GALLERY.length} фото ${ic('arrow', 'ic ic--xs')}</a></p>
    </div>
    <div class="relworks__grid">${c.works.map(gal).map((g) => `<a class="rw${g.vertical ? ' rw--v' : ''}" href="raboty.html#${g.name}" data-reveal data-cursor="Смотреть"><span data-tint>${img(g.src, g.alt, { sizes: '(max-width: 760px) 46vw, 320px' })}</span><i>${esc(g.alt)}</i></a>`).join('')}</div>
  </div>
</section>

${faqItems.length ? `<section class="section faq-sec"><div class="container faq-sec__grid"><div>${eyebrow('Вопросы')}<h2 class="h2" data-split>Часто <em>спрашивают</em></h2></div>${faqList(faqItems)}</div></section>` : ''}

<section class="section catnav">
  <div class="container catnav__grid">
    <a class="catnav__c" href="${prev.slug}.html" data-reveal><span>${ic('arrow', 'ic ic--flip')} Предыдущее</span><b>${prev.short}</b><i>от ${money(prev.min)}&nbsp;₽</i></a>
    <a class="catnav__c catnav__c--next" href="${next.slug}.html" data-reveal><span>Следующее ${ic('arrow')}</span><b>${next.short}</b><i>от ${money(next.min)}&nbsp;₽</i></a>
  </div>
</section>

${ctaBlock({ title: `${c.short}: <em>запишитесь</em>`, text: 'Напишите марку и модель автомобиля — сориентируем по цене и подберём время.' })}
`;
  page({ file: `${c.slug}.html`, title: c.seoTitle, desc: c.seoDesc, active: 'uslugi', body, scripts: ['assets/js/tools.js'] });
}

/* ───────────────────────── РАБОТЫ ───────────────────────── */
function buildWorks() {
  const filters = [['all', 'Все'], ['studio', 'В боксе'], ['winter', 'Зима'], ['yard', 'У студии']];
  const body = `
<section class="phero phero--text">
  <div class="phero__grid" aria-hidden="true"></div>
  <div class="container">
    ${crumbs([['Работы']])}
    <h1 class="h1" data-split>Наши <em>работы</em></h1>
    <p class="lead" data-reveal>Фото из бокса и с площадки у студии — те, что студия публикует в 2ГИС. Нажмите на фото, чтобы открыть на весь экран.</p>
  </div>
</section>
<section class="section gallery-sec">
  <div class="container">
    <div class="filters" role="tablist" aria-label="Фильтр фото" data-reveal>${filters.map(([k, t], i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-filter="${k}">${t}<sup>${k === 'all' ? GALLERY.length : GALLERY.filter((g) => g.tag === k).length}</sup></button>`).join('')}</div>
    <div class="masonry" data-gallery>
      ${GALLERY.map((g, i) => `<a class="gitem${g.vertical ? ' gitem--v' : ''}" id="${g.name}" href="${imgUrl(g.src)}" data-tag="${g.tag}" data-lb="${i}" data-cap="${esc(g.alt)}" data-cursor="Смотреть">
        <span class="gitem__img" data-tint>${img(g.src, g.alt, { sizes: '(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 420px' })}</span>
        <span class="gitem__cap"><i>${String(i + 1).padStart(2, '0')}</i>${esc(g.alt)}</span>
      </a>`).join('')}
    </div>
    <p class="gallery-sec__more" data-reveal>Ещё больше фото — ${R.photos_count} шт. — в <a class="link" href="${GIS_FIRM}/tab/photos" target="_blank" rel="noopener">карточке студии в 2ГИС ${ic('arrow-up', 'ic ic--xs')}</a></p>
  </div>
</section>
<div class="lb" aria-hidden="true" role="dialog" aria-label="Просмотр фото" aria-modal="true">
  <button class="lb__x" type="button" data-lb-close aria-label="Закрыть">${ic('close')}</button>
  <button class="lb__nav lb__nav--p" type="button" data-lb-prev aria-label="Предыдущее фото">${ic('arrow', 'ic ic--flip')}</button>
  <figure class="lb__fig"><img alt=""><figcaption><span class="lb__n"></span><span class="lb__cap"></span></figcaption></figure>
  <button class="lb__nav lb__nav--n" type="button" data-lb-next aria-label="Следующее фото">${ic('arrow')}</button>
</div>
${ctaBlock({ title: 'Хотите <em>так же</em>?', text: 'Пришлите фото своей машины в WhatsApp — подскажем, что можно сделать.', photo: 'gallery/17_bmw-x6-black_snow', alt: 'Чёрный BMW X6 с рамкой номера ArTonir' })}
`;
  page({ file: 'raboty.html', title: 'Наши работы — фото тонировки и оклейки авто в Бийске | ART TONIR', desc: 'Фото работ тюнинг-студии ART TONIR в Бийске: тонировка, оклейка плёнкой, винил, антихром. Машины из нашего бокса в ГСК «Берег». Запись в WhatsApp.', active: 'raboty', body });
}

/* ───────────────────────── ОТЗЫВЫ ───────────────────────── */
function buildReviews() {
  const body = `
<section class="phero phero--text">
  <div class="phero__grid" aria-hidden="true"></div>
  <div class="container rhero">
    <div>
      ${crumbs([['Отзывы']])}
      <h1 class="h1" data-split>Отзывы <em>клиентов</em></h1>
      <p class="lead" data-reveal>Отзывы — дословно из 2ГИС. Все ${R.reviews_count} отзыва можно прочитать в карточке студии.</p>
      <div class="btn-row" data-reveal><a class="btn btn--gold" href="${GIS_REVIEWS}" target="_blank" rel="noopener"><span>Все отзывы в 2ГИС</span>${ic('arrow-up')}</a><a class="btn btn--ghost" href="${GIS_REVIEWS}" target="_blank" rel="noopener"><span>Оставить отзыв</span></a></div>
    </div>
    <div class="score" data-reveal>
      <div class="score__ring"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88"/><circle class="score__val" cx="100" cy="100" r="88"/></svg><b data-count="5.0">5.0</b></div>
      ${stars()}
      <p><b>${R.ratings_count}</b> оценки · <b>${R.reviews_count}</b> отзыва · <b>${R.photos_count}</b> фото</p>
      <div class="tags">${R.top_review_tags.map((t) => `<span>${t}</span>`).join('')}</div>
    </div>
  </div>
</section>
${marquee(['«Ребята знают своё дело»', '«Минута в минуту, день в день»', '«По тонировке только к ним»', '«Профессиональный подход!»', '«Работа выполнена на 200%»'], 'marquee--serif')}
<section class="section">
  <div class="container">
    <div class="rgrid">${REVIEWS.map((r, i) => reviewCard(r, { cls: i === 0 ? 'rv--pick' : '' }).replace('<figure class="rv', '<figure data-reveal class="rv')).join('')}</div>
    <p class="gallery-sec__more" data-reveal>На сайте — ${REVIEWS.length} из ${R.reviews_count} отзывов. <a class="link" href="${GIS_REVIEWS}" target="_blank" rel="noopener">Читать все в 2ГИС ${ic('arrow-up', 'ic ic--xs')}</a></p>
  </div>
</section>
${ctaBlock({ title: 'Станьте <em>следующим</em>', text: 'Запишитесь в WhatsApp — а после работы будем рады вашему отзыву в 2ГИС.' })}
`;
  page({ file: 'otzyvy.html', title: 'Отзывы о ART TONIR — рейтинг 5.0 в 2ГИС | Тонировка в Бийске', desc: 'Отзывы клиентов тюнинг-студии ART TONIR в Бийске: рейтинг 5.0 в 2ГИС, 123 оценки и 92 отзыва. «Отличный сервис», «Быстро и качественно».', active: 'otzyvy', body });
}

/* ───────────────────────── СТУДИЯ ───────────────────────── */
function buildStudio() {
  const body = `
<section class="phero phero--studio">
  <div class="container studio-hero">
    <div>
      ${crumbs([['Студия']])}
      <h1 class="h1" data-split>ART TONIR — <em>Tuning Studio</em></h1>
      <p class="lead" data-reveal>Тюнинг-студия в Бийске: тонировка, антигравийная плёнка, оклейка винилом, шумоизоляция и полировка. В 2ГИС нас знают как «Арт Тонир», клиенты — как «парней, которые знают своё дело».</p>
      <div class="btn-row" data-reveal>${btnWA()}${btnCall()}</div>
    </div>
    <div class="emblem" data-reveal aria-hidden="true">
      <svg class="emblem__ring" viewBox="0 0 400 400">
        <defs><path id="em-top" d="M60 200a140 140 0 0 1 280 0"/><path id="em-bot" d="M48 200a152 152 0 0 0 304 0"/></defs>
        <circle cx="200" cy="200" r="186" class="emblem__o"/>
        <circle cx="200" cy="200" r="118" class="emblem__i"/>
        <text class="emblem__t1"><textPath href="#em-top" startOffset="50%" text-anchor="middle">ART TONIR</textPath></text>
        <text class="emblem__t2"><textPath href="#em-bot" startOffset="50%" text-anchor="middle">TUNING STUDIO</textPath></text>
        <text class="emblem__est" x="34" y="206">EST</text>
      </svg>
      <span class="emblem__face">${LOGO}</span>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="sec-head">
      <div>${eyebrow('Бокс')}<h2 class="h2" data-split>Световой потолок, <em>жёлтая колонна</em></h2></div>
      <p class="sec-head__aside" data-reveal>Тёмный бокс, LED-линии на потолке, графитовые стены и ярко-жёлтая кирпичная колонна — узнаете нас по фото.</p>
    </div>
    <div class="sbento">
      <figure class="sbento__a" data-reveal><span data-tint>${img('gallery/08_white-suv-in-studio_wrap-process', 'Белый внедорожник в боксе ART TONIR в процессе оклейки', { sizes: '(max-width: 900px) 92vw, 760px' })}</span><figcaption>Оклейка в боксе</figcaption></figure>
      <figure class="sbento__b" data-reveal><span data-tint>${img('gallery/21_toyota-rav4-white_studio_vertical', 'Белая Toyota RAV4 в боксе со световым потолком', { sizes: '(max-width: 900px) 46vw, 380px' })}</span><figcaption>Световой потолок</figcaption></figure>
      <figure class="sbento__c" data-reveal><span data-tint>${img('gallery/18_white-suv-hood-open_master-at-work_vertical', 'Мастер работает под капотом белого кроссовера', { sizes: '(max-width: 900px) 46vw, 380px' })}</span><figcaption>Мастер за работой</figcaption></figure>
      <figure class="sbento__d" data-reveal><span data-tint>${img('gallery/12_snowmobile-red-black-wrap_studio_vertical', 'Снегоход в красно-чёрной оклейке в студии', { sizes: '(max-width: 900px) 46vw, 380px' })}</span><figcaption>Не только автомобили</figcaption></figure>
    </div>
  </div>
</section>

<section class="section facts">
  <div class="container">
    <div class="sec-head"><div>${eyebrow('О студии в цифрах')}<h2 class="h2" data-split>Коротко <em>и честно</em></h2></div></div>
    <dl class="facts__list">
      <div data-reveal><dt>Рейтинг в 2ГИС</dt><dd><b data-count="5.0">5.0</b> ${stars()}</dd></div>
      <div data-reveal><dt>Оценок / отзывов</dt><dd><b>${R.ratings_count}</b> / <b>${R.reviews_count}</b></dd></div>
      <div data-reveal><dt>Самый ранний отзыв</dt><dd><b>17.03.2019</b></dd></div>
      <div data-reveal><dt>Режим</dt><dd><b>09:00–19:00</b> по записи</dd></div>
      <div data-reveal><dt>Оплата</dt><dd>${D.payment.join(', ').toLowerCase().replace(/^./, (m) => m.toUpperCase())}</dd></div>
      <div data-reveal><dt>Доступная среда</dt><dd>Автоматическая дверь</dd></div>
    </dl>
  </div>
</section>

<section class="section plate">
  <div class="container plate__grid">
    <div>
      ${eyebrow('Фирменный знак')}
      <h2 class="h2" data-split>Рамка, <em>которую узнают</em></h2>
      <p class="lead" data-reveal>Чёрная рамка номера: ART TONIR — белой антиквой, TUNING STUDIO — золотом. Её видно на машинах, которые выезжают из нашего бокса.</p>
    </div>
    <div class="plate__imgs">
      <figure data-reveal data-tilt>${img('gallery/13_chery-tiggo-grey-front_vertical', 'Серый Chery Tiggo с фирменной рамкой номера ART TONIR TUNING STUDIO', { sizes: '(max-width: 900px) 60vw, 380px' })}</figure>
      <div class="plateframe" data-reveal aria-label="Рамка номера ART TONIR TUNING STUDIO" role="img"><b>ART TONIR</b><i>TUNING STUDIO</i></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="sec-head">
      <div>${eyebrow('Направления')}<h2 class="h2" data-split>Чем <em>занимаемся</em></h2></div>
      <p class="sec-head__aside" data-reveal>Рубрики студии в 2ГИС: тонировочные и защитные плёнки, тонирование автостёкол, тюнинг, детейлинг, антикоррозийная обработка.</p>
    </div>
    <div class="dirs">${CATS.map((c) => `<a class="dir" href="${c.slug}.html" data-reveal><span class="dir__n">${c.num}</span><b>${c.short}</b><i>от ${money(c.min)}&nbsp;₽</i>${ic('arrow-up', 'ic')}</a>`).join('')}</div>
    <p class="extra__inline" data-reveal>Также: ${EXTRA.map((e) => e.name.toLowerCase()).join(' · ')} — цену уточняйте.</p>
  </div>
</section>
${ctaBlock({ photo: 'gallery/20_mercedes-v-class-black_yard', alt: 'Чёрный минивэн Mercedes V-Class у студии' })}
`;
  page({ file: 'studiya.html', title: 'О студии ART TONIR — тюнинг-студия в Бийске', desc: 'ART TONIR (Арт Тонир) — тюнинг-студия в Бийске, ГСК «Берег», бокс 226. Тонировка, плёнка, винил, шумоизоляция, полировка. Рейтинг 5.0 в 2ГИС, работаем по записи.', active: 'studiya', body });
}

/* ───────────────────────── КОНТАКТЫ ───────────────────────── */
function buildContacts() {
  const mapSrc = `https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=16&pt=${lon}%2C${lat}%2Cpm2ywl`;
  const body = `
<section class="phero phero--text">
  <div class="phero__grid" aria-hidden="true"></div>
  <div class="container">
    ${crumbs([['Контакты']])}
    <h1 class="h1" data-split>Как <em>нас найти</em></h1>
  </div>
</section>
<section class="section contacts">
  <div class="container contacts__grid">
    <div class="contacts__info">
      <div class="cblock" data-reveal>
        <span class="cblock__lbl">${ic('pin', 'ic ic--sm')} Адрес</span>
        <b class="cblock__big">Советская, 217/7</b>
        <p>ГСК «Берег», бокс 226<br>${esc(D.location.address_full)}</p>
        <button class="copy" type="button" data-copy="${esc(D.location.address_short)}">Скопировать адрес</button>
      </div>
      <div class="cblock" data-reveal>
        <span class="cblock__lbl">${ic('door', 'ic ic--sm')} Как добраться</span>
        <p>${esc(D.location.nearest_stop)}. Вход отмечен в 2ГИС. На входе — автоматическая дверь.</p>
        <div class="btn-row"><a class="btn btn--ghost btn--sm" href="${GIS_FIRM}" target="_blank" rel="noopener"><span>Открыть в 2ГИС</span>${ic('arrow-up')}</a><a class="btn btn--ghost btn--sm" href="${YA_ROUTE}" target="_blank" rel="noopener"><span>Маршрут в Яндекс Картах</span>${ic('arrow-up')}</a></div>
      </div>
      <div class="cblock" data-reveal>
        <span class="cblock__lbl">${ic('phone', 'ic ic--sm')} Телефон и мессенджеры</span>
        <a class="cblock__big cblock__tel" href="${TEL}">${PHONE}</a>
        <div class="messengers">
          <a href="${wa()}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a>
          <a href="${TG}" target="_blank" rel="noopener">${ic('tg')}Telegram</a>
          <a href="${VIBER}">${ic('viber')}Viber</a>
          <a href="${VK}" target="_blank" rel="noopener">${ic('vk')}ВКонтакте</a>
        </div>
      </div>
      <div class="cblock cblock--row" data-reveal>
        <div><span class="cblock__lbl">${ic('clock', 'ic ic--sm')} Часы работы</span><b class="cblock__mid">09:00–19:00</b><p>По предварительной записи. График по дням недели уточняйте по телефону.</p></div>
        <div><span class="cblock__lbl">${ic('card', 'ic ic--sm')} Оплата</span><p>${D.payment.join('<br>')}</p></div>
      </div>
    </div>
    <div class="map" data-reveal>
      <iframe title="ART TONIR на карте — Бийск, Советская, 217/7" src="${mapSrc}" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>
      <div class="map__pin"><span class="map__logo">${LOGO}</span><span><b>ART TONIR</b>бокс 226</span></div>
      <a class="map__fallback" href="${GIS_FIRM}" target="_blank" rel="noopener">Открыть карту в 2ГИС ${ic('arrow-up')}</a>
    </div>
  </div>
</section>
<section class="section faq-sec">
  <div class="container faq-sec__grid">
    <div>${eyebrow('Вопросы и ответы')}<h2 class="h2" data-split>Перед <em>визитом</em></h2></div>
    ${faqList(FAQ)}
  </div>
</section>
${ctaBlock({ photo: 'gallery/25_red-suv_yard', alt: 'Красный кроссовер у бокса ART TONIR' })}
`;
  page({ file: 'kontakty.html', title: 'Контакты ART TONIR — Бийск, Советская 217/7, бокс 226', desc: 'ART TONIR в Бийске: Советская улица, 217/7, ГСК «Берег», бокс 226. Телефон +7 913 240-36-66, WhatsApp, Telegram. Работаем по записи 09:00–19:00.', active: 'kontakty', body });
}

/* ───────────────────────── ЗАПИСЬ ───────────────────────── */
function buildBooking() {
  const slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const body = `
<section class="phero phero--text phero--tight">
  <div class="phero__grid" aria-hidden="true"></div>
  <div class="container">
    ${crumbs([['Онлайн-запись']])}
    <h1 class="h1" data-split>Онлайн-<em>запись</em></h1>
    <p class="lead" data-reveal>Четыре шага — и готовое сообщение мастеру в WhatsApp. Останется только нажать «Отправить». Время — пожелание: мастер подтвердит запись в ответ.</p>
  </div>
</section>
<section class="section booking" data-booking>
  <div class="container booking__grid">
    <form class="wiz" novalidate>
      <ol class="wiz__steps" aria-hidden="true"><li class="is-on">Услуги</li><li>Автомобиль</li><li>Время</li><li>Контакты</li></ol>
      <div class="wiz__bar"><span></span></div>

      <fieldset class="wiz__pane is-on" data-pane="0">
        <legend>Что делаем?</legend>
        <p class="wiz__hint">Можно выбрать несколько — или пропустить, если нужна консультация.</p>
        ${CATS.map((c) => `<div class="wiz__cat"><p>${c.short}</p><div class="wiz__opts">${c.items.map((s) => `<label class="opt"><input type="checkbox" name="svc" value="${s.id}"><span><b>${esc(s.name)}</b><i>${s.priceText}</i></span></label>`).join('')}</div></div>`).join('')}
        <div class="wiz__cat"><p>Другое</p><div class="wiz__opts"><label class="opt"><input type="checkbox" name="svc" value="consult"><span><b>Нужна консультация</b><i>подберём решение</i></span></label></div></div>
      </fieldset>

      <fieldset class="wiz__pane" data-pane="1">
        <legend>Какой автомобиль?</legend>
        <label class="field"><span>Марка и модель</span><input name="car" autocomplete="off" placeholder="Например, Toyota RAV4"></label>
        <label class="field"><span>Год выпуска <i>(необязательно)</i></span><input name="year" inputmode="numeric" maxlength="4" placeholder="2022"></label>
        <label class="field"><span>Комментарий <i>(необязательно)</i></span><textarea name="comment" rows="3" placeholder="Что важно учесть?"></textarea></label>
      </fieldset>

      <fieldset class="wiz__pane" data-pane="2">
        <legend>Когда удобно?</legend>
        <label class="field"><span>Желаемая дата</span><input type="date" name="date"></label>
        <div class="field"><span>Желаемое время</span><div class="slots">${slots.map((t) => `<label><input type="radio" name="time" value="${t}"><span>${t}</span></label>`).join('')}</div></div>
        <p class="wiz__hint">Работаем 09:00–19:00 по записи. График по дням недели мастер уточнит в ответ.</p>
      </fieldset>

      <fieldset class="wiz__pane" data-pane="3">
        <legend>Как к вам обращаться?</legend>
        <label class="field"><span>Имя</span><input name="name" autocomplete="given-name" placeholder="Ваше имя"></label>
        <div class="wiz__summary" data-summary></div>
      </fieldset>

      <div class="wiz__nav">
        <button class="btn btn--ghost" type="button" data-wiz-prev disabled>${ic('arrow', 'ic ic--flip')}<span>Назад</span></button>
        <button class="btn btn--gold" type="button" data-wiz-next><span>Далее</span>${ic('arrow')}</button>
        <a class="btn btn--gold" data-wiz-send href="${wa()}" target="_blank" rel="noopener" hidden>${ic('wa')}<span>Отправить в WhatsApp</span></a>
      </div>
      <p class="wiz__alt" data-wiz-alt hidden>Удобнее в Telegram? <button type="button" class="link" data-wiz-tg>Скопировать текст и открыть Telegram</button> · или <a class="link" href="${TEL}">позвоните</a></p>
    </form>
    <aside class="booking__aside">
      <div class="booking__card" data-reveal>
        <p class="eyebrow">Ориентир по прайсу</p>
        <b class="booking__sum" data-wiz-sum>—</b>
        <p>Цены «от». Точную стоимость назовёт мастер — она зависит от автомобиля и материалов.</p>
      </div>
      <div class="booking__card" data-reveal>
        <p class="eyebrow">Или напрямую</p>
        <a class="booking__tel" href="${TEL}">${PHONE}</a>
        <div class="messengers"><a href="${wa()}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a><a href="${TG}" target="_blank" rel="noopener">${ic('tg')}Telegram</a></div>
        <p>${esc(D.location.address_short)}</p>
      </div>
    </aside>
  </div>
</section>
`;
  page({ file: 'zapis.html', title: 'Онлайн-запись в ART TONIR — тонировка и плёнка в Бийске', desc: 'Запишитесь в тюнинг-студию ART TONIR онлайн: выберите услуги, укажите автомобиль и удобное время — сообщение уйдёт мастеру в WhatsApp. Бийск, Советская 217/7.', active: 'zapis', body, scripts: ['assets/js/tools.js'] });
}

/* ───────────────────────── 404 ───────────────────────── */
function build404() {
  const body = `<section class="nf">
  <div class="phero__grid" aria-hidden="true"></div>
  <div class="container">
    <p class="nf__code" aria-hidden="true">4<span>0</span>4</p>
    <h1 class="h2">Эта страница <em>затонирована</em></h1>
    <p class="lead">Так темно, что ничего не видно. Вернитесь на главную или посмотрите услуги.</p>
    <div class="btn-row"><a class="btn btn--gold" href="index.html"><span>На главную</span>${ic('arrow')}</a><a class="btn btn--ghost" href="uslugi.html"><span>Услуги и цены</span></a></div>
  </div>
</section>`;
  page({ file: '404.html', title: 'Страница не найдена — ART TONIR', desc: 'Страница не найдена. Тюнинг-студия ART TONIR в Бийске.', active: '', body });
}

/* ───────────────────────── data.js для скриптов ───────────────────────── */
function buildData() {
  const data = {
    phone: PHONE, tel: TEL, wa: WA_BASE, tg: TG,
    services: SERVICES.map(({ id, name, price, priceText, from, cat, catName, imgs }) => ({ id, name, price, priceText, from, cat, catName, img: imgUrl(imgs[0], 400) })),
  };
  fs.mkdirSync(path.join(ROOT, 'assets/js'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'assets/js/data.js'), `/* Сгенерировано tools/build.mjs из data/site.json — не редактируйте вручную */\nwindow.AT_DATA=${JSON.stringify(data)};\n`);
}

function buildSitemap() {
  const base = SITE_URL || 'https://example.com';
  const urls = PAGES.filter((p) => p !== '404.html').map((p) => `  <url><loc>${base}/${p === 'index.html' ? '' : p}</loc></url>`).join('\n');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Замените ${base} на реальный домен (SITE_URL в tools/build.mjs) -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
}

buildData();
buildIndex();
buildServices();
CATS.forEach(buildCategory);
buildWorks();
buildReviews();
buildStudio();
buildContacts();
buildBooking();
build404();
buildSitemap();
console.log('Готово:', PAGES.join(', '));

// Рендерит фирменные картинки сайта из его же 3D-сцены и шаблонов:
//   assets/img/hero/poster-*.webp  — кадр 3D-бокса (заглушка, пока грузится WebGL, и фолбэк без WebGL)
//   assets/img/hero/stage-*.webp   — пустой бокс со световым потолком (фон визуализаторов)
//   assets/img/og.jpg              — превью ссылок для мессенджеров и соцсетей (шаблон tools/og.html)
//
// Запуск (нужны Playwright с Chromium и Python с Pillow):
//   python3 -m http.server 8765 &        # из корня репозитория
//   node tools/render-assets.mjs [http://localhost:8765]
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.argv[2] || 'http://localhost:8765';
const TMP = path.join(ROOT, 'tools', '.render');
const OUT = path.join(ROOT, 'assets', 'img', 'hero');
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const HIDE = `.hdr,.mmenu,.mbar,.smeta-fab,.smeta,.cursor,.pt,.toast,.skip,footer,main>*:not(.hero),.hero>*:not(.hero__gl){display:none!important}
body::after{display:none!important} .hero__gl{opacity:1!important;transition:none!important} .hero{min-height:100vh!important}`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function scene(name, shot, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/index.html?shot=${shot}`);
  await page.addStyleTag({ content: HIDE });
  await page.waitForFunction(() => document.documentElement.classList.contains('gl-on'), null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  const file = path.join(TMP, name + '.png');
  await page.screenshot({ path: file, timeout: 90000 });
  await page.close();
  console.log('✓', name);
  return file;
}

const poster = await scene('poster', 'poster', 1920, 1080);
const portrait = await scene('poster-portrait', 'poster', 900, 1600);
const stage = await scene('stage', 'stage', 1600, 1200);

const conv = `
from PIL import Image
import sys
src, out, *ws = sys.argv[1:]
im = Image.open(src).convert('RGB')
for w in map(int, ws):
    h = round(im.height * w / im.width)
    im.resize((w, h), Image.LANCZOS).save(f'{out}-{w}.webp', 'WEBP', quality=82, method=6)
`;
execFileSync('python3', ['-c', conv, poster, path.join(OUT, 'poster'), '1920', '1280']);
execFileSync('python3', ['-c', conv, portrait, path.join(OUT, 'poster-portrait'), '900']);
execFileSync('python3', ['-c', conv, stage, path.join(OUT, 'stage'), '1600', '900']);

const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.goto(`${BASE}/tools/og.html`, { waitUntil: 'networkidle' });
await og.evaluate(() => document.fonts.ready);
await og.screenshot({ path: path.join(ROOT, 'assets', 'img', 'og.jpg'), type: 'jpeg', quality: 88 });
console.log('✓ og.jpg');

await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });

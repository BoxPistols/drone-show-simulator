// Static site smoke tests — verify invariants of HTML/config without running a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// --- Page structure ---
test('drone-show.html has canvas root + brand + scripts', () => {
  const html = read('drone-show.html');
  assert.match(html, /Astra Flock/);
  assert.match(html, /id="canvas-root"/);
  assert.match(html, /formations\.js/);
  assert.match(html, /show\.js/);
  assert.match(html, /three\.min\.js/, 'three.js should be loaded');
  assert.match(html, /integrity="sha384-/, 'CDN resources need SRI');
});

test('choreography.html loads formations.js + show-schema.js before choreography.jsx', () => {
  const html = read('choreography.html');
  const idxForm = html.indexOf('formations.js');
  const idxSchema = html.indexOf('show-schema.js');
  const idxChor = html.indexOf('choreography.jsx');
  assert.ok(idxForm > 0, 'formations.js must be referenced');
  assert.ok(idxSchema > 0, 'show-schema.js must be referenced');
  assert.ok(idxForm < idxChor, 'formations.js must load before choreography.jsx');
  assert.ok(idxSchema < idxChor, 'show-schema.js must load before choreography.jsx');
});

test('fleet.html also loads shared formations.js', () => {
  const html = read('fleet.html');
  const idxForm = html.indexOf('formations.js');
  const idxFleet = html.indexOf('fleet.jsx');
  assert.ok(idxForm > 0, 'formations.js must be referenced');
  assert.ok(idxForm < idxFleet, 'formations.js must load before fleet.jsx');
});

test('all pages have canonical url + viewport + theme-color', () => {
  for (const page of ['drone-show.html', 'fleet.html', 'choreography.html', 'schedule.html']) {
    const html = read(page);
    assert.match(html, /rel="canonical"/, `${page} missing canonical`);
    assert.match(html, /name="viewport"/, `${page} missing viewport`);
    assert.match(html, /name="theme-color"/, `${page} missing theme-color`);
  }
});

test('all pages preconnect to Google Fonts', () => {
  for (const page of ['drone-show.html', 'fleet.html', 'choreography.html', 'schedule.html', '404.html']) {
    const html = read(page);
    assert.match(html, /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/, `${page} missing google preconnect`);
    assert.match(html, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/, `${page} missing gstatic preconnect`);
  }
});

// --- SEO / discovery ---
test('sitemap.xml lists all 4 primary pages', () => {
  const xml = read('sitemap.xml');
  assert.match(xml, /<loc>[^<]*\/<\/loc>/, 'sitemap needs root URL');
  assert.match(xml, /fleet\.html/);
  assert.match(xml, /choreography\.html/);
  assert.match(xml, /schedule\.html/);
});

test('robots.txt references sitemap', () => {
  const txt = read('robots.txt');
  assert.match(txt, /Sitemap:.*sitemap\.xml/);
});

test('404.html exists and contains navigation back', () => {
  const html = read('404.html');
  assert.match(html, /404/);
  assert.match(html, /href="\/"/);
  assert.match(html, /fleet\.html/);
});

// --- Assets ---
test('critical assets exist', () => {
  const required = [
    'favicon.svg', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png',
    'og-image.png', 'tokens.css', 'app-chrome.css',
    'formations.js', 'show-schema.js', 'show.js',
    'choreography.jsx', 'fleet.jsx', 'schedule.jsx',
  ];
  for (const f of required) {
    assert.ok(existsSync(resolve(root, f)), `missing asset: ${f}`);
  }
});

// --- vercel.json correctness ---
test('vercel.json has rewrite / CSP headers + outputDirectory', () => {
  const vc = JSON.parse(read('vercel.json'));
  assert.equal(vc.outputDirectory, '.');
  assert.ok(Array.isArray(vc.rewrites));
  assert.ok(vc.rewrites.some(r => r.destination?.includes('drone-show.html')));
  assert.ok(Array.isArray(vc.headers));
  const flat = JSON.stringify(vc.headers);
  assert.match(flat, /Content-Security-Policy/);
  assert.match(flat, /X-Content-Type-Options/);
  assert.match(flat, /Strict-Transport-Security/, 'HSTS required');
  assert.match(flat, /X-Frame-Options/, 'X-Frame-Options required (legacy support)');
  assert.match(flat, /Cross-Origin-Opener-Policy/, 'COOP required');
  assert.match(flat, /base-uri/, 'CSP base-uri required');
  assert.match(flat, /form-action/, 'CSP form-action required');
});

// --- Package scripts ---
test('package.json exposes dev/build/start/test/replay scripts', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const s of ['dev', 'build', 'start', 'test', 'replay']) {
    assert.ok(pkg.scripts[s], `missing script: ${s}`);
  }
});

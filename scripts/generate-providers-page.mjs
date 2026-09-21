#!/usr/bin/env node
// Generates docs/providers.html — the "where do I get an API key" page — from
// the PLATFORMS registry that the dashboard itself renders.
//
// Generated rather than hand-written on purpose. PLATFORMS gains and loses
// entries regularly, and a hand-maintained copy of it goes stale silently:
// docs/en/providers/01-supported-platforms.md drifted to claiming 45 platforms
// while the union had grown to 49, and nothing failed. Here the page is a
// build product of the registry, and `--check` turns any drift into a failing
// test instead of a quiet inaccuracy.
//
// Output is deterministic: no timestamps, no ordering that depends on anything
// but the source file. Regenerating without changing PLATFORMS produces a
// byte-identical file, which is what makes the drift check meaningful.
//
//   node scripts/generate-providers-page.mjs           # write the page
//   node scripts/generate-providers-page.mjs --check    # fail if out of date

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
export const SOURCE = resolve(ROOT, 'client/src/components/keys/shared.tsx');
export const OUTPUT = resolve(ROOT, 'docs/providers.html');

/** Lowest plausible registry size. A parser that silently matches nothing is
 *  worse than one that throws: it would emit an empty page that looks fine. */
const MIN_PLATFORMS = 40;

const ACCESS = {
  keyless: { label: 'No key needed', blurb: 'Works anonymously — no signup required.' },
  card: { label: 'Card required', blurb: 'A payment method must be attached to earn the free allowance.' },
  verify: { label: 'Extra verification', blurb: 'Signup needs a Discord or Telegram step beyond the account itself.' },
  cn: { label: 'CN real-name', blurb: 'The cloud account needs Chinese real-name verification.' },
  free: { label: 'Free key', blurb: 'Signup issues a key without payment details.' },
  selfhosted: { label: 'Your own endpoint', blurb: 'Configured in the dashboard — no third-party signup.' },
};

/** Classify from the registry's own label text and keyless flag. Derived from
 *  source strings rather than a second hand-maintained list, so it cannot
 *  disagree with what the dashboard shows. */
export function classify({ label, url, keyless }) {
  const l = label.toLowerCase();
  if (keyless || l.includes('no key needed')) return 'keyless';
  if (!url) return 'selfhosted';
  if (l.includes('payment method')) return 'card';
  if (l.includes('verification') && !l.includes('real-name')) return 'verify';
  // Chinese providers signal the gate two ways: most say "needs cn real-name",
  // ModelScope says "needs Aliyun cn binding". Both mean the same wall.
  if (l.includes('real-name') || l.includes('cn binding')) return 'cn';
  return 'free';
}

/** Pull PLATFORMS (and the custom endpoint entry) out of shared.tsx. */
export function parsePlatforms(source) {
  const start = source.indexOf('export const PLATFORMS');
  if (start === -1) throw new Error('PLATFORMS registry not found in shared.tsx');
  const end = source.indexOf('\n]', start);
  if (end === -1) throw new Error('PLATFORMS registry is not terminated');
  const body = source.slice(start, end);

  const entry = /\{\s*value:\s*'([^']+)',\s*label:\s*'((?:[^'\\]|\\.)*)',\s*url:\s*'([^']*)'(?:,\s*keyless:\s*(true|false))?\s*\}/g;
  const platforms = [];
  for (const m of body.matchAll(entry)) {
    platforms.push({ id: m[1], label: m[2], url: m[3], keyless: m[4] === 'true' });
  }

  const custom = source.match(
    // The trailing comma after the last property is optional — CUSTOM_GROUP
    // currently has one, and a formatter could remove it.
    /CUSTOM_GROUP[^=]*=\s*\{\s*value:\s*'([^']+)',\s*label:\s*'((?:[^'\\]|\\.)*)',\s*url:\s*'([^']*)',?\s*\}/,
  );
  if (custom) platforms.push({ id: custom[1], label: custom[2], url: custom[3], keyless: false });

  if (platforms.length < MIN_PLATFORMS) {
    throw new Error(
      `parsed only ${platforms.length} platforms (expected at least ${MIN_PLATFORMS}) — ` +
      'the shape of PLATFORMS probably changed; fix this parser rather than lowering the floor',
    );
  }
  const ids = new Set();
  for (const p of platforms) {
    if (ids.has(p.id)) throw new Error(`duplicate platform id: ${p.id}`);
    ids.add(p.id);
    if (!p.label) throw new Error(`platform ${p.id} has no label`);
  }
  return platforms.map(p => ({ ...p, access: classify(p) }));
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderPage(platforms) {
  const keyed = platforms.filter(p => p.url);
  const counts = {};
  for (const p of platforms) counts[p.access] = (counts[p.access] ?? 0) + 1;

  const chips = Object.entries(ACCESS)
    .filter(([k]) => counts[k])
    .map(([k, v]) => `<button class="chip" data-a="${k}" aria-pressed="false" title="${esc(v.blurb)}">${esc(v.label)} <span class="n">${counts[k]}</span></button>`)
    .join('\n      ');

  const rows = platforms.map(p => `      <article class="card" data-a="${p.access}" data-s="${esc((p.label + ' ' + p.id).toLowerCase())}">
        <div class="top">
          <h2>${esc(p.label)}</h2>
          <code class="id">${esc(p.id)}</code>
          <span class="badge b-${p.access}">${esc(ACCESS[p.access].label)}</span>
        </div>
        ${p.url
          ? `<a class="get" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Get an API key <span class="host">${esc(p.url.replace(/^https?:\/\//, ''))}</span></a>`
          : '<p class="none">Configured in the dashboard — point it at any OpenAI-compatible endpoint.</p>'}
      </article>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FreeLLMAPI — supported providers</title>
<meta name="description" content="Every provider FreeLLMAPI supports, with the page that issues its API key.">
<!--
  GENERATED FILE — do not edit by hand.
  Source: client/src/components/keys/shared.tsx (PLATFORMS)
  Regenerate: npm run providers:page
  Verified by: npm run test:providers-page
-->
<style>
  :root{--bg:#fbfaf9;--surface:#fff;--surface-2:#f4f2f0;--text:#1c1b19;--dim:#6b6763;--border:#e3dfdb;
    --accent:#b8562f;--accent-soft:#fdf0e9;--ok:#2f7a55;--ok-soft:#e8f4ed;--warn:#8a6410;--warn-soft:#fbf2dd;
    --cool:#35618e;--cool-soft:#e9f0f8;--mute:#5d5a66;--mute-soft:#efeef2;
    --shadow:0 1px 2px rgba(28,27,25,.05),0 8px 24px -12px rgba(28,27,25,.14)}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
    --bg:#17161a;--surface:#1f1e23;--surface-2:#27262c;--text:#ece9e6;--dim:#a09b98;--border:#34323a;
    --accent:#e8926a;--accent-soft:#3a2519;--ok:#6cc094;--ok-soft:#1c3329;--warn:#d9b061;--warn-soft:#33290f;
    --cool:#86b3e0;--cool-soft:#1b2b3d;--mute:#a9a5b5;--mute-soft:#2b2a33;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px -12px rgba(0,0,0,.6)}}
  :root[data-theme="dark"]{--bg:#17161a;--surface:#1f1e23;--surface-2:#27262c;--text:#ece9e6;--dim:#a09b98;
    --border:#34323a;--accent:#e8926a;--accent-soft:#3a2519;--ok:#6cc094;--ok-soft:#1c3329;--warn:#d9b061;
    --warn-soft:#33290f;--cool:#86b3e0;--cool-soft:#1b2b3d;--mute:#a9a5b5;--mute-soft:#2b2a33;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px -12px rgba(0,0,0,.6)}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);
    font:15px/1.55 ui-sans-serif,-apple-system,"Segoe UI",Roboto,Inter,sans-serif;-webkit-font-smoothing:antialiased}
  .wrap{max-width:960px;margin:0 auto;padding:40px 16px 80px}
  .eyebrow{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--accent);font-weight:650}
  h1{font-size:clamp(26px,5vw,36px);line-height:1.1;margin:8px 0 10px;letter-spacing:-.02em}
  .lede{color:var(--dim);max-width:66ch;margin:0}
  .controls{position:sticky;top:0;z-index:5;background:var(--bg);padding:16px 0 12px;margin:22px 0 0;
    border-bottom:1px solid var(--border)}
  .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  input[type=search]{flex:1 1 240px;min-width:0;padding:10px 14px;font:inherit;color:var(--text);
    background:var(--surface);border:1px solid var(--border);border-radius:999px;outline:none}
  input[type=search]:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  .chip,.btn{padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap;background:var(--surface);
    color:var(--dim);border:1px solid var(--border);border-radius:999px}
  .chip:hover,.btn:hover{color:var(--text)}
  .chip[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent);font-weight:600}
  .chip .n{opacity:.6;font-variant-numeric:tabular-nums}
  .count{font-size:13px;color:var(--dim);margin:14px 0 12px}
  .grid{display:grid;gap:10px}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow)}
  .top{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:baseline}
  h2{font-size:16.5px;font-weight:650;margin:0;letter-spacing:-.01em}
  .id{font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim);background:var(--surface-2);
    padding:1px 7px;border-radius:6px}
  .badge{font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap;margin-left:auto}
  .b-keyless{background:var(--ok-soft);color:var(--ok)}
  .b-free{background:var(--cool-soft);color:var(--cool)}
  .b-card,.b-verify,.b-cn{background:var(--warn-soft);color:var(--warn)}
  .b-selfhosted{background:var(--mute-soft);color:var(--mute)}
  .get{display:inline-flex;align-items:baseline;gap:8px;margin-top:10px;color:var(--accent);font-weight:600;
    text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:1px}
  .get:hover{opacity:.75}
  .host{font:12px/1.5 ui-monospace,Menlo,monospace;font-weight:400;opacity:.8}
  .none{margin:10px 0 0;font-size:14px;color:var(--dim)}
  .empty{padding:36px 0;text-align:center;color:var(--dim)}
  footer{margin-top:36px;padding-top:18px;border-top:1px solid var(--border);color:var(--dim);font-size:13px}
  footer code{background:var(--surface-2);padding:1px 5px;border-radius:5px;font-size:.92em}
  .hidden{display:none}
  @media (max-width:560px){.badge{margin-left:0}}
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">FreeLLMAPI</div>
  <h1>Supported providers &amp; where to get a key</h1>
  <p class="lede">Every provider the router can talk to, with the page that issues its API key.
    Add the key on the dashboard's <strong>Keys</strong> page and the router starts using it.</p>

  <div class="controls">
    <div class="row">
      <input type="search" id="q" placeholder="Search providers…" autocomplete="off" aria-label="Search providers">
      <button class="btn" id="theme">Theme</button>
    </div>
    <div class="chips" id="chips">
      ${chips}
    </div>
  </div>

  <p class="count" id="count"></p>
  <div class="grid" id="grid">
${rows}
      <p class="empty hidden" id="empty">No provider matches that search.</p>
  </div>

  <footer>
    <p><strong>${platforms.length}</strong> entries — ${keyed.length} providers that issue a key, plus the custom
      OpenAI-compatible endpoint.</p>
    <p>This page is generated from <code>client/src/components/keys/shared.tsx</code>, the same registry the dashboard
      renders, so it cannot drift from what the app actually supports. Regenerate with
      <code>npm run providers:page</code>. Free-tier terms change often — the linked page is always the authority.</p>
  </footer>
</div>

<script>
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var q = document.getElementById('q');
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');
  var active = null;

  function apply() {
    var term = q.value.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (!term || c.dataset.s.indexOf(term) !== -1) && (!active || c.dataset.a === active);
      c.classList.toggle('hidden', !ok);
      if (ok) shown++;
    });
    emptyEl.classList.toggle('hidden', shown > 0);
    countEl.textContent = shown === cards.length
      ? 'Showing all ' + cards.length + ' providers'
      : 'Showing ' + shown + ' of ' + cards.length + ' providers';
  }

  q.addEventListener('input', apply);
  document.getElementById('chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b) return;
    active = active === b.dataset.a ? null : b.dataset.a;
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
      c.setAttribute('aria-pressed', String(c.dataset.a === active));
    });
    apply();
  });
  document.getElementById('theme').addEventListener('click', function () {
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var cur = document.documentElement.dataset.theme || (dark ? 'dark' : 'light');
    document.documentElement.dataset.theme = cur === 'dark' ? 'light' : 'dark';
  });

  apply();
</script>
</body>
</html>
`;
}

export function build() {
  return renderPage(parsePlatforms(readFileSync(SOURCE, 'utf8')));
}

function main() {
  const check = process.argv.includes('--check');
  const html = build();
  if (!check) {
    writeFileSync(OUTPUT, html);
    console.log(`wrote docs/providers.html (${parsePlatforms(readFileSync(SOURCE, 'utf8')).length} entries)`);
    return;
  }
  let current;
  try {
    current = readFileSync(OUTPUT, 'utf8');
  } catch {
    console.error('docs/providers.html is missing — run: npm run providers:page');
    process.exit(1);
  }
  if (current !== html) {
    console.error(
      'docs/providers.html is out of date with the PLATFORMS registry.\n' +
      'Run: npm run providers:page  (and commit the result)',
    );
    process.exit(1);
  }
  console.log('docs/providers.html is up to date.');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main();

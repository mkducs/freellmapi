import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SOURCE,
  OUTPUT,
  build,
  classify,
  parsePlatforms,
  renderPage,
} from './generate-providers-page.mjs';

const registry = () => readFileSync(SOURCE, 'utf8');
const ACCESS_KEYS = new Set(['keyless', 'card', 'verify', 'cn', 'free', 'selfhosted']);

test('parses the real PLATFORMS registry', () => {
  const platforms = parsePlatforms(registry());

  assert.ok(platforms.length >= 40, `expected 40+ platforms, got ${platforms.length}`);
  assert.equal(new Set(platforms.map(p => p.id)).size, platforms.length, 'platform ids must be unique');
  for (const p of platforms) {
    assert.ok(p.label.length > 0, `${p.id} has no label`);
    assert.ok(ACCESS_KEYS.has(p.access), `${p.id} has an unknown access class: ${p.access}`);
  }
});

test('every keyed provider links somewhere fetchable over https', () => {
  for (const p of parsePlatforms(registry())) {
    if (p.access === 'selfhosted') {
      assert.equal(p.url, '', 'the custom endpoint entry has no signup URL');
      continue;
    }
    assert.match(p.url, /^https:\/\/\S+$/, `${p.id} should have an https signup URL, got "${p.url}"`);
  }
});

test('the registry keeps the three keyless providers reachable without a key', () => {
  const keyless = parsePlatforms(registry()).filter(p => p.access === 'keyless').map(p => p.id).sort();

  // These three are the ones the router can use with no credential at all.
  // If one leaves the set, the page's "No key needed" filter is telling users
  // something untrue — worth failing over.
  assert.deepEqual(keyless, ['aihorde', 'kilo', 'ovh']);
});

test('classify reads access off the registry label, not a second list', () => {
  const at = (label, extra = {}) => classify({ label, url: 'https://example.com', ...extra });

  assert.equal(at('Kilo Gateway (no key needed)', { keyless: true }), 'keyless');
  assert.equal(at('OVH (no key needed)'), 'keyless', 'the label alone is enough');
  assert.equal(at('Sail Research ($5 monthly with payment method)'), 'card');
  assert.equal(at('BlazeAPI (daily free tokens; Discord verification)'), 'verify');
  assert.equal(at('Baidu Qianfan (free ERNIE, needs cn real-name)'), 'cn');
  assert.equal(at('ModelScope (free key, needs Aliyun cn binding)'), 'cn');
  assert.equal(at('Groq'), 'free');
  assert.equal(classify({ label: 'Custom (OpenAI-compatible)', url: '' }), 'selfhosted');
});

test('a real-name label is classified cn even though it says "verification"', () => {
  // 'verification' appears in both the Discord/Telegram labels and the Chinese
  // real-name ones; the ordering in classify() has to disambiguate.
  assert.equal(
    classify({ label: 'iFlytek Spark (free Lite, needs cn real-name verification)', url: 'https://x.test' }),
    'cn',
  );
});

test('parser refuses to silently produce an empty page', () => {
  assert.throws(() => parsePlatforms('export const SOMETHING_ELSE = []'), /PLATFORMS registry not found/);
  assert.throws(
    () => parsePlatforms("export const PLATFORMS = [\n  { value: 'a', label: 'A', url: 'https://a.test' },\n]"),
    /parsed only 1 platforms/,
    'a registry that parses to almost nothing must fail loudly, not emit an empty page',
  );
});

test('duplicate platform ids are rejected', () => {
  const dupes = "export const PLATFORMS = [\n"
    + Array.from({ length: 41 }, (_, i) => `  { value: 'p${i}', label: 'P${i}', url: 'https://p${i}.test' },`).join('\n')
    + "\n  { value: 'p0', label: 'Duplicate', url: 'https://dupe.test' },\n]";
  assert.throws(() => parsePlatforms(dupes), /duplicate platform id: p0/);
});

test('output is deterministic — the drift check depends on it', () => {
  assert.equal(build(), build());
});

test('labels and URLs are HTML-escaped', () => {
  const html = renderPage([
    { id: 'x', label: 'A & B <script>', url: 'https://x.test/?a=1&b=2', keyless: false, access: 'free' },
  ]);

  assert.ok(html.includes('A &amp; B &lt;script&gt;'), 'label must be escaped');
  assert.ok(!html.includes('<script>A'), 'raw label markup must not reach the document');
  assert.ok(html.includes('https://x.test/?a=1&amp;b=2'), 'URL must be escaped');
});

test('docs/providers.html is in sync with the registry', () => {
  const committed = readFileSync(OUTPUT, 'utf8');

  assert.equal(
    committed,
    build(),
    'docs/providers.html is stale. Run `npm run providers:page` and commit the result.',
  );
});

test('the generated page is self-contained', () => {
  const html = readFileSync(OUTPUT, 'utf8');

  // No network dependencies: the page has to render from the repo alone.
  assert.ok(!/<script[^>]+src=/i.test(html), 'no external scripts');
  assert.ok(!/<link[^>]+stylesheet/i.test(html), 'no external stylesheets');
  assert.ok(html.includes('GENERATED FILE'), 'carries the do-not-edit banner');
  assert.ok(html.includes('npm run providers:page'), 'says how to regenerate');
});

# Verification — generated providers page

Task: FEATURE — an interactive page listing every supported provider and its
API-key signup URL, committed to the repo
Date: 2026-09-21
Branch: `claude/free-llm-apis-list-3reinw`

## Acceptance criteria

| # | Criterion | Result |
| --- | --- | --- |
| AC-001 | Page lists every entry in the PLATFORMS registry | **PASS** — 49 entries (48 keyed + the custom endpoint) |
| AC-002 | Each keyed provider links to its signup/API-key page over https | **PASS** — asserted per provider |
| AC-003 | Page is interactive: search + access filters | **PASS** — rendered and screenshotted |
| AC-004 | Page is self-contained (no external scripts/styles/fonts) | **PASS** — asserted |
| AC-005 | Output is deterministic | **PASS** — two runs byte-identical |
| AC-006 | Drift from the registry fails a test | **PASS** — proven by injecting a provider |
| AC-007 | Full workspace suite green | **PASS** |

## Commands actually run

```
$ node scripts/generate-providers-page.mjs
wrote docs/providers.html (49 entries)

$ node scripts/generate-providers-page.mjs --check
docs/providers.html is up to date.

$ node --test scripts/generate-providers-page.test.mjs
# tests 11 | # pass 11 | # fail 0

$ npm test
# scripts/dev-bootstrap:        pass 9
# scripts/generate-providers:   pass 11
  server:  276 files, 3214 passed, 5 skipped
  cli:       5 files,  107 passed
  client:   29 files,  296 passed
  i18n validation passed for 60 locales and 1156 keys
```

## Drift detection, proven rather than asserted

A provider was temporarily added to `client/src/components/keys/shared.tsx`:

```
$ node scripts/generate-providers-page.mjs --check
docs/providers.html is out of date with the PLATFORMS registry.
Run: npm run providers:page  (and commit the result)
exit=1

$ node --test scripts/generate-providers-page.test.mjs
# pass 10 | # fail 1
```

The registry was then restored; `--check` passed again, `docs/providers.html`
was byte-identical to before, and `git status` showed the source file clean.

## Classification derived from source, not a parallel list

Access badges come from the registry's own `keyless` flag and label text, so
they cannot disagree with what the dashboard renders:

| Class | Count | Members |
| --- | --- | --- |
| No key needed | 3 | kilo, ovh, aihorde |
| Card required | 1 | sail |
| Extra verification | 1 | blaze |
| CN real-name | 4 | modelscope, qianfan, volcengine, xfyun |
| Free key | 39 | the rest |
| Your own endpoint | 1 | custom |

One classification bug was found and fixed while testing: ModelScope's label
says "needs Aliyun cn binding" rather than "real-name", so it was initially
classified as an ordinary free key. Both spellings now map to the same gate.

A parser bug was also found: `CUSTOM_GROUP` ends with a trailing comma after
its last property, which the original pattern did not allow, so the page was
generated with 48 entries instead of 49. Caught by bisecting the regex against
the real source rather than by assuming the parse was correct.

## Risks

- The generator parses TypeScript with a regex. That is fragile in principle,
  but it fails loudly: the parser throws below a 40-platform floor, on a
  duplicate id, or on a missing label, and the drift test compares the whole
  rendered file. A silent wrong answer is the failure mode that was designed
  out; a noisy one is acceptable.
- Free-tier terms in the labels are point-in-time. The page says the linked
  provider page is the authority.

## Unknowns

None blocking. `docs/` is not published from this repository (its `index.html`
is a redirect stub to freellmapi.co), so the page is a repo artifact rather
than a live site; publishing it is a separate decision.

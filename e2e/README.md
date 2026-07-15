# Journey demo walks (Playwright)

These Playwright specs exist to **demonstrate the notification journey**, not to
exhaustively test it. The deliverable is the **video and trace** each run
produces — a recorded walk-through of the prototype you can replay or share.

Each spec drives the prototype end to end, filling every page as a user would,
and the data-driven variants exercise the journey's conditional branches.

## Running

```bash
npm install
npx playwright install chromium   # one-off, installs the browser

npm run test:prototype        # fast walk (no pauses) — quick pass/fail check
npm run test:prototype:demo   # recording pace (~600ms/action) — for the video
npm run test:prototype:report # open the HTML report (videos + traces attached)
```

Playwright boots the prototype itself (`npm run dev`, in development mode) and
tears it down after — you don't need a server running. Each test resets its own
session first (`GET /create-notification`), so runs are independent and parallel.

Pacing is controlled by the `DEMO_SLOWMO` environment variable (milliseconds per
action). Override it directly for a custom pace:

```bash
DEMO_SLOWMO=1000 npx playwright test        # very slow, presentation pace
DEMO_SLOWMO=0 npx playwright test --headed   # watch it live at full speed
```

## Artefacts

Video, trace and (on failure) screenshots are retained for **every** run — they
are the point of the exercise. Find them under `test-results/` and in the HTML
report (`playwright-report/`). Both directories are git-ignored.

```bash
npx playwright show-report                 # HTML report, videos inline per test
npx playwright show-trace test-results/.../trace.zip   # step-by-step trace viewer
```

## What the walks cover

| Variant | Branch demonstrated |
|---|---|
| Cattle imported by air | `animal-identification-details` inserted (species with identifiers); transit skipped |
| Poultry imported by rail | `transit-countries` inserted (rail); animal identification skipped |

## Files

- `walk.spec.js` — one demo walk per journey variant (`JOURNEYS`).
- `journey.js` — the `JOURNEYS` data plus per-page fill helpers and
  `resetSession`. Autocomplete-backed fields (country, commodity, port, transit)
  are driven through their widgets; inputs are targeted by their `name`
  attribute so the walk survives copy changes.

## Notes for maintainers

- Boot uses `npm run dev`, **not** `serve`: `serve` runs in production mode,
  which force-redirects http→https (breaking the plaintext local server) and
  sets secure-only session cookies.
- The `webServer` readiness check waits on the TCP **port**, not an HTTP GET —
  the kit's server accepts connections before an HTTP probe settles under Node 24.

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

npm run test:prototype        # runs the walks at demo pace and records them
npm run test:prototype:report # open the HTML report (videos + traces attached)
```

Playwright boots the prototype itself (`npm run dev`, in development mode) and
tears it down after — you don't need a server running. Each test resets its own
session first (`GET /create-notification`).

The walks run at a watchable demo pace (~600ms per action) and record in a tall
1280×1200 frame so the full page stays in shot. Adjust the pace with the
`DEMO_SLOWMO` environment variable (milliseconds per action):

```bash
DEMO_SLOWMO=1000 npm run test:prototype   # slower, presentation pace
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

| Walk | What it demonstrates |
|---|---|
| Cattle imported by air | `animal-identification-details` branch; identifiers entered; **every** address sub-section filled (a complete notification); transit skipped |
| Poultry imported by rail | `transit-countries` branch (rail); animal identification skipped |
| Pet cat imported by air | `animal-identification-details` branch; the **permanent-address** sub-journey |
| Task list | Part-fill, save to the `notification-hub` task list, then review and submit from there |

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
- Runs serially (`workers: 1`): the kit's dev server races journey state across
  concurrent sessions, so parallel runs intermittently drop a page's data.

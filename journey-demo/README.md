# Journey demo (Playwright)

A small Playwright suite that **records a walk-through of the notification
journey** — the deliverable is the **video and shareable report**, so a
non-technical audience (product owners, stakeholders) can watch the prototype
being used end to end.

Everything test-related lives in this `journey-demo/` folder so it stays out of
the designers' way. The only touch-points in the prototype itself are two
`npm` scripts and a dev-dependency in the root `package.json`.

## Running it

From the **repo root**:

```bash
npm ci                            # installs the prototype + the test tooling
npx playwright install chromium   # one-off, installs the browser

npm run test:prototype            # records the walk-throughs
npm run test:prototype:report     # opens the shareable HTML report
```

You don't need to start the prototype yourself — Playwright boots it (in
development mode) and shuts it down afterwards.

The walks are paced for viewing: text is typed character by character and each
new page pauses briefly so it's easy to follow. To slow everything down even
further, set `DEMO_SLOWMO` (milliseconds added to every action):

```bash
DEMO_SLOWMO=400 npm run test:prototype
```

## What it shows

| Walk | Journey covered |
|---|---|
| Cattle imported by air | Animal identification, then **every** address section filled — a complete notification |
| Poultry imported by rail | The transit-countries branch (rail) |
| Pet cat imported by air | Animal identification and the permanent-address section |
| Task list | Saving progress to the task list and submitting from there |

## The recording and report

Video, trace and (on failure) screenshots are kept for **every** walk — they're
the point of the exercise. They live under `journey-demo/`:

- `journey-demo/playwright-report/` — a self-contained HTML report; open it with
  `npm run test:prototype:report`. Each walk has its video inline, and you can
  zip this folder to share it.
- `journey-demo/test-results/` — the raw videos and traces.

Both are regenerated on every run and are git-ignored.

On every push to `main` (or a manual run from the Actions tab), a GitHub Actions
workflow records the walks and uploads the report as a **downloadable artefact**
(`journey-demo-report`) on the run. To view it: open the workflow run in the
**Actions** tab, download the artefact, unzip it, and open `index.html` — the
videos play inline and the traces open from there. The artefact expires after 14
days, so nothing piles up.

## Keeping the demo up to date when the prototype changes

When someone changes the prototype, the walks should be updated to include the
new or changed steps. The quickest way is to hand it to a coding agent (e.g.
Claude Code) — run this from the repo root and paste the prompt:

```
The Playwright journey demo lives in journey-demo/. Update it so the recorded
walk-throughs reflect recent changes to the prototype:

1. Find the last commit that touched the demo:
     git log -1 --format=%H -- journey-demo
2. See what changed in the prototype since then:
     git log --oneline <that-commit>..HEAD -- app
     git diff <that-commit>..HEAD -- app/routes.js app/views app/data
3. Work out how the journey changed — new or reordered pages, new fields or
   options, new branches, renamed routes.
4. Update journey-demo/e2e/journey.js (the JOURNEYS data and the per-page fill
   helpers) and journey-demo/e2e/walk.spec.js to walk the new/changed steps,
   following the patterns already there: fill inputs by their name attribute,
   drive the type-and-pick autocompletes with the pickFromAutocomplete helper,
   and add new branch coverage as another entry in JOURNEYS.
5. Run it until green: npm run test:prototype (read journey-demo/test-results/
   **/error-context.md on any failure). Confirm each walk records a full video.
6. Keep everything inside journey-demo/ — the only root changes allowed are the
   test:prototype scripts and the @playwright/test dev-dependency.
```

## Notes for maintainers

- The test server runs `npm run dev`, **not** `serve`: production mode force-
  redirects http→https (breaking the plaintext local server) and uses secure-
  only session cookies that break sessions. `serve-prototype.js` boots it and
  makes sure the kit's usage-data prompt can't hang a non-interactive run.
- Readiness waits on the TCP **port**, not an HTTP GET — the kit accepts
  connections before an HTTP probe settles under Node 24.
- The walks run in **parallel** (`workers: 4`). Each uses its own browser
  context and the prototype keeps state in `req.session.data` (per session), so
  they stay isolated. Text-entry helpers wait for the page to catch up before
  moving on, which keeps the parallel runs reliable.

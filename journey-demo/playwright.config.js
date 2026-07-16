const path = require('path')
const { defineConfig, devices } = require('@playwright/test')

// This suite exists to DEMONSTRATE the notification journey — the video and
// trace are the deliverable, not the assertions. Pacing is controlled by
// DEMO_SLOWMO (ms per action); the demo script sets it to a watchable speed.
module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  // Run the walks in parallel to save wall-clock time. Each test uses its own
  // browser context (separate cookies), and the prototype keeps journey state in
  // req.session.data (per session), so the walks don't tread on each other.
  fullyParallel: true,
  workers: 4,
  timeout: 600_000,
  expect: { timeout: 15_000 },
  // Keep every artefact inside journey-demo/ (resolved from this config's
  // location) so nothing lands in the prototype root, wherever it's run from.
  outputDir: path.join(__dirname, 'test-results'),
  reporter: [
    ['html', { open: 'never', outputFolder: path.join(__dirname, 'playwright-report') }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Pacing is done explicitly in the specs (natural typing + short pauses on
    // each new page), so no global slow-mo by default. Set DEMO_SLOWMO to add a
    // uniform delay to every action if you want to slow everything down further.
    launchOptions: {
      slowMo:
        process.env.DEMO_SLOWMO !== undefined ? Number(process.env.DEMO_SLOWMO) : 0
    },
    // A tall viewport so the full page fits in frame (GDS journey pages are
    // long), recorded at full resolution so the video stays legible.
    viewport: { width: 1280, height: 1200 },
    video: { mode: 'on', size: { width: 1280, height: 1200 } },
    trace: 'on',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 1200 } } }
  ],
  webServer: {
    // Boots the prototype from the repo root (see serve-prototype.js). It runs
    // the kit in development mode, NOT `serve`: production mode applies the kit's
    // forceHttps redirect (http → https on a plaintext server = SSL error) and
    // sets secure-only session cookies that break yar over http.
    command: 'node serve-prototype.js',
    cwd: __dirname,
    // Wait on the TCP port rather than an HTTP GET: the kit's server accepts
    // connections well before an HTTP probe settles under Node 24, so a port
    // check is both faster and reliable here.
    port: 3000,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI
  }
})

const { defineConfig, devices } = require('@playwright/test')

// This suite exists to DEMONSTRATE the notification journey — the video and
// trace are the deliverable, not the assertions. Pacing is controlled by
// DEMO_SLOWMO (ms per action); the demo script sets it to a watchable speed.
module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  // Each test resets its own session via /create-notification before walking,
  // so parallel runs don't clobber each other.
  // Run serially: the kit's dev server shares journey state in a way that races
  // across concurrent sessions, intermittently dropping a page's data. The suite
  // is small, so serial is both reliable and plenty fast.
  fullyParallel: false,
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    launchOptions: {
      slowMo:
        process.env.DEMO_SLOWMO !== undefined ? Number(process.env.DEMO_SLOWMO) : 600
    },
    // Retain video + trace for every run — these ARE the demo artefacts.
    video: 'on',
    trace: 'on',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Development mode, NOT `serve`: production mode applies the kit's
    // forceHttps redirect (http → https on a plaintext server = SSL error) and
    // sets secure-only session cookies that break yar over http.
    command: 'npm run dev',
    // Wait on the TCP port rather than an HTTP GET: the kit's server accepts
    // connections well before an HTTP probe settles under Node 24, so a port
    // check is both faster and reliable here.
    port: 3000,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI
  }
})

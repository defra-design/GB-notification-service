//
// Boots the GOV.UK Prototype Kit app (which lives in the repo root, one level
// up) for the demo tests. Playwright's webServer runs this from journey-demo/.
//
// It first makes sure the kit's "share usage data?" prompt is already answered,
// so a non-interactive run (Playwright, CI) can't hang waiting on stdin, and
// preloads atomic-session-store.js into the kit's process.
//
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const root = path.join(__dirname, '..')

const usageConfig = path.join(root, 'usage-data-config.json')
if (!fs.existsSync(usageConfig)) {
  fs.writeFileSync(usageConfig, `${JSON.stringify({ collectUsageData: false }, null, 2)}\n`)
}

const preloadAtomicSessionStore = `--require ${JSON.stringify(path.join(__dirname, 'atomic-session-store.js'))}`
const nodeOptions = [process.env.NODE_OPTIONS, preloadAtomicSessionStore].filter(Boolean).join(' ')

const child = spawn('npm', ['run', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: nodeOptions }
})
child.on('exit', (code) => process.exit(code ?? 0))
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => child.kill(signal))
}

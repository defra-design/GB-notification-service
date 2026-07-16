//
// Boots the GOV.UK Prototype Kit app (which lives in the repo root, one level
// up) for the demo tests. Playwright's webServer runs this from journey-demo/.
//
// It first makes sure the kit's "share usage data?" prompt is already answered,
// so a non-interactive run (Playwright, CI) can't hang waiting on stdin.
//
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const root = path.join(__dirname, '..')

const usageConfig = path.join(root, 'usage-data-config.json')
if (!fs.existsSync(usageConfig)) {
  fs.writeFileSync(usageConfig, `${JSON.stringify({ collectUsageData: false }, null, 2)}\n`)
}

const child = spawn('npm', ['run', 'dev'], { cwd: root, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => child.kill(signal))
}

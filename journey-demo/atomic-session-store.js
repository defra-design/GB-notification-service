//
// Preloaded into the prototype process by serve-prototype.js. Writes each
// session file to a temporary name and renames it into place, so a concurrent
// read of a session never sees a half-written file.
//
const fs = require('fs/promises')
const path = require('path')
const { randomUUID } = require('crypto')
const FileStore = require('govuk-prototype-kit/lib/session-file-store')

FileStore.prototype.set = async function set (sessionId, session, callback = () => {}) {
  try {
    await fs.mkdir(this.path, { recursive: true })
    const filename = path.join(this.path, `${sessionId}.json`)
    const partialFilename = `${filename}.${randomUUID()}.partial`
    await fs.writeFile(partialFilename, JSON.stringify(session))
    await fs.rename(partialFilename, filename)
    callback()
  } catch (err) {
    callback(err)
  }
}

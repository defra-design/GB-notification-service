// Finds the registered office addresses for one full UK postcode in the files
// `npm run build:postcode-addresses` writes, reading only that postcode's
// outward-code file.

const fs = require('fs/promises')
const path = require('path')
const {
  normalisePostcode,
  isFullPostcode,
  outwardCode,
  isOutwardCode,
  formatPostcode
} = require('./postcode')

const DEFAULT_DIR = path.join(__dirname, '..', 'data', 'generated', 'postcode-addresses')

// Returns one of:
//   { status: 'missing' }
//   { status: 'invalid', input }
//   { status: 'found' | 'none', postcode, addresses }
async function lookupPostcode (input, { dir = DEFAULT_DIR } = {}) {
  const postcode = normalisePostcode(input)

  if (!postcode) return { status: 'missing' }
  if (!isFullPostcode(postcode)) return { status: 'invalid', input: String(input).trim() }

  const outward = outwardCode(postcode)
  // The pattern only lets letters and digits through, so the file name can
  // never leave the directory.
  if (!isOutwardCode(outward)) return { status: 'invalid', input: String(input).trim() }

  let byPostcode = {}
  try {
    byPostcode = JSON.parse(await fs.readFile(path.join(dir, `${outward}.json`), 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    // No file for this outward code is a real "no addresses", but no files at
    // all means the build has not run here.
    await fs.access(path.join(dir, 'manifest.json')).catch(() => {
      throw new Error(`No postcode address files in ${dir}: run npm run build:postcode-addresses`)
    })
  }

  const addresses = byPostcode[postcode] || []

  return {
    status: addresses.length ? 'found' : 'none',
    postcode: formatPostcode(postcode),
    addresses
  }
}

module.exports = { lookupPostcode }

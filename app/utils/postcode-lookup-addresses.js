// Turns the registered office addresses at one postcode into the entries the
// journey's address forms already take: an id, a label and the form fields.
//
// The id names the postcode and the address's place in that postcode's list
// (ch-BB44JG-2), so the forms can find the address again from the id alone.

const fs = require('fs')
const path = require('path')
const {
  normalisePostcode,
  isFullPostcode,
  outwardCode,
  isOutwardCode,
  formatPostcode
} = require('./postcode')

const DEFAULT_DIR = path.join(__dirname, '..', 'data', 'generated', 'postcode-addresses')
const ID_PATTERN = /^ch-([A-Z0-9]{5,7})-(\d{1,4})$/

function readPostcode (postcode, dir) {
  const outward = outwardCode(postcode)
  if (!isOutwardCode(outward)) return []

  try {
    const byPostcode = JSON.parse(fs.readFileSync(path.join(dir, `${outward}.json`), 'utf8'))
    return byPostcode[postcode] || []
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

// "UNIT 1, YORK AVENUE, HASLINGDEN" becomes line 1 "UNIT 1", line 2
// "YORK AVENUE" and town "HASLINGDEN". A single part is line 1 only.
function formFields (text, postcode) {
  const parts = text.split(', ')
  const townOrCity = parts.length > 1 ? parts[parts.length - 1] : ''

  return {
    nameOrOrganisation: '',
    addressLine1: parts[0],
    addressLine2: parts.length > 2 ? parts.slice(1, -1).join(', ') : '',
    townOrCity,
    county: '',
    postcode,
    country: 'United Kingdom'
  }
}

function toLookupAddress (postcode, text, index) {
  const shown = formatPostcode(postcode)
  const label = `${text}, ${shown}`

  return {
    id: `ch-${postcode}-${index}`,
    name: text,
    address: shown,
    country: 'United Kingdom',
    label,
    searchText: label.toLowerCase(),
    manual: formFields(text, shown)
  }
}

// Every registered office address at a full postcode, as form entries.
function getPostcodeLookupAddresses (input, { dir = DEFAULT_DIR } = {}) {
  const postcode = normalisePostcode(input)
  if (!postcode || !isFullPostcode(postcode)) return []

  return readPostcode(postcode, dir).map((text, index) => toLookupAddress(postcode, text, index))
}

function parseId (id) {
  const match = ID_PATTERN.exec(String(id || ''))
  if (!match || !isFullPostcode(match[1])) return null

  return { postcode: match[1], index: Number(match[2]) }
}

function getPostcodeLookupAddressById (id, { dir = DEFAULT_DIR } = {}) {
  const parsed = parseId(id)
  if (!parsed) return null

  const text = readPostcode(parsed.postcode, dir)[parsed.index]
  return text ? toLookupAddress(parsed.postcode, text, parsed.index) : null
}

// The other addresses at the same postcode as a chosen one, so a form can
// list them in place of its example addresses.
function getPostcodeLookupAddressesForId (id, options) {
  const parsed = parseId(id)
  return parsed ? getPostcodeLookupAddresses(parsed.postcode, options) : null
}

module.exports = {
  getPostcodeLookupAddresses,
  getPostcodeLookupAddressById,
  getPostcodeLookupAddressesForId
}

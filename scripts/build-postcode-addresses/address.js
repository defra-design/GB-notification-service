// How one Companies House registered office row becomes a display address and
// the key two rows are compared on. Company name and number are never used.
//
// Care-of names a person or firm, not a premises, so it is left out.
// Country is left out: the register writes the same premises as "England",
// "United Kingdom" or nothing, and the postcode already places it.

const ADDRESS_FIELDS = [
  'RegAddress.POBox',
  'RegAddress.AddressLine1',
  'RegAddress.AddressLine2',
  'RegAddress.PostTown',
  'RegAddress.County'
]

function tidy (value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ')
}

function poBoxLine (value) {
  if (!value) return ''
  return /^p\.?\s*o\.?\s*box\b/i.test(value) ? value : `PO Box ${value}`
}

// Returns null when the row has nothing that places a premises: no PO box and
// no first address line.
function addressFromRow (row) {
  const [poBox, line1, line2, town, county] = ADDRESS_FIELDS.map((field) => tidy(row[field]))

  if (!poBox && !line1) return null

  const parts = [poBoxLine(poBox), line1, line2, town, county].filter(Boolean)

  return {
    key: parts.join('|').toLowerCase(),
    display: parts.join(', ')
  }
}

// Picks one display text among case variants of the same address, the same
// way every build: the one with the most lower-case letters reads best, so it
// wins; a tie goes to the lower string by code point.
function preferredDisplay (current, candidate) {
  if (current === undefined) return candidate

  const lowerCount = (text) => (text.match(/[a-z]/g) || []).length
  const difference = lowerCount(candidate) - lowerCount(current)

  if (difference !== 0) return difference > 0 ? candidate : current

  return candidate < current ? candidate : current
}

const collator = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' })

function compareDisplay (a, b) {
  return collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)
}

module.exports = {
  ADDRESS_FIELDS,
  addressFromRow,
  preferredDisplay,
  compareDisplay
}

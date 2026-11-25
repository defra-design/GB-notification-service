// UK postcode rules shared by the postcode address build and the lookup page.
// A full postcode is an outward code (area, district, optional sub-district)
// followed by a three-character inward code: "BB4 4AA" is outward BB4, inward 4AA.

const FULL_POSTCODE = /^(?:[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}|GIR0AA)$/
const OUTWARD_CODE = /^(?:[A-Z]{1,2}[0-9][A-Z0-9]?|GIR)$/

function normalisePostcode (value) {
  return String(value == null ? '' : value).replace(/\s+/g, '').toUpperCase()
}

function isFullPostcode (normalised) {
  return FULL_POSTCODE.test(normalised)
}

function outwardCode (normalised) {
  return normalised.slice(0, -3)
}

function isOutwardCode (value) {
  return OUTWARD_CODE.test(value)
}

function formatPostcode (normalised) {
  return `${outwardCode(normalised)} ${normalised.slice(-3)}`
}

module.exports = {
  normalisePostcode,
  isFullPostcode,
  outwardCode,
  isOutwardCode,
  formatPostcode
}

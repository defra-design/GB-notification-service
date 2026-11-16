const generatedCommodities = require('./generated/commodities-germinal.json')

const germinalCertificationPurposeOptions = [
  'Breeding and/or production',
  'Approved bodies',
  'Other'
]

function germinalCommodity (entry) {
  return {
    isGerminalProduct: true,
    identifiers: [],
    certificationPurposeOptions: germinalCertificationPurposeOptions,
    packagingFields: [],
    ...entry
  }
}

module.exports = generatedCommodities.map(germinalCommodity).sort((a, b) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
)

const generatedCommodities = require('./generated/commodities-live.json')
const curatedFieldsById = require('./commodity-curated')

function withCuratedFields ({ species, ...commodity }) {
  return {
    ...commodity,
    ...(curatedFieldsById[commodity.id] || {}),
    species
  }
}

module.exports = generatedCommodities.map(withCuratedFields).sort((a, b) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
)

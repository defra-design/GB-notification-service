function getSpeciesSortLabel (commodity, species) {
  if (species.commonName) {
    return `${species.commonName} (${species.label})`
  }

  return `${commodity.name} (${species.label})`
}

function getCommoditySearchData (commodities) {
  return commodities
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
    .map((commodity) => ({
      id: commodity.id,
      name: commodity.name,
      code: commodity.code,
      species: (commodity.species || [])
        .slice()
        .sort((a, b) =>
          getSpeciesSortLabel(commodity, a).localeCompare(
            getSpeciesSortLabel(commodity, b),
            'en',
            { sensitivity: 'base' }
          )
        )
        .map((species) => ({
          id: species.id,
          label: species.label,
          ...(species.commonName ? { commonName: species.commonName } : {})
        }))
    }))
}

module.exports = {
  getCommoditySearchData
}

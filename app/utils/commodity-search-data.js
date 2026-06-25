function getCommoditySearchData (commodities) {
  return commodities.map((commodity) => ({
    id: commodity.id,
    name: commodity.name,
    code: commodity.code,
    species: (commodity.species || []).map((species) => ({
      id: species.id,
      label: species.label,
      ...(species.commonName ? { commonName: species.commonName } : {})
    }))
  }))
}

module.exports = {
  getCommoditySearchData
}

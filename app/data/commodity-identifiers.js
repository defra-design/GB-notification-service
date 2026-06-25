// Animal identifier fields by CN commodity code

const commodityIdentifiersByCode = {
  '01061900': [
    { id: 'microchip', label: 'Microchip' },
    { id: 'passport', label: 'Passport' },
    { id: 'tattoo', label: 'Tattoo' }
  ],
  '0102': [
    { id: 'ear-tag', label: 'Ear tag' },
    { id: 'passport', label: 'Passport' }
  ],
  '0101': [
    { id: 'microchip', label: 'Microchip' },
    { id: 'passport', label: 'Passport' },
    { id: 'horse-name', label: 'Horse name' }
  ],
  '0103': [
    { id: 'ear-tag', label: 'Ear tag' }
  ]
}

function getIdentifiersForCommodityCode (commodityCode) {
  const identifiers = commodityIdentifiersByCode[commodityCode]

  if (!identifiers) {
    return []
  }

  return identifiers.map((field) => ({ ...field }))
}

module.exports = {
  commodityIdentifiersByCode,
  getIdentifiersForCommodityCode
}

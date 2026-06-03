const importReasonDefinitions = {
  breeding: {
    value: 'Breeding',
    text: 'Breeding'
  },
  fattening: {
    value: 'Fattening',
    text: 'Fattening'
  },
  production: {
    value: 'Production',
    text: 'Production'
  },
  'rejected-or-returned': {
    value: 'Rejected or Returned consignment',
    text: 'Rejected or Returned consignment'
  },
  slaughter: {
    value: 'Slaughter',
    text: 'Slaughter'
  },
  transit: {
    value: 'Transit',
    text: 'Transit'
  },
  'internal-market': {
    value: 'Internal market',
    text: 'Internal market'
  },
  'racing-competition': {
    value: 'Racing/Competition',
    text: 'Racing/Competition'
  },
  'registered-equidae': {
    value: 'Registered equidae',
    text: 'Registered equidae'
  },
  other: {
    value: 'Other',
    text: 'Other'
  },
  're-entry': {
    value: 'Re-entry',
    text: 'Re-entry'
  },
  research: {
    value: 'Research',
    text: 'Research'
  },
  'pharmaceutical-use': {
    value: 'Pharmaceutical use',
    text: 'Pharmaceutical use'
  },
  'technical-use': {
    value: 'Technical use',
    text: 'Technical use'
  }
}

const cowPigReasonKeys = [
  'breeding',
  'fattening',
  'production',
  'rejected-or-returned',
  'slaughter',
  'transit'
]

const importReasonsByCommodityId = {
  cow: cowPigReasonKeys,
  pig: cowPigReasonKeys,
  dog: ['internal-market', 'transit'],
  horse: [
    'breeding',
    'racing-competition',
    'registered-equidae',
    'rejected-or-returned',
    'transit',
    'other'
  ],
  'embryos-horse': [
    'breeding',
    'production',
    're-entry',
    'research',
    'transit',
    'pharmaceutical-use',
    'technical-use',
    'other'
  ]
}

function getImportReasonsForCommodity (commodityId) {
  const reasonKeys = importReasonsByCommodityId[commodityId]

  if (!reasonKeys) {
    return []
  }

  return reasonKeys.map((key) => importReasonDefinitions[key]).filter(Boolean)
}

module.exports = {
  getImportReasonsForCommodity
}

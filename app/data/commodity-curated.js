const { getIdentifiersForCommodityCode } = require('./commodity-identifiers')

function numberOfPackagesFields () {
  return [
    { id: 'number-of-packages', label: 'Number of packages (when required)', type: 'number', hint: 'Such as crates, bags or boxes' }
  ]
}

function farmedPurposeOptions () {
  return [
    'Approved bodies',
    'Breeding and/or production',
    'Slaughter'
  ]
}

function earTagIdentifiers () {
  return [
    { id: 'ear-tag', label: 'Ear tag' }
  ]
}

function companionMammalFields ({ requiresPermanentAddress }) {
  return {
    ...(requiresPermanentAddress ? { requiresPermanentAddress: true } : {}),
    identifiers: getIdentifiersForCommodityCode('01061900'),
    certificationPurposeOptions: [
      'Approved bodies',
      'Breeding and/or production',
      'Circus/exhibition',
      'Pets',
      'Other'
    ],
    packagingFields: numberOfPackagesFields()
  }
}

module.exports = {
  cattle: {
    identifiers: getIdentifiersForCommodityCode('0102'),
    certificationPurposeOptions: farmedPurposeOptions(),
    unweanedOptions: ['Yes', 'No'],
    packagingFields: numberOfPackagesFields()
  },
  horse: {
    identifiers: getIdentifiersForCommodityCode('0101'),
    certificationPurposeOptions: [
      'Breeding',
      'Racing/Competition',
      'Registered equidae',
      'Rejected or Returned consignment',
      'Transit',
      'Other'
    ],
    packagingFields: numberOfPackagesFields()
  },
  pig: {
    identifiers: getIdentifiersForCommodityCode('0103'),
    certificationPurposeOptions: farmedPurposeOptions(),
    unweanedOptions: ['Yes', 'No'],
    packagingFields: numberOfPackagesFields()
  },
  sheep: {
    identifiers: earTagIdentifiers(),
    certificationPurposeOptions: farmedPurposeOptions(),
    packagingFields: numberOfPackagesFields()
  },
  goat: {
    identifiers: earTagIdentifiers(),
    certificationPurposeOptions: farmedPurposeOptions(),
    packagingFields: numberOfPackagesFields()
  },
  cat: companionMammalFields({ requiresPermanentAddress: true }),
  dog: companionMammalFields({ requiresPermanentAddress: true }),
  ferret: companionMammalFields({ requiresPermanentAddress: true }),
  'other-live-mammals': companionMammalFields({ requiresPermanentAddress: false })
}

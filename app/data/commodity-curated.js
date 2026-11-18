// Animal identifier fields live in commodity-identifiers.js.

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

function companionMammalFields ({ requiresPermanentAddress }) {
  return {
    ...(requiresPermanentAddress ? { requiresPermanentAddress: true } : {}),
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
    certificationPurposeOptions: farmedPurposeOptions(),
    unweanedOptions: ['Yes', 'No'],
    packagingFields: numberOfPackagesFields()
  },
  horse: {
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
    certificationPurposeOptions: farmedPurposeOptions(),
    unweanedOptions: ['Yes', 'No'],
    packagingFields: numberOfPackagesFields()
  },
  sheep: {
    certificationPurposeOptions: farmedPurposeOptions(),
    packagingFields: numberOfPackagesFields()
  },
  goat: {
    certificationPurposeOptions: farmedPurposeOptions(),
    packagingFields: numberOfPackagesFields()
  },
  cat: companionMammalFields({ requiresPermanentAddress: true }),
  dog: companionMammalFields({ requiresPermanentAddress: true }),
  ferret: companionMammalFields({ requiresPermanentAddress: true }),
  'other-live-mammals': companionMammalFields({ requiresPermanentAddress: false })
}

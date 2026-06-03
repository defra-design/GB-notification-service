module.exports = [
  {
    id: 'cow',
    name: 'Cow',
    code: '0102',
    identifiers: [
      { id: 'ear-tag', label: 'Ear tag' },
      { id: 'passport', label: 'Passport' }
    ],
    certificationPurposeOptions: [
      'Approved bodies',
      'Breeding and/or production',
      'Slaughter',
    ],
    unweanedOptions: [
      'Yes',
      'No'
    ],
    species: [
      { id: 'cow-bison-bison', label: 'Bison Bison' },
      { id: 'cow-bos-spp', label: 'Bos spp.' },
      { id: 'cow-bos-taurus', label: 'Bos taurus' },
      { id: 'cow-bubalus-bubalis', label: 'Bubalus bubalis' }
    ]
  },
  {
    id: 'dog',
    name: 'Dog',
    code: '01061900',
    identifiers: [
      { id: 'microchip', label: 'Microchip' },
      { id: 'passport', label: 'Passport' },
      { id: 'tattoo', label: 'Tattoo' }
    ],
    certificationPurposeOptions: [
      'Approved bodies',
      'Breeding and/or production',
      'Circus/exhibition',
      'Pets',
      'Other'
    ],
    packagingFields: [
      { id: 'number-of-packages', label: 'Number of packages', type: 'number', hint: 'Such as crates, bags or boxes' }
    ],
    species: [
      { id: 'dog-canis-familiaris', label: 'Canis familiaris' }
    ]
  },
  {
    id: 'pig',
    name: 'Pig',
    code: '0103',
    identifiers: [
      { id: 'ear-tag', label: 'Ear tag' }
    ],
    certificationPurposeOptions: [
      'Approved bodies',
      'Breeding and/or production',
      'Slaughter',
    ],
    unweanedOptions: [
      'Yes',
      'No'
    ],
    species: [
      { id: 'pig-sus-scrofa', label: 'Sus scrofa domesticus' }
    ]
  },
  {
    id: 'horse',
    name: 'Horse',
    code: '0101',
    identifiers: [
      { id: 'microchip', label: 'Microchip' },
      { id: 'passport', label: 'Passport' }
    ],
    certificationPurposeOptions: [
      'Breeding',
      'Racing/Competition',
      'Registered equidae',
      'Rejected or Returned consignment',
      'Transit',
      'Other'
    ],
    species: [
      { id: 'horse-equus-caballus', label: 'Equus caballus (Horse)' },
      { id: 'horse-equus-asinus', label: 'Equus asinus (Donkey)' },
      { id: 'horse-equus-przewalskii', label: "Equus przewalskii (Przewalski's horse)" }
    ]
  },
  {
    id: 'embryos-horse',
    name: 'Embryos/Ova - Horse',
    code: '05119985',
    identifiers: [
      { id: 'donor-id', label: 'Donor ID' },
      { id: 'collection-date', label: 'Collection date' }
    ],
    temperatureOptions: [
      'Ambient',
      'Chilled',
      'Frozen'
    ],
    packagingFields: [
      {
        id: 'packaging-type',
        label: 'Package type',
        type: 'select',
        options: ['Tank', 'Vial', 'Tube']
      },
      { id: 'total-weight', label: 'Total weight', type: 'number', suffix: 'kg' }
    ],
    species: [
      { id: 'embryos-horse-equus', label: 'Embryos/Ova - Horse (Equus Cabalus)' }
    ]
  },
  {
    id: 'bees',
    name: 'Bees',
    code: '01064100',
    identifiers: [],
    species: [
      { id: 'bees-apis-mellifera', label: 'Apis mellifera' },
      { id: 'bees-bombus-canariensis', label: 'Bombus Canariensis' },
      { id: 'bees-bombus-spp', label: 'Bombus Spp' }
    ]
  }
]

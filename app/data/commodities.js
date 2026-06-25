// UK live animal commodities — CN codes based on Trade Tariff chapter 01 (live animals)
// and common species used in GB import notifications (IPAFFS / CHEDA).

const otherLiveMammalsSpecies = require('./commodities-01061900-species')
const cattleSpecies = require('./commodities-0102-species')
const horseSpecies = require('./commodities-0101-species')
const { getIdentifiersForCommodityCode } = require('./commodity-identifiers')

const commodities = [
  {
    id: 'cattle',
    name: 'Cattle',
    code: '0102',
    identifiers: getIdentifiersForCommodityCode('0102'),
    certificationPurposeOptions: [
      'Approved bodies',
      'Breeding and/or production',
      'Slaughter'
    ],
    unweanedOptions: ['Yes', 'No'],
    packagingFields: [
      { id: 'number-of-packages', label: 'Number of packages', type: 'number', hint: 'Such as crates, bags or boxes' }
    ],
    species: cattleSpecies
  },
  {
    id: 'horse',
    name: 'Horse',
    code: '0101',
    identifiers: getIdentifiersForCommodityCode('0101'),
    certificationPurposeOptions: [
      'Breeding',
      'Racing/Competition',
      'Registered equidae',
      'Rejected or Returned consignment',
      'Transit',
      'Other'
    ],
    packagingFields: [
      { id: 'number-of-packages', label: 'Number of packages', type: 'number', hint: 'Such as crates, bags or boxes' }
    ],
    species: horseSpecies
  },
  {
    id: 'pig',
    name: 'Pig',
    code: '0103',
    identifiers: getIdentifiersForCommodityCode('0103'),
    certificationPurposeOptions: [
      'Approved bodies',
      'Breeding and/or production',
      'Slaughter'
    ],
    unweanedOptions: ['Yes', 'No'],
    packagingFields: [
      { id: 'number-of-packages', label: 'Number of packages', type: 'number', hint: 'Such as crates, bags or boxes' }
    ],
    species: [
      { id: 'pig-sus-scrofa', label: 'Sus scrofa domesticus' }
    ]
  },
  {
    id: 'sheep',
    name: 'Sheep',
    code: '010410',
    identifiers: [
      { id: 'ear-tag', label: 'Ear tag' }
    ],
    certificationPurposeOptions: [
      'Approved bodies',
      'Breeding and/or production',
      'Slaughter'
    ],
    species: [
      { id: 'sheep-ovis-aries', label: 'Ovis aries' }
    ]
  },
  {
    id: 'goat',
    name: 'Goat',
    code: '010420',
    identifiers: [
      { id: 'ear-tag', label: 'Ear tag' }
    ],
    certificationPurposeOptions: [
      'Approved bodies',
      'Breeding and/or production',
      'Slaughter'
    ],
    species: [
      { id: 'goat-capra-hircus', label: 'Capra hircus' }
    ]
  },
  {
    id: 'chicken',
    name: 'Chicken',
    code: '010511',
    identifiers: [],
    species: [
      { id: 'chicken-gallus-domesticus', label: 'Gallus domesticus' }
    ]
  },
  {
    id: 'turkey',
    name: 'Turkey',
    code: '010512',
    identifiers: [],
    species: [
      { id: 'turkey-meleagris-gallopavo', label: 'Meleagris gallopavo' }
    ]
  },
  {
    id: 'duck',
    name: 'Duck',
    code: '010513',
    identifiers: [],
    species: [
      { id: 'duck-anas-platyrhynchos', label: 'Anas platyrhynchos domesticus' },
      { id: 'duck-cairina-moschata', label: 'Cairina moschata' }
    ]
  },
  {
    id: 'goose',
    name: 'Goose',
    code: '010514',
    identifiers: [],
    species: [
      { id: 'goose-anser-anser', label: 'Anser anser domesticus' }
    ]
  },
  {
    id: 'guinea-fowl',
    name: 'Guinea fowl',
    code: '010515',
    identifiers: [],
    species: [
      { id: 'guinea-fowl-numida-meleagris', label: 'Numida meleagris' }
    ]
  },
  {
    id: 'cat',
    name: 'Cat',
    code: '01061900',
    identifiers: getIdentifiersForCommodityCode('01061900'),
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
      { id: 'cat-felis-catus', label: 'Felis catus', commonName: 'Domestic cat' }
    ]
  },
  {
    id: 'dog',
    name: 'Dog',
    code: '01061900',
    identifiers: getIdentifiersForCommodityCode('01061900'),
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
      { id: 'dog-canis-familiaris', label: 'Canis familiaris', commonName: 'Domestic dog' }
    ]
  },
  {
    id: 'other-live-mammals',
    name: 'Other live mammals',
    code: '01061900',
    identifiers: getIdentifiersForCommodityCode('01061900'),
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
    species: otherLiveMammalsSpecies
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    code: '010614',
    identifiers: [],
    species: [
      { id: 'rabbit-oryctolagus-cuniculus', label: 'Oryctolagus cuniculus' }
    ]
  },
  {
    id: 'camel',
    name: 'Camel',
    code: '010613',
    identifiers: [],
    species: [
      { id: 'camel-dromedarius', label: 'Camelus dromedarius' },
      { id: 'camel-bactrianus', label: 'Camelus bactrianus' }
    ]
  },
  {
    id: 'ostrich',
    name: 'Ostrich',
    code: '010633',
    identifiers: [],
    species: [
      { id: 'ostrich-struthio-camelus', label: 'Struthio camelus' }
    ]
  },
  {
    id: 'parrot',
    name: 'Parrot',
    code: '010632',
    identifiers: [],
    species: [
      { id: 'parrot-psittaciformes', label: 'Psittaciformes' }
    ]
  },
  {
    id: 'reptile',
    name: 'Reptile',
    code: '010620',
    identifiers: [],
    species: [
      { id: 'reptile-serpentes', label: 'Serpentes' },
      { id: 'reptile-testudines', label: 'Testudines' }
    ]
  },
  {
    id: 'bees',
    name: 'Bees',
    code: '01064100',
    identifiers: [],
    species: [
      { id: 'bees-apis-mellifera', label: 'Apis mellifera' },
      { id: 'bees-bombus-spp', label: 'Bombus spp.' }
    ]
  },
  {
    id: 'ornamental-fish',
    name: 'Ornamental fish',
    code: '030111',
    identifiers: [],
    species: [
      { id: 'fish-cyprinidae', label: 'Cyprinidae' },
      { id: 'fish-poeciliidae', label: 'Poeciliidae' },
      { id: 'fish-cichlidae', label: 'Cichlidae' }
    ]
  }
]

module.exports = commodities.slice().sort((a, b) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
)

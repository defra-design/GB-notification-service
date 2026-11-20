// Testing 3 only: example templates for the templates section.
//
// Testing 3 used to start with no templates. These show the Testing 3
// identification fields, so they are kept out of dashboard-templates.js, which
// the other versions and the template tests share.
//
// The businesses and identifiers are made up.

const CREATED = '18 November 2026'

function sameAddressReview (review) {
  return {
    regionOfOriginCode: '',
    internalReferenceNumber: 'N/A',
    reasonForImport: 'Internal market',
    useSameAddressForParties: true,
    cphNumber: '00/000/0000',
    ...review
  }
}

module.exports = [
  {
    id: 'hollybrook-kennels',
    categoryLabel: 'Live animals',
    title: 'Hollybrook Kennels',
    commodityLabel: 'Dog',
    origin: 'Republic of Ireland',
    consignee: 'Hollybrook Kennels',
    consignor: 'Hollybrook Kennels',
    dateCreated: CREATED,
    review: sameAddressReview({
      countryOfOrigin: 'Republic of Ireland',
      commodityCode: '01061900',
      commonName: 'Dog',
      species: 'Canis familiaris',
      selectedSpecies: ['dog-canis-familiaris'],
      numberOfAnimals: '2',
      numberOfAnimalsBySpecies: {
        'dog-canis-familiaris': '2'
      },
      animalIdentifiers: {
        'dog-canis-familiaris': [
          { passport: 'IE-PP-0048213', microchip: '972000011223344' },
          { microchip: '972000011223351' }
        ]
      },
      purposeInTheMarket: 'Transfer of ownership - Sale/gift',
      certifiedFor: 'Further keeping',
      placeOfOrigin: {
        name: 'Hollybrook Kennels',
        lines: ['Hollybrook Lane', 'Naas', 'Co. Kildare', 'W91 X0X0', 'Republic of Ireland']
      }
    })
  },
  {
    id: 'meerveld-stables',
    categoryLabel: 'Live animals',
    title: 'Meerveld Stables',
    commodityLabel: 'Horse',
    origin: 'Netherlands',
    consignee: 'Meerveld Stables',
    consignor: 'Meerveld Stables',
    dateCreated: CREATED,
    review: sameAddressReview({
      countryOfOrigin: 'Netherlands',
      commodityCode: '0101',
      commonName: 'Horse',
      species: 'Equus cabalus, Equus asinus',
      selectedSpecies: ['horse-equus-caballus', 'horse-equus-asinus'],
      numberOfAnimals: '3',
      numberOfAnimalsBySpecies: {
        'horse-equus-caballus': '2',
        'horse-equus-asinus': '1'
      },
      numberOfPackagesBySpecies: {
        'horse-equus-caballus': '0',
        'horse-equus-asinus': '0'
      },
      animalIdentifiers: {
        'horse-equus-caballus': [
          { passport: '528003201900117', microchip: '528210004567801', 'horse-name': 'Meerveld Arrow' },
          { passport: '528003202000342', 'horse-name': 'Meerveld Juno' }
        ],
        'horse-equus-asinus': [
          { microchip: '528210004567955' }
        ]
      },
      purposeInTheMarket: 'Racing, competition, show or training',
      certifiedFor: 'Registered equine animal',
      placeOfOrigin: {
        name: 'Meerveld Stables',
        lines: ['Meerveldweg 14', 'Ermelo', '3851 XX', 'Netherlands']
      }
    })
  },
  {
    id: 'ashgrove-hatchery',
    categoryLabel: 'Live animals',
    title: 'Ashgrove Hatchery',
    commodityLabel: 'Poultry: day-old chicks',
    origin: 'Republic of Ireland',
    consignee: 'Ashgrove Hatchery',
    consignor: 'Ashgrove Hatchery',
    dateCreated: CREATED,
    review: sameAddressReview({
      countryOfOrigin: 'Republic of Ireland',
      commodityCode: '0105',
      commonName: 'Poultry: day-old chicks',
      species: 'Chicken, Turkey',
      selectedSpecies: ['poultry-day-old-chicks-chicken', 'poultry-day-old-chicks-turkey'],
      numberOfAnimals: '6200',
      numberOfAnimalsBySpecies: {
        'poultry-day-old-chicks-chicken': '5000',
        'poultry-day-old-chicks-turkey': '1200'
      },
      animalIdentifiers: {
        'poultry-day-old-chicks-chicken': [
          {
            'flock-id': 'IE-FL-20417',
            classification: 'Broilers',
            description: 'Day-old broiler chicks',
            'hatching-date': '17/11/2026'
          }
        ],
        'poultry-day-old-chicks-turkey': [
          {
            'flock-id': 'IE-FL-20422',
            classification: 'Parents',
            'hatching-date': '17/11/2026'
          }
        ]
      },
      purposeInTheMarket: 'Transfer of ownership - Sale/gift',
      certifiedFor: 'Further keeping',
      placeOfOrigin: {
        name: 'Ashgrove Hatchery',
        lines: ['Ashgrove Road', 'Monaghan', 'Co. Monaghan', 'H18 X0X0', 'Republic of Ireland']
      }
    })
  },
  {
    id: 'domaine-des-faisans',
    categoryLabel: 'Live animals',
    title: 'Domaine des Faisans',
    commodityLabel: 'Gamebirds: adult birds',
    origin: 'France',
    consignee: 'Domaine des Faisans',
    consignor: 'Domaine des Faisans',
    dateCreated: CREATED,
    review: sameAddressReview({
      countryOfOrigin: 'France',
      commodityCode: '01063980',
      commonName: 'Gamebirds: adult birds',
      species: 'Pheasant, Partridge',
      selectedSpecies: ['game-birds-adult-birds-pheasant', 'game-birds-adult-birds-partridge'],
      numberOfAnimals: '700',
      numberOfAnimalsBySpecies: {
        'game-birds-adult-birds-pheasant': '400',
        'game-birds-adult-birds-partridge': '300'
      },
      animalIdentifiers: {
        'game-birds-adult-birds-pheasant': [
          { 'flock-id': 'FR-GB-7731', classification: 'Farmed stocks', description: 'Adult ring-necked pheasants' }
        ],
        'game-birds-adult-birds-partridge': [
          { 'flock-id': 'FR-GB-7732', classification: 'Farmed stocks', description: 'Adult red-legged partridges' }
        ]
      },
      purposeInTheMarket: 'Transfer of ownership - Sale/gift',
      certifiedFor: 'Further keeping',
      placeOfOrigin: {
        name: 'Domaine des Faisans',
        lines: ['12 Route de la Forêt', 'Lamotte-Beuvron', '41600', 'France']
      }
    })
  },
  {
    id: 'lipa-apiary',
    categoryLabel: 'Live animals',
    title: 'Lipa Apiary',
    commodityLabel: 'Bees',
    origin: 'Slovenia',
    consignee: 'Lipa Apiary',
    consignor: 'Lipa Apiary',
    dateCreated: CREATED,
    review: sameAddressReview({
      countryOfOrigin: 'Slovenia',
      commodityCode: '01064100',
      commonName: 'Bees',
      species: 'Apis mellifera',
      selectedSpecies: ['bees-apis-mellifera'],
      numberOfAnimals: '40',
      numberOfAnimalsBySpecies: {
        'bees-apis-mellifera': '40'
      },
      animalIdentifiers: {
        'bees-apis-mellifera': [
          {
            classification: 'Honeybees or bumblebees queens with max. 20 attendants',
            description: 'Carniolan queens in travel cages',
            'identification-details': 'Cages numbered 1 to 40'
          }
        ]
      },
      purposeInTheMarket: 'Breeding',
      certifiedFor: 'Further keeping',
      placeOfOrigin: {
        name: 'Lipa Apiary',
        lines: ['Lipova ulica 8', 'Radovljica', '4240', 'Slovenia']
      }
    })
  }
]

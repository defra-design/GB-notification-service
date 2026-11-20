// Identification fields for live animal commodities in Design release 2.1, Testing 3 and Testing 4.
// The file is named for Testing 3, where they were first added.
//
// Source: the "applicable fields for the selected commodity" table that sits
// alongside the Live Animals and Germinals Data Dictionary (Animal Identifiers
// section). Each commodity gets up to four groups of fields:
//
//   identifier      text inputs. At least one must be entered.
//   classification  one selection from a list.
//   additional      free-text details.
//   date            date pickers.
//
// Where the table gives no identifier, Description is the field that must be
// entered instead.
//
// `perAnimal: true` asks for one set of details for every animal. Commodities
// identified as a flock or batch (a Flock ID, or no identifier at all) ask for
// one set of details per species.
//
// Commodities and species that are not listed here keep the fields from
// commodity-identifiers.js and commodity-curated.js.

const POULTRY_CLASSIFICATIONS = [
  'Broilers',
  'Grandparent',
  'Laying pullets',
  'Parents',
  'Pure line',
  'Others'
]

const GAME_BIRD_AND_EGG_CLASSIFICATIONS = [
  'Broilers',
  'Class A',
  'Class B',
  'Cross breed',
  'Farmed stock fertilized eggs',
  'Farmed stock unfertilized eggs',
  'Farmed stocks',
  'Farmed stocks gametes',
  'Fertilized eggs',
  'Gametes',
  'Grandparent',
  'Laying pullets',
  'Others',
  'Parents',
  'Pure breed',
  'Pure line',
  'Unfertilized eggs',
  'Wild stocks',
  'Wild stocks gamete'
]

const BEE_CLASSIFICATIONS = [
  'Honeybees or bumblebees queens with max. 20 attendants',
  'Honeybees or bumblebees with brood',
  'Other honeybees or bumblebees'
]

const DATE_HINT = 'For example, 27/03/2026'

// Identifiers
const passport = { id: 'passport', label: 'Passport', group: 'identifier' }
const microchip = { id: 'microchip', label: 'Microchip/transponder', group: 'identifier' }
const earTag = { id: 'ear-tag', label: 'Ear tag', group: 'identifier' }
const tattoo = { id: 'tattoo', label: 'Tattoo', group: 'identifier' }
const equineName = { id: 'horse-name', label: 'Equine name', group: 'identifier' }
const identificationNumber = { id: 'identification-number', label: 'Identification number', group: 'identifier' }
const flockId = { id: 'flock-id', label: 'Flock ID', group: 'identifier' }
const legRing = { id: 'leg-ring', label: 'Leg ring/band', group: 'identifier' }
const markClip = { id: 'mark-clip', label: 'Mark/clip', group: 'identifier' }
const uniqueCode = { id: 'unique-code', label: 'Unique code', group: 'identifier' }

// Classification
function classification (options) {
  return { id: 'classification', label: 'Classification', group: 'classification', type: 'select', options }
}

// The table lists these under Classification without a list of options, so
// they are free text for now.
const breedOrCategory = { id: 'breed-category', label: 'Breed/category', group: 'classification' }
const birdBreed = { id: 'bird-breed', label: 'Bird breed', group: 'classification' }

// Additional details
const description = { id: 'description', label: 'Description', group: 'additional' }
const identificationDetails = { id: 'identification-details', label: 'Identification details', group: 'additional' }
const eggMark = { id: 'egg-mark', label: 'Egg mark', group: 'additional' }
const identificationMark = { id: 'identification-mark', label: 'Identification mark', group: 'additional' }
const batchNumber = { id: 'batch-number', label: 'Batch number', group: 'additional' }

// Dates
const hatchingDate = { id: 'hatching-date', label: 'Hatching date', group: 'date', type: 'date', hint: DATE_HINT }
const collectionDate = { id: 'collection-date', label: 'Collection date', group: 'date', type: 'date', hint: DATE_HINT }
const productionDate = { id: 'production-date', label: 'Production date', group: 'date', type: 'date', hint: DATE_HINT }

// The commodity picker does not separate day-old chicks from adult birds, so
// poultry always offers the hatching date that only day-old chicks need.
const poultryHatchingDate = {
  ...hatchingDate,
  hint: `Day-old chicks only. ${DATE_HINT}`
}

const poultry = {
  perAnimal: false,
  fields: [flockId, classification(POULTRY_CLASSIFICATIONS), description, identificationDetails, poultryHatchingDate]
}

// Used where the search does separate day-old chicks from adult birds.
const poultryChicks = {
  perAnimal: false,
  fields: [flockId, classification(POULTRY_CLASSIFICATIONS), description, identificationDetails, hatchingDate]
}

const poultryAdults = {
  perAnimal: false,
  fields: [flockId, classification(POULTRY_CLASSIFICATIONS), description, identificationDetails]
}

const gameBirds = {
  perAnimal: false,
  fields: [flockId, classification(GAME_BIRD_AND_EGG_CLASSIFICATIONS), description, identificationDetails, hatchingDate]
}

const hatchingEggs = {
  perAnimal: false,
  fields: [
    classification(GAME_BIRD_AND_EGG_CLASSIFICATIONS),
    eggMark,
    identificationMark,
    description,
    batchNumber,
    collectionDate,
    productionDate,
    hatchingDate
  ]
}

const catOrDog = { perAnimal: true, fields: [passport, microchip, tattoo] }

// The default for a commodity or species the table gives no specific fields for.
const defaultIdentification = { perAnimal: false, fields: [description, identificationDetails] }

const byCommodityId = {
  // 0101 Horse. Donkey is set by species below.
  horse: { perAnimal: true, fields: [passport, microchip, equineName] },
  // 0102
  cattle: { perAnimal: true, fields: [passport, earTag, identificationNumber] },
  // 0103
  pig: { perAnimal: true, fields: [earTag, identificationNumber] },
  // 010410
  sheep: { perAnimal: true, fields: [earTag, identificationNumber] },
  // 010420
  goat: { perAnimal: true, fields: [microchip, earTag, identificationNumber] },
  // 0105 Poultry, day-old chicks and adult birds
  chicken: poultry,
  turkey: poultry,
  duck: poultry,
  goose: poultry,
  'guinea-fowl': poultry,
  // 01061410 and 01061490 Rabbits. Other rabbits are set by species below.
  rabbit: { perAnimal: true, fields: [microchip] },
  // 01061900
  cat: catOrDog,
  dog: catOrDog,
  // 01061900 Other live mammals share the cat and dog code, so they use the same identifiers
  'other-live-mammals': catOrDog,
  ferret: { perAnimal: true, fields: [passport, microchip, tattoo, description, identificationDetails] },
  // 01062000
  reptile: { perAnimal: false, fields: [breedOrCategory, description, identificationDetails] },
  // 01063100 Falcons, owls and other birds of prey
  'birds-of-prey': { perAnimal: true, fields: [microchip, legRing] },
  // 01063200
  parrot: { perAnimal: true, fields: [microchip, legRing, birdBreed, description, identificationDetails] },
  // 01063300 Ostriches and emus
  ostrich: {
    perAnimal: true,
    fields: [microchip, legRing, markClip, uniqueCode, classification(POULTRY_CLASSIFICATIONS), description, identificationDetails]
  },
  // 01063910
  pigeons: { perAnimal: false, fields: [classification(POULTRY_CLASSIFICATIONS), description, identificationDetails] },
  // 01063980 Other birds. Partridge, pheasant and gamebirds are set by species below.
  'other-birds': defaultIdentification,
  // Testing 3 commodities, see commodities-testing3.js
  // 01063980 Gamebirds, day-old chicks and adult birds
  'game-birds-day-old-chicks': gameBirds,
  'game-birds-adult-birds': gameBirds,
  // 0105 Poultry, day-old chicks and adult birds
  'poultry-day-old-chicks': poultryChicks,
  'poultry-adult-birds': poultryAdults,
  // 01064100
  bees: { perAnimal: false, fields: [classification(BEE_CLASSIFICATIONS), description, identificationDetails] },
  // 01064900
  'other-insects': defaultIdentification,
  // 04071100, 04071911 and 04071919 Hatching eggs
  'hatching-eggs-chicken': hatchingEggs,
  'hatching-eggs-turkey-goose': hatchingEggs,
  'hatching-eggs-other-poultry': hatchingEggs,
  // Not in the table, so these use the default fields
  camel: defaultIdentification,
  primates: defaultIdentification,
  'whales-dolphins-seals': defaultIdentification,
  'other-live-animals': defaultIdentification,
  'circus-animals': defaultIdentification,
  'hatching-eggs-other-birds': defaultIdentification
}

const bySpeciesId = {
  // 0101 Donkey
  'horse-equus-asinus': { perAnimal: true, fields: [passport, microchip] },
  // 01061490 Domestic rabbits, other
  'rabbit-other-lagomorpha': { perAnimal: true, fields: [microchip, description, identificationDetails] },
  // 01063980 Game birds: partridge
  'other-birds-alectoris-spp': gameBirds,
  'other-birds-amnoperdix-spp': gameBirds,
  'other-birds-dendrortyx-spp': gameBirds,
  'other-birds-margaroperdix-spp': gameBirds,
  'other-birds-melanoperdix-spp': gameBirds,
  'other-birds-perdix-spp': gameBirds,
  'other-birds-rhizothera-spp': gameBirds,
  // 01063980 Game birds: pheasant
  'other-birds-catreus-spp': gameBirds,
  'other-birds-chrysolohus-spp': gameBirds,
  'other-birds-lophura-spp': gameBirds,
  'other-birds-phasianus-spp': gameBirds,
  'other-birds-syrmaticus-spp': gameBirds,
  // 01063980 Game birds: the order that covers pheasants and partridges
  'other-birds-galliformes': gameBirds
}

// Marks the fields that count towards "at least one identifier". With no
// identifier in the set, Description is the field that must be entered.
function withRequiredFields (fields) {
  const hasIdentifier = fields.some((field) => field.group === 'identifier')

  return fields.map((field) => ({
    ...field,
    ...(field.options ? { options: field.options.slice() } : {}),
    countsAsIdentifier: hasIdentifier
      ? field.group === 'identifier'
      : field.id === 'description'
  }))
}

// Returns { perAnimal, fields } for a commodity and species, or null when the
// table does not cover them.
function getTesting3Identification (commodity, species) {
  const config = (species && bySpeciesId[species.id]) || (commodity && byCommodityId[commodity.id])

  if (!config) {
    return null
  }

  return {
    perAnimal: config.perAnimal,
    fields: withRequiredFields(config.fields)
  }
}

module.exports = {
  getTesting3Identification
}

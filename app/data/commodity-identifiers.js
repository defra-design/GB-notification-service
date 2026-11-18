// Animal identifier fields for each commodity, from the Live Animal Identifiers
// table and the Animal Identifiers section of the Live Animals & Germinals Data
// Dictionary. Every field is optional on its own: an animal needs at least one.
// A commodity not listed gets the default, Description and Identification details.

const MAX_TEXT_LENGTH = 58

function text (id, label) {
  return { id, label, type: 'text', maxLength: MAX_TEXT_LENGTH }
}

function date (id, label) {
  return { id, label, type: 'date', hint: 'For example, 27/03/2026' }
}

function select (id, label, options) {
  return { id, label, type: 'select', options }
}

const field = {
  passport: text('passport', 'Passport'),
  microchip: text('microchip', 'Microchip/Transponder'),
  equineName: text('horse-name', 'Equine name'),
  earTag: text('ear-tag', 'Ear tag'),
  identificationNumber: text('identification-number', 'Identification number'),
  flockId: text('flock-id', 'Flock ID'),
  tattoo: text('tattoo', 'Tattoo'),
  legRing: text('leg-ring', 'Leg ring/band'),
  markClip: text('mark-clip', 'Mark/Clip'),
  uniqueCode: text('unique-code', 'Unique code'),
  description: text('description', 'Description'),
  identificationDetails: text('identification-details', 'Identification details'),
  eggMark: text('egg-mark', 'Egg mark'),
  identificationMark: text('identification-mark', 'Identification mark'),
  batchNumber: text('batch-number', 'Batch number'),
  donorId: text('donor-id', 'Donor ID'),
  collectionDate: date('collection-date', 'Collection date'),
  productionDate: date('production-date', 'Production date'),
  hatchingDate: date('hatching-date', 'Hatching date')
}

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

function classification (options) {
  return select('classification', 'Classification', options)
}

const DEFAULT_IDENTIFIERS = [field.description, field.identificationDetails]

const poultry = [
  field.flockId,
  classification(POULTRY_CLASSIFICATIONS),
  field.description,
  field.identificationDetails,
  field.hatchingDate
]

const gameBird = [
  field.flockId,
  classification(GAME_BIRD_AND_EGG_CLASSIFICATIONS),
  field.description,
  field.identificationDetails,
  field.hatchingDate
]

const companionAnimal = [field.passport, field.microchip, field.tattoo]

const hatchingEggs = [
  classification(GAME_BIRD_AND_EGG_CLASSIFICATIONS),
  field.eggMark,
  field.identificationMark,
  field.description,
  field.batchNumber,
  field.collectionDate,
  field.productionDate,
  field.hatchingDate
]

// Semen, embryos and ova: every germinal commodity, whatever the animal.
const GERMINAL_IDENTIFIERS = [
  field.identificationNumber,
  field.donorId,
  field.identificationMark,
  field.collectionDate,
  field.productionDate
]

const identifiersByCommodityId = {
  horse: [field.passport, field.microchip, field.equineName],
  cattle: [field.passport, field.earTag, field.identificationNumber],
  pig: [field.earTag, field.identificationNumber],
  sheep: [field.earTag, field.identificationNumber],
  goat: [field.microchip, field.earTag, field.identificationNumber],
  chicken: poultry,
  turkey: poultry,
  duck: poultry,
  goose: poultry,
  'guinea-fowl': poultry,
  rabbit: [field.microchip, field.description, field.identificationDetails],
  cat: companionAnimal,
  dog: companionAnimal,
  ferret: [...companionAnimal, field.description, field.identificationDetails],
  // Confluence names a "Breed / Category" and a "Bird breed" classification
  // but lists no options, so these are free text until it does.
  reptile: [text('breed-category', 'Breed or category'), field.description, field.identificationDetails],
  'birds-of-prey': [field.microchip, field.legRing],
  parrot: [field.microchip, field.legRing, text('bird-breed', 'Bird breed'), field.description, field.identificationDetails],
  ostrich: [
    field.microchip,
    field.legRing,
    field.markClip,
    field.uniqueCode,
    classification(POULTRY_CLASSIFICATIONS),
    field.description,
    field.identificationDetails
  ],
  pigeons: [classification(POULTRY_CLASSIFICATIONS), field.description, field.identificationDetails],
  bees: [classification(BEE_CLASSIFICATIONS), field.description, field.identificationDetails],
  'hatching-eggs-chicken': hatchingEggs,
  'hatching-eggs-turkey-goose': hatchingEggs,
  'hatching-eggs-other-poultry': hatchingEggs,
  'hatching-eggs-other-birds': hatchingEggs
}

// Partridges and pheasants sit under "Other birds" but are game birds.
const GAME_BIRD_SPECIES_IDS = [
  'other-birds-alectoris-spp',
  'other-birds-amnoperdix-spp',
  'other-birds-anurophasis-spp',
  'other-birds-catreus-spp',
  'other-birds-chrysolohus-spp',
  'other-birds-dendrortyx-spp',
  'other-birds-lophura-spp',
  'other-birds-margaroperdix-spp',
  'other-birds-melanoperdix-spp',
  'other-birds-perdix-spp',
  'other-birds-phasianus-spp',
  'other-birds-rhizothera-spp',
  'other-birds-syrmaticus-spp'
]

// Species whose fields differ from the rest of their commodity.
const identifiersBySpeciesId = {
  'horse-equus-asinus': [field.passport, field.microchip],
  'rabbit-oryctolagus-cuniculus': [field.microchip],
  ...Object.fromEntries(GAME_BIRD_SPECIES_IDS.map((speciesId) => [speciesId, gameBird]))
}

function copyFields (fields) {
  return fields.map((item) => ({
    ...item,
    ...(item.options ? { options: [...item.options] } : {})
  }))
}

function getIdentifierFields ({ commodityId, speciesId, isGerminalProduct }) {
  if (isGerminalProduct) {
    return copyFields(GERMINAL_IDENTIFIERS)
  }

  const fields = identifiersBySpeciesId[speciesId] ||
    identifiersByCommodityId[commodityId] ||
    DEFAULT_IDENTIFIERS

  return copyFields(fields)
}

module.exports = {
  DEFAULT_IDENTIFIERS,
  GERMINAL_IDENTIFIERS,
  identifiersByCommodityId,
  identifiersBySpeciesId,
  getIdentifierFields
}

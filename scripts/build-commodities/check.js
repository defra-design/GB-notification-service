const fs = require('fs')
const path = require('path')
const { isDeepStrictEqual } = require('util')

const repoRoot = path.join(__dirname, '..', '..')
const baselinePath = path.join(__dirname, 'baseline', 'prototype-baseline.json')
const generatedDir = path.join(repoRoot, 'app/data/generated')

const FIXED_SPECIES_IDS = [
  'cattle-bison-bison',
  'cattle-bos-taurus',
  'horse-equus-caballus',
  'pig-sus-scrofa',
  'sheep-ovis-aries',
  'goat-capra-hircus',
  'cattle-semen-bos-taurus',
  'horse-embryos-ova-equus-cabalus',
  'chicken-gallus-domesticus',
  'cat-felis-catus'
]

const FIXED_COMMODITY_IDS = [
  'cattle',
  'sheep',
  'goat',
  'cattle-semen',
  'horse-embryos-ova',
  'other-live-mammals'
]

const SHARED_MATCH_KEY_SPECIES_IDS = new Set([
  'other-live-mammals-other-mammalia-lower',
  'other-live-mammals-other-mammalia-upper'
])

const COMMODITY_KEYS = new Set([
  'id', 'name', 'code', 'isGerminalProduct', 'species', 'searchTerms', 'tariffCodes', 'nameSource', 'tariffDescription'
])
const SPECIES_KEYS = new Set([
  'id', 'label', 'commonName', 'searchTerms', 'commonNameSource', 'labelSource'
])

const FROZEN_COMMODITY_FIELDS = new Set(['id', 'name', 'code', 'isGerminalProduct', 'species'])

function readJson (filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readCurrentLists () {
  const live = require(path.join(repoRoot, 'app/data/commodities'))
  const germinal = require(path.join(repoRoot, 'app/data/commodities-germinal-products'))

  return JSON.parse(JSON.stringify({ live, germinal }))
}

function matchKey (label) {
  const spellingFixes = [
    ['equus cabalus*asinus', 'equus caballus*asinus'],
    ['eq cabalus*asinus', 'equus caballus*asinus'],
    ['equus cabalus', 'equus caballus'],
    ['sus crofa', 'sus scrofa']
  ]
  let key = label.toLowerCase()

  for (const [from, to] of spellingFixes) {
    key = key.split(from).join(to)
  }

  return key
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ spp\./g, ' spp')
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function allCommodities (lists) {
  return [...lists.live, ...lists.germinal]
}

function checkBaselineList (listName, baselineList, currentList, failures) {
  const currentById = new Map(currentList.map((commodity) => [commodity.id, commodity]))

  for (const baselineCommodity of baselineList) {
    const current = currentById.get(baselineCommodity.id)

    if (!current) {
      failures.push(`${listName}: baseline commodity ${baselineCommodity.id} is missing`)
      continue
    }

    for (const field of ['name', 'code', 'isGerminalProduct']) {
      if (current[field] !== baselineCommodity[field]) {
        failures.push(`${listName}: ${baselineCommodity.id} ${field} is ${JSON.stringify(current[field])}, baseline ${JSON.stringify(baselineCommodity[field])}`)
      }
    }

    const curatedFields = new Set(
      [...Object.keys(baselineCommodity), ...Object.keys(current)]
        .filter((field) => !FROZEN_COMMODITY_FIELDS.has(field) && !COMMODITY_KEYS.has(field))
    )

    for (const field of curatedFields) {
      if (!isDeepStrictEqual(current[field], baselineCommodity[field])) {
        failures.push(`${listName}: ${baselineCommodity.id} curated field ${field} differs from the baseline`)
      }
    }

    checkBaselineSpecies(listName, baselineCommodity, current, failures)
  }
}

function checkBaselineSpecies (listName, baselineCommodity, current, failures) {
  baselineCommodity.species.forEach((baselineSpecies, index) => {
    const species = current.species[index]

    if (!species || species.id !== baselineSpecies.id) {
      failures.push(`${listName}: ${baselineCommodity.id} species ${index + 1} is ${species ? species.id : 'missing'}, baseline ${baselineSpecies.id}`)
      return
    }

    if (species.label !== baselineSpecies.label) {
      failures.push(`${listName}: species ${species.id} label is ${JSON.stringify(species.label)}, baseline ${JSON.stringify(baselineSpecies.label)}`)
    }

    if (species.commonName !== baselineSpecies.commonName) {
      failures.push(`${listName}: species ${species.id} commonName is ${JSON.stringify(species.commonName)}, baseline ${JSON.stringify(baselineSpecies.commonName)}`)
    }
  })
}

function readSourceText (relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function collectReferencedIds () {
  const referencePattern = /\b(selectedSpecies|speciesId|commodityId)\s*[:=]\s*(\[[^\]]*\]|'[^']*')/g
  const journeySpeciesPattern = /species:\s*\{[^}]*\bid:\s*'([^']+)'/g
  const speciesIds = new Set(FIXED_SPECIES_IDS)
  const commodityIds = new Set(FIXED_COMMODITY_IDS)
  const referenceFiles = [
    'app/data/dashboard-templates.js',
    'app/data/dashboard-notification-snapshots.js',
    'app/routes.js',
    'journey-demo/e2e/journey.js'
  ]

  for (const relativePath of referenceFiles) {
    const text = readSourceText(relativePath)

    for (const [, key, literal] of text.matchAll(referencePattern)) {
      const target = key === 'commodityId' ? commodityIds : speciesIds

      for (const [, id] of literal.matchAll(/'([^']+)'/g)) {
        target.add(id)
      }
    }

    for (const [, id] of text.matchAll(journeySpeciesPattern)) {
      speciesIds.add(id)
    }
  }

  return { speciesIds, commodityIds }
}

function collectCodeKeys () {
  const codeKeyPattern = /^\s*'(\d+)':\s*\[/gm
  const codes = new Set()

  for (const relativePath of ['app/data/commodity-identifiers.js', 'app/data/consignment-address-sections.js']) {
    for (const [, code] of readSourceText(relativePath).matchAll(codeKeyPattern)) {
      codes.add(code)
    }
  }

  return codes
}

function checkReferences (lists, failures) {
  const commodities = allCommodities(lists)
  const commodityIds = new Set(commodities.map((commodity) => commodity.id))
  const speciesIds = new Set(commodities.flatMap((commodity) => commodity.species.map((species) => species.id)))
  const codes = new Set(commodities.map((commodity) => commodity.code))
  const referenced = collectReferencedIds()

  for (const id of referenced.speciesIds) {
    if (!speciesIds.has(id)) {
      failures.push(`referenced species id ${id} does not resolve`)
    }
  }

  for (const id of referenced.commodityIds) {
    if (!commodityIds.has(id)) {
      failures.push(`referenced commodity id ${id} does not resolve`)
    }
  }

  for (const code of collectCodeKeys()) {
    if (!codes.has(code)) {
      failures.push(`code key ${code} matches no commodity`)
    }
  }

  return referenced
}

function checkUniqueIds (lists, failures) {
  const idPattern = /^[a-z0-9-]+$/
  const commodityIds = new Set()
  const speciesIds = new Set()

  for (const commodity of allCommodities(lists)) {
    if (!idPattern.test(commodity.id)) {
      failures.push(`commodity id ${JSON.stringify(commodity.id)} has characters outside a-z, 0-9 and -`)
    }

    if (commodityIds.has(commodity.id)) {
      failures.push(`commodity id ${commodity.id} is used twice`)
    }
    commodityIds.add(commodity.id)

    for (const species of commodity.species) {
      if (!idPattern.test(species.id)) {
        failures.push(`species id ${JSON.stringify(species.id)} has characters outside a-z, 0-9 and -`)
      }

      if (speciesIds.has(species.id)) {
        failures.push(`species id ${species.id} is used twice`)
      }
      speciesIds.add(species.id)
    }
  }
}

function checkSpeciesMatchKeys (commodity, failures) {
  const idsByKey = new Map()

  for (const species of commodity.species) {
    const key = matchKey(species.label)
    idsByKey.set(key, [...(idsByKey.get(key) || []), species.id])
  }

  for (const [key, ids] of idsByKey) {
    if (ids.length > 1 && !ids.every((id) => SHARED_MATCH_KEY_SPECIES_IDS.has(id))) {
      failures.push(`${commodity.id}: match key "${key}" is shared by ${ids.join(', ')}`)
    }
  }
}

function isFishCode (code) {
  return code.startsWith('03') || ['05119190', '0511911000'].includes(code)
}

function keepNonFishCommodities (lists) {
  return {
    live: lists.live.filter((commodity) => !isFishCode(commodity.code)),
    germinal: lists.germinal.filter((commodity) => !isFishCode(commodity.code))
  }
}

function checkCode (commodity, failures) {
  if (!/^(\d{4}|\d{6}|\d{8})$/.test(commodity.code)) {
    failures.push(`${commodity.id}: code ${commodity.code} is not 4, 6 or 8 digits`)
  }

  if (isFishCode(commodity.code)) {
    failures.push(`${commodity.id}: code ${commodity.code} is a fish code`)
  }
}

function textValues (commodity) {
  return [
    commodity.name,
    commodity.tariffDescription,
    ...(commodity.searchTerms || []),
    ...commodity.species.flatMap((species) => [species.label, species.commonName, ...(species.searchTerms || [])])
  ].filter((value) => typeof value === 'string')
}

function checkCommodityRules (lists, failures) {
  for (const [listName, list] of Object.entries(lists)) {
    for (const commodity of list) {
      if (!commodity.species.length) {
        failures.push(`${commodity.id}: has no species`)
      }

      const isGerminalList = listName === 'germinal'
      if (isGerminalList !== (commodity.isGerminalProduct === true)) {
        failures.push(`${commodity.id}: isGerminalProduct is ${commodity.isGerminalProduct} in the ${listName} list`)
      }

      checkCode(commodity, failures)
      checkSpeciesMatchKeys(commodity, failures)

      for (const value of textValues(commodity)) {
        if (/[&<>"]/.test(value)) {
          failures.push(`${commodity.id}: text ${JSON.stringify(value)} contains &, <, > or "`)
        }
      }
    }
  }
}

function checkNewSpecies (lists, baselineSpeciesIds, failures) {
  for (const commodity of allCommodities(lists)) {
    const commonNames = commodity.species.map((species) => species.commonName).filter(Boolean)

    for (const species of commodity.species.filter((item) => !baselineSpeciesIds.has(item.id))) {
      if (!species.commonName) {
        continue
      }

      if (!/^[\x20-\x7e]+$/.test(species.commonName)) {
        failures.push(`${species.id}: commonName ${JSON.stringify(species.commonName)} is not ASCII`)
      }

      if (species.commonName.toLowerCase() === species.label.toLowerCase()) {
        failures.push(`${species.id}: commonName repeats the Latin label`)
      }

      if (commonNames.filter((name) => name === species.commonName).length > 1) {
        failures.push(`${species.id}: commonName ${JSON.stringify(species.commonName)} is not unique in ${commodity.id}`)
      }

      if (!species.commonNameSource) {
        failures.push(`${species.id}: commonName has no commonNameSource`)
      }
    }
  }
}

function checkGeneratedKeys (failures) {
  if (!fs.existsSync(generatedDir)) {
    return
  }

  for (const fileName of fs.readdirSync(generatedDir).filter((name) => name.endsWith('.json'))) {
    for (const commodity of readJson(path.join(generatedDir, fileName))) {
      for (const key of Object.keys(commodity).filter((field) => !COMMODITY_KEYS.has(field))) {
        failures.push(`generated/${fileName}: commodity ${commodity.id} has key ${key}`)
      }

      for (const species of commodity.species || []) {
        for (const key of Object.keys(species).filter((field) => !SPECIES_KEYS.has(field))) {
          failures.push(`generated/${fileName}: species ${species.id} has key ${key}`)
        }
      }
    }
  }
}

function crossCommodityLatinNames (liveList) {
  const commodityNamesByKey = new Map()

  for (const commodity of liveList) {
    for (const species of commodity.species) {
      const key = matchKey(species.label)
      commodityNamesByKey.set(key, new Set([...(commodityNamesByKey.get(key) || []), commodity.name]))
    }
  }

  return [...commodityNamesByKey]
    .filter(([, names]) => names.size > 1)
    .map(([key, names]) => `${key}: ${[...names].join(', ')}`)
}

function checkSameAsBaseline (baseline, lists, failures) {
  for (const listName of ['live', 'germinal']) {
    const expected = baseline[listName]
    const actual = lists[listName]

    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      continue
    }

    const firstDifferentIndex = expected.findIndex((commodity, index) =>
      JSON.stringify(commodity) !== JSON.stringify(actual[index])
    )
    const differingPosition = firstDifferentIndex === -1 ? `extra commodity ${actual[expected.length].id}` : expected[firstDifferentIndex].id
    failures.push(`${listName}: differs from the baseline, first at ${differingPosition}`)
  }
}

function runChecks ({ sameAsBaseline }) {
  const baseline = keepNonFishCommodities(readJson(baselinePath))
  const lists = readCurrentLists()
  const baselineSpeciesIds = new Set(allCommodities(baseline).flatMap((commodity) => commodity.species.map((species) => species.id)))
  const failures = []

  if (sameAsBaseline) {
    checkSameAsBaseline(baseline, lists, failures)
  }

  checkBaselineList('live', baseline.live, lists.live, failures)
  checkBaselineList('germinal', baseline.germinal, lists.germinal, failures)
  const referenced = checkReferences(lists, failures)
  checkUniqueIds(lists, failures)
  checkCommodityRules(lists, failures)
  checkNewSpecies(lists, baselineSpeciesIds, failures)
  checkGeneratedKeys(failures)

  const speciesCount = (list) => list.reduce((total, commodity) => total + commodity.species.length, 0)
  console.log(`Live: ${lists.live.length} commodities, ${speciesCount(lists.live)} species`)
  console.log(`Germinal: ${lists.germinal.length} commodities, ${speciesCount(lists.germinal)} species`)
  console.log(`References resolved: ${referenced.speciesIds.size} species ids, ${referenced.commodityIds.size} commodity ids`)

  const sharedLatinNames = crossCommodityLatinNames(lists.live)
  console.log(`Latin names under more than one live commodity: ${sharedLatinNames.length}`)
  sharedLatinNames.forEach((line) => console.log(`  ${line}`))

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed:`)
    failures.forEach((failure) => console.error(`  ${failure}`))
    process.exitCode = 1
    return
  }

  console.log('\nAll commodity checks passed')
}

runChecks({ sameAsBaseline: process.argv.includes('--same-as-baseline') })

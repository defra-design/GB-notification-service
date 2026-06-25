//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const countryOptions = require('./data/countries')
const countryLabels = countryOptions.labels
const countryRegionPrefixes = require('./data/country-region-prefixes')
const commodities = require('./data/commodities')
const certificationPurposeOptions = require('./data/certification-purposes')
const importReasons = require('./data/import-reasons')
const internalMarketPurposes = require('./data/internal-market-purposes')
const ukAirports = require('./data/uk-airports')
const meansOfTransportOptions = require('./data/means-of-transport')
const contactAddresses = require('./data/contact-addresses')
const { getCommoditySearchData } = require('./utils/commodity-search-data')

const TRANSIT_MEANS_OF_TRANSPORT = ['Railway', 'Road Vehicle']
const MAX_TRANSIT_COUNTRIES = 12

const importReasonValues = importReasons.map((reason) => reason.value)
const internalMarketPurposeValues = internalMarketPurposes.map((purpose) => purpose.value)

const PROTOTYPE_NOTIFICATION_REFERENCE = 'GBN-AG-26-7K8M2P'

function getCommodityById (commodityId) {
  return commodities.find((commodity) => commodity.id === commodityId)
}

function getCommodityByCode (commodityCode) {
  return commodities.find((commodity) => commodity.code === commodityCode)
}

function getCountryRegionPrefix (countryName) {
  if (!countryName) {
    return ''
  }

  return countryRegionPrefixes[countryName] || ''
}

function getRegionOfOriginCodeSuffix (sessionData) {
  if (sessionData.regionOfOriginCodeSuffix) {
    return String(sessionData.regionOfOriginCodeSuffix).trim()
  }

  const code = sessionData.regionOfOriginCode

  if (!code || typeof code !== 'string') {
    return ''
  }

  const separatorIndex = code.indexOf('-')

  if (separatorIndex === -1) {
    return code.trim()
  }

  return code.slice(separatorIndex + 1).trim()
}

function ensurePrototypeNotificationReference (sessionData) {
  if (!sessionData.notificationReference) {
    sessionData.notificationReference = PROTOTYPE_NOTIFICATION_REFERENCE
  }
}

function hasOriginDetails (sessionData) {
  return Boolean(sessionData.countryOfOrigin)
}

function redirectIfNoOrigin (req, res) {
  if (!hasOriginDetails(req.session.data)) {
    res.redirect('/origin-of-the-import')
    return true
  }

  return false
}

function normalizeSelectedSpecies (value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  if (value && typeof value === 'object') {
    return Object.values(value).filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return []
    }

    try {
      const parsed = JSON.parse(trimmed)

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean)
      }

      if (typeof parsed === 'string' && parsed) {
        return [parsed]
      }
    } catch (error) {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean)
    }
  }

  return []
}

function parseCommoditySelections (rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue
  }

  if (rawValue && typeof rawValue === 'object') {
    return Object.values(rawValue).filter(Boolean)
  }

  try {
    const parsed = JSON.parse(rawValue || '[]')

    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function getInitialCommoditySelections (sessionData) {
  const selections = sessionData.commoditySelections

  if (Array.isArray(selections) && selections.length > 0) {
    return selections.map((selection) => {
      if (selection.type === 'species' && selection.speciesId) {
        return `species:${selection.speciesId}`
      }

      if (selection.commodityId) {
        return `commodity:${selection.commodityId}`
      }

      return null
    }).filter(Boolean)
  }

  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)

  if (speciesIds.length > 0) {
    return speciesIds.map((speciesId) => `species:${speciesId}`)
  }

  if (sessionData.commodityId) {
    return [`commodity:${sessionData.commodityId}`]
  }

  return []
}

function syncCommoditySession (sessionData, commodity) {
  sessionData.selectedSpecies = normalizeSelectedSpecies(sessionData.selectedSpecies)
  sessionData.commodityId = commodity.id
  sessionData.commodityCode = commodity.code
  sessionData.commodityName = commodity.name
}

function getSpeciesMatch (speciesId) {
  for (const commodity of commodities) {
    const species = commodity.species.find((item) => item.id === speciesId)

    if (species) {
      return { commodity, species }
    }
  }

  return null
}

function getSelectedCommoditySummary (sessionData) {
  const commodity = getCommodityById(sessionData.commodityId)

  if (!commodity) {
    return null
  }

  return {
    code: commodity.code,
    name: commodity.name,
    text: `${commodity.code} (${commodity.name})`
  }
}

function toTitleCaseLabel (value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function buildSpeciesSelectionRecords (speciesIds) {
  return speciesIds
    .map((speciesId) => {
      const match = getSpeciesMatch(speciesId)

      if (!match) {
        return null
      }

      return {
        type: 'species',
        commodityId: match.commodity.id,
        commodityCode: match.commodity.code,
        speciesId
      }
    })
    .filter(Boolean)
}

function removeSpeciesFromSession (sessionData, speciesId) {
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)
    .filter((id) => id !== speciesId)

  sessionData.selectedSpecies = speciesIds
  sessionData.commoditySelections = buildSpeciesSelectionRecords(speciesIds)

  if (sessionData.numberOfAnimals && sessionData.numberOfAnimals[speciesId] != null) {
    delete sessionData.numberOfAnimals[speciesId]
  }

  if (speciesIds.length === 0) {
    sessionData.commodityId = null
    sessionData.commodityCode = null
    sessionData.commodityName = null
    return
  }

  const commodity = getCommodityById(sessionData.commodityId)

  if (commodity) {
    syncCommoditySession(sessionData, commodity)
  }
}

function getConsignmentSpeciesEntries (sessionData) {
  const numberOfAnimals = sessionData.numberOfAnimals || {}

  return normalizeSelectedSpecies(sessionData.selectedSpecies)
    .map((speciesId) => {
      const match = getSpeciesMatch(speciesId)

      if (!match) {
        return null
      }

      const { species } = match
      const speciesLabel = species.commonName || species.label

      return {
        speciesId,
        heading: toTitleCaseLabel(speciesLabel),
        numberOfAnimals: numberOfAnimals[speciesId] != null ? String(numberOfAnimals[speciesId]) : ''
      }
    })
    .filter(Boolean)
}

function hasCommoditySelection (sessionData) {
  return Boolean(sessionData.commodityId) && normalizeSelectedSpecies(sessionData.selectedSpecies).length > 0
}

function redirectIfNoCommodity (req, res) {
  if (!hasCommoditySelection(req.session.data)) {
    res.redirect('/what-are-you-importing')
    return true
  }

  return false
}

function parseNumberOfAnimals (body, speciesIds) {
  const rawValues = body.numberOfAnimals && typeof body.numberOfAnimals === 'object'
    ? body.numberOfAnimals
    : {}
  const values = {}

  speciesIds.forEach((speciesId) => {
    const fieldName = `numberOfAnimals[${speciesId}]`
    const value = rawValues[speciesId] != null ? rawValues[speciesId] : body[fieldName]

    values[speciesId] = value != null ? String(value).trim() : ''
  })

  return values
}

function validateNumberOfAnimals (values, speciesIds) {
  const errors = {}
  const errorList = []

  speciesIds.forEach((speciesId) => {
    const value = values[speciesId]
    const errorId = `number-of-animals-${speciesId}`

    if (!value) {
      errors[`numberOfAnimals-${speciesId}`] = { text: 'Enter the number of animals' }
      errorList.push({
        text: 'Enter the number of animals',
        href: `#${errorId}`
      })
      return
    }

    if (!/^\d+$/.test(value) || Number(value) < 1) {
      errors[`numberOfAnimals-${speciesId}`] = { text: 'Enter a whole number greater than 0' }
      errorList.push({
        text: 'Enter a whole number greater than 0',
        href: `#${errorId}`
      })
    }
  })

  return { errors, errorList }
}

function buildRadioItems (options, selectedValue) {
  return options.map((option) => ({
    value: option,
    text: option,
    checked: selectedValue === option
  }))
}

function getContactAddressById (addressId) {
  return contactAddresses.find((address) => address.id === addressId)
}

function formatContactAddressForSession (address) {
  return [address.name, ...(address.addressLines || []), address.country].join('\n')
}

function hasContactAddress (sessionData) {
  return Boolean(
    sessionData.contactAddress &&
    sessionData.contactAddress.trim() &&
    getContactAddressById(sessionData.contactAddressId)
  )
}

function syncContactAddressSession (sessionData, address) {
  sessionData.contactAddress = formatContactAddressForSession(address)
  sessionData.contactAddressId = address.id
}

function clearContactAddressSession (sessionData) {
  sessionData.contactAddress = null
  sessionData.contactAddressId = null
}

function buildContactAddressItems (selectedId) {
  return contactAddresses.map((address) => ({
    value: address.id,
    text: address.name,
    hint: {
      text: address.addressLines.join(', ')
    },
    checked: selectedId === address.id
  }))
}

function validateContactAddress (addressId) {
  const errors = {}
  const errorList = []
  const address = getContactAddressById(addressId)

  if (!address) {
    errors.contactAddressId = { text: 'Select an address' }
    errorList.push({
      text: 'Select an address',
      href: `#contact-address-${contactAddresses[0].id}`
    })
  }

  return { errors, errorList, address }
}

function getUnweanedOptions (commodityId) {
  const commodity = getCommodityById(commodityId)

  return commodity && Array.isArray(commodity.unweanedOptions)
    ? commodity.unweanedOptions
    : []
}

function getAdditionalAnimalDetailsConfig (sessionData) {
  const unweanedOptions = getUnweanedOptions(sessionData.commodityId)

  return {
    showCertificationPurposeQuestion: true,
    showUnweanedQuestion: unweanedOptions.length > 0,
    certificationPurposeOptions,
    unweanedOptions
  }
}

function hasConsignmentDetails (sessionData) {
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)
  const numberOfAnimals = sessionData.numberOfAnimals || {}

  if (!speciesIds.length) {
    return false
  }

  return speciesIds.every((speciesId) => {
    const value = numberOfAnimals[speciesId]

    return value && /^\d+$/.test(String(value)) && Number(value) >= 1
  })
}

function redirectIfNoConsignmentDetails (req, res) {
  if (!hasConsignmentDetails(req.session.data)) {
    res.redirect('/consignment-details')
    return true
  }

  return false
}

function hasAdditionalAnimalDetailsComplete (sessionData) {
  const config = getAdditionalAnimalDetailsConfig(sessionData)

  if (config.showCertificationPurposeQuestion) {
    if (!certificationPurposeOptions.includes(sessionData.certificationPurpose)) {
      return false
    }
  }

  if (config.showUnweanedQuestion) {
    if (!config.unweanedOptions.includes(sessionData.unweanedAnimals)) {
      return false
    }
  }

  return config.showCertificationPurposeQuestion || config.showUnweanedQuestion
}

function redirectIfNoAdditionalAnimalDetails (req, res) {
  if (!hasAdditionalAnimalDetailsComplete(req.session.data)) {
    res.redirect('/additional-animal-details')
    return true
  }

  return false
}

function hasImportReasonComplete (sessionData) {
  if (!importReasonValues.includes(sessionData.importReason)) {
    return false
  }

  if (sessionData.importReason === 'Internal market') {
    return internalMarketPurposeValues.includes(sessionData.internalMarketPurpose)
  }

  return true
}

function redirectIfNoImportReason (req, res) {
  if (!hasImportReasonComplete(req.session.data)) {
    res.redirect('/reason-for-import')
    return true
  }

  return false
}

function getReasonForImportContinuePath (sessionData) {
  if (hasAnimalIdentifiersRequired(sessionData)) {
    return '/animal-identification-details'
  }

  return '/arrival-details'
}

function getAnimalIdentifiers (sessionData) {
  if (!sessionData.animalIdentifiers || typeof sessionData.animalIdentifiers !== 'object') {
    return {}
  }

  return sessionData.animalIdentifiers
}

function getIdentifierFieldsForSpecies (speciesId) {
  const match = getSpeciesMatch(speciesId)

  if (!match) {
    return []
  }

  return Array.isArray(match.commodity.identifiers) ? match.commodity.identifiers : []
}

function hasAnimalIdentifiersRequired (sessionData) {
  return normalizeSelectedSpecies(sessionData.selectedSpecies).some((speciesId) => {
    return getIdentifierFieldsForSpecies(speciesId).length > 0
  })
}

function isAnimalIdentifierEntryComplete (animal, fields) {
  return fields.every((field) => {
    const value = animal[field.id]

    return value != null && String(value).trim() !== ''
  })
}

function hasAnimalIdentifiersComplete (sessionData) {
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)
  const numberOfAnimals = sessionData.numberOfAnimals || {}
  const saved = getAnimalIdentifiers(sessionData)

  return speciesIds.every((speciesId) => {
    const fields = getIdentifierFieldsForSpecies(speciesId)
    const total = Number(numberOfAnimals[speciesId]) || 0

    if (fields.length === 0) {
      return true
    }

    if (!total) {
      return false
    }

    const speciesSaved = saved[speciesId] || []

    if (speciesSaved.length < total) {
      return false
    }

    return speciesSaved.every((animal) =>
      fields.every((field) => {
        const value = animal[field.id]

        return value != null && String(value).trim() !== ''
      })
    )
  })
}

function getSpeciesIdentificationState (sessionData, speciesId) {
  const match = getSpeciesMatch(speciesId)

  if (!match) {
    return null
  }

  const fields = getIdentifierFieldsForSpecies(speciesId)

  if (fields.length === 0) {
    return null
  }

  const numberOfAnimals = sessionData.numberOfAnimals || {}
  const total = Number(numberOfAnimals[speciesId]) || 0

  if (!total) {
    return null
  }

  const speciesLabel = toTitleCaseLabel(match.species.commonName || match.species.label)
  const saved = getAnimalIdentifiers(sessionData)
  const speciesSaved = saved[speciesId] || []
  let activeAnimal = null

  for (let index = 0; index < total; index++) {
    const animal = speciesSaved[index] || {}

    if (!isAnimalIdentifierEntryComplete(animal, fields)) {
      activeAnimal = {
        animalNumber: index + 1,
        identifierValues: animal,
        headingText: `Enter details for ${speciesLabel} ${index + 1} of ${total}`
      }
      break
    }
  }

  const panelContext = {
    speciesId,
    speciesLabel,
    identifierFields: fields
  }
  const savedAnimals = getSavedAnimalsForSpecies(sessionData, panelContext)
  const completeSavedAnimals = savedAnimals.filter((animal) => {
    return isAnimalIdentifierEntryComplete(speciesSaved[animal.index] || {}, fields)
  })

  return {
    speciesId,
    speciesLabel,
    identifierFields: fields,
    totalAnimals: total,
    isComplete: !activeAnimal,
    activeAnimal,
    savedAnimalsTable: buildSavedAnimalsTable(panelContext, completeSavedAnimals)
  }
}

function getRemainingAnimalIdentifierCount (sessionData) {
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)
  let remaining = 0

  speciesIds.forEach((speciesId) => {
    const fields = getIdentifierFieldsForSpecies(speciesId)

    if (fields.length === 0) {
      return
    }

    const total = Number((sessionData.numberOfAnimals || {})[speciesId]) || 0
    const speciesSaved = getAnimalIdentifiers(sessionData)[speciesId] || []

    for (let index = 0; index < total; index++) {
      if (!isAnimalIdentifierEntryComplete(speciesSaved[index] || {}, fields)) {
        remaining++
      }
    }
  })

  return remaining
}

function buildAnimalIdentificationSpeciesPanels (sessionData, locals = {}) {
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)
  const remainingAnimalCount = getRemainingAnimalIdentifierCount(sessionData)

  return speciesIds
    .map((speciesId) => {
      const panel = getSpeciesIdentificationState(sessionData, speciesId)

      if (!panel) {
        return null
      }

      if (locals.errorSpeciesId === speciesId && panel.activeAnimal && locals.identifierValues) {
        panel.activeAnimal = {
          ...panel.activeAnimal,
          identifierValues: locals.identifierValues
        }
      }

      if (panel.activeAnimal) {
        panel.saveButtonText = remainingAnimalCount === 1
          ? 'Save and finish'
          : 'Save and add another'
      }

      return panel
    })
    .filter(Boolean)
}

function validateAnimalIdentifiers (identifierFields, rawIdentifiers, speciesId = '') {
  const errors = {}
  const errorList = []
  const values = {}
  const errorPrefix = speciesId ? `${speciesId}-` : ''

  identifierFields.forEach((field) => {
    const value = rawIdentifiers && rawIdentifiers[field.id] != null
      ? String(rawIdentifiers[field.id]).trim()
      : ''

    values[field.id] = value

    if (!value) {
      const errorId = `identifier-${errorPrefix}${field.id}`

      errors[errorId] = { text: `Enter ${field.label.toLowerCase()}` }
      errorList.push({
        text: `Enter ${field.label.toLowerCase()}`,
        href: `#${errorId}`
      })
    }
  })

  return { errors, errorList, values }
}

function getSavedAnimalsForSpecies (sessionData, context) {
  const saved = getAnimalIdentifiers(sessionData)
  const animals = saved[context.speciesId] || []

  return animals.map((animal, index) => ({
    index,
    label: `${context.speciesLabel} ${index + 1}`,
    identifierValues: context.identifierFields.map((field) => ({
      id: field.id,
      value: animal[field.id] || ''
    }))
  }))
}

function buildSavedAnimalsTable (context, savedAnimals) {
  if (!savedAnimals.length) {
    return null
  }

  return {
    head: [
      { text: 'Animal' },
      ...context.identifierFields.map((field) => ({ text: field.label })),
      { text: '', format: 'numeric' }
    ],
    rows: savedAnimals.map((animal) => [
      { text: animal.label },
      ...animal.identifierValues.map((item) => ({ text: item.value })),
      {
        html: `<button type="submit" name="action" value="remove:${context.speciesId}:${animal.index}" class="govuk-link app-animal-identification-table__remove-button">Remove</button>`
      }
    ])
  }
}

function removeSavedAnimal (sessionData, speciesId, removeIndex) {
  if (!sessionData.animalIdentifiers || typeof sessionData.animalIdentifiers !== 'object') {
    return
  }

  const saved = sessionData.animalIdentifiers[speciesId]

  if (!Array.isArray(saved) || !Number.isInteger(removeIndex) || removeIndex < 0 || removeIndex >= saved.length) {
    return
  }

  saved.splice(removeIndex, 1)

  if (saved.length === 0) {
    delete sessionData.animalIdentifiers[speciesId]
  }
}

function getUkAirportDisplayOptions () {
  return ukAirports.map((airport) => `${airport.name} - ${airport.code}`)
}

function isValidPortOfEntry (portOfEntry) {
  const normalised = (portOfEntry || '').trim().toLowerCase()

  return getUkAirportDisplayOptions().some((option) => option.toLowerCase() === normalised)
}

function buildMeansOfTransportItems (selectedValue) {
  return [
    {
      value: '',
      text: 'Select one',
      selected: !selectedValue
    },
    ...meansOfTransportOptions.map((option) => ({
      value: option,
      text: option,
      selected: selectedValue === option
    }))
  ]
}

function hasArrivalDetailsComplete (sessionData) {
  const arrivalDateAtPort = parseArrivalDisplayDate(sessionData.arrivalDateAtPort)

  return Boolean(
    arrivalDateAtPort &&
    sessionData.portOfEntry &&
    sessionData.portOfEntry.trim() &&
    isValidPortOfEntry(sessionData.portOfEntry) &&
    sessionData.meansOfTransport &&
    meansOfTransportOptions.includes(sessionData.meansOfTransport) &&
    sessionData.transportIdentification &&
    sessionData.transportIdentification.trim() &&
    sessionData.transportDocumentReference &&
    sessionData.transportDocumentReference.trim()
  )
}

function saveArrivalDetailsToSession (sessionData, values) {
  sessionData.arrivalDateAtPort = values.arrivalDateAtPort || null
  sessionData.portOfEntry = values.portOfEntry || null
  sessionData.meansOfTransport = values.meansOfTransport || null
  sessionData.transportIdentification = values.transportIdentification || null
  sessionData.transportDocumentReference = values.transportDocumentReference || null

  if (!requiresTransitCountries(values)) {
    sessionData.transitCountries = null
  }
}

function requiresTransitCountries (sessionData) {
  const meansOfTransport = typeof sessionData === 'string'
    ? sessionData
    : sessionData.meansOfTransport

  return TRANSIT_MEANS_OF_TRANSPORT.includes(meansOfTransport)
}

function normalizeTransitCountries (value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch (error) {
      return []
    }
  }

  return []
}

function isValidTransitCountry (country) {
  return countryLabels.includes(country)
}

function hasTransitCountriesComplete (sessionData) {
  if (!requiresTransitCountries(sessionData)) {
    return true
  }

  const transitCountries = normalizeTransitCountries(sessionData.transitCountries)

  return transitCountries.length > 0 &&
    transitCountries.length <= MAX_TRANSIT_COUNTRIES &&
    transitCountries.every(isValidTransitCountry)
}

function saveTransitCountriesToSession (sessionData, countries) {
  sessionData.transitCountries = normalizeTransitCountries(countries)
}

function validateTransitCountries (countries) {
  const errors = {}
  const errorList = []
  const normalisedCountries = normalizeTransitCountries(countries)

  if (normalisedCountries.length === 0) {
    errors.transitCountries = { text: 'Select at least one country' }
    errorList.push({
      text: 'Select at least one country',
      href: '#transit-country-search'
    })
  } else if (normalisedCountries.length > MAX_TRANSIT_COUNTRIES) {
    errors.transitCountries = { text: 'Select a maximum of 12 countries' }
    errorList.push({
      text: 'Select a maximum of 12 countries',
      href: '#transit-country-search'
    })
  } else if (!normalisedCountries.every(isValidTransitCountry)) {
    errors.transitCountries = { text: 'Select countries from the search results' }
    errorList.push({
      text: 'Select countries from the search results',
      href: '#transit-country-search'
    })
  }

  return { errors, errorList, normalisedCountries }
}

function parseTransitCountriesBody (body) {
  return normalizeTransitCountries(body.transitCountries)
}

function renderTransitCountriesPage (req, res) {
  const sessionData = req.session.data
  const transitCountries = normalizeTransitCountries(sessionData.transitCountries)

  return res.render('transit-countries', {
    backLink: '/arrival-details',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    countriesJson: JSON.stringify(countryOptions),
    transitCountriesJson: JSON.stringify(transitCountries),
    data: sessionData
  })
}

function renderContactAddressPage (req, res, locals = {}) {
  const sessionData = req.session.data

  return res.render('contact-address-for-consignment', {
    backLink: '/notification-hub',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    contactAddressItems: buildContactAddressItems(sessionData.contactAddressId || ''),
    data: sessionData,
    ...locals
  })
}

function redirectIfNoArrivalDetails (req, res) {
  if (!hasArrivalDetailsComplete(req.session.data)) {
    res.redirect('/arrival-details')
    return true
  }

  return false
}

function redirectIfTransitCountriesNotRequired (req, res) {
  if (!requiresTransitCountries(req.session.data)) {
    res.redirect('/notification-hub')
    return true
  }

  return false
}

function getArrivalDetailsContinuePath (values) {
  if (requiresTransitCountries(values)) {
    return '/transit-countries'
  }

  return '/notification-hub'
}

function parseArrivalDisplayDate (value) {
  const trimmed = (value || '').trim()
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (!match) {
    return null
  }

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return trimmed
}

function validateArrivalDetails (values) {
  const errors = {}
  const errorList = []

  if (!values.arrivalDateAtPort) {
    errors.arrivalDateAtPort = { text: 'Enter the arrival date at port of entry' }
    errorList.push({
      text: 'Enter the arrival date at port of entry',
      href: '#arrival-date-at-port'
    })
  } else if (!parseArrivalDisplayDate(values.arrivalDateAtPort)) {
    errors.arrivalDateAtPort = { text: 'Enter the date in the format 27/3/2026' }
    errorList.push({
      text: 'Enter the date in the format 27/3/2026',
      href: '#arrival-date-at-port'
    })
  }

  if (!values.portOfEntry) {
    errors.portOfEntry = { text: 'Enter the port of entry' }
    errorList.push({
      text: 'Enter the port of entry',
      href: '#port-of-entry'
    })
  } else if (!isValidPortOfEntry(values.portOfEntry)) {
    errors.portOfEntry = { text: 'Select a port of entry from the search results' }
    errorList.push({
      text: 'Select a port of entry from the search results',
      href: '#port-of-entry'
    })
  }

  if (!values.meansOfTransport) {
    errors.meansOfTransport = { text: 'Select the means of transport' }
    errorList.push({
      text: 'Select the means of transport',
      href: '#means-of-transport'
    })
  } else if (!meansOfTransportOptions.includes(values.meansOfTransport)) {
    errors.meansOfTransport = { text: 'Select the means of transport' }
    errorList.push({
      text: 'Select the means of transport',
      href: '#means-of-transport'
    })
  }

  if (!values.transportIdentification) {
    errors.transportIdentification = { text: 'Enter the transport identification' }
    errorList.push({
      text: 'Enter the transport identification',
      href: '#transport-identification'
    })
  }

  if (!values.transportDocumentReference) {
    errors.transportDocumentReference = { text: 'Enter the transport document reference' }
    errorList.push({
      text: 'Enter the transport document reference',
      href: '#transport-document-reference'
    })
  }

  return { errors, errorList }
}

function parseArrivalDetailsBody (body) {
  return {
    arrivalDateAtPort: (body.arrivalDateAtPort || '').trim(),
    portOfEntry: (body.portOfEntry || '').trim(),
    meansOfTransport: (body.meansOfTransport || '').trim(),
    transportIdentification: (body.transportIdentification || '').trim(),
    transportDocumentReference: (body.transportDocumentReference || '').trim()
  }
}

function renderArrivalDetailsPage (req, res) {
  const sessionData = req.session.data

  return res.render('arrival-details', {
    backLink: '/notification-hub',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    ukAirportItemsJson: JSON.stringify(getUkAirportDisplayOptions()),
    meansOfTransportItems: buildMeansOfTransportItems(sessionData.meansOfTransport),
    data: sessionData
  })
}

function getTotalAnimalCount (sessionData) {
  const numberOfAnimals = sessionData.numberOfAnimals || {}
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)

  return speciesIds.reduce((total, speciesId) => {
    const value = Number(numberOfAnimals[speciesId])

    if (!Number.isFinite(value) || value < 1) {
      return total
    }

    return total + value
  }, 0)
}

function getNotificationHubViewModel (sessionData) {
  const statusComplete = { text: 'Complete', class: 'govuk-tag--green' }
  const statusTodo = { text: 'To do', class: 'govuk-tag--blue' }
  const totalAnimals = getTotalAnimalCount(sessionData)

  return {
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    animalCountDisplay: totalAnimals > 0 ? String(totalAnimals) : '0',
    packagesDisplay: 'N/A',
    sections: [
      {
        title: '1. About the consignment',
        items: [
          {
            text: 'Where is this consignment coming from?',
            href: '/origin-of-the-import',
            status: hasOriginDetails(sessionData) ? statusComplete : statusTodo
          },
          {
            text: 'Your commodities',
            href: '/what-are-you-importing',
            status: hasCommoditySelection(sessionData) ? statusComplete : statusTodo
          },
          {
            text: 'Consignment details',
            href: '/consignment-details',
            status: hasConsignmentDetails(sessionData) ? statusComplete : statusTodo
          },
          {
            text: 'Additional animal details',
            href: '/additional-animal-details',
            status: hasAdditionalAnimalDetailsComplete(sessionData) ? statusComplete : statusTodo
          },
          {
            text: 'Main reason for importing the animals',
            href: '/reason-for-import',
            status: hasImportReasonComplete(sessionData) ? statusComplete : statusTodo
          },
          ...(hasAnimalIdentifiersRequired(sessionData) ? [{
            text: 'Animal identifiers',
            href: '/animal-identification-details',
            status: hasAnimalIdentifiersComplete(sessionData) ? statusComplete : statusTodo
          }] : [])
        ]
      },
      {
        title: '2. Movement',
        items: [
          {
            text: 'Arrival details',
            href: '/arrival-details',
            status: hasArrivalDetailsComplete(sessionData) ? statusComplete : statusTodo
          },
          ...(requiresTransitCountries(sessionData) ? [{
            text: 'Transit countries',
            href: '/transit-countries',
            status: hasTransitCountriesComplete(sessionData) ? statusComplete : statusTodo
          }] : []),
          {
            text: 'Transport details',
            href: '#',
            status: statusTodo
          }
        ]
      },
      {
        title: '3. Addresses',
        items: [
          {
            text: 'Roles and addresses',
            href: '#',
            hint: 'Consignor or Exporter, Consignee, Importer and Place of Destination',
            status: statusTodo
          },
          {
            text: 'Contact address for this consignment',
            href: '/contact-address-for-consignment',
            status: hasContactAddress(sessionData) ? statusComplete : statusTodo
          }
        ]
      },
      {
        title: '4. Documents',
        items: [
          {
            text: 'Upload documents',
            href: '#',
            status: statusTodo
          }
        ]
      }
    ]
  }
}

function renderNotificationHubPage (req, res) {
  ensurePrototypeNotificationReference(req.session.data)

  return res.render('notification-hub', getNotificationHubViewModel(req.session.data))
}

function buildInternalMarketPurposeItems (selectedValue) {
  return internalMarketPurposes.map((purpose) => ({
    value: purpose.value,
    text: purpose.text,
    checked: selectedValue === purpose.value
  }))
}

function buildImportReasonItems (selectedValue, internalMarketConditionalHtml) {
  return importReasons.map((reason) => {
    const item = {
      value: reason.value,
      text: reason.text,
      hint: {
        text: reason.hint
      },
      checked: selectedValue === reason.value
    }

    if (reason.value === 'Internal market') {
      item.conditional = {
        html: internalMarketConditionalHtml
      }
    }

    return item
  })
}

function renderOriginPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const internalReference = sessionData.internalReference
  const displayReference = internalReference && internalReference.trim() ? internalReference.trim() : ''
  const countryOfOrigin = sessionData.countryOfOrigin

  return res.render('origin-of-the-import', {
    backLink: '/',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    countriesJson: JSON.stringify(countryOptions),
    countryPrefixesJson: JSON.stringify(countryRegionPrefixes),
    regionOfOriginCodePrefix: getCountryRegionPrefix(countryOfOrigin),
    regionOfOriginCodeSuffix: getRegionOfOriginCodeSuffix(sessionData),
    internalReference: displayReference,
    ...locals
  })
}

function renderWhatAreYouImportingPage (req, res, locals = {}) {
  const sessionData = req.session.data

  return res.render('what-are-you-importing', {
    backLink: '/origin-of-the-import',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    commoditiesSearchJson: JSON.stringify(getCommoditySearchData(commodities)),
    commoditySelectionsJson: JSON.stringify(getInitialCommoditySelections(sessionData)),
    ...locals
  })
}

function renderConsignmentDetailsPage (req, res, locals = {}) {
  const sessionData = req.session.data

  return res.render('consignment-details', {
    backLink: '/what-are-you-importing',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    selectedCommodity: getSelectedCommoditySummary(sessionData),
    speciesEntries: getConsignmentSpeciesEntries(sessionData),
    ...locals
  })
}

function renderAdditionalAnimalDetailsPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const config = getAdditionalAnimalDetailsConfig(sessionData)

  return res.render('additional-animal-details', {
    backLink: '/consignment-details',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    showCertificationPurposeQuestion: config.showCertificationPurposeQuestion,
    showUnweanedQuestion: config.showUnweanedQuestion,
    certificationPurposeItems: buildRadioItems(
      config.certificationPurposeOptions,
      sessionData.certificationPurpose
    ),
    unweanedItems: buildRadioItems(
      config.unweanedOptions,
      sessionData.unweanedAnimals
    ),
    ...locals
  })
}

function renderAnimalIdentificationDetailsPage (req, res, locals = {}) {
  const sessionData = req.session.data

  if (!hasAnimalIdentifiersRequired(sessionData)) {
    return res.redirect('/notification-hub')
  }

  const speciesPanels = buildAnimalIdentificationSpeciesPanels(sessionData, locals)

  return res.render('animal-identification-details', {
    backLink: '/notification-hub',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    reviewMode: speciesPanels.length > 0 && speciesPanels.every((panel) => panel.isComplete),
    speciesPanels,
    data: sessionData,
    ...locals
  })
}

function renderReasonForImportPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const selectedImportReason = Object.prototype.hasOwnProperty.call(locals, 'selectedImportReason')
    ? locals.selectedImportReason
    : sessionData.importReason
  const selectedInternalMarketPurpose = Object.prototype.hasOwnProperty.call(locals, 'selectedInternalMarketPurpose')
    ? locals.selectedInternalMarketPurpose
    : sessionData.internalMarketPurpose

  return res.app.render('partials/internal-market-purpose-radios', {
    data: sessionData,
    internalMarketPurposeItems: buildInternalMarketPurposeItems(selectedInternalMarketPurpose)
  }, (err, internalMarketConditionalHtml) => {
    if (err) {
      throw err
    }

    return res.render('reason-for-import', {
      backLink: '/additional-animal-details',
      notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
      importReasonItems: buildImportReasonItems(
        selectedImportReason,
        internalMarketConditionalHtml
      ),
      ...locals
    })
  })
}

router.get('/origin-of-the-import', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)
  return renderOriginPage(req, res)
})

router.post('/origin-of-the-import', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const countryOfOrigin = (req.body.countryOfOrigin || '').trim()
  const regionOfOriginRequired = (req.body.regionOfOriginRequired || '').trim()
  const regionOfOriginCodeSuffix = (req.body.regionOfOriginCodeSuffix || '').trim().toUpperCase()
  const internalReference = (req.body.internalReference || '').trim()
  const errors = {}
  const errorList = []

  if (!countryOfOrigin || !countryLabels.includes(countryOfOrigin)) {
    errors.countryOfOrigin = { text: 'Select a country of origin' }
    errorList.push({ text: 'Select a country of origin', href: '#country-of-origin' })
  }

  if (regionOfOriginRequired !== 'Yes' && regionOfOriginRequired !== 'No') {
    errors.regionOfOriginRequired = { text: 'Select whether the consignment has a region of origin code' }
    errorList.push({
      text: 'Select whether the consignment has a region of origin code',
      href: '#region-of-origin'
    })
  }

  if (regionOfOriginRequired === 'Yes') {
    const countryPrefix = getCountryRegionPrefix(countryOfOrigin)

    if (!countryPrefix) {
      errors.countryOfOrigin = { text: 'Select a country of origin' }
      if (!errorList.some((error) => error.href === '#country-of-origin')) {
        errorList.push({ text: 'Select a country of origin', href: '#country-of-origin' })
      }
    } else if (!regionOfOriginCodeSuffix) {
      errors.regionOfOriginCodeSuffix = { text: 'Enter the region of origin code' }
      errorList.push({
        text: 'Enter the region of origin code',
        href: '#region-of-origin-code-suffix'
      })
    } else if (!/^[A-Z0-9]{1,5}$/.test(regionOfOriginCodeSuffix)) {
      errors.regionOfOriginCodeSuffix = { text: 'Enter up to 5 letters or numbers' }
      errorList.push({
        text: 'Enter up to 5 letters or numbers',
        href: '#region-of-origin-code-suffix'
      })
    }
  }

  if (errorList.length > 0) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors
    req.session.data.countryOfOrigin = countryOfOrigin
    req.session.data.regionOfOriginRequired = regionOfOriginRequired

    return renderOriginPage(req, res, {
      regionOfOriginCodePrefix: getCountryRegionPrefix(countryOfOrigin),
      regionOfOriginCodeSuffix,
      internalReference
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.countryOfOrigin = countryOfOrigin
  req.session.data.regionOfOriginRequired = regionOfOriginRequired
  req.session.data.internalReference = internalReference

  if (regionOfOriginRequired === 'Yes') {
    const countryPrefix = getCountryRegionPrefix(countryOfOrigin)
    req.session.data.regionOfOriginCodeSuffix = regionOfOriginCodeSuffix
    req.session.data.regionOfOriginCode = `${countryPrefix}-${regionOfOriginCodeSuffix}`
  } else {
    req.session.data.regionOfOriginCodeSuffix = null
    req.session.data.regionOfOriginCode = null
  }

  if (req.body.action === 'hub') {
    return res.redirect('/notification-hub')
  }

  return res.redirect('/what-are-you-importing')
})

router.get('/what-are-you-importing', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  return renderWhatAreYouImportingPage(req, res)
})

router.post('/what-are-you-importing', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  const commoditySelections = parseCommoditySelections(req.body.commoditySelections)
  const commodityId = req.body.commodityId
  const commodityCode = req.body.commodityCode
  const selectedSpecies = normalizeSelectedSpecies(req.body.selectedSpecies)
  const commoditySearch = (req.body.commoditySearch || '').trim()

  if (req.body.action === 'hub') {
    req.session.data.commoditySearch = commoditySearch
    req.session.data.commoditySelections = commoditySelections
    req.session.data.selectedSpecies = selectedSpecies

    const commodity = getCommodityById(commodityId) || getCommodityByCode(commodityCode)

    if (commodity) {
      syncCommoditySession(req.session.data, commodity)
    }

    return res.redirect('/notification-hub')
  }

  if (!commoditySelections.length) {
    req.session.data.errorList = [
      {
        text: 'Select at least one commodity or species',
        href: '#commodity-search'
      }
    ]
    req.session.data.errors = {
      commoditySearch: {
        text: 'Select at least one commodity or species'
      }
    }
    req.session.data.commoditySearch = commoditySearch

    return renderWhatAreYouImportingPage(req, res)
  }

  const commodity = getCommodityById(commodityId) || getCommodityByCode(commodityCode)

  if (!commodity) {
    req.session.data.errorList = [
      {
        text: 'Select at least one commodity or species',
        href: '#commodity-search'
      }
    ]
    req.session.data.errors = {
      commoditySearch: {
        text: 'Select at least one commodity or species'
      }
    }
    req.session.data.commoditySearch = commoditySearch
    req.session.data.commoditySelections = commoditySelections

    return renderWhatAreYouImportingPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.commoditySearch = commoditySearch
  req.session.data.commoditySelections = commoditySelections
  req.session.data.selectedSpecies = selectedSpecies
  syncCommoditySession(req.session.data, commodity)

  return res.redirect('/consignment-details')
})

router.get('/consignment-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  return renderConsignmentDetailsPage(req, res)
})

router.post('/consignment-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  const removeSpeciesId = (req.body.removeSpecies || '').trim()

  if (removeSpeciesId) {
    removeSpeciesFromSession(req.session.data, removeSpeciesId)
    req.session.data.errorList = null
    req.session.data.errors = null

    if (!hasCommoditySelection(req.session.data)) {
      return res.redirect('/what-are-you-importing')
    }

    return res.redirect('/consignment-details')
  }

  const speciesIds = normalizeSelectedSpecies(req.session.data.selectedSpecies)
  const numberOfAnimals = parseNumberOfAnimals(req.body, speciesIds)

  if (req.body.action === 'hub') {
    req.session.data.numberOfAnimals = numberOfAnimals
    return res.redirect('/notification-hub')
  }

  const { errors, errorList } = validateNumberOfAnimals(numberOfAnimals, speciesIds)

  if (errorList.length > 0) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors
    req.session.data.numberOfAnimals = numberOfAnimals

    return renderConsignmentDetailsPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.numberOfAnimals = numberOfAnimals

  return res.redirect('/additional-animal-details')
})

router.get('/additional-animal-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (redirectIfNoConsignmentDetails(req, res)) {
    return
  }

  return renderAdditionalAnimalDetailsPage(req, res)
})

router.post('/additional-animal-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (redirectIfNoConsignmentDetails(req, res)) {
    return
  }

  const config = getAdditionalAnimalDetailsConfig(req.session.data)
  const certificationPurpose = (req.body.certificationPurpose || '').trim()
  const unweanedAnimals = (req.body.unweanedAnimals || '').trim()

  if (req.body.action === 'hub') {
    if (config.showCertificationPurposeQuestion && certificationPurposeOptions.includes(certificationPurpose)) {
      req.session.data.certificationPurpose = certificationPurpose
    }

    if (config.showUnweanedQuestion && config.unweanedOptions.includes(unweanedAnimals)) {
      req.session.data.unweanedAnimals = unweanedAnimals
    }

    return res.redirect('/notification-hub')
  }

  const errors = {}
  const errorList = []

  if (config.showCertificationPurposeQuestion && !certificationPurposeOptions.includes(certificationPurpose)) {
    errors.certificationPurpose = { text: 'Select what the animals are certified for' }
    errorList.push({
      text: 'Select what the animals are certified for',
      href: '#certification-purpose'
    })
  }

  if (config.showUnweanedQuestion && !config.unweanedOptions.includes(unweanedAnimals)) {
    errors.unweanedAnimals = { text: 'Select whether the consignment contains any unweaned animals' }
    errorList.push({
      text: 'Select whether the consignment contains any unweaned animals',
      href: '#unweaned-animals'
    })
  }

  if (errorList.length > 0) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors
    req.session.data.certificationPurpose = certificationPurpose || null
    req.session.data.unweanedAnimals = unweanedAnimals || null

    return renderAdditionalAnimalDetailsPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.certificationPurpose = config.showCertificationPurposeQuestion ? certificationPurpose : null
  req.session.data.unweanedAnimals = config.showUnweanedQuestion ? unweanedAnimals : null

  return res.redirect('/reason-for-import')
})

router.get('/reason-for-import', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (redirectIfNoConsignmentDetails(req, res)) {
    return
  }

  if (redirectIfNoAdditionalAnimalDetails(req, res)) {
    return
  }

  return renderReasonForImportPage(req, res, {
    selectedImportReason: null,
    selectedInternalMarketPurpose: null
  })
})

router.get('/notification-hub', (req, res) => {
  return renderNotificationHubPage(req, res)
})

router.post('/reason-for-import', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (redirectIfNoConsignmentDetails(req, res)) {
    return
  }

  if (redirectIfNoAdditionalAnimalDetails(req, res)) {
    return
  }

  const importReason = (req.body.importReason || '').trim()
  const internalMarketPurpose = (req.body.internalMarketPurpose || '').trim()

  if (req.body.action === 'hub') {
    if (importReasonValues.includes(importReason)) {
      req.session.data.importReason = importReason

      if (importReason === 'Internal market' && internalMarketPurposeValues.includes(internalMarketPurpose)) {
        req.session.data.internalMarketPurpose = internalMarketPurpose
      } else if (importReason !== 'Internal market') {
        req.session.data.internalMarketPurpose = null
      }
    }

    return res.redirect('/notification-hub')
  }

  const errors = {}
  const errorList = []

  if (!importReasonValues.includes(importReason)) {
    errors.importReason = {
      text: 'Select the main reason for importing the animals'
    }
    errorList.push({
      text: 'Select the main reason for importing the animals',
      href: '#import-reason'
    })
  }

  if (importReason === 'Internal market' && !internalMarketPurposeValues.includes(internalMarketPurpose)) {
    errors.internalMarketPurpose = {
      text: 'Select the purpose in the internal market'
    }
    errorList.push({
      text: 'Select the purpose in the internal market',
      href: '#internal-market-purpose'
    })
  }

  if (errorList.length) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors
    req.session.data.importReason = importReason || null
    req.session.data.internalMarketPurpose = internalMarketPurpose || null

    return renderReasonForImportPage(req, res, {
      selectedImportReason: importReason || null,
      selectedInternalMarketPurpose: internalMarketPurpose || null
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.importReason = importReason
  req.session.data.internalMarketPurpose = importReason === 'Internal market'
    ? internalMarketPurpose
    : null

  return res.redirect(getReasonForImportContinuePath(req.session.data))
})

router.get('/animal-identification-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (redirectIfNoConsignmentDetails(req, res)) {
    return
  }

  if (redirectIfNoAdditionalAnimalDetails(req, res)) {
    return
  }

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  return renderAnimalIdentificationDetailsPage(req, res)
})

router.post('/animal-identification-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (redirectIfNoConsignmentDetails(req, res)) {
    return
  }

  if (redirectIfNoAdditionalAnimalDetails(req, res)) {
    return
  }

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  const action = (req.body.action || '').trim()

  if (action.startsWith('remove:')) {
    const separatorIndex = action.lastIndexOf(':')
    const removeIndex = Number(action.slice(separatorIndex + 1))
    const speciesId = action.slice('remove:'.length, separatorIndex)

    removeSavedAnimal(req.session.data, speciesId, removeIndex)
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect('/animal-identification-details')
  }

  if (action.startsWith('save:')) {
    const speciesId = action.slice('save:'.length)
    const panel = getSpeciesIdentificationState(req.session.data, speciesId)

    if (!panel || !panel.activeAnimal) {
      return res.redirect('/animal-identification-details')
    }

    const rawIdentifiers = req.body.identifiers &&
      typeof req.body.identifiers === 'object' &&
      req.body.identifiers[speciesId] &&
      typeof req.body.identifiers[speciesId] === 'object'
      ? req.body.identifiers[speciesId]
      : {}
    const { errors, errorList, values } = validateAnimalIdentifiers(
      panel.identifierFields,
      rawIdentifiers,
      speciesId
    )

    if (errorList.length) {
      req.session.data.errorList = errorList
      req.session.data.errors = errors

      return renderAnimalIdentificationDetailsPage(req, res, {
        errorSpeciesId: speciesId,
        identifierValues: values
      })
    }

    req.session.data.errorList = null
    req.session.data.errors = null

    if (!req.session.data.animalIdentifiers || typeof req.session.data.animalIdentifiers !== 'object') {
      req.session.data.animalIdentifiers = {}
    }

    if (!Array.isArray(req.session.data.animalIdentifiers[speciesId])) {
      req.session.data.animalIdentifiers[speciesId] = []
    }

    const saveIndex = panel.activeAnimal.animalNumber - 1
    const speciesSaved = req.session.data.animalIdentifiers[speciesId]

    if (speciesSaved.length === saveIndex) {
      speciesSaved.push(values)
    } else {
      speciesSaved[saveIndex] = values
    }

    return res.redirect('/animal-identification-details')
  }

  if (action === 'hub') {
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect('/notification-hub')
  }

  if (action === 'continue') {
    if (!hasAnimalIdentifiersComplete(req.session.data)) {
      req.session.data.errorList = [{
        text: 'Add identification details for all animals before continuing',
        href: '#animal-identification-panels'
      }]

      return renderAnimalIdentificationDetailsPage(req, res)
    }

    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect('/notification-hub')
  }

  return res.redirect('/animal-identification-details')
})

router.get('/arrival-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  return renderArrivalDetailsPage(req, res)
})

router.post('/arrival-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  const values = parseArrivalDetailsBody(req.body)
  const action = (req.body.action || '').trim()

  if (action === 'hub') {
    saveArrivalDetailsToSession(req.session.data, values)
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect('/notification-hub')
  }

  const { errors, errorList } = validateArrivalDetails(values)

  if (errorList.length) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors
    saveArrivalDetailsToSession(req.session.data, values)

    return renderArrivalDetailsPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  saveArrivalDetailsToSession(req.session.data, values)

  return res.redirect(getArrivalDetailsContinuePath(values))
})

router.get('/transit-countries', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  if (redirectIfNoArrivalDetails(req, res)) {
    return
  }

  if (redirectIfTransitCountriesNotRequired(req, res)) {
    return
  }

  return renderTransitCountriesPage(req, res)
})

router.post('/transit-countries', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  if (redirectIfNoArrivalDetails(req, res)) {
    return
  }

  if (redirectIfTransitCountriesNotRequired(req, res)) {
    return
  }

  const countries = parseTransitCountriesBody(req.body)
  const action = (req.body.action || '').trim()

  if (action === 'hub') {
    saveTransitCountriesToSession(req.session.data, countries)
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect('/notification-hub')
  }

  const { errors, errorList, normalisedCountries } = validateTransitCountries(countries)

  if (errorList.length) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors
    saveTransitCountriesToSession(req.session.data, normalisedCountries)

    return renderTransitCountriesPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  saveTransitCountriesToSession(req.session.data, normalisedCountries)

  return res.redirect('/notification-hub')
})

router.get('/contact-address-for-consignment', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  return renderContactAddressPage(req, res)
})

router.post('/contact-address-for-consignment', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const addressId = (req.body.contactAddressId || '').trim()
  const action = (req.body.action || '').trim()
  const address = getContactAddressById(addressId)

  if (action === 'hub') {
    if (address) {
      syncContactAddressSession(req.session.data, address)
    } else {
      clearContactAddressSession(req.session.data)
    }

    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect('/notification-hub')
  }

  const validation = validateContactAddress(addressId)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors
    clearContactAddressSession(req.session.data)

    return renderContactAddressPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  syncContactAddressSession(req.session.data, validation.address)

  return res.redirect('/notification-hub')
})

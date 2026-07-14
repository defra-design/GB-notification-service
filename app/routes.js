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
const { getIdentifiersForCommodityCode } = require('./data/commodity-identifiers')
const certificationPurposeOptions = require('./data/certification-purposes')
const importReasons = require('./data/import-reasons')
const internalMarketPurposes = require('./data/internal-market-purposes')
const ukAirports = require('./data/uk-airports')
const exitBorderControlPosts = require('./data/exit-border-control-posts')
const meansOfTransportOptions = require('./data/means-of-transport')
const contactAddresses = require('./data/contact-addresses')
const consignmentAddressSections = require('./data/consignment-address-sections')
const getActiveConsignmentAddressSections = consignmentAddressSections.getActiveConsignmentAddressSections
const getActiveConsignmentAddressSectionsForCommodityCodes = consignmentAddressSections.getActiveConsignmentAddressSectionsForCommodityCodes
const consignmentAddresses = require('./data/consignment-addresses')
const transporters = require('./data/transporters')
const transporterTypes = require('./data/transporter-types')
const addressBookData = require('./data/address-book')
const addressBookAddressTypes = require('./data/address-book-address-types')
const addressBookLookupAddresses = require('./data/address-book-lookup-addresses')
const dashboardData = require('./data/dashboard-notifications')
const { getCommoditySearchData } = require('./utils/commodity-search-data')

const TRANSIT_MEANS_OF_TRANSPORT = ['Railway', 'Road Vehicle']

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

function resetNotificationJourneySession (sessionData) {
  const addressBookAddedAddresses = sessionData.addressBookAddedAddresses
  const submittedNotifications = sessionData.submittedNotifications

  Object.keys(sessionData).forEach((key) => {
    delete sessionData[key]
  })

  if (addressBookAddedAddresses && addressBookAddedAddresses.length) {
    sessionData.addressBookAddedAddresses = addressBookAddedAddresses
  }

  if (submittedNotifications && submittedNotifications.length) {
    sessionData.submittedNotifications = submittedNotifications
  }
}

function seedPrototypeSessionForReasonForImport (sessionData) {
  sessionData.countryOfOrigin = 'France'
  sessionData.regionOfOriginRequired = 'No'
  sessionData.commodityId = 'cattle'
  sessionData.commodityCode = '0102'
  sessionData.commodityName = 'Cattle'
  sessionData.selectedSpecies = ['cattle-bison-bison']
  sessionData.commoditySelections = [{
    type: 'species',
    commodityId: 'cattle',
    commodityCode: '0102',
    speciesId: 'cattle-bison-bison'
  }]
  sessionData.numberOfAnimals = {
    'cattle-bison-bison': '5'
  }
  sessionData.certificationPurpose = 'Slaughter'
  sessionData.unweanedAnimals = 'No'
  ensurePrototypeNotificationReference(sessionData)
}

function hasOriginDetails (sessionData) {
  return Boolean(sessionData.countryOfOrigin)
}

function redirectIfNoOrigin (req, res) {
  return false
}

function isFromHub (req) {
  return req.query.from === 'hub' || (req.body && req.body.from === 'hub')
}

function isFromReview (req) {
  return req.query.from === 'review' || (req.body && req.body.from === 'review')
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

  if (commodity.code === '01061900') {
    sessionData.unweanedAnimals = null
  }
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

function getSelectedCommodityIdsFromSpecies (sessionData) {
  const commodityIds = []

  normalizeSelectedSpecies(sessionData.selectedSpecies).forEach((speciesId) => {
    const match = getSpeciesMatch(speciesId)

    if (match && !commodityIds.includes(match.commodity.id)) {
      commodityIds.push(match.commodity.id)
    }
  })

  return commodityIds
}

function getSelectedCommodityCodesFromSpecies (sessionData) {
  const commodityCodes = []

  normalizeSelectedSpecies(sessionData.selectedSpecies).forEach((speciesId) => {
    const match = getSpeciesMatch(speciesId)

    if (match && !commodityCodes.includes(match.commodity.code)) {
      commodityCodes.push(match.commodity.code)
    }
  })

  return commodityCodes
}

function updatePrimaryCommoditySessionFields (sessionData) {
  const commodityIds = getSelectedCommodityIdsFromSpecies(sessionData)
  const primaryCommodity = commodityIds.length ? getCommodityById(commodityIds[0]) : null

  if (primaryCommodity) {
    sessionData.commodityId = primaryCommodity.id
    sessionData.commodityCode = primaryCommodity.code
    sessionData.commodityName = primaryCommodity.name
  } else {
    sessionData.commodityId = null
    sessionData.commodityCode = null
    sessionData.commodityName = null
  }

  const commodityCodes = getSelectedCommodityCodesFromSpecies(sessionData)

  if (commodityCodes.length > 0 && commodityCodes.every((code) => code === '01061900')) {
    sessionData.unweanedAnimals = null
  }
}

function applySpeciesSelectionToSession (sessionData, speciesIds) {
  const validSpeciesIds = normalizeSelectedSpecies(speciesIds)
    .filter((speciesId) => Boolean(getSpeciesMatch(speciesId)))

  sessionData.selectedSpecies = validSpeciesIds
  sessionData.commoditySelections = buildSpeciesSelectionRecords(validSpeciesIds)
  updatePrimaryCommoditySessionFields(sessionData)

  return validSpeciesIds.length > 0
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

function getSpeciesCommonName ({ commodity, species }) {
  return species.commonName || commodity.name
}

function isOtherLiveMammalsCommodityCode (commodity) {
  return commodity && commodity.code === '01061900'
}

function toTitleCaseLabel (value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function formatSpeciesDisplayTitle ({ commodity, species }) {
  const commonName = getSpeciesCommonName({ commodity, species })
  const latinName = species.label

  return `${commodity.code} (${commonName} - ${latinName})`
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

  if (sessionData.numberOfPackages && sessionData.numberOfPackages[speciesId] != null) {
    delete sessionData.numberOfPackages[speciesId]
  }

  if (speciesIds.length === 0) {
    sessionData.commodityId = null
    sessionData.commodityCode = null
    sessionData.commodityName = null
    return
  }

  updatePrimaryCommoditySessionFields(sessionData)
}

function removeCommodityFromSession (sessionData, commodityId) {
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)
  const remainingSpeciesIds = speciesIds.filter((speciesId) => {
    const match = getSpeciesMatch(speciesId)

    return match && match.commodity.id !== commodityId
  })

  speciesIds
    .filter((speciesId) => !remainingSpeciesIds.includes(speciesId))
    .forEach((speciesId) => {
      if (sessionData.numberOfAnimals && sessionData.numberOfAnimals[speciesId] != null) {
        delete sessionData.numberOfAnimals[speciesId]
      }

      if (sessionData.numberOfPackages && sessionData.numberOfPackages[speciesId] != null) {
        delete sessionData.numberOfPackages[speciesId]
      }
    })

  sessionData.selectedSpecies = remainingSpeciesIds
  sessionData.commoditySelections = buildSpeciesSelectionRecords(remainingSpeciesIds)

  if (remainingSpeciesIds.length === 0) {
    sessionData.commodityId = null
    sessionData.commodityCode = null
    sessionData.commodityName = null
    return
  }

  updatePrimaryCommoditySessionFields(sessionData)
}

function getPackagingFields (commodity) {
  if (!commodity || !Array.isArray(commodity.packagingFields) || !commodity.packagingFields.length) {
    return []
  }

  return commodity.packagingFields
}

function commodityRequiresPackaging (commodity) {
  return getPackagingFields(commodity).length > 0
}

function formatCommodityGroupHeading (commodity) {
  return `${commodity.name} (${commodity.code})`
}

function getSelectedCommodityRows (sessionData) {
  const numberOfAnimals = sessionData.numberOfAnimals || {}
  const rows = []

  getSelectedCommodityIdsFromSpecies(sessionData).forEach((commodityId) => {
    const commodity = getCommodityById(commodityId)

    if (!commodity) {
      return
    }

    const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)
      .filter((speciesId) => {
        const match = getSpeciesMatch(speciesId)

        return match && match.commodity.id === commodityId
      })

    if (isOtherLiveMammalsCommodityCode(commodity)) {
      speciesIds.forEach((speciesId) => {
        const match = getSpeciesMatch(speciesId)

        if (!match) {
          return
        }

        rows.push({
          commodityId: commodity.id,
          speciesId,
          code: commodity.code,
          name: getSpeciesCommonName(match),
          numberOfAnimals: numberOfAnimals[speciesId] != null ? String(numberOfAnimals[speciesId]) : '',
          removeBy: 'species'
        })
      })

      return
    }

    const totalAnimals = speciesIds.reduce((sum, speciesId) => {
      return sum + (Number(numberOfAnimals[speciesId]) || 0)
    }, 0)

    rows.push({
      commodityId: commodity.id,
      speciesId: null,
      code: commodity.code,
      name: commodity.name,
      numberOfAnimals: totalAnimals > 0 ? String(totalAnimals) : '',
      removeBy: 'commodity'
    })
  })

  return rows
}

function getConsignmentCommodityGroups (sessionData) {
  const numberOfAnimals = sessionData.numberOfAnimals || {}
  const numberOfPackages = sessionData.numberOfPackages || {}

  return getSelectedCommodityIdsFromSpecies(sessionData)
    .map((commodityId) => {
      const commodity = getCommodityById(commodityId)

      if (!commodity) {
        return null
      }

      const speciesEntries = normalizeSelectedSpecies(sessionData.selectedSpecies)
        .map((speciesId) => {
          const match = getSpeciesMatch(speciesId)

          if (!match || match.commodity.id !== commodityId) {
            return null
          }

          const { species } = match
          const packagingFields = getPackagingFields(commodity)

          return {
            speciesId,
            speciesName: species.label,
            numberOfAnimals: numberOfAnimals[speciesId] != null ? String(numberOfAnimals[speciesId]) : '',
            showPackaging: packagingFields.length > 0,
            packagingFields: packagingFields.map((field) => ({
              id: `${field.id}-${speciesId}`,
              name: `numberOfPackages[${speciesId}]`,
              label: field.label,
              hint: field.hint,
              value: numberOfPackages[speciesId] != null ? String(numberOfPackages[speciesId]) : '',
              errorMessage: sessionData.errors && sessionData.errors[`numberOfPackages-${speciesId}`]
                ? sessionData.errors[`numberOfPackages-${speciesId}`]
                : null
            }))
          }
        })
        .filter(Boolean)

      if (!speciesEntries.length) {
        return null
      }

      return {
        commodityId,
        heading: formatCommodityGroupHeading(commodity),
        speciesEntries
      }
    })
    .filter(Boolean)
}

function getConsignmentSpeciesEntries (sessionData) {
  const numberOfAnimals = sessionData.numberOfAnimals || {}
  const numberOfPackages = sessionData.numberOfPackages || {}

  return normalizeSelectedSpecies(sessionData.selectedSpecies)
    .map((speciesId) => {
      const match = getSpeciesMatch(speciesId)

      if (!match) {
        return null
      }

      const { species, commodity } = match
      const packagingFields = getPackagingFields(commodity)

      return {
        speciesId,
        commodityCode: commodity.code,
        commonName: getSpeciesCommonName({ commodity, species }),
        heading: formatSpeciesDisplayTitle({ commodity, species }),
        numberOfAnimals: numberOfAnimals[speciesId] != null ? String(numberOfAnimals[speciesId]) : '',
        showPackaging: packagingFields.length > 0,
        packagingFields: packagingFields.map((field) => ({
          id: `${field.id}-${speciesId}`,
          name: `numberOfPackages[${speciesId}]`,
          label: field.label,
          hint: field.hint,
          value: numberOfPackages[speciesId] != null ? String(numberOfPackages[speciesId]) : '',
          errorMessage: sessionData.errors && sessionData.errors[`numberOfPackages-${speciesId}`]
            ? sessionData.errors[`numberOfPackages-${speciesId}`]
            : null
        }))
      }
    })
    .filter(Boolean)
}

function hasCommoditySelection (sessionData) {
  return normalizeSelectedSpecies(sessionData.selectedSpecies).length > 0
}

function redirectIfNoCommodity (req, res) {
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
  return { errors: {}, errorList: [] }
}

function parseNumberOfPackages (body, speciesIds) {
  const rawValues = body.numberOfPackages && typeof body.numberOfPackages === 'object'
    ? body.numberOfPackages
    : {}
  const values = {}

  speciesIds.forEach((speciesId) => {
    const fieldName = `numberOfPackages[${speciesId}]`
    const value = rawValues[speciesId] != null ? rawValues[speciesId] : body[fieldName]

    values[speciesId] = value != null ? String(value).trim() : ''
  })

  return values
}

function validateNumberOfPackages (values, speciesIds) {
  return { errors: {}, errorList: [] }
}

function buildRadioItems (options, selectedValue) {
  return options.map((option) => ({
    value: option,
    text: option,
    checked: selectedValue === option
  }))
}

const CONTACT_ADDRESS_RETURN_ID = 'contact-address'

function getContactAddresses (sessionData = {}) {
  return [
    ...(sessionData.contactAddedAddresses || []),
    ...contactAddresses
  ]
}

function getContactAddressById (addressId, sessionData = {}) {
  return getContactAddresses(sessionData).find((address) => address.id === addressId)
}

function formatContactAddressForSession (address) {
  return [address.name, ...(address.addressLines || []), address.country].join('\n')
}

function hasContactAddress (sessionData) {
  return Boolean(
    sessionData.contactAddress &&
    sessionData.contactAddress.trim() &&
    getContactAddressById(sessionData.contactAddressId, sessionData)
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

function buildContactAddressItems (sessionData, selectedId) {
  return getContactAddresses(sessionData).map((address) => ({
    value: address.id,
    text: address.name,
    hint: {
      text: address.addressLines.join(', ')
    },
    checked: selectedId === address.id
  }))
}

function formatContactAddressForSearch (address) {
  return [
    address.name,
    ...(address.addressLines || []),
    address.country
  ].join(' ').toLowerCase()
}

function buildContactAddressResults (searchQuery = '', sessionData = {}, returnPath = '/contact-address-for-consignment') {
  const addresses = getContactAddresses(sessionData)
  const query = searchQuery.trim().toLowerCase()
  const filtered = query
    ? addresses.filter((address) => formatContactAddressForSearch(address).includes(query))
    : addresses

  return {
    addresses: filtered.map((address) => ({
      ...address,
      searchText: formatContactAddressForSearch(address),
      viewHref: buildAddressViewHref(address.id, returnPath)
    })),
    visibleCount: filtered.length,
    totalCount: addresses.length
  }
}

function buildContactAddressFromManual (manualAddress) {
  const townPostcode = [
    manualAddress.townOrCity,
    manualAddress.county,
    manualAddress.postcode
  ].filter(Boolean).join(', ')
  const addressLines = [
    manualAddress.addressLine1,
    manualAddress.addressLine2,
    townPostcode
  ].filter(Boolean)

  return {
    id: `contact-added-${Date.now()}`,
    name: manualAddress.nameOrOrganisation,
    addressLines,
    country: manualAddress.country
  }
}

function setAddressBookContactReturn (sessionData) {
  sessionData.addressBookContactReturn = {
    path: '/contact-address-for-consignment'
  }
  sessionData.addressBookAddressType = 'branch-address'

  return true
}

function getAddressBookContactReturn (sessionData) {
  return sessionData.addressBookContactReturn || null
}

function clearAddressBookContactReturn (sessionData) {
  delete sessionData.addressBookContactReturn
}

function validateContactAddress (addressId, sessionData = {}) {
  const address = getContactAddressById(addressId, sessionData)

  return { errors: {}, errorList: [], address }
}

function getUnweanedOptions (sessionData) {
  const commodityCodes = getSelectedCommodityCodesFromSpecies(sessionData)

  if (!commodityCodes.length) {
    const commodityCode = sessionData.commodityCode ||
      (getCommodityById(sessionData.commodityId) || {}).code

    if (commodityCode) {
      commodityCodes.push(commodityCode)
    }
  }

  if (commodityCodes.length > 0 && commodityCodes.every((code) => code === '01061900')) {
    return []
  }

  const hasUnweanedCommodity = commodityCodes.some((code) => {
    const commodity = getCommodityByCode(code)

    return commodity && Array.isArray(commodity.unweanedOptions) && commodity.unweanedOptions.length > 0
  })

  if (!hasUnweanedCommodity) {
    return []
  }

  return ['Yes', 'No']
}

function getAdditionalAnimalDetailsConfig (sessionData) {
  const unweanedOptions = getUnweanedOptions(sessionData)

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
    const animalCount = numberOfAnimals[speciesId]

    return animalCount && /^\d+$/.test(String(animalCount)) && Number(animalCount) >= 1
  })
}

function redirectIfNoConsignmentDetails (req, res) {
  return false
}

function hasAdditionalAnimalDetailsComplete (sessionData) {
  const config = getAdditionalAnimalDetailsConfig(sessionData)

  if (!config.showCertificationPurposeQuestion && !config.showUnweanedQuestion) {
    return true
  }

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

  return true
}

function redirectIfNoAdditionalAnimalDetails (req, res) {
  return false
}

function redirectIfNoAnimalIdentifiers (req, res) {
  return false
}

function getJourneySteps (sessionData) {
  const steps = [
    '/origin-of-the-import',
    '/what-are-you-importing',
    '/reason-for-import',
    '/consignment-details'
  ]

  if (hasAnimalIdentifiersRequired(sessionData)) {
    steps.push('/animal-identification-details')
  }

  steps.push('/additional-animal-details')
  steps.push('/arrival-details')

  if (requiresTransitCountries(sessionData)) {
    steps.push('/transit-countries')
  }

  steps.push(
    '/transporter',
    '/upload-documents',
    '/roles-and-addresses',
    '/contact-address-for-consignment',
    '/review-notification',
    '/declaration'
  )

  return steps
}

function getNextJourneyPath (currentPath, sessionData, options = {}) {
  const path = (currentPath || '').split('?')[0]
  const steps = getJourneySteps(sessionData)
  const currentIndex = steps.indexOf(path)

  if (currentIndex === -1) {
    return options.fallback || '/notification-hub'
  }

  if (path === '/roles-and-addresses' && hasAllNotificationHubSectionsComplete(sessionData)) {
    return '/notification-hub'
  }

  if (currentIndex >= steps.length - 1) {
    return options.fallback || '/notification-hub'
  }

  return steps[currentIndex + 1]
}

function getPostConsignmentDetailsPath (sessionData) {
  return getNextJourneyPath('/consignment-details', sessionData)
}

function getAdditionalAnimalDetailsBackLink (sessionData) {
  if (hasAnimalIdentifiersRequired(sessionData)) {
    return '/animal-identification-details'
  }

  return '/consignment-details'
}

function hasImportReasonComplete (sessionData) {
  if (!importReasonValues.includes(sessionData.importReason)) {
    return false
  }

  if (sessionData.importReason === 'Internal market') {
    return internalMarketPurposeValues.includes(sessionData.internalMarketPurpose)
  }

  if (sessionData.importReason === 'Transhipment or onward travel') {
    return countryLabels.includes(sessionData.transhipmentDestinationCountry)
  }

  if (sessionData.importReason === 'Transit') {
    return isValidExitBorderControlPost(sessionData.transitExitBorderControlPost) &&
      countryLabels.includes(sessionData.transitDestinationCountry)
  }

  if (sessionData.importReason === 'Temporary admission horses') {
    return Boolean(parseArrivalDisplayDate(sessionData.temporaryAdmissionExitDate)) &&
      isValidExitBorderControlPost(sessionData.temporaryAdmissionPortOfExit)
  }

  return true
}

function redirectIfNoImportReason (req, res) {
  return false
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

  const codeIdentifiers = getIdentifiersForCommodityCode(match.commodity.code)

  if (codeIdentifiers.length) {
    return codeIdentifiers
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

  const speciesLabel = match.species.label
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
    panelHeaderText: speciesLabel,
    isComplete: !activeAnimal,
    activeAnimal,
    savedAnimals: completeSavedAnimals,
    savedAnimalsTable: buildSavedAnimalsTable(panelContext, completeSavedAnimals)
  }
}

function buildAnimalIdentificationCommodityGroups (sessionData, locals = {}) {
  const panels = buildAnimalIdentificationSpeciesPanels(sessionData, locals)
  const groups = []
  const groupMap = new Map()

  panels.forEach((panel) => {
    const match = getSpeciesMatch(panel.speciesId)

    if (!match) {
      return
    }

    const commodityId = match.commodity.id

    if (!groupMap.has(commodityId)) {
      const group = {
        commodityId,
        heading: formatCommodityGroupHeading(match.commodity),
        speciesPanels: []
      }

      groupMap.set(commodityId, group)
      groups.push(group)
    }

    groupMap.get(commodityId).speciesPanels.push(panel)
  })

  return groups
}

function getRemainingAnimalIdentifierCountForSpecies (sessionData, speciesId) {
  const fields = getIdentifierFieldsForSpecies(speciesId)

  if (fields.length === 0) {
    return 0
  }

  const total = Number((sessionData.numberOfAnimals || {})[speciesId]) || 0
  const speciesSaved = getAnimalIdentifiers(sessionData)[speciesId] || []
  let remaining = 0

  for (let index = 0; index < total; index++) {
    if (!isAnimalIdentifierEntryComplete(speciesSaved[index] || {}, fields)) {
      remaining++
    }
  }

  return remaining
}

function buildAnimalIdentificationSpeciesPanels (sessionData, locals = {}) {
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)

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
        const remainingForSpecies = getRemainingAnimalIdentifierCountForSpecies(sessionData, speciesId)
        panel.saveButtonText = remainingForSpecies === 1
          ? 'Save and finish'
          : 'Save and add another'
      }

      return panel
    })
    .filter(Boolean)
}

function validateAnimalIdentifiers (identifierFields, rawIdentifiers, speciesId = '') {
  const values = {}

  identifierFields.forEach((field) => {
    values[field.id] = rawIdentifiers && rawIdentifiers[field.id] != null
      ? String(rawIdentifiers[field.id]).trim()
      : ''
  })

  return { errors: {}, errorList: [], values }
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

function isValidExitBorderControlPost (exitBorderControlPost) {
  const normalised = (exitBorderControlPost || '').trim().toLowerCase()

  return exitBorderControlPosts.some((option) => option.toLowerCase() === normalised)
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
    isArrivalDateWithinAllowedRange(sessionData.arrivalDateAtPort) &&
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

function hasTransitCountriesComplete () {
  return true
}

function saveTransitCountriesToSession (sessionData, countries) {
  sessionData.transitCountries = normalizeTransitCountries(countries)
}

function parseTransitCountriesBody (body) {
  return normalizeTransitCountries(body.transitCountries)
}

function renderTransitCountriesPage (req, res) {
  const sessionData = req.session.data
  const transitCountries = normalizeTransitCountries(sessionData.transitCountries)
  const backLink = isFromHub(req) ? '/notification-hub' : '/arrival-details'

  return res.render('transit-countries', {
    backLink,
    fromHub: isFromHub(req),
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    countriesJson: JSON.stringify(countryOptions),
    transitCountriesJson: JSON.stringify(transitCountries),
    transitCountries,
    data: sessionData
  })
}

function renderContactAddressPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const selectedAddressId = locals.selectedAddressId != null
    ? locals.selectedAddressId
    : sessionData.contactAddressId || ''

  return res.render('contact-address-for-consignment', {
    backLink: isFromHub(req)
      ? '/notification-hub'
      : isFromReview(req)
        ? '/review-notification'
        : '/roles-and-addresses',
    fromHub: isFromHub(req),
    fromReview: isFromReview(req),
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    contactAddressItems: buildContactAddressItems(sessionData, selectedAddressId),
    selectedAddressId,
    addAddressHref: '/address-book/add?from=contact-address',
    successMessage: locals.successMessage != null
      ? locals.successMessage
      : sessionData.contactAddressSuccessMessage || null,
    data: sessionData,
    ...locals
  })
}

function formatConsignmentAddressForDisplay (address) {
  if (!address || !address.name) {
    return null
  }

  const addressLines = address.addressLines || []
  let lines = []

  if (addressLines.length > 1) {
    lines = [
      ...addressLines.slice(0, -1),
      `${addressLines[addressLines.length - 1]}, ${address.country}`
    ]
  } else if (addressLines.length === 1) {
    lines = [`${addressLines[0]}, ${address.country}`]
  } else if (address.country) {
    lines = [address.country]
  }

  return {
    name: address.name,
    lines
  }
}

function isPermanentAddressSpecies (speciesId) {
  const match = getSpeciesMatch(speciesId)

  return Boolean(match && match.commodity.requiresPermanentAddress)
}

function hasPermanentAddressRequiredSpecies (sessionData) {
  return getSelectedSpeciesIds(sessionData).some((speciesId) => isPermanentAddressSpecies(speciesId))
}

function getSessionConsignmentAddressSections (sessionData) {
  const commodityCodes = getSelectedCommodityCodesFromSpecies(sessionData)
  let sections

  if (commodityCodes.length) {
    sections = getActiveConsignmentAddressSectionsForCommodityCodes(commodityCodes)
  } else {
    sections = getActiveConsignmentAddressSections(sessionData.commodityCode || '')
  }

  if (!hasPermanentAddressRequiredSpecies(sessionData)) {
    sections = sections.filter((section) => section.id !== 'permanent-address')
  }

  return sections
}

function isConsignmentAddressSectionActive (sessionData, sectionId) {
  return getSessionConsignmentAddressSections(sessionData).some((section) => section.id === sectionId)
}

function buildConsignmentAddressSections (sessionData) {
  const hasConsigneeAddress = Boolean(sessionData.consigneeAddress)

  return getSessionConsignmentAddressSections(sessionData).map((section) => {
    if (section.isCph) {
      const cphNumber = (sessionData[section.sessionCphKey] || '').trim()

      if (cphNumber) {
        return {
          ...section,
          href: section.path,
          selectedCphNumber: cphNumber,
          changeHref: section.path
        }
      }

      return {
        ...section,
        href: section.path
      }
    }

    if (section.isPermanentAddress) {
      const href = sessionData.permanentAddressSameAsDestination === 'no'
        ? section.selectPath
        : section.path

      if (sessionData.permanentAddressSummary) {
        return {
          ...section,
          href,
          selectedAddressSummary: sessionData.permanentAddressSummary,
          changeHref: sessionData.permanentAddressSameAsDestination === 'no' ? section.selectPath : section.path
        }
      }

      const selectedAddress = formatConsignmentAddressForDisplay(sessionData[section.sessionAddressKey])

      if (selectedAddress) {
        return {
          ...section,
          href,
          selectedAddress,
          changeHref: sessionData.permanentAddressSameAsDestination === 'no' ? section.selectPath : section.path
        }
      }

      return {
        ...section,
        href: sessionData.permanentAddressSameAsDestination === 'no' ? section.selectPath : section.path
      }
    }

    if (!section.selectable) {
      return {
        ...section,
        href: section.path
      }
    }

    const selectedAddress = formatConsignmentAddressForDisplay(sessionData[section.sessionAddressKey])

    if (selectedAddress) {
      return {
        ...section,
        href: section.path,
        selectedAddress,
        changeHref: section.path
      }
    }

    if (section.canUseSameAsConsignee && hasConsigneeAddress) {
      return {
        ...section,
        href: section.path,
        showSameAsConsignee: true,
        sameAsConsigneeAction: `same-as-consignee:${section.id}`
      }
    }

    return {
      ...section,
      href: section.path
    }
  })
}

function copyConsigneeAddressToSection (sessionData, sectionId) {
  const section = consignmentAddressSections.find((item) => item.id === sectionId)

  if (!section || !section.canUseSameAsConsignee || !sessionData.consigneeAddress) {
    return false
  }

  sessionData[section.sessionAddressIdKey] = sessionData.consigneeAddressId
  sessionData[section.sessionAddressKey] = {
    name: sessionData.consigneeAddress.name,
    addressLines: [...(sessionData.consigneeAddress.addressLines || [])],
    country: sessionData.consigneeAddress.country
  }

  return true
}

function hasConsignmentAddressSectionComplete (sessionData, section) {
  if (section.isCph) {
    return Boolean((sessionData[section.sessionCphKey] || '').trim())
  }

  if (section.isPermanentAddress) {
    if (sessionData.permanentAddressSameAsDestination === 'yes') {
      return Boolean(sessionData[section.sessionAddressKey] && sessionData[section.sessionAddressKey].name)
    }

    if (sessionData.permanentAddressSameAsDestination === 'no') {
      return hasPermanentAddressAnimalsComplete(sessionData)
    }

    return false
  }

  if (!section.selectable) {
    return true
  }

  const address = sessionData[section.sessionAddressKey]
  return Boolean(address && address.name)
}

function hasConsignmentAddressesComplete (sessionData) {
  return getSessionConsignmentAddressSections(sessionData).every((section) =>
    hasConsignmentAddressSectionComplete(sessionData, section)
  )
}

function validateConsignmentAddressesComplete (sessionData) {
  const incompleteSections = getSessionConsignmentAddressSections(sessionData)
    .map((section, index) => ({ section, index: index + 1 }))
    .filter(({ section }) => !hasConsignmentAddressSectionComplete(sessionData, section))

  if (!incompleteSections.length) {
    return { errorList: [] }
  }

  return {
    errorList: incompleteSections.map(({ section, index }) => ({
      text: `Complete ${section.heading.toLowerCase()}`,
      href: `#address-section-${index}`
    }))
  }
}

function getSelectableConsignmentAddressSectionByPath (path) {
  return consignmentAddressSections.find((section) =>
    (section.selectable && section.path === path) ||
    (section.selectPath && section.selectPath === path)
  )
}

function formatAddressAsSingleLine (address) {
  if (!address || !address.name) {
    return ''
  }

  const parts = [address.name, ...(address.addressLines || [])]

  if (address.country) {
    parts.push(address.country)
  }

  return parts.join(', ')
}

function buildPermanentAddressRadioItems (sessionData, selectedValue) {
  const destinationHint = formatAddressAsSingleLine(sessionData.placeOfDestinationAddress)
  const yesItem = {
    value: 'yes',
    text: 'Yes',
    checked: selectedValue === 'yes'
  }

  if (destinationHint) {
    yesItem.hint = {
      text: destinationHint
    }
  }

  return [
    yesItem,
    {
      value: 'no',
      text: 'No',
      checked: selectedValue === 'no'
    }
  ]
}

function copyPlaceOfDestinationToPermanentAddress (sessionData) {
  if (!sessionData.placeOfDestinationAddress) {
    return false
  }

  sessionData.permanentAddressSameAsDestination = 'yes'
  sessionData.permanentAddressId = sessionData.placeOfDestinationAddressId
  sessionData.permanentAddress = {
    name: sessionData.placeOfDestinationAddress.name,
    addressLines: [...(sessionData.placeOfDestinationAddress.addressLines || [])],
    country: sessionData.placeOfDestinationAddress.country
  }

  return true
}

function validatePermanentAddressChoice (choice, sessionData) {
  return {
    errors: {},
    errorList: [],
    value: (choice || '').trim()
  }
}

function getPermanentAnimalAddresses (sessionData) {
  if (!sessionData.permanentAnimalAddresses || typeof sessionData.permanentAnimalAddresses !== 'object') {
    return {}
  }

  return sessionData.permanentAnimalAddresses
}

function getPermanentAddressReviewAnimalLabel (animal) {
  const match = getSpeciesMatch(animal.speciesId)

  if (!match) {
    return animal.heading
  }

  return `${getSpeciesCommonName(match)} ${animal.animalIndex + 1}`
}

function buildPermanentAddressReviewRows (sessionData) {
  const animals = buildPermanentAddressAnimalList(sessionData)
  const saved = getPermanentAnimalAddresses(sessionData)

  if (!animals.length) {
    return [{
      key: 'Address',
      value: formatAddressForReviewValue(sessionData.permanentAddress)
    }]
  }

  return animals.map((animal) => {
    const entry = saved[animal.key]
    const address = (entry && entry.address) || sessionData.permanentAddress

    return {
      key: getPermanentAddressReviewAnimalLabel(animal),
      value: formatAddressForReviewValue(address)
    }
  })
}

function getPermanentAddressAnimalLabel (match, animalNumber) {
  return `${match.species.label} ${animalNumber}`
}

function getSelectedSpeciesIds (sessionData) {
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)

  if (speciesIds.length) {
    return speciesIds
  }

  return parseCommoditySelections(sessionData.commoditySelections)
    .filter((selection) => selection && selection.type === 'species' && selection.speciesId)
    .map((selection) => selection.speciesId)
}

function buildPermanentAddressAnimalList (sessionData) {
  const speciesIds = getSelectedSpeciesIds(sessionData)
  const savedIdentifiers = getAnimalIdentifiers(sessionData)
  const savedAddresses = getPermanentAnimalAddresses(sessionData)
  const animals = []

  speciesIds.forEach((speciesId) => {
    if (!isPermanentAddressSpecies(speciesId)) {
      return
    }

    const match = getSpeciesMatch(speciesId)

    if (!match) {
      return
    }

    const total = Number((sessionData.numberOfAnimals || {})[speciesId]) || 0
    const identifierFields = getIdentifierFieldsForSpecies(speciesId)
    const speciesSaved = savedIdentifiers[speciesId] || []

    for (let index = 0; index < total; index++) {
      const animalKey = `${speciesId}:${index}`
      const animalData = speciesSaved[index] || {}
      const identifiers = identifierFields
        .map((field) => ({
          id: field.id,
          label: field.label,
          value: animalData[field.id] ? String(animalData[field.id]).trim() : ''
        }))
        .filter((item) => item.value)

      animals.push({
        key: animalKey,
        speciesId,
        animalIndex: index,
        heading: getPermanentAddressAnimalLabel(match, index + 1),
        identifiers,
        savedChoice: savedAddresses[animalKey] ? savedAddresses[animalKey].choice : ''
      })
    }
  })

  return animals
}

function getPermanentAddressDetailsErrorPrefix (animalKey) {
  return `permanentAddressDetails-${animalKey.replace(/:/g, '-')}`
}

function getEmptyPermanentAddressFormValues () {
  return {
    name: '',
    addressLine1: '',
    addressLine2: '',
    townOrCity: '',
    county: '',
    postcode: '',
    email: '',
    phone: ''
  }
}

function getPermanentAddressFormValuesFromSession (sessionData, animalKey) {
  const entry = getPermanentAnimalAddresses(sessionData)[animalKey]

  if (!entry || !entry.address) {
    return getEmptyPermanentAddressFormValues()
  }

  const address = entry.address
  const lines = address.addressLines || []

  return {
    name: address.name || '',
    addressLine1: lines[0] || '',
    addressLine2: lines[1] || '',
    townOrCity: lines[2] || '',
    county: address.county || '',
    postcode: lines[3] || '',
    email: address.email || '',
    phone: address.phone || ''
  }
}

function parsePermanentAddressDetails (body) {
  const rawDetails = body.permanentAddressDetails

  if (!rawDetails || typeof rawDetails !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(rawDetails).map(([animalKey, fields]) => {
      const values = fields && typeof fields === 'object' ? fields : {}

      return [animalKey, {
        name: String(values.name || '').trim(),
        addressLine1: String(values.addressLine1 || '').trim(),
        addressLine2: String(values.addressLine2 || '').trim(),
        townOrCity: String(values.townOrCity || '').trim(),
        county: String(values.county || '').trim(),
        postcode: String(values.postcode || '').trim(),
        email: String(values.email || '').trim(),
        phone: String(values.phone || '').trim()
      }]
    })
  )
}

function buildAddressFromPermanentAddressForm (form) {
  const addressLines = [
    form.addressLine1,
    form.addressLine2,
    form.townOrCity,
    form.postcode
  ].filter(Boolean)

  return {
    name: form.name,
    addressLines,
    county: form.county,
    country: 'United Kingdom',
    email: form.email,
    phone: form.phone
  }
}

function buildPermanentAddressAnimalRadioItems (animal, sessionData, selectedValue, newAddressConditionalHtml) {
  const placeOfDestinationHint = formatAddressAsSingleLine(sessionData.placeOfDestinationAddress)

  const sameAsPodItem = {
    value: 'same-as-pod',
    text: 'Same as the place of destination (POD)',
    checked: selectedValue === 'same-as-pod'
  }

  if (placeOfDestinationHint) {
    sameAsPodItem.hint = {
      text: placeOfDestinationHint
    }
  }

  const newAddressItem = {
    value: 'new-address',
    text: 'Enter a new address',
    hint: {
      text: 'This is where they will stay after spending 48 hours at the place of destination.'
    },
    checked: selectedValue === 'new-address'
  }

  if (newAddressConditionalHtml) {
    newAddressItem.conditional = {
      html: newAddressConditionalHtml
    }
  }

  return [
    sameAsPodItem,
    newAddressItem
  ]
}

function renderPermanentAddressNewAddressFields (app, animalKey, values, errors) {
  return new Promise((resolve, reject) => {
    app.render('partials/permanent-address-new-address-fields', {
      animalKey,
      values,
      data: { errors }
    }, (error, html) => {
      if (error) {
        reject(error)
        return
      }

      resolve(html)
    })
  })
}

function buildPermanentAddressAnimalsViewModel (app, sessionData, submittedChoices = {}, submittedAddressDetails = {}, errors = {}) {
  const savedAddresses = getPermanentAnimalAddresses(sessionData)
  const animals = buildPermanentAddressAnimalList(sessionData)

  if (!animals.length) {
    return Promise.resolve([])
  }

  return Promise.all(animals.map(async (animal) => {
    const savedChoice = savedAddresses[animal.key] ? savedAddresses[animal.key].choice : ''
    const selectedValue = Object.prototype.hasOwnProperty.call(submittedChoices, animal.key)
      ? submittedChoices[animal.key]
      : savedChoice
    const values = submittedAddressDetails[animal.key] ||
      getPermanentAddressFormValuesFromSession(sessionData, animal.key)
    const conditionalHtml = await renderPermanentAddressNewAddressFields(
      app,
      animal.key,
      values,
      errors
    )

    return {
      ...animal,
      radioItems: buildPermanentAddressAnimalRadioItems(
        animal,
        sessionData,
        selectedValue,
        conditionalHtml
      )
    }
  }))
}

function copyAddressToPermanentAnimalEntry (sessionData, animalKey, address, choice) {
  if (!address || !address.name) {
    return false
  }

  if (!sessionData.permanentAnimalAddresses || typeof sessionData.permanentAnimalAddresses !== 'object') {
    sessionData.permanentAnimalAddresses = {}
  }

  sessionData.permanentAnimalAddresses[animalKey] = {
    choice,
    addressId: address.id || null,
    address: {
      name: address.name,
      addressLines: [...(address.addressLines || [])],
      country: address.country || 'United Kingdom',
      email: address.email || '',
      phone: address.phone || ''
    }
  }

  return true
}

function syncPermanentAddressSummary (sessionData) {
  const animals = buildPermanentAddressAnimalList(sessionData)
  const saved = getPermanentAnimalAddresses(sessionData)

  if (!animals.length) {
    return
  }

  const allSameAsPod = animals.every((animal) => saved[animal.key] && saved[animal.key].choice === 'same-as-pod')

  if (allSameAsPod && sessionData.placeOfDestinationAddress) {
    sessionData.permanentAddressSameAsDestination = 'yes'
    sessionData.permanentAddressId = sessionData.placeOfDestinationAddressId
    sessionData.permanentAddress = {
      name: sessionData.placeOfDestinationAddress.name,
      addressLines: [...(sessionData.placeOfDestinationAddress.addressLines || [])],
      country: sessionData.placeOfDestinationAddress.country
    }
    sessionData.permanentAddressSummary = null
    return
  }

  sessionData.permanentAddressSameAsDestination = 'no'

  const addresses = animals
    .map((animal) => saved[animal.key] && saved[animal.key].address)
    .filter(Boolean)

  if (addresses.length === 1) {
    sessionData.permanentAddressId = saved[animals[0].key].addressId || null
    sessionData.permanentAddress = {
      name: addresses[0].name,
      addressLines: [...(addresses[0].addressLines || [])],
      country: addresses[0].country
    }
    sessionData.permanentAddressSummary = null
    return
  }

  sessionData.permanentAddressId = null
  sessionData.permanentAddress = null
  sessionData.permanentAddressSummary = `Permanent addresses added for ${animals.length} animals`
}

function hasPermanentAddressAnimalsComplete (sessionData) {
  if (sessionData.permanentAddressSameAsDestination !== 'no') {
    return false
  }

  const animals = buildPermanentAddressAnimalList(sessionData)
  const saved = getPermanentAnimalAddresses(sessionData)

  if (!animals.length) {
    return false
  }

  return animals.every((animal) => {
    const entry = saved[animal.key]

    return entry && entry.address && entry.address.name
  })
}

function parsePermanentAddressChoices (body) {
  const rawChoices = body.permanentAddressChoice

  if (!rawChoices || typeof rawChoices !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(rawChoices).map(([key, value]) => [key, String(value || '').trim()])
  )
}

function validatePermanentAddressAnimalsForm (choices, sessionData, addressDetails = {}) {
  return { errors: {}, errorList: [], choices, addressDetails }
}

function getPermanentAddressAnimalByKey (sessionData, animalKey) {
  return buildPermanentAddressAnimalList(sessionData).find((animal) => animal.key === animalKey) || null
}

function renderPermanentAddressAnimalsPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const submittedChoices = locals.submittedChoices || {}
  const submittedAddressDetails = locals.submittedAddressDetails || {}
  const errors = locals.errors || sessionData.errors || {}

  return buildPermanentAddressAnimalsViewModel(
    req.app,
    sessionData,
    submittedChoices,
    submittedAddressDetails,
    errors
  ).then((animals) => {
    return res.render('permanent-address-animals', {
      backLink: '/roles-and-addresses',
      notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
      animals,
      data: sessionData,
      ...locals
    })
  })
}

function renderPermanentAddressPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const selectedValue = locals.permanentAddressSameAsDestination != null
    ? locals.permanentAddressSameAsDestination
    : sessionData.permanentAddressSameAsDestination || ''

  return res.render('permanent-address', {
    backLink: '/roles-and-addresses',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    radioItems: buildPermanentAddressRadioItems(sessionData, selectedValue),
    data: sessionData,
    ...locals
  })
}

function renderRolesAndAddressesPage (req, res, locals = {}) {
  const sessionData = req.session.data

  return res.render('roles-and-addresses', {
    backLink: '/notification-hub',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    addressSections: buildConsignmentAddressSections(sessionData),
    data: sessionData,
    ...locals
  })
}

function splitCphNumber (cphNumber) {
  const value = (cphNumber || '').trim()
  const match = value.match(/^(\d{1,2})\/(\d{1,3})\/(\d{1,4})$/)

  if (!match) {
    return {
      county: '',
      parish: '',
      holding: ''
    }
  }

  return {
    county: match[1],
    parish: match[2],
    holding: match[3]
  }
}

function parseCphNumberBody (body = {}) {
  return {
    county: (body['cphNumber-county'] || '').trim(),
    parish: (body['cphNumber-parish'] || '').trim(),
    holding: (body['cphNumber-holding'] || '').trim()
  }
}

function validateCphNumber (input) {
  let county = ''
  let parish = ''
  let holding = ''

  if (typeof input === 'object' && input !== null) {
    county = (input.county || '').trim()
    parish = (input.parish || '').trim()
    holding = (input.holding || '').trim()
  } else {
    const parts = splitCphNumber(input)
    county = parts.county
    parish = parts.parish
    holding = parts.holding
  }

  const isComplete = Boolean(county && parish && holding)

  return {
    errors: {},
    errorList: [],
    value: isComplete ? `${county}/${parish}/${holding}` : '',
    parts: { county, parish, holding }
  }
}

function renderCphNumberPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const cphNumber = locals.cphNumber != null ? locals.cphNumber : sessionData.cphNumber || ''
  const cphNumberParts = locals.cphNumberParts || splitCphNumber(cphNumber)

  return res.render('cph-number', {
    backLink: '/roles-and-addresses',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    cphNumber,
    cphNumberParts,
    data: sessionData,
    ...locals
  })
}

function hasTransportDetailsComplete (sessionData) {
  return Boolean(sessionData.transporter && sessionData.transporter.name)
}

function formatTransporterForSearch (transporter) {
  return [
    transporter.name,
    transporter.address,
    transporter.approvalNumber,
    transporter.type,
    transporter.status
  ].join(' ').toLowerCase()
}

function getTransporterById (transporterId, sessionData = {}) {
  return getAllTransporters(sessionData).find((transporter) => transporter.id === transporterId)
}

function getSessionTransporters (sessionData) {
  return sessionData.addedTransporters || []
}

function getAllTransporters (sessionData = {}) {
  return [...getSessionTransporters(sessionData), ...transporters]
}

function buildTransporterResults (searchQuery = '', sessionData = {}) {
  const query = searchQuery.trim().toLowerCase()
  const allTransporters = getAllTransporters(sessionData)
  const filtered = query
    ? allTransporters.filter((transporter) => formatTransporterForSearch(transporter).includes(query))
    : allTransporters

  return {
    transporters: filtered.map((transporter) => ({
      ...transporter,
      searchText: formatTransporterForSearch(transporter),
      viewHref: buildAddressViewHref(transporter.id, '/transporter')
    }))
  }
}

function renderTransporterPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const searchQuery = locals.searchQuery != null ? locals.searchQuery : ''
  const successMessage = sessionData.transporterSuccessMessage || null

  if (successMessage) {
    delete sessionData.transporterSuccessMessage
  }

  return res.render('transporter', {
    backLink: '/notification-hub',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    transporterResults: buildTransporterResults(searchQuery, sessionData),
    selectedTransporterId: locals.selectedTransporterId != null
      ? locals.selectedTransporterId
      : sessionData.transporterId || '',
    searchQuery,
    successMessage,
    data: sessionData,
    ...locals
  })
}

function syncTransporterSession (sessionData, transporter) {
  sessionData.transporterId = transporter.id
  sessionData.transporter = {
    name: transporter.name,
    address: transporter.address,
    approvalNumber: transporter.approvalNumber,
    type: transporter.type,
    status: transporter.status
  }
}

const transporterTypeValues = transporterTypes.map((item) => item.value)
const COMMERCIAL_TRANSPORTER_COUNTRY = 'Northern Ireland'

function buildCommercialTransporterCountryItems () {
  return [{
    value: COMMERCIAL_TRANSPORTER_COUNTRY,
    text: COMMERCIAL_TRANSPORTER_COUNTRY,
    selected: true
  }]
}

function renderTransporterAddPage (req, res, locals = {}) {
  const sessionData = req.session.data

  return res.render('transporter-add', {
    backLink: '/transporter',
    transporterTypeOptions: transporterTypes,
    selectedTransporterType: locals.selectedTransporterType != null
      ? locals.selectedTransporterType
      : sessionData.transporterAddType || '',
    data: sessionData,
    ...locals
  })
}

function validateTransporterType (transporterType) {
  return {
    errors: {},
    errorList: [],
    value: (transporterType || '').trim()
  }
}

function redirectIfTransporterAddTypeNot (req, res, expectedType) {
  if (req.session.data.transporterAddType === expectedType) {
    return false
  }

  res.redirect('/transporter/add')
  return true
}

function getTransporterPrivateForm (sessionData) {
  return {
    name: '',
    addressLine1: '',
    addressLine2: '',
    townOrCity: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
    email: '',
    phone: '',
    ...(sessionData.transporterPrivateForm || {})
  }
}

function parseTransporterPrivateFormBody (body) {
  return {
    name: (body.transporterPrivateName || '').trim(),
    addressLine1: (body.transporterPrivateAddressLine1 || '').trim(),
    addressLine2: (body.transporterPrivateAddressLine2 || '').trim(),
    townOrCity: (body.transporterPrivateTownOrCity || '').trim(),
    county: (body.transporterPrivateCounty || '').trim(),
    postcode: (body.transporterPrivatePostcode || '').trim(),
    country: (body.transporterPrivateCountry || '').trim(),
    email: (body.transporterPrivateEmail || '').trim(),
    phone: (body.transporterPrivatePhone || '').trim()
  }
}

function validateTransporterPrivateForm (form) {
  return { errors: {}, errorList: [], value: form }
}

function formatTransporterFormAddress (form) {
  return [
    form.addressLine1,
    form.addressLine2,
    form.townOrCity,
    form.county,
    form.postcode,
    form.country
  ].filter(Boolean).join(', ')
}

function buildTransporterAddressDetails (form) {
  return {
    nameOrOrganisation: form.name,
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2,
    townOrCity: form.townOrCity,
    county: form.county,
    postcode: form.postcode,
    country: form.country,
    email: form.email,
    phone: form.phone
  }
}

function buildPrivateTransporterFromForm (form) {
  return {
    id: `added-transporter-${Date.now()}`,
    name: form.name,
    address: formatTransporterFormAddress(form),
    approvalNumber: 'Not applicable',
    type: 'Private',
    status: 'New',
    statusTagClass: 'app-transporter-table__tag--new',
    details: buildTransporterAddressDetails(form)
  }
}

function getTransporterCommercialForm (sessionData) {
  return {
    authorisationNumber: '',
    name: '',
    addressLine1: '',
    addressLine2: '',
    townOrCity: '',
    county: '',
    postcode: '',
    email: '',
    phone: '',
    ...(sessionData.transporterCommercialForm || {}),
    country: COMMERCIAL_TRANSPORTER_COUNTRY
  }
}

function parseTransporterCommercialFormBody (body) {
  return {
    authorisationNumber: (body.transporterCommercialAuthorisationNumber || '').trim(),
    name: (body.transporterCommercialName || '').trim(),
    addressLine1: (body.transporterCommercialAddressLine1 || '').trim(),
    addressLine2: (body.transporterCommercialAddressLine2 || '').trim(),
    townOrCity: (body.transporterCommercialTownOrCity || '').trim(),
    county: (body.transporterCommercialCounty || '').trim(),
    postcode: (body.transporterCommercialPostcode || '').trim(),
    country: COMMERCIAL_TRANSPORTER_COUNTRY,
    email: (body.transporterCommercialEmail || '').trim(),
    phone: (body.transporterCommercialPhone || '').trim()
  }
}

function validateTransporterCommercialForm (form) {
  return { errors: {}, errorList: [], value: form }
}

function buildCommercialTransporterFromForm (form) {
  return {
    id: `added-transporter-${Date.now()}`,
    name: form.name,
    address: formatTransporterFormAddress(form),
    approvalNumber: form.authorisationNumber,
    type: 'Commercial',
    status: 'New',
    statusTagClass: 'app-transporter-table__tag--new',
    details: buildTransporterAddressDetails(form)
  }
}

function formatTransporterSuccessMessage (name) {
  const trimmed = (name || '').trim()

  if (!trimmed) {
    return 'Transporter added'
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1).toLowerCase()} transporter added`
}

function saveAddedTransporter (sessionData, transporter) {
  if (!sessionData.addedTransporters) {
    sessionData.addedTransporters = []
  }

  sessionData.addedTransporters.unshift(transporter)
  syncTransporterSession(sessionData, transporter)
  sessionData.transporterSuccessMessage = formatTransporterSuccessMessage(transporter.name)
}

function renderTransporterAddPrivatePage (req, res, locals = {}) {
  const sessionData = req.session.data
  const formValues = locals.formValues || getTransporterPrivateForm(sessionData)

  return res.render('transporter-add-private', {
    backLink: '/transporter/add',
    formValues,
    countryItems: buildAddressBookCountryItems(formValues.country),
    data: sessionData,
    ...locals
  })
}

function renderTransporterAddCommercialPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const formValues = locals.formValues || getTransporterCommercialForm(sessionData)

  return res.render('transporter-add-commercial', {
    backLink: '/transporter/add',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    formValues,
    countryItems: buildCommercialTransporterCountryItems(),
    commercialTransporterCountry: COMMERCIAL_TRANSPORTER_COUNTRY,
    data: sessionData,
    ...locals
  })
}

function formatConsignmentAddressForSearch (address) {
  return [
    address.name,
    ...(address.addressLines || []),
    address.country
  ].join(' ').toLowerCase()
}

function getConsignmentAddressesForSection (sectionId, sessionData = {}) {
  const staticAddresses = sectionId
    ? consignmentAddresses.filter((address) => address.type === sectionId)
    : consignmentAddresses

  const addedAddresses = (sessionData.consignmentAddedAddresses || [])
    .filter((address) => !sectionId || address.type === sectionId)

  return [...addedAddresses, ...staticAddresses]
}

function getConsignmentAddressById (addressId, sectionId, sessionData = {}) {
  return getConsignmentAddressesForSection(sectionId, sessionData).find((address) => address.id === addressId)
}

function buildConsignmentAddressResults (searchQuery = '', sectionId = '', sessionData = {}, returnPath = '') {
  const sectionAddresses = getConsignmentAddressesForSection(sectionId, sessionData)
  const query = searchQuery.trim().toLowerCase()
  const filtered = query
    ? sectionAddresses.filter((address) => formatConsignmentAddressForSearch(address).includes(query))
    : sectionAddresses

  return {
    addresses: filtered.map((address) => ({
      ...address,
      searchText: formatConsignmentAddressForSearch(address),
      viewHref: buildAddressViewHref(address.id, returnPath)
    })),
    visibleCount: filtered.length,
    totalCount: sectionAddresses.length
  }
}

function renderConsignmentAddressSelectPage (section, req, res, locals = {}) {
  const sessionData = req.session.data
  const searchQuery = locals.searchQuery != null ? locals.searchQuery : ''
  const successMessage = sessionData.consignmentAddressSuccessMessage || null

  if (successMessage) {
    delete sessionData.consignmentAddressSuccessMessage
  }

  return res.render('consignment-address-select', {
    backLink: '/roles-and-addresses',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    heading: section.heading,
    intro: section.hint,
    introList: section.hintList || null,
    formAction: section.path,
    formFieldName: section.formFieldName,
    inputIdPrefix: section.inputIdPrefix,
    searchInputId: section.searchInputId,
    addressResults: buildConsignmentAddressResults(searchQuery, section.id, sessionData, section.path),
    selectedAddressId: locals.selectedAddressId != null
      ? locals.selectedAddressId
      : sessionData[section.sessionAddressIdKey] || '',
    searchQuery,
    addAddressHref: `/address-book/add?from=${section.id}`,
    successMessage,
    data: sessionData,
    ...locals
  })
}

function handleConsignmentAddressSelectGet (req, res) {
  const section = getSelectableConsignmentAddressSectionByPath(req.path)

  if (!section) {
    return res.status(404).send('Page not found')
  }

  ensurePrototypeNotificationReference(req.session.data)

  if (!isConsignmentAddressSectionActive(req.session.data, section.id)) {
    return res.redirect('/roles-and-addresses')
  }

  return renderConsignmentAddressSelectPage(section, req, res, {
    searchQuery: (req.query.search || '').trim()
  })
}

function handleConsignmentAddressSelectPost (req, res) {
  const section = getSelectableConsignmentAddressSectionByPath(req.path)

  if (!section) {
    return res.status(404).send('Page not found')
  }

  ensurePrototypeNotificationReference(req.session.data)

  if (!isConsignmentAddressSectionActive(req.session.data, section.id)) {
    return res.redirect('/roles-and-addresses')
  }

  const addressId = (req.body[section.formFieldName] || '').trim()
  const searchQuery = (req.body.search || '').trim()
  const address = getConsignmentAddressById(addressId, section.id, req.session.data)

  if (!address) {
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect('/roles-and-addresses')
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data[section.sessionAddressIdKey] = address.id
  req.session.data[section.sessionAddressKey] = {
    name: address.name,
    addressLines: address.addressLines,
    country: address.country
  }

  return res.redirect('/roles-and-addresses')
}

function redirectIfNoArrivalDetails (req, res) {
  return false
}

function redirectIfTransitCountriesNotRequired (req, res) {
  if (!requiresTransitCountries(req.session.data)) {
    res.redirect('/notification-hub')
    return true
  }

  return false
}

function getArrivalDetailsContinuePath (sessionData) {
  return getNextJourneyPath('/arrival-details', sessionData)
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

function formatArrivalPickerDate (date) {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

function startOfDay (date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getArrivalDatePickerBounds (referenceDate = new Date()) {
  const today = startOfDay(referenceDate)
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() - 7)
  const maxDate = new Date(today)
  maxDate.setMonth(maxDate.getMonth() + 6)

  return {
    minDate: formatArrivalPickerDate(minDate),
    maxDate: formatArrivalPickerDate(maxDate)
  }
}

function parseArrivalDisplayDateToDate (value) {
  const parsed = parseArrivalDisplayDate(value)

  if (!parsed) {
    return null
  }

  const match = parsed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
}

function isArrivalDateWithinAllowedRange (value, referenceDate = new Date()) {
  const date = parseArrivalDisplayDateToDate(value)

  if (!date) {
    return false
  }

  const bounds = getArrivalDatePickerBounds(referenceDate)
  const minDate = parseArrivalDisplayDateToDate(bounds.minDate)
  const maxDate = parseArrivalDisplayDateToDate(bounds.maxDate)

  return date >= minDate && date <= maxDate
}

function validateArrivalDetails (values) {
  return { errors: {}, errorList: [] }
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
  const arrivalDateBounds = getArrivalDatePickerBounds()

  return res.render('arrival-details', {
    backLink: '/notification-hub',
    fromHub: isFromHub(req),
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    ukAirportItemsJson: JSON.stringify(getUkAirportDisplayOptions()),
    meansOfTransportItems: buildMeansOfTransportItems(sessionData.meansOfTransport),
    arrivalDateMinDate: arrivalDateBounds.minDate,
    arrivalDateMaxDate: arrivalDateBounds.maxDate,
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

function formatReviewValueOrNa (value) {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    return 'Not applicable'
  }

  return String(value).trim()
}

function formatAddressForReviewValue (address) {
  const formatted = formatConsignmentAddressForDisplay(address)

  if (!formatted) {
    return 'Not applicable'
  }

  return {
    isAddress: true,
    name: formatted.name,
    lines: formatted.lines
  }
}

function formatContactAddressForReviewValue (sessionData) {
  const lines = (sessionData.contactAddress || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return 'Not applicable'
  }

  if (lines.length === 1) {
    return {
      isAddress: true,
      name: lines[0],
      lines: []
    }
  }

  return {
    isAddress: true,
    name: lines[0],
    lines: lines.slice(1)
  }
}

function formatCommaSeparatedAddressForReviewValue (addressString) {
  const parts = (addressString || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) {
    return 'Not applicable'
  }

  if (parts.length === 1) {
    return parts[0]
  }

  return {
    isAddress: true,
    lines: parts
  }
}

function getTransporterCountryLabel (sessionData) {
  const approvalNumber = sessionData.transporter?.approvalNumber || ''

  if (approvalNumber.startsWith('UK/')) {
    return 'United Kingdom'
  }

  if (approvalNumber.startsWith('DK/')) {
    return 'Denmark'
  }

  if (approvalNumber.startsWith('PT/')) {
    return 'Portugal'
  }

  if (approvalNumber.startsWith('RO/')) {
    return 'Romania'
  }

  if (approvalNumber.startsWith('SK/')) {
    return 'Slovakia'
  }

  if (approvalNumber.startsWith('FI/')) {
    return 'Finland'
  }

  return 'Not applicable'
}

function getReviewAnimalDetailsCommodityCodes (sessionData) {
  const codes = []
  const seenCommodityIds = new Set()

  normalizeSelectedSpecies(sessionData.selectedSpecies).forEach((speciesId) => {
    const match = getSpeciesMatch(speciesId)

    if (!match) {
      return
    }

    if (isOtherLiveMammalsCommodityCode(match.commodity)) {
      codes.push(match.commodity.code)
      return
    }

    if (!seenCommodityIds.has(match.commodity.id)) {
      seenCommodityIds.add(match.commodity.id)
      codes.push(match.commodity.code)
    }
  })

  return codes.join(', ')
}

function getReviewAnimalDetailsCommonNames (sessionData) {
  const names = []
  const seenCommodityIds = new Set()

  normalizeSelectedSpecies(sessionData.selectedSpecies).forEach((speciesId) => {
    const match = getSpeciesMatch(speciesId)

    if (!match) {
      return
    }

    if (isOtherLiveMammalsCommodityCode(match.commodity)) {
      names.push(getSpeciesCommonName(match))
      return
    }

    if (!seenCommodityIds.has(match.commodity.id)) {
      seenCommodityIds.add(match.commodity.id)
      names.push(match.commodity.name)
    }
  })

  return names.join(', ')
}

function getSelectedSpeciesLabelsForReview (sessionData) {
  return normalizeSelectedSpecies(sessionData.selectedSpecies)
    .map((speciesId) => {
      const match = getSpeciesMatch(speciesId)

      if (!match) {
        return null
      }

      return toTitleCaseLabel(match.species.label || match.species.commonName)
    })
    .filter(Boolean)
    .join(', ')
}

function buildReviewSpeciesSections (sessionData) {
  return normalizeSelectedSpecies(sessionData.selectedSpecies)
    .filter((speciesId) => getIdentifierFieldsForSpecies(speciesId).length > 0)
    .map((speciesId, index) => {
      const match = getSpeciesMatch(speciesId)
      const speciesLabel = match
        ? toTitleCaseLabel(match.species.label || match.species.commonName)
        : 'Species'
      const panel = getSpeciesIdentificationState(sessionData, speciesId)
      let animalTable = null

      if (panel && panel.savedAnimalsTable && panel.savedAnimalsTable.rows.length) {
        animalTable = {
          headers: panel.savedAnimalsTable.head
            .map((column) => column.text)
            .filter(Boolean),
          rows: panel.savedAnimalsTable.rows.map((row) => ({
            label: row[0].text,
            values: row.slice(1, -1).map((cell) => cell.text)
          }))
        }
      }

      return {
        id: `review-species-${index + 1}`,
        title: speciesLabel,
        changeHref: getIdentifierFieldsForSpecies(speciesId).length
          ? '/animal-identification-details'
          : '/consignment-details',
        rows: [],
        animalTable,
        packagingRows: null,
        ...reviewSpeciesCardErrorState(sessionData, speciesId, speciesLabel)
      }
    })
}

function buildReviewCommoditySections (sessionData) {
  return getConsignmentSpeciesEntries(sessionData)
    .map((entry) => {
      const rows = [
        {
          key: 'Commodity code',
          value: formatReviewValueOrNa(entry.commodityCode)
        },
        {
          key: 'Common name',
          value: formatReviewValueOrNa(entry.commonName)
        },
        {
          key: 'Number of animals',
          value: formatReviewValueOrNa(entry.numberOfAnimals)
        }
      ]

      if (entry.showPackaging) {
        entry.packagingFields.forEach((field) => {
          rows.push({
            key: field.label,
            value: formatReviewValueOrNa(field.value)
          })
        })
      }

      return {
        title: entry.commonName,
        rows
      }
    })
}

function getSpeciesReviewCardErrorMessage (sessionData, speciesId, speciesLabel) {
  if (isSpeciesIdentifiersComplete(sessionData, speciesId)) {
    return null
  }

  const speciesName = speciesLabel.toLowerCase()

  if (!isSpeciesConsignmentComplete(sessionData, speciesId)) {
    return `Enter the number of animals for ${speciesName}`
  }

  return `Complete identification details for ${speciesName}`
}

function reviewSpeciesCardErrorState (sessionData, speciesId, speciesLabel) {
  const errorMessage = getSpeciesReviewCardErrorMessage(sessionData, speciesId, speciesLabel)

  if (!errorMessage) {
    return { hasError: false, errorMessage: null }
  }

  return {
    hasError: true,
    errorMessage
  }
}

function reviewCardErrorState (isComplete, title) {
  if (isComplete) {
    return { hasError: false, errorMessage: null }
  }

  return {
    hasError: true,
    errorMessage: `Complete ${title.toLowerCase()}`
  }
}

function isSpeciesConsignmentComplete (sessionData, speciesId) {
  const numberOfAnimals = sessionData.numberOfAnimals || {}
  const animalCount = numberOfAnimals[speciesId]

  return animalCount && /^\d+$/.test(String(animalCount)) && Number(animalCount) >= 1
}

function isSpeciesIdentifiersComplete (sessionData, speciesId) {
  const fields = getIdentifierFieldsForSpecies(speciesId)

  if (fields.length === 0) {
    return true
  }

  const total = Number((sessionData.numberOfAnimals || {})[speciesId]) || 0

  if (!total) {
    return false
  }

  const speciesSaved = getAnimalIdentifiers(sessionData)[speciesId] || []

  if (speciesSaved.length < total) {
    return false
  }

  return speciesSaved.every((animal) => isAnimalIdentifierEntryComplete(animal, fields))
}

function hasSpeciesReviewCardComplete (sessionData, speciesId) {
  return isSpeciesIdentifiersComplete(sessionData, speciesId)
}

function hasAdditionalAnimalDetailsReviewComplete (sessionData) {
  return hasAdditionalAnimalDetailsComplete(sessionData)
}

function buildReviewErrorList (cards) {
  return cards
    .filter((card) => card.hasError)
    .map((card) => ({
      text: card.errorMessage,
      href: `#${card.id}`
    }))
}

function hasReviewNotificationComplete (sessionData) {
  if (!hasOriginDetails(sessionData)) {
    return false
  }

  if (!hasCommoditySelection(sessionData)) {
    return false
  }

  if (!hasConsignmentDetails(sessionData)) {
    return false
  }

  if (!hasAdditionalAnimalDetailsComplete(sessionData)) {
    return false
  }

  if (!hasImportReasonComplete(sessionData)) {
    return false
  }

  if (!hasArrivalDetailsComplete(sessionData)) {
    return false
  }

  if (requiresTransitCountries(sessionData) && !hasTransitCountriesComplete(sessionData)) {
    return false
  }

  if (!hasTransportDetailsComplete(sessionData)) {
    return false
  }

  if (!hasConsignmentAddressesComplete(sessionData)) {
    return false
  }

  if (hasAnimalIdentifiersRequired(sessionData) && !hasAnimalIdentifiersComplete(sessionData)) {
    return false
  }

  if (!hasUploadedDocuments(sessionData)) {
    return false
  }

  return true
}

function hasNotificationComplete (sessionData) {
  return hasReviewNotificationComplete(sessionData) && hasContactAddress(sessionData)
}

function getReviewNotificationViewModel (sessionData) {
  const additionalConfig = getAdditionalAnimalDetailsConfig(sessionData)
  const transporter = sessionData.transporter || {}
  const importDetailsRows = [
    {
      key: 'Country of origin',
      value: formatReviewValueOrNa(sessionData.countryOfOrigin)
    },
    {
      key: 'Region of origin code',
      value: formatReviewValueOrNa(sessionData.regionOfOriginCode)
    },
    {
      key: 'Internal reference number',
      value: formatReviewValueOrNa(sessionData.internalReference)
    }
  ]
  const animalDetailsRows = [
    {
      key: 'Commodity code',
      value: formatReviewValueOrNa(getReviewAnimalDetailsCommodityCodes(sessionData))
    },
    {
      key: 'Common name',
      value: formatReviewValueOrNa(getReviewAnimalDetailsCommonNames(sessionData))
    },
    {
      key: 'Species',
      value: formatReviewValueOrNa(getSelectedSpeciesLabelsForReview(sessionData))
    }
  ]
  const commoditySections = buildReviewCommoditySections(sessionData)
  const importReasonRows = [{
    key: 'Reason for import',
    value: formatReviewValueOrNa(sessionData.importReason)
  }]

  const additionalAnimalRows = []

  if (additionalConfig.showCertificationPurposeQuestion) {
    additionalAnimalRows.push({
      key: 'Certified for',
      value: formatReviewValueOrNa(sessionData.certificationPurpose)
    })
  }

  if (additionalConfig.showUnweanedQuestion) {
    additionalAnimalRows.push({
      key: 'Includes unweaned animals',
      value: formatReviewValueOrNa(sessionData.unweanedAnimals)
    })
  }

  if (sessionData.importReason === 'Internal market') {
    importReasonRows.push({
      key: 'Purpose in the market',
      value: formatReviewValueOrNa(sessionData.internalMarketPurpose)
    })
  }

  if (sessionData.importReason === 'Transhipment or onward travel') {
    importReasonRows.push({
      key: 'Destination country',
      value: formatReviewValueOrNa(sessionData.transhipmentDestinationCountry)
    })
  }

  if (sessionData.importReason === 'Transit') {
    importReasonRows.push({
      key: 'Exit border control post',
      value: formatReviewValueOrNa(sessionData.transitExitBorderControlPost)
    })
    importReasonRows.push({
      key: 'Destination country',
      value: formatReviewValueOrNa(sessionData.transitDestinationCountry)
    })
  }

  if (sessionData.importReason === 'Temporary admission horses') {
    importReasonRows.push({
      key: 'Exit date',
      value: formatReviewValueOrNa(sessionData.temporaryAdmissionExitDate)
    })
    importReasonRows.push({
      key: 'Port of exit',
      value: formatReviewValueOrNa(sessionData.temporaryAdmissionPortOfExit)
    })
  }

  const arrivalDetailsRows = [
    {
      key: 'Port of entry',
      value: formatReviewValueOrNa(sessionData.portOfEntry)
    },
    {
      key: 'Arrival date at destination',
      value: formatReviewValueOrNa(sessionData.arrivalDateAtPort)
    },
    {
      key: 'Means of transport to the port of entry',
      value: formatReviewValueOrNa(sessionData.meansOfTransport)
    }
  ]

  arrivalDetailsRows.push(
    {
      key: 'Transport identification',
      value: formatReviewValueOrNa(sessionData.transportIdentification)
    },
    {
      key: 'Transport document reference',
      value: formatReviewValueOrNa(sessionData.transportDocumentReference)
    }
  )

  const rolesRows = getSessionConsignmentAddressSections(sessionData).flatMap((section) => {
    if (section.isPermanentAddress) {
      return []
    }

    if (section.isCph) {
      return [{
        key: section.heading,
        value: formatReviewValueOrNa(sessionData[section.sessionCphKey])
      }]
    }

    return [{
      key: section.heading,
      value: formatAddressForReviewValue(sessionData[section.sessionAddressKey])
    }]
  })

  const permanentAddressSection = getSessionConsignmentAddressSections(sessionData)
    .some((section) => section.isPermanentAddress)
    ? {
      title: 'Permanent address',
      rows: buildPermanentAddressReviewRows(sessionData)
    }
    : null

  const uploadedDocuments = ensureUploadedDocuments(sessionData).map((document, index) => ({
    title: `Document ${index + 1}`,
    rows: [
      {
        key: 'Document reference',
        value: formatReviewValueOrNa(document.documentReference)
      },
      {
        key: 'Document type',
        value: formatReviewValueOrNa(document.documentTypeLabel || getDocumentTypeLabel(document.documentType))
      },
      {
        key: 'Date of issue',
        value: formatReviewValueOrNa(document.dateOfIssue)
      },
      {
        key: 'Attachment',
        value: formatReviewValueOrNa(document.fileName)
      }
    ]
  }))

  return {
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    aboutConsignment: {
      importDetailsCard: {
        id: 'review-import-details',
        title: 'Import details',
        changeHref: '/origin-of-the-import',
        rows: importDetailsRows,
        ...reviewCardErrorState(hasOriginDetails(sessionData), 'Import details')
      },
      animalDetailsCard: {
        id: 'review-animal-details',
        title: 'Animal details',
        changeHref: '/what-are-you-importing',
        rows: animalDetailsRows,
        ...reviewCardErrorState(hasCommoditySelection(sessionData), 'Animal details')
      },
      importReasonCard: {
        id: 'review-import-reason',
        title: 'Main reason for import',
        changeHref: '/reason-for-import',
        rows: importReasonRows,
        ...reviewCardErrorState(hasImportReasonComplete(sessionData), 'Main reason for import')
      }
    },
    descriptionOfGoods: {
      commodityDetailsCard: {
        id: 'review-commodity-details',
        title: 'Commodity details',
        changeHref: '/consignment-details',
        sections: commoditySections,
        ...reviewCardErrorState(hasConsignmentDetails(sessionData), 'Commodity details')
      },
      additionalAnimalDetailsCard: {
        id: 'review-additional-animal-details',
        title: 'Additional details',
        changeHref: '/additional-animal-details',
        rows: additionalAnimalRows,
        ...reviewCardErrorState(hasAdditionalAnimalDetailsComplete(sessionData), 'Additional details')
      },
      speciesSections: buildReviewSpeciesSections(sessionData)
    },
    movement: {
      arrivalDetailsCard: {
        id: 'review-arrival-details',
        title: 'Arrival details',
        changeHref: '/arrival-details',
        rows: arrivalDetailsRows,
        ...reviewCardErrorState(hasArrivalDetailsComplete(sessionData), 'Arrival details')
      },
      transitCountriesCard: requiresTransitCountries(sessionData) ? {
        id: 'review-transit-countries',
        title: 'Transit countries',
        changeHref: '/transit-countries',
        rows: [{
          key: 'Countries that the consignment will travel through',
          value: formatReviewValueOrNa(normalizeTransitCountries(sessionData.transitCountries).join(', '))
        }],
        ...reviewCardErrorState(hasTransitCountriesComplete(sessionData), 'Transit countries')
      } : null,
      transportDetailsCard: {
        id: 'review-transport-details',
        title: 'Transport details',
        changeHref: '/transporter',
        rows: [
          {
            key: 'Name',
            value: formatReviewValueOrNa(transporter.name)
          },
          {
            key: 'Address',
            value: formatCommaSeparatedAddressForReviewValue(transporter.address)
          },
          {
            key: 'Country',
            value: getTransporterCountryLabel(sessionData)
          },
          {
            key: 'Approval number',
            value: formatReviewValueOrNa(transporter.approvalNumber)
          },
          {
            key: 'Type',
            value: formatReviewValueOrNa(transporter.type)
          }
        ],
        ...reviewCardErrorState(hasTransportDetailsComplete(sessionData), 'Transport details')
      }
    },
    addresses: {
      rolesCard: {
        id: 'review-roles-and-addresses',
        title: 'Roles and addresses',
        changeHref: '/roles-and-addresses',
        rows: rolesRows,
        permanentAddressSection,
        ...reviewCardErrorState(hasConsignmentAddressesComplete(sessionData), 'Roles and addresses')
      }
    },
    contactAddress: {
      contactAddressCard: {
        id: 'review-contact-address',
        title: 'Contact address for this consignment',
        changeHref: '/contact-address-for-consignment?from=review',
        rows: [{
          key: 'Contact address',
          value: formatContactAddressForReviewValue(sessionData)
        }],
        ...reviewCardErrorState(hasContactAddress(sessionData), 'Contact address for this consignment')
      }
    },
    documents: {
      uploadedDocumentsCard: {
        id: 'review-uploaded-documents',
        title: 'Uploaded documents',
        changeHref: '/upload-documents',
        documents: uploadedDocuments,
        ...reviewCardErrorState(hasUploadedDocuments(sessionData), 'Uploaded documents')
      }
    }
  }
}

function getReviewNotificationViewModelWithErrors (sessionData) {
  const viewModel = getReviewNotificationViewModel(sessionData)
  const errorList = buildReviewErrorList([
    viewModel.aboutConsignment.importDetailsCard,
    viewModel.aboutConsignment.animalDetailsCard,
    viewModel.aboutConsignment.importReasonCard,
    viewModel.descriptionOfGoods.commodityDetailsCard,
    ...viewModel.descriptionOfGoods.speciesSections,
    viewModel.descriptionOfGoods.additionalAnimalDetailsCard,
    viewModel.movement.arrivalDetailsCard,
    ...(viewModel.movement.transitCountriesCard ? [viewModel.movement.transitCountriesCard] : []),
    viewModel.movement.transportDetailsCard,
    viewModel.documents.uploadedDocumentsCard,
    viewModel.addresses.rolesCard,
    viewModel.contactAddress.contactAddressCard
  ])

  return {
    ...viewModel,
    errorList
  }
}

function applyReadOnlyReviewViewModel (viewModel) {
  const stripCard = (card) => {
    if (!card) {
      return card
    }

    return {
      ...card,
      changeHref: null,
      hasError: false,
      errorMessage: null
    }
  }

  return {
    ...viewModel,
    errorList: [],
    aboutConsignment: {
      importDetailsCard: stripCard(viewModel.aboutConsignment.importDetailsCard),
      animalDetailsCard: stripCard(viewModel.aboutConsignment.animalDetailsCard),
      importReasonCard: stripCard(viewModel.aboutConsignment.importReasonCard)
    },
    descriptionOfGoods: {
      commodityDetailsCard: stripCard(viewModel.descriptionOfGoods.commodityDetailsCard),
      additionalAnimalDetailsCard: stripCard(viewModel.descriptionOfGoods.additionalAnimalDetailsCard),
      speciesSections: viewModel.descriptionOfGoods.speciesSections.map(stripCard)
    },
    movement: {
      arrivalDetailsCard: stripCard(viewModel.movement.arrivalDetailsCard),
      transitCountriesCard: stripCard(viewModel.movement.transitCountriesCard),
      transportDetailsCard: stripCard(viewModel.movement.transportDetailsCard)
    },
    addresses: {
      rolesCard: stripCard(viewModel.addresses.rolesCard)
    },
    contactAddress: {
      contactAddressCard: stripCard(viewModel.contactAddress.contactAddressCard)
    },
    documents: {
      uploadedDocumentsCard: stripCard(viewModel.documents.uploadedDocumentsCard)
    }
  }
}

function renderReviewNotificationPage (req, res, options = {}) {
  const sessionData = options.sessionData || req.session.data
  const readOnly = Boolean(options.readOnly)
  const viewModel = readOnly
    ? applyReadOnlyReviewViewModel(getReviewNotificationViewModel(sessionData))
    : getReviewNotificationViewModelWithErrors(sessionData)

  return res.render('review-notification', {
    backLink: options.backLink || '/notification-hub',
    readOnly,
    ...viewModel,
    data: {
      ...sessionData,
      errorList: readOnly ? null : (viewModel.errorList.length ? viewModel.errorList : null)
    }
  })
}

function formatDeclarationDate (date = new Date()) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function isCheckboxChecked (value) {
  if (Array.isArray(value)) {
    return value.includes('yes')
  }

  return value === 'yes'
}

function validateDeclaration (body) {
  const confirmed = isCheckboxChecked(body.declarationConfirmed)

  if (!confirmed) {
    return {
      errorList: [{
        text: 'Confirm that you have reviewed and comply with this declaration',
        href: '#declaration-confirmed'
      }],
      errors: {
        declarationConfirmed: {
          text: 'Confirm that you have reviewed and comply with this declaration'
        }
      }
    }
  }

  return { errorList: [], errors: {} }
}

function hasDeclarationConfirmed (sessionData) {
  return Boolean(sessionData.declarationConfirmedAt)
}

function getConditionalSubmissionItems (sessionData) {
  const items = []

  if (!hasOriginDetails(sessionData)) {
    items.push('complete where this consignment is coming from')
  }

  if (!hasCommoditySelection(sessionData)) {
    items.push('complete what you are importing')
  }

  if (!hasImportReasonComplete(sessionData)) {
    items.push('complete the main reason for import')
  }

  if (!hasConsignmentDetails(sessionData)) {
    items.push('complete the commodity details')
  }

  if (hasAnimalIdentifiersRequired(sessionData) && !hasAnimalIdentifiersComplete(sessionData)) {
    items.push('complete the animal identifier information in the notification')
  }

  if (!hasAdditionalAnimalDetailsComplete(sessionData)) {
    items.push('complete the additional animal details')
  }

  if (!hasArrivalDetailsComplete(sessionData)) {
    items.push('complete the arrival details')
  }

  if (requiresTransitCountries(sessionData) && !hasTransitCountriesComplete(sessionData)) {
    items.push('complete the transit countries')
  }

  if (!hasTransportDetailsComplete(sessionData)) {
    items.push('complete the transport details')
  }

  if (!hasUploadedDocuments(sessionData)) {
    items.push('upload the ITAHC and any other required documents')
  }

  if (!hasConsignmentAddressesComplete(sessionData)) {
    items.push('complete the roles and addresses')
  }

  if (!hasContactAddress(sessionData)) {
    items.push('add a contact address for this consignment')
  }

  return items
}

function renderDeclarationPage (req, res, locals = {}) {
  const sessionData = req.session.data

  return res.render('declaration', {
    backLink: '/review-notification',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    declarationDate: formatDeclarationDate(),
    declarationConfirmed: isCheckboxChecked(locals.declarationConfirmed) ||
      isCheckboxChecked(sessionData.declarationConfirmed),
    data: sessionData,
    ...locals
  })
}

function renderNotificationSubmittedPage (req, res) {
  const sessionData = req.session.data
  const beforeImportItems = Array.isArray(sessionData.conditionalSubmissionItems)
    ? sessionData.conditionalSubmissionItems
    : getConditionalSubmissionItems(sessionData)

  return res.render('notification-submitted', {
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    beforeImportItems,
    isIncompleteSubmission: beforeImportItems.length > 0
  })
}

function getTotalPackageCount (sessionData) {
  const numberOfPackages = sessionData.numberOfPackages || {}

  return Object.values(numberOfPackages).reduce((total, value) => {
    const count = Number(value)

    return Number.isFinite(count) && count > 0 ? total + count : total
  }, 0)
}

function hasAllNotificationHubSectionsComplete (sessionData) {
  if (!hasOriginDetails(sessionData)) {
    return false
  }

  if (!hasCommoditySelection(sessionData)) {
    return false
  }

  if (!hasImportReasonComplete(sessionData)) {
    return false
  }

  if (!hasConsignmentDetails(sessionData)) {
    return false
  }

  if (hasAnimalIdentifiersRequired(sessionData) && !hasAnimalIdentifiersComplete(sessionData)) {
    return false
  }

  if (!hasAdditionalAnimalDetailsComplete(sessionData)) {
    return false
  }

  if (!hasArrivalDetailsComplete(sessionData)) {
    return false
  }

  if (requiresTransitCountries(sessionData) && !hasTransitCountriesComplete(sessionData)) {
    return false
  }

  if (!hasTransportDetailsComplete(sessionData)) {
    return false
  }

  if (!hasUploadedDocuments(sessionData)) {
    return false
  }

  if (!hasConsignmentAddressesComplete(sessionData)) {
    return false
  }

  if (!hasContactAddress(sessionData)) {
    return false
  }

  return true
}

function getNotificationHubViewModel (sessionData) {
  const statusComplete = { text: 'Complete', class: 'govuk-tag--green' }
  const statusTodo = { text: 'To do', class: 'govuk-tag--blue' }
  const totalAnimals = getTotalAnimalCount(sessionData)
  const totalPackages = getTotalPackageCount(sessionData)

  return {
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    animalCountDisplay: totalAnimals > 0 ? String(totalAnimals) : '0',
    packagesDisplay: totalPackages > 0 ? String(totalPackages) : '0',
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
            text: 'What are you importing?',
            href: '/what-are-you-importing',
            status: hasCommoditySelection(sessionData) ? statusComplete : statusTodo
          },
          {
            text: 'Main reason for import',
            href: '/reason-for-import',
            status: hasImportReasonComplete(sessionData) ? statusComplete : statusTodo
          }
        ]
      },
      {
        title: '2. Description of the goods',
        items: [
          {
            text: 'Commodity details',
            href: '/consignment-details',
            status: hasConsignmentDetails(sessionData) ? statusComplete : statusTodo
          },
          ...(hasAnimalIdentifiersRequired(sessionData) ? [{
            text: 'Identification details',
            href: '/animal-identification-details',
            status: hasAnimalIdentifiersComplete(sessionData) ? statusComplete : statusTodo
          }] : []),
          {
            text: 'Additional details',
            href: '/additional-animal-details',
            status: hasAdditionalAnimalDetailsComplete(sessionData) ? statusComplete : statusTodo
          }
        ]
      },
      {
        title: '3. Transport and arrival',
        items: [
          {
            text: 'Arrival details',
            href: '/arrival-details?from=hub',
            status: hasArrivalDetailsComplete(sessionData) ? statusComplete : statusTodo
          },
          ...(requiresTransitCountries(sessionData) ? [{
            text: 'Transit countries',
            href: '/transit-countries?from=hub',
            status: hasTransitCountriesComplete(sessionData) ? statusComplete : statusTodo
          }] : []),
          {
            text: 'Transport details',
            href: '/transporter',
            status: hasTransportDetailsComplete(sessionData) ? statusComplete : statusTodo
          }
        ]
      },
      {
        title: '4. Documents',
        items: [
          {
            text: 'Upload documents',
            href: '/upload-documents',
            status: hasUploadedDocuments(sessionData) ? statusComplete : statusTodo
          }
        ]
      },
      {
        title: '5. Consignment parties',
        items: [
          {
            text: 'Roles and addresses',
            href: '/roles-and-addresses',
            hint: 'Consignor or Exporter, Consignee, Importer and Place of Destination',
            status: hasConsignmentAddressesComplete(sessionData) ? statusComplete : statusTodo
          }
        ]
      },
      {
        title: '6. Contact address',
        items: [
          {
            text: 'Contact address for this consignment',
            href: '/contact-address-for-consignment?from=hub',
            status: hasContactAddress(sessionData) ? statusComplete : statusTodo
          }
        ]
      }
    ]
  }
}

function renderNotificationHubPage (req, res) {
  ensurePrototypeNotificationReference(req.session.data)

  return res.render('notification-hub', {
    ...getNotificationHubViewModel(req.session.data)
  })
}

function buildDashboardPageHref (page, sort) {
  const params = new URLSearchParams()

  if (sort) {
    params.set('sort', sort)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const queryString = params.toString()

  return queryString ? `/?${queryString}` : '/'
}

function buildDashboardPagination (currentPage, totalPages, sort) {
  if (totalPages <= 1) {
    return {
      items: null,
      next: null,
      previous: null
    }
  }

  const items = []

  for (let page = 1; page <= totalPages; page++) {
    items.push({
      number: String(page),
      href: buildDashboardPageHref(page, sort),
      current: page === currentPage
    })
  }

  return {
    items,
    next: currentPage < totalPages
      ? {
          href: buildDashboardPageHref(currentPage + 1, sort),
          text: 'Next'
        }
      : null,
    previous: currentPage > 1
      ? {
          href: buildDashboardPageHref(currentPage - 1, sort),
          text: 'Previous'
        }
      : null
  }
}

function formatDateForDashboard (value) {
  const date = parseArrivalDisplayDateToDate(value)

  if (!date) {
    return value || 'Not applicable'
  }

  return formatDeclarationDate(date)
}

function cloneSubmittedNotificationSnapshot (sessionData) {
  const snapshot = JSON.parse(JSON.stringify(sessionData))

  delete snapshot.errorList
  delete snapshot.errors
  delete snapshot.contactAddressSuccessMessage
  delete snapshot.commoditySearch

  return snapshot
}

function saveSubmittedNotification (sessionData) {
  if (!Array.isArray(sessionData.submittedNotifications)) {
    sessionData.submittedNotifications = []
  }

  const snapshot = cloneSubmittedNotificationSnapshot(sessionData)
  const id = `submitted-${Date.now()}`

  sessionData.submittedNotifications.unshift({
    id,
    reference: snapshot.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    commodities: getReviewAnimalDetailsCommodityCodes(snapshot),
    origin: snapshot.countryOfOrigin || 'Not applicable',
    arrivalDate: formatDateForDashboard(snapshot.arrivalDateAtPort),
    statusText: 'Submitted',
    statusTagClass: 'govuk-tag--green',
    submittedAt: new Date().toISOString(),
    snapshot
  })

  return id
}

function getSubmittedNotificationById (sessionData, submittedId) {
  if (!submittedId) {
    return null
  }

  return (sessionData.submittedNotifications || []).find((notification) => notification.id === submittedId) || null
}

function getDashboardNotificationList (sessionData = {}) {
  const submitted = (sessionData.submittedNotifications || []).map((notification) => ({
    reference: notification.reference,
    commodities: notification.commodities,
    statusText: notification.statusText,
    statusTagClass: notification.statusTagClass,
    origin: notification.origin,
    arrivalDate: notification.arrivalDate,
    viewHref: `/review-notification?submitted=${encodeURIComponent(notification.id)}`
  }))

  const submittedReferences = new Set(submitted.map((notification) => notification.reference))
  const staticNotifications = dashboardData.notifications.filter(
    (notification) => !submittedReferences.has(notification.reference)
  )

  return [...submitted, ...staticNotifications]
}

function buildDashboardResultsText (start, end, total) {
  if (!total) {
    return 'Show 0 of 0 results'
  }

  return `Show ${start}-${end} of ${total} results`
}

function buildDashboardSortItems (selectedValue) {
  return dashboardData.sortItems.map((item) => ({
    ...item,
    selected: selectedValue === item.value
  }))
}

function getDashboardViewModel (sessionData = {}, query = {}) {
  const sort = (query.sort || '').trim()
  const requestedPage = Math.max(1, Number(query.page) || 1)
  const pageSize = dashboardData.pageSize
  const allNotifications = getDashboardNotificationList(sessionData)
  const totalCount = allNotifications.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(requestedPage, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCount)
  const notifications = allNotifications.slice(startIndex, endIndex)

  return {
    alertCounts: {
      alerts: 0,
      errors: 0,
      messages: 0
    },
    notifications,
    sort,
    sortItems: buildDashboardSortItems(sort),
    resultsText: buildDashboardResultsText(startIndex + 1, endIndex, totalCount),
    pagination: buildDashboardPagination(currentPage, totalPages, sort),
    currentPage
  }
}

function renderDashboardPage (req, res) {
  return res.render('dashboard', {
    serviceNavActive: 'dashboard',
    ...getDashboardViewModel(req.session.data, req.query)
  })
}

function buildAddressBookPageHref (page, searchQuery, typeFilter) {
  const params = new URLSearchParams()

  if (searchQuery) {
    params.set('search', searchQuery)
  }

  if (typeFilter) {
    params.set('type', typeFilter)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const queryString = params.toString()

  return queryString ? `/address-book?${queryString}` : '/address-book'
}

function buildAddressBookPagination (currentPage, totalPages, searchQuery, typeFilter) {
  if (totalPages <= 1) {
    return {
      items: null,
      next: null,
      previous: null
    }
  }

  const items = []

  for (let page = 1; page <= totalPages; page++) {
    items.push({
      number: String(page),
      href: buildAddressBookPageHref(page, searchQuery, typeFilter),
      current: page === currentPage
    })
  }

  return {
    items,
    next: currentPage < totalPages
      ? {
          href: buildAddressBookPageHref(currentPage + 1, searchQuery, typeFilter),
          text: 'Next'
        }
      : null,
    previous: currentPage > 1
      ? {
          href: buildAddressBookPageHref(currentPage - 1, searchQuery, typeFilter),
          text: 'Previous'
        }
      : null
  }
}

function buildAddressBookResultsText (start, end, total) {
  if (!total) {
    return 'Showing 0 of 0'
  }

  return `Showing ${start}-${end} of ${total}`
}

function buildAddressBookTypeItems (selectedValue) {
  return addressBookData.types.map((option) => ({
    value: option.value,
    text: option.text,
    selected: selectedValue === option.value
  }))
}

function buildAddressBookAddressTypeSelectItems (selectedValue) {
  return [
    {
      value: '',
      text: 'Select one',
      selected: !selectedValue
    },
    ...addressBookAddressTypes
      .filter((item) => !item.divider)
      .map((item) => ({
        value: item.value,
        text: item.text,
        selected: selectedValue === item.value
      }))
  ]
}

function getAddressBookAddresses (sessionData = {}) {
  const deletedIds = new Set(sessionData.addressBookDeletedAddressIds || [])
  const updatedEntries = sessionData.addressBookUpdatedEntries || {}

  return [
    ...(sessionData.addressBookAddedAddresses || []),
    ...addressBookData.addresses.filter((address) => !deletedIds.has(address.id))
  ].map((address) => {
    const updated = updatedEntries[address.id]

    if (updated) {
      return {
        ...address,
        ...updated,
        viewHref: `/address-book/${address.id}`
      }
    }

    return {
      ...address,
      viewHref: address.viewHref || `/address-book/${address.id}`
    }
  })
}

function findAddressBookEntry (addressId, sessionData = {}) {
  return getAddressBookAddresses(sessionData)
    .find((address) => address.id === addressId) || null
}

function buildAddressBookReturnQuery (returnPath) {
  if (!returnPath || returnPath === '/address-book') {
    return ''
  }

  return `?return=${encodeURIComponent(returnPath)}`
}

function buildAddressViewHref (addressId, returnTo) {
  const baseHref = `/address-book/${encodeURIComponent(addressId)}`

  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return `${baseHref}?return=${encodeURIComponent(returnTo)}`
  }

  return baseHref
}

function getSafeReturnPath (returnTo, fallback = '/address-book') {
  const path = (returnTo || '').trim()

  if (path.startsWith('/') && !path.startsWith('//')) {
    return path
  }

  return fallback
}

function getAllConsignmentAddresses (sessionData = {}) {
  return [
    ...(sessionData.consignmentAddedAddresses || []),
    ...consignmentAddresses
  ]
}

function findViewableAddress (addressId, sessionData = {}) {
  const normalisedId = (addressId || '').trim()

  if (!normalisedId) {
    return null
  }

  const addressBookAddress = getAddressBookAddresses(sessionData)
    .find((address) => address.id === normalisedId)

  if (addressBookAddress) {
    return addressBookAddress
  }

  const consignmentAddress = getAllConsignmentAddresses(sessionData)
    .find((address) => address.id === normalisedId)

  if (consignmentAddress) {
    return consignmentAddress
  }

  const contactAddress = getContactAddresses(sessionData)
    .find((address) => address.id === normalisedId)

  if (contactAddress) {
    return contactAddress
  }

  const transporter = getAllTransporters(sessionData).find((item) => item.id === normalisedId)

  if (transporter) {
    return transporter
  }

  return null
}

function resolveAddressBookDetails (address) {
  if (address.details) {
    return address.details
  }

  if (address.addressLines) {
    return addressBookLookupAddresses.buildManualFieldsFromAddress({
      name: address.name,
      addressLines: address.addressLines,
      country: address.country,
      email: address.email,
      telephone: address.telephone || address.phone
    }, 0)
  }

  const baseId = address.id
    .replace(/-duplicate-\d+$/, '')
    .replace(/-\d+$/, '')

  const lookupAddress = addressBookLookupAddresses.getAddressById(baseId)

  if (lookupAddress?.manual) {
    return lookupAddress.manual
  }

  if (address.address) {
    return addressBookLookupAddresses.buildManualFieldsFromAddress({
      name: address.name,
      addressLines: [address.address],
      country: address.country || ''
    }, 0)
  }

  return {
    nameOrOrganisation: address.name || '',
    addressLine1: '',
    addressLine2: '',
    townOrCity: '',
    county: '',
    postcode: '',
    country: address.country || '',
    email: address.email || '',
    phone: address.telephone || address.phone || ''
  }
}

function buildAddressBookViewSummaryRows (details) {
  const rows = [
    {
      key: { text: 'Name or organisation name' },
      value: { text: details.nameOrOrganisation || '' }
    },
    {
      key: { text: 'Address line 1' },
      value: { text: details.addressLine1 || '' }
    }
  ]

  if (details.addressLine2) {
    rows.push({
      key: { text: 'Address line 2 (optional)' },
      value: { text: details.addressLine2 }
    })
  }

  rows.push(
    {
      key: { text: 'Town or city' },
      value: { text: details.townOrCity || '' }
    },
    {
      key: { text: 'County' },
      value: { text: details.county || '' }
    },
    {
      key: { text: 'Postcode or Zip code' },
      value: { text: details.postcode || '' }
    },
    {
      key: { text: 'Country' },
      value: { text: details.country || '' }
    },
    {
      key: { text: 'Email address' },
      value: { text: details.email || '' }
    },
    {
      key: { text: 'Phone number' },
      value: { text: details.phone || '' }
    }
  )

  return rows
}

function getAddressBookEntryViewModel (addressId, sessionData = {}, options = {}) {
  const address = findViewableAddress(addressId, sessionData)

  if (!address) {
    return null
  }

  const addressBookEntry = findAddressBookEntry(addressId, sessionData)
  const details = resolveAddressBookDetails(address)
  const backLink = options.backLink || '/address-book'
  const returnQuery = buildAddressBookReturnQuery(backLink)
  const encodedAddressId = encodeURIComponent(addressId)

  return {
    serviceNavActive: 'address-book',
    backLink,
    addressId,
    pageHeading: address.name,
    summaryRows: buildAddressBookViewSummaryRows(details),
    canManage: Boolean(addressBookEntry),
    editHref: addressBookEntry ? `/address-book/${encodedAddressId}/edit${returnQuery}` : null,
    deleteAction: addressBookEntry ? `/address-book/${encodedAddressId}/delete${returnQuery}` : null
  }
}

function renderAddressBookViewPage (req, res) {
  const backLink = getSafeReturnPath(req.query.return)
  const viewModel = getAddressBookEntryViewModel(
    req.params.addressId,
    req.session.data,
    { backLink }
  )

  if (!viewModel) {
    return res.redirect(backLink)
  }

  return res.render('address-book-view', viewModel)
}

function updateAddressBookEntry (sessionData, addressId, manualAddress, addressType) {
  const entry = buildAddressBookEntryFromManual(manualAddress, addressType, addressId)
  const addedAddresses = sessionData.addressBookAddedAddresses || []
  const addedIndex = addedAddresses.findIndex((address) => address.id === addressId)

  if (addedIndex >= 0) {
    sessionData.addressBookAddedAddresses[addedIndex] = {
      ...entry,
      viewHref: `/address-book/${addressId}`
    }

    return entry
  }

  if (!sessionData.addressBookUpdatedEntries) {
    sessionData.addressBookUpdatedEntries = {}
  }

  sessionData.addressBookUpdatedEntries[addressId] = {
    ...entry,
    viewHref: `/address-book/${addressId}`
  }

  return entry
}

function deleteAddressBookEntry (sessionData, addressId) {
  if (sessionData.addressBookAddedAddresses) {
    sessionData.addressBookAddedAddresses = sessionData.addressBookAddedAddresses
      .filter((address) => address.id !== addressId)
  }

  const isStaticAddress = addressBookData.addresses.some((address) => address.id === addressId)

  if (isStaticAddress) {
    if (!sessionData.addressBookDeletedAddressIds) {
      sessionData.addressBookDeletedAddressIds = []
    }

    if (!sessionData.addressBookDeletedAddressIds.includes(addressId)) {
      sessionData.addressBookDeletedAddressIds.push(addressId)
    }

    if (sessionData.addressBookUpdatedEntries) {
      delete sessionData.addressBookUpdatedEntries[addressId]
    }
  }
}

function renderAddressBookEditPage (req, res, locals = {}) {
  const addressId = (req.params.addressId || '').trim()
  const sessionData = req.session.data
  const viewBackLink = getSafeReturnPath(req.query.return, `/address-book/${addressId}`)
  const entry = findAddressBookEntry(addressId, sessionData)

  if (!entry) {
    return res.redirect(getSafeReturnPath(req.query.return))
  }

  const details = resolveAddressBookDetails(entry)
  const manualAddress = locals.manualAddress || details
  const returnQuery = buildAddressBookReturnQuery(viewBackLink)

  return res.render('address-book-lookup', {
    serviceNavActive: 'address-book',
    backLink: viewBackLink,
    cancelHref: viewBackLink,
    isEditMode: true,
    pageHeading: 'Edit address details',
    formAction: `/address-book/${encodeURIComponent(addressId)}/edit${returnQuery}`,
    selectedAddressType: entry.type,
    addressTypeItems: buildAddressBookAddressTypeSelectItems(entry.type),
    addressTypeLabel: getAddressBookAddressTypeLabel(entry.type),
    manualAddress,
    showManualAddress: true,
    hideSearch: true,
    countryItems: buildAddressBookCountryItems(manualAddress.country),
    data: sessionData,
    ...locals
  })
}

function buildAddressBookSearchText (parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function formatAddressBookSuccessMessage (name) {
  const trimmed = (name || '').trim()

  if (!trimmed) {
    return 'Address added'
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1).toLowerCase()} address added`
}

function formatAddressBookUpdatedMessage (name) {
  const trimmed = (name || '').trim()

  if (!trimmed) {
    return 'Address updated'
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1).toLowerCase()} address updated`
}

function formatAddressBookDeletedMessage (name) {
  const trimmed = (name || '').trim()

  if (!trimmed) {
    return 'Address deleted'
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1).toLowerCase()} address deleted`
}

function buildAddressBookEntryFromManual (manualAddress, addressType, existingId = null) {
  const typeLabel = getAddressBookAddressTypeLabel(addressType)
  const addressParts = [
    manualAddress.addressLine1,
    manualAddress.addressLine2,
    manualAddress.townOrCity,
    manualAddress.county,
    manualAddress.postcode
  ].filter(Boolean)
  const formattedAddress = addressParts.join(', ')

  return {
    id: existingId || `address-book-added-${Date.now()}`,
    name: manualAddress.nameOrOrganisation,
    type: addressType,
    typeLabel,
    address: formattedAddress,
    country: manualAddress.country,
    details: {
      nameOrOrganisation: manualAddress.nameOrOrganisation,
      addressLine1: manualAddress.addressLine1,
      addressLine2: manualAddress.addressLine2,
      townOrCity: manualAddress.townOrCity,
      county: manualAddress.county,
      postcode: manualAddress.postcode,
      country: manualAddress.country,
      email: manualAddress.email,
      phone: manualAddress.phone
    },
    searchText: buildAddressBookSearchText([
      manualAddress.nameOrOrganisation,
      typeLabel,
      formattedAddress,
      manualAddress.country
    ])
  }
}

const CONSIGNMENT_SECTION_ADDRESS_TYPE_MAP = {
  'place-of-origin': 'place-of-origin',
  'consignor-or-exporter': 'consignor',
  consignee: 'consignee',
  importer: 'importer',
  'place-of-destination': 'place-of-destination'
}

function getConsignmentAddressSectionById (sectionId) {
  return consignmentAddressSections.find((section) => section.id === sectionId && section.selectable)
}

function setAddressBookConsignmentReturn (sessionData, sectionId) {
  const section = getConsignmentAddressSectionById(sectionId)

  if (!section) {
    return false
  }

  const suggestedAddressType = CONSIGNMENT_SECTION_ADDRESS_TYPE_MAP[section.id] || ''

  sessionData.addressBookConsignmentReturn = {
    sectionId: section.id,
    path: section.path,
    heading: section.heading,
    suggestedAddressType
  }

  if (suggestedAddressType) {
    sessionData.addressBookAddressType = suggestedAddressType
  }

  return true
}

function getAddressBookConsignmentReturn (sessionData) {
  return sessionData.addressBookConsignmentReturn || null
}

function clearAddressBookConsignmentReturn (sessionData) {
  delete sessionData.addressBookConsignmentReturn
}

function getAddressBookBackLink (sessionData, defaultLink = '/address-book') {
  const contactReturn = getAddressBookContactReturn(sessionData)
  const consignmentReturn = getAddressBookConsignmentReturn(sessionData)

  if (contactReturn) {
    return contactReturn.path
  }

  if (consignmentReturn) {
    return consignmentReturn.path
  }

  if (hasAddressBookAddressType(sessionData)) {
    return '/address-book/add'
  }

  return defaultLink
}

function getAddressBookCancelHref (sessionData) {
  const contactReturn = getAddressBookContactReturn(sessionData)
  const consignmentReturn = getAddressBookConsignmentReturn(sessionData)

  if (contactReturn) {
    return contactReturn.path
  }

  return consignmentReturn ? consignmentReturn.path : '/'
}

function buildConsignmentAddressFromManual (manualAddress, sectionId) {
  const townPostcode = [
    manualAddress.townOrCity,
    manualAddress.county,
    manualAddress.postcode
  ].filter(Boolean).join(', ')
  const addressLines = [
    manualAddress.addressLine1,
    manualAddress.addressLine2,
    townPostcode
  ].filter(Boolean)

  return {
    id: `consignment-added-${Date.now()}`,
    type: sectionId,
    name: manualAddress.nameOrOrganisation,
    addressLines,
    country: manualAddress.country,
    email: manualAddress.email || '',
    telephone: manualAddress.phone || ''
  }
}

function saveAddressBookEntry (sessionData, manualAddress, options = {}) {
  const addressType = sessionData.addressBookAddressType
  const consignmentReturn = options.consignmentReturn || getAddressBookConsignmentReturn(sessionData)
  const contactReturn = options.contactReturn || getAddressBookContactReturn(sessionData)
  const entry = buildAddressBookEntryFromManual(manualAddress, addressType)

  if (!sessionData.addressBookAddedAddresses) {
    sessionData.addressBookAddedAddresses = []
  }

  sessionData.addressBookAddedAddresses.unshift({
    ...entry,
    viewHref: `/address-book/${entry.id}`
  })

  if (consignmentReturn) {
    const consignmentAddress = buildConsignmentAddressFromManual(manualAddress, consignmentReturn.sectionId)
    const section = getConsignmentAddressSectionById(consignmentReturn.sectionId)

    if (!sessionData.consignmentAddedAddresses) {
      sessionData.consignmentAddedAddresses = []
    }

    sessionData.consignmentAddedAddresses.unshift(consignmentAddress)

    if (section) {
      sessionData[section.sessionAddressIdKey] = consignmentAddress.id
      sessionData[section.sessionAddressKey] = {
        name: consignmentAddress.name,
        addressLines: consignmentAddress.addressLines,
        country: consignmentAddress.country
      }
    }

    clearAddressBookConsignmentReturn(sessionData)
    sessionData.consignmentAddressSuccessMessage = formatAddressBookSuccessMessage(entry.name)
  } else if (contactReturn) {
    const contactAddress = buildContactAddressFromManual(manualAddress)

    if (!sessionData.contactAddedAddresses) {
      sessionData.contactAddedAddresses = []
    }

    sessionData.contactAddedAddresses.unshift(contactAddress)
    syncContactAddressSession(sessionData, contactAddress)
    clearAddressBookContactReturn(sessionData)
    sessionData.contactAddressSuccessMessage = formatAddressBookSuccessMessage(entry.name)
  } else {
    sessionData.addressBookSuccessMessage = formatAddressBookSuccessMessage(entry.name)
  }

  sessionData.addressBookShowManualAddress = false
  sessionData.addressBookManualAddress = null
  sessionData.addressBookLookup = null
  sessionData.addressBookLookupAddressId = null
  sessionData.addressBookAddressType = null

  return {
    entry,
    redirectTo: consignmentReturn
      ? consignmentReturn.path
      : contactReturn
        ? contactReturn.path
        : '/address-book'
  }
}

function getAddressBookViewModel (query = {}, sessionData = {}) {
  const searchQuery = (query.search || '').trim()
  const typeFilter = (query.type || '').trim()
  const requestedPage = Math.max(1, Number(query.page) || 1)
  const pageSize = addressBookData.pageSize
  const normalisedSearch = searchQuery.toLowerCase()

  let addresses = getAddressBookAddresses(sessionData)

  if (typeFilter) {
    addresses = addresses.filter((address) => address.type === typeFilter)
  }

  if (normalisedSearch) {
    addresses = addresses.filter((address) => address.searchText.includes(normalisedSearch))
  }

  const totalCount = addresses.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(requestedPage, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedAddresses = addresses.slice(startIndex, startIndex + pageSize)
  const rangeStart = totalCount ? startIndex + 1 : 0
  const rangeEnd = totalCount ? startIndex + paginatedAddresses.length : 0

  return {
    serviceNavActive: 'address-book',
    searchQuery,
    typeFilter,
    typeItems: buildAddressBookTypeItems(typeFilter),
    addresses: paginatedAddresses,
    allAddressesJson: JSON.stringify(getAddressBookAddresses(sessionData)),
    resultsText: buildAddressBookResultsText(rangeStart, rangeEnd, totalCount),
    pagination: buildAddressBookPagination(currentPage, totalPages, searchQuery, typeFilter)
  }
}

function renderAddressBookPage (req, res) {
  const sessionData = req.session.data
  const successMessage = sessionData.addressBookSuccessMessage || null

  if (successMessage) {
    delete sessionData.addressBookSuccessMessage
  }

  return res.render('address-book', {
    ...getAddressBookViewModel(req.query, sessionData),
    successMessage
  })
}

const addressBookAddressTypeValues = addressBookAddressTypes
  .filter((item) => !item.divider)
  .map((item) => item.value)

function renderAddressBookAddPage (req, res, locals = {}) {
  const sessionData = req.session.data

  return res.render('address-book-add', {
    serviceNavActive: 'address-book',
    backLink: '/address-book',
    addressTypeOptions: addressBookAddressTypes,
    selectedAddressType: locals.selectedAddressType != null
      ? locals.selectedAddressType
      : sessionData.addressBookAddressType || '',
    data: sessionData,
    ...locals
  })
}

function validateAddressBookAddressType (addressType) {
  return {
    errors: {},
    errorList: [],
    value: (addressType || '').trim()
  }
}

function getAddressBookAddressTypeLabel (addressType) {
  const match = addressBookAddressTypes.find((item) => item.value === addressType)

  return match ? match.text : addressType
}

function hasAddressBookAddressType (sessionData) {
  return addressBookAddressTypeValues.includes(sessionData.addressBookAddressType)
}

function redirectIfNoAddressBookAddressType (req, res) {
  const sessionData = req.session.data

  if (getAddressBookConsignmentReturn(sessionData) ||
    getAddressBookContactReturn(sessionData) ||
    hasAddressBookAddressType(sessionData)) {
    return false
  }

  res.redirect('/address-book/add')
  return true
}

function renderAddressBookLookupPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const consignmentReturn = getAddressBookConsignmentReturn(sessionData)
  const selectedAddressType = locals.selectedAddressType != null
    ? locals.selectedAddressType
    : sessionData.addressBookAddressType || consignmentReturn?.suggestedAddressType || ''
  const manualAddress = locals.manualAddress || getAddressBookManualAddress(sessionData)
  const showManualAddress = locals.showManualAddress != null
    ? locals.showManualAddress
    : Boolean(sessionData.addressBookShowManualAddress || sessionData.addressBookLookupAddressId)

  return res.render('address-book-lookup', {
    serviceNavActive: 'address-book',
    backLink: getAddressBookBackLink(sessionData),
    cancelHref: getAddressBookCancelHref(sessionData),
    isEditMode: false,
    pageHeading: 'Add address details',
    formAction: '/address-book/add/lookup',
    consignmentReturn,
    selectedAddressType,
    addressTypeItems: buildAddressBookAddressTypeSelectItems(selectedAddressType),
    addressTypeLabel: getAddressBookAddressTypeLabel(selectedAddressType),
    addressLookup: locals.addressLookup != null
      ? locals.addressLookup
      : sessionData.addressBookLookup || '',
    selectedLookupAddressId: locals.selectedLookupAddressId != null
      ? locals.selectedLookupAddressId
      : sessionData.addressBookLookupAddressId || '',
    lookupAddressesJson: JSON.stringify(addressBookLookupAddresses.addresses),
    manualAddress,
    showManualAddress,
    countryItems: buildAddressBookCountryItems(manualAddress.country),
    data: sessionData,
    ...locals
  })
}

function buildInternalMarketPurposeSelectItems (selectedValue) {
  return internalMarketPurposes.map((purpose) => ({
    value: purpose.value,
    text: purpose.text,
    hint: purpose.hint
      ? {
          text: purpose.hint
        }
      : null,
    checked: selectedValue === purpose.value
  }))
}

function buildInternalMarketPurposeItems (selectedValue) {
  return internalMarketPurposes.map((purpose) => ({
      value: purpose.value,
      text: purpose.text,
      hint: purpose.hint
        ? {
            text: purpose.hint
          }
        : null,
      checked: selectedValue === purpose.value
    }))
}

function buildDestinationCountryItems (selectedValue) {
  return [
    {
      value: '',
      text: 'Select one',
      selected: !selectedValue
    },
    ...countryOptions.map((country) => ({
      value: country.value,
      text: country.label,
      selected: selectedValue === country.value
    }))
  ]
}

function buildAddressBookCountryItems (selectedValue) {
  const options = [
    { value: 'United Kingdom', label: 'United Kingdom' },
    ...countryOptions
  ].sort((left, right) => left.label.localeCompare(right.label))

  return options.map((country) => ({
    value: country.value,
    text: country.label,
    selected: selectedValue === country.value
  }))
}

function getManualAddressFromLookup (addressId) {
  if (!addressId) {
    return null
  }

  const lookupAddress = addressBookLookupAddresses.getAddressById(addressId)

  return lookupAddress ? lookupAddress.manual : null
}

function getAddressDetailsFromLookup (addressId) {
  const manual = getManualAddressFromLookup(addressId)

  if (!manual) {
    return null
  }

  return {
    nameOrOrganisation: manual.nameOrOrganisation,
    addressLine1: manual.addressLine1,
    addressLine2: manual.addressLine2,
    townOrCity: manual.townOrCity,
    county: manual.county,
    postcode: manual.postcode,
    country: manual.country
  }
}

function getAddressBookManualAddress (sessionData) {
  const fromLookup = getAddressDetailsFromLookup(sessionData.addressBookLookupAddressId)

  return {
    nameOrOrganisation: '',
    addressLine1: '',
    addressLine2: '',
    townOrCity: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
    email: '',
    phone: '',
    ...(fromLookup || {}),
    ...(sessionData.addressBookManualAddress || {})
  }
}

function parseAddressBookManualAddressBody (body) {
  return {
    nameOrOrganisation: (body.addressBookManualName || '').trim(),
    addressLine1: (body.addressBookManualAddressLine1 || '').trim(),
    addressLine2: (body.addressBookManualAddressLine2 || '').trim(),
    townOrCity: (body.addressBookManualTownOrCity || '').trim(),
    county: (body.addressBookManualCounty || '').trim(),
    postcode: (body.addressBookManualPostcode || '').trim(),
    country: (body.addressBookManualCountry || '').trim(),
    email: (body.addressBookManualEmail || '').trim(),
    phone: (body.addressBookManualPhone || '').trim()
  }
}

function buildExitBorderControlPostItems (selectedValue) {
  return [
    {
      value: '',
      text: 'Select one',
      selected: !selectedValue
    },
    ...exitBorderControlPosts.map((post) => ({
      value: post,
      text: post,
      selected: selectedValue === post
    }))
  ]
}

function buildImportReasonItems (
  selectedValue,
  internalMarketConditionalHtml,
  transhipmentConditionalHtml,
  transitConditionalHtml,
  temporaryAdmissionHorsesConditionalHtml
) {
  return importReasons.map((reason) => {
    const item = {
      value: reason.value,
      text: reason.text,
      hint: {
        text: reason.hint
      },
      checked: selectedValue === reason.value
    }

    if (reason.value === 'Internal market' && internalMarketConditionalHtml) {
      item.conditional = {
        html: internalMarketConditionalHtml
      }
    }

    if (reason.value === 'Transhipment or onward travel' && transhipmentConditionalHtml) {
      item.conditional = {
        html: transhipmentConditionalHtml
      }
    }

    if (reason.value === 'Transit' && transitConditionalHtml) {
      item.conditional = {
        html: transitConditionalHtml
      }
    }

    if (reason.value === 'Temporary admission horses' && temporaryAdmissionHorsesConditionalHtml) {
      item.conditional = {
        html: temporaryAdmissionHorsesConditionalHtml
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
    data: sessionData,
    ...locals
  })
}

function renderConsignmentDetailsPage (req, res, locals = {}) {
  const sessionData = req.session.data

  return res.render('consignment-details', {
    backLink: '/what-are-you-importing',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    selectedCommodityRows: getSelectedCommodityRows(sessionData),
    commodityGroups: getConsignmentCommodityGroups(sessionData),
    data: sessionData,
    ...locals
  })
}

function renderAdditionalAnimalDetailsPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const config = getAdditionalAnimalDetailsConfig(sessionData)

  return res.render('additional-animal-details', {
    backLink: getAdditionalAnimalDetailsBackLink(sessionData),
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
    return res.redirect('/additional-animal-details')
  }

  const commodityGroups = buildAnimalIdentificationCommodityGroups(sessionData, locals)

  return res.render('animal-identification-details', {
    backLink: '/consignment-details',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    selectedCommodityRows: getSelectedCommodityRows(sessionData),
    commodityGroups,
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
  const selectedTranshipmentDestinationCountry = Object.prototype.hasOwnProperty.call(locals, 'selectedTranshipmentDestinationCountry')
    ? locals.selectedTranshipmentDestinationCountry
    : sessionData.transhipmentDestinationCountry
  const selectedTransitExitBorderControlPost = Object.prototype.hasOwnProperty.call(locals, 'selectedTransitExitBorderControlPost')
    ? locals.selectedTransitExitBorderControlPost
    : sessionData.transitExitBorderControlPost
  const selectedTransitDestinationCountry = Object.prototype.hasOwnProperty.call(locals, 'selectedTransitDestinationCountry')
    ? locals.selectedTransitDestinationCountry
    : sessionData.transitDestinationCountry
  const selectedTemporaryAdmissionExitDate = Object.prototype.hasOwnProperty.call(locals, 'selectedTemporaryAdmissionExitDate')
    ? locals.selectedTemporaryAdmissionExitDate
    : sessionData.temporaryAdmissionExitDate
  const selectedTemporaryAdmissionPortOfExit = Object.prototype.hasOwnProperty.call(locals, 'selectedTemporaryAdmissionPortOfExit')
    ? locals.selectedTemporaryAdmissionPortOfExit
    : sessionData.temporaryAdmissionPortOfExit

  return res.app.render('partials/internal-market-purpose-select', {
    data: sessionData,
    internalMarketPurposeItems: buildInternalMarketPurposeItems(selectedInternalMarketPurpose)
  }, (err, internalMarketConditionalHtml) => {
    if (err) {
      throw err
    }

    return res.app.render('partials/transhipment-destination-country-select', {
      data: sessionData,
      destinationCountryItems: buildDestinationCountryItems(selectedTranshipmentDestinationCountry)
    }, (selectErr, transhipmentConditionalHtml) => {
      if (selectErr) {
        throw selectErr
      }

      return res.app.render('partials/transit-options-select', {
        data: sessionData,
        exitBorderControlPostItems: buildExitBorderControlPostItems(selectedTransitExitBorderControlPost),
        destinationCountryItems: buildDestinationCountryItems(selectedTransitDestinationCountry)
      }, (transitErr, transitConditionalHtml) => {
        if (transitErr) {
          throw transitErr
        }

        return res.app.render('partials/temporary-admission-horses-select', {
          data: {
            ...sessionData,
            temporaryAdmissionExitDate: selectedTemporaryAdmissionExitDate,
            temporaryAdmissionPortOfExit: selectedTemporaryAdmissionPortOfExit
          },
          exitBorderControlPostItems: buildExitBorderControlPostItems(selectedTemporaryAdmissionPortOfExit)
        }, (temporaryAdmissionErr, temporaryAdmissionHorsesConditionalHtml) => {
          if (temporaryAdmissionErr) {
            throw temporaryAdmissionErr
          }

          return res.render('reason-for-import', {
            backLink: '/what-are-you-importing',
            notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
            data: sessionData,
            importReasonItems: buildImportReasonItems(
              selectedImportReason,
              internalMarketConditionalHtml,
              transhipmentConditionalHtml,
              transitConditionalHtml,
              temporaryAdmissionHorsesConditionalHtml
            ),
            ...locals
          })
        })
      })
    })
  })
}

const documentTypeOptions = [
  { value: 'itahc', text: 'Intra Trade Animal Health Certificate (ITAHC)' },
  { value: 'veterinary-health-certificate', text: 'Veterinary health certificate' },
  { value: 'air-waybill', text: 'Air waybill' },
  { value: 'import-permit', text: 'Import permit' },
  { value: 'letter-of-authority-directive-2008-61-ec', text: 'Letter of authority (Directive 2008/61/EC)' },
  { value: 'commercial-invoice', text: 'Commercial invoice' },
  { value: 'sea-waybill', text: 'Sea waybill' },
  { value: 'rail-waybill', text: 'Rail waybill' },
  { value: 'bill-of-lading', text: 'Bill of lading' },
  { value: 'catch-certificate', text: 'Catch certificate' },
  { value: 'laboratory-sampling-results-for-aflatoxin-reg-2019-1793', text: 'Laboratory sampling results for aflatoxin (Reg 2019/1793)' },
  { value: 'health-certificate', text: 'Health certificate' },
  { value: 'journey-log', text: 'Journey log' },
  { value: 'other', text: 'Other' }
]

const documentTypeValues = documentTypeOptions.map((option) => option.value)
const MAX_UPLOADED_DOCUMENTS = 15
const VIRUS_CHECK_DELAY_MS = 2500

function getDocumentTypeLabel (documentType) {
  const match = documentTypeOptions.find((option) => option.value === documentType)

  return match ? match.text : documentType
}

function buildDocumentTypeItems (selectedValue) {
  return [
    {
      value: '',
      text: 'Select one',
      selected: !selectedValue
    },
    ...documentTypeOptions.map((option) => ({
      ...option,
      selected: selectedValue === option.value
    }))
  ]
}

function ensureUploadedDocuments (sessionData) {
  if (!Array.isArray(sessionData.uploadedDocuments)) {
    sessionData.uploadedDocuments = []
  }

  return sessionData.uploadedDocuments
}

function getUploadedDocumentsForDisplay (sessionData) {
  return ensureUploadedDocuments(sessionData).map((document) => ({
    ...document,
    documentTypeLabel: document.documentTypeLabel || getDocumentTypeLabel(document.documentType),
    status: {
      text: document.virusStatus === 'passed' ? 'Check completed' : 'Scanning for virus',
      class: document.virusStatus === 'passed' ? 'govuk-tag--green' : 'govuk-tag--blue'
    }
  }))
}

function hasUploadedDocuments (sessionData) {
  return ensureUploadedDocuments(sessionData).length > 0
}

function parseUploadDocumentBody (body) {
  return {
    documentReference: (body.documentReference || '').trim(),
    documentType: (body.documentType || '').trim(),
    dateOfIssue: (body.dateOfIssue || '').trim(),
    attachmentFileName: (body.attachmentFileName || '').trim()
  }
}

function validateUploadDocument (values, sessionData) {
  return { errors: {}, errorList: [], values }
}

function addUploadedDocument (sessionData, values) {
  const documents = ensureUploadedDocuments(sessionData)

  documents.push({
    id: `doc-${Date.now()}-${documents.length + 1}`,
    documentReference: values.documentReference,
    documentType: values.documentType,
    documentTypeLabel: getDocumentTypeLabel(values.documentType),
    dateOfIssue: values.dateOfIssue,
    fileName: values.attachmentFileName,
    virusStatus: 'uploading',
    addedAt: Date.now()
  })
}

function markUploadedDocumentVirusCheckPassed (sessionData, documentId) {
  const document = ensureUploadedDocuments(sessionData).find((item) => item.id === documentId)

  if (document && document.virusStatus === 'uploading') {
    document.virusStatus = 'passed'
  }

  return document
}

function removeUploadedDocument (sessionData, documentId) {
  const documents = ensureUploadedDocuments(sessionData)
  const removeIndex = documents.findIndex((document) => document.id === documentId)

  if (removeIndex === -1) {
    return
  }

  documents.splice(removeIndex, 1)
}

function resetUploadDocumentFormState (sessionData) {
  sessionData.errorList = null
  sessionData.errors = null
  delete sessionData.documentReference
  delete sessionData.documentType
  delete sessionData.dateOfIssue
  delete sessionData.attachmentFileName
  delete sessionData.attachment
}

function renderUploadDocumentsPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const formValues = locals.formValues || {
    documentReference: '',
    documentType: '',
    dateOfIssue: '',
    attachmentFileName: ''
  }

  return res.render('upload-documents', {
    backLink: '/notification-hub',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    documentTypeItems: buildDocumentTypeItems(formValues.documentType),
    uploadedDocuments: getUploadedDocumentsForDisplay(sessionData),
    formValues,
    data: sessionData,
    ...locals
  })
}

router.get('/create-notification', (req, res) => {
  resetNotificationJourneySession(req.session.data)
  return res.redirect('/origin-of-the-import')
})

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

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.countryOfOrigin = countryOfOrigin || null
  req.session.data.regionOfOriginRequired = regionOfOriginRequired || null
  req.session.data.internalReference = internalReference || null

  if (regionOfOriginRequired === 'Yes' && countryOfOrigin && regionOfOriginCodeSuffix) {
    const countryPrefix = getCountryRegionPrefix(countryOfOrigin)
    req.session.data.regionOfOriginCodeSuffix = regionOfOriginCodeSuffix
    req.session.data.regionOfOriginCode = countryPrefix
      ? `${countryPrefix}-${regionOfOriginCodeSuffix}`
      : regionOfOriginCodeSuffix
  } else {
    req.session.data.regionOfOriginCodeSuffix = regionOfOriginRequired === 'Yes'
      ? (regionOfOriginCodeSuffix || null)
      : null
    req.session.data.regionOfOriginCode = null
  }

  return res.redirect('/what-are-you-importing')
})

router.get('/what-are-you-importing', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (req.query.resetSearch === '1' || req.query.resetSearch === 'true') {
    delete req.session.data.commoditySearch
    return res.redirect('/what-are-you-importing')
  }

  return renderWhatAreYouImportingPage(req, res)
})

router.post('/what-are-you-importing', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  const commoditySelections = parseCommoditySelections(req.body.commoditySelections)
  const selectedSpecies = normalizeSelectedSpecies(req.body.selectedSpecies)
  const commoditySearch = (req.body.commoditySearch || '').trim()

  if (req.body.action === 'hub') {
    req.session.data.commoditySearch = commoditySearch

    if (applySpeciesSelectionToSession(req.session.data, selectedSpecies)) {
      req.session.data.commoditySelections = commoditySelections.length
        ? commoditySelections
        : req.session.data.commoditySelections
    }

    return res.redirect('/notification-hub')
  }

  applySpeciesSelectionToSession(req.session.data, selectedSpecies)
  if (commoditySelections.length) {
    req.session.data.commoditySelections = commoditySelections
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.commoditySearch = commoditySearch

  return res.redirect('/reason-for-import')
})

router.get('/consignment-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (redirectIfNoImportReason(req, res)) {
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

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  const removeCommodityId = (req.body.removeCommodity || '').trim()
  const removeSpeciesId = (req.body.removeSpecies || '').trim()

  if (removeCommodityId && getCommodityById(removeCommodityId)) {
    removeCommodityFromSession(req.session.data, removeCommodityId)
    req.session.data.errorList = null
    req.session.data.errors = null

    if (!hasCommoditySelection(req.session.data)) {
      return res.redirect('/what-are-you-importing')
    }

    return res.redirect('/consignment-details')
  }

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
  const numberOfPackages = parseNumberOfPackages(req.body, speciesIds)
  const action = (req.body.action || '').trim()

  const animalValidation = validateNumberOfAnimals(numberOfAnimals, speciesIds)
  const packagingValidation = validateNumberOfPackages(numberOfPackages, speciesIds)
  const errors = {
    ...animalValidation.errors,
    ...packagingValidation.errors
  }
  const errorList = [
    ...animalValidation.errorList,
    ...packagingValidation.errorList
  ]

  if (errorList.length > 0) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors
    req.session.data.numberOfAnimals = numberOfAnimals
    req.session.data.numberOfPackages = numberOfPackages

    return renderConsignmentDetailsPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.numberOfAnimals = numberOfAnimals
  req.session.data.numberOfPackages = numberOfPackages

  if (action === 'hub') {
    return res.redirect('/notification-hub')
  }

  return res.redirect(getPostConsignmentDetailsPath(req.session.data))
})

router.get('/additional-animal-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  if (redirectIfNoConsignmentDetails(req, res)) {
    return
  }

  if (redirectIfNoAnimalIdentifiers(req, res)) {
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

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  if (redirectIfNoConsignmentDetails(req, res)) {
    return
  }

  if (redirectIfNoAnimalIdentifiers(req, res)) {
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

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.certificationPurpose = config.showCertificationPurposeQuestion
    ? (certificationPurpose || null)
    : null
  req.session.data.unweanedAnimals = config.showUnweanedQuestion
    ? (unweanedAnimals || null)
    : null

  return res.redirect(getNextJourneyPath('/additional-animal-details', req.session.data))
})

router.get('/prototype/reason-for-import', (req, res) => {
  seedPrototypeSessionForReasonForImport(req.session.data)

  return res.redirect('/reason-for-import')
})

router.get('/reason-for-import', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  return renderReasonForImportPage(req, res)
})

router.get('/', (req, res) => {
  return renderDashboardPage(req, res)
})

router.get('/dashboard', (req, res) => {
  const queryString = new URLSearchParams(req.query).toString()

  return res.redirect(queryString ? `/?${queryString}` : '/')
})

router.get('/notification-hub', (req, res) => {
  return renderNotificationHubPage(req, res)
})

router.get('/address-book', (req, res) => {
  return renderAddressBookPage(req, res)
})

router.get('/address-book/add', (req, res) => {
  const fromSection = (req.query.from || '').trim()

  if (fromSection === CONTACT_ADDRESS_RETURN_ID) {
    setAddressBookContactReturn(req.session.data)
    return res.redirect('/address-book/add/lookup')
  }

  if (fromSection) {
    if (!setAddressBookConsignmentReturn(req.session.data, fromSection)) {
      return res.redirect('/address-book/add/lookup')
    }

    return res.redirect('/address-book/add/lookup')
  }

  clearAddressBookConsignmentReturn(req.session.data)
  req.session.data.addressBookAddressType = null
  req.session.data.addressBookShowManualAddress = false
  req.session.data.addressBookManualAddress = null
  req.session.data.addressBookLookup = null
  req.session.data.addressBookLookupAddressId = null

  return renderAddressBookAddPage(req, res)
})

router.post('/address-book/add', (req, res) => {
  const validation = validateAddressBookAddressType(req.body.addressType)

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.addressBookAddressType = validation.value || null

  if (!addressBookAddressTypeValues.includes(validation.value)) {
    return res.redirect('/address-book')
  }

  return res.redirect('/address-book/add/lookup')
})

router.get('/address-book/add/lookup', (req, res) => {
  const fromSection = (req.query.from || '').trim()

  if (fromSection === CONTACT_ADDRESS_RETURN_ID) {
    setAddressBookContactReturn(req.session.data)
  } else if (fromSection) {
    setAddressBookConsignmentReturn(req.session.data, fromSection)
  }

  if (redirectIfNoAddressBookAddressType(req, res)) {
    return
  }

  return renderAddressBookLookupPage(req, res)
})

router.post('/address-book/add/lookup', (req, res) => {
  const action = (req.body.action || '').trim()
  const addressBookLookupAddressId = (req.body.addressBookLookupAddressId || '').trim()
  const lookupManualAddress = getAddressDetailsFromLookup(addressBookLookupAddressId)
  const manualAddress = {
    ...(lookupManualAddress || {}),
    ...parseAddressBookManualAddressBody(req.body)
  }

  if (action === 'cancel') {
    req.session.data.errorList = null
    req.session.data.errors = null
    req.session.data.addressBookShowManualAddress = false
    req.session.data.addressBookManualAddress = null
    req.session.data.addressBookLookup = null
    req.session.data.addressBookLookupAddressId = null
    req.session.data.addressBookAddressType = null

    return res.redirect(getAddressBookCancelHref(req.session.data))
  }

  if (redirectIfNoAddressBookAddressType(req, res)) {
    return
  }

  req.session.data.errorList = null
  req.session.data.errors = null

  const { redirectTo } = saveAddressBookEntry(req.session.data, manualAddress)

  return res.redirect(redirectTo)
})

router.get('/address-book/:addressId/edit', (req, res) => {
  return renderAddressBookEditPage(req, res)
})

router.post('/address-book/:addressId/edit', (req, res) => {
  const addressId = (req.params.addressId || '').trim()
  const action = (req.body.action || '').trim()
  const returnPath = getSafeReturnPath(req.query.return, `/address-book/${addressId}`)
  const entry = findAddressBookEntry(addressId, req.session.data)

  if (!entry) {
    return res.redirect(getSafeReturnPath(req.query.return, '/address-book'))
  }

  if (action === 'cancel') {
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(returnPath)
  }

  const manualAddress = parseAddressBookManualAddressBody(req.body)

  updateAddressBookEntry(req.session.data, addressId, manualAddress, entry.type)
  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.addressBookSuccessMessage = formatAddressBookUpdatedMessage(manualAddress.nameOrOrganisation)

  return res.redirect('/address-book')
})

router.post('/address-book/:addressId/delete', (req, res) => {
  const addressId = (req.params.addressId || '').trim()
  const returnPath = getSafeReturnPath(req.query.return, '/address-book')
  const entry = findAddressBookEntry(addressId, req.session.data)

  if (entry) {
    deleteAddressBookEntry(req.session.data, entry.id)
    req.session.data.addressBookSuccessMessage = formatAddressBookDeletedMessage(entry.name)
  }

  return res.redirect(returnPath.startsWith(`/address-book/${addressId}`) ? '/address-book' : returnPath)
})

router.get('/address-book/:addressId', (req, res) => {
  return renderAddressBookViewPage(req, res)
})

router.get('/review-notification', (req, res) => {
  const submittedId = (req.query.submitted || '').trim()
  const submittedNotification = getSubmittedNotificationById(req.session.data, submittedId)

  if (submittedId && !submittedNotification) {
    return res.redirect('/')
  }

  if (submittedNotification) {
    return renderReviewNotificationPage(req, res, {
      sessionData: submittedNotification.snapshot,
      readOnly: true,
      backLink: '/'
    })
  }

  ensurePrototypeNotificationReference(req.session.data)

  return renderReviewNotificationPage(req, res)
})

router.post('/review-notification', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  return res.redirect('/declaration')
})

router.get('/declaration', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  return renderDeclarationPage(req, res)
})

router.post('/declaration', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const validation = validateDeclaration(req.body)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors

    return renderDeclarationPage(req, res, {
      declarationConfirmed: isCheckboxChecked(req.body.declarationConfirmed)
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.declarationConfirmedAt = formatDeclarationDate()
  req.session.data.conditionalSubmissionItems = getConditionalSubmissionItems(req.session.data)
  saveSubmittedNotification(req.session.data)

  return res.redirect('/notification-submitted')
})

router.get('/notification-submitted', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (!hasDeclarationConfirmed(req.session.data)) {
    return res.redirect('/declaration')
  }

  return renderNotificationSubmittedPage(req, res)
})

router.get('/upload-documents', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)
  resetUploadDocumentFormState(req.session.data)

  return renderUploadDocumentsPage(req, res)
})

router.post('/upload-documents/virus-check/:documentId', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const document = markUploadedDocumentVirusCheckPassed(req.session.data, req.params.documentId)

  return res.json({
    virusStatus: document ? document.virusStatus : null
  })
})

router.post('/upload-documents', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const action = (req.body.action || '').trim()
  const values = parseUploadDocumentBody(req.body)

  if (action.startsWith('remove:')) {
    const documentId = action.slice('remove:'.length)

    removeUploadedDocument(req.session.data, documentId)
    resetUploadDocumentFormState(req.session.data)

    return res.redirect('/upload-documents')
  }

  if (action === 'add-another') {
    const validation = validateUploadDocument(values, req.session.data)

    if (validation.errorList.length) {
      req.session.data.errorList = validation.errorList
      req.session.data.errors = validation.errors

      return renderUploadDocumentsPage(req, res, {
        formValues: values
      })
    }

    resetUploadDocumentFormState(req.session.data)
    addUploadedDocument(req.session.data, values)

    return res.redirect('/upload-documents')
  }

  if (action === 'hub') {
    resetUploadDocumentFormState(req.session.data)

    return res.redirect('/notification-hub')
  }

  if (action === 'continue') {
    const hasDocumentInput = values.documentReference ||
      values.documentType ||
      values.dateOfIssue ||
      values.attachmentFileName

    if (hasDocumentInput) {
      const validation = validateUploadDocument(values, req.session.data)

      if (validation.errorList.length) {
        req.session.data.errorList = validation.errorList
        req.session.data.errors = validation.errors

        return renderUploadDocumentsPage(req, res, {
          formValues: values
        })
      }

      addUploadedDocument(req.session.data, values)
    }

    resetUploadDocumentFormState(req.session.data)

    return res.redirect(getNextJourneyPath('/upload-documents', req.session.data))
  }

  resetUploadDocumentFormState(req.session.data)

  return res.redirect('/notification-hub')
})

router.post('/reason-for-import', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  const importReason = (req.body.importReason || '').trim()
  const internalMarketPurpose = (req.body.internalMarketPurpose || '').trim()
  const transhipmentDestinationCountry = (req.body.transhipmentDestinationCountry || '').trim()
  const transitExitBorderControlPost = (req.body.transitExitBorderControlPost || '').trim()
  const transitDestinationCountry = (req.body.transitDestinationCountry || '').trim()
  const temporaryAdmissionExitDate = (req.body.temporaryAdmissionExitDate || '').trim()
  const temporaryAdmissionPortOfExit = (req.body.temporaryAdmissionPortOfExit || '').trim()

  if (req.body.action === 'hub') {
    if (importReasonValues.includes(importReason)) {
      req.session.data.importReason = importReason
      req.session.data.internalMarketPurpose = importReason === 'Internal market' &&
        internalMarketPurposeValues.includes(internalMarketPurpose)
        ? internalMarketPurpose
        : null
      req.session.data.transhipmentDestinationCountry = importReason === 'Transhipment or onward travel' &&
        countryLabels.includes(transhipmentDestinationCountry)
        ? transhipmentDestinationCountry
        : null
      req.session.data.transitExitBorderControlPost = importReason === 'Transit' &&
        isValidExitBorderControlPost(transitExitBorderControlPost)
        ? transitExitBorderControlPost
        : null
      req.session.data.transitDestinationCountry = importReason === 'Transit' &&
        countryLabels.includes(transitDestinationCountry)
        ? transitDestinationCountry
        : null
      req.session.data.temporaryAdmissionExitDate = importReason === 'Temporary admission horses' &&
        parseArrivalDisplayDate(temporaryAdmissionExitDate)
        ? temporaryAdmissionExitDate
        : null
      req.session.data.temporaryAdmissionPortOfExit = importReason === 'Temporary admission horses' &&
        isValidExitBorderControlPost(temporaryAdmissionPortOfExit)
        ? temporaryAdmissionPortOfExit
        : null
    }

    return res.redirect('/notification-hub')
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.importReason = importReason || null
  req.session.data.internalMarketPurpose = importReason === 'Internal market'
    ? (internalMarketPurpose || null)
    : null
  req.session.data.transhipmentDestinationCountry = importReason === 'Transhipment or onward travel'
    ? (transhipmentDestinationCountry || null)
    : null
  req.session.data.transitExitBorderControlPost = importReason === 'Transit'
    ? (transitExitBorderControlPost || null)
    : null
  req.session.data.transitDestinationCountry = importReason === 'Transit'
    ? (transitDestinationCountry || null)
    : null
  req.session.data.temporaryAdmissionExitDate = importReason === 'Temporary admission horses'
    ? (temporaryAdmissionExitDate || null)
    : null
  req.session.data.temporaryAdmissionPortOfExit = importReason === 'Temporary admission horses'
    ? (temporaryAdmissionPortOfExit || null)
    : null

  return res.redirect('/consignment-details')
})

router.get('/animal-identification-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  if (redirectIfNoConsignmentDetails(req, res)) {
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

  if (redirectIfNoImportReason(req, res)) {
    return
  }

  if (redirectIfNoConsignmentDetails(req, res)) {
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
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(getNextJourneyPath('/animal-identification-details', req.session.data))
  }

  return res.redirect('/animal-identification-details')
})

router.get('/arrival-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (!isFromHub(req) && redirectIfNoImportReason(req, res)) {
    return
  }

  return renderArrivalDetailsPage(req, res)
})

router.post('/arrival-details', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (!isFromHub(req) && redirectIfNoImportReason(req, res)) {
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

  const validation = validateArrivalDetails(values)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors
    saveArrivalDetailsToSession(req.session.data, values)

    return renderArrivalDetailsPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  saveArrivalDetailsToSession(req.session.data, values)

  return res.redirect(getArrivalDetailsContinuePath(req.session.data))
})

router.get('/transit-countries', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (!isFromHub(req) && redirectIfNoImportReason(req, res)) {
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

  if (!isFromHub(req) && redirectIfNoImportReason(req, res)) {
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

  req.session.data.errorList = null
  req.session.data.errors = null
  saveTransitCountriesToSession(req.session.data, countries)

  return res.redirect(getNextJourneyPath('/transit-countries', req.session.data))
})

router.get('/contact-address-for-consignment', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const successMessage = req.session.data.contactAddressSuccessMessage || null

  if (successMessage) {
    delete req.session.data.contactAddressSuccessMessage
  }

  return renderContactAddressPage(req, res, {
    successMessage
  })
})

router.get('/roles-and-addresses', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  return renderRolesAndAddressesPage(req, res)
})

router.get('/transport-details', (req, res) => {
  return res.redirect('/transporter')
})

router.get('/transporter', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  return renderTransporterPage(req, res, {
    searchQuery: (req.query.search || '').trim()
  })
})

router.get('/transporter/add', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  return renderTransporterAddPage(req, res)
})

router.post('/transporter/add', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const validation = validateTransporterType(req.body.transporterType)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors

    return renderTransporterAddPage(req, res, {
      selectedTransporterType: validation.value
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.transporterAddType = validation.value

  if (validation.value === 'private') {
    return res.redirect('/transporter/add/private')
  }

  if (validation.value === 'commercial') {
    return res.redirect('/transporter/add/commercial')
  }

  return res.redirect('/transporter')
})

router.get('/transporter/add/private', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfTransporterAddTypeNot(req, res, 'private')) {
    return
  }

  return renderTransporterAddPrivatePage(req, res)
})

router.post('/transporter/add/private', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfTransporterAddTypeNot(req, res, 'private')) {
    return
  }

  const action = (req.body.action || '').trim()
  const formValues = parseTransporterPrivateFormBody(req.body)

  if (action === 'cancel') {
    req.session.data.errorList = null
    req.session.data.errors = null
    req.session.data.transporterAddType = null
    req.session.data.transporterPrivateForm = null

    return res.redirect('/')
  }

  const validation = validateTransporterPrivateForm(formValues)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors
    req.session.data.transporterPrivateForm = validation.value

    return renderTransporterAddPrivatePage(req, res, {
      formValues: validation.value
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.transporterPrivateForm = null
  req.session.data.transporterAddType = null

  saveAddedTransporter(req.session.data, buildPrivateTransporterFromForm(validation.value))

  return res.redirect('/transporter')
})

router.get('/transporter/add/commercial', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfTransporterAddTypeNot(req, res, 'commercial')) {
    return
  }

  return renderTransporterAddCommercialPage(req, res)
})

router.post('/transporter/add/commercial', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfTransporterAddTypeNot(req, res, 'commercial')) {
    return
  }

  const action = (req.body.action || '').trim()
  const formValues = parseTransporterCommercialFormBody(req.body)

  if (action === 'cancel') {
    req.session.data.errorList = null
    req.session.data.errors = null
    req.session.data.transporterAddType = null
    req.session.data.transporterCommercialForm = null

    return res.redirect('/')
  }

  const validation = validateTransporterCommercialForm(formValues)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors
    req.session.data.transporterCommercialForm = validation.value

    return renderTransporterAddCommercialPage(req, res, {
      formValues: validation.value
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.transporterCommercialForm = null
  req.session.data.transporterAddType = null

  saveAddedTransporter(req.session.data, buildCommercialTransporterFromForm(validation.value))

  return res.redirect('/transporter')
})

router.post('/transporter', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const transporterId = (req.body.transporterId || '').trim()
  const searchQuery = (req.body.search || '').trim()
  const action = (req.body.action || '').trim()
  const transporter = getTransporterById(transporterId, req.session.data)

  if (action === 'hub') {
    if (transporter) {
      syncTransporterSession(req.session.data, transporter)
    }

    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect('/notification-hub')
  }

  if (!transporter) {
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(getNextJourneyPath('/transporter', req.session.data))
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  syncTransporterSession(req.session.data, transporter)

  return res.redirect(getNextJourneyPath('/transporter', req.session.data))
})

router.get('/cph-number', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (!isConsignmentAddressSectionActive(req.session.data, 'cph')) {
    return res.redirect('/roles-and-addresses')
  }

  return renderCphNumberPage(req, res)
})

router.post('/cph-number', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (!isConsignmentAddressSectionActive(req.session.data, 'cph')) {
    return res.redirect('/roles-and-addresses')
  }

  const validation = validateCphNumber(parseCphNumberBody(req.body))

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors

    return renderCphNumberPage(req, res, {
      cphNumber: validation.value,
      cphNumberParts: validation.parts
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.cphNumber = validation.value

  return res.redirect('/roles-and-addresses')
})

router.get('/permanent-address', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (!isConsignmentAddressSectionActive(req.session.data, 'permanent-address')) {
    return res.redirect('/roles-and-addresses')
  }

  req.session.data.permanentAddressSameAsDestination = 'no'
  req.session.data.permanentAddress = null
  req.session.data.permanentAddressId = null
  req.session.data.permanentAddressSummary = null

  return res.redirect('/permanent-address/select')
})

router.post('/permanent-address', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (!isConsignmentAddressSectionActive(req.session.data, 'permanent-address')) {
    return res.redirect('/roles-and-addresses')
  }

  req.session.data.permanentAddressSameAsDestination = 'no'
  req.session.data.permanentAddress = null
  req.session.data.permanentAddressId = null
  req.session.data.permanentAddressSummary = null
  req.session.data.errorList = null
  req.session.data.errors = null

  return res.redirect('/permanent-address/select')
})

router.get('/permanent-address/select', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (!isConsignmentAddressSectionActive(req.session.data, 'permanent-address')) {
    return res.redirect('/roles-and-addresses')
  }

  return renderPermanentAddressAnimalsPage(req, res)
})

router.post('/permanent-address/select', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (!isConsignmentAddressSectionActive(req.session.data, 'permanent-address')) {
    return res.redirect('/roles-and-addresses')
  }

  const action = (req.body.action || '').trim()
  const choices = parsePermanentAddressChoices(req.body)
  const addressDetails = parsePermanentAddressDetails(req.body)
  const validation = validatePermanentAddressAnimalsForm(choices, req.session.data, addressDetails)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors

    return renderPermanentAddressAnimalsPage(req, res, {
      submittedChoices: validation.choices,
      submittedAddressDetails: validation.addressDetails,
      errors: validation.errors
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null

  const animals = buildPermanentAddressAnimalList(req.session.data)

  animals.forEach((animal) => {
    const choice = validation.choices[animal.key]

    if (!choice) {
      return
    }

    if (choice === 'same-as-pod') {
      copyAddressToPermanentAnimalEntry(
        req.session.data,
        animal.key,
        req.session.data.placeOfDestinationAddress,
        'same-as-pod'
      )
      return
    }

    if (choice !== 'new-address') {
      return
    }

    const form = validation.addressDetails[animal.key] || getEmptyPermanentAddressFormValues()

    copyAddressToPermanentAnimalEntry(
      req.session.data,
      animal.key,
      buildAddressFromPermanentAddressForm(form),
      'new-address'
    )
  })

  syncPermanentAddressSummary(req.session.data)

  if (action === 'hub') {
    return res.redirect('/notification-hub')
  }

  return res.redirect('/roles-and-addresses')
})

router.get('/permanent-address/enter-address', (req, res) => {
  return res.redirect('/permanent-address/select')
})

router.post('/permanent-address/enter-address', (req, res) => {
  return res.redirect('/permanent-address/select')
})

consignmentAddressSections
  .filter((section) => section.selectable)
  .forEach((section) => {
    router.get(section.path, handleConsignmentAddressSelectGet)
    router.post(section.path, handleConsignmentAddressSelectPost)
  })

router.post('/roles-and-addresses', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const action = (req.body.action || '').trim()

  if (action.startsWith('same-as-consignee:')) {
    const sectionId = action.split(':')[1]
    copyConsigneeAddressToSection(req.session.data, sectionId)

    return res.redirect('/roles-and-addresses')
  }

  req.session.data.errorList = null
  req.session.data.errors = null

  return res.redirect(getNextJourneyPath('/roles-and-addresses', req.session.data))
})

router.post('/contact-address-for-consignment', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const addressId = (req.body.contactAddressId || '').trim()
  const address = getContactAddressById(addressId, req.session.data)

  if (!address) {
    req.session.data.errorList = null
    req.session.data.errors = null

    if (isFromHub(req)) {
      return res.redirect('/notification-hub')
    }

    if (isFromReview(req)) {
      return res.redirect('/review-notification')
    }

    return res.redirect(getNextJourneyPath('/contact-address-for-consignment', req.session.data))
  }

  syncContactAddressSession(req.session.data, address)
  req.session.data.errorList = null
  req.session.data.errors = null

  if (isFromHub(req)) {
    return res.redirect('/notification-hub')
  }

  if (isFromReview(req)) {
    return res.redirect('/review-notification')
  }

  return res.redirect(getNextJourneyPath('/contact-address-for-consignment', req.session.data))
})

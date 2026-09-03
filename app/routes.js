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
const germinalProductCommodities = require('./data/commodities-germinal-products')
const packageTypes = require('./data/package-types')
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
const addressBookAddCategories = require('./data/address-book-add-categories')
const addressBookOriginUses = require('./data/address-book-origin-uses')
const addressBookDestinationUses = require('./data/address-book-destination-uses')
const addressBookBranchUses = require('./data/address-book-branch-uses')
const consignmentAddressUseGroups = require('./data/consignment-address-use-groups')
const getConsignmentAddressUseGroupsForSection = consignmentAddressUseGroups.getConsignmentAddressUseGroupsForSection
const getConsignmentAddressUseOptionsForSection = consignmentAddressUseGroups.getConsignmentAddressUseOptionsForSection
const getConsignmentAddressUseValuesForSection = consignmentAddressUseGroups.getConsignmentAddressUseValuesForSection
const consignmentAddAddressUsesLookup = consignmentAddressUseGroups.consignmentAddAddressUsesLookup

function getUkConsignmentLookupAddresses () {
  return addressBookLookupAddresses.addresses.filter((address) => address.country === 'United Kingdom')
}
const addressBookLookupAddresses = require('./data/address-book-lookup-addresses')
const dashboardData = require('./data/dashboard-notifications')
const dashboardTemplates = require('./data/dashboard-templates')
const { buildDashboardNotificationSnapshot } = require('./data/dashboard-notification-snapshots')
const { getCommoditySearchData } = require('./utils/commodity-search-data')

const TRANSIT_MEANS_OF_TRANSPORT = ['Railway', 'Road Vehicle']

const importReasonValues = importReasons.map((reason) => reason.value)
const internalMarketPurposeValues = internalMarketPurposes.map((purpose) => purpose.value)
const germinalTemperatureOptions = ['Ambient', 'Chilled', 'Frozen']

const DESIGN_RELEASE_NOTIFICATION_REFERENCE = 'GBN-AG-26-7K8M2P'
const TESTING_NOTIFICATION_REFERENCE = 'GB.2026.7963913 - CHEDA'
const PROTOTYPE_NOTIFICATION_REFERENCE = DESIGN_RELEASE_NOTIFICATION_REFERENCE

const allCommodities = commodities.concat(germinalProductCommodities)

function isDesignRelease21SessionData (sessionData) {
  return Boolean(sessionData && sessionData._isDesignRelease21Version)
}

function getSearchCommodities (sessionData) {
  if (!isDesignRelease21SessionData(sessionData)) {
    return commodities
  }

  return allCommodities
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
}

function getCommodityById (commodityId) {
  return allCommodities.find((commodity) => commodity.id === commodityId)
}

function getCommodityByCode (commodityCode) {
  return allCommodities.find((commodity) => commodity.code === commodityCode)
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

function isTestingSessionData (sessionData) {
  return Boolean(sessionData && sessionData._isTestingVersion)
}

function getPrototypeNotificationReference (sessionData) {
  return isTestingSessionData(sessionData)
    ? TESTING_NOTIFICATION_REFERENCE
    : DESIGN_RELEASE_NOTIFICATION_REFERENCE
}

function isDesignReleaseNotificationReference (reference) {
  return /^GBN-[A-Z]{2}-\d{2}-[A-Z0-9]+$/i.test(String(reference || '').trim())
}

function isTestingNotificationReference (reference) {
  return /^GB\.\d{4}\.\d{7}\s*-\s*[A-Z0-9]+$/i.test(String(reference || '').trim())
}

function ensurePrototypeNotificationReference (sessionData) {
  const value = String(sessionData.notificationReference || '').trim()

  if (isTestingSessionData(sessionData)) {
    if (!value || !isTestingNotificationReference(value)) {
      sessionData.notificationReference = TESTING_NOTIFICATION_REFERENCE
    }
    return
  }

  if (!value || !isDesignReleaseNotificationReference(value)) {
    sessionData.notificationReference = generateDesignReleaseNotificationReference(sessionData)
  }
}

function toDesignReleaseDashboardReference (reference, index = 0) {
  const value = String(reference || '').trim()

  if (isDesignReleaseNotificationReference(value)) {
    return value
  }

  const match = value.match(/^GB\.(\d{4})\.(\d{7})\s*-\s*[A-Z0-9]+$/i)

  if (match && match[2] === '7963913') {
    return DESIGN_RELEASE_NOTIFICATION_REFERENCE
  }

  if (index === 0) {
    return DESIGN_RELEASE_NOTIFICATION_REFERENCE
  }

  const sequence = match ? Number(match[2]) : (7963913 + index)
  const code = sequence.toString(36).toUpperCase().padStart(6, '0').slice(-6)

  return `GBN-AG-26-${code}`
}

function resetNotificationJourneySession (sessionData) {
  const addressBookAddedAddresses = sessionData.addressBookAddedAddresses
  const draftNotifications = sessionData.draftNotifications
  const deletedNotificationReferences = sessionData.deletedNotificationReferences
  const submittedNotifications = sessionData.submittedNotifications
  const savedTemplates = sessionData.savedTemplates
  const deletedTemplateIds = sessionData.deletedTemplateIds
  const testingSession = sessionData._testing
  const designRelease2Session = sessionData._designRelease2
  const designRelease21Session = sessionData._designRelease21

  Object.keys(sessionData).forEach((key) => {
    delete sessionData[key]
  })

  if (addressBookAddedAddresses && addressBookAddedAddresses.length) {
    sessionData.addressBookAddedAddresses = addressBookAddedAddresses
  }

  if (draftNotifications && draftNotifications.length) {
    sessionData.draftNotifications = draftNotifications
  }

  if (deletedNotificationReferences && deletedNotificationReferences.length) {
    sessionData.deletedNotificationReferences = deletedNotificationReferences
  }

  if (submittedNotifications && submittedNotifications.length) {
    sessionData.submittedNotifications = submittedNotifications
  }

  if (savedTemplates && savedTemplates.length) {
    sessionData.savedTemplates = savedTemplates
  }

  if (deletedTemplateIds && deletedTemplateIds.length) {
    sessionData.deletedTemplateIds = deletedTemplateIds
  }

  if (testingSession && typeof testingSession === 'object') {
    sessionData._testing = testingSession
  }

  if (designRelease2Session && typeof designRelease2Session === 'object') {
    sessionData._designRelease2 = designRelease2Session
  }

  if (designRelease21Session && typeof designRelease21Session === 'object') {
    sessionData._designRelease21 = designRelease21Session
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
  const countryOfOrigin = (sessionData.countryOfOrigin || '').trim()
  const regionOfOriginRequired = (sessionData.regionOfOriginRequired || '').trim()

  if (!countryOfOrigin || !regionOfOriginRequired) {
    return false
  }

  if (regionOfOriginRequired === 'Yes') {
    return Boolean(getRegionOfOriginCodeSuffix(sessionData))
  }

  return regionOfOriginRequired === 'No'
}

function validateOriginOfImport ({
  countryOfOrigin,
  regionOfOriginRequired,
  regionOfOriginCodeSuffix
}) {
  const errors = {}
  const errorList = []

  if (regionOfOriginRequired === 'Yes' && !regionOfOriginCodeSuffix) {
    errors.regionOfOriginCodeSuffix = { text: 'Enter the region of origin code' }
    errorList.push({
      text: 'Enter the region of origin code',
      href: '#region-of-origin-code-suffix'
    })
  }

  return { errors, errorList }
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

function isFromTemplateReview (req) {
  return req.query.from === 'template-review' ||
    (req.body && req.body.from === 'template-review')
}

function isEditingTemplateFromReview (sessionData) {
  return Boolean(sessionData && sessionData.isEditingTemplateFromReview)
}

function getTemplateReviewReturnPath (sessionData = {}) {
  const templateId = sessionData.editingTemplateId || sessionData.templateId

  return templateId ? `/templates/${templateId}` : '/templates'
}

function clearTemplateReviewEditState (sessionData) {
  delete sessionData.isEditingTemplateFromReview
  delete sessionData.editingTemplateId
}

function saveAndReturnToTemplateReview (sessionData) {
  const editingTemplateId = sessionData.editingTemplateId || sessionData.templateId || null

  if (editingTemplateId) {
    sessionData.templateId = editingTemplateId
  }

  const savedTemplate = saveTemplateFromSession(sessionData)
  const templateId = editingTemplateId || savedTemplate.id
  const templateTitle = savedTemplate.title || sessionData.templateName || 'Template'

  sessionData.templateReviewSuccessMessage = `${templateTitle} has been updated`
  clearTemplateReviewEditState(sessionData)
  sessionData.isCreatingTemplate = false
  delete sessionData.templateName
  delete sessionData.templateId

  return `/templates/${templateId}`
}

function getJourneyBackLink (req, linearBackLink) {
  if (isFromTemplateReview(req) || isEditingTemplateFromReview(req.session.data)) {
    return getTemplateReviewReturnPath(req.session.data)
  }

  if (isFromHub(req)) {
    return '/notification-hub'
  }

  return linearBackLink
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
  for (const commodity of allCommodities) {
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

function getSelectedSpeciesLabels (speciesIds) {
  return speciesIds
    .map((speciesId) => {
      const match = getSpeciesMatch(speciesId)

      if (!match) {
        return null
      }

      return match.species.label || match.species.commonName || ''
    })
    .filter(Boolean)
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

  if (sessionData.netWeight && sessionData.netWeight[speciesId] != null) {
    delete sessionData.netWeight[speciesId]
  }

  if (sessionData.packageType && sessionData.packageType[speciesId] != null) {
    delete sessionData.packageType[speciesId]
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

      if (sessionData.netWeight && sessionData.netWeight[speciesId] != null) {
        delete sessionData.netWeight[speciesId]
      }

      if (sessionData.packageType && sessionData.packageType[speciesId] != null) {
        delete sessionData.packageType[speciesId]
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

function isGerminalProductCommodity (commodity) {
  return Boolean(commodity && commodity.isGerminalProduct)
}

function buildPackageTypeItems (selectedValue) {
  return [
    {
      value: '',
      text: 'Select one',
      selected: !selectedValue
    },
    ...packageTypes.map((option) => ({
      value: option,
      text: option,
      selected: selectedValue === option
    }))
  ]
}

function commodityRequiresPackaging (commodity) {
  return getPackagingFields(commodity).length > 0
}

function formatCommodityGroupHeading (commodity) {
  return `${commodity.name} (${commodity.code})`
}

function getSelectedCommodityRows (sessionData) {
  const numberOfAnimals = sessionData.numberOfAnimals || {}
  const numberOfPackages = sessionData.numberOfPackages || {}
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
    const speciesLabels = getSelectedSpeciesLabels(speciesIds)

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
          species: getSelectedSpeciesLabels([speciesId]),
          numberOfAnimals: numberOfAnimals[speciesId] != null ? String(numberOfAnimals[speciesId]) : '',
          quantityLabel: 'Number of animals',
          isGerminalProduct: false,
          removeBy: 'species'
        })
      })

      return
    }

    if (isGerminalProductCommodity(commodity)) {
      const totalPackages = speciesIds.reduce((sum, speciesId) => {
        return sum + (Number(numberOfPackages[speciesId]) || 0)
      }, 0)

      rows.push({
        commodityId: commodity.id,
        speciesId: null,
        code: commodity.code,
        name: commodity.name,
        species: speciesLabels,
        numberOfAnimals: totalPackages > 0 ? String(totalPackages) : '',
        quantityLabel: 'Number of packages',
        isGerminalProduct: true,
        removeBy: 'commodity'
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
      species: speciesLabels,
      numberOfAnimals: totalAnimals > 0 ? String(totalAnimals) : '',
      quantityLabel: 'Number of animals',
      isGerminalProduct: false,
      removeBy: 'commodity'
    })
  })

  return rows
}

function buildSpeciesConsignmentEntry (sessionData, speciesId, match) {
  const { species, commodity } = match
  const numberOfAnimals = sessionData.numberOfAnimals || {}
  const numberOfPackages = sessionData.numberOfPackages || {}
  const netWeight = sessionData.netWeight || {}
  const packageType = sessionData.packageType || {}
  const packagingFields = getPackagingFields(commodity)
  const isGerminalProduct = isGerminalProductCommodity(commodity)
  const selectedPackageType = packageType[speciesId] != null ? String(packageType[speciesId]) : ''

  return {
    speciesId,
    commodityId: commodity.id,
    commodityCode: commodity.code,
    commodityName: commodity.name,
    commonName: getSpeciesCommonName({ commodity, species }),
    heading: formatSpeciesDisplayTitle({ commodity, species }),
    speciesName: species.label,
    isGerminalProduct,
    numberOfAnimals: numberOfAnimals[speciesId] != null ? String(numberOfAnimals[speciesId]) : '',
    netWeight: netWeight[speciesId] != null ? String(netWeight[speciesId]) : '',
    packageType: selectedPackageType,
    packageTypeItems: buildPackageTypeItems(selectedPackageType),
    numberOfPackages: numberOfPackages[speciesId] != null ? String(numberOfPackages[speciesId]) : '',
    showPackaging: !isGerminalProduct && packagingFields.length > 0,
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
}

function getConsignmentCommodityGroups (sessionData) {
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

          return buildSpeciesConsignmentEntry(sessionData, speciesId, match)
        })
        .filter(Boolean)

      if (!speciesEntries.length) {
        return null
      }

      return {
        commodityId,
        heading: formatCommodityGroupHeading(commodity),
        isGerminalProduct: isGerminalProductCommodity(commodity),
        speciesEntries
      }
    })
    .filter(Boolean)
}

function getConsignmentSpeciesEntries (sessionData) {
  return normalizeSelectedSpecies(sessionData.selectedSpecies)
    .map((speciesId) => {
      const match = getSpeciesMatch(speciesId)

      if (!match) {
        return null
      }

      return buildSpeciesConsignmentEntry(sessionData, speciesId, match)
    })
    .filter(Boolean)
}

function hasCommoditySelection (sessionData) {
  return normalizeSelectedSpecies(sessionData.selectedSpecies).length > 0
}

function validateCommoditySelection (selectedSpecies, commoditySelections) {
  const hasSelection = normalizeSelectedSpecies(selectedSpecies).length > 0 ||
    parseCommoditySelections(commoditySelections).length > 0

  if (hasSelection) {
    return { errors: {}, errorList: [] }
  }

  return {
    errors: {
      commoditySearch: { text: 'Select a commodity' }
    },
    errorList: [{
      text: 'Select a commodity',
      href: '#commodity-search'
    }]
  }
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
  const errors = {}
  const errorList = []

  speciesIds.forEach((speciesId) => {
    const match = getSpeciesMatch(speciesId)

    if (match && isGerminalProductCommodity(match.commodity)) {
      return
    }

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

function parseNetWeight (body, speciesIds) {
  const rawValues = body.netWeight && typeof body.netWeight === 'object'
    ? body.netWeight
    : {}
  const values = {}

  speciesIds.forEach((speciesId) => {
    const fieldName = `netWeight[${speciesId}]`
    const value = rawValues[speciesId] != null ? rawValues[speciesId] : body[fieldName]

    values[speciesId] = value != null ? String(value).trim() : ''
  })

  return values
}

function parsePackageType (body, speciesIds) {
  const rawValues = body.packageType && typeof body.packageType === 'object'
    ? body.packageType
    : {}
  const values = {}

  speciesIds.forEach((speciesId) => {
    const fieldName = `packageType[${speciesId}]`
    const value = rawValues[speciesId] != null ? rawValues[speciesId] : body[fieldName]

    values[speciesId] = value != null ? String(value).trim() : ''
  })

  return values
}

function validateNumberOfPackages (values, speciesIds) {
  const errors = {}
  const errorList = []

  speciesIds.forEach((speciesId) => {
    const match = getSpeciesMatch(speciesId)

    if (!match || !isGerminalProductCommodity(match.commodity)) {
      return
    }

    const value = values[speciesId]
    const errorId = `number-of-packages-${speciesId}`

    if (!value) {
      errors[`numberOfPackages-${speciesId}`] = { text: 'Enter the number of packages' }
      errorList.push({
        text: 'Enter the number of packages',
        href: `#${errorId}`
      })
      return
    }

    if (!/^\d+$/.test(value) || Number(value) < 1) {
      errors[`numberOfPackages-${speciesId}`] = { text: 'Enter a whole number greater than 0' }
      errorList.push({
        text: 'Enter a whole number greater than 0',
        href: `#${errorId}`
      })
    }
  })

  return { errors, errorList }
}

function validateNetWeight (values, speciesIds) {
  const errors = {}
  const errorList = []

  speciesIds.forEach((speciesId) => {
    const match = getSpeciesMatch(speciesId)

    if (!match || !isGerminalProductCommodity(match.commodity)) {
      return
    }

    const value = values[speciesId]
    const errorId = `net-weight-${speciesId}`

    if (!value) {
      errors[`netWeight-${speciesId}`] = { text: 'Enter the net weight' }
      errorList.push({
        text: 'Enter the net weight',
        href: `#${errorId}`
      })
      return
    }

    if (!/^\d+(\.\d+)?$/.test(value) || Number(value) <= 0) {
      errors[`netWeight-${speciesId}`] = { text: 'Enter a number greater than 0' }
      errorList.push({
        text: 'Enter a number greater than 0',
        href: `#${errorId}`
      })
    }
  })

  return { errors, errorList }
}

function validatePackageType (values, speciesIds) {
  const errors = {}
  const errorList = []

  speciesIds.forEach((speciesId) => {
    const match = getSpeciesMatch(speciesId)

    if (!match || !isGerminalProductCommodity(match.commodity)) {
      return
    }

    const value = values[speciesId]
    const errorId = `package-type-${speciesId}`

    if (!value || !packageTypes.includes(value)) {
      errors[`packageType-${speciesId}`] = { text: 'Select a type of package' }
      errorList.push({
        text: 'Select a type of package',
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

const CONTACT_ADDRESS_RETURN_ID = 'contact-address'

function mapAddressBookEntryToContactAddress (entry) {
  const mapped = mapAddressBookEntryToConsignmentAddress(entry)

  return {
    id: mapped.id,
    name: mapped.name,
    addressLines: mapped.addressLines,
    country: mapped.country,
    email: mapped.email,
    telephone: mapped.telephone
  }
}

function getContactAddresses (sessionData = {}) {
  const addedAddressBookIds = new Set(
    (sessionData.addressBookAddedAddresses || []).map((address) => address.id)
  )
  const addressBookAddresses = getAddressBookAddresses(sessionData)
    .filter((address) =>
      addedAddressBookIds.has(address.id) &&
      getAddressTypeValues(address).some((type) =>
        type === 'branch-address' || type === 'contact'
      )
    )
    .map(mapAddressBookEntryToContactAddress)

  return dedupeAddressesById([
    ...(sessionData.contactAddedAddresses || []),
    ...addressBookAddresses,
    ...contactAddresses
  ])
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

  if (address) {
    return { errors: {}, errorList: [], address }
  }

  return {
    errors: {
      contactAddressId: { text: 'Select a contact address' }
    },
    errorList: [{
      text: 'Select a contact address',
      href: '#contact-address'
    }],
    address: null
  }
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
  const showTemperatureQuestion = hasGerminalProductsOnly(sessionData)

  return {
    showCertificationPurposeQuestion: !showTemperatureQuestion,
    showTemperatureQuestion,
    showUnweanedQuestion: unweanedOptions.length > 0,
    certificationPurposeOptions,
    temperatureOptions: germinalTemperatureOptions,
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

  if (!config.showCertificationPurposeQuestion && !config.showTemperatureQuestion && !config.showUnweanedQuestion) {
    return true
  }

  if (config.showCertificationPurposeQuestion) {
    if (!certificationPurposeOptions.includes(sessionData.certificationPurpose)) {
      return false
    }
  }

  if (config.showTemperatureQuestion) {
    if (!config.temperatureOptions.includes(sessionData.storageTemperature)) {
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

  steps.push('/transporter')

  if (!isDesignRelease21TemplateCreate(sessionData)) {
    steps.push('/upload-documents')
  }

  steps.push(
    '/roles-and-addresses',
    '/contact-address-for-consignment',
    '/review-notification'
  )

  if (!isDesignRelease21TemplateCreate(sessionData)) {
    steps.push('/declaration')
  }

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

function isAmendingNotification (sessionData) {
  return String(sessionData && sessionData.notificationStatus || '').trim() === 'Amend'
}

function getJourneyFormAction (req) {
  return String((req.body && req.body.action) || '').trim()
}

function isJourneySoftSaveAction (action) {
  return action === 'hub' || action === 'review'
}

function getJourneySaveRedirect (action, continuePath, sessionData) {
  if (sessionData && isEditingTemplateFromReview(sessionData)) {
    return saveAndReturnToTemplateReview(sessionData)
  }

  if (sessionData) {
    persistDraftNotification(sessionData)
  }

  if (action === 'review') {
    return '/review-notification'
  }

  if (action === 'hub') {
    return '/notification-hub'
  }

  return continuePath
}

function getSectionContinueRedirect (req, linearPath) {
  if (isFromTemplateReview(req) || isEditingTemplateFromReview(req.session.data)) {
    return saveAndReturnToTemplateReview(req.session.data)
  }

  if (isFromHub(req)) {
    return '/notification-hub'
  }

  if (isFromReview(req)) {
    return '/review-notification'
  }

  return linearPath
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

function validateImportReasonProceed ({
  importReason,
  internalMarketPurpose,
  transhipmentDestinationCountry,
  transitExitBorderControlPost,
  transitDestinationCountry,
  temporaryAdmissionExitDate,
  temporaryAdmissionPortOfExit
}) {
  const errors = {}
  const errorList = []

  // Soft validation: a main reason is optional to proceed, but once selected
  // any further information required for that reason must be completed.
  if (!importReasonValues.includes(importReason)) {
    return { errors, errorList }
  }

  if (importReason === 'Internal market' &&
    !internalMarketPurposeValues.includes(internalMarketPurpose)) {
    errors.internalMarketPurpose = { text: 'Select a purpose in the internal market' }
    errorList.push({
      text: 'Select a purpose in the internal market',
      href: '#internal-market-purpose'
    })
  }

  if (importReason === 'Transhipment or onward travel' &&
    !countryLabels.includes(transhipmentDestinationCountry)) {
    errors.transhipmentDestinationCountry = { text: 'Select a destination country' }
    errorList.push({
      text: 'Select a destination country',
      href: '#transhipment-destination-country'
    })
  }

  if (importReason === 'Transit') {
    if (!isValidExitBorderControlPost(transitExitBorderControlPost)) {
      errors.transitExitBorderControlPost = { text: 'Select a port of exit' }
      errorList.push({
        text: 'Select a port of exit',
        href: '#transit-exit-border-control-post'
      })
    }

    if (!countryLabels.includes(transitDestinationCountry)) {
      errors.transitDestinationCountry = { text: 'Select a destination country' }
      errorList.push({
        text: 'Select a destination country',
        href: '#transit-destination-country'
      })
    }
  }

  if (importReason === 'Temporary admission horses') {
    if (!parseArrivalDisplayDate(temporaryAdmissionExitDate)) {
      errors.temporaryAdmissionExitDate = {
        text: temporaryAdmissionExitDate ? 'Enter a real date' : 'Enter an exit date'
      }
      errorList.push({
        text: errors.temporaryAdmissionExitDate.text,
        href: '#temporary-admission-exit-date'
      })
    }

    if (!isValidExitBorderControlPost(temporaryAdmissionPortOfExit)) {
      errors.temporaryAdmissionPortOfExit = { text: 'Select a port of exit' }
      errorList.push({
        text: 'Select a port of exit',
        href: '#temporary-admission-port-of-exit'
      })
    }
  }

  return { errors, errorList }
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

function getIdentificationEntryCount (sessionData, speciesId) {
  const match = getSpeciesMatch(speciesId)

  if (!match) {
    return 0
  }

  // Germinal products only need one set of identification details per species.
  if (isGerminalProductCommodity(match.commodity)) {
    return 1
  }

  return Number((sessionData.numberOfAnimals || {})[speciesId]) || 0
}

function hasAnimalIdentifiersRequired (sessionData) {
  return normalizeSelectedSpecies(sessionData.selectedSpecies).some((speciesId) => {
    return getIdentifierFieldsForSpecies(speciesId).length > 0
  })
}

function hasMultipleSpeciesSelected (sessionData) {
  return normalizeSelectedSpecies(sessionData.selectedSpecies).length > 1
}

function hasAtLeastOneAnimalIdentifierForSpecies (sessionData, speciesId) {
  const fields = getIdentifierFieldsForSpecies(speciesId)

  if (!fields.length) {
    return true
  }

  const animals = getAnimalIdentifiers(sessionData)[speciesId] || []

  return animals.some((animal) => isAnimalIdentifierEntryComplete(animal, fields))
}

function requiresAnimalIdentifiersForSubmit (sessionData) {
  return hasMultipleSpeciesSelected(sessionData) && hasAnimalIdentifiersRequired(sessionData)
}

function hasMinimumAnimalIdentifiersForSubmit (sessionData) {
  if (!requiresAnimalIdentifiersForSubmit(sessionData)) {
    return true
  }

  // Multiple species: at least one complete identifier entry per species.
  return normalizeSelectedSpecies(sessionData.selectedSpecies).every((speciesId) => {
    return hasAtLeastOneAnimalIdentifierForSpecies(sessionData, speciesId)
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
  const saved = getAnimalIdentifiers(sessionData)

  return speciesIds.every((speciesId) => {
    const fields = getIdentifierFieldsForSpecies(speciesId)
    const total = getIdentificationEntryCount(sessionData, speciesId)

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

  const total = getIdentificationEntryCount(sessionData, speciesId)

  if (!total) {
    return null
  }

  const speciesLabel = match.species.label
  const isGerminalProduct = isGerminalProductCommodity(match.commodity)
  const saved = getAnimalIdentifiers(sessionData)
  const speciesSaved = saved[speciesId] || []
  let activeAnimal = null

  for (let index = 0; index < total; index++) {
    const animal = speciesSaved[index] || {}

    if (!isAnimalIdentifierEntryComplete(animal, fields)) {
      activeAnimal = {
        animalNumber: index + 1,
        identifierValues: animal,
        headingText: isGerminalProduct
          ? `Enter details for ${speciesLabel}`
          : `Enter details for ${speciesLabel} ${index + 1} of ${total}`
      }
      break
    }
  }

  // Germinal products use a single editable form, not the multi-animal save flow.
  if (isGerminalProduct && !activeAnimal) {
    activeAnimal = {
      animalNumber: 1,
      identifierValues: speciesSaved[0] || {},
      headingText: `Enter details for ${speciesLabel}`
    }
  }

  const panelContext = {
    speciesId,
    speciesLabel,
    identifierFields: fields
  }
  const savedAnimals = isGerminalProduct
    ? []
    : getSavedAnimalsForSpecies(sessionData, panelContext)
  const completeSavedAnimals = savedAnimals.filter((animal) => {
    return isAnimalIdentifierEntryComplete(speciesSaved[animal.index] || {}, fields)
  })

  return {
    speciesId,
    speciesLabel,
    identifierFields: fields,
    totalAnimals: total,
    isGerminalProduct,
    panelHeaderText: speciesLabel,
    changeCountLabel: 'Change number of animals',
    isComplete: isGerminalProduct ? false : !activeAnimal,
    activeAnimal,
    savedAnimals: completeSavedAnimals,
    savedAnimalsTable: isGerminalProduct ? null : buildSavedAnimalsTable(panelContext, completeSavedAnimals)
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

  const total = getIdentificationEntryCount(sessionData, speciesId)
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

        if (panel.totalAnimals <= 1) {
          panel.showSaveButton = false
          panel.saveButtonText = null
        } else {
          panel.showSaveButton = true
          panel.saveButtonText = remainingForSpecies === 1
            ? 'Save and finish'
            : 'Save and add another'
        }
      }

      return panel
    })
    .filter(Boolean)
}

function saveActiveAnimalIdentifiersFromBody (sessionData, body, options = {}) {
  const onlySingleAnimalSpecies = Boolean(options.onlySingleAnimalSpecies)
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)

  speciesIds.forEach((speciesId) => {
    const panel = getSpeciesIdentificationState(sessionData, speciesId)

    if (!panel || !panel.activeAnimal) {
      return
    }

    if (onlySingleAnimalSpecies && panel.totalAnimals > 1) {
      return
    }

    const rawIdentifiers = body.identifiers &&
      typeof body.identifiers === 'object' &&
      body.identifiers[speciesId] &&
      typeof body.identifiers[speciesId] === 'object'
      ? body.identifiers[speciesId]
      : {}
    const { values } = validateAnimalIdentifiers(
      panel.identifierFields,
      rawIdentifiers,
      speciesId
    )

    if (!sessionData.animalIdentifiers || typeof sessionData.animalIdentifiers !== 'object') {
      sessionData.animalIdentifiers = {}
    }

    if (!Array.isArray(sessionData.animalIdentifiers[speciesId])) {
      sessionData.animalIdentifiers[speciesId] = []
    }

    const saveIndex = panel.activeAnimal.animalNumber - 1
    const speciesSaved = sessionData.animalIdentifiers[speciesId]

    if (speciesSaved.length === saveIndex) {
      speciesSaved.push(values)
    } else {
      speciesSaved[saveIndex] = values
    }
  })
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
  const dateComplete = isDesignRelease21TemplateCreate(sessionData) || Boolean(
    arrivalDateAtPort &&
    isArrivalDateWithinAllowedRange(sessionData.arrivalDateAtPort)
  )

  return Boolean(
    dateComplete &&
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
  sessionData.arrivalDateAtPort = isDesignRelease21TemplateCreate(sessionData)
    ? null
    : (values.arrivalDateAtPort || null)
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

function hasTransitCountriesComplete (sessionData) {
  // Transit countries are optional — any saved list (including empty) is acceptable.
  return true
}

function hasTransitCountriesSelected (sessionData) {
  return normalizeTransitCountries(sessionData && sessionData.transitCountries).length > 0
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
  const fromTemplateReview = isFromTemplateReview(req) || isEditingTemplateFromReview(sessionData)

  return res.render('contact-address-for-consignment', {
    backLink: getJourneyBackLink(
      req,
      isFromReview(req) ? '/review-notification' : '/roles-and-addresses'
    ),
    fromHub: isFromHub(req),
    fromReview: isFromReview(req),
    fromTemplateReview,
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    contactAddressItems: buildContactAddressItems(sessionData, selectedAddressId),
    selectedAddressId,
    addAddressHref: buildAddressBookHref(sessionData, '/add?from=contact-address'),
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
  const hasPlaceOfOriginAddress = Boolean(sessionData.placeOfOriginAddress)

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

    if (section.canUseSameAsPlaceOfOrigin && hasPlaceOfOriginAddress) {
      return {
        ...section,
        href: section.path,
        showSameAsPlaceOfOrigin: true,
        sameAsPlaceOfOriginAction: `same-as-place-of-origin:${section.id}`
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

function copyPlaceOfOriginAddressToSection (sessionData, sectionId) {
  const section = consignmentAddressSections.find((item) => item.id === sectionId)

  if (!section || !section.canUseSameAsPlaceOfOrigin || !sessionData.placeOfOriginAddress) {
    return false
  }

  sessionData[section.sessionAddressIdKey] = sessionData.placeOfOriginAddressId
  sessionData[section.sessionAddressKey] = {
    name: sessionData.placeOfOriginAddress.name,
    addressLines: [...(sessionData.placeOfOriginAddress.addressLines || [])],
    country: sessionData.placeOfOriginAddress.country
  }

  return true
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
  const animals = buildPermanentAddressAnimalList(sessionData)
  const errors = {}
  const errorList = []

  animals.forEach((animal) => {
    const choice = choices[animal.key]
    const errorPrefix = getPermanentAddressDetailsErrorPrefix(animal.key)

    if (!choice) {
      return
    }

    if (!['same-as-pod', 'new-address'].includes(choice)) {
      return
    }

    if (choice === 'same-as-pod' && !sessionData.placeOfDestinationAddress) {
      const errorKey = `permanentAddressChoice-${animal.key}`

      errors[errorKey] = {
        text: 'Add a place of destination before you can continue'
      }
      errorList.push({
        text: 'Add a place of destination before you can continue',
        href: `#permanent-address-choice-${animal.key}`
      })
      return
    }

    if (choice !== 'new-address') {
      return
    }

    const form = addressDetails[animal.key] || getEmptyPermanentAddressFormValues()

    if (!form.name) {
      errors[`${errorPrefix}-name`] = { text: 'Enter a name or organisation name' }
      errorList.push({
        text: `Enter a name or organisation name for ${animal.heading}`,
        href: `#${errorPrefix}-name`
      })
    }

    if (!form.addressLine1) {
      errors[`${errorPrefix}-address-line-1`] = { text: 'Enter address line 1' }
      errorList.push({
        text: `Enter address line 1 for ${animal.heading}`,
        href: `#${errorPrefix}-address-line-1`
      })
    }

    if (!form.townOrCity) {
      errors[`${errorPrefix}-town-or-city`] = { text: 'Enter a town or city' }
      errorList.push({
        text: `Enter a town or city for ${animal.heading}`,
        href: `#${errorPrefix}-town-or-city`
      })
    }

    if (!form.postcode) {
      errors[`${errorPrefix}-postcode`] = { text: 'Enter a postcode or Zip code' }
      errorList.push({
        text: `Enter a postcode or Zip code for ${animal.heading}`,
        href: `#${errorPrefix}-postcode`
      })
    }

    if (!form.email) {
      errors[`${errorPrefix}-email`] = { text: 'Enter an email address' }
      errorList.push({
        text: `Enter an email address for ${animal.heading}`,
        href: `#${errorPrefix}-email`
      })
    }

    if (!form.phone) {
      errors[`${errorPrefix}-phone`] = { text: 'Enter a phone number' }
      errorList.push({
        text: `Enter a phone number for ${animal.heading}`,
        href: `#${errorPrefix}-phone`
      })
    }
  })

  return { errors, errorList, choices, addressDetails }
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
  const successMessage = sessionData.consignmentAddressSuccessMessage || null
  const fromTemplateReview = isFromTemplateReview(req) || isEditingTemplateFromReview(sessionData)

  if (successMessage) {
    delete sessionData.consignmentAddressSuccessMessage
  }

  return res.render('roles-and-addresses', {
    backLink: getJourneyBackLink(req, '/notification-hub'),
    fromTemplateReview,
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    addressSections: buildConsignmentAddressSections(sessionData),
    successMessage,
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
  const fromTemplateReview = isFromTemplateReview(req) || isEditingTemplateFromReview(sessionData)

  if (successMessage) {
    delete sessionData.transporterSuccessMessage
  }

  return res.render('transporter', {
    backLink: getJourneyBackLink(req, '/notification-hub'),
    fromTemplateReview,
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
  const fromAddressBook = Boolean(sessionData.addressBookAddingTransporter)
  const addressBookBasePath = getAddressBookBasePath(res)
  const journeyBasePath = res.locals.journeyBasePath || ''

  return res.render('transporter-add', {
    backLink: fromAddressBook
      ? `${addressBookBasePath}/add`
      : `${journeyBasePath}/transporter`,
    formAction: `${journeyBasePath}/transporter/add`,
    transporterTypeOptions: transporterTypes,
    selectedTransporterType: locals.selectedTransporterType != null
      ? locals.selectedTransporterType
      : sessionData.transporterAddType || '',
    data: sessionData,
    ...locals
  })
}

function validateTransporterType (transporterType) {
  const value = (transporterType || '').trim()
  const validValues = transporterTypes.map((item) => item.value)

  if (!validValues.includes(value)) {
    return {
      errors: {
        transporterType: {
          text: 'Select a transporter type'
        }
      },
      errorList: [{
        text: 'Select a transporter type',
        href: '#transporter-type-private'
      }],
      value
    }
  }

  return {
    errors: {},
    errorList: [],
    value
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
  const errors = {}
  const errorList = []

  const addError = (field, message, href) => {
    errors[field] = { text: message }
    errorList.push({ text: message, href })
  }

  if (!form.name) {
    addError('transporterPrivateName', 'Enter a name or organisation name', '#transporter-private-name')
  }

  if (!form.addressLine1) {
    addError('transporterPrivateAddressLine1', 'Enter address line 1', '#transporter-private-address-line-1')
  }

  if (!form.townOrCity) {
    addError('transporterPrivateTownOrCity', 'Enter a town or city', '#transporter-private-town-or-city')
  }

  if (!form.postcode) {
    addError('transporterPrivatePostcode', 'Enter a postcode or Zip code', '#transporter-private-postcode')
  }

  if (!form.country) {
    addError('transporterPrivateCountry', 'Select a country', '#transporter-private-country')
  }

  if (!form.email) {
    addError('transporterPrivateEmail', 'Enter an email address', '#transporter-private-email')
  }

  if (!form.phone) {
    addError('transporterPrivatePhone', 'Enter a phone number', '#transporter-private-phone')
  }

  return { errors, errorList, value: form }
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
  const lookupAddressId = (body.addressBookLookupAddressId || '').trim()
  const lookupManualAddress = lookupAddressId
    ? getAddressDetailsFromLookup(lookupAddressId)
    : null
  const manualAddressEntry = body.manualAddressEntry === 'true' || body.manualAddressEntry === true

  return {
    authorisationNumber: (body.transporterCommercialAuthorisationNumber || '').trim(),
    name: (body.transporterCommercialName || '').trim() ||
      (lookupManualAddress && lookupManualAddress.nameOrOrganisation) ||
      '',
    addressLine1: (body.transporterCommercialAddressLine1 || '').trim() ||
      (lookupManualAddress && lookupManualAddress.addressLine1) ||
      '',
    addressLine2: (body.transporterCommercialAddressLine2 || '').trim() ||
      (lookupManualAddress && lookupManualAddress.addressLine2) ||
      '',
    townOrCity: (body.transporterCommercialTownOrCity || '').trim() ||
      (lookupManualAddress && lookupManualAddress.townOrCity) ||
      '',
    county: (body.transporterCommercialCounty || '').trim() ||
      (lookupManualAddress && lookupManualAddress.county) ||
      '',
    postcode: (body.transporterCommercialPostcode || '').trim() ||
      (lookupManualAddress && lookupManualAddress.postcode) ||
      '',
    country: COMMERCIAL_TRANSPORTER_COUNTRY,
    email: (body.transporterCommercialEmail || '').trim(),
    phone: (body.transporterCommercialPhone || '').trim(),
    lookupAddressId,
    addressLookup: (body.addressLookup || '').trim(),
    manualAddressEntry
  }
}

function validateTransporterCommercialForm (form) {
  const errors = {}
  const errorList = []

  const addError = (field, message, href) => {
    errors[field] = { text: message }
    errorList.push({ text: message, href })
  }

  if (!form.authorisationNumber) {
    addError(
      'transporterCommercialAuthorisationNumber',
      'Enter a transporter authorisation number',
      '#transporter-commercial-authorisation-number'
    )
  }

  if (!form.name) {
    addError('transporterCommercialName', 'Enter a name or organisation name', '#transporter-commercial-name')
  }

  if (!form.addressLine1) {
    addError(
      'transporterCommercialAddressLine1',
      'Enter address line 1',
      '#transporter-commercial-address-line-1'
    )
  }

  if (!form.townOrCity) {
    addError(
      'transporterCommercialTownOrCity',
      'Enter a town or city',
      '#transporter-commercial-town-or-city'
    )
  }

  if (!form.postcode) {
    addError(
      'transporterCommercialPostcode',
      'Enter a postcode or Zip code',
      '#transporter-commercial-postcode'
    )
  }

  if (!form.country) {
    addError('transporterCommercialCountry', 'Select a country', '#transporter-commercial-country')
  }

  if (!form.email) {
    addError('transporterCommercialEmail', 'Enter an email address', '#transporter-commercial-email')
  }

  if (!form.phone) {
    addError('transporterCommercialPhone', 'Enter a phone number', '#transporter-commercial-phone')
  }

  return { errors, errorList, value: form }
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

function mapAddedTransporterToAddressBookEntry (transporter, addressBookPath = '/address-book') {
  const details = transporter.details || {}
  const addressLines = transporter.address
    ? String(transporter.address).split(',').map((part) => part.trim()).filter(Boolean)
    : [
      details.addressLine1,
      details.addressLine2,
      [details.townOrCity, details.county, details.postcode].filter(Boolean).join(', ')
    ].filter(Boolean)
  const typeLabel = transporter.type || 'Commercial'

  return {
    id: transporter.id,
    name: transporter.name,
    type: 'transporter',
    types: ['transporter'],
    typeLabel,
    typeLabels: [typeLabel],
    category: 'transporter',
    address: transporter.address || addressLines.join(', '),
    addressLines,
    approvalNumber: transporter.approvalNumber || '',
    country: details.country || '',
    details: {
      nameOrOrganisation: details.nameOrOrganisation || transporter.name,
      addressLine1: details.addressLine1 || '',
      addressLine2: details.addressLine2 || '',
      townOrCity: details.townOrCity || '',
      county: details.county || '',
      postcode: details.postcode || '',
      country: details.country || '',
      email: details.email || '',
      phone: details.phone || transporter.telephone || ''
    },
    searchText: [
      transporter.name,
      typeLabel,
      transporter.address,
      transporter.approvalNumber,
      details.country
    ].filter(Boolean).join(' ').toLowerCase(),
    viewHref: `${addressBookPath}/${transporter.id}`
  }
}

function saveAddedTransporter (sessionData, transporter, options = {}) {
  if (!sessionData.addedTransporters) {
    sessionData.addedTransporters = []
  }

  sessionData.addedTransporters.unshift(transporter)
  syncTransporterSession(sessionData, transporter)

  const fromAddressBook = Boolean(
    options.fromAddressBook != null
      ? options.fromAddressBook
      : sessionData.addressBookAddingTransporter
  )

  if (fromAddressBook) {
    const addressBookPath = options.addressBookPath || '/address-book'

    if (!sessionData.addressBookAddedAddresses) {
      sessionData.addressBookAddedAddresses = []
    }

    sessionData.addressBookAddedAddresses.unshift(
      mapAddedTransporterToAddressBookEntry(transporter, addressBookPath)
    )
    sessionData.addressBookSuccessMessage = formatAddressBookSuccessMessage(transporter.name)
    sessionData.addressBookAddingTransporter = null
    sessionData.transporterAddType = null
    sessionData.transporterSuccessMessage = null

    return {
      redirectTo: `${addressBookPath}?category=transporter`
    }
  }

  sessionData.transporterSuccessMessage = formatTransporterSuccessMessage(transporter.name)

  return {
    redirectTo: '/transporter'
  }
}

function getTransporterAddCancelRedirect (req, res) {
  const fromAddressBook = Boolean(req.session.data.addressBookAddingTransporter)
  const addressBookBasePath = getAddressBookBasePath(res)

  req.session.data.addressBookAddingTransporter = null
  req.session.data.transporterAddType = null

  if (fromAddressBook) {
    return `${addressBookBasePath}?category=transporter`
  }

  return '/'
}

function renderTransporterAddPrivatePage (req, res, locals = {}) {
  const sessionData = req.session.data
  const formValues = locals.formValues || getTransporterPrivateForm(sessionData)
  const fromAddressBook = Boolean(sessionData.addressBookAddingTransporter)

  return res.render('transporter-add-private', {
    backLink: '/transporter/add',
    formValues,
    countryItems: buildAddressBookCountryItems(formValues.country),
    cancelButtonText: fromAddressBook
      ? 'Cancel and return to address book'
      : 'Cancel and return to dashboard',
    data: sessionData,
    ...locals
  })
}

function renderTransporterAddCommercialPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const isDr2 = Boolean(res.locals.isDesignRelease2Version)
  const formValues = locals.formValues || getTransporterCommercialForm(sessionData)
  const showAddressLookup = isDr2
  const addressErrors = [
    'transporterCommercialAddressLine1',
    'transporterCommercialTownOrCity',
    'transporterCommercialPostcode',
    'transporterCommercialCountry'
  ]
  const hasAddressErrors = Boolean(
    sessionData.errors &&
    addressErrors.some((field) => sessionData.errors[field])
  )
  const showManualAddress = locals.showManualAddress != null
    ? locals.showManualAddress
    : (
      !showAddressLookup ||
      hasAddressErrors ||
      Boolean(locals.selectedLookupAddressId) ||
      Boolean(formValues.addressLine1)
    )

  return res.render('transporter-add-commercial', {
    backLink: '/transporter/add',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    formValues,
    countryItems: buildCommercialTransporterCountryItems(),
    commercialTransporterCountry: COMMERCIAL_TRANSPORTER_COUNTRY,
    showAddressLookup,
    showManualAddress,
    cancelButtonText: Boolean(sessionData.addressBookAddingTransporter)
      ? 'Cancel and return to address book'
      : 'Cancel and return to dashboard',
    lookupAddressesJson: JSON.stringify(
      showAddressLookup
        ? addressBookLookupAddresses.northernIrelandAddresses
        : addressBookLookupAddresses.addresses
    ),
    addressLookup: locals.addressLookup != null
      ? locals.addressLookup
      : '',
    selectedLookupAddressId: locals.selectedLookupAddressId != null
      ? locals.selectedLookupAddressId
      : '',
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

const CONSIGNMENT_SECTION_TYPE_ALIASES = {
  'place-of-origin': ['place-of-origin'],
  'consignor-or-exporter': ['consignor-or-exporter', 'consignor', 'exporter'],
  consignee: ['consignee'],
  importer: ['importer'],
  'place-of-destination': ['place-of-destination']
}

function getAddressTypeValues (address) {
  if (Array.isArray(address.types) && address.types.length) {
    return address.types
  }

  return [address.type].filter(Boolean)
}

function addressMatchesConsignmentSection (address, sectionId) {
  if (!sectionId) {
    return true
  }

  const aliases = CONSIGNMENT_SECTION_TYPE_ALIASES[sectionId] || [sectionId]
  const addressTypes = getAddressTypeValues(address)

  return addressTypes.some((type) => aliases.includes(type))
}

function mapAddressBookEntryToConsignmentAddress (entry) {
  const details = entry.details || {}
  let addressLines = Array.isArray(entry.addressLines) && entry.addressLines.length
    ? entry.addressLines
    : null

  if (!addressLines && details.addressLine1) {
    const townPostcode = [
      details.townOrCity,
      details.county,
      details.postcode
    ].filter(Boolean).join(', ')

    addressLines = [
      details.addressLine1,
      details.addressLine2,
      townPostcode
    ].filter(Boolean)
  }

  if (!addressLines && entry.address) {
    addressLines = String(entry.address)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return {
    id: entry.id,
    type: entry.type,
    types: getAddressTypeValues(entry),
    name: entry.name || details.nameOrOrganisation || '',
    addressLines: addressLines || [],
    country: entry.country || details.country || '',
    email: details.email || entry.email || '',
    telephone: details.phone || entry.telephone || ''
  }
}

function dedupeAddressesById (addresses) {
  const seenIds = new Set()

  return addresses.filter((address) => {
    if (!address || !address.id || seenIds.has(address.id)) {
      return false
    }

    seenIds.add(address.id)
    return true
  })
}

function getConsignmentAddressesForSection (sectionId, sessionData = {}) {
  const staticAddresses = sectionId
    ? consignmentAddresses.filter((address) => addressMatchesConsignmentSection(address, sectionId))
    : consignmentAddresses

  const addedAddresses = (sessionData.consignmentAddedAddresses || [])
    .filter((address) => addressMatchesConsignmentSection(address, sectionId))

  const addedAddressBookIds = new Set(
    (sessionData.addressBookAddedAddresses || []).map((address) => address.id)
  )

  const addressBookAddresses = getAddressBookAddresses(sessionData)
    .filter((address) =>
      addedAddressBookIds.has(address.id) &&
      addressMatchesConsignmentSection(address, sectionId)
    )
    .map(mapAddressBookEntryToConsignmentAddress)

  return dedupeAddressesById([
    ...addedAddresses,
    ...addressBookAddresses,
    ...staticAddresses
  ])
}

function getConsignmentAddressById (addressId, sectionId, sessionData = {}) {
  return getConsignmentAddressesForSection(sectionId, sessionData).find((address) => address.id === addressId)
}

function buildConsignmentAddressResults (searchQuery = '', sectionId = '', sessionData = {}, returnPath = '', addressBookBasePath = null) {
  const sectionAddresses = getConsignmentAddressesForSection(sectionId, sessionData)
  const query = searchQuery.trim().toLowerCase()
  const filtered = query
    ? sectionAddresses.filter((address) => formatConsignmentAddressForSearch(address).includes(query))
    : sectionAddresses
  const resolvedAddressBookBasePath = addressBookBasePath || getAddressBookBasePathFromSession(sessionData)

  return {
    addresses: filtered.map((address) => ({
      ...address,
      searchText: formatConsignmentAddressForSearch(address),
      viewHref: buildAddressViewHref(address.id, returnPath, resolvedAddressBookBasePath)
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

  const versionBasePath = getDesignReleaseBasePath(sessionData)

  return res.render('consignment-address-select', {
    backLink: '/roles-and-addresses',
    hubCancelHref: versionBasePath ? `${versionBasePath}/notification-hub` : '/notification-hub',
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    sectionId: section.id,
    heading: section.heading,
    intro: section.hint,
    introList: section.hintList || null,
    formAction: section.path,
    formFieldName: section.formFieldName,
    inputIdPrefix: section.inputIdPrefix,
    searchInputId: section.searchInputId,
    countriesJson: JSON.stringify(countryOptions),
    addressResults: buildConsignmentAddressResults(searchQuery, section.id, sessionData, section.path),
    selectedAddressId: locals.selectedAddressId != null
      ? locals.selectedAddressId
      : sessionData[section.sessionAddressIdKey] || '',
    searchQuery,
    addAddressHref: isDesignRelease21SessionData(sessionData)
      ? `${section.path}/add-address`
      : `/address-book/add?from=${section.id}`,
    successMessage,
    data: sessionData,
    ...locals
  })
}

function getDefaultConsignmentAddressUses (sectionId) {
  // Current role is implied by the journey — do not preselect optional extra uses
  return []
}

function buildConsignmentSavedAddressTypes (sectionId, selectedAddressUses) {
  const sectionType = CONSIGNMENT_SECTION_ADDRESS_TYPE_MAP[sectionId]
  const types = []

  if (sectionType) {
    types.push(sectionType)
  }

  ;(selectedAddressUses || []).forEach((value) => {
    if (value && !types.includes(value)) {
      types.push(value)
    }
  })

  return types
}

function parseConsignmentAddressUses (rawValue, sectionId) {
  const allowedValues = new Set(getConsignmentAddressUseValuesForSection(sectionId))
  const values = Array.isArray(rawValue)
    ? rawValue
    : (rawValue ? [rawValue] : [])

  return values
    .map((value) => String(value || '').trim())
    .filter((value) => allowedValues.has(value))
}

function renderConsignmentAddAddressPage (section, req, res, locals = {}) {
  const sessionData = req.session.data
  const showAddressLookup = consignmentAddAddressUsesLookup(section.id)
  const manualAddress = locals.manualAddress || {
    nameOrOrganisation: '',
    addressLine1: '',
    addressLine2: '',
    townOrCity: '',
    county: '',
    postcode: '',
    country: showAddressLookup ? 'United Kingdom' : '',
    email: '',
    phone: ''
  }
  const versionBasePath = getDesignReleaseBasePath(sessionData)
  const sectionAddressUse = CONSIGNMENT_SECTION_ADDRESS_TYPE_MAP[section.id] || ''
  const defaultAddressUseLabel = sectionAddressUse
    ? getAddressBookAddressTypeLabel(sectionAddressUse)
    : (section.heading || 'this')
  const defaultAddressUseArticle = /^[aeiou]/i.test(defaultAddressUseLabel) ? 'an' : 'a'
  const showManualAddress = locals.showManualAddress != null
    ? locals.showManualAddress
    : Boolean(
      showAddressLookup && (
        manualAddress.addressLine1 ||
        locals.selectedLookupAddressId
      )
    )

  return res.render('consignment-add-address', {
    backLink: section.path,
    cancelHref: `${versionBasePath}/notification-hub`,
    formAction: `${section.path}/add-address`,
    sectionId: section.id,
    defaultAddressUseLabel,
    defaultAddressUseArticle,
    showAddressLookup,
    showManualAddress,
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    manualAddress,
    countryItems: showAddressLookup
      ? [{
        value: 'United Kingdom',
        text: 'United Kingdom',
        selected: true
      }]
      : [
        {
          value: '',
          text: 'Select one',
          selected: !manualAddress.country
        },
        ...buildAddressBookCountryItems(manualAddress.country)
      ],
    lookupAddressesJson: JSON.stringify(getUkConsignmentLookupAddresses()),
    addressLookup: locals.addressLookup != null
      ? locals.addressLookup
      : '',
    selectedLookupAddressId: locals.selectedLookupAddressId != null
      ? locals.selectedLookupAddressId
      : '',
    addressUseGroups: getConsignmentAddressUseGroupsForSection(section.id),
    selectedAddressUses: locals.selectedAddressUses != null
      ? locals.selectedAddressUses
      : getDefaultConsignmentAddressUses(section.id),
    data: sessionData,
    ...locals
  })
}

function handleConsignmentAddAddressGet (section, req, res) {
  if (!isDesignRelease21SessionData(req.session.data)) {
    return res.redirect(`/address-book/add?from=${section.id}`)
  }

  ensurePrototypeNotificationReference(req.session.data)

  if (!isConsignmentAddressSectionActive(req.session.data, section.id)) {
    return res.redirect('/roles-and-addresses')
  }

  setAddressBookConsignmentReturn(req.session.data, section.id)

  req.session.data.errorList = null
  req.session.data.errors = null

  return renderConsignmentAddAddressPage(section, req, res)
}

function mergeManualAddressFromLookupAndBody (lookupManualAddress, body, options = {}) {
  const parsedBody = parseAddressBookManualAddressBody(body)
  const merged = { ...(lookupManualAddress || {}) }

  Object.entries(parsedBody).forEach(([key, value]) => {
    if (value || !merged[key]) {
      merged[key] = value
    }
  })

  if (options.country) {
    merged.country = options.country
  }

  return merged
}

function handleConsignmentAddAddressPost (section, req, res) {
  if (!isDesignRelease21SessionData(req.session.data)) {
    return res.redirect(`/address-book/add?from=${section.id}`)
  }

  ensurePrototypeNotificationReference(req.session.data)

  if (!isConsignmentAddressSectionActive(req.session.data, section.id)) {
    return res.redirect('/roles-and-addresses')
  }

  const action = (req.body.action || 'select').trim()
  const showAddressLookup = consignmentAddAddressUsesLookup(section.id)
  const addressBookLookupAddressId = (req.body.addressBookLookupAddressId || '').trim()
  const lookupManualAddress = getAddressDetailsFromLookup(addressBookLookupAddressId)
  const manualAddress = mergeManualAddressFromLookupAndBody(
    lookupManualAddress,
    req.body,
    showAddressLookup ? { country: 'United Kingdom' } : {}
  )
  const selectedAddressUses = parseConsignmentAddressUses(req.body.addressUses, section.id)

  setAddressBookConsignmentReturn(req.session.data, section.id)

  const addressValidation = validateAddressBookManualAddress(manualAddress)

  if (addressValidation.errorList.length) {
    req.session.data.errorList = addressValidation.errorList
    req.session.data.errors = addressValidation.errors

    return renderConsignmentAddAddressPage(section, req, res, {
      manualAddress: addressValidation.value,
      selectedAddressUses,
      showManualAddress: showAddressLookup
        ? Boolean(
          manualAddress.addressLine1 ||
          req.body.manualAddressEntry ||
          addressBookLookupAddressId
        )
        : undefined,
      addressLookup: (req.body.addressLookup || '').trim(),
      selectedLookupAddressId: addressBookLookupAddressId
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null

  const addressTypes = buildConsignmentSavedAddressTypes(section.id, selectedAddressUses)

  if (action === 'return') {
    clearAddressBookConsignmentReturn(req.session.data)

    const { entry } = saveAddressBookEntry(req.session.data, addressValidation.value, {
      addressTypes,
      consignmentReturn: null
    })

    req.session.data.consignmentAddressSuccessMessage = formatAddressBookSuccessMessage(entry.name)

    return res.redirect(section.path)
  }

  saveAddressBookEntry(req.session.data, addressValidation.value, {
    addressTypes
  })

  return res.redirect('/roles-and-addresses')
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

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/roles-and-addresses', req.session.data))
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
  const errors = {}
  const errorList = []

  // Soft validation: other arrival fields are optional to proceed, but means of
  // transport is required (it also drives whether transit countries are shown).
  if (!values.meansOfTransport || !meansOfTransportOptions.includes(values.meansOfTransport)) {
    errors.meansOfTransport = { text: 'Select a means of transport to the port of entry' }
    errorList.push({
      text: 'Select a means of transport to the port of entry',
      href: '#means-of-transport'
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
  const arrivalDateBounds = getArrivalDatePickerBounds()
  const fromHub = isFromHub(req)
  const fromTemplateReview = isFromTemplateReview(req) || isEditingTemplateFromReview(sessionData)

  return res.render('arrival-details', {
    backLink: getJourneyBackLink(req, '/notification-hub'),
    fromHub,
    fromTemplateReview,
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

function getTotalNetWeight (sessionData) {
  const netWeight = sessionData.netWeight || {}
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)

  return speciesIds.reduce((total, speciesId) => {
    const value = Number(netWeight[speciesId])

    if (!Number.isFinite(value) || value <= 0) {
      return total
    }

    return total + value
  }, 0)
}

function hasGerminalProductsOnly (sessionData) {
  const speciesIds = normalizeSelectedSpecies(sessionData.selectedSpecies)

  if (!speciesIds.length) {
    return false
  }

  return speciesIds.every((speciesId) => {
    const match = getSpeciesMatch(speciesId)

    return match && isGerminalProductCommodity(match.commodity)
  })
}

function formatNetWeightDisplay (totalWeight) {
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return '0'
  }

  if (Number.isInteger(totalWeight)) {
    return String(totalWeight)
  }

  return String(Math.round(totalWeight * 1000) / 1000)
}

function formatReviewValueOrNa (value) {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    return 'Not applicable'
  }

  return String(value).trim()
}

function isReviewValueEmpty (value) {
  return value == null ||
    value === '' ||
    value === 'Not applicable'
}

function blankReviewValueForMissingField (value) {
  return isReviewValueEmpty(value) ? '' : value
}

function mapReviewRowsForErrorCard (rows) {
  return (rows || []).map((row) => {
    const value = blankReviewValueForMissingField(row.value)
    const isMissing = value === ''

    return {
      ...row,
      value,
      isMissing
    }
  })
}

function applyMissingFieldDisplayToErrorCard (card) {
  if (!card || !card.hasError) {
    return card
  }

  const nextCard = {
    ...card,
    rows: mapReviewRowsForErrorCard(card.rows)
  }

  if (Array.isArray(card.sections)) {
    nextCard.sections = card.sections.map((section) => ({
      ...section,
      rows: mapReviewRowsForErrorCard(section.rows)
    }))
  }

  if (card.permanentAddressSection) {
    nextCard.permanentAddressSection = {
      ...card.permanentAddressSection,
      rows: mapReviewRowsForErrorCard(card.permanentAddressSection.rows)
    }
  }

  if (Array.isArray(card.documents)) {
    nextCard.documents = card.documents.map((document) => ({
      ...document,
      rows: mapReviewRowsForErrorCard(document.rows)
    }))
  }

  if (Array.isArray(card.packagingRows)) {
    nextCard.packagingRows = mapReviewRowsForErrorCard(card.packagingRows)
  }

  return nextCard
}

function applyMissingFieldDisplayToReviewViewModel (viewModel) {
  return {
    ...viewModel,
    aboutConsignment: {
      ...viewModel.aboutConsignment,
      importDetailsCard: applyMissingFieldDisplayToErrorCard(viewModel.aboutConsignment.importDetailsCard),
      animalDetailsCard: applyMissingFieldDisplayToErrorCard(viewModel.aboutConsignment.animalDetailsCard),
      importReasonCard: applyMissingFieldDisplayToErrorCard(viewModel.aboutConsignment.importReasonCard)
    },
    descriptionOfGoods: {
      ...viewModel.descriptionOfGoods,
      commodityDetailsCard: applyMissingFieldDisplayToErrorCard(viewModel.descriptionOfGoods.commodityDetailsCard),
      additionalAnimalDetailsCard: applyMissingFieldDisplayToErrorCard(
        viewModel.descriptionOfGoods.additionalAnimalDetailsCard
      ),
      speciesSections: (viewModel.descriptionOfGoods.speciesSections || [])
        .map((section) => applyMissingFieldDisplayToErrorCard(section))
    },
    movement: {
      ...viewModel.movement,
      arrivalDetailsCard: applyMissingFieldDisplayToErrorCard(viewModel.movement.arrivalDetailsCard),
      transitCountriesCard: applyMissingFieldDisplayToErrorCard(viewModel.movement.transitCountriesCard),
      transportDetailsCard: applyMissingFieldDisplayToErrorCard(viewModel.movement.transportDetailsCard)
    },
    addresses: {
      ...viewModel.addresses,
      rolesCard: applyMissingFieldDisplayToErrorCard(viewModel.addresses.rolesCard)
    },
    contactAddress: {
      ...viewModel.contactAddress,
      contactAddressCard: applyMissingFieldDisplayToErrorCard(viewModel.contactAddress.contactAddressCard)
    },
    documents: {
      ...viewModel.documents,
      uploadedDocumentsCard: applyMissingFieldDisplayToErrorCard(viewModel.documents.uploadedDocumentsCard)
    }
  }
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

  if (approvalNumber.startsWith('IE/')) {
    return 'Republic of Ireland'
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
        }
      ]

      if (entry.isGerminalProduct) {
        rows.push(
          {
            key: 'Net weight',
            value: entry.netWeight ? `${entry.netWeight} kg` : formatReviewValueOrNa(entry.netWeight)
          },
          {
            key: 'Type of package',
            value: formatReviewValueOrNa(entry.packageType)
          },
          {
            key: 'Number of packages',
            value: formatReviewValueOrNa(entry.numberOfPackages)
          }
        )
      } else {
        rows.push({
          key: 'Number of animals',
          value: formatReviewValueOrNa(entry.numberOfAnimals)
        })

        if (entry.showPackaging) {
          entry.packagingFields.forEach((field) => {
            rows.push({
              key: field.label,
              value: formatReviewValueOrNa(field.value)
            })
          })
        }
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
  const match = getSpeciesMatch(speciesId)
  const isGerminalProduct = match && isGerminalProductCommodity(match.commodity)

  if (!isSpeciesConsignmentComplete(sessionData, speciesId)) {
    return isGerminalProduct
      ? `Enter the number of packages for ${speciesName}`
      : `Enter the number of animals for ${speciesName}`
  }

  return `Complete identification details for ${speciesName}`
}

function getSpeciesMinimumIdentifierReviewErrorMessage (sessionData, speciesId, speciesLabel) {
  if (hasAtLeastOneAnimalIdentifierForSpecies(sessionData, speciesId)) {
    return null
  }

  const speciesName = speciesLabel.toLowerCase()
  const match = getSpeciesMatch(speciesId)
  const isGerminalProduct = match && isGerminalProductCommodity(match.commodity)

  if (!isSpeciesConsignmentComplete(sessionData, speciesId)) {
    return isGerminalProduct
      ? `Enter the number of packages for ${speciesName}`
      : `Enter the number of animals for ${speciesName}`
  }

  return `Enter at least 1 animal identifier for ${speciesName}`
}

function reviewSpeciesCardErrorState (sessionData, speciesId, speciesLabel) {
  if (!requiresAnimalIdentifiersForSubmit(sessionData)) {
    return { hasError: false, errorMessage: null }
  }

  const errorMessage = getSpeciesMinimumIdentifierReviewErrorMessage(sessionData, speciesId, speciesLabel)

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
  const total = getIdentificationEntryCount(sessionData, speciesId)

  return total >= 1
}

function isSpeciesIdentifiersComplete (sessionData, speciesId) {
  const fields = getIdentifierFieldsForSpecies(speciesId)

  if (fields.length === 0) {
    return true
  }

  const total = getIdentificationEntryCount(sessionData, speciesId)

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

  if (!hasTransportDetailsComplete(sessionData)) {
    return false
  }

  if (!hasConsignmentAddressesComplete(sessionData)) {
    return false
  }

  // Documents remain optional. Animal identifiers are optional unless multiple
  // species are selected, in which case at least one identifier is required per species.
  if (!hasMinimumAnimalIdentifiersForSubmit(sessionData)) {
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

  if (additionalConfig.showTemperatureQuestion) {
    additionalAnimalRows.push({
      key: 'Temperature',
      value: formatReviewValueOrNa(sessionData.storageTemperature)
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
    }
  ]

  if (!isDesignRelease21TemplateCreate(sessionData)) {
    arrivalDetailsRows.push({
      key: 'Arrival date at destination',
      value: formatReviewValueOrNa(sessionData.arrivalDateAtPort)
    })
  }

  arrivalDetailsRows.push({
    key: 'Means of transport to the port of entry',
    value: formatReviewValueOrNa(sessionData.meansOfTransport)
  })

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
        value: formatReviewValueOrNa(document.documentTypeLabel || getDocumentTypeLabel(document.documentType, sessionData))
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
        // Transit countries are optional for submission.
        ...reviewCardErrorState(true, 'Transit countries')
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
        changeHref: '/upload-documents?from=review',
        documents: uploadedDocuments,
        // Documents are optional for submission.
        ...reviewCardErrorState(true, 'Uploaded documents')
      }
    }
  }
}

function getReviewNotificationViewModelWithErrors (sessionData) {
  const viewModel = applyMissingFieldDisplayToReviewViewModel(
    getReviewNotificationViewModel(sessionData)
  )
  const errorList = buildReviewErrorList([
    viewModel.aboutConsignment.importDetailsCard,
    viewModel.aboutConsignment.animalDetailsCard,
    viewModel.aboutConsignment.importReasonCard,
    viewModel.descriptionOfGoods.commodityDetailsCard,
    ...viewModel.descriptionOfGoods.speciesSections,
    viewModel.descriptionOfGoods.additionalAnimalDetailsCard,
    viewModel.movement.arrivalDetailsCard,
    viewModel.movement.transportDetailsCard,
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

function clearReviewViewModelErrors (viewModel) {
  const clearCard = (card) => {
    if (!card) {
      return card
    }

    return {
      ...card,
      hasError: false,
      errorMessage: null
    }
  }

  return {
    ...viewModel,
    errorList: [],
    aboutConsignment: {
      importDetailsCard: clearCard(viewModel.aboutConsignment.importDetailsCard),
      animalDetailsCard: clearCard(viewModel.aboutConsignment.animalDetailsCard),
      importReasonCard: clearCard(viewModel.aboutConsignment.importReasonCard)
    },
    descriptionOfGoods: {
      commodityDetailsCard: clearCard(viewModel.descriptionOfGoods.commodityDetailsCard),
      additionalAnimalDetailsCard: clearCard(viewModel.descriptionOfGoods.additionalAnimalDetailsCard),
      speciesSections: (viewModel.descriptionOfGoods.speciesSections || []).map(clearCard)
    },
    movement: {
      arrivalDetailsCard: clearCard(viewModel.movement.arrivalDetailsCard),
      transitCountriesCard: clearCard(viewModel.movement.transitCountriesCard),
      transportDetailsCard: clearCard(viewModel.movement.transportDetailsCard)
    },
    addresses: {
      rolesCard: clearCard(viewModel.addresses.rolesCard)
    },
    contactAddress: {
      contactAddressCard: clearCard(viewModel.contactAddress.contactAddressCard)
    },
    documents: {
      uploadedDocumentsCard: clearCard(viewModel.documents.uploadedDocumentsCard)
    }
  }
}

function buildDesignRelease2CommodityCards (sessionData, speciesSections, readOnly, reviewVariant = 'journey') {
  const grouped = new Map()

  getConsignmentSpeciesEntries(sessionData).forEach((entry) => {
    const cardKey = entry.commodityId || entry.commodityCode

    if (!grouped.has(cardKey)) {
      grouped.set(cardKey, {
        id: `review-commodity-${cardKey}`,
        title: `${entry.commodityName || entry.commonName} (${entry.commodityCode})`,
        changeHref: readOnly ? null : '/consignment-details',
        hasError: false,
        errorMessage: null,
        speciesBlocks: []
      })
    }

    const rows = entry.isGerminalProduct
      ? [
        {
          key: 'Net weight',
          value: entry.netWeight ? `${entry.netWeight} kg` : formatReviewValueOrNa(entry.netWeight)
        },
        {
          key: 'Type of package',
          value: formatReviewValueOrNa(entry.packageType)
        },
        {
          key: 'Number of packages',
          value: formatReviewValueOrNa(entry.numberOfPackages)
        }
      ]
      : [{
        key: 'Number of animals',
        value: formatReviewValueOrNa(entry.numberOfAnimals)
      }]

    if (!entry.isGerminalProduct && entry.showPackaging) {
      entry.packagingFields.forEach((field) => {
        rows.push({
          key: field.label,
          value: formatReviewValueOrNa(field.value)
        })
      })
    }

    const match = getSpeciesMatch(entry.speciesId)
    const speciesLabel = match
      ? toTitleCaseLabel(match.species.label || match.species.commonName)
      : entry.commonName
    const speciesSection = speciesSections.find((section) => section.title === speciesLabel)
    const requiresIdentifiers = getIdentifierFieldsForSpecies(entry.speciesId).length > 0
    const hasIdentifiers = hasAtLeastOneAnimalIdentifierForSpecies(sessionData, entry.speciesId)
    const identificationError = reviewVariant === 'action-required' && requiresIdentifiers && !hasIdentifiers
      ? {
        hasError: true,
        errorMessage: 'Enter a minimum of 1 identifier'
      }
      : null

    grouped.get(cardKey).speciesBlocks.push({
      speciesLabel,
      rows: rows.map((row, index) => ({
        ...row,
        showChange: !readOnly && index === 0
      })),
      identification: speciesSection && speciesSection.animalTable && !identificationError
        ? {
          headers: speciesSection.animalTable.headers,
          rows: speciesSection.animalTable.rows,
          changeHref: readOnly ? null : '/animal-identification-details'
        }
        : null,
      identificationError
    })
  })

  return Array.from(grouped.values())
}

function buildDesignRelease2DocumentCards (uploadedDocumentsCard, readOnly) {
  const documents = uploadedDocumentsCard.documents || []
  const headerAction = readOnly
    ? null
    : {
      type: 'change',
      href: uploadedDocumentsCard.changeHref || '/upload-documents'
    }

  if (!documents.length) {
    return [{
      id: uploadedDocumentsCard.id,
      title: 'Document 1',
      headerAction,
      changeHref: headerAction ? headerAction.href : null,
      rows: [{
        key: 'Document reference',
        value: 'Not applicable'
      }],
      hasError: uploadedDocumentsCard.hasError,
      errorMessage: uploadedDocumentsCard.errorMessage
    }]
  }

  return documents.map((document, index) => ({
    id: `${uploadedDocumentsCard.id}-${index + 1}`,
    title: document.title || `Document ${index + 1}`,
    headerAction,
    changeHref: headerAction ? headerAction.href : null,
    rows: document.rows,
    hasError: false,
    errorMessage: null
  }))
}

function withDr2HeaderChange (card, readOnly) {
  if (!card) {
    return card
  }

  return {
    ...card,
    headerAction: !readOnly && card.changeHref
      ? {
        type: 'change',
        href: card.changeHref
      }
      : card.headerAction || null
  }
}

function buildDesignRelease2ReviewPresentation (viewModel, sessionData, readOnly, reviewVariant = 'journey') {
  const hideDocuments = isDesignRelease21TemplateCreate(sessionData)
  const importReasonCard = withDr2HeaderChange({
    ...viewModel.aboutConsignment.importReasonCard,
    title: 'Main reason for import'
  }, readOnly)
  const additionalAnimalDetailsCard = withDr2HeaderChange({
    ...viewModel.descriptionOfGoods.additionalAnimalDetailsCard,
    title: 'Additional details'
  }, readOnly)
  const rolesCard = withDr2HeaderChange({
    ...viewModel.addresses.rolesCard,
    title: 'Addresses'
  }, readOnly)
  const contactAddressCard = withDr2HeaderChange({
    ...viewModel.contactAddress.contactAddressCard,
    title: 'Contact address'
  }, readOnly)
  const transportDetailsCard = withDr2HeaderChange({
    ...viewModel.movement.transportDetailsCard
  }, readOnly)

  const arrivalDetailsCard = withDr2HeaderChange({
    ...viewModel.movement.arrivalDetailsCard,
    subsections: viewModel.movement.transitCountriesCard
      ? [{
        heading: 'Transit countries',
        changeHref: viewModel.movement.transitCountriesCard.changeHref,
        rows: viewModel.movement.transitCountriesCard.rows.map((row) => ({
          ...row,
          showChange: !readOnly
        }))
      }]
      : null
  }, readOnly)

  return {
    aboutConsignment: {
      importDetailsCard: withDr2HeaderChange(viewModel.aboutConsignment.importDetailsCard, readOnly),
      animalDetailsCard: withDr2HeaderChange(viewModel.aboutConsignment.animalDetailsCard, readOnly),
      importReasonCard
    },
    descriptionOfGoods: {
      commodityCards: buildDesignRelease2CommodityCards(
        sessionData,
        viewModel.descriptionOfGoods.speciesSections,
        readOnly,
        reviewVariant
      ),
      additionalAnimalDetailsCard
    },
    movement: {
      arrivalDetailsCard,
      transportDetailsCard
    },
    addresses: {
      rolesCard
    },
    contactAddress: {
      contactAddressCard
    },
    documents: hideDocuments
      ? null
      : {
          documentCards: reviewVariant === 'action-required' && !hasUploadedDocuments(sessionData)
            ? []
            : buildDesignRelease2DocumentCards(viewModel.documents.uploadedDocumentsCard, readOnly),
          sectionError: reviewVariant === 'action-required' && !hasUploadedDocuments(sessionData)
            ? 'Upload a valid health certificate'
            : null
        }
  }
}

function mapStatusTextToReviewVariant (statusText = '') {
  const normalised = String(statusText).trim().toLowerCase()

  if (normalised === 'submitted') {
    return 'submitted'
  }

  if (normalised === 'submission complete' || normalised === 'complete' || normalised === 'completed') {
    return 'submission-complete'
  }

  if (normalised === 'submitted action required' || normalised === 'action required') {
    return 'action-required'
  }

  if (normalised === 'draft' || normalised === 'new' || normalised === 'in progress' || normalised === 'in-progress') {
    return 'draft'
  }

  return 'draft'
}

function getDashboardNotificationMetadata (sessionData, reference) {
  const normalisedReference = String(reference || '').trim()

  if (!normalisedReference) {
    return null
  }

  const submittedMatch = (sessionData.submittedNotifications || []).find((notification) =>
    notification.reference === normalisedReference
  )

  if (submittedMatch) {
    const conditionalItems = getConditionalSubmissionItems(submittedMatch.snapshot)

    return {
      reference: submittedMatch.reference,
      statusText: conditionalItems.length ? 'Submitted action required' : 'Submitted',
      reviewVariant: conditionalItems.length ? 'action-required' : 'submitted',
      dateSubmitted: formatDateForDashboard(submittedMatch.submittedAt),
      conditionalItems
    }
  }

  const draftMatch = (sessionData.draftNotifications || []).find((notification) =>
    notification.reference === normalisedReference
  )

  if (draftMatch) {
    return {
      reference: draftMatch.reference,
      statusText: draftMatch.statusText || 'Draft',
      reviewVariant: 'draft',
      dateCreated: formatDateForDashboard(draftMatch.createdAt),
      snapshot: draftMatch.snapshot
    }
  }

  const staticNotification = dashboardData.notifications
    .map((notification, index) => ({
      ...notification,
      reference: isTestingSessionData(sessionData)
        ? notification.reference
        : toDesignReleaseDashboardReference(notification.reference, index)
    }))
    .find((notification) => notification.reference === normalisedReference)

  if (!staticNotification) {
    return null
  }

  return {
    ...staticNotification,
    reviewVariant: staticNotification.reviewVariant || mapStatusTextToReviewVariant(staticNotification.statusText),
    conditionalItems: staticNotification.reviewVariant === 'action-required'
      ? getConditionalSubmissionItems(buildDashboardNotificationSnapshot(staticNotification))
      : []
  }
}

function buildDr2ActionRequiredWarningText (conditionalItems = []) {
  if (!conditionalItems.length) {
    return 'You need to complete missing information before import'
  }

  const needsIdentifiers = conditionalItems.some((item) => item.includes('identifier'))
  const needsDocuments = conditionalItems.some((item) => item.includes('document') || item.includes('certificate'))

  if (needsIdentifiers && needsDocuments) {
    return 'You need to complete animal identifiers and upload a health certificate'
  }

  if (needsIdentifiers) {
    return 'You need to complete animal identifiers'
  }

  if (needsDocuments) {
    return 'You need to upload a health certificate'
  }

  return conditionalItems[0]
}

function buildDr2ReviewPageHeader (metadata = {}, reviewVariant = 'journey') {
  const statusConfig = {
    draft: {
      text: 'Draft',
      modifier: 'draft'
    },
    submitted: {
      text: 'Submitted',
      modifier: 'submitted'
    },
    'submission-complete': {
      text: 'Submission complete',
      modifier: 'submission-complete'
    },
    'action-required': {
      text: 'Submitted action required',
      modifier: 'action-required'
    }
  }
  const status = statusConfig[reviewVariant] || statusConfig.draft

  return {
    reference: metadata.reference,
    statusText: metadata.statusText || status.text,
    statusModifier: status.modifier,
    dateLabel: reviewVariant === 'draft' ? 'Date created' : 'Date submitted',
    dateValue: reviewVariant === 'draft'
      ? (metadata.dateCreated || formatDeclarationDate())
      : (metadata.dateSubmitted || formatDeclarationDate()),
    warningText: reviewVariant === 'action-required'
      ? buildDr2ActionRequiredWarningText(metadata.conditionalItems)
      : null,
    showAmendButton: reviewVariant === 'action-required' || reviewVariant === 'submitted',
    showCopyButton: true,
    copyHref: metadata.copyHref || '/notifications/copy-as-new',
    amendHref: metadata.amendHref || '/notifications/amend',
    deleteHref: metadata.deleteHref || '/notifications/delete',
    showDeleteButton: true
  }
}

function getCopyAsNewSourceSnapshot (sessionData, options = {}) {
  const submittedId = String(options.submittedId || '').trim()
  const reference = String(options.reference || '').trim()

  if (submittedId) {
    const submittedNotification = getSubmittedNotificationById(sessionData, submittedId)

    if (!submittedNotification) {
      return null
    }

    return submittedNotification.snapshot
  }

  if (reference) {
    const metadata = getDashboardNotificationMetadata(sessionData, reference)

    if (!metadata) {
      return null
    }

    return metadata.snapshot || buildDashboardNotificationSnapshot(metadata)
  }

  return sessionData
}

function cloneCarriedOverValue (value) {
  if (value == null || typeof value !== 'object') {
    return value
  }

  return JSON.parse(JSON.stringify(value))
}

function applyCarriedOverNotificationFields (sessionData, source = {}) {
  const carriedOverKeys = [
    // 1. About the consignment — import details
    'countryOfOrigin',
    'regionOfOriginRequired',
    'regionOfOriginCode',
    'regionOfOriginCodeSuffix',
    'internalReference',
    // What are you importing
    'selectedSpecies',
    'commoditySelections',
    'commodityId',
    'commodityCode',
    'commodityName',
    // Main reason for import
    'importReason',
    'internalMarketPurpose',
    'transhipmentDestinationCountry',
    'transitExitBorderControlPost',
    'transitDestinationCountry',
    'temporaryAdmissionExitDate',
    'temporaryAdmissionPortOfExit',
    // 2. Additional animal details
    'certificationPurpose',
    'unweanedAnimals',
    // 3. Roles and addresses
    'placeOfOriginAddress',
    'placeOfOriginAddressId',
    'consignorAddress',
    'consignorAddressId',
    'consigneeAddress',
    'consigneeAddressId',
    'importerAddress',
    'importerAddressId',
    'placeOfDestinationAddress',
    'placeOfDestinationAddressId',
    'cphNumber',
    'permanentAddress',
    'permanentAddressId',
    'permanentAddressSameAsDestination',
    'permanentAddressSummary',
    'permanentAddressAnimals'
  ]

  carriedOverKeys.forEach((key) => {
    if (source[key] !== undefined) {
      sessionData[key] = cloneCarriedOverValue(source[key])
    }
  })

  if (sessionData.certificationPurpose) {
    sessionData.certificationPurpose = mapTemplateCertificationPurpose(sessionData.certificationPurpose)
  }
}

function copyNotificationAsNewIntoSession (sessionData, sourceSnapshot) {
  if (!sourceSnapshot || typeof sourceSnapshot !== 'object') {
    return false
  }

  const source = cloneSubmittedNotificationSnapshot(sourceSnapshot)

  resetNotificationJourneySession(sessionData)
  applyCarriedOverNotificationFields(sessionData, source)
  sessionData.notificationReference = generateDesignReleaseNotificationReference(sessionData)
  sessionData.notificationStatus = 'Draft'
  sessionData.errorList = null
  sessionData.errors = null
  persistDraftNotification(sessionData)

  return true
}

function loadDraftSnapshotIntoSession (sessionData, snapshot) {
  const preserveKeys = [
    '_isDesignRelease2Version',
    '_isDesignRelease21Version',
    '_designRelease2',
    '_designRelease21',
    'deletedNotificationReferences',
    'draftNotifications',
    'submittedNotifications',
    'addressBookAddedAddresses'
  ]
  const preserved = {}

  preserveKeys.forEach((key) => {
    if (sessionData[key] !== undefined) {
      preserved[key] = sessionData[key]
    }
  })

  Object.keys(sessionData).forEach((key) => {
    delete sessionData[key]
  })

  Object.assign(sessionData, snapshot, preserved)
}

function resolveDesignRelease2ReviewPageOptions (req, options = {}) {
  const submittedId = (options.submittedId || '').trim()
  const reference = (options.reference || '').trim()
  const dashboardBackLink = getDashboardBackLink(req.session.data)

  if (submittedId) {
    const submittedNotification = getSubmittedNotificationById(req.session.data, submittedId)

    if (!submittedNotification) {
      return { redirectTo: dashboardBackLink }
    }

    const conditionalItems = getConditionalSubmissionItems(submittedNotification.snapshot)
    const reviewVariant = conditionalItems.length ? 'action-required' : 'submitted'
    const metadata = {
      reference: submittedNotification.reference,
      statusText: conditionalItems.length ? 'Submitted action required' : 'Submitted',
      dateSubmitted: formatDateForDashboard(submittedNotification.submittedAt),
      conditionalItems,
      copyHref: `/notifications/copy-as-new?submitted=${encodeURIComponent(submittedId)}`,
      amendHref: `/notifications/amend?submitted=${encodeURIComponent(submittedId)}`,
      deleteHref: `/notifications/delete?submitted=${encodeURIComponent(submittedId)}`
    }

    return {
      sessionData: submittedNotification.snapshot,
      readOnly: true,
      showActions: false,
      reviewVariant,
      backLink: dashboardBackLink,
      pageHeader: buildDr2ReviewPageHeader(metadata, reviewVariant)
    }
  }

  if (reference) {
    const metadata = getDashboardNotificationMetadata(req.session.data, reference)

    if (!metadata) {
      return { redirectTo: dashboardBackLink }
    }

    const snapshot = metadata.snapshot || buildDashboardNotificationSnapshot(metadata)
    const reviewVariant = metadata.reviewVariant || mapStatusTextToReviewVariant(metadata.statusText)
    const isDraft = reviewVariant === 'draft'
    const isActionRequired = reviewVariant === 'action-required'

    if (isDraft || isActionRequired) {
      loadDraftSnapshotIntoSession(req.session.data, snapshot)
    }

    return {
      sessionData: (isDraft || isActionRequired) ? req.session.data : snapshot,
      readOnly: !isDraft,
      showActions: isDraft,
      reviewVariant,
      backLink: dashboardBackLink,
      pageHeader: buildDr2ReviewPageHeader({
        ...metadata,
        reference,
        copyHref: `/notifications/copy-as-new?reference=${encodeURIComponent(reference)}`,
        amendHref: `/notifications/amend?reference=${encodeURIComponent(reference)}`,
        deleteHref: `/notifications/delete?reference=${encodeURIComponent(reference)}`
      }, reviewVariant)
    }
  }

  return {
    sessionData: options.sessionData || req.session.data,
    readOnly: false,
    showActions: true,
    reviewVariant: 'journey',
    backLink: options.backLink || '/notification-hub',
    pageHeader: null
  }
}

function renderReviewNotificationPage (req, res, options = {}) {
  const isDr2 = isDesignRelease2SessionData(req.session.data)
  let sessionData = options.sessionData || req.session.data
  let readOnly = Boolean(options.readOnly)
  let showActions = options.showActions
  let reviewVariant = options.reviewVariant || 'journey'
  let backLink = options.backLink || '/notification-hub'
  let pageHeader = options.pageHeader || null

  if (isDr2 && !options.reviewVariant && (options.submittedId || options.reference)) {
    const resolved = resolveDesignRelease2ReviewPageOptions(req, {
      submittedId: options.submittedId,
      reference: options.reference,
      sessionData: options.sessionData,
      backLink: options.backLink
    })

    if (resolved.redirectTo) {
      return res.redirect(resolved.redirectTo)
    }

    sessionData = resolved.sessionData
    readOnly = resolved.readOnly
    showActions = resolved.showActions
    reviewVariant = resolved.reviewVariant
    backLink = resolved.backLink
    pageHeader = resolved.pageHeader
  }

  if (showActions === undefined) {
    showActions = !readOnly
  }

  const isAmending = String(sessionData.notificationStatus || '').trim() === 'Amend'
  const isTemplateCreate = isDesignRelease21TemplateCreate(sessionData)
  const showAmendResubmitHeading = isAmending && hasAmendChanges(sessionData)
  const viewModel = readOnly
    ? applyReadOnlyReviewViewModel(getReviewNotificationViewModel(sessionData))
    : isAmending || isTemplateCreate
      ? clearReviewViewModelErrors(getReviewNotificationViewModel(sessionData))
      : getReviewNotificationViewModelWithErrors(sessionData)

  const renderOptions = {
    backLink,
    readOnly,
    reviewVariant,
    pageHeader,
    pageName: reviewVariant === 'journey'
      ? (isTemplateCreate
        ? 'Review your template'
        : (showAmendResubmitHeading ? 'Review before re-submitting' : 'Review your notification'))
      : null,
    showActions,
    cancelAmendHref: isAmending
      ? '/notifications/cancel-amend'
      : null,
    ...viewModel,
    data: {
      ...sessionData,
      errorList: readOnly || reviewVariant === 'action-required' || isAmending || isTemplateCreate
        ? null
        : (viewModel.errorList.length ? viewModel.errorList : null)
    }
  }

  if (isDr2) {
    renderOptions.dr2Review = buildDesignRelease2ReviewPresentation(
      viewModel,
      sessionData,
      readOnly,
      reviewVariant
    )
  }

  return res.render('review-notification', renderOptions)
}

function renderDeleteNotificationPage (req, res) {
  const submittedId = (req.query.submitted || '').trim()
  const reference = (req.query.reference || '').trim()
  const dashboardBackLink = getDashboardBackLink(req.session.data)

  if (!isDesignRelease2SessionData(req.session.data) || (!submittedId && !reference)) {
    return res.redirect(dashboardBackLink)
  }

  const reviewOptions = resolveDesignRelease2ReviewPageOptions(req, { submittedId, reference })

  if (reviewOptions.redirectTo) {
    return res.redirect(reviewOptions.redirectTo)
  }

  const notificationReference = reviewOptions.pageHeader && reviewOptions.pageHeader.reference
    ? reviewOptions.pageHeader.reference
    : PROTOTYPE_NOTIFICATION_REFERENCE

  return res.render('delete-notification', {
    backLink: buildDashboardNotificationViewHref(req.session.data, submittedId ? { submittedId } : { reference }),
    notificationReference,
    deleteAction: buildDashboardNotificationDeleteHref(submittedId ? { submittedId } : { reference })
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

function hasAttachedItahc (sessionData) {
  return ensureUploadedDocuments(sessionData).some((document) => {
    const documentType = String(document.documentType || '').trim()

    return documentType === 'itahc' || documentType === 'health-certificate'
  })
}

function getSubmittedNotificationDashboardErrorMessage (sessionData) {
  if (!sessionData) {
    return null
  }

  if (!hasAttachedItahc(sessionData)) {
    return 'ITAHC is missing'
  }

  if (
    hasAnimalIdentifiersRequired(sessionData) &&
    !hasAnimalIdentifiersComplete(sessionData)
  ) {
    return 'Information is missing'
  }

  return null
}

function getDashboardActionRequiredErrorMessage (notification = {}) {
  if (notification.errorMessage) {
    return notification.errorMessage
  }

  const snapshot = notification.snapshot || buildDashboardNotificationSnapshot(notification)

  return getSubmittedNotificationDashboardErrorMessage(snapshot) || 'ITAHC is missing'
}

function getConditionalSubmissionItems (sessionData) {
  const items = []

  if (!hasAttachedItahc(sessionData)) {
    items.push('upload the ITAHC and any other required documents')
  }

  // Soft follow-up only when identifiers are optional for submit (single commodity),
  // or when the multi-commodity minimum is met but not all identifiers are complete.
  if (
    hasAnimalIdentifiersRequired(sessionData) &&
    !hasAnimalIdentifiersComplete(sessionData) &&
    hasMinimumAnimalIdentifiersForSubmit(sessionData)
  ) {
    items.push('complete the animal identifier information in the notification')
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
  const hasItahcAttached = hasAttachedItahc(sessionData)

  return res.render('notification-submitted', {
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    hasItahcAttached,
    isIncompleteSubmission: !hasItahcAttached
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
  return hasNotificationComplete(sessionData)
}

function getNotificationHubViewModel (sessionData) {
  const statusComplete = { text: 'Complete', class: 'govuk-tag--green' }
  const statusTodo = { text: 'To do', class: 'govuk-tag--blue' }
  const totalAnimals = getTotalAnimalCount(sessionData)
  const totalPackages = getTotalPackageCount(sessionData)
  const totalNetWeight = getTotalNetWeight(sessionData)
  const showGerminalSummary = hasGerminalProductsOnly(sessionData)
  const isCreatingTemplate = isCreatingTemplateJourney(sessionData)
  const isDr21 = isDesignRelease21SessionData(sessionData)
  const skipShipmentFields = isDesignRelease21TemplateCreate(sessionData)

  return {
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    isCreatingTemplate,
    templateName: sessionData.templateName || '',
    primaryAction: isCreatingTemplate
      ? (skipShipmentFields
          ? {
              text: 'Review template',
              href: '/review-notification'
            }
          : {
              text: 'Save template',
              href: '/templates/save'
            })
      : {
          text: 'Review and submit',
          href: '/review-notification'
        },
    secondaryAction: isCreatingTemplate
      ? {
          text: 'Return to manage templates',
          href: '/templates'
        }
      : {
          text: 'Return to dashboard',
          href: '/'
        },
    showGerminalSummary,
    animalCountDisplay: totalAnimals > 0 ? String(totalAnimals) : '0',
    packagesDisplay: totalPackages > 0 ? String(totalPackages) : '0',
    netWeightDisplay: formatNetWeightDisplay(totalNetWeight),
    tasklistHeading: isCreatingTemplate ? 'Template tasklist' : 'Notification tasklist',
    sections: [
      {
        title: '1. About the consignment',
        items: [
          {
            text: 'Where is this consignment coming from?',
            href: '/origin-of-the-import?from=hub',
            status: hasOriginDetails(sessionData) ? statusComplete : statusTodo
          },
          {
            text: 'What are you importing?',
            href: '/what-are-you-importing?from=hub',
            status: hasCommoditySelection(sessionData) ? statusComplete : statusTodo
          },
          {
            text: isDr21 ? 'Main import reason' : 'Main reason for import',
            href: '/reason-for-import?from=hub',
            status: hasImportReasonComplete(sessionData) ? statusComplete : statusTodo
          }
        ]
      },
      {
        title: '2. Description of the goods',
        items: [
          {
            text: 'Commodity details',
            href: '/consignment-details?from=hub',
            status: hasConsignmentDetails(sessionData) ? statusComplete : statusTodo
          },
          ...(hasAnimalIdentifiersRequired(sessionData) ? [{
            text: 'Identification details',
            href: '/animal-identification-details?from=hub',
            status: hasAnimalIdentifiersComplete(sessionData) ? statusComplete : statusTodo
          }] : []),
          {
            text: 'Additional details',
            href: '/additional-animal-details?from=hub',
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
            status: hasTransitCountriesSelected(sessionData) ? statusComplete : statusTodo
          }] : []),
          {
            text: 'Transport details',
            href: '/transporter?from=hub',
            status: hasTransportDetailsComplete(sessionData) ? statusComplete : statusTodo
          }
        ]
      },
      ...(skipShipmentFields
        ? []
        : [{
            title: '4. Documents',
            items: [
              {
                text: 'Upload documents',
                href: '/upload-documents?from=hub',
                status: hasUploadedDocuments(sessionData) ? statusComplete : statusTodo
              }
            ]
          }]),
      {
        title: skipShipmentFields ? '4. Consignment parties' : '5. Consignment parties',
        items: [
          {
            text: 'Roles and addresses',
            href: '/roles-and-addresses?from=hub',
            hint: 'Consignor or Exporter, Consignee, Importer and Place of Destination',
            status: hasConsignmentAddressesComplete(sessionData) ? statusComplete : statusTodo
          }
        ]
      },
      {
        title: skipShipmentFields ? '5. Contact address' : '6. Contact address',
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
  persistDraftNotification(req.session.data)

  return res.render('notification-hub', {
    ...getNotificationHubViewModel(req.session.data)
  })
}

function buildDashboardPageHref (page, sort, tab) {
  const params = new URLSearchParams()

  if (tab && tab !== 'in-progress') {
    params.set('tab', tab)
  }

  if (sort) {
    params.set('sort', sort)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const queryString = params.toString()

  return queryString ? `/?${queryString}` : '/'
}

function buildDashboardActionsPageHref (page, sort, delayFilter) {
  const params = new URLSearchParams()

  if (sort) {
    params.set('sort', sort)
  }

  if (delayFilter) {
    params.set('delayFilter', delayFilter)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const queryString = params.toString()

  return queryString ? `/actions?${queryString}` : '/actions'
}

function buildDashboardActionsPagination (currentPage, totalPages, sort, delayFilter) {
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
      href: buildDashboardActionsPageHref(page, sort, delayFilter),
      current: page === currentPage
    })
  }

  return {
    items,
    next: currentPage < totalPages
      ? {
          href: buildDashboardActionsPageHref(currentPage + 1, sort, delayFilter),
          text: 'Next'
        }
      : null,
    previous: currentPage > 1
      ? {
          href: buildDashboardActionsPageHref(currentPage - 1, sort, delayFilter),
          text: 'Previous'
        }
      : null
  }
}

function getDashboardActionNotifications (sessionData = {}) {
  return getDashboardNotificationList(sessionData).filter((notification) => notification.needsAction)
}

function getDashboardStatusChangeNotifications (sessionData = {}) {
  return getDashboardNotificationList(sessionData).filter((notification) => notification.hasStatusChange)
}

function getDashboardInspectionNotifications (sessionData = {}) {
  return getDashboardNotificationList(sessionData).filter((notification) => notification.chosenForInspection)
}

function buildDashboardInspectionPageHref (page, sort) {
  const params = new URLSearchParams()

  if (sort) {
    params.set('sort', sort)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const queryString = params.toString()

  return queryString ? `/inspection?${queryString}` : '/inspection'
}

function buildDashboardInspectionPagination (currentPage, totalPages, sort) {
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
      href: buildDashboardInspectionPageHref(page, sort),
      current: page === currentPage
    })
  }

  return {
    items,
    next: currentPage < totalPages
      ? {
          href: buildDashboardInspectionPageHref(currentPage + 1, sort),
          text: 'Next'
        }
      : null,
    previous: currentPage > 1
      ? {
          href: buildDashboardInspectionPageHref(currentPage - 1, sort),
          text: 'Previous'
        }
      : null
  }
}

const DASHBOARD_CHANGES_SECTIONS = [
  { id: 'passed-inspection', heading: 'Passed inspection' },
  { id: 'needs-inspection', heading: 'Needs inspection' },
  { id: 'delayed', heading: 'Delayed' }
]

function getDashboardChangesSections (sessionData = {}) {
  const statusChangeNotifications = getDashboardStatusChangeNotifications(sessionData)

  return DASHBOARD_CHANGES_SECTIONS
    .map((section) => ({
      ...section,
      notifications: statusChangeNotifications.filter((notification) => notification.statusChangeCategory === section.id)
    }))
    .filter((section) => section.notifications.length > 0)
}

function buildDashboardActionsDelayFilterItems (actionNotifications, selectedFilter) {
  const counts = {
    today: actionNotifications.filter((notification) => notification.delayCategory === 'today').length,
    'next-three-days': actionNotifications.filter((notification) => notification.delayCategory === 'next-three-days').length,
    'already-delayed': actionNotifications.filter((notification) => notification.delayCategory === 'already-delayed').length
  }

  const options = [
    { value: 'today', label: 'Today' },
    { value: 'next-three-days', label: 'Next 3 days' },
    { value: 'already-delayed', label: 'Already delayed' }
  ]

  return options.map((option) => ({
    value: option.value,
    checked: selectedFilter === option.value,
    html: `<span class="app-dr2-dashboard-filter-radios__option">${option.label}</span><span class="app-dr2-dashboard-filter-radios__count">(${counts[option.value]})</span>`
  }))
}

function buildDashboardPagination (currentPage, totalPages, sort, tab) {
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
      href: buildDashboardPageHref(page, sort, tab),
      current: page === currentPage
    })
  }

  return {
    items,
    next: currentPage < totalPages
      ? {
          href: buildDashboardPageHref(currentPage + 1, sort, tab),
          text: 'Next'
        }
      : null,
    previous: currentPage > 1
      ? {
          href: buildDashboardPageHref(currentPage - 1, sort, tab),
          text: 'Previous'
        }
      : null
  }
}

function formatDateForDashboard (value) {
  if (!value) {
    return 'Not applicable'
  }

  const isoDate = new Date(value)

  if (!Number.isNaN(isoDate.getTime()) && String(value).includes('T')) {
    return formatDeclarationDate(isoDate)
  }

  const date = parseArrivalDisplayDateToDate(value)

  if (!date) {
    return value
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

function getComparableNotificationSnapshot (sessionData) {
  const snapshot = cloneSubmittedNotificationSnapshot(sessionData)
  const transientKeys = [
    '_designRelease2',
    '_designRelease21',
    '_isDesignRelease2Version',
    '_isDesignRelease21Version',
    '_testing',
    'addressBookAddedAddresses',
    'amendingFrom',
    'amendOriginalSnapshot',
    'dashboardSuccessMessage',
    'deletedNotificationReferences',
    'draftNotifications',
    'notificationStatus',
    'savedTemplates',
    'submittedNotifications',
    'templatesSuccessMessage'
  ]

  transientKeys.forEach((key) => {
    delete snapshot[key]
  })

  return snapshot
}

function hasAmendChanges (sessionData) {
  if (!sessionData || !sessionData.amendOriginalSnapshot) {
    return false
  }

  return JSON.stringify(getComparableNotificationSnapshot(sessionData)) !==
    JSON.stringify(sessionData.amendOriginalSnapshot)
}

function persistDraftNotification (sessionData) {
  if (
    !isDesignRelease2SessionData(sessionData) ||
    isCreatingTemplateJourney(sessionData) ||
    isAmendingNotification(sessionData)
  ) {
    return null
  }

  ensurePrototypeNotificationReference(sessionData)

  return saveDraftNotification(sessionData)
}

function saveDraftNotification (sessionData, sourceSnapshot = sessionData) {
  if (!Array.isArray(sessionData.draftNotifications)) {
    sessionData.draftNotifications = []
  }

  const snapshot = cloneSubmittedNotificationSnapshot(sourceSnapshot)
  const reference = String(snapshot.notificationReference || '').trim()

  if (!reference) {
    return null
  }

  const existingDraft = sessionData.draftNotifications.find((notification) => notification.reference === reference)

  sessionData.draftNotifications = sessionData.draftNotifications.filter((notification) => notification.reference !== reference)
  sessionData.draftNotifications.unshift({
    reference,
    commodities: getReviewAnimalDetailsCommodityCodes(snapshot),
    origin: snapshot.countryOfOrigin || 'Not applicable',
    arrivalDate: formatDateForDashboard(snapshot.arrivalDateAtPort),
    statusText: 'Draft',
    createdAt: existingDraft ? existingDraft.createdAt : new Date().toISOString(),
    snapshot
  })

  return reference
}

function saveSubmittedNotification (sessionData) {
  if (!Array.isArray(sessionData.submittedNotifications)) {
    sessionData.submittedNotifications = []
  }

  const snapshot = cloneSubmittedNotificationSnapshot(sessionData)
  const submittedAt = new Date().toISOString()
  const amendingFrom = sessionData.amendingFrom || {}
  const amendedSubmittedId = String(amendingFrom.submittedId || '').trim()
  const amendedReference = String(amendingFrom.reference || snapshot.notificationReference || '').trim()
  const existingIndex = sessionData.submittedNotifications.findIndex((notification) =>
    (amendedSubmittedId && notification.id === amendedSubmittedId) ||
    (amendedReference && notification.reference === amendedReference)
  )
  const existingNotification = existingIndex > -1 ? sessionData.submittedNotifications[existingIndex] : null
  const submittedNotification = {
    id: existingNotification ? existingNotification.id : `submitted-${Date.now()}`,
    reference: snapshot.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    commodities: getReviewAnimalDetailsCommodityCodes(snapshot),
    origin: snapshot.countryOfOrigin || 'Not applicable',
    arrivalDate: formatDateForDashboard(snapshot.arrivalDateAtPort),
    statusText: getConditionalSubmissionItems(snapshot).length
      ? 'Submitted action required'
      : 'Submitted',
    statusTagClass: getConditionalSubmissionItems(snapshot).length
      ? 'govuk-tag--orange'
      : 'govuk-tag--green',
    submittedAt,
    snapshot
  }

  if (existingIndex > -1) {
    sessionData.submittedNotifications.splice(existingIndex, 1, submittedNotification)
  } else {
    sessionData.submittedNotifications.unshift(submittedNotification)
  }

  if (Array.isArray(sessionData.draftNotifications)) {
    sessionData.draftNotifications = sessionData.draftNotifications.filter((notification) => notification.reference !== snapshot.notificationReference)
  }

  delete sessionData.amendingFrom
  delete sessionData.amendOriginalSnapshot
  delete sessionData.notificationStatus

  return submittedNotification.id
}

function isDesignRelease2SessionData (sessionData) {
  return Boolean(sessionData && (
    sessionData._isDesignRelease2Version ||
    sessionData._isDesignRelease21Version
  ))
}

function getDesignReleaseBasePath (sessionData = {}) {
  if (sessionData._isDesignRelease21Version) {
    return '/design-release-2.1'
  }

  if (sessionData._isDesignRelease2Version) {
    return '/design-release-2'
  }

  return ''
}

function getAddressBookBasePathFromSession (sessionData = {}) {
  const versionBasePath = getDesignReleaseBasePath(sessionData)

  return versionBasePath ? `${versionBasePath}/address-book` : '/address-book'
}

function buildAddressBookHref (sessionData, suffix = '') {
  const basePath = getAddressBookBasePathFromSession(sessionData)

  if (!suffix) {
    return basePath
  }

  if (suffix.startsWith('?')) {
    return `${basePath}${suffix}`
  }

  const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`

  return `${basePath}${normalizedSuffix}`
}

function getDashboardBackLink (sessionData = {}) {
  if (isTestingSessionData(sessionData)) {
    return '/testing'
  }

  const designReleaseBasePath = getDesignReleaseBasePath(sessionData)

  if (designReleaseBasePath) {
    return designReleaseBasePath
  }

  return '/'
}

function buildDashboardNotificationViewHref (sessionData, options = {}) {
  const basePath = getDashboardBackLink(sessionData)
  const params = new URLSearchParams()

  if (options.submittedId) {
    params.set('submitted', options.submittedId)
  } else if (options.reference) {
    params.set('reference', options.reference)
  }

  const query = params.toString()

  return query ? `${basePath}/review-notification?${query}` : `${basePath}/review-notification`
}

function buildDashboardNotificationCopyHref (options = {}) {
  const params = new URLSearchParams()

  if (options.submittedId) {
    params.set('submitted', options.submittedId)
  } else if (options.reference) {
    params.set('reference', options.reference)
  }

  const query = params.toString()

  return query ? `/notifications/copy-as-new?${query}` : '/notifications/copy-as-new'
}

function buildDashboardNotificationDeleteHref (options = {}) {
  const params = new URLSearchParams()

  if (options.submittedId) {
    params.set('submitted', options.submittedId)
  } else if (options.reference) {
    params.set('reference', options.reference)
  }

  const query = params.toString()

  return query ? `/notifications/delete?${query}` : '/notifications/delete'
}

function getDashboardNotificationSnapshotByReference (sessionData, reference) {
  const normalisedReference = String(reference || '').trim()

  if (!normalisedReference) {
    return null
  }

  const metadata = getDashboardNotificationMetadata(sessionData, normalisedReference)

  if (!metadata) {
    return null
  }

  return metadata.snapshot || buildDashboardNotificationSnapshot(metadata)
}

function getSubmittedNotificationById (sessionData, submittedId) {
  if (!submittedId) {
    return null
  }

  return (sessionData.submittedNotifications || []).find((notification) => notification.id === submittedId) || null
}

function deleteNotification (sessionData, options = {}) {
  const submittedId = String(options.submittedId || '').trim()
  const reference = String(options.reference || '').trim()

  if (submittedId && Array.isArray(sessionData.submittedNotifications)) {
    sessionData.submittedNotifications = sessionData.submittedNotifications.filter((notification) => notification.id !== submittedId)
  }

  if (reference) {
    if (Array.isArray(sessionData.draftNotifications)) {
      sessionData.draftNotifications = sessionData.draftNotifications.filter((notification) => notification.reference !== reference)
    }

    if (!Array.isArray(sessionData.deletedNotificationReferences)) {
      sessionData.deletedNotificationReferences = []
    }

    if (!sessionData.deletedNotificationReferences.includes(reference)) {
      sessionData.deletedNotificationReferences.push(reference)
    }

    if (Array.isArray(sessionData.submittedNotifications)) {
      sessionData.submittedNotifications = sessionData.submittedNotifications.filter((notification) => notification.reference !== reference)
    }
  }
}

function formatDashboardArrivalDate (value) {
  const date = parseArrivalDisplayDateToDate(value)

  if (!date) {
    return value || 'Not applicable'
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${day}/${month}/${date.getFullYear()}`
}

function enrichDesignRelease2Notification (notification, index, sessionData = {}) {
  const consignees = [
    'Glen Keen Farm',
    'Northern Livestock Imports',
    'West Coast Animal Imports',
    'Britannia Trade Livestock',
    'Prime Livestock UK'
  ]
  const consignors = [
    'Monk Park Farm',
    'Green Valley Farm',
    'Oak Hill Farm',
    'Riverside Farm',
    'Valea Mare Farm'
  ]
  const commodityMap = {
    '010410, 010420': 'Goats & Sheep',
    '0102': 'Cattle',
    '0101': 'Horses',
    '0103': 'Pigs',
    '01061900': 'Camelids',
    '010511, 010512': 'Poultry',
    '010614': 'Rabbits',
    '010410': 'Sheep'
  }

  const reviewVariant = notification.reviewVariant || mapStatusTextToReviewVariant(notification.statusText)
  const notificationHasCategoryLabel = Boolean(notification.categoryLabel)
  const notificationHasCommodityLabel = Boolean(notification.commodityLabel)
  let categoryLabel = notification.categoryLabel || (
    isDesignRelease21SessionData(sessionData) && hasGerminalProductsOnly(sessionData)
      ? 'Germinal products'
      : 'Live animals'
  )
  let cardVariant = 'default'
  let statusDisplay = {
    type: 'text',
    text: notification.statusText,
    style: 'default'
  }
  let inspectionRequired = false
  let errorMessage = null

  if (reviewVariant === 'submitted') {
    statusDisplay = {
      type: 'text',
      text: 'Submitted',
      style: 'submitted'
    }
  } else if (reviewVariant === 'submission-complete') {
    statusDisplay = {
      type: 'text',
      text: 'Completed',
      style: 'completed'
    }
  } else if (reviewVariant === 'action-required') {
    cardVariant = 'error'
    statusDisplay = {
      type: 'tag',
      text: 'Action required',
      style: 'action-required'
    }
    errorMessage = getDashboardActionRequiredErrorMessage(notification)
  } else if (reviewVariant === 'draft') {
    statusDisplay = {
      type: 'tag',
      text: 'Draft',
      style: 'draft'
    }
  }

  const preserveStatusVariant = reviewVariant === 'draft' || reviewVariant === 'submission-complete'

  if (!preserveStatusVariant && !notificationHasCategoryLabel && index % 6 === 3) {
    categoryLabel = 'Plants'
    cardVariant = 'default'
    statusDisplay = {
      type: 'text',
      text: 'Submitted',
      style: 'submitted'
    }
    errorMessage = null
  }

  if (!preserveStatusVariant && !notificationHasCategoryLabel && index % 6 === 4) {
    inspectionRequired = true
    statusDisplay = {
      type: 'text',
      text: 'Submitted',
      style: 'submitted'
    }
  }

  const actionDemoIndices = new Set([2, 8, 14, 20])
  const statusChangeDemoMap = {
    4: 'needs-inspection',
    7: 'passed-inspection',
    11: 'delayed'
  }
  const chosenForInspectionDemoIndices = new Set([5, 10, 16, 17, 22, 23])
  let finalCardVariant = cardVariant
  let finalStatusDisplay = statusDisplay
  let finalErrorMessage = errorMessage
  let finalInspectionRequired = inspectionRequired

  if (!preserveStatusVariant && actionDemoIndices.has(index)) {
    finalCardVariant = 'error'
    finalStatusDisplay = {
      type: 'tag',
      text: 'Action required',
      style: 'action-required'
    }
    finalErrorMessage = getDashboardActionRequiredErrorMessage(notification)
  } else if (!preserveStatusVariant) {
    const statusChangeCategory = statusChangeDemoMap[index]

    if (statusChangeCategory === 'passed-inspection') {
      finalCardVariant = 'default'
      finalStatusDisplay = {
        type: 'text',
        text: 'Completed',
        style: 'completed'
      }
      finalErrorMessage = null
      finalInspectionRequired = false
    } else if (statusChangeCategory === 'needs-inspection') {
      finalCardVariant = 'default'
      finalStatusDisplay = {
        type: 'text',
        text: 'Submitted',
        style: 'submitted'
      }
      finalErrorMessage = null
      finalInspectionRequired = true
    } else if (statusChangeCategory === 'delayed') {
      finalCardVariant = 'error'
      finalStatusDisplay = {
        type: 'tag',
        text: 'Delayed',
        style: 'delayed'
      }
      finalErrorMessage = finalErrorMessage || 'Error message'
      finalInspectionRequired = false
    } else if (chosenForInspectionDemoIndices.has(index)) {
      finalCardVariant = 'default'
      finalStatusDisplay = {
        type: 'text',
        text: 'Submitted',
        style: 'submitted'
      }
      finalErrorMessage = null
      finalInspectionRequired = true
    }
  }

  const statusChangeCategory = statusChangeDemoMap[index] || null
  const chosenForInspection = chosenForInspectionDemoIndices.has(index) && !actionDemoIndices.has(index)
  const needsAction = finalCardVariant === 'error' && Boolean(finalErrorMessage) && finalStatusDisplay.style === 'action-required'
  const hasStatusChange = Boolean(statusChangeCategory)
  const delayCategory = needsAction && index === 2 ? 'today' : null

  let resolvedReviewVariant = reviewVariant

  if (finalStatusDisplay.style === 'submitted') {
    resolvedReviewVariant = 'submitted'
  } else if (finalStatusDisplay.style === 'completed') {
    resolvedReviewVariant = 'submission-complete'
  } else if (finalStatusDisplay.style === 'action-required') {
    resolvedReviewVariant = 'action-required'
  } else if (finalStatusDisplay.style === 'draft') {
    resolvedReviewVariant = 'draft'
  }

  return {
    ...notification,
    consignee: notification.consignee || consignees[index % consignees.length],
    consignor: notification.consignor || consignors[index % consignors.length],
    categoryLabel,
    commodityLabel: notification.commodityLabel || commodityMap[notification.commodities] || notification.commodities,
    numberOfAnimals: notification.numberOfAnimals || String(8 + (index % 5)),
    quantityLabel: notification.quantityLabel || 'Number of animals',
    quantityValue: notification.quantityValue || notification.numberOfAnimals || String(8 + (index % 5)),
    arrivalDateDisplay: formatDashboardArrivalDate(notification.arrivalDate),
    cardVariant: finalCardVariant,
    statusDisplay: finalStatusDisplay,
    reviewVariant: resolvedReviewVariant,
    inspectionRequired: finalInspectionRequired,
    errorMessage: finalErrorMessage,
    needsAction,
    hasStatusChange,
    statusChangeCategory,
    chosenForInspection,
    delayCategory
  }
}

function getDashboardNotificationList (sessionData = {}) {
  const testingConsignees = [
    'Macdonald Osborne Inc',
    'Northern Livestock Imports',
    'West Coast Animal Imports',
    'Britannia Trade Livestock',
    'Prime Livestock UK'
  ]
  const testingConsignors = [
    'Wagner and Matthews',
    'Green Valley Farm',
    'Oak Hill Farm',
    'Riverside Farm',
    'Valea Mare Farm'
  ]

  const enrichTestingNotification = (notification, index) => {
    const statusText = notification.statusText || 'Draft'
    const normalisedStatus = statusText.toLowerCase()
    let statusTagClass = 'app-ipaffs-tag--draft'

    if (normalisedStatus === 'submitted') {
      statusTagClass = 'app-ipaffs-tag--submitted'
    } else if (normalisedStatus === 'in progress' || normalisedStatus === 'in-progress') {
      statusTagClass = 'app-ipaffs-tag--in-progress'
    } else if (normalisedStatus === 'approved' || normalisedStatus === 'complete') {
      statusTagClass = 'app-ipaffs-tag--approved'
    } else if (normalisedStatus === 'rejected') {
      statusTagClass = 'app-ipaffs-tag--rejected'
    }

    return {
      ...notification,
      consignee: notification.consignee || testingConsignees[index % testingConsignees.length],
      consignor: notification.consignor || testingConsignors[index % testingConsignors.length],
      statusTagClass
    }
  }

  const drafts = (sessionData.draftNotifications || []).map((notification, index) => {
    const mapped = {
      reference: notification.reference,
      commodities: notification.commodities,
      statusText: 'Draft',
      statusTagClass: 'app-ipaffs-tag--draft',
      statusModifier: 'draft',
      reviewVariant: 'draft',
      origin: notification.origin,
      arrivalDate: notification.arrivalDate,
      consignee: notification.snapshot && notification.snapshot.consigneeAddress
        ? notification.snapshot.consigneeAddress.name
        : null,
      consignor: notification.snapshot && notification.snapshot.consignorAddress
        ? notification.snapshot.consignorAddress.name
        : null,
      viewHref: isDesignRelease2SessionData(sessionData)
        ? buildDashboardNotificationViewHref(sessionData, { reference: notification.reference })
        : `/review-notification?reference=${encodeURIComponent(notification.reference)}`,
      copyHref: isDesignRelease2SessionData(sessionData)
        ? buildDashboardNotificationCopyHref({ reference: notification.reference })
        : null,
      deleteHref: isDesignRelease2SessionData(sessionData)
        ? buildDashboardNotificationDeleteHref({ reference: notification.reference })
        : null
    }

    return isDesignRelease2SessionData(sessionData)
      ? enrichDesignRelease2Notification(mapped, index, sessionData)
      : mapped
  })

  const submitted = (sessionData.submittedNotifications || []).map((notification, index) => {
    const snapshot = notification.snapshot || {}
    const reviewVariant = mapStatusTextToReviewVariant(notification.statusText)
    const errorMessage = reviewVariant === 'action-required'
      ? getSubmittedNotificationDashboardErrorMessage(snapshot)
      : null
    const mapped = {
      reference: notification.reference,
      commodities: notification.commodities,
      statusText: notification.statusText,
      statusTagClass: notification.statusTagClass,
      statusModifier: reviewVariant,
      reviewVariant,
      origin: notification.origin,
      arrivalDate: notification.arrivalDate,
      consignee: notification.consignee,
      consignor: notification.consignor,
      snapshot,
      errorMessage,
      viewHref: isDesignRelease2SessionData(sessionData)
        ? buildDashboardNotificationViewHref(sessionData, { submittedId: notification.id })
        : `/review-notification?submitted=${encodeURIComponent(notification.id)}`,
      copyHref: isDesignRelease2SessionData(sessionData)
        ? buildDashboardNotificationCopyHref({ submittedId: notification.id })
        : null,
      deleteHref: isDesignRelease2SessionData(sessionData)
        ? buildDashboardNotificationDeleteHref({ submittedId: notification.id })
        : null
    }

    return isTestingSessionData(sessionData)
      ? enrichTestingNotification(mapped, index)
      : isDesignRelease2SessionData(sessionData)
        ? enrichDesignRelease2Notification(mapped, index, sessionData)
        : mapped
  })

  const draftReferences = new Set(drafts.map((notification) => notification.reference))
  const submittedReferences = new Set(submitted.map((notification) => notification.reference))
  const deletedReferences = new Set(sessionData.deletedNotificationReferences || [])
  const staticNotifications = dashboardData.notifications
    .map((notification, index) => {
      if (isTestingSessionData(sessionData)) {
        return enrichTestingNotification(notification, index + submitted.length)
      }

      const reference = toDesignReleaseDashboardReference(notification.reference, index)
      const mapped = {
        ...notification,
        reference,
        statusModifier: notification.reviewVariant || mapStatusTextToReviewVariant(notification.statusText),
        viewHref: isDesignRelease2SessionData(sessionData)
          ? buildDashboardNotificationViewHref(sessionData, { reference })
          : notification.viewHref,
        copyHref: isDesignRelease2SessionData(sessionData)
          ? buildDashboardNotificationCopyHref({ reference })
          : null,
        deleteHref: isDesignRelease2SessionData(sessionData)
          ? buildDashboardNotificationDeleteHref({ reference })
          : null
      }

      return isDesignRelease2SessionData(sessionData)
        ? enrichDesignRelease2Notification(mapped, index + submitted.length, sessionData)
        : mapped
    })
    .filter((notification) =>
      !draftReferences.has(notification.reference) &&
      !submittedReferences.has(notification.reference) &&
      !deletedReferences.has(notification.reference)
    )

  return [...drafts, ...submitted, ...staticNotifications]
}

function buildDashboardResultsText (start, end, total, options = {}) {
  if (options.testing) {
    if (!total) {
      return '0 results'
    }

    return `${total} results`
  }

  if (!total) {
    return 'Show 0 of 0 results'
  }

  return `Show ${start}-${end} of ${total} results`
}

function buildDashboardSortItems (selectedValue, options = {}) {
  const sortItems = options.testing
    ? [
        { value: 'arrival-newest', text: 'Arrival (newest to oldest)' },
        { value: 'arrival-oldest', text: 'Arrival (oldest to newest)' },
        { value: 'newest', text: 'Newest first' },
        { value: 'oldest', text: 'Oldest first' }
      ]
    : dashboardData.sortItems

  return sortItems.map((item) => ({
    ...item,
    selected: selectedValue === item.value || (!selectedValue && options.testing && item.value === 'arrival-newest')
  }))
}

function getSavedTemplates (sessionData = {}) {
  return Array.isArray(sessionData.savedTemplates) ? sessionData.savedTemplates : []
}

function getAllDashboardTemplates (sessionData = {}) {
  const deletedIds = new Set(sessionData.deletedTemplateIds || [])
  const savedTemplates = getSavedTemplates(sessionData).filter((template) => !deletedIds.has(template.id))
  const savedIds = new Set(savedTemplates.map((template) => template.id))

  return [
    ...savedTemplates,
    ...dashboardTemplates.filter((template) => !deletedIds.has(template.id) && !savedIds.has(template.id))
  ]
}

function getDashboardTemplateById (templateId, sessionData = {}) {
  return getAllDashboardTemplates(sessionData).find((template) => template.id === templateId) || null
}

function buildTemplateIdFromName (title, sessionData = {}) {
  const base = String(title || 'template')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'template'
  const existingIds = new Set(getAllDashboardTemplates(sessionData).map((template) => template.id))

  if (!existingIds.has(base)) {
    return base
  }

  let suffix = 2
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  return `${base}-${suffix}`
}

function buildTemplatePlaceFromSessionAddress (address) {
  if (!address || typeof address !== 'object') {
    return {
      name: '',
      lines: []
    }
  }

  return {
    name: address.name || '',
    lines: [...(address.addressLines || []), address.country].filter(Boolean)
  }
}

function buildTemplateFromSession (sessionData) {
  const title = String(sessionData.templateName || '').trim() || 'Untitled template'
  const commodityLabel = getReviewAnimalDetailsCommonNames(sessionData) || 'Not applicable'
  const speciesLabels = getSelectedSpeciesLabelsForReview(sessionData)
  const placeOfOrigin = buildTemplatePlaceFromSessionAddress(sessionData.placeOfOriginAddress)
  const contactAddress = buildTemplatePlaceFromSessionAddress(
    sessionData.contactAddressId
      ? getContactAddressById(sessionData.contactAddressId, sessionData)
      : null
  )
  const consigneeName = sessionData.consigneeAddress && sessionData.consigneeAddress.name
    ? sessionData.consigneeAddress.name
    : 'Not applicable'
  const consignorName = sessionData.consignorAddress && sessionData.consignorAddress.name
    ? sessionData.consignorAddress.name
    : 'Not applicable'
  const totalAnimals = getTotalAnimalCount(sessionData)
  const totalPackages = getTotalPackageCount(sessionData)
  const transporter = sessionData.transporter || null
  const selectedSpecies = normalizeSelectedSpecies(sessionData.selectedSpecies)
  const animalIdentifiers = getAnimalIdentifiers(sessionData)

  return {
    id: sessionData.templateId || buildTemplateIdFromName(title, sessionData),
    categoryLabel: hasGerminalProductsOnly(sessionData) ? 'Germinal products' : 'Live animals',
    title,
    commodityLabel,
    origin: sessionData.countryOfOrigin || 'Not applicable',
    consignee: consigneeName,
    consignor: consignorName,
    dateCreated: formatDeclarationDate(),
    review: {
      countryOfOrigin: sessionData.countryOfOrigin || null,
      regionOfOriginCode: sessionData.regionOfOriginCode || 'N/A',
      internalReferenceNumber: sessionData.internalReference || 'N/A',
      commodityCode: getReviewAnimalDetailsCommodityCodes(sessionData) || '',
      commonName: commodityLabel,
      species: speciesLabels || '',
      reasonForImport: sessionData.importReason || null,
      purposeInTheMarket: sessionData.internalMarketPurpose || null,
      certifiedFor: sessionData.certificationPurpose || null,
      unweanedAnimals: sessionData.unweanedAnimals || null,
      numberOfAnimals: totalAnimals > 0 ? String(totalAnimals) : null,
      numberOfPackages: totalPackages > 0 ? String(totalPackages) : null,
      selectedSpecies,
      commoditySelections: Array.isArray(sessionData.commoditySelections)
        ? sessionData.commoditySelections
        : [],
      numberOfAnimalsBySpecies: sessionData.numberOfAnimals || {},
      numberOfPackagesBySpecies: sessionData.numberOfPackages || {},
      netWeight: sessionData.netWeight || {},
      packageType: sessionData.packageType || {},
      animalIdentifiers: Object.keys(animalIdentifiers).length
        ? JSON.parse(JSON.stringify(animalIdentifiers))
        : {},
      arrivalDateAtPort: isDesignRelease21TemplateCreate(sessionData)
        ? null
        : (sessionData.arrivalDateAtPort || null),
      portOfEntry: sessionData.portOfEntry || null,
      meansOfTransport: sessionData.meansOfTransport || null,
      transportIdentification: sessionData.transportIdentification || null,
      transportDocumentReference: sessionData.transportDocumentReference || null,
      transporter: transporter
        ? {
            name: transporter.name || null,
            address: transporter.address || null,
            country: getTransporterCountryLabel(sessionData) || null,
            approvalNumber: transporter.approvalNumber || null,
            type: transporter.type || null
          }
        : null,
      placeOfOrigin,
      contactAddress: contactAddress.name ? contactAddress : placeOfOrigin,
      useSameAddressForParties: true,
      cphNumber: sessionData.cphNumber || null
    }
  }
}

function saveTemplateFromSession (sessionData) {
  if (!Array.isArray(sessionData.savedTemplates)) {
    sessionData.savedTemplates = []
  }

  const template = buildTemplateFromSession(sessionData)
  sessionData.savedTemplates = sessionData.savedTemplates.filter((item) => item.id !== template.id)
  sessionData.savedTemplates.unshift(template)

  return template
}

function generateDesignReleaseNotificationReference (sessionData = {}) {
  const existing = new Set([
    DESIGN_RELEASE_NOTIFICATION_REFERENCE,
    String(sessionData.notificationReference || '').trim(),
    ...((dashboardData.notifications || []).map((notification) =>
      String(notification.reference || '').trim()
    )),
    ...((sessionData.draftNotifications || []).map((notification) =>
      String(notification.reference || '').trim()
    )),
    ...((sessionData.submittedNotifications || []).map((notification) =>
      String(notification.reference || '').trim()
    ))
  ].filter(Boolean))

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const code = Math.random()
      .toString(36)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .padEnd(6, '0')
      .slice(0, 6)
    const reference = `GBN-AG-26-${code}`

    if (!existing.has(reference)) {
      return reference
    }
  }

  return `GBN-AG-26-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

function normaliseTemplateSpeciesLabel (value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function templateSpeciesLabelMatches (templateLabel, species) {
  const normalisedTemplate = normaliseTemplateSpeciesLabel(templateLabel)
  const normalisedLabel = normaliseTemplateSpeciesLabel(species.label)
  const normalisedCommonName = normaliseTemplateSpeciesLabel(species.commonName)

  if (!normalisedTemplate) {
    return false
  }

  if (
    normalisedTemplate === normalisedLabel ||
    (normalisedCommonName && normalisedTemplate === normalisedCommonName)
  ) {
    return true
  }

  if (
    normalisedLabel.includes(normalisedTemplate) ||
    normalisedTemplate.includes(normalisedLabel) ||
    (normalisedCommonName && (
      normalisedCommonName.includes(normalisedTemplate) ||
      normalisedTemplate.includes(normalisedCommonName)
    ))
  ) {
    return true
  }

  const templateTokens = normalisedTemplate.split(' ').filter(Boolean)
  const labelTokens = normalisedLabel.split(' ').filter(Boolean)

  return Boolean(
    templateTokens[0] &&
    labelTokens[0] &&
    templateTokens[0] === labelTokens[0] &&
    templateTokens[0].length > 3
  )
}

function getCommoditiesMatchingTemplateCode (commodityCode) {
  const code = String(commodityCode || '').trim()

  if (!code) {
    return []
  }

  return allCommodities.filter((commodity) =>
    commodity.code === code ||
    commodity.code.startsWith(code) ||
    code.startsWith(commodity.code)
  )
}

function resolveSpeciesIdsFromTemplateReview (review) {
  const matchingCommodities = getCommoditiesMatchingTemplateCode(review.commodityCode)
  const candidateCommodities = matchingCommodities.length ? matchingCommodities : allCommodities
  const speciesLabels = String(review.species || '')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)
  const matchedIds = []

  function addSpeciesId (speciesId) {
    if (speciesId && !matchedIds.includes(speciesId)) {
      matchedIds.push(speciesId)
    }
  }

  speciesLabels.forEach((label) => {
    const exactMatches = []
    const fuzzyMatches = []

    candidateCommodities.forEach((commodity) => {
      commodity.species.forEach((species) => {
        const normalisedTemplate = normaliseTemplateSpeciesLabel(label)
        const normalisedLabel = normaliseTemplateSpeciesLabel(species.label)
        const normalisedCommonName = normaliseTemplateSpeciesLabel(species.commonName)
        const isExact = normalisedTemplate === normalisedLabel ||
          (normalisedCommonName && normalisedTemplate === normalisedCommonName)

        if (isExact) {
          exactMatches.push(species.id)
          return
        }

        if (templateSpeciesLabelMatches(label, species)) {
          fuzzyMatches.push(species.id)
        }
      })
    })

    if (exactMatches.length) {
      exactMatches.forEach(addSpeciesId)
      return
    }

    fuzzyMatches.forEach(addSpeciesId)
  })

  if (matchedIds.length) {
    return matchedIds
  }

  matchingCommodities.forEach((commodity) => {
    addSpeciesId(commodity.species[0] && commodity.species[0].id)
  })

  return matchedIds
}

function buildSessionAddressFromTemplatePlace (place) {
  if (!place || !place.name) {
    return null
  }

  const lines = [...(place.lines || [])]
  let country = ''

  if (lines.length && countryLabels.includes(lines[lines.length - 1])) {
    country = lines.pop()
  }

  return {
    name: place.name,
    addressLines: lines,
    country
  }
}

function mapTemplateCertificationPurpose (certifiedFor) {
  const value = String(certifiedFor || '').trim()

  if (certificationPurposeOptions.includes(value)) {
    return value
  }

  const aliases = {
    Breeding: 'Further keeping',
    'Breeding and/or production': 'Further keeping',
    Slaughter: 'Slaughter'
  }

  return aliases[value] || 'Further keeping'
}

function seedNotificationSessionFromTemplate (sessionData, template) {
  const review = template.review || {}
  const speciesIds = resolveSpeciesIdsFromTemplateReview(review)
  const regionOfOriginCode = String(review.regionOfOriginCode || '').trim()
  const regionParts = regionOfOriginCode.split('-')
  const regionSuffix = regionParts.length > 1 ? regionParts.slice(1).join('-') : regionOfOriginCode
  const address = buildSessionAddressFromTemplatePlace(review.placeOfOrigin)
  const internalReference = String(review.internalReferenceNumber || '').trim()

  sessionData.notificationReference = generateDesignReleaseNotificationReference(sessionData)
  sessionData.notificationStatus = 'Draft'
  sessionData.templateId = template.id
  sessionData.templateName = template.title
  sessionData.countryOfOrigin = review.countryOfOrigin || null
  sessionData.regionOfOriginRequired = regionOfOriginCode ? 'Yes' : 'No'
  sessionData.regionOfOriginCode = regionOfOriginCode || null
  sessionData.regionOfOriginCodeSuffix = regionOfOriginCode ? regionSuffix : null
  sessionData.internalReference = !internalReference || internalReference.toUpperCase() === 'N/A'
    ? null
    : internalReference

  applySpeciesSelectionToSession(sessionData, speciesIds)

  if (Array.isArray(review.commoditySelections) && review.commoditySelections.length) {
    sessionData.commoditySelections = review.commoditySelections
  }

  if (review.numberOfAnimalsBySpecies && typeof review.numberOfAnimalsBySpecies === 'object') {
    sessionData.numberOfAnimals = { ...review.numberOfAnimalsBySpecies }
  }

  if (review.numberOfPackagesBySpecies && typeof review.numberOfPackagesBySpecies === 'object') {
    sessionData.numberOfPackages = { ...review.numberOfPackagesBySpecies }
  }

  if (review.netWeight && typeof review.netWeight === 'object') {
    sessionData.netWeight = { ...review.netWeight }
  }

  if (review.packageType && typeof review.packageType === 'object') {
    sessionData.packageType = { ...review.packageType }
  }

  if (review.animalIdentifiers && typeof review.animalIdentifiers === 'object') {
    sessionData.animalIdentifiers = JSON.parse(JSON.stringify(review.animalIdentifiers))
  }

  sessionData.importReason = review.reasonForImport || null
  sessionData.internalMarketPurpose = review.reasonForImport === 'Internal market'
    ? (review.purposeInTheMarket || null)
    : null
  sessionData.certificationPurpose = mapTemplateCertificationPurpose(review.certifiedFor)

  if (getUnweanedOptions(sessionData).length) {
    const unweanedAnimals = String(review.unweanedAnimals || '').trim()
    sessionData.unweanedAnimals = getUnweanedOptions(sessionData).includes(unweanedAnimals)
      ? unweanedAnimals
      : 'No'
  } else {
    sessionData.unweanedAnimals = null
  }

  if (address) {
    const addressSections = [
      'placeOfOrigin',
      'consignor',
      'consignee',
      'importer',
      'placeOfDestination'
    ]

    addressSections.forEach((sectionKey) => {
      sessionData[`${sectionKey}Address`] = {
        name: address.name,
        addressLines: [...address.addressLines],
        country: address.country
      }
      sessionData[`${sectionKey}AddressId`] = `template-${template.id}-${sectionKey}`
    })
  }

  sessionData.cphNumber = review.cphNumber || null
  sessionData.errorList = null
  sessionData.errors = null
}

function buildTemplateAddressValue (address) {
  return {
    isAddress: true,
    name: address.name,
    lines: address.lines || []
  }
}

function buildTemplateSessionFromReview (review = {}) {
  const speciesIds = Array.isArray(review.selectedSpecies) && review.selectedSpecies.length
    ? review.selectedSpecies
    : resolveSpeciesIdsFromTemplateReview(review)
  const sessionLike = {
    selectedSpecies: speciesIds,
    commoditySelections: Array.isArray(review.commoditySelections) ? review.commoditySelections : [],
    numberOfAnimals: review.numberOfAnimalsBySpecies || {},
    numberOfPackages: review.numberOfPackagesBySpecies || {},
    netWeight: review.netWeight || {},
    packageType: review.packageType || {},
    animalIdentifiers: review.animalIdentifiers || {}
  }

  if (!Object.keys(sessionLike.numberOfAnimals).length && review.numberOfAnimals && speciesIds.length === 1) {
    sessionLike.numberOfAnimals = {
      [speciesIds[0]]: String(review.numberOfAnimals)
    }
  }

  if (!Object.keys(sessionLike.numberOfPackages).length && review.numberOfPackages && speciesIds.length === 1) {
    sessionLike.numberOfPackages = {
      [speciesIds[0]]: String(review.numberOfPackages)
    }
  }

  if (!sessionLike.commoditySelections.length && speciesIds.length) {
    applySpeciesSelectionToSession(sessionLike, speciesIds)
  }

  return sessionLike
}

function buildTemplateCommodityCards (review = {}) {
  const sessionLike = buildTemplateSessionFromReview(review)
  const speciesIds = normalizeSelectedSpecies(sessionLike.selectedSpecies)

  if (!speciesIds.length) {
    const commodityTitle = review.commodityCode
      ? `${formatReviewValueOrNa(review.commonName)} (${review.commodityCode})`
      : formatReviewValueOrNa(review.commonName)

    return [{
      id: 'template-commodity-details',
      title: commodityTitle,
      speciesBlocks: [{
        speciesLabel: formatReviewValueOrNa(review.species || review.commonName),
        rows: [
          { key: 'Number of animals', value: formatReviewValueOrNa(review.numberOfAnimals) },
          { key: 'Number of packages', value: formatReviewValueOrNa(review.numberOfPackages) }
        ],
        identification: null,
        identificationError: null
      }]
    }]
  }

  const speciesSections = buildReviewSpeciesSections(sessionLike)
  return buildDesignRelease2CommodityCards(sessionLike, speciesSections, true)
}

function withTemplateReviewChangeAction (card, changeHref) {
  if (!card) {
    return card
  }

  if (!changeHref) {
    return {
      ...card,
      headerAction: null,
      changeHref: null
    }
  }

  return {
    ...card,
    changeHref,
    headerAction: {
      type: 'change',
      href: changeHref
    }
  }
}

function getTemplateReviewChangeHref (templateId, section) {
  if (!templateId || !section) {
    return null
  }

  return `/templates/${templateId}/change/${section}`
}

function buildTemplateReviewViewModel (template, basePath = '/design-release-2', options = {}) {
  const review = template.review || {}
  const templateId = template.id
  const hideArrivalDate = Boolean(options.hideArrivalDate)
  const addressValue = buildTemplateAddressValue(review.placeOfOrigin || { name: '', lines: [] })
  const contactAddressValue = review.contactAddress
    ? buildTemplateAddressValue(review.contactAddress)
    : addressValue
  const transporter = review.transporter || {}
  const commodityChangeHref = getTemplateReviewChangeHref(templateId, 'consignment-details')
  const identificationChangeHref = getTemplateReviewChangeHref(templateId, 'animal-identification-details')
  const commodityCards = buildTemplateCommodityCards(review).map((card) => {
    const withChange = withTemplateReviewChangeAction(card, commodityChangeHref)

    return {
      ...withChange,
      speciesBlocks: (card.speciesBlocks || []).map((block) => ({
        ...block,
        rows: (block.rows || []).map((row) => ({
          ...row,
          showChange: false
        })),
        identification: block.identification
          ? {
            ...block.identification,
            changeHref: identificationChangeHref
          }
          : null
      }))
    }
  })

  const transporterAddress = (() => {
    if (!transporter.address) {
      return 'Not applicable'
    }

    if (typeof transporter.address === 'string') {
      return {
        isAddress: true,
        name: '',
        lines: transporter.address.split('\n').map((line) => line.trim()).filter(Boolean)
      }
    }

    if (Array.isArray(transporter.address)) {
      return {
        isAddress: true,
        name: '',
        lines: transporter.address
      }
    }

    return formatReviewValueOrNa(transporter.address)
  })()

  return {
    importDetailsCard: withTemplateReviewChangeAction({
      id: 'template-import-details',
      title: 'Import details',
      rows: [
        { key: 'Country of origin', value: formatReviewValueOrNa(review.countryOfOrigin) },
        { key: 'Region of origin code', value: formatReviewValueOrNa(review.regionOfOriginCode) },
        { key: 'Internal reference number', value: formatReviewValueOrNa(review.internalReferenceNumber) }
      ]
    }, getTemplateReviewChangeHref(templateId, 'origin-of-the-import')),
    animalDetailsCard: withTemplateReviewChangeAction({
      id: 'template-animal-details',
      title: 'Animal details',
      rows: [
        { key: 'Commodity code', value: formatReviewValueOrNa(review.commodityCode) },
        { key: 'Common name', value: formatReviewValueOrNa(review.commonName) },
        { key: 'Species', value: formatReviewValueOrNa(review.species) }
      ]
    }, getTemplateReviewChangeHref(templateId, 'what-are-you-importing')),
    importReasonCard: withTemplateReviewChangeAction({
      id: 'template-import-reason',
      title: 'Additional animal details',
      rows: [
        { key: 'Reason for import', value: formatReviewValueOrNa(review.reasonForImport) },
        { key: 'Purpose in the market', value: formatReviewValueOrNa(review.purposeInTheMarket) }
      ]
    }, getTemplateReviewChangeHref(templateId, 'reason-for-import')),
    commodityCards,
    additionalAnimalDetailsCard: withTemplateReviewChangeAction({
      id: 'template-additional-animal-details',
      title: 'Additional animal details',
      rows: [
        { key: 'Certified for', value: formatReviewValueOrNa(review.certifiedFor) }
      ]
    }, getTemplateReviewChangeHref(templateId, 'additional-animal-details')),
    arrivalDetailsCard: withTemplateReviewChangeAction({
      id: 'template-arrival-details',
      title: 'Arrival details',
      rows: [
        ...(hideArrivalDate
          ? []
          : [{ key: 'Arrival date at destination', value: formatReviewValueOrNa(review.arrivalDateAtPort) }]),
        { key: 'Port of entry', value: formatReviewValueOrNa(review.portOfEntry) },
        { key: 'Means of transport to the port of entry', value: formatReviewValueOrNa(review.meansOfTransport) },
        { key: 'Transport identification', value: formatReviewValueOrNa(review.transportIdentification) },
        { key: 'Transport document reference', value: formatReviewValueOrNa(review.transportDocumentReference) }
      ]
    }, getTemplateReviewChangeHref(templateId, 'arrival-details')),
    transportDetailsCard: withTemplateReviewChangeAction({
      id: 'template-transport-details',
      title: 'Transport details',
      rows: [
        { key: 'Name', value: formatReviewValueOrNa(transporter.name) },
        { key: 'Address', value: transporterAddress },
        { key: 'Country', value: formatReviewValueOrNa(transporter.country) },
        { key: 'Approval number', value: formatReviewValueOrNa(transporter.approvalNumber) },
        { key: 'Type', value: formatReviewValueOrNa(transporter.type) }
      ]
    }, getTemplateReviewChangeHref(templateId, 'transporter')),
    addressesCard: withTemplateReviewChangeAction({
      id: 'template-addresses',
      title: 'Import details',
      rows: [
        { key: 'Place of origin', value: addressValue },
        { key: 'Consignor', value: addressValue },
        { key: 'Consignee', value: addressValue },
        { key: 'Importer', value: addressValue },
        { key: 'Place of destination', value: addressValue }
      ]
    }, getTemplateReviewChangeHref(templateId, 'roles-and-addresses')),
    contactAddressCard: withTemplateReviewChangeAction({
      id: 'template-contact-address',
      title: 'Contact address',
      rows: [
        { key: 'Contact address', value: contactAddressValue }
      ]
    }, getTemplateReviewChangeHref(templateId, 'contact-address-for-consignment'))
  }
}

function getDashboardTemplatesViewModel (query = {}, sessionData = {}) {
  const sort = (query.sort || '').trim()
  const basePath = getDesignReleaseBasePath(sessionData) || '/design-release-2'
  const templates = getAllDashboardTemplates(sessionData).map((template) => ({
    categoryLabel: template.categoryLabel,
    title: template.title,
    commodityLabel: template.commodityLabel,
    origin: template.origin,
    consignee: template.consignee,
    consignor: template.consignor,
    viewHref: `${basePath}/templates/${template.id}`,
    createHref: `${basePath}/templates/${template.id}/use`
  }))

  return {
    templates,
    sort,
    sortItems: buildDashboardSortItems(sort),
    resultsText: buildDashboardResultsText(1, templates.length, templates.length)
  }
}

function renderViewTemplatePage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const template = getDashboardTemplateById(req.params.templateId, req.session.data)

  if (!template) {
    return res.redirect('/templates')
  }

  const basePath = getDesignReleaseBasePath(req.session.data) || '/design-release-2'
  const editHref = `${basePath}/templates/${template.id}/edit`
  const successMessage = req.session.data.templateReviewSuccessMessage || null

  if (successMessage) {
    delete req.session.data.templateReviewSuccessMessage
  }

  clearTemplateReviewEditState(req.session.data)

  return res.render('view-template', {
    serviceNavActive: 'templates',
    pageName: template.title,
    template,
    templateReview: buildTemplateReviewViewModel(template, basePath, {
      hideArrivalDate: isDesignRelease21SessionData(req.session.data)
    }),
    dateCreated: template.dateCreated || '15 April 2026',
    useHref: `${basePath}/templates/${template.id}/use`,
    editHref,
    deleteHref: `${basePath}/templates/${template.id}/delete`,
    backLink: '/templates',
    successMessage
  })
}

function handleChangeTemplateSectionPage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const template = getDashboardTemplateById(req.params.templateId, req.session.data)

  if (!template) {
    return res.redirect('/templates')
  }

  const allowedSections = [
    'origin-of-the-import',
    'what-are-you-importing',
    'reason-for-import',
    'consignment-details',
    'animal-identification-details',
    'additional-animal-details',
    'arrival-details',
    'transporter',
    'roles-and-addresses',
    'contact-address-for-consignment'
  ]
  const section = String(req.params.section || '').trim()

  if (!allowedSections.includes(section)) {
    return res.redirect(`/templates/${template.id}`)
  }

  resetNotificationJourneySession(req.session.data)
  seedNotificationSessionFromTemplate(req.session.data, template)
  req.session.data.isCreatingTemplate = true
  req.session.data.isEditingTemplateFromReview = true
  req.session.data.editingTemplateId = template.id
  req.session.data.templateId = template.id
  req.session.data.templateName = template.title
  req.session.data.notificationStatus = 'Draft'

  return res.redirect(`/${section}?from=template-review`)
}

function handleEditTemplatePage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const template = getDashboardTemplateById(req.params.templateId, req.session.data)

  if (!template) {
    return res.redirect('/templates')
  }

  resetNotificationJourneySession(req.session.data)
  seedNotificationSessionFromTemplate(req.session.data, template)
  req.session.data.isCreatingTemplate = true
  req.session.data.notificationStatus = 'Draft'
  req.session.data.templateName = template.title

  return res.redirect('/notification-hub')
}

function handleDeleteTemplatePage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const templateId = String(req.params.templateId || '').trim()
  const template = getDashboardTemplateById(templateId, req.session.data)

  if (!template) {
    return res.redirect('/templates')
  }

  const savedTemplates = getSavedTemplates(req.session.data)
  const isSavedTemplate = savedTemplates.some((item) => item.id === templateId)

  if (isSavedTemplate) {
    req.session.data.savedTemplates = savedTemplates.filter((item) => item.id !== templateId)
  } else {
    if (!Array.isArray(req.session.data.deletedTemplateIds)) {
      req.session.data.deletedTemplateIds = []
    }

    if (!req.session.data.deletedTemplateIds.includes(templateId)) {
      req.session.data.deletedTemplateIds.push(templateId)
    }
  }

  req.session.data.templatesSuccessMessage = `${template.title} deleted`

  return res.redirect('/templates')
}

function handleViewTemplatePage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  return res.redirect(`/templates/${req.params.templateId}`)
}

function buildDashboardDateRangeItems (selectedValue = '', options = {}) {
  return [
    { value: 'today', text: 'Today', checked: selectedValue === 'today' },
    { value: 'tomorrow', text: 'Tomorrow', checked: selectedValue === 'tomorrow' },
    {
      value: 'next-seven-days',
      text: options.numericSeven ? 'Next 7 days' : 'Next seven days',
      checked: selectedValue === 'next-seven-days'
    }
  ]
}

function buildDashboardTypeFilterItems (selectedValue = '', options = {}) {
  const items = [
    { value: '', text: 'Select one', selected: !selectedValue },
    { value: 'live-animals', text: 'Live animals', selected: selectedValue === 'live-animals' }
  ]

  if (!options.hidePlants) {
    items.push({ value: 'plants', text: 'Plants', selected: selectedValue === 'plants' })
  }

  items.push({
    value: 'products-of-animal-origin',
    text: 'Products of animal origin',
    selected: selectedValue === 'products-of-animal-origin'
  })

  return items
}

function buildDashboardStatusFilterItems (selectedValue = '', options = {}) {
  const items = [
    { value: '', text: 'Select one', selected: !selectedValue }
  ]

  if (!options.hideDraft) {
    items.push({ value: 'draft', text: 'Draft', selected: selectedValue === 'draft' })
  }

  items.push(
    { value: 'action-required', text: 'Action required', selected: selectedValue === 'action-required' },
    { value: 'submitted', text: 'Submitted', selected: selectedValue === 'submitted' },
    { value: 'completed', text: 'Completed', selected: selectedValue === 'completed' }
  )

  return items
}

function getDashboardViewModel (sessionData = {}, query = {}) {
  const isTesting = isTestingSessionData(sessionData)
  const isDr2 = isDesignRelease2SessionData(sessionData)
  const isDr21 = isDesignRelease21SessionData(sessionData)
  const tab = (query.tab || 'in-progress').trim()
  const sort = (query.sort || '').trim()
  const dateRange = (query.dateRange || '').trim()
  const startDate = (query.startDate || '').trim()
  const endDate = (query.endDate || '').trim()
  let typeFilter = (query.type || '').trim()
  let statusFilter = (query.status || '').trim()

  if (isDr21 && typeFilter === 'plants') {
    typeFilter = ''
  }

  if (isDr21 && statusFilter === 'draft') {
    statusFilter = ''
  }
  const requestedPage = Math.max(1, Number(query.page) || 1)
  const pageSize = dashboardData.pageSize
  const allNotifications = getDashboardNotificationList(sessionData)
  const actionNotifications = isDr2 ? getDashboardActionNotifications(sessionData) : []
  const statusChangeNotifications = isDr2 ? getDashboardStatusChangeNotifications(sessionData) : []
  const inspectionNotifications = isDr2 ? getDashboardInspectionNotifications(sessionData) : []
  const validTabs = new Set(['in-progress', 'drafts', 'completed'])
  const activeTab = validTabs.has(tab) ? tab : 'in-progress'
  const inProgressNotifications = allNotifications.filter((notification) =>
    notification.reviewVariant === 'submitted' || notification.reviewVariant === 'action-required'
  )
  const draftNotifications = allNotifications.filter((notification) => notification.reviewVariant === 'draft')
  const completedNotifications = allNotifications.filter((notification) => notification.reviewVariant === 'submission-complete')
  const visibleNotifications = activeTab === 'drafts'
    ? draftNotifications
    : activeTab === 'completed'
      ? completedNotifications
      : inProgressNotifications
  const totalCount = visibleNotifications.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(requestedPage, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCount)
  const notifications = visibleNotifications.slice(startIndex, endIndex)

  return {
    activeTab,
    tabItems: [
      {
        id: 'in-progress',
        text: 'In progress',
        count: inProgressNotifications.length,
        href: '/design-release-2.1?tab=in-progress'
      },
      {
        id: 'drafts',
        text: isDr21 ? 'Draft' : 'Drafts',
        count: draftNotifications.length,
        href: '/design-release-2.1?tab=drafts'
      },
      {
        id: 'completed',
        text: 'Completed',
        count: completedNotifications.length,
        href: '/design-release-2.1?tab=completed'
      }
    ],
    notificationSectionHeading: activeTab === 'drafts'
      ? 'Draft notifications'
      : activeTab === 'completed'
        ? 'Completed notifications'
        : 'Notifications in progress',
    glanceCounts: isDr2
      ? {
        actionNeeded: actionNotifications.length,
        statusChange: statusChangeNotifications.length,
        chosenForInspection: inspectionNotifications.length
      }
      : null,
    alertCounts: {
      alerts: 0,
      errors: 0,
      messages: 0
    },
    delayFilters: isDr2
      ? [
        { value: 'today', label: 'Today', count: 1 },
        { value: 'next-three-days', label: 'Next 3 days', count: 0 },
        { value: 'already-delayed', label: 'Already delayed', count: 1 }
      ]
      : null,
    delayFilterItems: isDr2
      ? [
        { value: 'today', html: '<span class="app-dr2-dashboard-filter-radios__option">Today</span><span class="app-dr2-dashboard-filter-radios__count">(1)</span>' },
        { value: 'next-three-days', html: '<span class="app-dr2-dashboard-filter-radios__option">Next 3 days</span><span class="app-dr2-dashboard-filter-radios__count">(0)</span>' },
        { value: 'already-delayed', html: '<span class="app-dr2-dashboard-filter-radios__option">Already delayed</span><span class="app-dr2-dashboard-filter-radios__count">(1)</span>' }
      ]
      : null,
    statusChangeFilters: isDr2
      ? [
        { value: 'last-24-hours', label: 'Last 24 hours', count: 0 },
        { value: 'last-3-days', label: 'Last 3 days', count: 2 }
      ]
      : null,
    statusChangeFilterItems: isDr2
      ? [
        { value: 'last-24-hours', html: '<span class="app-dr2-dashboard-filter-radios__option">Last 24 hours</span><span class="app-dr2-dashboard-filter-radios__count">(0)</span>' },
        { value: 'last-3-days', html: '<span class="app-dr2-dashboard-filter-radios__option">Last 3 days</span><span class="app-dr2-dashboard-filter-radios__count">(2)</span>' }
      ]
      : null,
    dateRange,
    dateRangeItems: isDr2 ? buildDashboardDateRangeItems(dateRange, { numericSeven: isDr21 }) : null,
    startDate,
    endDate,
    typeFilter,
    typeFilterItems: isDr2 ? buildDashboardTypeFilterItems(typeFilter, { hidePlants: isDr21 }) : null,
    statusFilter,
    statusFilterItems: isDr2 ? buildDashboardStatusFilterItems(statusFilter, { hideDraft: isDr21 }) : null,
    additionalFiltersOpen: isDr2 && Boolean(dateRange || startDate || endDate || typeFilter || statusFilter),
    notifications,
    sort,
    sortItems: buildDashboardSortItems(sort, { testing: isTesting }),
    search: (query.search || '').trim(),
    resultsText: buildDashboardResultsText(startIndex + 1, endIndex, totalCount, { testing: isTesting }),
    pagination: buildDashboardPagination(currentPage, totalPages, sort, activeTab),
    currentPage
  }
}

function renderDashboardPage (req, res) {
  const successMessage = req.session.data.dashboardSuccessMessage || null
  const journeyBasePath = res.locals.journeyBasePath || ''
  const backLink = journeyBasePath ? `${journeyBasePath}/index` : '/index'

  if (successMessage) {
    delete req.session.data.dashboardSuccessMessage
  }

  return res.render('dashboard', {
    serviceNavActive: 'dashboard',
    backLink,
    successMessage,
    ...getDashboardViewModel(req.session.data, req.query)
  })
}

function renderDashboardTemplatesPage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const successMessage = req.session.data.templatesSuccessMessage || null

  if (successMessage) {
    delete req.session.data.templatesSuccessMessage
  }

  return res.render('dashboard-templates', {
    serviceNavActive: 'templates',
    successMessage,
    ...getDashboardTemplatesViewModel(req.query, req.session.data)
  })
}

function isCreatingTemplateJourney (sessionData) {
  return Boolean(sessionData && sessionData.isCreatingTemplate)
}

function isDesignRelease21TemplateCreate (sessionData) {
  return isDesignRelease21SessionData(sessionData) && isCreatingTemplateJourney(sessionData)
}

function renderCreateTemplatePage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  // Only keep the name when the user is mid-create and navigates back to this page.
  // After a template is saved, starting create again must show an empty name field.
  const isContinuingCreate = isCreatingTemplateJourney(req.session.data)
  const templateName = isContinuingCreate
    ? String(req.session.data.templateName || '').trim()
    : ''

  if (!isContinuingCreate) {
    delete req.session.data.templateName
  }

  return res.render('create-template', {
    serviceNavActive: 'templates',
    templateName,
    backLink: '/templates'
  })
}

function handleCreateTemplatePage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const templateName = String(req.body.templateName || '').trim()

  resetNotificationJourneySession(req.session.data)
  req.session.data.templateName = templateName
  req.session.data.isCreatingTemplate = true
  req.session.data.notificationStatus = 'Draft'

  return res.redirect('/origin-of-the-import')
}

function handleSaveTemplateFromHub (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const savedTemplate = saveTemplateFromSession(req.session.data)
  const successMessage = `${savedTemplate.title} saved to templates`

  resetNotificationJourneySession(req.session.data)
  req.session.data.templatesSuccessMessage = successMessage
  delete req.session.data.templateName
  delete req.session.data.isCreatingTemplate

  return res.redirect('/templates')
}

function getDashboardActionsViewModel (sessionData = {}, query = {}) {
  const sort = (query.sort || '').trim()
  const skipDelayFilter = isDesignRelease21SessionData(sessionData)
  const delayFilter = skipDelayFilter ? '' : (query.delayFilter || '').trim()
  const requestedPage = Math.max(1, Number(query.page) || 1)
  const pageSize = dashboardData.pageSize
  const actionNotifications = getDashboardActionNotifications(sessionData)
  const filteredNotifications = delayFilter
    ? actionNotifications.filter((notification) => notification.delayCategory === delayFilter)
    : actionNotifications
  const totalCount = filteredNotifications.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(requestedPage, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCount)
  const notifications = filteredNotifications.slice(startIndex, endIndex)

  return {
    backLink: getDashboardBackLink(sessionData),
    delayFilterItems: skipDelayFilter
      ? null
      : buildDashboardActionsDelayFilterItems(actionNotifications, delayFilter),
    notifications,
    sort,
    sortItems: buildDashboardSortItems(sort),
    resultsText: buildDashboardResultsText(startIndex + 1, endIndex, totalCount),
    pagination: buildDashboardActionsPagination(currentPage, totalPages, sort, delayFilter),
    currentPage,
    delayFilter
  }
}

function renderDashboardActionsPage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  return res.render('dashboard-actions', {
    serviceNavActive: 'dashboard',
    ...getDashboardActionsViewModel(req.session.data, req.query)
  })
}

function getDashboardChangesViewModel (sessionData = {}) {
  return {
    backLink: getDashboardBackLink(sessionData),
    sections: getDashboardChangesSections(sessionData)
  }
}

function renderDashboardChangesPage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  return res.render('dashboard-changes', {
    serviceNavActive: 'dashboard',
    ...getDashboardChangesViewModel(req.session.data)
  })
}

function getDashboardInspectionViewModel (sessionData = {}, query = {}) {
  const sort = (query.sort || '').trim()
  const requestedPage = Math.max(1, Number(query.page) || 1)
  const pageSize = dashboardData.pageSize
  const inspectionNotifications = getDashboardInspectionNotifications(sessionData)
  const totalCount = inspectionNotifications.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(requestedPage, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCount)
  const notifications = inspectionNotifications.slice(startIndex, endIndex)

  return {
    backLink: getDashboardBackLink(sessionData),
    notifications,
    sort,
    sortItems: buildDashboardSortItems(sort),
    resultsText: buildDashboardResultsText(startIndex + 1, endIndex, totalCount),
    pagination: buildDashboardInspectionPagination(currentPage, totalPages, sort),
    currentPage
  }
}

function renderDashboardInspectionPage (req, res) {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  return res.render('dashboard-inspection', {
    serviceNavActive: 'dashboard',
    ...getDashboardInspectionViewModel(req.session.data, req.query)
  })
}

function buildAddressBookPageHref (page, searchQuery, typeFilter, options = {}) {
  const params = new URLSearchParams()

  if (options.category) {
    params.set('category', options.category)
  }

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
  const basePath = options.basePath || '/address-book'

  return queryString ? `${basePath}?${queryString}` : basePath
}

function buildAddressBookPagination (currentPage, totalPages, searchQuery, typeFilter, options = {}) {
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
      href: buildAddressBookPageHref(page, searchQuery, typeFilter, options),
      current: page === currentPage
    })
  }

  return {
    items,
    next: currentPage < totalPages
      ? {
          href: buildAddressBookPageHref(currentPage + 1, searchQuery, typeFilter, options),
          text: 'Next'
        }
      : null,
    previous: currentPage > 1
      ? {
          href: buildAddressBookPageHref(currentPage - 1, searchQuery, typeFilter, options),
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

function buildAddressBookTypeItems (selectedValue, categoryId = null) {
  if (categoryId === 'transporter') {
    return [
      {
        value: '',
        text: 'Select one',
        selected: !selectedValue
      },
      {
        value: 'Commercial',
        text: 'Commercial',
        selected: selectedValue === 'Commercial'
      },
      {
        value: 'Private',
        text: 'Private',
        selected: selectedValue === 'Private'
      }
    ]
  }

  const allowedTypes = categoryId && addressBookData.categories[categoryId]
    ? new Set(addressBookData.categories[categoryId].types)
    : null

  return addressBookData.types
    .filter((option) => !option.value || !allowedTypes || allowedTypes.has(option.value))
    .map((option) => ({
      value: option.value,
      text: option.text,
      selected: selectedValue === option.value
    }))
}

function addressMatchesAddressBookTypeFilter (address, typeFilter) {
  if (!typeFilter) {
    return true
  }

  if (address.category === 'transporter' || address.type === 'transporter') {
    return address.typeLabel === typeFilter
  }

  const addressTypes = Array.isArray(address.types) && address.types.length
    ? address.types
    : [address.type].filter(Boolean)

  return addressTypes.includes(typeFilter)
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
    const merged = updated
      ? {
        ...address,
        ...updated,
        viewHref: buildAddressBookHref(sessionData, `/${address.id}`)
      }
      : {
        ...address,
        viewHref: buildAddressBookHref(sessionData, `/${address.id}`)
      }
    const types = Array.isArray(merged.types) && merged.types.length
      ? merged.types
      : [merged.type].filter(Boolean)
    const typeLabels = Array.isArray(merged.typeLabels) && merged.typeLabels.length
      ? merged.typeLabels
      : types.map((type) => addressBookData.typeLabels[type] || merged.typeLabel || type)
    const primaryType = types[0] || merged.type

    return {
      ...merged,
      type: primaryType,
      types,
      typeLabels,
      typeLabel: merged.typeLabel || typeLabels.join(', '),
      category: merged.category || addressBookData.getAddressCategoryId(primaryType),
      categoryIds: merged.categoryIds || addressBookData.getAddressCategoryIds({ types, type: primaryType })
    }
  })
}

function findAddressBookEntry (addressId, sessionData = {}) {
  return getAddressBookAddresses(sessionData)
    .find((address) => address.id === addressId) || null
}

function buildAddressBookReturnQuery (returnPath, addressBookBasePath = '/address-book') {
  if (!returnPath || returnPath === addressBookBasePath || returnPath === '/address-book') {
    return ''
  }

  return `?return=${encodeURIComponent(returnPath)}`
}

function buildAddressViewHref (addressId, returnTo, addressBookBasePath = '/address-book') {
  const baseHref = `${addressBookBasePath}/${encodeURIComponent(addressId)}`

  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return `${baseHref}?return=${encodeURIComponent(returnTo)}`
  }

  return baseHref
}

function normalizeAddressBookReturnPath (path, addressBookBasePath) {
  if (
    addressBookBasePath &&
    addressBookBasePath !== '/address-book' &&
    (path === '/address-book' || path.startsWith('/address-book/'))
  ) {
    return `${addressBookBasePath}${path.slice('/address-book'.length)}`
  }

  return path
}

function getSafeReturnPath (returnTo, fallback = '/address-book', addressBookBasePath = null) {
  const path = (returnTo || '').trim()
  const versionedAddressBookBasePath = addressBookBasePath || (
    fallback.endsWith('/address-book') ? fallback : null
  )

  if (path.startsWith('/') && !path.startsWith('//')) {
    return normalizeAddressBookReturnPath(path, versionedAddressBookBasePath)
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

  rows.push({
    key: { text: 'Town or city' },
    value: { text: details.townOrCity || '' }
  })

  if (details.county) {
    rows.push({
      key: { text: 'County (optional)' },
      value: { text: details.county }
    })
  }

  rows.push(
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
  const addressBookBasePath = options.addressBookBasePath || getAddressBookBasePathFromSession(sessionData)
  const backLink = options.backLink || addressBookBasePath
  const returnQuery = buildAddressBookReturnQuery(backLink, addressBookBasePath)
  const encodedAddressId = encodeURIComponent(addressId)

  return {
    serviceNavActive: 'address-book',
    backLink,
    addressId,
    pageHeading: address.name,
    summaryRows: buildAddressBookViewSummaryRows(details),
    canManage: Boolean(addressBookEntry),
    editHref: addressBookEntry ? `${addressBookBasePath}/${encodedAddressId}/edit${returnQuery}` : null,
    deleteAction: addressBookEntry ? `${addressBookBasePath}/${encodedAddressId}/delete${returnQuery}` : null
  }
}

function renderAddressBookViewPage (req, res) {
  const addressBookBasePath = getAddressBookBasePath(res)
  const backLink = getSafeReturnPath(req.query.return, addressBookBasePath)
  const viewModel = getAddressBookEntryViewModel(
    req.params.addressId,
    req.session.data,
    { backLink, addressBookBasePath }
  )

  if (!viewModel) {
    return res.redirect(backLink)
  }

  return res.render('address-book-view', viewModel)
}

function updateAddressBookEntry (sessionData, addressId, manualAddress, addressType) {
  const entry = buildAddressBookEntryFromManual(manualAddress, addressType, addressId)
  const viewHref = buildAddressBookHref(sessionData, `/${addressId}`)
  const addedAddresses = sessionData.addressBookAddedAddresses || []
  const addedIndex = addedAddresses.findIndex((address) => address.id === addressId)

  if (addedIndex >= 0) {
    sessionData.addressBookAddedAddresses[addedIndex] = {
      ...entry,
      viewHref
    }

    return entry
  }

  if (!sessionData.addressBookUpdatedEntries) {
    sessionData.addressBookUpdatedEntries = {}
  }

  sessionData.addressBookUpdatedEntries[addressId] = {
    ...entry,
    viewHref
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
  const addressBookBasePath = getAddressBookBasePath(res)
  const viewBackLink = getSafeReturnPath(
    req.query.return,
    `${addressBookBasePath}/${addressId}`,
    addressBookBasePath
  )
  const entry = findAddressBookEntry(addressId, sessionData)

  if (!entry) {
    return res.redirect(getSafeReturnPath(req.query.return, addressBookBasePath))
  }

  const details = resolveAddressBookDetails(entry)
  const manualAddress = locals.manualAddress || details
  const returnQuery = buildAddressBookReturnQuery(viewBackLink, addressBookBasePath)

  return res.render('address-book-lookup', {
    serviceNavActive: 'address-book',
    backLink: viewBackLink,
    cancelHref: viewBackLink,
    isEditMode: true,
    pageHeading: 'Edit address and contact details',
    formAction: `${addressBookBasePath}/${encodeURIComponent(addressId)}/edit${returnQuery}`,
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
    return 'Address added to your address book'
  }

  return `${trimmed} address added to your address book`
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

function buildAddressBookEntryFromManual (manualAddress, addressTypeOrTypes, existingId = null) {
  const addressTypes = (Array.isArray(addressTypeOrTypes)
    ? addressTypeOrTypes
    : [addressTypeOrTypes]
  )
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  const primaryType = addressTypes[0] || ''
  const typeLabels = addressTypes.map((type) => getAddressBookAddressTypeLabel(type))
  const typeLabel = typeLabels.join(', ')
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
    type: primaryType,
    types: addressTypes,
    typeLabel,
    typeLabels,
    category: addressBookData.getAddressCategoryId(primaryType),
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

function buildConsignmentAddressPayloadFromManual (manualAddress) {
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
    name: manualAddress.nameOrOrganisation,
    addressLines,
    country: manualAddress.country
  }
}

function syncConsignmentAddressToSection (sessionData, manualAddress, entryId, sectionId) {
  const section = getConsignmentAddressSectionById(sectionId)

  if (!section) {
    return
  }

  const addressPayload = buildConsignmentAddressPayloadFromManual(manualAddress)

  sessionData[section.sessionAddressIdKey] = entryId
  sessionData[section.sessionAddressKey] = addressPayload
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

function getAddressBookBackLink (sessionData, defaultLink = '/address-book', versionBasePath = '/address-book') {
  const contactReturn = getAddressBookContactReturn(sessionData)
  const consignmentReturn = getAddressBookConsignmentReturn(sessionData)

  if (contactReturn) {
    return contactReturn.path
  }

  if (consignmentReturn) {
    return consignmentReturn.path
  }

  if (hasAddressBookAddressType(sessionData) || sessionData.addressBookAddressCategory) {
    return `${versionBasePath}/add`
  }

  return defaultLink
}

function getAddressBookCancelHref (sessionData, addressBookBasePath = '/address-book') {
  const contactReturn = getAddressBookContactReturn(sessionData)
  const consignmentReturn = getAddressBookConsignmentReturn(sessionData)

  if (contactReturn) {
    return contactReturn.path
  }

  if (consignmentReturn) {
    return consignmentReturn.path
  }

  if (sessionData.addressBookAddressCategory || sessionData.addressBookAddressType) {
    return addressBookBasePath
  }

  return getDashboardBackLink(sessionData)
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
  const addressTypes = (options.addressTypes && options.addressTypes.length)
    ? options.addressTypes
    : [options.addressType || sessionData.addressBookAddressType].filter(Boolean)
  const consignmentReturn = Object.prototype.hasOwnProperty.call(options, 'consignmentReturn')
    ? options.consignmentReturn
    : getAddressBookConsignmentReturn(sessionData)
  const contactReturn = Object.prototype.hasOwnProperty.call(options, 'contactReturn')
    ? options.contactReturn
    : getAddressBookContactReturn(sessionData)
  const addressBookPath = isDesignRelease2SessionData(sessionData)
    ? getAddressBookBasePathFromSession(sessionData)
    : '/address-book'
  const entry = buildAddressBookEntryFromManual(
    manualAddress,
    addressTypes,
    `address-book-added-${Date.now()}`
  )

  if (!sessionData.addressBookAddedAddresses) {
    sessionData.addressBookAddedAddresses = []
  }

  sessionData.addressBookAddedAddresses.unshift({
    ...entry,
    viewHref: `${addressBookPath}/${entry.id}`
  })

  if (consignmentReturn) {
    const section = getConsignmentAddressSectionById(consignmentReturn.sectionId)
    const sectionAddressType = section && CONSIGNMENT_SECTION_ADDRESS_TYPE_MAP[section.id]

    if (section && sectionAddressType && addressTypes.includes(sectionAddressType)) {
      syncConsignmentAddressToSection(sessionData, manualAddress, entry.id, section.id)
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
  } else if (entry) {
    sessionData.addressBookSuccessMessage = formatAddressBookSuccessMessage(entry.name)
  }

  sessionData.addressBookShowManualAddress = false
  sessionData.addressBookManualAddress = null
  sessionData.addressBookPendingManualAddress = null
  sessionData.addressBookLookup = null
  sessionData.addressBookLookupAddressId = null
  sessionData.addressBookAddressType = null
  sessionData.addressBookAddressCategory = null
  sessionData.addressBookHideSearch = false
  sessionData.addressBookAddressUses = null
  sessionData.addressBookOriginUses = null

  const addressBookRedirect = entry && entry.category
    ? `${addressBookPath}?category=${encodeURIComponent(entry.category)}`
    : addressBookPath

  return {
    entry,
    redirectTo: consignmentReturn
      ? consignmentReturn.path
      : contactReturn
        ? contactReturn.path
        : addressBookRedirect
  }
}

function getAddressBookViewModel (query = {}, sessionData = {}) {
  const searchQuery = (query.search || '').trim()
  const typeFilter = (query.type || '').trim()
  const isDr2 = isDesignRelease2SessionData(sessionData)
  const requestedCategory = ADDRESS_BOOK_CATEGORY_ALIASES[query.category] || (query.category || '').trim()
  const categoryId = isDr2 && addressBookData.categories[requestedCategory]
    ? requestedCategory
    : 'origin-and-consignor'
  const category = addressBookData.categories[categoryId]
  const requestedPage = Math.max(1, Number(query.page) || 1)
  const pageSize = addressBookData.pageSize
  const normalisedSearch = searchQuery.toLowerCase()
  const addressBookBasePath = isDr2
    ? getAddressBookBasePathFromSession(sessionData)
    : '/address-book'

  let addresses = getAddressBookAddresses(sessionData)

  if (isDr2) {
    addresses = addresses.filter((address) => addressBookData.addressBelongsToCategory(address, categoryId))
  }

  if (typeFilter) {
    addresses = addresses.filter((address) => addressMatchesAddressBookTypeFilter(address, typeFilter))
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
  const paginationOptions = {
    basePath: addressBookBasePath,
    category: isDr2 ? categoryId : null
  }

  const categoryTabs = isDr2
    ? Object.values(addressBookData.categories).map((item) => ({
      id: item.id,
      label: item.label,
      heading: item.heading,
      href: buildAddressBookPageHref(1, searchQuery, '', {
        basePath: addressBookBasePath,
        category: item.id
      }),
      selected: item.id === categoryId
    }))
    : null

  return {
    serviceNavActive: 'address-book',
    searchQuery,
    typeFilter,
    typeItems: buildAddressBookTypeItems(typeFilter, isDr2 ? categoryId : null),
    categoryId: isDr2 ? categoryId : null,
    categoryHeading: isDr2 ? category.heading : null,
    categoryTabs,
    addresses: paginatedAddresses,
    allAddressesJson: JSON.stringify(getAddressBookAddresses(sessionData)),
    resultsText: buildAddressBookResultsText(rangeStart, rangeEnd, totalCount),
    pagination: buildAddressBookPagination(currentPage, totalPages, searchQuery, typeFilter, paginationOptions)
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

const addressBookAddCategoryValues = addressBookAddCategories.map((item) => item.value)

const ADDRESS_BOOK_CATEGORY_ALIASES = {
  'origin-and-sender': 'origin-and-consignor',
  'destination-and-receiver': 'destination-consignee-importer'
}

const addressBookUsageOptionsByCategory = {
  'origin-and-consignor': addressBookOriginUses,
  'destination-consignee-importer': addressBookDestinationUses,
  branch: addressBookBranchUses
}

function getAddressBookBasePath (res) {
  if (res.locals.isDesignRelease2Version && res.locals.journeyBasePath) {
    return `${res.locals.journeyBasePath}/address-book`
  }

  return '/address-book'
}

function getAddressBookAddCategory (value) {
  return addressBookAddCategories.find((item) => item.value === value) || null
}

function getAddressBookAddCategoryOptions (isDesignRelease21) {
  if (!isDesignRelease21) {
    return addressBookAddCategories
  }

  return addressBookAddCategories.map((item) => ({
    ...item,
    text: item.textDesignRelease21 || item.text
  }))
}

function getAddressBookUsageOptions (category) {
  return addressBookUsageOptionsByCategory[category] || []
}

function isAddressBookUsageCategory (category) {
  return Boolean(addressBookUsageOptionsByCategory[category])
}

function parseAddressBookUses (rawValue, category) {
  const allowedValues = new Set(
    getAddressBookUsageOptions(category).map((item) => item.value)
  )
  const values = Array.isArray(rawValue)
    ? rawValue
    : (rawValue ? [rawValue] : [])

  return values
    .map((value) => String(value || '').trim())
    .filter((value) => allowedValues.has(value))
}

function addressBookCategoryUsesLookup (category) {
  return category === 'destination-consignee-importer' || category === 'branch'
}

function getAddressBookAddressUseGroupsForCategory (category) {
  const options = getAddressBookUsageOptions(category)

  if (!options.length) {
    return []
  }

  return [{
    id: category,
    options
  }]
}

function buildEmptyAddressBookManualAddress (showAddressLookup) {
  return {
    nameOrOrganisation: '',
    addressLine1: '',
    addressLine2: '',
    townOrCity: '',
    county: '',
    postcode: '',
    country: showAddressLookup ? 'United Kingdom' : '',
    email: '',
    phone: ''
  }
}

function renderAddressBookAddDetailsPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const category = sessionData.addressBookAddressCategory
  const addressBookBasePath = getAddressBookBasePath(res)
  const showAddressLookup = addressBookCategoryUsesLookup(category)
  const manualAddress = locals.manualAddress || getAddressBookManualAddress(sessionData) || buildEmptyAddressBookManualAddress(showAddressLookup)
  const showManualAddress = locals.showManualAddress != null
    ? locals.showManualAddress
    : Boolean(
      showAddressLookup && (
        manualAddress.addressLine1 ||
        locals.selectedLookupAddressId ||
        sessionData.addressBookLookupAddressId
      )
    )

  return res.render('consignment-add-address', {
    isAddressBookAdd: true,
    serviceNavActive: 'address-book',
    backLink: `${addressBookBasePath}/add`,
    cancelHref: addressBookBasePath,
    formAction: `${addressBookBasePath}/add/lookup`,
    showAddressLookup,
    showManualAddress,
    manualAddress,
    countryItems: showAddressLookup
      ? [{
        value: 'United Kingdom',
        text: 'United Kingdom',
        selected: true
      }]
      : [
        {
          value: '',
          text: 'Select one',
          selected: !manualAddress.country
        },
        ...buildAddressBookCountryItems(manualAddress.country)
      ],
    lookupAddressesJson: JSON.stringify(getUkConsignmentLookupAddresses()),
    addressLookup: locals.addressLookup != null
      ? locals.addressLookup
      : sessionData.addressBookLookup || '',
    selectedLookupAddressId: locals.selectedLookupAddressId != null
      ? locals.selectedLookupAddressId
      : sessionData.addressBookLookupAddressId || '',
    addressUseGroups: getAddressBookAddressUseGroupsForCategory(category),
    selectedAddressUses: locals.selectedAddressUses != null
      ? locals.selectedAddressUses
      : (sessionData.addressBookAddressUses || []),
    data: sessionData,
    ...locals
  })
}

function handleAddressBookAddDetailsPost (req, res) {
  const sessionData = req.session.data
  const category = sessionData.addressBookAddressCategory
  const addressBookBasePath = getAddressBookBasePath(res)
  const showAddressLookup = addressBookCategoryUsesLookup(category)
  const addressBookLookupAddressId = (req.body.addressBookLookupAddressId || '').trim()
  const lookupManualAddress = getAddressDetailsFromLookup(addressBookLookupAddressId)
  const manualAddress = mergeManualAddressFromLookupAndBody(
    lookupManualAddress,
    req.body,
    showAddressLookup ? { country: 'United Kingdom' } : {}
  )
  const selectedAddressUses = parseAddressBookUses(req.body.addressUses, category)
  const firstUseOption = getAddressBookUsageOptions(category)[0]
  const addressValidation = validateAddressBookManualAddress(manualAddress)
  const renderWithErrors = (extraLocals = {}) => renderAddressBookAddDetailsPage(req, res, {
    manualAddress: addressValidation.value,
    selectedAddressUses,
    showManualAddress: showAddressLookup
      ? Boolean(
        manualAddress.addressLine1 ||
        req.body.manualAddressEntry ||
        addressBookLookupAddressId
      )
      : undefined,
    addressLookup: (req.body.addressLookup || '').trim(),
    selectedLookupAddressId: addressBookLookupAddressId,
    ...extraLocals
  })

  if (addressValidation.errorList.length) {
    req.session.data.errorList = addressValidation.errorList
    req.session.data.errors = addressValidation.errors

    return renderWithErrors()
  }

  if (!selectedAddressUses.length) {
    req.session.data.errorList = [{
      text: 'Select what this address can be used for',
      href: firstUseOption ? `#address-use-${firstUseOption.value}` : '#address-uses-error'
    }]
    req.session.data.errors = {
      addressUses: {
        text: 'Select what this address can be used for'
      }
    }

    return renderWithErrors()
  }

  req.session.data.errorList = null
  req.session.data.errors = null

  const { redirectTo } = saveAddressBookEntry(sessionData, addressValidation.value, {
    addressTypes: selectedAddressUses
  })

  return res.redirect(redirectTo || addressBookBasePath)
}

function renderAddressBookAddUsagePage (req, res, locals = {}) {
  const sessionData = req.session.data
  const addressBookBasePath = getAddressBookBasePath(res)
  const category = sessionData.addressBookAddressCategory
  const addressUseOptions = getAddressBookUsageOptions(category)

  return res.render('address-book-add-usage', {
    serviceNavActive: 'address-book',
    backLink: `${addressBookBasePath}/add/lookup`,
    formAction: `${addressBookBasePath}/add/usage`,
    addressUseOptions,
    selectedAddressUses: locals.selectedAddressUses != null
      ? locals.selectedAddressUses
      : (sessionData.addressBookAddressUses || sessionData.addressBookOriginUses || []),
    data: sessionData,
    ...locals
  })
}

function renderAddressBookAddPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const isDr2 = Boolean(res.locals.isDesignRelease2Version)
  const isDr21 = Boolean(res.locals.isDesignRelease21Version)
  const addressBookBasePath = getAddressBookBasePath(res)

  return res.render('address-book-add', {
    serviceNavActive: 'address-book',
    backLink: addressBookBasePath,
    formAction: `${addressBookBasePath}/add`,
    pageHeading: isDr2 ? 'Choose an address type' : 'What is the new address for?',
    addressTypeOptions: isDr2
      ? getAddressBookAddCategoryOptions(isDr21)
      : addressBookAddressTypes,
    selectedAddressType: locals.selectedAddressType != null
      ? locals.selectedAddressType
      : (isDr2
        ? sessionData.addressBookAddressCategory || ''
        : sessionData.addressBookAddressType || ''),
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
  const usageLabel = [...addressBookOriginUses, ...addressBookDestinationUses, ...addressBookBranchUses]
    .find((item) => item.value === addressType)

  if (usageLabel) {
    return usageLabel.text
  }

  if (addressBookData.typeLabels[addressType]) {
    return addressBookData.typeLabels[addressType]
  }

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

  res.redirect(`${getAddressBookBasePath(res)}/add`)
  return true
}

function renderAddressBookLookupPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const addressBookBasePath = getAddressBookBasePath(res)
  const consignmentReturn = getAddressBookConsignmentReturn(sessionData)
  const selectedAddressType = locals.selectedAddressType != null
    ? locals.selectedAddressType
    : sessionData.addressBookAddressType || consignmentReturn?.suggestedAddressType || ''
  const manualAddress = locals.manualAddress || getAddressBookManualAddress(sessionData)
  const hideSearch = locals.hideSearch != null
    ? locals.hideSearch
    : Boolean(sessionData.addressBookHideSearch)
  const showManualAddress = locals.showManualAddress != null
    ? locals.showManualAddress
    : Boolean(
      hideSearch ||
      sessionData.addressBookShowManualAddress ||
      sessionData.addressBookLookupAddressId
    )
  const cancelHref = getAddressBookCancelHref(sessionData, addressBookBasePath)

  return res.render('address-book-lookup', {
    serviceNavActive: 'address-book',
    backLink: getAddressBookBackLink(sessionData, addressBookBasePath, addressBookBasePath),
    cancelHref,
    cancelButtonText: cancelHref === addressBookBasePath
      ? 'Cancel and return to address book'
      : 'Cancel and return to dashboard',
    isEditMode: false,
    pageHeading: 'Add address details',
    formAction: `${addressBookBasePath}/add/lookup`,
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
    hideSearch,
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

function validateAddressBookManualAddress (manualAddress) {
  const errors = {}
  const errorList = []

  const addError = (field, message, href) => {
    errors[field] = { text: message }
    errorList.push({ text: message, href })
  }

  if (!manualAddress.nameOrOrganisation) {
    addError('addressBookManualName', 'Enter a name or organisation name', '#address-book-manual-name')
  }

  if (!manualAddress.addressLine1) {
    addError('addressBookManualAddressLine1', 'Enter address line 1', '#address-book-manual-address-line-1')
  }

  if (!manualAddress.townOrCity) {
    addError('addressBookManualTownOrCity', 'Enter a town or city', '#address-book-manual-town-or-city')
  }

  if (!manualAddress.postcode) {
    addError('addressBookManualPostcode', 'Enter a postcode or Zip code', '#address-book-manual-postcode')
  }

  if (!manualAddress.country) {
    addError('addressBookManualCountry', 'Select a country', '#address-book-manual-country')
  }

  if (!manualAddress.email) {
    addError('addressBookManualEmail', 'Enter an email address', '#address-book-manual-email')
  }

  if (!manualAddress.phone) {
    addError('addressBookManualPhone', 'Enter a phone number', '#address-book-manual-phone')
  }

  return { errors, errorList, value: manualAddress }
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
  const fromHub = isFromHub(req)
  const fromTemplateReview = isFromTemplateReview(req) || isEditingTemplateFromReview(sessionData)

  return res.render('origin-of-the-import', {
    backLink: getJourneyBackLink(
      req,
      isCreatingTemplateJourney(sessionData) ? '/templates/create' : '/'
    ),
    fromHub,
    fromTemplateReview,
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    countriesJson: JSON.stringify(countryOptions),
    countryPrefixesJson: JSON.stringify(countryRegionPrefixes),
    regionOfOriginCodePrefix: getCountryRegionPrefix(countryOfOrigin),
    regionOfOriginCodeSuffix: getRegionOfOriginCodeSuffix(sessionData),
    internalReference: displayReference,
    data: sessionData,
    ...locals
  })
}

function renderWhatAreYouImportingPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const fromHub = isFromHub(req)
  const fromTemplateReview = isFromTemplateReview(req) || isEditingTemplateFromReview(sessionData)

  return res.render('what-are-you-importing', {
    backLink: getJourneyBackLink(req, '/origin-of-the-import'),
    fromHub,
    fromTemplateReview,
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    commoditiesSearchJson: JSON.stringify(getCommoditySearchData(getSearchCommodities(sessionData))),
    commoditySelectionsJson: JSON.stringify(getInitialCommoditySelections(sessionData)),
    data: sessionData,
    ...locals
  })
}

function renderConsignmentDetailsPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const fromHub = isFromHub(req)
  const fromTemplateReview = isFromTemplateReview(req) || isEditingTemplateFromReview(sessionData)

  return res.render('consignment-details', {
    backLink: getJourneyBackLink(req, '/what-are-you-importing'),
    fromHub,
    fromTemplateReview,
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
  const fromHub = isFromHub(req)
  const fromTemplateReview = isFromTemplateReview(req) || isEditingTemplateFromReview(sessionData)

  return res.render('additional-animal-details', {
    backLink: getJourneyBackLink(req, getAdditionalAnimalDetailsBackLink(sessionData)),
    fromHub,
    fromTemplateReview,
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    showCertificationPurposeQuestion: config.showCertificationPurposeQuestion,
    showTemperatureQuestion: config.showTemperatureQuestion,
    showUnweanedQuestion: config.showUnweanedQuestion,
    certificationPurposeItems: buildRadioItems(
      config.certificationPurposeOptions,
      sessionData.certificationPurpose
    ),
    temperatureItems: buildRadioItems(
      config.temperatureOptions,
      sessionData.storageTemperature
    ),
    unweanedItems: buildRadioItems(
      config.unweanedOptions,
      sessionData.unweanedAnimals
    ),
    data: sessionData,
    ...locals
  })
}

function renderAnimalIdentificationDetailsPage (req, res, locals = {}) {
  const sessionData = req.session.data

  if (!hasAnimalIdentifiersRequired(sessionData)) {
    return res.redirect('/additional-animal-details')
  }

  const commodityGroups = buildAnimalIdentificationCommodityGroups(sessionData, locals)
  const selectedCommodityRows = getSelectedCommodityRows(sessionData)
  const hasGerminalProducts = selectedCommodityRows.some((row) => row.isGerminalProduct)
  const hasLiveAnimals = selectedCommodityRows.some((row) => !row.isGerminalProduct)
  const quantityColumnLabel = hasGerminalProducts && !hasLiveAnimals
    ? 'Number of packages'
    : 'Number of animals'
  const fromHub = isFromHub(req)
  const fromTemplateReview = isFromTemplateReview(req) || isEditingTemplateFromReview(sessionData)

  return res.render('animal-identification-details', {
    backLink: getJourneyBackLink(req, '/consignment-details'),
    fromHub,
    fromTemplateReview,
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    selectedCommodityRows,
    quantityColumnLabel,
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
            backLink: getJourneyBackLink(req, '/what-are-you-importing'),
            fromHub: isFromHub(req),
            fromTemplateReview: isFromTemplateReview(req) || isEditingTemplateFromReview(sessionData),
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

const sharedDocumentTypeOptions = [
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
  { value: 'journey-log', text: 'Journey log' },
  { value: 'other', text: 'Other' }
]

const designReleaseDocumentTypeOptions = [
  { value: 'itahc', text: 'Intra Trade Animal Health Certificate (ITAHC)' },
  ...sharedDocumentTypeOptions
]

const testingDocumentTypeOptions = [
  { value: 'health-certificate', text: 'Health certificate' },
  ...sharedDocumentTypeOptions
]

const MAX_UPLOADED_DOCUMENTS = 15
const VIRUS_CHECK_DELAY_MS = 2500

function getDocumentTypeOptions (sessionData) {
  return isTestingSessionData(sessionData)
    ? testingDocumentTypeOptions
    : designReleaseDocumentTypeOptions
}

function getDocumentTypeValues (sessionData) {
  return getDocumentTypeOptions(sessionData).map((option) => option.value)
}

function getDocumentTypeLabel (documentType, sessionData) {
  if (documentType === 'itahc') {
    return isTestingSessionData(sessionData)
      ? 'Health certificate'
      : 'Intra Trade Animal Health Certificate (ITAHC)'
  }

  if (documentType === 'health-certificate') {
    return 'Health certificate'
  }

  const match = getDocumentTypeOptions(sessionData).find((option) => option.value === documentType) ||
    sharedDocumentTypeOptions.find((option) => option.value === documentType)

  return match ? match.text : documentType
}

function buildDocumentTypeItems (selectedValue, sessionData) {
  return [
    {
      value: '',
      text: 'Select one',
      selected: !selectedValue
    },
    ...getDocumentTypeOptions(sessionData).map((option) => ({
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
    documentTypeLabel: document.documentTypeLabel || getDocumentTypeLabel(document.documentType, sessionData),
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
  const errors = {}
  const errorList = []
  const uploadedCount = ensureUploadedDocuments(sessionData).length

  if (uploadedCount >= MAX_UPLOADED_DOCUMENTS) {
    errors.attachment = { text: `You can upload a maximum of ${MAX_UPLOADED_DOCUMENTS} files` }
    errorList.push({
      text: `You can upload a maximum of ${MAX_UPLOADED_DOCUMENTS} files`,
      href: '#attachment'
    })

    return { errors, errorList, values }
  }

  if (!values.documentReference) {
    errors.documentReference = { text: 'Enter a document reference' }
    errorList.push({
      text: 'Enter a document reference',
      href: '#document-reference'
    })
  }

  if (!values.documentType || !getDocumentTypeValues(sessionData).includes(values.documentType)) {
    errors.documentType = { text: 'Select a document type' }
    errorList.push({
      text: 'Select a document type',
      href: '#document-type'
    })
  }

  if (!values.dateOfIssue) {
    errors.dateOfIssue = { text: 'Enter a date of issue' }
    errorList.push({
      text: 'Enter a date of issue',
      href: '#date-of-issue'
    })
  } else if (!parseArrivalDisplayDate(values.dateOfIssue)) {
    errors.dateOfIssue = { text: 'Enter a real date' }
    errorList.push({
      text: 'Enter a real date',
      href: '#date-of-issue'
    })
  }

  if (!values.attachmentFileName) {
    errors.attachment = { text: 'Upload a document' }
    errorList.push({
      text: 'Upload a document',
      href: '#attachment'
    })
  }

  return { errors, errorList, values }
}

function addUploadedDocument (sessionData, values) {
  const documents = ensureUploadedDocuments(sessionData)

  documents.push({
    id: `doc-${Date.now()}-${documents.length + 1}`,
    documentReference: values.documentReference,
    documentType: values.documentType,
    documentTypeLabel: getDocumentTypeLabel(values.documentType, sessionData),
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

function trySavePendingUploadDocument (sessionData, body) {
  const values = parseUploadDocumentBody(body)

  if (!getDocumentTypeValues(sessionData).includes(values.documentType)) {
    return { saved: false, values }
  }

  const validation = validateUploadDocument(values, sessionData)

  if (validation.errorList.length) {
    return {
      saved: false,
      values,
      errorList: validation.errorList,
      errors: validation.errors
    }
  }

  addUploadedDocument(sessionData, values)

  return { saved: true, values }
}

function getUploadDocumentsReturnQuery (req) {
  if (isFromReview(req) || isAmendingNotification(req.session.data)) {
    return '?from=review'
  }

  if (isFromHub(req)) {
    return '?from=hub'
  }

  return ''
}

function renderUploadDocumentsPage (req, res, locals = {}) {
  const sessionData = req.session.data
  const formValues = locals.formValues || {
    documentReference: '',
    documentType: '',
    dateOfIssue: '',
    attachmentFileName: ''
  }
  const fromReview = isFromReview(req) || isAmendingNotification(sessionData)
  const fromHub = isFromHub(req)

  return res.render('upload-documents', {
    backLink: fromReview ? '/review-notification' : '/notification-hub',
    fromReview,
    fromHub,
    notificationReference: sessionData.notificationReference || PROTOTYPE_NOTIFICATION_REFERENCE,
    documentTypeItems: buildDocumentTypeItems(formValues.documentType, sessionData),
    uploadedDocuments: getUploadedDocumentsForDisplay(sessionData),
    formValues,
    data: sessionData,
    ...locals
  })
}

router.get('/create-notification', (req, res) => {
  resetNotificationJourneySession(req.session.data)
  req.session.data.notificationStatus = 'Draft'
  delete req.session.data.isCreatingTemplate

  if (isDesignRelease2SessionData(req.session.data)) {
    req.session.data.notificationReference = generateDesignReleaseNotificationReference(req.session.data)
  }

  persistDraftNotification(req.session.data)
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

  const validation = validateOriginOfImport({
    countryOfOrigin,
    regionOfOriginRequired,
    regionOfOriginCodeSuffix
  })

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    req.session.data.errorList = null
    req.session.data.errors = null
    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors

    return renderOriginPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null

  return res.redirect(getSectionContinueRedirect(req, '/what-are-you-importing'))
})

router.get('/what-are-you-importing', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  delete req.session.data.commoditySearch

  return renderWhatAreYouImportingPage(req, res)
})

router.post('/what-are-you-importing', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  const commoditySelections = parseCommoditySelections(req.body.commoditySelections)
  const selectedSpecies = normalizeSelectedSpecies(req.body.selectedSpecies)

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    delete req.session.data.commoditySearch

    if (applySpeciesSelectionToSession(req.session.data, selectedSpecies)) {
      req.session.data.commoditySelections = commoditySelections.length
        ? commoditySelections
        : req.session.data.commoditySelections
    }

    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

  const validation = validateCommoditySelection(selectedSpecies, commoditySelections)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors

    return renderWhatAreYouImportingPage(req, res)
  }

  applySpeciesSelectionToSession(req.session.data, selectedSpecies)
  if (commoditySelections.length) {
    req.session.data.commoditySelections = commoditySelections
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  delete req.session.data.commoditySearch

  if (isCreatingTemplateJourney(req.session.data)) {
    return res.redirect('/notification-hub')
  }

  return res.redirect(getSectionContinueRedirect(req, '/reason-for-import'))
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
  const netWeight = parseNetWeight(req.body, speciesIds)
  const packageType = parsePackageType(req.body, speciesIds)
  const action = (req.body.action || '').trim()

  const animalValidation = validateNumberOfAnimals(numberOfAnimals, speciesIds)
  const packagingValidation = validateNumberOfPackages(numberOfPackages, speciesIds)
  const netWeightValidation = validateNetWeight(netWeight, speciesIds)
  const packageTypeValidation = validatePackageType(packageType, speciesIds)
  const errors = {
    ...animalValidation.errors,
    ...packagingValidation.errors,
    ...netWeightValidation.errors,
    ...packageTypeValidation.errors
  }
  const errorList = [
    ...animalValidation.errorList,
    ...netWeightValidation.errorList,
    ...packageTypeValidation.errorList,
    ...packagingValidation.errorList
  ]

  if (errorList.length > 0) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors
    req.session.data.numberOfAnimals = numberOfAnimals
    req.session.data.numberOfPackages = numberOfPackages
    req.session.data.netWeight = netWeight
    req.session.data.packageType = packageType

    return renderConsignmentDetailsPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.numberOfAnimals = numberOfAnimals
  req.session.data.numberOfPackages = numberOfPackages
  req.session.data.netWeight = netWeight
  req.session.data.packageType = packageType

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

  return res.redirect(getSectionContinueRedirect(req, getPostConsignmentDetailsPath(req.session.data)))
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
  const storageTemperature = (req.body.storageTemperature || '').trim()
  const unweanedAnimals = (req.body.unweanedAnimals || '').trim()

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    if (config.showCertificationPurposeQuestion && certificationPurposeOptions.includes(certificationPurpose)) {
      req.session.data.certificationPurpose = certificationPurpose
    }

    if (config.showTemperatureQuestion && config.temperatureOptions.includes(storageTemperature)) {
      req.session.data.storageTemperature = storageTemperature
    }

    if (config.showUnweanedQuestion && config.unweanedOptions.includes(unweanedAnimals)) {
      req.session.data.unweanedAnimals = unweanedAnimals
    }

    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.certificationPurpose = config.showCertificationPurposeQuestion
    ? (certificationPurpose || null)
    : null
  req.session.data.storageTemperature = config.showTemperatureQuestion
    ? (storageTemperature || null)
    : null
  req.session.data.unweanedAnimals = config.showUnweanedQuestion
    ? (unweanedAnimals || null)
    : null

  return res.redirect(getSectionContinueRedirect(
    req,
    getNextJourneyPath('/additional-animal-details', req.session.data)
  ))
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

router.get('/templates', (req, res) => {
  return renderDashboardTemplatesPage(req, res)
})

router.get('/templates/create', (req, res) => {
  return renderCreateTemplatePage(req, res)
})

router.post('/templates/create', (req, res) => {
  return handleCreateTemplatePage(req, res)
})

router.get('/templates/save', (req, res) => {
  return handleSaveTemplateFromHub(req, res)
})

router.get('/templates/:templateId', (req, res) => {
  return renderViewTemplatePage(req, res)
})

router.post('/templates/:templateId', (req, res) => {
  return handleViewTemplatePage(req, res)
})

router.get('/templates/:templateId/change/:section', (req, res) => {
  return handleChangeTemplateSectionPage(req, res)
})

router.get('/templates/:templateId/use', (req, res) => {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const template = getDashboardTemplateById(req.params.templateId, req.session.data)

  if (!template) {
    return res.redirect('/templates')
  }

  resetNotificationJourneySession(req.session.data)
  seedNotificationSessionFromTemplate(req.session.data, template)
  persistDraftNotification(req.session.data)

  return res.redirect('/notification-hub')
})

router.get('/templates/:templateId/edit', (req, res) => {
  return handleEditTemplatePage(req, res)
})

router.get('/templates/:templateId/delete', (req, res) => {
  return handleDeleteTemplatePage(req, res)
})

router.get('/notifications/copy-as-new', (req, res) => {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const submittedId = (req.query.submitted || '').trim()
  const reference = (req.query.reference || '').trim()
  const sourceSnapshot = getCopyAsNewSourceSnapshot(req.session.data, {
    submittedId,
    reference
  })

  if (!sourceSnapshot) {
    return res.redirect(getDashboardBackLink(req.session.data))
  }

  const copied = copyNotificationAsNewIntoSession(req.session.data, sourceSnapshot)

  if (!copied) {
    return res.redirect(getDashboardBackLink(req.session.data))
  }

  return res.redirect('/notification-hub')
})

router.get('/notifications/amend', (req, res) => {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const submittedId = (req.query.submitted || '').trim()
  const reference = (req.query.reference || '').trim()
  const sourceSnapshot = getCopyAsNewSourceSnapshot(req.session.data, {
    submittedId,
    reference
  })

  if (!sourceSnapshot) {
    return res.redirect(getDashboardBackLink(req.session.data))
  }

  const snapshot = cloneSubmittedNotificationSnapshot(sourceSnapshot)
  const notificationReference = snapshot.notificationReference || reference ||
    generateDesignReleaseNotificationReference(req.session.data)

  loadDraftSnapshotIntoSession(req.session.data, snapshot)
  req.session.data.notificationReference = notificationReference
  req.session.data.notificationStatus = 'Amend'
  req.session.data.amendingFrom = {
    submittedId: submittedId || null,
    reference: reference || notificationReference || null
  }
  req.session.data.amendOriginalSnapshot = getComparableNotificationSnapshot(snapshot)
  req.session.data.errorList = null
  req.session.data.errors = null

  return res.redirect('/review-notification')
})

router.get('/notifications/cancel-amend', (req, res) => {
  if (!isDesignRelease2SessionData(req.session.data)) {
    return res.redirect('/')
  }

  const amendingFrom = req.session.data.amendingFrom || {}
  const submittedId = String(amendingFrom.submittedId || '').trim()
  const reference = String(
    amendingFrom.reference || req.session.data.notificationReference || ''
  ).trim()

  delete req.session.data.amendingFrom
  delete req.session.data.amendOriginalSnapshot
  delete req.session.data.notificationStatus
  req.session.data.errorList = null
  req.session.data.errors = null

  if (submittedId) {
    return res.redirect(`/review-notification?submitted=${encodeURIComponent(submittedId)}`)
  }

  if (reference) {
    return res.redirect(`/review-notification?reference=${encodeURIComponent(reference)}`)
  }

  return res.redirect(getDashboardBackLink(req.session.data))
})

router.get('/actions', (req, res) => {
  return renderDashboardActionsPage(req, res)
})

router.get('/changes', (req, res) => {
  return renderDashboardChangesPage(req, res)
})

router.get('/inspection', (req, res) => {
  return renderDashboardInspectionPage(req, res)
})

router.get('/index', (req, res) => {
  return res.render('index')
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
  const addressBookBasePath = getAddressBookBasePath(res)
  const fromSection = (req.query.from || '').trim()

  if (fromSection === CONTACT_ADDRESS_RETURN_ID) {
    setAddressBookContactReturn(req.session.data)
    return res.redirect(`${addressBookBasePath}/add/lookup`)
  }

  if (fromSection) {
    if (!setAddressBookConsignmentReturn(req.session.data, fromSection)) {
      return res.redirect(`${addressBookBasePath}/add/lookup`)
    }

    return res.redirect(`${addressBookBasePath}/add/lookup`)
  }

  clearAddressBookConsignmentReturn(req.session.data)
  req.session.data.addressBookAddressType = null
  req.session.data.addressBookAddressCategory = null
  req.session.data.addressBookAddingTransporter = null
  req.session.data.addressBookHideSearch = false
  req.session.data.addressBookShowManualAddress = false
  req.session.data.addressBookManualAddress = null
  req.session.data.addressBookPendingManualAddress = null
  req.session.data.addressBookAddressUses = null
  req.session.data.addressBookOriginUses = null
  req.session.data.addressBookLookup = null
  req.session.data.addressBookLookupAddressId = null

  return renderAddressBookAddPage(req, res)
})

router.post('/address-book/add', (req, res) => {
  const isDr2 = Boolean(res.locals.isDesignRelease2Version)
  const addressBookBasePath = getAddressBookBasePath(res)
  const validation = validateAddressBookAddressType(req.body.addressType)

  req.session.data.errorList = null
  req.session.data.errors = null

  if (isDr2) {
    const category = getAddressBookAddCategory(validation.value)

    if (!category) {
      req.session.data.errors = {
        addressType: {
          text: 'Select an address type'
        }
      }
      req.session.data.errorList = [{
        text: 'Select an address type',
        href: '#address-type-origin-and-consignor'
      }]

      return renderAddressBookAddPage(req, res, {
        selectedAddressType: validation.value
      })
    }

    req.session.data.addressBookAddressCategory = category.value
    req.session.data.addressBookAddressType = category.defaultAddressType
    req.session.data.addressBookAddingTransporter = null
    req.session.data.addressBookHideSearch = false
    req.session.data.addressBookShowManualAddress = false
    req.session.data.addressBookAddressUses = null

    if (category.value === 'transporter') {
      req.session.data.addressBookAddingTransporter = true
      req.session.data.transporterAddType = null
      return res.redirect('/transporter/add')
    }

    return res.redirect(`${addressBookBasePath}/add/lookup`)
  }

  req.session.data.addressBookAddressType = validation.value || null

  if (!addressBookAddressTypeValues.includes(validation.value)) {
    return res.redirect(addressBookBasePath)
  }

  return res.redirect(`${addressBookBasePath}/add/lookup`)
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

  if (res.locals.isDesignRelease2Version && isAddressBookUsageCategory(req.session.data.addressBookAddressCategory)) {
    return renderAddressBookAddDetailsPage(req, res)
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
    const addressBookBasePath = getAddressBookBasePath(res)

    req.session.data.errorList = null
    req.session.data.errors = null
    req.session.data.addressBookShowManualAddress = false
    req.session.data.addressBookManualAddress = null
    req.session.data.addressBookPendingManualAddress = null
    req.session.data.addressBookLookup = null
    req.session.data.addressBookLookupAddressId = null
    req.session.data.addressBookAddressType = null
    req.session.data.addressBookAddressUses = null
    req.session.data.addressBookOriginUses = null

    return res.redirect(getAddressBookCancelHref(req.session.data, addressBookBasePath))
  }

  if (redirectIfNoAddressBookAddressType(req, res)) {
    return
  }

  if (res.locals.isDesignRelease2Version && isAddressBookUsageCategory(req.session.data.addressBookAddressCategory)) {
    return handleAddressBookAddDetailsPost(req, res)
  }

  const validation = validateAddressBookManualAddress(manualAddress)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors
    req.session.data.addressBookManualAddress = validation.value
    req.session.data.addressBookShowManualAddress = true
    req.session.data.addressBookLookup = (req.body.addressBookLookup || '').trim()
    req.session.data.addressBookLookupAddressId = addressBookLookupAddressId || null

    return renderAddressBookLookupPage(req, res, {
      manualAddress: validation.value,
      showManualAddress: true,
      addressLookup: (req.body.addressBookLookup || '').trim(),
      selectedLookupAddressId: addressBookLookupAddressId
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null

  const { redirectTo } = saveAddressBookEntry(req.session.data, validation.value)

  return res.redirect(redirectTo)
})

router.get('/address-book/add/usage', (req, res) => {
  const addressBookBasePath = getAddressBookBasePath(res)
  const category = req.session.data.addressBookAddressCategory

  if (!res.locals.isDesignRelease2Version) {
    return res.redirect(`${getAddressBookBasePath(res)}/add`)
  }

  if (!isAddressBookUsageCategory(category)) {
    return res.redirect(`${addressBookBasePath}/add`)
  }

  if (!req.session.data.addressBookPendingManualAddress) {
    return res.redirect(`${addressBookBasePath}/add/lookup`)
  }

  return renderAddressBookAddUsagePage(req, res)
})

router.post('/address-book/add/usage', (req, res) => {
  const addressBookBasePath = getAddressBookBasePath(res)
  const category = req.session.data.addressBookAddressCategory
  const selectedAddressUses = parseAddressBookUses(req.body.addressUses, category)
  const firstUseOption = getAddressBookUsageOptions(category)[0]

  if (!res.locals.isDesignRelease2Version) {
    return res.redirect(`${getAddressBookBasePath(res)}/add`)
  }

  if (!isAddressBookUsageCategory(category)) {
    return res.redirect(`${addressBookBasePath}/add`)
  }

  const pendingAddress = req.session.data.addressBookPendingManualAddress

  if (!pendingAddress) {
    return res.redirect(`${addressBookBasePath}/add/lookup`)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.addressBookAddressUses = selectedAddressUses
  req.session.data.addressBookOriginUses = null

  if (!selectedAddressUses.length) {
    req.session.data.errors = {
      addressUses: {
        text: 'Select what this address can be used for'
      }
    }
    req.session.data.errorList = [{
      text: 'Select what this address can be used for',
      href: firstUseOption ? `#address-use-${firstUseOption.value}` : '#address-uses-error'
    }]

    return renderAddressBookAddUsagePage(req, res, {
      selectedAddressUses
    })
  }

  const { redirectTo } = saveAddressBookEntry(req.session.data, pendingAddress, {
    addressTypes: selectedAddressUses
  })

  return res.redirect(redirectTo)
})

router.get('/address-book/:addressId/edit', (req, res) => {
  return renderAddressBookEditPage(req, res)
})

router.post('/address-book/:addressId/edit', (req, res) => {
  const addressId = (req.params.addressId || '').trim()
  const action = (req.body.action || '').trim()
  const addressBookBasePath = getAddressBookBasePath(res)
  const returnPath = getSafeReturnPath(
    req.query.return,
    `${addressBookBasePath}/${addressId}`,
    addressBookBasePath
  )
  const entry = findAddressBookEntry(addressId, req.session.data)

  if (!entry) {
    return res.redirect(getSafeReturnPath(req.query.return, addressBookBasePath))
  }

  if (action === 'cancel') {
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(returnPath)
  }

  const manualAddress = parseAddressBookManualAddressBody(req.body)
  const validation = validateAddressBookManualAddress(manualAddress)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors

    return renderAddressBookEditPage(req, res, {
      manualAddress: validation.value
    })
  }

  updateAddressBookEntry(req.session.data, addressId, validation.value, entry.type)
  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.addressBookSuccessMessage = formatAddressBookUpdatedMessage(validation.value.nameOrOrganisation)

  return res.redirect(addressBookBasePath)
})

router.post('/address-book/:addressId/delete', (req, res) => {
  const addressId = (req.params.addressId || '').trim()
  const addressBookBasePath = getAddressBookBasePath(res)
  const returnPath = getSafeReturnPath(req.query.return, addressBookBasePath)
  const entry = findAddressBookEntry(addressId, req.session.data)

  if (entry) {
    deleteAddressBookEntry(req.session.data, entry.id)
    req.session.data.addressBookSuccessMessage = formatAddressBookDeletedMessage(entry.name)
  }

  return res.redirect(returnPath.startsWith(`${addressBookBasePath}/${addressId}`) ? addressBookBasePath : returnPath)
})

router.get('/address-book/:addressId', (req, res) => {
  return renderAddressBookViewPage(req, res)
})

router.get('/review-notification', (req, res) => {
  const submittedId = (req.query.submitted || '').trim()
  const reference = (req.query.reference || '').trim()
  const submittedNotification = getSubmittedNotificationById(req.session.data, submittedId)
  const isDr2 = isDesignRelease2SessionData(req.session.data)
  const dashboardBackLink = getDashboardBackLink(req.session.data)

  if (submittedId && !submittedNotification) {
    return res.redirect(isDr2 ? dashboardBackLink : '/')
  }

  if (isDr2 && (submittedId || reference)) {
    return renderReviewNotificationPage(req, res, {
      submittedId,
      reference
    })
  }

  if (submittedNotification) {
    let backLink = '/'

    if (isTestingSessionData(req.session.data)) {
      backLink = '/testing'
    } else if (isDr2) {
      backLink = dashboardBackLink
    }

    return renderReviewNotificationPage(req, res, {
      sessionData: submittedNotification.snapshot,
      readOnly: true,
      backLink
    })
  }

  ensurePrototypeNotificationReference(req.session.data)

  return renderReviewNotificationPage(req, res)
})

router.get('/notifications/delete', (req, res) => {
  return renderDeleteNotificationPage(req, res)
})

router.post('/notifications/delete', (req, res) => {
  const submittedId = (req.query.submitted || '').trim()
  const reference = (req.query.reference || '').trim()
  const reviewOptions = resolveDesignRelease2ReviewPageOptions(req, { submittedId, reference })
  const notificationReference = reviewOptions.pageHeader && reviewOptions.pageHeader.reference
    ? reviewOptions.pageHeader.reference
    : reference

  deleteNotification(req.session.data, {
    submittedId,
    reference: reference || notificationReference
  })
  req.session.data.dashboardSuccessMessage = notificationReference
    ? `${notificationReference} has been deleted`
    : 'Notification has been deleted'

  return res.redirect(getDashboardBackLink(req.session.data))
})

router.post('/review-notification', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (isDesignRelease21TemplateCreate(req.session.data)) {
    return handleSaveTemplateFromHub(req, res)
  }

  if (!hasNotificationComplete(req.session.data)) {
    return renderReviewNotificationPage(req, res)
  }

  return res.redirect('/declaration')
})

router.get('/declaration', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (isDesignRelease21TemplateCreate(req.session.data)) {
    return res.redirect('/review-notification')
  }

  return renderDeclarationPage(req, res)
})

router.post('/declaration', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (isDesignRelease21TemplateCreate(req.session.data)) {
    return res.redirect('/review-notification')
  }

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

  if (isDesignRelease21TemplateCreate(req.session.data)) {
    return res.redirect('/review-notification')
  }

  if (!hasDeclarationConfirmed(req.session.data)) {
    return res.redirect('/declaration')
  }

  return renderNotificationSubmittedPage(req, res)
})

router.get('/upload-documents', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  if (isDesignRelease21TemplateCreate(req.session.data)) {
    return res.redirect('/notification-hub')
  }

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

  if (isDesignRelease21TemplateCreate(req.session.data)) {
    return res.redirect('/notification-hub')
  }

  const action = (req.body.action || '').trim()
  const values = parseUploadDocumentBody(req.body)
  const returnQuery = getUploadDocumentsReturnQuery(req)

  if (action.startsWith('remove:')) {
    const documentId = action.slice('remove:'.length)

    removeUploadedDocument(req.session.data, documentId)
    resetUploadDocumentFormState(req.session.data)

    return res.redirect(`/upload-documents${returnQuery}`)
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

    return res.redirect(`/upload-documents${returnQuery}`)
  }

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    const pendingSave = trySavePendingUploadDocument(req.session.data, req.body)

    if (pendingSave.errorList) {
      req.session.data.errorList = pendingSave.errorList
      req.session.data.errors = pendingSave.errors

      return renderUploadDocumentsPage(req, res, {
        formValues: pendingSave.values
      })
    }

    resetUploadDocumentFormState(req.session.data)

    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

  if (action === 'continue') {
    // Soft validation: uploads are optional, but once a document type is chosen
    // all document fields must be completed before continuing.
    const pendingSave = trySavePendingUploadDocument(req.session.data, req.body)

    if (pendingSave.errorList) {
      req.session.data.errorList = pendingSave.errorList
      req.session.data.errors = pendingSave.errors

      return renderUploadDocumentsPage(req, res, {
        formValues: pendingSave.values
      })
    }

    resetUploadDocumentFormState(req.session.data)

    return res.redirect(getSectionContinueRedirect(
      req,
      getNextJourneyPath('/upload-documents', req.session.data)
    ))
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

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
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

    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

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

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    req.session.data.errorList = null
    req.session.data.errors = null
    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

  const validation = validateImportReasonProceed({
    importReason,
    internalMarketPurpose,
    transhipmentDestinationCountry,
    transitExitBorderControlPost,
    transitDestinationCountry,
    temporaryAdmissionExitDate,
    temporaryAdmissionPortOfExit
  })

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors

    return renderReasonForImportPage(req, res)
  }

  req.session.data.errorList = null
  req.session.data.errors = null

  return res.redirect(getSectionContinueRedirect(req, '/consignment-details'))
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

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    saveActiveAnimalIdentifiersFromBody(req.session.data, req.body, {
      onlySingleAnimalSpecies: true
    })
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

  if (action === 'continue') {
    saveActiveAnimalIdentifiersFromBody(req.session.data, req.body, {
      onlySingleAnimalSpecies: true
    })
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(getSectionContinueRedirect(
      req,
      getNextJourneyPath('/animal-identification-details', req.session.data)
    ))
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

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    saveArrivalDetailsToSession(req.session.data, values)
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
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

  return res.redirect(getSectionContinueRedirect(req, getArrivalDetailsContinuePath(req.session.data)))
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

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    saveTransitCountriesToSession(req.session.data, countries)
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  saveTransitCountriesToSession(req.session.data, countries)

  return res.redirect(getSectionContinueRedirect(
    req,
    getNextJourneyPath('/transit-countries', req.session.data)
  ))
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
    req.session.data.transporterPrivateForm = null

    return res.redirect(getTransporterAddCancelRedirect(req, res))
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

  const { redirectTo } = saveAddedTransporter(
    req.session.data,
    buildPrivateTransporterFromForm(validation.value),
    { addressBookPath: getAddressBookBasePath(res) }
  )

  return res.redirect(redirectTo)
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
    req.session.data.transporterCommercialForm = null

    return res.redirect(getTransporterAddCancelRedirect(req, res))
  }

  const validation = validateTransporterCommercialForm(formValues)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors
    req.session.data.transporterCommercialForm = validation.value

    return renderTransporterAddCommercialPage(req, res, {
      formValues: validation.value,
      showManualAddress: true,
      addressLookup: formValues.addressLookup || '',
      selectedLookupAddressId: formValues.lookupAddressId || ''
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.transporterCommercialForm = null

  const { redirectTo } = saveAddedTransporter(
    req.session.data,
    buildCommercialTransporterFromForm(validation.value),
    { addressBookPath: getAddressBookBasePath(res) }
  )

  return res.redirect(redirectTo)
})

router.post('/transporter', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const transporterId = (req.body.transporterId || '').trim()
  const searchQuery = (req.body.search || '').trim()
  const action = (req.body.action || '').trim()
  const transporter = getTransporterById(transporterId, req.session.data)

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    if (transporter) {
      syncTransporterSession(req.session.data, transporter)
    }

    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

  if (!transporter) {
    req.session.data.errorList = null
    req.session.data.errors = null

    return res.redirect(getSectionContinueRedirect(
      req,
      getNextJourneyPath('/transporter', req.session.data)
    ))
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  syncTransporterSession(req.session.data, transporter)

  return res.redirect(getSectionContinueRedirect(
    req,
    getNextJourneyPath('/transporter', req.session.data)
  ))
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

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/roles-and-addresses', req.session.data))
  }

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

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
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
    router.get(`${section.path}/add-address`, (req, res) => handleConsignmentAddAddressGet(section, req, res))
    router.post(`${section.path}/add-address`, (req, res) => handleConsignmentAddAddressPost(section, req, res))
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

  if (action.startsWith('same-as-place-of-origin:')) {
    const sectionId = action.split(':')[1]
    copyPlaceOfOriginAddressToSection(req.session.data, sectionId)

    return res.redirect('/roles-and-addresses')
  }

  if (action.startsWith('same-as-consignee:')) {
    const sectionId = action.split(':')[1]
    copyConsigneeAddressToSection(req.session.data, sectionId)

    return res.redirect('/roles-and-addresses')
  }

  req.session.data.errorList = null
  req.session.data.errors = null

  if (isJourneySoftSaveAction(getJourneyFormAction(req))) {
    return res.redirect(getJourneySaveRedirect(getJourneyFormAction(req), '/notification-hub', req.session.data))
  }

  return res.redirect(getSectionContinueRedirect(
    req,
    getNextJourneyPath('/roles-and-addresses', req.session.data)
  ))
})

router.post('/contact-address-for-consignment', (req, res) => {
  ensurePrototypeNotificationReference(req.session.data)

  const addressId = (req.body.contactAddressId || '').trim()
  const validation = validateContactAddress(addressId, req.session.data)

  if (validation.errorList.length) {
    req.session.data.errorList = validation.errorList
    req.session.data.errors = validation.errors

    return renderContactAddressPage(req, res, {
      selectedAddressId: addressId
    })
  }

  syncContactAddressSession(req.session.data, validation.address)
  req.session.data.errorList = null
  req.session.data.errors = null

  const action = getJourneyFormAction(req)

  if (isJourneySoftSaveAction(action)) {
    return res.redirect(getJourneySaveRedirect(action, '/notification-hub', req.session.data))
  }

  if (action === 'continue') {
    return res.redirect(getNextJourneyPath('/contact-address-for-consignment', req.session.data))
  }

  if (isFromHub(req)) {
    return res.redirect('/notification-hub')
  }

  if (isFromReview(req)) {
    return res.redirect('/review-notification')
  }

  return res.redirect(getNextJourneyPath('/contact-address-for-consignment', req.session.data))
})

const { mountTestingVersion } = require('./lib/testing-version')
const { mountDesignRelease2Version } = require('./lib/design-release-2-version')
const { mountDesignRelease21Version } = require('./lib/design-release-2.1-version')

mountTestingVersion(govukPrototypeKit, router)
// Mount 2.1 before 2 so Express does not treat /design-release-2.1 as /design-release-2
mountDesignRelease21Version(govukPrototypeKit, router)
mountDesignRelease2Version(govukPrototypeKit, router)

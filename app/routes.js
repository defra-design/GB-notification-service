//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

function syncTasklistBackNavigation (req) {
  if (req.query.from === 'tasklist') {
    req.session.data.backToTasklist = true
  } else if (req.method === 'GET' && Object.prototype.hasOwnProperty.call(req.query, 'from')) {
    req.session.data.backToTasklist = false
  }
}

function getBackLink (req, defaultHref) {
  syncTasklistBackNavigation(req)
  return req.session.data.backToTasklist ? '/notification-tasklist' : defaultHref
}

function withFromTasklist (href) {
  if (!href || href === '#') {
    return href
  }

  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}from=tasklist`
}

router.use((req, res, next) => {
  const sessionData = req.session.data || {}

  res.locals.importDetailsSummaryRows = getImportDetailsSummaryRows(sessionData)
  res.locals.speciesSummaryHtml = sessionData.commodityId ? getSpeciesSummaryHtml(sessionData) : null
  next()
})

const commodities = require('./data/commodities')
const importCategories = require('./data/import-categories')
const { getImportReasonsForCommodity } = require('./data/import-reasons')
const countries = require('./data/countries')
const countryRegionPrefixes = require('./data/country-region-prefixes')
const ukAirports = require('./data/uk-airports')
const meansOfTransportOptions = require('./data/means-of-transport')
const transporters = require('./data/transporters')
const placeOfOriginAddresses = require('./data/place-of-origin-addresses')
const consignorAddresses = require('./data/consignor-addresses')
const consigneeAddresses = require('./data/consignee-addresses')
const importerAddresses = require('./data/importer-addresses')
const placeOfDestinationAddresses = require('./data/place-of-destination-addresses')
const contactAddresses = require('./data/contact-addresses')

const consignmentAddressLists = {
  'place-of-origin': placeOfOriginAddresses,
  consignor: consignorAddresses,
  consignee: consigneeAddresses,
  importer: importerAddresses,
  'place-of-destination': placeOfDestinationAddresses
}

function getCommodityById (commodityId) {
  return commodities.find((commodity) => commodity.id === commodityId)
}

function getCommodityByCode (commodityCode) {
  return commodities.find((commodity) => commodity.code === commodityCode)
}

function getCommodityFields (commodityId, fieldName) {
  const commodity = getCommodityById(commodityId)

  if (!commodity || !commodity[fieldName]) {
    return []
  }

  return commodity[fieldName]
}

function getIdentifierFields (commodityId) {
  return getCommodityFields(commodityId, 'identifiers')
}

function getPackagingFields (commodityId) {
  return getCommodityFields(commodityId, 'packagingFields')
}

function getCertificationPurposeOptions (commodityId) {
  return getCommodityFields(commodityId, 'certificationPurposeOptions')
}

function getUnweanedOptions (commodityId) {
  return getCommodityFields(commodityId, 'unweanedOptions')
}

function getTemperatureOptions (commodityId) {
  return getCommodityFields(commodityId, 'temperatureOptions')
}

function buildCertificationPurposeItems (options, selectedValue) {
  return options.map((option) => ({
    value: option,
    text: option,
    checked: selectedValue === option
  }))
}

function buildSimpleRadioItems (options, selectedValue) {
  return options.map((option) => ({
    value: option,
    text: option,
    checked: selectedValue === option
  }))
}

function getAdditionalAnimalDetailsConfig (sessionData) {
  const commodityId = sessionData.commodityId
  const certificationPurposeOptions = getCertificationPurposeOptions(commodityId)
  const unweanedOptions = getUnweanedOptions(commodityId)
  const temperatureOptions = getTemperatureOptions(commodityId)

  return {
    hasCertificationPurposeQuestion: certificationPurposeOptions.length > 0,
    hasUnweanedQuestion: unweanedOptions.length > 0,
    hasTemperatureQuestion: temperatureOptions.length > 0,
    certificationPurposeOptions,
    unweanedOptions,
    temperatureOptions
  }
}

function hasAdditionalAnimalDetailsComplete (sessionData) {
  const config = getAdditionalAnimalDetailsConfig(sessionData)

  if (config.hasTemperatureQuestion) {
    return config.temperatureOptions.includes(sessionData.temperature)
  }

  if (config.hasCertificationPurposeQuestion && !config.certificationPurposeOptions.includes(sessionData.certificationPurpose)) {
    return false
  }

  if (config.hasUnweanedQuestion && !config.unweanedOptions.includes(sessionData.unweanedAnimals)) {
    return false
  }

  return config.hasCertificationPurposeQuestion || config.hasUnweanedQuestion
}

function commodityRequiresCph (sessionData) {
  return ['cow', 'pig'].includes(sessionData.commodityId)
}

function hasCphDetails (sessionData) {
  if (!commodityRequiresCph(sessionData)) {
    return true
  }

  return Boolean(sessionData.cphNumber && sessionData.cphNumber.trim())
}

function hasAllConsignmentAddressFields (sessionData) {
  const requiredAddresses = [
    sessionData.placeOfOriginAddress,
    sessionData.consignorAddress,
    sessionData.consigneeAddress,
    sessionData.importerAddress,
    sessionData.placeOfDestinationAddress
  ]

  return requiredAddresses.every((value) => value && value.trim())
}

function hasConsignmentAddresses (sessionData) {
  return hasAllConsignmentAddressFields(sessionData) && hasCphDetails(sessionData)
}

function getConsignmentAddressesViewModel (req) {
  const sessionData = req.session.data

  return {
    backLink: getBackLink(req, '/notification-tasklist'),
    reference: sessionData.notificationReference || 'GBN-AG-26-7K8M2P (Draft)',
    addressSections: getConsignmentHubSections(sessionData)
  }
}

function getContactAddressById (addressId) {
  return contactAddresses.find((address) => address.id === addressId)
}

function hasContactAddress (sessionData) {
  return Boolean(
    sessionData.contactAddress &&
    sessionData.contactAddress.trim() &&
    getContactAddressById(sessionData.contactAddressId)
  )
}

function syncContactAddressSession (sessionData, address) {
  sessionData.contactAddress = formatTraderAddressForSession(address)
  sessionData.contactAddressId = address.id
}

function clearContactAddressSession (sessionData) {
  sessionData.contactAddress = null
  sessionData.contactAddressId = null
  sessionData.contactAddressSearch = null
}

function redirectIfNoAddressSectionAccess (req, res) {
  if (redirectIfNoCommodity(req, res)) {
    return true
  }

  if (!req.session.data.animalsAdded || !req.session.data.animals || req.session.data.animals.length === 0) {
    res.redirect('/animal-identification-details')
    return true
  }

  if (!hasAdditionalAnimalDetailsComplete(req.session.data)) {
    res.redirect('/additional-animal-details')
    return true
  }

  if (!hasValidImportReason(req.session.data)) {
    res.redirect('/reason-for-import')
    return true
  }

  return false
}

function hasArrivalDetails (sessionData) {
  const arrivalDay = (sessionData.arrivalDateDay || '').trim()
  const arrivalMonth = (sessionData.arrivalDateMonth || '').trim()
  const arrivalYear = (sessionData.arrivalDateYear || '').trim()

  return Boolean(
    sessionData.portOfEntry &&
    sessionData.portOfEntry.trim() &&
    sessionData.meansOfTransport &&
    meansOfTransportOptions.includes(sessionData.meansOfTransport) &&
    sessionData.transportIdentification &&
    sessionData.transportIdentification.trim() &&
    sessionData.transportDocumentReference &&
    sessionData.transportDocumentReference.trim() &&
    arrivalDay &&
    arrivalMonth &&
    arrivalYear
  )
}

function getTransporterById (transporterId) {
  return transporters.find((transporter) => transporter.id === transporterId)
}

function hasTransportDetails (sessionData) {
  return Boolean(sessionData.transporterId && getTransporterById(sessionData.transporterId))
}

function formatTransporterAddress (transporter) {
  if (transporter.addressLines && transporter.addressLines.length) {
    return transporter.addressLines.join(', ')
  }

  return transporter.address || ''
}

function getTransporterDisplayName (transporter) {
  if (transporter.nameLines && transporter.nameLines.length) {
    return transporter.nameLines.join(' ')
  }

  return transporter.name
}

function syncTransporterSession (sessionData, transporter) {
  sessionData.transporterId = transporter.id
  sessionData.transporterName = getTransporterDisplayName(transporter)
  sessionData.transporterAddress = formatTransporterAddress(transporter)
  sessionData.transporterCountry = transporter.country
  sessionData.transporterApprovalNumber = transporter.approvalNumber || null
  sessionData.transporterType = transporter.type || null
  sessionData.transporterStatus = transporter.status || null
}

function redirectIfNoMovementTaskAccess (req, res) {
  if (redirectIfNoCommodity(req, res)) {
    return true
  }

  if (!req.session.data.animalsAdded || !req.session.data.animals || req.session.data.animals.length === 0) {
    res.redirect('/animal-identification-details')
    return true
  }

  if (!hasAdditionalAnimalDetailsComplete(req.session.data)) {
    res.redirect('/additional-animal-details')
    return true
  }

  if (!hasValidImportReason(req.session.data)) {
    res.redirect('/reason-for-import')
    return true
  }

  return false
}

const consignmentAddressOrder = [
  'place-of-origin',
  'consignor',
  'consignee',
  'importer',
  'place-of-destination'
]

const consignmentAddressConfig = {
  'place-of-origin': {
    sessionKey: 'placeOfOriginAddress',
    addressIdKey: 'placeOfOriginAddressId',
    searchKey: 'placeOfOriginAddressSearch',
    heading: 'Place of origin',
    addLinkText: 'Add a place of origin',
    hint: 'The address where the animals begin their journey to Great Britain'
  },
  consignor: {
    sessionKey: 'consignorAddress',
    addressIdKey: 'consignorAddressId',
    searchKey: 'consignorAddressSearch',
    heading: 'Consignor or exporter',
    addLinkText: 'Add a consignor',
    hint: 'This is the sender of the consignment.'
  },
  consignee: {
    sessionKey: 'consigneeAddress',
    addressIdKey: 'consigneeAddressId',
    searchKey: 'consigneeAddressSearch',
    heading: 'Consignee',
    addLinkText: 'Add a consignee',
    hint: 'This is the receiver or buyer of the consignment being shipped or transported.'
  },
  importer: {
    sessionKey: 'importerAddress',
    addressIdKey: 'importerAddressId',
    searchKey: 'importerAddressSearch',
    heading: 'Importer',
    addLinkText: 'Add an importer',
    hint: 'This is usually the same as the consignee. You can select a different person if needed.'
  },
  'place-of-destination': {
    sessionKey: 'placeOfDestinationAddress',
    addressIdKey: 'placeOfDestinationAddressId',
    searchKey: 'placeOfDestinationAddressSearch',
    heading: 'Place of destination',
    addLinkText: 'Add a place of destination',
    hint: 'This is where the animals will be unloaded and accommodated for at least 48 hours. If a health certificate is required, it will show this address.'
  }
}

function getConsignmentAddressConfig (addressType) {
  return consignmentAddressConfig[addressType]
}

function getConsignmentAddressLinkText (config, hasAddress) {
  if (!hasAddress) {
    return config.addLinkText
  }

  return config.addLinkText.replace(/^Add (a |an )/, 'Change ')
}

function getConsignmentAddressSections (sessionData) {
  return consignmentAddressOrder.map((addressType) => {
    const config = consignmentAddressConfig[addressType]
    const selectedAddress = (sessionData[config.sessionKey] || '').trim()
    const hasAddress = Boolean(selectedAddress)

    return {
      addressType,
      heading: config.heading,
      hint: config.hint,
      linkText: getConsignmentAddressLinkText(config, hasAddress),
      linkId: addressType === 'place-of-origin' ? 'place-of-origin-link' : null,
      href: `/consignment-addresses/add/${addressType}`,
      selectedAddressHtml: hasAddress ? formatMultilineValue(selectedAddress) : null
    }
  })
}

function getCphSection (sessionData) {
  const cphNumber = (sessionData.cphNumber || '').trim()
  const hasCph = Boolean(cphNumber)

  return {
    heading: 'County Parish Holding number (CPH)',
    hint: 'The County Parish Holding (CPH) number identifies the holding where the animals will be kept.',
    linkText: hasCph ? 'Change CPH number' : 'Add a CPH number',
    linkId: 'cph-number-link',
    href: '/county-parish-holding',
    selectedAddressHtml: hasCph ? cphNumber : null
  }
}

function getConsignmentHubSections (sessionData) {
  const addressSections = getConsignmentAddressSections(sessionData)

  if (commodityRequiresCph(sessionData)) {
    return [...addressSections, getCphSection(sessionData)]
  }

  return addressSections
}

function getConsignmentAddressList (addressType) {
  return consignmentAddressLists[addressType] || []
}

function getAllConsignmentAddresses () {
  return Object.values(consignmentAddressLists).flat()
}

function getTraderAddressById (addressId, addressType) {
  const addressList = addressType
    ? getConsignmentAddressList(addressType)
    : getAllConsignmentAddresses()

  return addressList.find((address) => address.id === addressId)
}

function formatTraderAddressForSession (address) {
  return [address.name, ...(address.addressLines || []), address.country].join('\n')
}

function syncConsignmentAddressSession (sessionData, config, address) {
  sessionData[config.sessionKey] = formatTraderAddressForSession(address)
  sessionData[config.addressIdKey] = address.id
}

function clearConsignmentAddressSession (sessionData, config) {
  sessionData[config.sessionKey] = null
  sessionData[config.addressIdKey] = null
  sessionData[config.searchKey] = null
}

function buildImportCategoryItems (selectedValue) {
  return importCategories.map((category) => ({
    value: category.value,
    text: category.text,
    checked: selectedValue === category.value
  }))
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

function getUkAirportDisplayOptions () {
  return ukAirports.map((airport) => `${airport.name} - ${airport.code}`)
}

function isValidPortOfEntry (portOfEntry) {
  const normalised = (portOfEntry || '').trim().toLowerCase()

  return getUkAirportDisplayOptions().some((option) => option.toLowerCase() === normalised)
}

function getAllowedImportCategories () {
  return importCategories.map((category) => category.value)
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

function formatRegionOfOriginCode (countryName, suffix) {
  const prefix = getCountryRegionPrefix(countryName)
  const normalisedSuffix = String(suffix || '').trim().toUpperCase()

  if (!prefix || !normalisedSuffix) {
    return ''
  }

  return `${prefix}-${normalisedSuffix}`
}

function getRegionOfOriginSummaryValue (sessionData) {
  if (sessionData.regionOfOriginRequired === 'Yes') {
    return sessionData.regionOfOriginCode || 'Yes'
  }

  return sessionData.regionOfOriginRequired
}

function hasOriginDetails (sessionData) {
  if (!sessionData.countryOfOrigin) {
    return false
  }

  if (sessionData.regionOfOriginRequired === 'No') {
    return true
  }

  if (sessionData.regionOfOriginRequired === 'Yes') {
    return Boolean(sessionData.regionOfOriginCode && String(sessionData.regionOfOriginCode).trim())
  }

  return false
}

function getImportDetailsSummaryRows (sessionData) {
  const rows = []

  if (sessionData.importCategory) {
    rows.push({
      key: { text: 'What are you importing' },
      value: { text: sessionData.importCategory },
      actions: {
        items: [
          {
            href: '/what-are-you-importing',
            text: 'Change',
            visuallyHiddenText: 'what you are importing'
          }
        ]
      }
    })
  }

  if (sessionData.countryOfOrigin) {
    rows.push({
      key: { text: 'Country of origin' },
      value: { text: sessionData.countryOfOrigin },
      actions: {
        items: [
          {
            href: '/origin-of-the-import',
            text: 'Change',
            visuallyHiddenText: 'country of origin'
          }
        ]
      }
    })
  }

  if (sessionData.regionOfOriginRequired === 'Yes' || sessionData.regionOfOriginRequired === 'No') {
    rows.push({
      key: { text: 'Does the consignment require a region of origin code?' },
      value: { text: getRegionOfOriginSummaryValue(sessionData) },
      actions: {
        items: [
          {
            href: '/origin-of-the-import',
            text: 'Change',
            visuallyHiddenText: 'whether the consignment requires a region of origin code'
          }
        ]
      }
    })
  }

  if (hasOriginDetails(sessionData)) {
    const reference = sessionData.internalReference
    const referenceText =
      reference && String(reference).trim() && reference !== 'N/A' ? String(reference).trim() : 'N/A'

    rows.push({
      key: { text: 'Your internal reference number for this consignment (optional)' },
      value: { text: referenceText },
      actions: {
        items: [
          {
            href: '/origin-of-the-import',
            text: 'Change',
            visuallyHiddenText: 'your internal reference number'
          }
        ]
      }
    })
  }

  return rows
}

function clearOriginSession (sessionData) {
  sessionData.countryOfOrigin = null
  sessionData.regionOfOriginRequired = null
  sessionData.regionOfOriginCode = null
  sessionData.regionOfOriginCodeSuffix = null
  sessionData.internalReference = null
}

function redirectIfNoOrigin (req, res) {
  if (redirectIfNoImportCategory(req, res)) {
    return true
  }

  if (!hasOriginDetails(req.session.data)) {
    res.redirect('/origin-of-the-import')
    return true
  }

  return false
}

function resetCommoditySelectionSession (sessionData) {
  sessionData.commodityId = null
  sessionData.commodityCode = null
  sessionData.commodityName = null
  sessionData.speciesSummary = null
  sessionData.speciesPanelName = null
  sessionData.selectedSpecies = []
  sessionData.commoditySelections = []
  sessionData.speciesEntries = []
  sessionData.identifierFields = []
  sessionData.packagingFields = []
  sessionData.packaging = null
  sessionData.certificationPurposeOptions = []
  sessionData.certificationPurpose = null
  sessionData.unweanedAnimals = null
  sessionData.temperature = null
  sessionData.animalCountInput = null
  sessionData.animalsAdded = false
  sessionData.animals = []
}

function clearCommoditySession (sessionData) {
  resetCommoditySelectionSession(sessionData)
  sessionData.cphNumber = null
  Object.values(consignmentAddressConfig).forEach((config) => {
    clearConsignmentAddressSession(sessionData, config)
  })
  clearContactAddressSession(sessionData)
  sessionData.portOfEntry = null
  sessionData.arrivalDateDay = null
  sessionData.arrivalDateMonth = null
  sessionData.arrivalDateYear = null
  sessionData.meansOfTransport = null
  sessionData.transportIdentification = null
  sessionData.transportDocumentReference = null
  sessionData.transporterId = null
  sessionData.transporterName = null
  sessionData.transporterAddress = null
  sessionData.transporterApprovalNumber = null
  sessionData.transporterType = null
  sessionData.transporterStatus = null
  sessionData.transporterCountry = null
  sessionData.transporterSearch = null
  sessionData.importReason = null
  sessionData.declarationConfirmed = null
  sessionData.declarationDate = null
  sessionData.notificationSubmitted = null
  sessionData.notificationReference = null
}

function redirectIfNoImportCategory (req, res) {
  if (!req.session.data.importCategory) {
    res.redirect('/what-are-you-importing')
    return true
  }

  return false
}

function redirectIfNoLiveAnimalsCategory (req, res) {
  if (redirectIfNoImportCategory(req, res)) {
    return true
  }

  if (req.session.data.importCategory !== 'Live animals') {
    res.redirect('/import-category-not-available')
    return true
  }

  return false
}

function redirectIfNoCommodity (req, res) {
  if (redirectIfNoOrigin(req, res)) {
    return true
  }

  if (req.session.data.importCategory === 'Live animals' && !req.session.data.commodityCode) {
    res.redirect('/select-commodity')
    return true
  }

  return false
}

function buildImportReasonItems (sessionData, selectedValue) {
  return getImportReasonsForCommodity(sessionData.commodityId).map((reason) => {
    return {
      value: reason.value,
      text: reason.text,
      checked: selectedValue === reason.value
    }
  })
}

function getAllowedImportReasons (sessionData) {
  return getImportReasonsForCommodity(sessionData.commodityId).map((reason) => reason.value)
}

function hasValidImportReason (sessionData) {
  const importReason = (sessionData.importReason || '').trim()

  if (!importReason) {
    return false
  }

  return getAllowedImportReasons(sessionData).includes(importReason)
}

function getCommodityHubRows (sessionData) {
  const numberOfPackages = sessionData.packaging && sessionData.packaging['number-of-packages']
  const packages = numberOfPackages && numberOfPackages.trim() ? numberOfPackages.trim() : 'N/A'
  const commodityCode = sessionData.commodityCode || '—'
  const commodityName = sessionData.commodityName || '—'
  const entries = sessionData.speciesEntries || []

  if (entries.length > 0) {
    return entries.map((entry) => ({
      commodityCode,
      commodityName,
      species: entry.label || '—',
      quantity: entry.animalCount || (entry.animals ? String(entry.animals.length) : '0'),
      packages
    }))
  }

  const quantity = sessionData.animalCount || (sessionData.animals ? String(sessionData.animals.length) : '0')

  return [
    {
      commodityCode,
      commodityName,
      species: sessionData.speciesSummary || '—',
      quantity: quantity || '0',
      packages
    }
  ]
}

function getCommodityHubViewModel (sessionData) {
  const quantity = sessionData.animalCount || (sessionData.animals ? String(sessionData.animals.length) : '0')
  const numberOfPackages = sessionData.packaging && sessionData.packaging['number-of-packages']
  const packages = numberOfPackages && numberOfPackages.trim() ? numberOfPackages.trim() : 'N/A'

  return {
    animalCountDisplay: quantity || '0',
    packagesDisplay: packages,
    rows: getCommodityHubRows(sessionData)
  }
}

function getNotificationTasklistViewModel (sessionData) {
  const hasOrigin = hasOriginDetails(sessionData)
  const hasCommodity = Boolean(sessionData.commodityCode)
  const hasAnimals = Boolean(sessionData.animalsAdded && sessionData.animals && sessionData.animals.length > 0)
  const hasAdditionalAnimalDetails = hasAdditionalAnimalDetailsComplete(sessionData)
  const hasImportReason = hasValidImportReason(sessionData)
  const hasAddresses = hasConsignmentAddresses(sessionData)
  const hasContact = hasContactAddress(sessionData)
  const hasArrival = hasArrivalDetails(sessionData)
  const hasTransport = hasTransportDetails(sessionData)

  const statusComplete = { text: 'Complete', class: 'govuk-tag--green' }
  const statusTodo = { text: 'To do', class: 'govuk-tag--blue' }

  return {
    reference: sessionData.notificationReference || 'GBN-AG-26-7K8M2P (Draft)',
    sections: [
      {
        title: 'About the consignment',
        items: [
          {
            text: 'Where is this consignment coming from?',
            href: withFromTasklist('/origin-of-the-import'),
            status: hasOrigin ? statusComplete : statusTodo
          },
          {
            text: 'Main reason for importing the animals',
            href: withFromTasklist('/reason-for-import'),
            status: hasImportReason ? statusComplete : statusTodo
          }
        ]
      },
      {
        title: 'Description of the goods',
        items: [
          {
            text: 'Your commodities',
            href: withFromTasklist('/commodity-hub'),
            status: hasCommodity && hasAnimals ? statusComplete : statusTodo
          },
          {
            text: 'Additional animal details',
            href: withFromTasklist('/additional-animal-details'),
            status: hasAdditionalAnimalDetails ? statusComplete : statusTodo
          }
        ]
      },
      {
        title: 'Documents',
        items: [
          { text: 'Latest health certificate', href: '#', status: statusTodo },
          { text: 'Accompanying documents', href: '#', status: statusTodo }
        ]
      },
      {
        title: 'Addresses',
        items: [
          { text: 'Consignment addresses', href: withFromTasklist('/consignment-addresses'), status: hasAddresses ? statusComplete : statusTodo },
          { text: 'Contact address for this consignment', href: withFromTasklist('/contact-address-for-consignment'), status: hasContact ? statusComplete : statusTodo }
        ]
      },
      {
        title: 'Transport',
        items: [
          { text: 'Arrival details', href: withFromTasklist('/arrival-details'), status: hasArrival ? statusComplete : statusTodo },
          { text: 'Transport details', href: withFromTasklist('/transport-details'), status: hasTransport ? statusComplete : statusTodo }
        ]
      }
    ]
  }
}

function getSpeciesLabels (commodityId, speciesIds) {
  const commodity = getCommodityById(commodityId)
  const normalisedSpeciesIds = normalizeSelectedSpecies(speciesIds)

  if (!commodity) {
    return []
  }

  return normalisedSpeciesIds
    .map((speciesId) => commodity.species.find((species) => species.id === speciesId))
    .filter(Boolean)
    .map((species) => species.label)
}

function getSpeciesSummary (speciesLabels) {
  if (speciesLabels.length > 0) {
    return speciesLabels.join(', ')
  }

  return '—'
}

function getFormValue (value) {
  if (Array.isArray(value)) {
    return String(value[value.length - 1] ?? '').trim()
  }

  return String(value ?? '').trim()
}

function isDeclarationConfirmed (value) {
  if (value === true) {
    return true
  }

  if (Array.isArray(value)) {
    return value.some((item) => isDeclarationConfirmed(item))
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => isDeclarationConfirmed(item))
  }

  return getFormValue(value).toLowerCase() === 'yes'
}

function getDeclarationConfirmedFromBody (body) {
  if (!body || typeof body !== 'object') {
    return false
  }

  if (body.declarationConfirmed !== undefined) {
    return isDeclarationConfirmed(body.declarationConfirmed)
  }

  const matchingKey = Object.keys(body).find((key) =>
    key === 'declarationConfirmed' || key.startsWith('declarationConfirmed[')
  )

  if (matchingKey) {
    return isDeclarationConfirmed(body[matchingKey])
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

function getSpeciesIdsForSession (sessionData) {
  const commodity = getCommodityById(sessionData.commodityId)
  const selectedSpecies = normalizeSelectedSpecies(sessionData.selectedSpecies)

  if (!commodity) {
    return []
  }

  if (selectedSpecies.length > 0) {
    return selectedSpecies.filter((speciesId) =>
      commodity.species.some((species) => species.id === speciesId)
    )
  }

  return commodity.species.map((species) => species.id)
}

function initialiseSpeciesEntries (sessionData) {
  const commodity = getCommodityById(sessionData.commodityId)

  if (!commodity) {
    sessionData.speciesEntries = []
    return
  }

  const speciesIds = getSpeciesIdsForSession(sessionData)
  const existingEntries = sessionData.speciesEntries || []

  sessionData.speciesEntries = speciesIds.map((speciesId) => {
    const species = commodity.species.find((item) => item.id === speciesId)
    const existingEntry = existingEntries.find((entry) => entry.speciesId === speciesId)

    return {
      speciesId,
      label: species ? species.label : speciesId,
      animalCountInput: existingEntry ? existingEntry.animalCountInput : '1',
      animalsAdded: Boolean(existingEntry && existingEntry.animalsAdded),
      animalCount: existingEntry ? existingEntry.animalCount : null,
      animals: existingEntry && existingEntry.animals ? existingEntry.animals : []
    }
  })

  const speciesLabels = sessionData.speciesEntries.map((entry) => entry.label)

  sessionData.speciesSummary = getSpeciesSummary(speciesLabels)
  sessionData.speciesPanelName = speciesLabels[0] || commodity.name
  syncAggregateAnimalsFromSpeciesEntries(sessionData)
}

function getSpeciesEntry (sessionData, speciesId) {
  return (sessionData.speciesEntries || []).find((entry) => entry.speciesId === speciesId)
}

function syncAggregateAnimalsFromSpeciesEntries (sessionData) {
  const entries = sessionData.speciesEntries || []
  const allAnimals = entries.flatMap((entry) =>
    (entry.animals || []).map((animal) => ({
      ...animal,
      speciesId: entry.speciesId,
      speciesLabel: entry.label
    }))
  )

  sessionData.animals = allAnimals
  sessionData.animalsAdded = entries.length > 0 && entries.every((entry) =>
    entry.animalsAdded && entry.animals && entry.animals.length > 0
  )
  sessionData.animalCount = allAnimals.length > 0 ? String(allAnimals.length) : null
}

function hasAllSpeciesAnimalsComplete (sessionData) {
  const entries = sessionData.speciesEntries || []

  return entries.length > 0 && entries.every((entry) =>
    entry.animalsAdded && entry.animals && entry.animals.length > 0
  )
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

function buildEmptyFieldValues (fields) {
  const values = {}

  fields.forEach((field) => {
    values[field.id] = ''
  })

  return values
}

function mergeFieldValues (fields, existingValues) {
  const values = buildEmptyFieldValues(fields)

  if (existingValues) {
    fields.forEach((field) => {
      values[field.id] = existingValues[field.id] || ''
    })
  }

  return values
}

function buildAnimalsList (speciesName, count, identifierFields, existingAnimals) {
  const animals = []
  const safeCount = Math.min(Math.max(parseInt(count, 10) || 0, 0), 50)

  for (let i = 1; i <= safeCount; i++) {
    const existing = (existingAnimals || []).find((animal) => animal.id === i)

    animals.push({
      id: i,
      label: `${speciesName} ${i}`,
      identifiers: mergeFieldValues(identifierFields, existing && existing.identifiers)
    })
  }

  return animals
}

function escapeHtml (value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getSpeciesSummaryHtml (sessionData) {
  const commodity = getCommodityById(sessionData.commodityId)

  if (!commodity) {
    return '—'
  }

  const labels = getSpeciesLabels(commodity.id, getSpeciesIdsForSession(sessionData))

  if (labels.length === 0) {
    return '—'
  }

  return labels.map((label) => escapeHtml(label)).join('<br>')
}

function formatMultilineValue (value) {
  const text = (value || '').trim()

  if (!text) {
    return 'N/A'
  }

  return text
    .split(/\r?\n/)
    .map((line) => escapeHtml(line.trim()))
    .filter(Boolean)
    .join('<br>')
}

function formatArrivalDate (sessionData) {
  const day = (sessionData.arrivalDateDay || '').trim()
  const month = (sessionData.arrivalDateMonth || '').trim()
  const year = (sessionData.arrivalDateYear || '').trim()

  if (!day || !month || !year) {
    return 'N/A'
  }

  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
}

function formatDeclarationDate (date = new Date()) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function getDeclarationDate (sessionData) {
  if (sessionData.declarationDate) {
    return sessionData.declarationDate
  }

  const declarationDate = formatDeclarationDate()

  sessionData.declarationDate = declarationDate

  return declarationDate
}

function getReviewNotificationViewModel (sessionData) {
  const packagingCount = sessionData.packaging && sessionData.packaging['number-of-packages']
    ? String(sessionData.packaging['number-of-packages']).trim()
    : ''
  const animalsCount = sessionData.animals && sessionData.animals.length ? String(sessionData.animals.length) : 'N/A'
  const speciesLabel = sessionData.speciesSummary || sessionData.commodityName || 'N/A'

  const additionalAnimalRows = [
    {
      key: { text: 'Certified for' },
      value: { text: sessionData.certificationPurpose || 'N/A' },
      actions: { items: [{ href: '/additional-animal-details', text: 'Change', visuallyHiddenText: 'certified for' }] }
    }
  ]

  if (sessionData.unweanedAnimals) {
    additionalAnimalRows.push({
      key: { text: 'Includes unweaned animals' },
      value: { text: sessionData.unweanedAnimals },
      actions: { items: [{ href: '/additional-animal-details', text: 'Change', visuallyHiddenText: 'includes unweaned animals' }] }
    })
  }

  if (sessionData.temperature) {
    additionalAnimalRows.push({
      key: { text: 'Temperature' },
      value: { text: sessionData.temperature },
      actions: { items: [{ href: '/additional-animal-details', text: 'Change', visuallyHiddenText: 'temperature' }] }
    })
  }

  const commodityRows = [
    {
      key: { text: 'Commodity code' },
      value: { text: sessionData.commodityCode || 'N/A' },
      actions: { items: [{ href: '/select-commodity?change=species', text: 'Change', visuallyHiddenText: 'commodity code' }] }
    },
    {
      key: { text: 'Common name' },
      value: { text: sessionData.commodityName || 'N/A' },
      actions: { items: [{ href: '/select-commodity?change=species', text: 'Change', visuallyHiddenText: 'common name' }] }
    },
    {
      key: { text: 'Species' },
      value: { text: speciesLabel },
      actions: { items: [{ href: '/select-commodity?change=species', text: 'Change', visuallyHiddenText: 'species' }] }
    },
    {
      key: { text: 'Quantity' },
      value: { text: animalsCount },
      actions: { items: [{ href: '/animal-identification-details', text: 'Change', visuallyHiddenText: 'quantity' }] }
    },
    {
      key: { text: 'Animal details' },
      value: { text: animalsCount !== 'N/A' ? `${animalsCount} animals added` : 'N/A' },
      actions: { items: [{ href: '/animal-identification-details', text: 'Change', visuallyHiddenText: 'animal details' }] }
    },
    {
      key: { text: 'Package details' },
      value: { text: packagingCount || 'N/A' },
      actions: { items: [{ href: '/animal-identification-details', text: 'Change', visuallyHiddenText: 'package details' }] }
    }
  ]

  return {
    sections: [
      {
        title: 'About the consignment',
        lists: [
          {
            title: 'Where is this consignment coming from?',
            rows: [
              {
                key: { text: 'Country of origin' },
                value: { text: sessionData.countryOfOrigin || 'N/A' },
                actions: { items: [{ href: '/origin-of-the-import', text: 'Change', visuallyHiddenText: 'country of origin' }] }
              },
              {
                key: { text: 'Region of origin code' },
                value: { text: getRegionOfOriginSummaryValue(sessionData) || 'N/A' },
                actions: { items: [{ href: '/origin-of-the-import', text: 'Change', visuallyHiddenText: 'region of origin code' }] }
              },
              {
                key: { text: 'Internal reference number' },
                value: { text: sessionData.internalReference || 'N/A' },
                actions: { items: [{ href: '/origin-of-the-import', text: 'Change', visuallyHiddenText: 'internal reference number' }] }
              }
            ]
          },
          {
            title: 'Main reason for importing the animals',
            rows: [
              {
                key: { text: 'Reason for import' },
                value: { text: sessionData.importReason || 'N/A' },
                actions: { items: [{ href: '/reason-for-import', text: 'Change', visuallyHiddenText: 'reason for import' }] }
              }
            ]
          }
        ]
      },
      {
        title: 'Description of the goods',
        lists: [
          {
            title: 'Your commodities',
            rows: commodityRows
          },
          {
            title: 'Additional animal details',
            rows: additionalAnimalRows
          }
        ]
      },
      {
        title: 'Documents',
        lists: [
          {
            title: 'Latest health certificate',
            rows: [
              {
                key: { text: 'Details' },
                value: { text: 'Not added' }
              }
            ]
          },
          {
            title: 'Accompanying documents',
            rows: [
              {
                key: { text: 'Details' },
                value: { text: 'Not added' }
              }
            ]
          }
        ]
      },
      {
        title: 'Addresses',
        lists: [
          {
            title: 'Consignment addresses',
            rows: (() => {
              const rows = [
              {
                key: { text: 'Place of origin' },
                value: { html: formatMultilineValue(sessionData.placeOfOriginAddress) },
                actions: { items: [{ href: '/consignment-addresses/add/place-of-origin', text: 'Change', visuallyHiddenText: 'place of origin' }] }
              },
              {
                key: { text: 'Consignor' },
                value: { html: formatMultilineValue(sessionData.consignorAddress) },
                actions: { items: [{ href: '/consignment-addresses/add/consignor', text: 'Change', visuallyHiddenText: 'consignor' }] }
              },
              {
                key: { text: 'Consignee' },
                value: { html: formatMultilineValue(sessionData.consigneeAddress) },
                actions: { items: [{ href: '/consignment-addresses/add/consignee', text: 'Change', visuallyHiddenText: 'consignee' }] }
              },
              {
                key: { text: 'Importer' },
                value: { html: formatMultilineValue(sessionData.importerAddress) },
                actions: { items: [{ href: '/consignment-addresses/add/importer', text: 'Change', visuallyHiddenText: 'importer' }] }
              },
              {
                key: { text: 'Place of destination' },
                value: { html: formatMultilineValue(sessionData.placeOfDestinationAddress) },
                actions: { items: [{ href: '/consignment-addresses/add/place-of-destination', text: 'Change', visuallyHiddenText: 'place of destination' }] }
              },
              {
                key: { text: 'Permanent address' },
                value: { html: formatMultilineValue(sessionData.placeOfDestinationAddress) },
                actions: { items: [{ href: '/consignment-addresses/add/place-of-destination', text: 'Change', visuallyHiddenText: 'permanent address' }] }
              }
              ]

              if (commodityRequiresCph(sessionData)) {
                const placeOfDestinationIndex = rows.findIndex((row) => row.key.text === 'Place of destination')
                rows.splice(placeOfDestinationIndex + 1, 0, {
                  key: { text: 'CPH number' },
                  value: { text: sessionData.cphNumber || 'N/A' },
                  actions: { items: [{ href: '/county-parish-holding', text: 'Change', visuallyHiddenText: 'CPH number' }] }
                })
              }

              return rows
            })()
          },
          {
            title: 'Contact address for this consignment',
            rows: [
              {
                key: { text: 'Address' },
                value: { html: formatMultilineValue(sessionData.contactAddress) },
                actions: { items: [{ href: '/contact-address-for-consignment', text: 'Change', visuallyHiddenText: 'contact address for this consignment' }] }
              }
            ]
          }
        ]
      },
      {
        title: 'Transport',
        lists: [
          {
            title: 'Arrival details',
            rows: [
              {
                key: { text: 'Port of entry' },
                value: { text: sessionData.portOfEntry || 'N/A' },
                actions: { items: [{ href: '/arrival-details', text: 'Change', visuallyHiddenText: 'port of entry' }] }
              },
              {
                key: { text: 'Arrival date at destination' },
                value: { text: formatArrivalDate(sessionData) },
                actions: { items: [{ href: '/arrival-details', text: 'Change', visuallyHiddenText: 'arrival date at destination' }] }
              },
              {
                key: { text: 'Means of transport' },
                value: { text: sessionData.meansOfTransport || 'N/A' },
                actions: { items: [{ href: '/arrival-details', text: 'Change', visuallyHiddenText: 'means of transport' }] }
              },
              {
                key: { text: 'Transport identification' },
                value: { text: sessionData.transportIdentification || 'N/A' },
                actions: { items: [{ href: '/arrival-details', text: 'Change', visuallyHiddenText: 'transport identification' }] }
              },
              {
                key: { text: 'Transport document reference' },
                value: { text: sessionData.transportDocumentReference || 'N/A' },
                actions: { items: [{ href: '/arrival-details', text: 'Change', visuallyHiddenText: 'transport document reference' }] }
              }
            ]
          },
          {
            title: 'Transport details',
            rows: [
              {
                key: { text: 'Name' },
                value: { text: sessionData.transporterName || 'N/A' },
                actions: { items: [{ href: '/transport-details', text: 'Change', visuallyHiddenText: 'transport name' }] }
              },
              {
                key: { text: 'Address' },
                value: { text: sessionData.transporterAddress || 'N/A' },
                actions: { items: [{ href: '/transport-details', text: 'Change', visuallyHiddenText: 'transport address' }] }
              },
              {
                key: { text: 'Country' },
                value: { text: sessionData.transporterCountry || 'N/A' },
                actions: { items: [{ href: '/transport-details', text: 'Change', visuallyHiddenText: 'transport country' }] }
              },
              {
                key: { text: 'Approval number' },
                value: { text: sessionData.transporterApprovalNumber || 'N/A' },
                actions: { items: [{ href: '/transport-details', text: 'Change', visuallyHiddenText: 'transport approval number' }] }
              },
              {
                key: { text: 'Type' },
                value: { text: sessionData.transporterType || 'N/A' },
                actions: { items: [{ href: '/transport-details', text: 'Change', visuallyHiddenText: 'transport type' }] }
              },
              {
                key: { text: 'Status' },
                value: { text: sessionData.transporterStatus || 'N/A' },
                actions: { items: [{ href: '/transport-details', text: 'Change', visuallyHiddenText: 'transport status' }] }
              }
            ]
          }
        ]
      }
    ]
  }
}

function renumberAnimals (animals, speciesName) {
  return animals.map((animal, index) => ({
    ...animal,
    id: index + 1,
    label: `${speciesName} ${index + 1}`
  }))
}

function saveAnimalFieldGroup (animal, fields, valuesKey, body) {
  if (!animal[valuesKey]) {
    animal[valuesKey] = buildEmptyFieldValues(fields)
  }

  fields.forEach((field) => {
    const fieldKey = `animal-${animal.id}-${field.id}`

    if (body[fieldKey] !== undefined) {
      animal[valuesKey][field.id] = body[fieldKey]
    }
  })
}

function saveAnimalFormData (req) {
  const identifierFields = req.session.data.identifierFields || []

  ;(req.session.data.speciesEntries || []).forEach((entry) => {
    ;(entry.animals || []).forEach((animal) => {
      saveAnimalFieldGroup(animal, identifierFields, 'identifiers', req.body)
    })
  })

  syncAggregateAnimalsFromSpeciesEntries(req.session.data)
}

function savePackagingFormData (req) {
  const packagingFields = req.session.data.packagingFields || []

  if (!req.session.data.packaging) {
    req.session.data.packaging = buildEmptyFieldValues(packagingFields)
  }

  packagingFields.forEach((field) => {
    const fieldKey = `packaging-${field.id}`

    if (req.body[fieldKey] !== undefined) {
      req.session.data.packaging[field.id] = req.body[fieldKey]
    }
  })
}

function syncCommoditySession (sessionData, commodity) {
  sessionData.selectedSpecies = normalizeSelectedSpecies(sessionData.selectedSpecies)

  sessionData.commodityId = commodity.id
  sessionData.commodityCode = commodity.code
  sessionData.commodityName = commodity.name
  sessionData.identifierFields = getIdentifierFields(commodity.id)
  sessionData.packagingFields = getPackagingFields(commodity.id)
  sessionData.certificationPurposeOptions = getCertificationPurposeOptions(commodity.id)
  sessionData.packaging = buildEmptyFieldValues(getPackagingFields(commodity.id))
  sessionData.certificationPurpose = null
  sessionData.unweanedAnimals = null
  sessionData.temperature = null
  sessionData.cphNumber = null
  sessionData.importReason = null
  sessionData.animalsAdded = false
  sessionData.animals = []
  sessionData.animalCountInput = null
  sessionData.animalCount = null
  initialiseSpeciesEntries(sessionData)
}

router.get('/what-are-you-importing', (req, res) => {
  return res.render('what-are-you-importing', {
    importCategoryItems: buildImportCategoryItems(req.session.data.importCategory)
  })
})

router.post('/what-are-you-importing', (req, res) => {
  const importCategory = (req.body.importCategory || '').trim()
  const allowedCategories = getAllowedImportCategories()

  if (!importCategory || !allowedCategories.includes(importCategory)) {
    req.session.data.errorList = [
      {
        text: 'Select what you are importing',
        href: '#import-category'
      }
    ]
    req.session.data.errors = {
      importCategory: {
        text: 'Select what you are importing'
      }
    }

    return res.render('what-are-you-importing', {
      importCategoryItems: buildImportCategoryItems(importCategory)
    })
  }

  const previousCategory = req.session.data.importCategory

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.importCategory = importCategory

  if (previousCategory !== importCategory) {
    clearCommoditySession(req.session.data)
    clearOriginSession(req.session.data)
  }

  return res.redirect('/origin-of-the-import')
})

router.get('/origin-of-the-import', (req, res) => {
  if (redirectIfNoImportCategory(req, res)) {
    return
  }

  const internalReference = req.session.data.internalReference
  const displayReference = internalReference && internalReference.trim() ? internalReference.trim() : ''

  const countryOfOrigin = req.session.data.countryOfOrigin

  return res.render('origin-of-the-import', {
    backLink: getBackLink(req, '/what-are-you-importing'),
    countriesJson: JSON.stringify(countries),
    countryPrefixesJson: JSON.stringify(countryRegionPrefixes),
    regionOfOriginCodePrefix: getCountryRegionPrefix(countryOfOrigin),
    regionOfOriginCodeSuffix: getRegionOfOriginCodeSuffix(req.session.data),
    internalReference: displayReference
  })
})

router.post('/origin-of-the-import', (req, res) => {
  if (redirectIfNoImportCategory(req, res)) {
    return
  }

  const countryOfOrigin = (req.body.countryOfOrigin || '').trim()
  const regionOfOriginRequired = (req.body.regionOfOriginRequired || '').trim()
  const regionOfOriginCodeSuffix = (req.body.regionOfOriginCodeSuffix || '').trim().toUpperCase()
  const internalReference = (req.body.internalReference || '').trim()
  const errors = {}
  const errorList = []

  if (!countryOfOrigin || !countries.includes(countryOfOrigin)) {
    errors.countryOfOrigin = { text: 'Select a country of origin' }
    errorList.push({ text: 'Select a country of origin', href: '#country-of-origin' })
  }

  if (regionOfOriginRequired !== 'Yes' && regionOfOriginRequired !== 'No') {
    errors.regionOfOriginRequired = { text: 'Select whether the consignment requires a region of origin code' }
    errorList.push({
      text: 'Select whether the consignment requires a region of origin code',
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

    return res.render('origin-of-the-import', {
      backLink: getBackLink(req, '/what-are-you-importing'),
      countriesJson: JSON.stringify(countries),
      countryPrefixesJson: JSON.stringify(countryRegionPrefixes),
      regionOfOriginCodePrefix: getCountryRegionPrefix(countryOfOrigin),
      regionOfOriginCodeSuffix,
      internalReference
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.countryOfOrigin = countryOfOrigin
  req.session.data.regionOfOriginRequired = regionOfOriginRequired
  req.session.data.internalReference = internalReference || 'N/A'

  if (regionOfOriginRequired === 'Yes') {
    req.session.data.regionOfOriginCode = formatRegionOfOriginCode(countryOfOrigin, regionOfOriginCodeSuffix)
    req.session.data.regionOfOriginCodeSuffix = regionOfOriginCodeSuffix
  } else {
    req.session.data.regionOfOriginCode = null
    req.session.data.regionOfOriginCodeSuffix = null
  }

  if (req.session.data.importCategory === 'Live animals') {
    return res.redirect('/select-commodity')
  }

  return res.redirect('/import-category-not-available')
})

router.get('/select-commodity', (req, res) => {
  if (redirectIfNoLiveAnimalsCategory(req, res)) {
    return
  }

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  if (req.query.change === 'species') {
    resetCommoditySelectionSession(req.session.data)
  }

  return res.render('select-commodity', {
    commoditySelectionsJson: JSON.stringify(getInitialCommoditySelections(req.session.data))
  })
})

router.post('/select-commodity', (req, res) => {
  if (redirectIfNoLiveAnimalsCategory(req, res)) {
    return
  }

  if (redirectIfNoOrigin(req, res)) {
    return
  }

  const commoditySelections = parseCommoditySelections(req.body.commoditySelections)
  const commodityId = req.body.commodityId
  const commodityCode = req.body.commodityCode
  const selectedSpecies = normalizeSelectedSpecies(req.body.selectedSpecies)

  if (!commoditySelections.length) {
    req.session.data.commoditySelections = []
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
    return res.redirect('/select-commodity')
  }

  const commodity = getCommodityById(commodityId) || getCommodityByCode(commodityCode)

  if (!commodity) {
    req.session.data.commoditySelections = commoditySelections
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
    return res.redirect('/select-commodity')
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.commoditySelections = commoditySelections
  req.session.data.selectedSpecies = selectedSpecies
  syncCommoditySession(req.session.data, commodity)

  res.redirect('/animal-identification-details')
})

router.get('/animal-identification-details', (req, res) => {
  if (redirectIfNoCommodity(req, res)) {
    return
  }

  const commodity = getCommodityById(req.session.data.commodityId)

  if (commodity) {
    req.session.data.identifierFields = getIdentifierFields(commodity.id)
    req.session.data.packagingFields = getPackagingFields(commodity.id)
    req.session.data.certificationPurposeOptions = getCertificationPurposeOptions(commodity.id)

    if (!req.session.data.packaging) {
      req.session.data.packaging = buildEmptyFieldValues(getPackagingFields(commodity.id))
    }

    initialiseSpeciesEntries(req.session.data)
  }

  const speciesEntries = req.session.data.speciesEntries || []
  const hasPackagingFields = (req.session.data.packagingFields || []).length > 0
  const firstExpandedEntry = speciesEntries.find((entry) => entry.animalsAdded)

  res.render('animal-identification-details', {
    showSpeciesPackaging: Boolean(firstExpandedEntry && hasPackagingFields),
    packagingPanelSpeciesId: firstExpandedEntry ? firstExpandedEntry.speciesId : null
  })
})

router.get('/additional-animal-details', (req, res) => {
  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (!req.session.data.animalsAdded || !req.session.data.animals || req.session.data.animals.length === 0) {
    return res.redirect('/animal-identification-details')
  }

  const config = getAdditionalAnimalDetailsConfig(req.session.data)

  res.render('additional-animal-details', {
    backLink: getBackLink(req, '/animal-identification-details'),
    showCertificationPurposeQuestion: config.hasCertificationPurposeQuestion,
    showUnweanedQuestion: config.hasUnweanedQuestion,
    showTemperatureQuestion: config.hasTemperatureQuestion,
    certificationPurposeItems: buildCertificationPurposeItems(config.certificationPurposeOptions, req.session.data.certificationPurpose),
    unweanedItems: buildSimpleRadioItems(config.unweanedOptions, req.session.data.unweanedAnimals),
    temperatureItems: buildSimpleRadioItems(config.temperatureOptions, req.session.data.temperature)
  })
})

router.get('/commodity-hub', (req, res) => {
  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (!req.session.data.animalsAdded || !req.session.data.animals || req.session.data.animals.length === 0) {
    return res.redirect('/animal-identification-details')
  }

  if (!hasAdditionalAnimalDetailsComplete(req.session.data)) {
    return res.redirect('/additional-animal-details')
  }

  initialiseSpeciesEntries(req.session.data)

  res.render('commodity-hub', {
    ...getCommodityHubViewModel(req.session.data),
    backLink: getBackLink(req, '/additional-animal-details')
  })
})

router.post('/animal-identification-details', (req, res) => {
  if (redirectIfNoCommodity(req, res)) {
    return
  }

  const action = req.body.action
  const identifierFields = req.session.data.identifierFields || []
  const packagingFields = req.session.data.packagingFields || []

  initialiseSpeciesEntries(req.session.data)

  if ((req.session.data.speciesEntries || []).some((entry) => entry.animalsAdded)) {
    saveAnimalFormData(req)
    savePackagingFormData(req)
  }

  if (action && action.startsWith('add-')) {
    const speciesId = action.slice(4)
    const entry = getSpeciesEntry(req.session.data, speciesId)
    const animalCount = (req.body[`animalCount-${speciesId}`] || '').trim()
    const fieldId = `animal-count-${speciesId}`

    if (!entry) {
      return res.redirect('/animal-identification-details')
    }

    if (!animalCount || Number(animalCount) < 1) {
      req.session.data.errorList = [
        {
          text: 'Enter the number of animals',
          href: `#${fieldId}`
        }
      ]
      req.session.data.errors = {
        [`animalCount-${speciesId}`]: {
          text: 'Enter the number of animals'
        }
      }
      return res.redirect('/animal-identification-details')
    }

    req.session.data.errorList = null
    req.session.data.errors = null
    entry.animalCountInput = animalCount
    entry.animalCount = animalCount
    entry.animalsAdded = true
    entry.animals = buildAnimalsList(entry.label, animalCount, identifierFields, [])

    if (!req.session.data.packaging) {
      req.session.data.packaging = buildEmptyFieldValues(packagingFields)
    }

    syncAggregateAnimalsFromSpeciesEntries(req.session.data)

    return res.redirect('/animal-identification-details')
  }

  if (action && action.startsWith('change-')) {
    const speciesId = action.slice(7)
    const entry = getSpeciesEntry(req.session.data, speciesId)

    if (entry) {
      entry.animalsAdded = false
      entry.animalCountInput = entry.animalCount || '1'
    }

    req.session.data.errorList = null
    req.session.data.errors = null
    syncAggregateAnimalsFromSpeciesEntries(req.session.data)

    return res.redirect('/animal-identification-details')
  }

  const removeMatch = action && action.match(/^remove-(.+)--(\d+)$/)

  if (removeMatch) {
    const speciesId = removeMatch[1]
    const removeId = parseInt(removeMatch[2], 10)
    const entry = getSpeciesEntry(req.session.data, speciesId)

    if (entry) {
      let animals = (entry.animals || []).filter((animal) => animal.id !== removeId)

      if (animals.length === 0) {
        entry.animalsAdded = false
        entry.animals = []
        entry.animalCount = null
        entry.animalCountInput = '1'
      } else {
        animals = renumberAnimals(animals, entry.label)
        entry.animals = animals
        entry.animalCount = String(animals.length)
        entry.animalCountInput = String(animals.length)
      }
    }

    syncAggregateAnimalsFromSpeciesEntries(req.session.data)

    return res.redirect('/animal-identification-details')
  }

  if (action === 'continue') {
    if (!hasAllSpeciesAnimalsComplete(req.session.data)) {
      const firstIncomplete = (req.session.data.speciesEntries || []).find((entry) =>
        !entry.animalsAdded || !entry.animals || entry.animals.length === 0
      )
      const errorHref = firstIncomplete
        ? `#animal-count-${firstIncomplete.speciesId}`
        : '#species-panels'

      req.session.data.errorList = [
        {
          text: 'Add the number of animals for each species before continuing',
          href: errorHref
        }
      ]
      req.session.data.errors = firstIncomplete
        ? {
            [`animalCount-${firstIncomplete.speciesId}`]: {
              text: 'Add the number of animals before continuing'
            }
          }
        : {}

      return res.redirect('/animal-identification-details')
    }

    req.session.data.errorList = null
    req.session.data.errors = null
    syncAggregateAnimalsFromSpeciesEntries(req.session.data)

    return res.redirect('/additional-animal-details')
  }

  res.redirect('/animal-identification-details')
})

router.post('/additional-animal-details', (req, res) => {
  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (!req.session.data.animalsAdded || !req.session.data.animals || req.session.data.animals.length === 0) {
    return res.redirect('/animal-identification-details')
  }

  const config = getAdditionalAnimalDetailsConfig(req.session.data)
  const certificationPurpose = (req.body.certificationPurpose || '').trim()
  const unweanedAnimals = (req.body.unweanedAnimals || '').trim()
  const temperature = (req.body.temperature || '').trim()
  const errorList = []
  const errors = {}

  if (config.hasCertificationPurposeQuestion && !config.certificationPurposeOptions.includes(certificationPurpose)) {
    errorList.push({
      text: 'Select what the animals are certified for',
      href: '#certification-purpose'
    })
    errors.certificationPurpose = {
      text: 'Select what the animals are certified for'
    }
  }

  if (config.hasUnweanedQuestion && !config.unweanedOptions.includes(unweanedAnimals)) {
    errorList.push({
      text: 'Select whether the consignment contains any unweaned animals',
      href: '#unweaned-animals'
    })
    errors.unweanedAnimals = {
      text: 'Select whether the consignment contains any unweaned animals'
    }
  }

  if (config.hasTemperatureQuestion && !config.temperatureOptions.includes(temperature)) {
    errorList.push({
      text: 'Select the temperature',
      href: '#temperature'
    })
    errors.temperature = {
      text: 'Select the temperature'
    }
  }

  if (errorList.length > 0) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors

    return res.redirect('/additional-animal-details')
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.certificationPurpose = config.hasCertificationPurposeQuestion ? certificationPurpose : null
  req.session.data.unweanedAnimals = config.hasUnweanedQuestion ? unweanedAnimals : null
  req.session.data.temperature = config.hasTemperatureQuestion ? temperature : null

  return res.redirect('/commodity-hub')
})

router.get('/county-parish-holding', (req, res) => {
  if (redirectIfNoAddressSectionAccess(req, res)) {
    return
  }

  if (!commodityRequiresCph(req.session.data)) {
    return res.redirect('/consignment-addresses')
  }

  return res.render('county-parish-holding', {
    backLink: '/consignment-addresses'
  })
})

router.post('/county-parish-holding', (req, res) => {
  if (redirectIfNoAddressSectionAccess(req, res)) {
    return
  }

  if (!commodityRequiresCph(req.session.data)) {
    return res.redirect('/consignment-addresses')
  }

  const cphNumber = (req.body.cphNumber || '').trim()

  if (!cphNumber) {
    req.session.data.errorList = [
      {
        text: 'Enter the County Parish Holding number (CPH)',
        href: '#cph-number'
      }
    ]
    req.session.data.errors = {
      cphNumber: {
        text: 'Enter the County Parish Holding number (CPH)'
      }
    }

    return res.redirect('/county-parish-holding')
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.cphNumber = cphNumber

  return res.redirect('/consignment-addresses')
})

router.get('/reason-for-import', (req, res) => {
  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (!req.session.data.animalsAdded || !req.session.data.animals || req.session.data.animals.length === 0) {
    return res.redirect('/animal-identification-details')
  }

  if (!hasAdditionalAnimalDetailsComplete(req.session.data)) {
    return res.redirect('/additional-animal-details')
  }

  res.render('reason-for-import', {
    backLink: getBackLink(req, '/commodity-hub'),
    importReasonItems: buildImportReasonItems(req.session.data, req.session.data.importReason)
  })
})

router.get('/notification-tasklist', (req, res) => {
  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (!req.session.data.animalsAdded || !req.session.data.animals || req.session.data.animals.length === 0) {
    return res.redirect('/animal-identification-details')
  }

  if (!hasAdditionalAnimalDetailsComplete(req.session.data)) {
    return res.redirect('/additional-animal-details')
  }

  if (!hasValidImportReason(req.session.data)) {
    return res.redirect('/reason-for-import')
  }

  return res.render('notification-tasklist', getNotificationTasklistViewModel(req.session.data))
})

router.get('/check-answers-and-submit', (req, res) => {
  if (redirectIfCannotAccessCheckAnswers(req, res)) {
    return
  }

  return res.render('check-answers-and-submit', {
    ...getReviewNotificationViewModel(req.session.data),
    backLink: getBackLink(req, '/notification-tasklist')
  })
})

function generateNotificationReference () {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '0123456789'
  const pick = (chars, count) => {
    let result = ''

    for (let index = 0; index < count; index += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return result
  }

  return pick(letters, 3) + pick(digits, 4) + pick(letters, 1)
}

function redirectIfNotificationNotSubmitted (req, res) {
  if (req.session.data.declarationConfirmed !== 'yes' || !req.session.data.notificationReference) {
    res.redirect('/declaration')
    return true
  }

  return false
}

function redirectIfCannotAccessCheckAnswers (req, res) {
  if (redirectIfNoCommodity(req, res)) {
    return true
  }

  if (!req.session.data.animalsAdded || !req.session.data.animals || req.session.data.animals.length === 0) {
    res.redirect('/animal-identification-details')
    return true
  }

  if (!hasAdditionalAnimalDetailsComplete(req.session.data)) {
    res.redirect('/additional-animal-details')
    return true
  }

  if (!hasValidImportReason(req.session.data)) {
    res.redirect('/reason-for-import')
    return true
  }

  return false
}

router.get('/declaration', (req, res) => {
  if (req.session.data.notificationSubmitted && req.session.data.notificationReference) {
    return res.redirect('/notification-submitted')
  }

  if (redirectIfCannotAccessCheckAnswers(req, res)) {
    return
  }

  getDeclarationDate(req.session.data)

  return res.render('declaration')
})

router.post('/declaration', (req, res) => {
  if (redirectIfCannotAccessCheckAnswers(req, res)) {
    return
  }

  if (!getDeclarationConfirmedFromBody(req.body)) {
    req.session.data.errorList = [
      {
        text: 'Confirm the declaration to continue',
        href: '#declaration-confirmed'
      }
    ]
    req.session.data.errors = {
      declarationConfirmed: {
        text: 'Confirm the declaration to continue'
      }
    }
    req.session.data.declarationConfirmed = null
    getDeclarationDate(req.session.data)

    return res.redirect('/declaration')
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.declarationConfirmed = 'yes'
  req.session.data.declarationDate = getDeclarationDate(req.session.data)

  if (!req.session.data.notificationReference) {
    req.session.data.notificationReference = generateNotificationReference()
  }

  req.session.data.notificationSubmitted = true

  return res.redirect('/notification-submitted')
})

router.get('/notification-submitted', (req, res) => {
  if (redirectIfNotificationNotSubmitted(req, res)) {
    return
  }

  return res.render('notification-submitted')
})

router.get('/consignment-addresses', (req, res) => {
  if (redirectIfNoAddressSectionAccess(req, res)) {
    return
  }

  return res.render('consignment-addresses', getConsignmentAddressesViewModel(req))
})

router.get('/arrival-details', (req, res) => {
  if (redirectIfNoMovementTaskAccess(req, res)) {
    return
  }

  return res.render('arrival-details', {
    backLink: getBackLink(req, '/notification-tasklist'),
    ukAirportItemsJson: JSON.stringify(getUkAirportDisplayOptions()),
    meansOfTransportItems: buildMeansOfTransportItems(req.session.data.meansOfTransport)
  })
})

router.post('/arrival-details', (req, res) => {
  if (redirectIfNoMovementTaskAccess(req, res)) {
    return
  }

  const portOfEntry = (req.body.portOfEntry || '').trim()
  const meansOfTransport = (req.body.meansOfTransport || '').trim()
  const transportIdentification = (req.body.transportIdentification || '').trim()
  const transportDocumentReference = (req.body.transportDocumentReference || '').trim()
  const arrivalDateDay = (req.body['arrivalDate-day'] || req.body.arrivalDateDay || '').trim()
  const arrivalDateMonth = (req.body['arrivalDate-month'] || req.body.arrivalDateMonth || '').trim()
  const arrivalDateYear = (req.body['arrivalDate-year'] || req.body.arrivalDateYear || '').trim()
  const errorList = []
  const errors = {}

  if (!portOfEntry) {
    errors.portOfEntry = { text: 'Enter the port of entry' }
    errorList.push({ text: 'Enter the port of entry', href: '#port-of-entry' })
  } else if (!isValidPortOfEntry(portOfEntry)) {
    errors.portOfEntry = { text: 'Select a port of entry from the search results' }
    errorList.push({ text: 'Select a port of entry from the search results', href: '#port-of-entry' })
  }

  if (!arrivalDateDay || !arrivalDateMonth || !arrivalDateYear) {
    errors.arrivalDate = { text: 'Enter the arrival date at destination' }
    errorList.push({ text: 'Enter the arrival date at destination', href: '#arrival-date-day' })
  }

  if (!meansOfTransport) {
    errors.meansOfTransport = { text: 'Select the means of transport' }
    errorList.push({ text: 'Select the means of transport', href: '#means-of-transport' })
  } else if (!meansOfTransportOptions.includes(meansOfTransport)) {
    errors.meansOfTransport = { text: 'Select the means of transport' }
    errorList.push({ text: 'Select the means of transport', href: '#means-of-transport' })
  }

  if (!transportIdentification) {
    errors.transportIdentification = { text: 'Enter the transport identification' }
    errorList.push({ text: 'Enter the transport identification', href: '#transport-identification' })
  }

  if (!transportDocumentReference) {
    errors.transportDocumentReference = { text: 'Enter the transport document reference' }
    errorList.push({ text: 'Enter the transport document reference', href: '#transport-document-reference' })
  }

  if (errorList.length > 0) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors
    req.session.data.portOfEntry = portOfEntry
    req.session.data.meansOfTransport = meansOfTransport
    req.session.data.transportIdentification = transportIdentification
    req.session.data.transportDocumentReference = transportDocumentReference
    req.session.data.arrivalDateDay = arrivalDateDay
    req.session.data.arrivalDateMonth = arrivalDateMonth
    req.session.data.arrivalDateYear = arrivalDateYear
    return res.render('arrival-details', {
      backLink: getBackLink(req, '/notification-tasklist'),
      ukAirportItemsJson: JSON.stringify(getUkAirportDisplayOptions()),
      meansOfTransportItems: buildMeansOfTransportItems(meansOfTransport)
    })
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.portOfEntry = portOfEntry
  req.session.data.meansOfTransport = meansOfTransport
  req.session.data.transportIdentification = transportIdentification
  req.session.data.transportDocumentReference = transportDocumentReference
  req.session.data.arrivalDateDay = arrivalDateDay
  req.session.data.arrivalDateMonth = arrivalDateMonth
  req.session.data.arrivalDateYear = arrivalDateYear

  return res.redirect('/notification-tasklist')
})

router.get('/transport-details', (req, res) => {
  if (redirectIfNoMovementTaskAccess(req, res)) {
    return
  }

  return res.render('transport-details', {
    backLink: getBackLink(req, '/notification-tasklist'),
    transporters
  })
})

router.post('/transport-details', (req, res) => {
  if (redirectIfNoMovementTaskAccess(req, res)) {
    return
  }

  const transporterSearch = (req.body.transporterSearch || '').trim()
  const transporterId = (req.body.transporterId || '').trim()
  const transporter = getTransporterById(transporterId)

  if (!transporter) {
    req.session.data.errorList = [
      {
        text: 'Select a transporter',
        href: `#transporter-${transporters[0].id}`
      }
    ]
    req.session.data.errors = {
      transporterId: {
        text: 'Select a transporter'
      }
    }
    req.session.data.transporterSearch = transporterSearch
    req.session.data.transporterId = null

    return res.redirect('/transport-details')
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.transporterSearch = transporterSearch
  syncTransporterSession(req.session.data, transporter)

  return res.redirect('/notification-tasklist')
})

router.post('/consignment-addresses', (req, res) => {
  if (redirectIfNoAddressSectionAccess(req, res)) {
    return
  }

  const errorList = []
  const errors = {}

  if (commodityRequiresCph(req.session.data) && !hasCphDetails(req.session.data)) {
    errorList.push({
      text: 'Add the County Parish Holding number (CPH)',
      href: '#cph-number-link'
    })
    errors.cphNumber = {
      text: 'Add the County Parish Holding number (CPH)'
    }
  }

  if (!hasAllConsignmentAddressFields(req.session.data)) {
    errorList.push({
      text: 'Add all consignment addresses before continuing',
      href: '#place-of-origin-link'
    })
    errors.consignmentAddresses = {
      text: 'Add all consignment addresses before continuing'
    }
  }

  if (errorList.length > 0) {
    req.session.data.errorList = errorList
    req.session.data.errors = errors
    return res.redirect('/consignment-addresses')
  }

  req.session.data.errorList = null
  req.session.data.errors = null

  return res.redirect('/contact-address-for-consignment')
})

router.get('/contact-address-for-consignment', (req, res) => {
  if (redirectIfNoAddressSectionAccess(req, res)) {
    return
  }

  return res.render('contact-address-for-consignment', {
    backLink: getBackLink(req, '/consignment-addresses'),
    addresses: contactAddresses,
    addressId: req.session.data.contactAddressId || '',
    addressSearch: req.session.data.contactAddressSearch || ''
  })
})

router.post('/contact-address-for-consignment', (req, res) => {
  if (redirectIfNoAddressSectionAccess(req, res)) {
    return
  }

  const addressSearch = (req.body.addressSearch || '').trim()
  const addressId = (req.body.addressId || '').trim()
  const address = getContactAddressById(addressId)

  if (!address) {
    req.session.data.errorList = [
      {
        text: 'Select an address',
        href: `#address-${contactAddresses[0].id}`
      }
    ]
    req.session.data.errors = {
      addressId: {
        text: 'Select an address'
      }
    }
    req.session.data.contactAddressSearch = addressSearch
    clearContactAddressSession(req.session.data)

    return res.redirect('/contact-address-for-consignment')
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.contactAddressSearch = addressSearch
  syncContactAddressSession(req.session.data, address)

  return res.redirect('/notification-tasklist')
})

router.get('/consignment-addresses/add/:addressType', (req, res) => {
  if (redirectIfNoAddressSectionAccess(req, res)) {
    return
  }

  const config = getConsignmentAddressConfig(req.params.addressType)

  if (!config) {
    return res.redirect('/consignment-addresses')
  }

  const addressList = getConsignmentAddressList(req.params.addressType)

  return res.render('consignment-address-entry', {
    addressType: req.params.addressType,
    heading: config.heading,
    hint: config.hint,
    addresses: addressList,
    addressId: req.session.data[config.addressIdKey] || '',
    addressSearch: req.session.data[config.searchKey] || ''
  })
})

router.post('/consignment-addresses/add/:addressType', (req, res) => {
  if (redirectIfNoAddressSectionAccess(req, res)) {
    return
  }

  const config = getConsignmentAddressConfig(req.params.addressType)

  if (!config) {
    return res.redirect('/consignment-addresses')
  }

  const addressSearch = (req.body.addressSearch || '').trim()
  const addressId = (req.body.addressId || '').trim()
  const addressList = getConsignmentAddressList(req.params.addressType)
  const address = getTraderAddressById(addressId, req.params.addressType)

  if (!address) {
    req.session.data.errorList = [
      {
        text: 'Select an address',
        href: `#address-${addressList[0].id}`
      }
    ]
    req.session.data.errors = {
      addressId: {
        text: 'Select an address'
      }
    }
    req.session.data[config.searchKey] = addressSearch
    clearConsignmentAddressSession(req.session.data, config)

    return res.redirect(`/consignment-addresses/add/${req.params.addressType}`)
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data[config.searchKey] = addressSearch
  syncConsignmentAddressSession(req.session.data, config, address)

  return res.redirect('/consignment-addresses')
})

router.post('/commodity-hub', (req, res) => {
  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (!req.session.data.animalsAdded || !req.session.data.animals || req.session.data.animals.length === 0) {
    return res.redirect('/animal-identification-details')
  }

  if (!hasAdditionalAnimalDetailsComplete(req.session.data)) {
    return res.redirect('/additional-animal-details')
  }

  return res.redirect('/reason-for-import')
})

router.post('/reason-for-import', (req, res) => {
  if (redirectIfNoCommodity(req, res)) {
    return
  }

  if (!req.session.data.animalsAdded || !req.session.data.animals || req.session.data.animals.length === 0) {
    return res.redirect('/animal-identification-details')
  }

  if (!hasAdditionalAnimalDetailsComplete(req.session.data)) {
    return res.redirect('/additional-animal-details')
  }

  const importReason = (req.body.importReason || '').trim()
  const allowedReasons = getAllowedImportReasons(req.session.data)

  if (!importReason || !allowedReasons.includes(importReason)) {
    req.session.data.errorList = [
      {
        text: 'Select the main reason for importing the animals',
        href: '#import-reason'
      }
    ]
    req.session.data.errors = {
      importReason: {
        text: 'Select the main reason for importing the animals'
      }
    }

    return res.redirect('/reason-for-import')
  }

  req.session.data.errorList = null
  req.session.data.errors = null
  req.session.data.importReason = importReason

  return res.redirect('/notification-tasklist')
})

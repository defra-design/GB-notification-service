const consignmentAddresses = require('./consignment-addresses')
const contactAddresses = require('./contact-addresses')
const transporters = require('./transporters')
const { buildManualFieldsFromAddress } = require('./address-book-lookup-addresses')
const addressBookAddressTypes = require('./address-book-address-types')

const ADDRESS_TYPE_LABELS = {
  'place-of-origin': 'Place of origin',
  consignor: 'Consignor',
  'consignor-or-exporter': 'Consignor',
  consignee: 'Consignee',
  importer: 'Importer',
  'place-of-destination': 'Place of destination',
  transporter: 'Transporter',
  'branch-address': 'Branch',
  contact: 'Contact address',
  exporter: 'Consignor',
  packer: 'Packer'
}

const ADDRESS_CATEGORIES = {
  'origin-and-consignor': {
    id: 'origin-and-consignor',
    label: 'Origin and Consignor',
    heading: 'Origin and Consignor addresses',
    types: [
      'place-of-origin',
      'consignor',
      'consignor-or-exporter',
      'exporter'
    ]
  },
  'destination-consignee-importer': {
    id: 'destination-consignee-importer',
    label: 'Destination, Consignee and Importer',
    heading: 'Destination, Consignee and Importer addresses',
    types: [
      'consignee',
      'importer',
      'place-of-destination',
      'contact',
      'packer'
    ]
  },
  transporter: {
    id: 'transporter',
    label: 'Transporter',
    heading: 'Transporter addresses',
    types: ['transporter']
  },
  branch: {
    id: 'branch',
    label: 'Branch',
    heading: 'Branch addresses',
    types: ['branch-address']
  }
}

const ADDRESS_TYPE_OPTIONS = [
  { value: '', text: 'Select one' },
  ...addressBookAddressTypes
    .filter((item) => !item.divider)
    .map((item) => ({
      value: item.value,
      text: item.text
    }))
]

function getAddressCategoryId (type) {
  const normalisedType = String(type || '').trim()

  return Object.keys(ADDRESS_CATEGORIES).find((categoryId) =>
    ADDRESS_CATEGORIES[categoryId].types.includes(normalisedType)
  ) || 'origin-and-consignor'
}

function getAddressTypes (address) {
  if (Array.isArray(address.types) && address.types.length) {
    return address.types
  }

  return [address.type].filter(Boolean)
}

function getAddressCategoryIds (address) {
  return [...new Set(getAddressTypes(address).map((type) => getAddressCategoryId(type)))]
}

function addressBelongsToCategory (address, categoryId) {
  if (!categoryId) {
    return true
  }

  const categoryTypes = ADDRESS_CATEGORIES[categoryId]?.types || []

  return getAddressTypes(address).some((type) => categoryTypes.includes(type))
}

function formatAddressLines (addressLines) {
  return (addressLines || []).join(', ')
}

function splitNameLines (name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)

  if (parts.length <= 1) {
    return parts.length ? parts : ['']
  }

  return [parts[0], parts.slice(1).join(' ')]
}

function splitAddressLines (address) {
  return String(address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function buildSearchText (parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function mapAddress (address, type, typeLabel, index = 0, types = null) {
  const addressLines = address.addressLines || []
  const formattedAddress = address.address || formatAddressLines(addressLines)
  const addressTypes = types && types.length
    ? types
    : getAddressTypes(address)
  const typeLabels = addressTypes.map((item) => ADDRESS_TYPE_LABELS[item] || item)
  const displayTypeLabel = typeLabel || typeLabels.join(', ')
  const primaryType = addressTypes[0] || type
  const details = address.details || buildManualFieldsFromAddress({
    name: address.name,
    addressLines: addressLines.length ? addressLines : [formattedAddress],
    country: address.country,
    email: address.email,
    telephone: address.telephone || address.phone
  }, index)

  return {
    id: address.id,
    name: address.name,
    nameLines: splitNameLines(address.name),
    type: primaryType,
    types: addressTypes,
    typeLabels,
    typeLabel: displayTypeLabel,
    category: getAddressCategoryId(primaryType),
    categoryIds: getAddressCategoryIds({ types: addressTypes, type: primaryType }),
    address: formattedAddress,
    addressLines: addressLines.length ? addressLines : splitAddressLines(formattedAddress),
    approvalNumber: address.approvalNumber || '',
    country: address.country,
    details,
    searchText: buildSearchText([
      address.name,
      displayTypeLabel,
      ...typeLabels,
      formattedAddress,
      address.approvalNumber,
      address.country
    ])
  }
}

function mapTransporter (transporter) {
  const addressLines = splitAddressLines(transporter.address)
  const typeLabel = transporter.type || 'Commercial'

  return {
    id: transporter.id,
    name: transporter.name,
    nameLines: splitNameLines(transporter.name),
    type: 'transporter',
    typeLabel,
    category: 'transporter',
    address: transporter.address,
    addressLines,
    approvalNumber: transporter.approvalNumber || '',
    country: addressLines[addressLines.length - 1] || '',
    details: buildManualFieldsFromAddress({
      name: transporter.name,
      addressLines,
      country: '',
      email: '',
      telephone: transporter.telephone || ''
    }, 0),
    searchText: buildSearchText([
      transporter.name,
      typeLabel,
      transporter.address,
      transporter.approvalNumber
    ])
  }
}

const mappedConsignmentAddresses = consignmentAddresses.map((address) =>
  mapAddress(address, address.type, ADDRESS_TYPE_LABELS[address.type] || address.type)
)

const mappedContactAddresses = contactAddresses.map((address) =>
  mapAddress(address, 'contact', ADDRESS_TYPE_LABELS.contact)
)

const mappedTransporters = transporters.map(mapTransporter)

const prototypeTemplates = [
  {
    name: 'Acorn Farm',
    type: 'importer',
    addressLines: ['Urban Farm', 'Acorn Venture, Depot Rd', 'Kirkby, Liverpool, L33 3AR'],
    country: 'United Kingdom',
    email: 'contact@acornfarm.co.uk',
    telephone: '+44 151 555 0100'
  },
  {
    name: 'Green Valley Farm',
    type: 'place-of-origin',
    addressLines: ['Green Valley', 'Mill Lane', 'York YO1 2AB'],
    country: 'United Kingdom',
    email: 'info@greenvalleyfarm.co.uk',
    telephone: '+44 1904 555 0200'
  },
  {
    name: 'Northern Livestock Exports',
    type: 'consignor',
    addressLines: ['Unit 4', 'Harbour Road', 'Hull HU1 3ES'],
    country: 'United Kingdom',
    email: 'exports@northernlivestock.co.uk',
    telephone: '+44 1482 555 0300'
  },
  {
    name: 'Britannia Trade Livestock',
    type: 'consignee',
    addressLines: ['Trade Park', 'Station Road', 'Chester CH1 4AA'],
    country: 'United Kingdom',
    email: 'receiving@britanniatrade.co.uk',
    telephone: '+44 1244 555 0400'
  },
  {
    name: 'West Coast Animal Imports',
    type: 'place-of-destination',
    addressLines: ['Coastal Holding', 'Pier Way', 'Holyhead LL65 1AB'],
    country: 'United Kingdom',
    email: 'holdings@westcoastimports.co.uk',
    telephone: '+44 1407 555 0500'
  },
  {
    name: 'Defra Liverpool Branch',
    type: 'branch-address',
    addressLines: ['Government Buildings', 'Water Street', 'Liverpool L3 1AP'],
    country: 'United Kingdom',
    email: 'liverpool.branch@example.gov.uk',
    telephone: '+44 151 555 0800'
  },
  {
    name: 'Defra Manchester Branch',
    type: 'branch-address',
    addressLines: ['Piccadilly Gate', 'Store Street', 'Manchester M1 2WD'],
    country: 'United Kingdom',
    email: 'manchester.branch@example.gov.uk',
    telephone: '+44 161 555 0900'
  },
  {
    name: 'Defra Birmingham Branch',
    type: 'branch-address',
    addressLines: ['Alpha Tower, Suffolk Street, Birmingham B1 1TT'],
    country: 'United Kingdom',
    email: 'birmingham.branch@example.gov.uk',
    telephone: '+44 121 555 0910'
  }
]

const mixedTypeAddresses = [
  {
    id: 'mixed-green-valley-origin-consignor',
    name: 'Green Valley Farm',
    types: ['place-of-origin', 'consignor'],
    addressLines: ['Green Valley', 'Mill Lane', 'York YO1 2AB'],
    country: 'United Kingdom',
    email: 'info@greenvalleyfarm.co.uk',
    telephone: '+44 1904 555 0200'
  },
  {
    id: 'mixed-alpine-origin-consignor',
    name: 'Alpine Breeding Centre',
    types: ['place-of-origin', 'consignor-or-exporter'],
    addressLines: ['27 Feldstrasse', 'Salzburg, 5020'],
    country: 'Austria',
    email: 'origin@alpinebreeding.at',
    telephone: '+43 662 551902'
  },
  {
    id: 'mixed-nordic-origin-consignor',
    name: 'Nordic Livestock Export AB',
    types: ['consignor', 'place-of-origin'],
    addressLines: ['Västra Hamngatan 6', 'Floor 2', 'Gothenburg, 41117'],
    country: 'Sweden',
    email: 'exports@nordiclivestock.se',
    telephone: '+46 31 772 0041'
  },
  {
    id: 'mixed-northern-consignee-importer',
    name: 'Northern Livestock Imports Ltd',
    types: ['consignee', 'importer'],
    addressLines: ['Dockside Business Park', 'Warehouse 3', 'Hull, HU9 5PX'],
    country: 'United Kingdom',
    email: 'imports@northernlivestock.co.uk',
    telephone: '+44 1482 555921'
  },
  {
    id: 'mixed-britannia-consignee-importer-destination',
    name: 'Britannia Trade & Livestock Ltd',
    types: ['consignee', 'importer', 'place-of-destination'],
    addressLines: ['41 Commerce Way', 'Bristol, BS11 9DQ'],
    country: 'United Kingdom',
    email: 'importer@britanniatrade.co.uk',
    telephone: '+44 117 555 4402'
  },
  {
    id: 'mixed-riverside-destination-consignee',
    name: 'Riverside Holding Facility',
    types: ['place-of-destination', 'consignee'],
    addressLines: ['East Farm Road', 'Leeds, LS25 3EB'],
    country: 'United Kingdom',
    email: 'arrivals@riversideholding.co.uk',
    telephone: '+44 113 555 4477'
  }
]

const baseAddresses = [
  ...mappedConsignmentAddresses,
  ...mappedContactAddresses,
  ...mappedTransporters,
  ...mixedTypeAddresses.map((address, index) =>
    mapAddress(address, address.types[0], null, index, address.types)
  ),
  ...prototypeTemplates.map((address, index) => {
    const types = address.types || [address.type]

    return mapAddress({ ...address, id: `prototype-${index + 1}` }, types[0], null, index, types)
  })
]

const addresses = []

baseAddresses.forEach((address, index) => {
  const id = `${address.id}-${index}`

  addresses.push({
    ...address,
    id,
    viewHref: `/address-book/${id}`
  })
})

function createFilledAddress (type, duplicateIndex) {
  const sourceTemplate = prototypeTemplates.find((item) => item.type === type) || prototypeTemplates[0]
  const typeLabel = ADDRESS_TYPE_LABELS[type]
  const formattedAddress = formatAddressLines(sourceTemplate.addressLines)
  const id = `${sourceTemplate.name.toLowerCase().replace(/\s+/g, '-')}-${type}-duplicate-${duplicateIndex}`

  return {
    id,
    name: sourceTemplate.name,
    type,
    typeLabel,
    category: getAddressCategoryId(type),
    address: formattedAddress,
    country: sourceTemplate.country,
    details: buildManualFieldsFromAddress({
      name: sourceTemplate.name,
      addressLines: sourceTemplate.addressLines,
      country: sourceTemplate.country,
      email: sourceTemplate.email,
      telephone: sourceTemplate.telephone
    }, duplicateIndex),
    viewHref: `/address-book/${id}`,
    searchText: buildSearchText([
      sourceTemplate.name,
      typeLabel,
      formattedAddress,
      sourceTemplate.country,
      duplicateIndex
    ])
  }
}

function ensureCategoryCount (categoryId, minimumCount) {
  const categoryTypes = ADDRESS_CATEGORIES[categoryId].types
  let currentCount = addresses.filter((address) => addressBelongsToCategory(address, categoryId)).length
  let duplicateIndex = 1

  while (currentCount < minimumCount) {
    const type = categoryTypes[(duplicateIndex - 1) % categoryTypes.length]
    addresses.push(createFilledAddress(type, duplicateIndex))
    currentCount += 1
    duplicateIndex += 1
  }
}

ensureCategoryCount('origin-and-consignor', 16)
ensureCategoryCount('destination-consignee-importer', 16)
ensureCategoryCount('transporter', 8)
ensureCategoryCount('branch', 3)

module.exports = {
  pageSize: 8,
  types: ADDRESS_TYPE_OPTIONS,
  typeLabels: ADDRESS_TYPE_LABELS,
  categories: ADDRESS_CATEGORIES,
  getAddressCategoryId,
  getAddressCategoryIds,
  addressBelongsToCategory,
  addresses
}

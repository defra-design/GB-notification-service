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
  'branch-address': 'Branch address',
  contact: 'Contact address',
  exporter: 'Consignor',
  packer: 'Packer'
}

const ADDRESS_CATEGORIES = {
  'origin-and-sender': {
    id: 'origin-and-sender',
    label: 'Origin and sender',
    heading: 'Origin and sender addresses',
    types: [
      'place-of-origin',
      'consignor',
      'consignor-or-exporter',
      'exporter'
    ]
  },
  'destination-and-receiver': {
    id: 'destination-and-receiver',
    label: 'Destination and receiver',
    heading: 'Destination and receiver addresses',
    types: [
      'consignee',
      'importer',
      'place-of-destination',
      'branch-address',
      'contact',
      'packer'
    ]
  },
  transporter: {
    id: 'transporter',
    label: 'Transporter',
    heading: 'Transporter addresses',
    types: ['transporter']
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
  ) || 'origin-and-sender'
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

function mapAddress (address, type, typeLabel, index = 0) {
  const addressLines = address.addressLines || []
  const formattedAddress = address.address || formatAddressLines(addressLines)
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
    type,
    typeLabel,
    category: getAddressCategoryId(type),
    address: formattedAddress,
    addressLines: addressLines.length ? addressLines : splitAddressLines(formattedAddress),
    approvalNumber: address.approvalNumber || '',
    country: address.country,
    details,
    searchText: buildSearchText([
      address.name,
      typeLabel,
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
  }
]

const baseAddresses = [
  ...mappedConsignmentAddresses,
  ...mappedContactAddresses,
  ...mappedTransporters,
  ...prototypeTemplates.map((address, index) =>
    mapAddress({ ...address, id: `prototype-${index + 1}` }, address.type, ADDRESS_TYPE_LABELS[address.type])
  )
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
  let currentCount = addresses.filter((address) => address.category === categoryId).length
  let duplicateIndex = 1

  while (currentCount < minimumCount) {
    const type = categoryTypes[(duplicateIndex - 1) % categoryTypes.length]
    addresses.push(createFilledAddress(type, duplicateIndex))
    currentCount += 1
    duplicateIndex += 1
  }
}

ensureCategoryCount('origin-and-sender', 16)
ensureCategoryCount('destination-and-receiver', 16)
ensureCategoryCount('transporter', 8)

module.exports = {
  pageSize: 8,
  types: ADDRESS_TYPE_OPTIONS,
  typeLabels: ADDRESS_TYPE_LABELS,
  categories: ADDRESS_CATEGORIES,
  getAddressCategoryId,
  addresses
}

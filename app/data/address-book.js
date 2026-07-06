const consignmentAddresses = require('./consignment-addresses')
const contactAddresses = require('./contact-addresses')

const ADDRESS_TYPE_LABELS = {
  'place-of-origin': 'Place of origin',
  'consignor-or-exporter': 'Consignor',
  'consignee': 'Consignee',
  importer: 'Importer',
  'place-of-destination': 'Place of destination',
  contact: 'Contact address'
}

const ADDRESS_TYPE_OPTIONS = [
  { value: '', text: 'Select one' },
  ...Object.entries(ADDRESS_TYPE_LABELS).map(([value, text]) => ({ value, text }))
]

function formatAddressLines (addressLines) {
  return (addressLines || []).join(', ')
}

function buildSearchText (parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function mapAddress (address, type, typeLabel) {
  const formattedAddress = formatAddressLines(address.addressLines)

  return {
    id: address.id,
    name: address.name,
    type,
    typeLabel,
    address: formattedAddress,
    country: address.country,
    searchText: buildSearchText([address.name, typeLabel, formattedAddress, address.country])
  }
}

const mappedConsignmentAddresses = consignmentAddresses.map((address) =>
  mapAddress(address, address.type, ADDRESS_TYPE_LABELS[address.type])
)

const mappedContactAddresses = contactAddresses.map((address) =>
  mapAddress(address, 'contact', ADDRESS_TYPE_LABELS.contact)
)

const prototypeAddresses = [
  {
    id: 'acorn-farm-kirkby',
    name: 'Acorn Farm',
    type: 'importer',
    typeLabel: 'Importer',
    address: 'Urban Farm, Acorn Venture, Depot Rd, Kirkby, Liverpool L33 3AR',
    country: 'United Kingdom',
    searchText: buildSearchText([
      'Acorn Farm',
      'Importer',
      'Urban Farm, Acorn Venture, Depot Rd, Kirkby, Liverpool L33 3AR',
      'United Kingdom'
    ])
  }
]

const baseAddresses = [
  ...mappedConsignmentAddresses,
  ...mappedContactAddresses,
  ...prototypeAddresses
]

const addresses = []

baseAddresses.forEach((address, index) => {
  addresses.push({
    ...address,
    id: `${address.id}-${index}`
  })
})

while (addresses.length < 24) {
  const source = prototypeAddresses[0]
  const duplicateIndex = addresses.length + 1

  addresses.push({
    ...source,
    id: `${source.id}-duplicate-${duplicateIndex}`,
    searchText: buildSearchText([
      source.name,
      source.typeLabel,
      source.address,
      source.country,
      duplicateIndex
    ])
  })
}

module.exports = {
  pageSize: 8,
  types: ADDRESS_TYPE_OPTIONS,
  typeLabels: ADDRESS_TYPE_LABELS,
  addresses
}

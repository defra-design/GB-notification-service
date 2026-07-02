const consignmentAddressSections = [
  {
    id: 'place-of-origin',
    heading: 'Place of origin',
    hint: 'The address where the animals begin their journey to Great Britain',
    linkText: 'Add a place of origin',
    path: '/place-of-origin',
    sessionAddressKey: 'placeOfOriginAddress',
    sessionAddressIdKey: 'placeOfOriginAddressId',
    formFieldName: 'placeOfOriginAddressId',
    inputIdPrefix: 'place-of-origin-address',
    searchInputId: 'place-of-origin-search',
    selectable: true
  },
  {
    id: 'consignor-or-exporter',
    heading: 'Consignor',
    hint: 'This is the sender of the consignment.',
    linkText: 'Add a consignor',
    path: '/consignor-or-exporter',
    sessionAddressKey: 'consignorAddress',
    sessionAddressIdKey: 'consignorAddressId',
    formFieldName: 'consignorAddressId',
    inputIdPrefix: 'consignor-address',
    searchInputId: 'consignor-search',
    selectable: true
  },
  {
    id: 'consignee',
    heading: 'Consignee',
    hint: 'This is the receiver or buyer of the consignment being shipped or transported.',
    linkText: 'Add a consignee',
    path: '/consignee',
    sessionAddressKey: 'consigneeAddress',
    sessionAddressIdKey: 'consigneeAddressId',
    formFieldName: 'consigneeAddressId',
    inputIdPrefix: 'consignee-address',
    searchInputId: 'consignee-search',
    selectable: true
  },
  {
    id: 'importer',
    heading: 'Importer',
    hint: 'This is usually the same as the consignee. You can select a different person if needed.',
    linkText: 'Add an importer',
    path: '/importer',
    sessionAddressKey: 'importerAddress',
    sessionAddressIdKey: 'importerAddressId',
    formFieldName: 'importerAddressId',
    inputIdPrefix: 'importer-address',
    searchInputId: 'importer-search',
    selectable: true,
    canUseSameAsConsignee: true
  },
  {
    id: 'place-of-destination',
    heading: 'Place of destination',
    hint: 'This is where the animals will be unloaded and accommodated for at least 48 hours. If a health certificate is required, it will show this address.',
    linkText: 'Add a place of destination',
    path: '/place-of-destination',
    sessionAddressKey: 'placeOfDestinationAddress',
    sessionAddressIdKey: 'placeOfDestinationAddressId',
    formFieldName: 'placeOfDestinationAddressId',
    inputIdPrefix: 'place-of-destination-address',
    searchInputId: 'place-of-destination-search',
    selectable: true,
    canUseSameAsConsignee: true
  },
  {
    id: 'cph',
    heading: 'County Parish Holding number (CPH)',
    hint: 'The County Parish Holding (CPH) number identifies the holding where the animals will be kept.',
    linkText: 'Add a CPH number',
    path: '/cph-number',
    sessionCphKey: 'cphNumber',
    isCph: true
  },
  {
    id: 'permanent-address',
    heading: 'Permanent address',
    hint: 'A permanent address is where an animal:',
    hintList: [
      'will permanently reside',
      'can be checked by the Animal and Plant Health Agency (APHA)'
    ],
    linkText: 'Add a permanent address',
    path: '/permanent-address',
    selectPath: '/permanent-address/select',
    enterAddressPath: '/permanent-address/enter-address',
    sessionAddressKey: 'permanentAddress',
    sessionAddressIdKey: 'permanentAddressId',
    formFieldName: 'permanentAddressId',
    inputIdPrefix: 'permanent-address',
    searchInputId: 'permanent-address-search',
    isPermanentAddress: true
  }
]

const consignmentAddressSectionIdsByCommodityCode = {
  '0101': [
    'place-of-origin',
    'consignor-or-exporter',
    'consignee',
    'importer',
    'place-of-destination'
  ],
  '0102': [
    'place-of-origin',
    'consignor-or-exporter',
    'consignee',
    'importer',
    'place-of-destination',
    'cph'
  ],
  '0103': [
    'place-of-origin',
    'consignor-or-exporter',
    'consignee',
    'importer',
    'place-of-destination',
    'cph'
  ],
  '01061900': [
    'place-of-origin',
    'consignor-or-exporter',
    'consignee',
    'importer',
    'place-of-destination',
    'permanent-address'
  ]
}

const defaultConsignmentAddressSectionIds = [
  'place-of-origin',
  'consignor-or-exporter',
  'consignee',
  'importer',
  'place-of-destination',
  'cph'
]

function getConsignmentAddressSectionIdsForCommodityCode (commodityCode) {
  return consignmentAddressSectionIdsByCommodityCode[commodityCode] || defaultConsignmentAddressSectionIds
}

function getActiveConsignmentAddressSections (commodityCode) {
  const sectionIds = getConsignmentAddressSectionIdsForCommodityCode(commodityCode)

  return consignmentAddressSections.filter((section) => sectionIds.includes(section.id))
}

function getActiveConsignmentAddressSectionsForCommodityCodes (commodityCodes) {
  const sectionIdSet = new Set()

  commodityCodes.forEach((commodityCode) => {
    getConsignmentAddressSectionIdsForCommodityCode(commodityCode).forEach((sectionId) => {
      sectionIdSet.add(sectionId)
    })
  })

  return consignmentAddressSections.filter((section) => sectionIdSet.has(section.id))
}

module.exports = consignmentAddressSections
module.exports.getActiveConsignmentAddressSections = getActiveConsignmentAddressSections
module.exports.getActiveConsignmentAddressSectionsForCommodityCodes = getActiveConsignmentAddressSectionsForCommodityCodes

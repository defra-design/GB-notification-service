const addressBookOriginUses = require('./address-book-origin-uses')
const addressBookDestinationUses = require('./address-book-destination-uses')

const destinationUseValues = ['consignee', 'importer', 'place-of-destination']

const consignmentAddressUseGroups = [
  {
    id: 'origin-and-sender',
    options: addressBookOriginUses
  },
  {
    id: 'destination-and-receiver',
    options: destinationUseValues
      .map((value) => addressBookDestinationUses.find((option) => option.value === value))
      .filter(Boolean)
  }
]

const consignmentSectionUseGroupMap = {
  'place-of-origin': 'origin-and-sender',
  'consignor-or-exporter': 'origin-and-sender',
  consignee: 'destination-and-receiver',
  importer: 'destination-and-receiver',
  'place-of-destination': 'destination-and-receiver'
}

const consignmentSectionAddressTypeMap = {
  'place-of-origin': 'place-of-origin',
  'consignor-or-exporter': 'consignor',
  consignee: 'consignee',
  importer: 'importer',
  'place-of-destination': 'place-of-destination'
}

function getConsignmentAddressUseGroupIdForSection (sectionId) {
  return consignmentSectionUseGroupMap[sectionId] || null
}

function getConsignmentSectionAddressType (sectionId) {
  return consignmentSectionAddressTypeMap[sectionId] || null
}

function getConsignmentAddressUseGroupsForSection (sectionId) {
  const groupId = getConsignmentAddressUseGroupIdForSection(sectionId)

  if (!groupId) {
    return []
  }

  const group = consignmentAddressUseGroups.find((item) => item.id === groupId)

  if (!group) {
    return []
  }

  // Current role is implied by the journey — only offer other uses
  const currentAddressType = getConsignmentSectionAddressType(sectionId)

  return [{
    ...group,
    options: group.options.filter((option) => option.value !== currentAddressType)
  }]
}

function getConsignmentAddressUseOptions () {
  return consignmentAddressUseGroups.flatMap((group) => group.options)
}

function getConsignmentAddressUseOptionsForSection (sectionId) {
  return getConsignmentAddressUseGroupsForSection(sectionId).flatMap((group) => group.options)
}

function getConsignmentAddressUseValues () {
  return getConsignmentAddressUseOptions().map((option) => option.value)
}

function getConsignmentAddressUseValuesForSection (sectionId) {
  return getConsignmentAddressUseOptionsForSection(sectionId).map((option) => option.value)
}

function consignmentAddAddressUsesLookup (sectionId) {
  return getConsignmentAddressUseGroupIdForSection(sectionId) === 'destination-and-receiver'
}

module.exports = consignmentAddressUseGroups
module.exports.getConsignmentAddressUseGroupIdForSection = getConsignmentAddressUseGroupIdForSection
module.exports.getConsignmentSectionAddressType = getConsignmentSectionAddressType
module.exports.getConsignmentAddressUseGroupsForSection = getConsignmentAddressUseGroupsForSection
module.exports.getConsignmentAddressUseOptions = getConsignmentAddressUseOptions
module.exports.getConsignmentAddressUseOptionsForSection = getConsignmentAddressUseOptionsForSection
module.exports.getConsignmentAddressUseValues = getConsignmentAddressUseValues
module.exports.getConsignmentAddressUseValuesForSection = getConsignmentAddressUseValuesForSection
module.exports.consignmentAddAddressUsesLookup = consignmentAddAddressUsesLookup

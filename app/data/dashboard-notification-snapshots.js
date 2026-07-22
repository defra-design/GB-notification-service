'use strict'

const consignmentAddresses = require('./consignment-addresses')
const contactAddresses = require('./contact-addresses')
const transporters = require('./transporters')

const DESIGN_RELEASE_REFERENCE = 'GBN-AG-26-7K8M2P'

function findConsignmentAddress (id) {
  return consignmentAddresses.find((address) => address.id === id)
}

function toSessionAddress (address) {
  if (!address) {
    return null
  }

  return {
    name: address.name,
    addressLines: [...(address.addressLines || [])],
    country: address.country
  }
}

function formatContactAddressForSession (address) {
  return [address.name, ...(address.addressLines || []), address.country].join('\n')
}

function buildBaseSnapshot (notification) {
  const placeOfOrigin = findConsignmentAddress('green-valley-livestock-farm')
  const consignor = findConsignmentAddress('nordic-livestock-export')
  const consignee = findConsignmentAddress('northern-livestock-imports-consignee')
  const importer = findConsignmentAddress('northern-livestock-imports-importer')
  const destination = findConsignmentAddress('riverside-holding-facility')
  const contactAddress = contactAddresses[0]
  const transporter = transporters.find((entry) => entry.id === 'aberdeen-livestock')

  return {
    notificationReference: notification.reference || DESIGN_RELEASE_REFERENCE,
    countryOfOrigin: notification.origin || 'France',
    regionOfOriginRequired: 'No',
    regionOfOriginCode: 'FR-01010101',
    internalReference: 'LIV-2026-0142',
    commodityId: 'sheep',
    commodityCode: '010410',
    commodityName: 'Sheep',
    selectedSpecies: ['sheep-ovis-aries', 'goat-capra-hircus'],
    commoditySelections: [
      {
        type: 'species',
        commodityId: 'sheep',
        commodityCode: '010410',
        speciesId: 'sheep-ovis-aries'
      },
      {
        type: 'species',
        commodityId: 'goat',
        commodityCode: '010420',
        speciesId: 'goat-capra-hircus'
      }
    ],
    numberOfAnimals: {
      'sheep-ovis-aries': '1',
      'goat-capra-hircus': '2'
    },
    importReason: 'Internal market',
    internalMarketPurpose: 'Transfer of ownership - Sale/gift',
    certificationPurpose: 'Breeding',
    unweanedAnimals: 'No',
    portOfEntry: 'Liverpool - SOLV',
    arrivalDateAtPort: notification.arrivalDate || '26 October 2026',
    meansOfTransport: 'Road Vehicle',
    transportIdentification: 'ABC-123',
    transportDocumentReference: 'QUICK-SHIP',
    transitCountries: ['France', 'Germany', 'Spain'],
    transporterId: transporter.id,
    transporter: {
      id: transporter.id,
      name: transporter.name,
      address: transporter.address,
      approvalNumber: transporter.approvalNumber,
      type: transporter.type,
      status: transporter.status
    },
    placeOfOriginAddressId: placeOfOrigin.id,
    placeOfOriginAddress: toSessionAddress(placeOfOrigin),
    consignorAddressId: consignor.id,
    consignorAddress: toSessionAddress(consignor),
    consigneeAddressId: consignee.id,
    consigneeAddress: toSessionAddress(consignee),
    importerAddressId: importer.id,
    importerAddress: toSessionAddress(importer),
    placeOfDestinationAddressId: destination.id,
    placeOfDestinationAddress: toSessionAddress(destination),
    cphNumber: '12/345/6789',
    contactAddressId: contactAddress.id,
    contactAddress: formatContactAddressForSession(contactAddress)
  }
}

function buildCattleSnapshot (notification) {
  const placeOfOrigin = findConsignmentAddress('green-valley-livestock-farm')
  const consignor = findConsignmentAddress('nordic-livestock-export')
  const consignee = findConsignmentAddress('northern-livestock-imports-consignee')
  const importer = findConsignmentAddress('northern-livestock-imports-importer')
  const destination = findConsignmentAddress('riverside-holding-facility')
  const contactAddress = contactAddresses[0]
  const transporter = transporters.find((entry) => entry.id === 'aberdeen-livestock')

  return {
    notificationReference: notification.reference || DESIGN_RELEASE_REFERENCE,
    countryOfOrigin: notification.origin || 'France',
    regionOfOriginRequired: 'No',
    internalReference: 'LIV-2026-0142',
    commodityId: 'cattle',
    commodityCode: '0102',
    commodityName: 'Cattle',
    selectedSpecies: ['cattle-bison-bison'],
    commoditySelections: [{
      type: 'species',
      commodityId: 'cattle',
      commodityCode: '0102',
      speciesId: 'cattle-bison-bison'
    }],
    numberOfAnimals: {
      'cattle-bison-bison': '5'
    },
    importReason: 'Internal market',
    internalMarketPurpose: 'Transfer of ownership - Sale/gift',
    certificationPurpose: 'Slaughter',
    unweanedAnimals: 'No',
    portOfEntry: 'London Heathrow',
    arrivalDateAtPort: notification.arrivalDate || '8 March 2026',
    meansOfTransport: 'Airplane',
    transportIdentification: 'BA0123',
    transportDocumentReference: 'AWB-2026-8841',
    transporterId: transporter.id,
    transporter: {
      id: transporter.id,
      name: transporter.name,
      address: transporter.address,
      approvalNumber: transporter.approvalNumber,
      type: transporter.type,
      status: transporter.status
    },
    placeOfOriginAddressId: placeOfOrigin.id,
    placeOfOriginAddress: toSessionAddress(placeOfOrigin),
    consignorAddressId: consignor.id,
    consignorAddress: toSessionAddress(consignor),
    consigneeAddressId: consignee.id,
    consigneeAddress: toSessionAddress(consignee),
    importerAddressId: importer.id,
    importerAddress: toSessionAddress(importer),
    placeOfDestinationAddressId: destination.id,
    placeOfDestinationAddress: toSessionAddress(destination),
    cphNumber: '12/345/6789',
    contactAddressId: contactAddress.id,
    contactAddress: formatContactAddressForSession(contactAddress),
    uploadedDocuments: [{
      documentReference: 'HC-2026-0198',
      documentType: 'itahc',
      documentTypeLabel: 'Intra Trade Animal Health Certificate (ITAHC)',
      dateOfIssue: '01/03/2026',
      fileName: 'health-certificate.pdf',
      virusStatus: 'passed'
    }],
    animalIdentifiers: {
      'cattle-bison-bison': [{
        'ear-tag': 'UK123456789012',
        passport: 'GB-CAT-8821'
      }]
    }
  }
}

function buildSheepGoatSnapshot (notification) {
  const base = buildBaseSnapshot(notification)

  return {
    ...base,
    uploadedDocuments: [{
      documentReference: 'DOC-123',
      documentType: 'itahc',
      documentTypeLabel: 'Intra Trade Animal Health Certificate (ITAHC)',
      dateOfIssue: '22/10/2026',
      fileName: 'Health Cert.pdf',
      virusStatus: 'passed'
    }],
    animalIdentifiers: {
      'sheep-ovis-aries': [{ 'ear-tag': 'GB483754' }, { 'ear-tag': 'GB2643733' }],
      'goat-capra-hircus': [{ 'ear-tag': 'GB483754' }, { 'ear-tag': 'GB2643733' }]
    }
  }
}

function buildActionRequiredSnapshot (notification) {
  const base = buildBaseSnapshot(notification)

  return {
    ...base,
    uploadedDocuments: [],
    animalIdentifiers: {
      'goat-capra-hircus': [{ 'ear-tag': '123456789' }]
    }
  }
}

function buildDashboardNotificationSnapshot (notification = {}) {
  const reviewVariant = notification.reviewVariant

  if (reviewVariant === 'action-required') {
    return buildActionRequiredSnapshot(notification)
  }

  const commodities = String(notification.commodities || '').trim()

  if (commodities.includes('010410') || commodities.includes('010420')) {
    return buildSheepGoatSnapshot(notification)
  }

  return buildCattleSnapshot(notification)
}

module.exports = {
  buildDashboardNotificationSnapshot
}

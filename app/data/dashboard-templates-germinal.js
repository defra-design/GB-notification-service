// Example templates for germinal products (semen, embryos and ova).
//
// Design release 2 shows them with its other templates. Round 1 (Germinals),
// at /testing4, shows them with the two germinal templates from
// dashboard-templates.js, and no live animal templates.
//
// They are kept out of dashboard-templates.js, which the template tests use.
// The businesses are made up. They carry no identification details, because
// donor and collection details change with every consignment.

const CREATED = '20 November 2026'

function germinalTemplate ({ id, title, commodityId, commodityCode, commodityLabel, speciesId, speciesLabel, country, packages, grossWeight, storageTemperature, address }) {
  return {
    id,
    categoryLabel: 'Germinal products',
    title,
    commodityLabel,
    origin: country,
    consignee: title,
    consignor: title,
    dateCreated: CREATED,
    review: {
      countryOfOrigin: country,
      regionOfOriginCode: '',
      internalReferenceNumber: 'N/A',
      commodityCode,
      commonName: commodityLabel,
      species: speciesLabel,
      selectedSpecies: [speciesId],
      commoditySelections: [
        {
          type: 'species',
          commodityId,
          commodityCode,
          speciesId
        }
      ],
      numberOfPackages: packages,
      numberOfPackagesBySpecies: {
        [speciesId]: packages
      },
      grossWeight,
      storageTemperature,
      reasonForImport: 'Internal market',
      purposeInTheMarket: 'Breeding',
      certifiedFor: 'Breeding and/or production',
      placeOfOrigin: {
        name: title,
        lines: [...address, country]
      },
      useSameAddressForParties: true
    }
  }
}

module.exports = [
  germinalTemplate({
    id: 'limfjord-pig-genetics',
    title: 'Limfjord Pig Genetics',
    commodityId: 'pig-semen',
    commodityCode: '05119985',
    commodityLabel: 'Pig, Semen',
    speciesId: 'pig-semen-sus-scrofa',
    speciesLabel: 'Sus scrofa domesticus',
    country: 'Denmark',
    packages: '24',
    grossWeight: '3.5',
    storageTemperature: 'Chilled',
    address: ['Fjordvej 21', 'Skive', '7800']
  }),
  germinalTemplate({
    id: 'slaney-valley-ovine-embryos',
    title: 'Slaney Valley Ovine Embryos',
    commodityId: 'sheep-embryos-ova',
    commodityCode: '05119985',
    commodityLabel: 'Sheep, Embryos/Ova',
    speciesId: 'sheep-embryos-ova-ovis-aries',
    speciesLabel: 'Ovis aries',
    country: 'Republic of Ireland',
    packages: '4',
    grossWeight: '0.6',
    storageTemperature: 'Frozen',
    address: ['Slaney Road', 'Enniscorthy', 'Co. Wexford', 'Y21 X0X0']
  }),
  germinalTemplate({
    id: 'veluwe-canine-reproduction',
    title: 'Veluwe Canine Reproduction',
    commodityId: 'dog-semen',
    commodityCode: '05119985',
    commodityLabel: 'Dog, Semen',
    speciesId: 'dog-semen-canis-familiaris',
    speciesLabel: 'Canis familiaris',
    country: 'Netherlands',
    packages: '2',
    grossWeight: '0.4',
    storageTemperature: 'Frozen',
    address: ['Heideweg 7', 'Apeldoorn', '7311 XX']
  })
]

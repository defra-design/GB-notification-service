// Germinal products (embryos/ova and semen) — design release 2.1 commodity search

const germinalCertificationPurposeOptions = [
  'Breeding and/or production',
  'Approved bodies',
  'Other'
]

function germinalCommodity (entry) {
  return {
    isGerminalProduct: true,
    identifiers: [],
    certificationPurposeOptions: germinalCertificationPurposeOptions,
    packagingFields: [],
    ...entry
  }
}

const germinalProductCommodities = [
  germinalCommodity({
    id: 'cat-embryos-ova',
    name: 'Cat, Embryos/Ova',
    code: '05119985',
    species: [
      { id: 'cat-embryos-ova-felis-catus', label: 'Felis catus', commonName: 'Domestic cat' }
    ]
  }),
  germinalCommodity({
    id: 'cat-semen',
    name: 'Cat, Semen',
    code: '05119985',
    species: [
      { id: 'cat-semen-felis-catus', label: 'Felis catus', commonName: 'Domestic cat' }
    ]
  }),
  germinalCommodity({
    id: 'cattle-embryos-ova',
    name: 'Cattle, Embryos/Ova',
    code: '05119985',
    species: [
      { id: 'cattle-embryos-ova-bison-bison', label: 'Bison bison', commonName: 'Bison bison' },
      { id: 'cattle-embryos-ova-bos-taurus', label: 'Bos taurus', commonName: 'Domestic cattle' },
      { id: 'cattle-embryos-ova-bubalus-bubalis', label: 'Bubalus bubalis', commonName: 'Water buffalo' }
    ]
  }),
  germinalCommodity({
    id: 'cattle-semen',
    name: 'Cattle, Semen',
    code: '05111000',
    species: [
      { id: 'cattle-semen-bison-bison', label: 'Bison bison', commonName: 'Bison bison' },
      { id: 'cattle-semen-bos-taurus', label: 'Bos taurus', commonName: 'Domestic cattle' },
      { id: 'cattle-semen-bovidae', label: 'Bovidae' },
      { id: 'cattle-semen-bubalus-bubalis', label: 'Bubalus bubalis', commonName: 'Water buffalo' }
    ]
  }),
  germinalCommodity({
    id: 'dog-embryos-ova',
    name: 'Dog, Embryos/Ova',
    code: '05119985',
    species: [
      { id: 'dog-embryos-ova-canis-familiaris', label: 'Canis familiaris', commonName: 'Domestic dog' }
    ]
  }),
  germinalCommodity({
    id: 'dog-semen',
    name: 'Dog, Semen',
    code: '05119985',
    species: [
      { id: 'dog-semen-canis-familiaris', label: 'Canis familiaris', commonName: 'Domestic dog' }
    ]
  }),
  germinalCommodity({
    id: 'goat-embryos-ova',
    name: 'Goat, Embryos/Ova',
    code: '05119985',
    species: [
      { id: 'goat-embryos-ova-capra-hircus', label: 'Capra hircus', commonName: 'Goat' }
    ]
  }),
  germinalCommodity({
    id: 'goat-semen',
    name: 'Goat, Semen',
    code: '05119985',
    species: [
      { id: 'goat-semen-capra-hircus', label: 'Capra hircus', commonName: 'Goat' }
    ]
  }),
  germinalCommodity({
    id: 'horse-semen',
    name: 'Horse, Semen',
    code: '05119985',
    species: [
      { id: 'horse-semen-equus-asinus', label: 'Equus asinus', commonName: 'Donkey' },
      { id: 'horse-semen-equus-cabalus', label: 'Equus cabalus', commonName: 'Horse' }
    ]
  }),
  germinalCommodity({
    id: 'horse-embryos-ova',
    name: 'Horse, Embryos/Ova',
    code: '05119985',
    species: [
      { id: 'horse-embryos-ova-equus-asinus', label: 'Equus asinus', commonName: 'Donkey' },
      { id: 'horse-embryos-ova-equus-cabalus', label: 'Equus cabalus', commonName: 'Horse' }
    ]
  }),
  germinalCommodity({
    id: 'pig-embryos-ova',
    name: 'Pig, Embryos/Ova',
    code: '05119985',
    species: [
      { id: 'pig-embryos-ova-sus-scrofa', label: 'Sus scrofa domesticus', commonName: 'Pig' }
    ]
  }),
  germinalCommodity({
    id: 'pig-semen',
    name: 'Pig, Semen',
    code: '05119985',
    species: [
      { id: 'pig-semen-sus-scrofa', label: 'Sus scrofa domesticus', commonName: 'Pig' }
    ]
  }),
  germinalCommodity({
    id: 'rabbit-rodent-semen',
    name: 'Rabbit/Rodent, Semen',
    code: '05119985',
    species: [
      { id: 'rabbit-rodent-semen', label: 'Rabbit/Rodent' }
    ]
  }),
  germinalCommodity({
    id: 'sheep-embryos-ova',
    name: 'Sheep, Embryos/Ova',
    code: '05119985',
    species: [
      { id: 'sheep-embryos-ova-ovis-aries', label: 'Ovis aries', commonName: 'Sheep' }
    ]
  }),
  germinalCommodity({
    id: 'sheep-semen',
    name: 'Sheep, Semen',
    code: '05119985',
    species: [
      { id: 'sheep-semen-ovis-aries', label: 'Ovis aries', commonName: 'Sheep' }
    ]
  })
]

module.exports = germinalProductCommodities.slice().sort((a, b) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
)

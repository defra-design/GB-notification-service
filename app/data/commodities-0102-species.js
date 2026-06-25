// Species for CN code 0102 — cattle (Latin names with common names for commodity search)

const speciesEntries = [
  { label: 'Bibos spp.', commonName: 'Gaur' },
  { label: 'Bison bison', commonName: 'Bison bison', id: 'cattle-bison-bison' },
  { label: 'Bison spp', commonName: 'Bison' },
  { label: 'Bos spp', commonName: 'Cattle', id: 'cattle-bos-spp' },
  { label: 'Bos taurus', commonName: 'Domestic cattle', id: 'cattle-bos-taurus' },
  { label: 'Bubalus bubalis', commonName: 'Water buffalo', id: 'cattle-bubalus-bubalis' },
  { label: 'Bubalus spp (including Anoa)', commonName: 'Buffalo' },
  { label: 'Novibos spp', commonName: 'Banteng' },
  { label: 'Ovibos spp', commonName: 'Musk ox' },
  { label: 'Poephagus spp.', commonName: 'Yak' },
  { label: 'Syncerus spp.', commonName: 'African buffalo' }
]

module.exports = speciesEntries.map((entry, index) => ({
  id: entry.id || `cattle-${index + 1}-${entry.label
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\./g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')}`,
  label: entry.label,
  commonName: entry.commonName
}))

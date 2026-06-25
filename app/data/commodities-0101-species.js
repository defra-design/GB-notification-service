// Species for CN code 0101 — horse (Latin names with common names for commodity search)

const speciesEntries = [
  { label: 'Eq cabalus*asinus', commonName: 'Mule' },
  { label: 'Equus asinus', commonName: 'Donkey', id: 'horse-equus-asinus' },
  { label: 'Equus cabalus', commonName: 'Horse', id: 'horse-equus-caballus' }
]

module.exports = speciesEntries.map((entry, index) => ({
  id: entry.id || `horse-${index + 1}-${entry.label
    .toLowerCase()
    .replace(/[()*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\./g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')}`,
  label: entry.label,
  commonName: entry.commonName
}))

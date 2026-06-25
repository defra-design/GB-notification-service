const memberStates = [
  'Austria',
  'Belgium',
  'Bulgaria',
  'Croatia',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hungary',
  'Italy',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Malta',
  'Netherlands',
  'Poland',
  'Portugal',
  'Republic of Ireland',
  'Romania',
  'Slovakia',
  'Slovenia',
  'Spain',
  'Sweden'
]

const territories = [
  { name: 'Azores', parent: 'Portugal' },
  { name: 'Canary Islands', parent: 'Spain' },
  { name: 'Ceuta', parent: 'Spain' },
  { name: 'French Guiana', parent: 'France' },
  { name: 'Guadeloupe', parent: 'France' },
  { name: 'Madeira', parent: 'Portugal' },
  { name: 'Martinique', parent: 'France' },
  { name: 'Mayotte', parent: 'France' },
  { name: 'Melilla', parent: 'Spain' },
  { name: 'Reunion', parent: 'France' },
  { name: 'Saint Martin', parent: 'France' }
]

function formatTerritoryLabel (name, parent) {
  return `${name} (${parent})`
}

const options = [
  ...memberStates.map((name) => ({
    label: name,
    value: name,
    parent: null
  })),
  ...territories.map(({ name, parent }) => ({
    label: formatTerritoryLabel(name, parent),
    value: formatTerritoryLabel(name, parent),
    parent
  }))
].sort((left, right) => left.label.localeCompare(right.label))

const labels = options.map((option) => option.value)

module.exports = options
module.exports.labels = labels
module.exports.memberStates = memberStates
module.exports.territories = territories

const origins = ['France', 'Germany', 'Ireland', 'Netherlands', 'Spain', 'Poland', 'Denmark', 'Belgium']
const statusOptions = ['Draft', 'Submitted', 'In progress']
const commoditySets = [
  '010410, 010420',
  '0102',
  '01061900',
  '0101'
]

const notifications = Array.from({ length: 32 }, (_, index) => {
  const number = index + 1

  return {
    reference: number === 1 ? 'GBN-AG-26-7K8M2P' : `GBN-AG-26-${String(number).padStart(6, '0')}`,
    commodities: commoditySets[index % commoditySets.length],
    statusText: number === 1 ? 'Draft' : statusOptions[index % statusOptions.length],
    origin: origins[index % origins.length],
    arrivalDate: '8 March 2026',
    viewHref: number === 1 ? '/notification-hub' : '#'
  }
})

module.exports = {
  pageSize: 8,
  notifications,
  sortItems: [
    { value: '', text: 'Select one' },
    { value: 'newest', text: 'Newest first' },
    { value: 'oldest', text: 'Oldest first' },
    { value: 'arrival-date', text: 'Arrival date' }
  ]
}

// Testing 3 only: extra example notifications for the dashboard.
//
// These are submitted notifications that are part-way through being amended.
// They show in the "Draft and Amend" tab with an "Amend" status, and open in
// the amend state. Their dates are worked out from today's date in routes.js.
//
// The consignee, consignor and number of animals match the review page these
// examples open, which is built by dashboard-notification-snapshots.js.
//
// They are added after the shared examples in dashboard-notifications.js, so
// add new ones to the end: an example's position decides its reference.

module.exports = [
  {
    reference: 'GBN-AG-26-7K8M3F',
    commodities: '0102',
    commodityLabel: 'Cattle',
    categoryLabel: 'Live animals',
    statusText: 'Amend',
    statusTagClass: 'govuk-tag--yellow',
    reviewVariant: 'draft',
    isAmend: true,
    origin: 'Netherlands',
    consignee: 'Northern Livestock Imports Ltd',
    consignor: 'Nordic Livestock Export AB',
    quantityLabel: 'Number of animals',
    quantityValue: '5',
    numberOfAnimals: '5',
    viewHref: '#'
  },
  {
    reference: 'GBN-AG-26-7K8M3G',
    commodities: '010410, 010420',
    commodityLabel: 'Goats and Sheep',
    categoryLabel: 'Live animals',
    statusText: 'Amend',
    statusTagClass: 'govuk-tag--yellow',
    reviewVariant: 'draft',
    isAmend: true,
    origin: 'France',
    consignee: 'Northern Livestock Imports Ltd',
    consignor: 'Nordic Livestock Export AB',
    quantityLabel: 'Number of animals',
    quantityValue: '3',
    numberOfAnimals: '3',
    viewHref: '#'
  }
]

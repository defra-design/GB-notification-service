module.exports = [
  {
    value: 'origin-and-consignor',
    text: 'Origin and Consignor',
    textDesignRelease21: 'Origin or Consignor',
    hint: 'Place of origin, Consignor',
    defaultAddressType: 'place-of-origin'
  },
  {
    value: 'destination-consignee-importer',
    text: 'Destination, Consignee and Importer',
    textDesignRelease21: 'Destination, Consignee or Importer',
    hint: 'Place of destination, Consignee, Importer',
    defaultAddressType: 'place-of-destination'
  },
  {
    value: 'transporter',
    text: 'Transporter',
    hint: 'Private, Commercial',
    defaultAddressType: 'transporter'
  },
  {
    value: 'branch',
    text: 'Branch',
    hint: 'Branch address',
    defaultAddressType: 'branch-address'
  }
]

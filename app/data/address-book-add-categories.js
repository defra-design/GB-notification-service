module.exports = [
  {
    value: 'origin-and-sender',
    text: 'Origin and sender',
    hint: 'Place of origin, Consignor',
    defaultAddressType: 'place-of-origin'
  },
  {
    value: 'destination-and-receiver',
    text: 'Destination and receiver',
    hint: 'Place of destination, Consignee, Importer, Branch address, CPH number',
    defaultAddressType: 'place-of-destination'
  },
  {
    value: 'transporter',
    text: 'Transporter',
    hint: 'Private, Commercial',
    defaultAddressType: 'transporter'
  }
]

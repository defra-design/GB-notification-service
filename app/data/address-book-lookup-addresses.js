const consignmentAddresses = require('./consignment-addresses')
const contactAddresses = require('./contact-addresses')
const { memberStates } = require('./countries')

const TARGET_ADDRESS_COUNT = 500

const UK_AND_EU_COUNTRIES = [
  'United Kingdom',
  ...memberStates
]

const ORG_PREFIXES = [
  'Northern', 'Southern', 'Eastern', 'Western', 'Green', 'Blue', 'Red', 'Golden',
  'Silver', 'Alpine', 'Baltic', 'Nordic', 'Continental', 'Atlantic', 'Riverside',
  'Meadow', 'Valley', 'Harbour', 'Dockside', 'Highland', 'Lowland', 'Central',
  'Metro', 'Prime', 'United', 'Euro', 'Celtic', 'Britannia', 'Summit', 'Oakwood'
]

const ORG_CORES = [
  'Livestock', 'Animal', 'Farm', 'Breeding', 'Trading', 'Imports', 'Exports',
  'Logistics', 'Holding', 'Quarantine', 'Agri', 'Pastoral', 'Husbandry', 'Stock'
]

const ORG_SUFFIXES = {
  'United Kingdom': ['Ltd', 'Limited', 'PLC', 'LLP'],
  default: ['GmbH', 'BV', 'SARL', 'SL', 'AB', 'AS', 'Sp z oo', 'Srl', 'SA', 'NV', 'ApS', 'Oy', 'SRO']
}

const STREET_NAMES = [
  'Meadow', 'Harbour', 'Station', 'Market', 'Commerce', 'Industrial', 'Farm',
  'Riverside', 'Dock', 'Trade', 'Union', 'King', 'Queen', 'Victoria', 'Church',
  'Mill', 'Park', 'Garden', 'Field', 'Hill', 'Bridge', 'Castle', 'Oak', 'Elm'
]

const STREET_TYPES = {
  'United Kingdom': ['Road', 'Street', 'Lane', 'Way', 'Avenue', 'Close', 'Drive'],
  'Germany': ['Strasse', 'Weg', 'Platz'],
  'France': ['Rue', 'Avenue', 'Boulevard'],
  'Spain': ['Calle', 'Avenida', 'Paseo'],
  'Italy': ['Via', 'Viale', 'Corso'],
  'Netherlands': ['Straat', 'Laan', 'Weg'],
  'Republic of Ireland': ['Road', 'Street', 'Lane'],
  default: ['Street', 'Road', 'Avenue']
}

const UK_CITIES = [
  { city: 'London', postcodePrefix: 'SW1A' },
  { city: 'Manchester', postcodePrefix: 'M1' },
  { city: 'Birmingham', postcodePrefix: 'B5' },
  { city: 'Leeds', postcodePrefix: 'LS1' },
  { city: 'Liverpool', postcodePrefix: 'L1' },
  { city: 'Bristol', postcodePrefix: 'BS1' },
  { city: 'Sheffield', postcodePrefix: 'S1' },
  { city: 'Newcastle', postcodePrefix: 'NE1' },
  { city: 'Nottingham', postcodePrefix: 'NG1' },
  { city: 'Hull', postcodePrefix: 'HU1' },
  { city: 'Aberdeen', postcodePrefix: 'AB10' },
  { city: 'Cardiff', postcodePrefix: 'CF10' },
  { city: 'Edinburgh', postcodePrefix: 'EH1' },
  { city: 'Glasgow', postcodePrefix: 'G2' },
  { city: 'Belfast', postcodePrefix: 'BT1' },
  { city: 'Peterborough', postcodePrefix: 'PE1' },
  { city: 'Newark', postcodePrefix: 'NG24' },
  { city: 'Kirkby', postcodePrefix: 'L33' }
]

const EU_CITIES = {
  Austria: [{ city: 'Vienna', postcode: '1010' }, { city: 'Salzburg', postcode: '5020' }, { city: 'Graz', postcode: '8010' }],
  Belgium: [{ city: 'Brussels', postcode: '1000' }, { city: 'Antwerp', postcode: '2000' }, { city: 'Ghent', postcode: '9000' }],
  Bulgaria: [{ city: 'Sofia', postcode: '1000' }, { city: 'Plovdiv', postcode: '4000' }],
  Croatia: [{ city: 'Zagreb', postcode: '10000' }, { city: 'Split', postcode: '21000' }],
  Cyprus: [{ city: 'Nicosia', postcode: '1010' }, { city: 'Limassol', postcode: '3010' }],
  'Czech Republic': [{ city: 'Prague', postcode: '11000' }, { city: 'Brno', postcode: '60200' }],
  Denmark: [{ city: 'Copenhagen', postcode: '1050' }, { city: 'Aarhus', postcode: '8000' }],
  Estonia: [{ city: 'Tallinn', postcode: '10111' }, { city: 'Tartu', postcode: '51004' }],
  Finland: [{ city: 'Helsinki', postcode: '00100' }, { city: 'Tampere', postcode: '33100' }],
  France: [{ city: 'Paris', postcode: '75001' }, { city: 'Lyon', postcode: '69002' }, { city: 'Marseille', postcode: '13001' }],
  Germany: [{ city: 'Berlin', postcode: '10115' }, { city: 'Hamburg', postcode: '20457' }, { city: 'Munich', postcode: '80331' }],
  Greece: [{ city: 'Athens', postcode: '10558' }, { city: 'Thessaloniki', postcode: '54625' }],
  Hungary: [{ city: 'Budapest', postcode: '1051' }, { city: 'Debrecen', postcode: '4024' }],
  Italy: [{ city: 'Rome', postcode: '00183' }, { city: 'Milan', postcode: '20121' }, { city: 'Naples', postcode: '80121' }],
  Latvia: [{ city: 'Riga', postcode: 'LV-1050' }, { city: 'Daugavpils', postcode: 'LV-5401' }],
  Lithuania: [{ city: 'Vilnius', postcode: '01100' }, { city: 'Kaunas', postcode: '44240' }],
  Luxembourg: [{ city: 'Luxembourg City', postcode: 'L-2453' }],
  Malta: [{ city: 'Valletta', postcode: 'VLT 1117' }, { city: 'Sliema', postcode: 'SLM 3170' }],
  Netherlands: [{ city: 'Amsterdam', postcode: '1012 AB' }, { city: 'Rotterdam', postcode: '3011 AA' }, { city: 'Utrecht', postcode: '3511 AA' }],
  Poland: [{ city: 'Warsaw', postcode: '00-001' }, { city: 'Gdańsk', postcode: '80-001' }, { city: 'Kraków', postcode: '31-001' }],
  Portugal: [{ city: 'Lisbon', postcode: '1100-148' }, { city: 'Porto', postcode: '4050-279' }],
  'Republic of Ireland': [{ city: 'Dublin', postcode: 'D01 F5P2' }, { city: 'Cork', postcode: 'T12 X7YZ' }],
  Romania: [{ city: 'Bucharest', postcode: '010011' }, { city: 'Cluj-Napoca', postcode: '400001' }],
  Slovakia: [{ city: 'Bratislava', postcode: '81101' }, { city: 'Košice', postcode: '04001' }],
  Slovenia: [{ city: 'Ljubljana', postcode: '1000' }, { city: 'Maribor', postcode: '2000' }],
  Spain: [{ city: 'Madrid', postcode: '28013' }, { city: 'Barcelona', postcode: '08002' }, { city: 'Valencia', postcode: '46001' }],
  Sweden: [{ city: 'Stockholm', postcode: '11120' }, { city: 'Gothenburg', postcode: '41117' }, { city: 'Malmö', postcode: '21122' }]
}

const EXTRA_SEED_ADDRESSES = [
  {
    id: 'acorn-farm-kirkby',
    name: 'Acorn Farm',
    addressLines: ['Urban Farm, Acorn Venture', 'Depot road', 'Kirkby, Liverpool', 'L33 3AR'],
    country: 'United Kingdom'
  }
]

function formatAddressLines (addressLines) {
  return (addressLines || []).join(', ')
}

function buildSearchText (parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function isUkPostcode (value) {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test((value || '').trim())
}

function parseCityPostcodeLine (line) {
  const trimmed = (line || '').trim()

  if (!trimmed) {
    return null
  }

  if (isUkPostcode(trimmed)) {
    return {
      townOrCity: '',
      postcode: trimmed.toUpperCase()
    }
  }

  const lastComma = trimmed.lastIndexOf(',')

  if (lastComma === -1) {
    return null
  }

  const locationPart = trimmed.slice(0, lastComma).trim()
  const postcodePart = trimmed.slice(lastComma + 1).trim()
  const townOrCity = locationPart.includes(',')
    ? locationPart.split(',').pop().trim()
    : locationPart

  return {
    townOrCity,
    postcode: postcodePart
  }
}

function parseAddressLinesForManualForm (addressLines) {
  const lines = (addressLines || []).map((line) => line.trim()).filter(Boolean)

  if (lines.length === 0) {
    return {
      addressLine1: '',
      addressLine2: '',
      townOrCity: '',
      county: '',
      postcode: ''
    }
  }

  if (lines.length === 1) {
    const parsed = parseCityPostcodeLine(lines[0])

    if (parsed) {
      return {
        addressLine1: '',
        addressLine2: '',
        townOrCity: parsed.townOrCity,
        county: '',
        postcode: parsed.postcode
      }
    }

    return {
      addressLine1: lines[0],
      addressLine2: '',
      townOrCity: '',
      county: '',
      postcode: ''
    }
  }

  const lastLine = lines[lines.length - 1]
  const secondLastLine = lines[lines.length - 2]

  if (isUkPostcode(lastLine)) {
    const townOrCity = secondLastLine.includes(',')
      ? secondLastLine.split(',').pop().trim()
      : secondLastLine

    return {
      addressLine1: lines[0],
      addressLine2: lines.length > 2 ? lines.slice(1, -2).join(', ') : '',
      townOrCity,
      county: '',
      postcode: lastLine.toUpperCase()
    }
  }

  const parsedLastLine = parseCityPostcodeLine(lastLine)

  if (parsedLastLine) {
    return {
      addressLine1: lines[0],
      addressLine2: lines.length > 2 ? lines.slice(1, -1).join(', ') : '',
      townOrCity: parsedLastLine.townOrCity,
      county: '',
      postcode: parsedLastLine.postcode
    }
  }

  return {
    addressLine1: lines[0],
    addressLine2: lines.slice(1).join(', '),
    townOrCity: '',
    county: '',
    postcode: ''
  }
}

function buildPlaceholderEmail (name, country) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32)

  if (country === 'United Kingdom') {
    return `info@${slug}.co.uk`
  }

  return `info@${slug}.eu`
}

function buildPlaceholderPhone (country, index) {
  const prefixes = {
    'United Kingdom': '+44',
    Austria: '+43',
    Belgium: '+32',
    Bulgaria: '+359',
    Croatia: '+385',
    Cyprus: '+357',
    'Czech Republic': '+420',
    Denmark: '+45',
    Estonia: '+372',
    Finland: '+358',
    France: '+33',
    Germany: '+49',
    Greece: '+30',
    Hungary: '+36',
    Italy: '+39',
    Latvia: '+371',
    Lithuania: '+370',
    Luxembourg: '+352',
    Malta: '+356',
    Netherlands: '+31',
    Poland: '+48',
    Portugal: '+351',
    'Republic of Ireland': '+353',
    Romania: '+40',
    Slovakia: '+421',
    Slovenia: '+386',
    Spain: '+34',
    Sweden: '+46'
  }
  const prefix = prefixes[country] || '+44'
  const partA = String(100 + (index % 900))
  const partB = String(200 + (index % 800))
  const partC = String(3000 + (index % 7000))

  return `${prefix} ${partA} ${partB} ${partC}`
}

function buildManualFieldsFromAddress (address, index = 0) {
  const parsed = parseAddressLinesForManualForm(address.addressLines)

  return {
    nameOrOrganisation: address.name || '',
    addressLine1: parsed.addressLine1,
    addressLine2: parsed.addressLine2,
    townOrCity: parsed.townOrCity,
    county: address.county || parsed.county || '',
    postcode: parsed.postcode,
    country: address.country || 'United Kingdom',
    email: address.email || buildPlaceholderEmail(address.name, address.country),
    phone: address.telephone || address.phone || buildPlaceholderPhone(address.country, index)
  }
}

function buildLookupAddress (address, index = 0) {
  const formattedAddress = formatAddressLines(address.addressLines)
  const manual = buildManualFieldsFromAddress(address, index)

  return {
    id: address.id,
    name: address.name,
    address: formattedAddress,
    country: address.country,
    label: `${address.name}, ${formattedAddress}, ${address.country}`,
    searchText: buildSearchText([
      address.name,
      formattedAddress,
      address.country,
      ...(address.addressLines || [])
    ]),
    manual
  }
}

function isUkOrEurope (country) {
  return UK_AND_EU_COUNTRIES.includes(country)
}

function pick (items, index) {
  return items[index % items.length]
}

function buildUkPostcode (prefix, index) {
  const outward = prefix
  const inwardNumber = String(100 + (index % 900)).padStart(3, '0')
  const inwardLetters = String.fromCharCode(65 + (index % 26)) + String.fromCharCode(65 + ((index * 7) % 26))

  return `${outward} ${inwardNumber}${inwardLetters}`
}

function buildStreetLine (country, index) {
  const streetTypes = STREET_TYPES[country] || STREET_TYPES.default
  const streetName = pick(STREET_NAMES, index)
  const streetType = pick(streetTypes, Math.floor(index / STREET_NAMES.length))
  const buildingNumber = 1 + (index % 180)

  if (['Germany', 'France', 'Spain', 'Italy', 'Netherlands'].includes(country)) {
    return `${streetType} ${streetName} ${buildingNumber}`
  }

  return `${buildingNumber} ${streetName} ${streetType}`
}

function buildOrganisationName (country, index) {
  const prefix = pick(ORG_PREFIXES, index)
  const core = pick(ORG_CORES, Math.floor(index / ORG_PREFIXES.length))
  const suffixes = ORG_SUFFIXES[country] || ORG_SUFFIXES.default
  const suffix = pick(suffixes, Math.floor(index / (ORG_PREFIXES.length * ORG_CORES.length)))

  if (country === 'United Kingdom') {
    return `${prefix} ${core} ${suffix}`
  }

  return `${prefix} ${core} ${suffix}`
}

function buildGeneratedAddress (index, country) {
  const name = buildOrganisationName(country, index)
  const streetLine = buildStreetLine(country, index)
  const unitLine = index % 4 === 0 ? `Unit ${1 + (index % 12)}` : null

  let cityLine
  let postcode

  if (country === 'United Kingdom') {
    const location = pick(UK_CITIES, index)
    postcode = buildUkPostcode(location.postcodePrefix, index)
    cityLine = `${location.city}, ${postcode}`
  } else {
    const locations = EU_CITIES[country] || [{ city: country, postcode: `${10000 + index}` }]
    const location = pick(locations, index)
    postcode = location.postcode
    cityLine = `${location.city}, ${location.postcode}`
  }

  const addressLines = [streetLine, unitLine, cityLine].filter(Boolean)

  return {
    id: `lookup-address-${country.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
    name,
    addressLines,
    country
  }
}

function buildAddresses () {
  const byId = new Map()

  ;[
    ...consignmentAddresses,
    ...contactAddresses,
    ...EXTRA_SEED_ADDRESSES
  ]
    .filter((address) => isUkOrEurope(address.country))
    .forEach((address) => {
      byId.set(address.id, buildLookupAddress(address))
    })

  let generatedIndex = 0

  while (byId.size < TARGET_ADDRESS_COUNT) {
    const country = pick(UK_AND_EU_COUNTRIES, generatedIndex)
    const generated = buildGeneratedAddress(generatedIndex, country)

    if (!byId.has(generated.id)) {
      byId.set(generated.id, buildLookupAddress(generated, generatedIndex))
    }

    generatedIndex += 1
  }

  return Array.from(byId.values()).sort((left, right) => left.label.localeCompare(right.label))
}

const addresses = buildAddresses()

const NI_CITIES = [
  { city: 'Belfast', postcodePrefix: 'BT1' },
  { city: 'Lisburn', postcodePrefix: 'BT28' },
  { city: 'Newry', postcodePrefix: 'BT34' },
  { city: 'Armagh', postcodePrefix: 'BT61' },
  { city: 'Derry', postcodePrefix: 'BT48' },
  { city: 'Omagh', postcodePrefix: 'BT78' },
  { city: 'Enniskillen', postcodePrefix: 'BT74' },
  { city: 'Ballymena', postcodePrefix: 'BT43' },
  { city: 'Coleraine', postcodePrefix: 'BT52' },
  { city: 'Bangor', postcodePrefix: 'BT20' },
  { city: 'Larne', postcodePrefix: 'BT40' },
  { city: 'Craigavon', postcodePrefix: 'BT63' }
]

const NI_LOOKUP_ADDRESS_COUNT = 80

function buildNorthernIrelandAddress (index) {
  const name = buildOrganisationName('United Kingdom', index + 500)
  const streetLine = buildStreetLine('United Kingdom', index + 500)
  const unitLine = index % 4 === 0 ? `Unit ${1 + (index % 12)}` : null
  const location = pick(NI_CITIES, index)
  const postcode = buildUkPostcode(location.postcodePrefix, index)
  const cityLine = `${location.city}, ${postcode}`
  const addressLines = [streetLine, unitLine, cityLine].filter(Boolean)

  return {
    id: `lookup-address-northern-ireland-${index}`,
    name,
    addressLines,
    country: 'Northern Ireland',
    county: 'Northern Ireland'
  }
}

function buildNorthernIrelandAddresses () {
  const results = []

  for (let index = 0; index < NI_LOOKUP_ADDRESS_COUNT; index += 1) {
    results.push(buildLookupAddress(buildNorthernIrelandAddress(index), index))
  }

  return results.sort((left, right) => left.label.localeCompare(right.label))
}

const northernIrelandAddresses = buildNorthernIrelandAddresses()

function getAddressById (addressId) {
  return addresses.find((address) => address.id === addressId) ||
    northernIrelandAddresses.find((address) => address.id === addressId) ||
    null
}

module.exports = {
  addresses,
  northernIrelandAddresses,
  getAddressById,
  TARGET_ADDRESS_COUNT,
  parseAddressLinesForManualForm,
  buildManualFieldsFromAddress
}

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { Readable } = require('stream')

const { collect, writeOutput } = require('./build')
const { lookupPostcode } = require('../../app/utils/postcode-address-lookup')

const HEADER = 'CompanyName, CompanyNumber,RegAddress.CareOf,RegAddress.POBox,RegAddress.AddressLine1, RegAddress.AddressLine2,RegAddress.PostTown,RegAddress.County,RegAddress.Country,RegAddress.PostCode,CompanyCategory'

function csv (rows) {
  return Readable.from([`${HEADER}\n${rows.join('\n')}\n`])
}

async function build (rows) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postcode-addresses-'))
  const { byOutward, counts } = await collect(csv(rows))
  const manifest = writeOutput(outDir, byOutward, { counts })
  return { outDir, manifest }
}

const LTD = 'Private Limited Company'

test('two companies at one address appear once, flats and units stay apart', async () => {
  const { outDir, manifest } = await build([
    `ACME LTD,001,,,"FLAT 2, 10 HIGH STREET",,HASLINGDEN,,England,BB4 4AA,${LTD}`,
    `BETA LTD,002,,,"Flat 2,  10 High Street ",,Haslingden,,United Kingdom,bb44aa,${LTD}`,
    `GAMMA LTD,003,,,"FLAT 10, 10 HIGH STREET",,HASLINGDEN,,England,BB4 4AA,${LTD}`,
    `DELTA LTD,004,,,UNIT 3,MILL LANE,HASLINGDEN,,England,BB4 4AA,${LTD}`,
    `EPSILON LTD,005,,,UNIT 4,MILL LANE,HASLINGDEN,,England,BB4 4AA,${LTD}`,
    `POST LTD,006,,123,,,HASLINGDEN,,England,BB4 4AA,${LTD}`
  ])

  const content = JSON.parse(fs.readFileSync(path.join(outDir, 'BB4.json'), 'utf8'))

  assert.deepEqual(Object.keys(content), ['BB44AA'])
  assert.deepEqual(content.BB44AA, [
    'FLAT 10, 10 HIGH STREET, HASLINGDEN',
    'Flat 2, 10 High Street, Haslingden',
    'PO Box 123, HASLINGDEN',
    'UNIT 3, MILL LANE, HASLINGDEN',
    'UNIT 4, MILL LANE, HASLINGDEN'
  ].sort(require('./address').compareDisplay))
  assert.equal(manifest.counts.uniqueAddresses, 5)
  assert.equal(manifest.counts.rowsRetained, 6)
})

test('keeps every company type, and skips and counts rows with no usable postcode or address', async () => {
  const { outDir, manifest } = await build([
    'PLC CO,010,,,1 ROAD,,TOWN,,England,BB4 4AA,Public Limited Company',
    'PARTNERS LLP,014,,,2 ROAD,,TOWN,,England,BB4 4AA,Limited Liability Partnership',
    `NO POSTCODE,011,,,1 ROAD,,TOWN,,England,,${LTD}`,
    `BAD POSTCODE,012,,,1 ROAD,,TOWN,,England,BB4,${LTD}`,
    `NO ADDRESS,013,,,,,TOWN,,England,BB4 4AA,${LTD}`
  ])

  assert.equal(manifest.counts.rowsRead, 5)
  assert.equal(manifest.counts.skippedMissingPostcode, 1)
  assert.equal(manifest.counts.skippedInvalidPostcode, 1)
  assert.equal(manifest.counts.skippedMissingAddress, 1)
  assert.equal(manifest.counts.rowsRetained, 2)
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(outDir, 'BB4.json'), 'utf8')).BB44AA,
    ['1 ROAD, TOWN', '2 ROAD, TOWN']
  )
})

test('the same rows in another order give byte-identical files', async () => {
  const rows = [
    `A LTD,1,,,2 ROAD,,TOWN,,England,SW1A 1AA,${LTD}`,
    `B LTD,2,,,1 ROAD,,TOWN,,England,SW1A 2AA,${LTD}`,
    `C LTD,3,,,1 road,,town,,England,SW1A 2AA,${LTD}`,
    `D LTD,4,,,1 Road,,Town,,England,M1 1AE,${LTD}`
  ]
  const first = await build(rows)
  const second = await build([...rows].reverse())

  for (const file of fs.readdirSync(first.outDir)) {
    assert.equal(
      fs.readFileSync(path.join(first.outDir, file), 'utf8'),
      fs.readFileSync(path.join(second.outDir, file), 'utf8'),
      file
    )
  }
})

test('a rebuild removes files the new data no longer has', async () => {
  const { outDir } = await build([`A LTD,1,,,1 ROAD,,TOWN,,England,M1 1AE,${LTD}`])
  const { byOutward, counts } = await collect(csv([`A LTD,1,,,1 ROAD,,TOWN,,England,BB4 4AA,${LTD}`]))
  writeOutput(outDir, byOutward, { counts })

  assert.deepEqual(fs.readdirSync(outDir).sort(), ['BB4.json', 'manifest.json'])
})

test('lookup takes lowercase and spaced input, and refuses anything else', async () => {
  const { outDir } = await build([`A LTD,1,,,1 ROAD,,TOWN,,England,BB4 4AA,${LTD}`])

  assert.deepEqual(await lookupPostcode('  bb4   4aa ', { dir: outDir }), {
    status: 'found', postcode: 'BB4 4AA', addresses: ['1 ROAD, TOWN']
  })
  assert.equal((await lookupPostcode('BB4 4AB', { dir: outDir })).status, 'none')
  assert.equal((await lookupPostcode('ZZ9 9ZZ', { dir: outDir })).status, 'none')
  assert.equal((await lookupPostcode('', { dir: outDir })).status, 'missing')
  assert.equal((await lookupPostcode('BB4', { dir: outDir })).status, 'invalid')
  assert.equal((await lookupPostcode('../../x1aa', { dir: outDir })).status, 'invalid')
  assert.equal((await lookupPostcode('manifest', { dir: outDir })).status, 'invalid')
})

test('lookup refuses to answer when the files have not been built', async () => {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postcode-addresses-'))

  await assert.rejects(lookupPostcode('BB4 4AA', { dir: emptyDir }), /run npm run build:postcode-addresses/)
})

const {
  getPostcodeLookupAddresses,
  getPostcodeLookupAddressById,
  getPostcodeLookupAddressesForId
} = require('../../app/utils/postcode-lookup-addresses')

test('the journey forms get each address as an id, a label and form fields', async () => {
  const { outDir } = await build([
    `A LTD,1,,,FLAT 2 MILL HOUSE,3 MILL LANE,TOWN,,England,BB4 4AA,${LTD}`,
    `B LTD,2,,,UNIT 4,,TOWN,,England,BB4 4AA,${LTD}`
  ])

  const addresses = getPostcodeLookupAddresses(' bb4 4aa ', { dir: outDir })

  assert.deepEqual(addresses.map((address) => [address.id, address.label]), [
    ['ch-BB44AA-0', 'FLAT 2 MILL HOUSE, 3 MILL LANE, TOWN, BB4 4AA'],
    ['ch-BB44AA-1', 'UNIT 4, TOWN, BB4 4AA']
  ])
  assert.deepEqual(addresses[0].manual, {
    nameOrOrganisation: '',
    addressLine1: 'FLAT 2 MILL HOUSE',
    addressLine2: '3 MILL LANE',
    townOrCity: 'TOWN',
    county: '',
    postcode: 'BB4 4AA',
    country: 'United Kingdom'
  })
  assert.equal(addresses[1].manual.addressLine2, '')

  assert.deepEqual(getPostcodeLookupAddressById('ch-BB44AA-1', { dir: outDir }), addresses[1])
  assert.deepEqual(getPostcodeLookupAddressesForId('ch-BB44AA-1', { dir: outDir }), addresses)
})

test('the journey forms get nothing for an id that names no address', async () => {
  const { outDir } = await build([`A LTD,1,,,1 ROAD,,TOWN,,England,BB4 4AA,${LTD}`])

  for (const id of ['ch-BB44AA-1', 'ch-BB44AB-0', 'ch-BB4-0', 'ch-../../x-0', 'uk-address-1', '', undefined]) {
    assert.equal(getPostcodeLookupAddressById(id, { dir: outDir }), null, String(id))
  }
  assert.equal(getPostcodeLookupAddressesForId('uk-address-1', { dir: outDir }), null)
  assert.deepEqual(getPostcodeLookupAddresses('BB4', { dir: outDir }), [])
})

// ---------------------------------------------------------------------------
// Matching rules. Each case is a pair of real rows from the 1 November 2026
// snapshot, written as 'PO box|line 1|line 2|post town|county'. Company names
// and numbers are given only where a rule reads them.
// ---------------------------------------------------------------------------

const { recordSignature, decodeRecord, groupPostcode } = require('./address')

function rowOf (text, { name = 'TEST COMPANY', number = '' } = {}) {
  const [poBox = '', line1 = '', line2 = '', town = '', county = ''] = text.split('|')
  return {
    CompanyName: name,
    CompanyNumber: number,
    'RegAddress.POBox': poBox,
    'RegAddress.AddressLine1': line1,
    'RegAddress.AddressLine2': line2,
    'RegAddress.PostTown': town,
    'RegAddress.County': county
  }
}

// Groups rows the way the build does and says which entry each row is in.
function group (postcode, rows) {
  const compactPostcode = postcode.replace(/\s/g, '')
  const counts = new Map()
  const signatures = rows.map((row) => {
    const signature = recordSignature(row, compactPostcode)
    assert.ok(signature, `row has an address: ${JSON.stringify(row)}`)
    counts.set(signature, (counts.get(signature) || 0) + 1)
    return signature
  })
  const keys = [...counts.keys()].sort()
  const entries = groupPostcode(keys.map((signature) => decodeRecord(signature, counts.get(signature))))
  const entryOfRow = signatures.map((signature) => entries.find((entry) => entry.members.includes(keys.indexOf(signature))))
  return { entries, entryOfRow }
}

function pairRows ({ a, b, nameA, nameB, numberA, numberB, extra = [] }) {
  return [
    rowOf(a, { name: nameA, number: numberA }),
    rowOf(b, { name: nameB, number: numberB }),
    ...extra.map((text) => rowOf(text))
  ]
}

const MUST_MERGE = [
  { postcode: 'CF14 8LH', a: '4385|05114035 - COMPANIES HOUSE DEFAULT ADDRESS||CARDIFF|', numberA: '05114035', nameA: '3FOX INTERNATIONAL LIMITED', b: '4385|07197294 - COMPANIES HOUSE DEFAULT ADDRESS||CARDIFF|', numberB: '07197294', nameB: 'WATERFALL CLOSE RIGHT TO MANAGE LTD', shown: 'PO Box 4385, COMPANIES HOUSE DEFAULT ADDRESS, CARDIFF', why: 'only the own company number differs' },
  { postcode: 'CF14 8LH', a: '4385|05114035 - COMPANIES HOUSE DEFAULT ADDRESS||CARDIFF|', numberA: '05114035', b: '4385|11687501: COMPANIES HOUSE DEFAULT ADDRESS||CARDIFF|', numberB: '11687501', nameB: '10FOOT LIMITED', why: 'own number with a colon' },
  { postcode: 'CF14 8LH', a: '|PO BOX: 4385|10389646 - COMPANIES HOUSE DEFAULT ADDRESS|CARDIFF|', numberA: '10389646', nameA: 'COCO RETRO LIMITED', b: '4385|00054631 - COMPANIES HOUSE DEFAULT ADDRESS||CARDIFF|', numberB: '00054631', why: 'PO BOX: in line 1 equals the PO box field' },
  { postcode: 'CV21 3SS', a: '|STUDIO 3 EARL STREET STUDIOS|EARL STREET|RUGBY|', b: '10886209|STUDIO 3 EARL STREET STUDIOS|EARL STREET|RUGBY|', numberB: '10886209', nameB: 'TA COLLEGE LIMITED', why: 'PO box field holds the own company number' },
  { postcode: 'N1 7GU', a: '|20-22 WENLOCK ROAD||LONDON|', b: '|20 - 22 WENLOCK ROAD||LONDON|', why: 'spaces round the range dash' },
  { postcode: 'N1 7GU', a: '|20-22 WENLOCK ROAD||LONDON|', b: '|20-22 WENLOCK RD.||LONDON|', why: 'RD. at the end of the street' },
  { postcode: 'N1 7GU', a: '|20-22 WENLOCK ROAD||LONDON|', b: '|20-22 WENLOCK ROAD||LONDON|UNITED KINGDOM', why: 'country in county' },
  { postcode: 'N1 7GU', a: '|20-22 WENLOCK ROAD||LONDON|', b: '|20-22 WENLOCK ROAD|WENLOCK ROAD|LONDON|', why: 'line 2 contained in line 1' },
  { postcode: 'N1 7GU', a: '|20-22 WENLOCK ROAD||LONDON|', b: '|20-22 20-22 WENLOCK ROAD||LONDON|', why: 'doubled range token' },
  { postcode: 'N1 7GU', a: '|20-22 WENLOCK ROAD||LONDON|', b: '|20-22 WENLOCK ROAD|N1 7GU|LONDON|', why: 'own postcode as a line' },
  { postcode: 'N1 7GU', a: '|20-22 WENLOCK ROAD||LONDON|', b: 'N1 7GU|20-22 WENLOCK ROAD||LONDON|', why: 'PO box field holds the own postcode' },
  { postcode: 'N1 7GU', a: '|20-22 WENLOCK ROAD||LONDON|', b: '|20-22 WENLOCK ROAD||LONDON|--- SELECT ---', why: 'web-form placeholder' },
  { postcode: 'N1 7GU', a: '|20-22 WENLOCK ROAD||LONDON|', b: '|20-22 WENLOCK ROAD,||LONDON|', why: 'doubled comma' },
  { postcode: 'N1 7GU', a: '|20 WENLOCK ROAD||LONDON|', b: '|ZEZT LTD|20 WENLOCK ROAD|LONDON|', nameB: 'ZEZT LTD', why: 'own full name as line 1' },
  { postcode: 'N1 7GU', a: '|20-22 WENLOCK ROAD||LONDON|', b: '|C/O COMPANIES MADE SIMPLE|20-22 WENLOCK ROAD|LONDON|', nameB: 'RIVEN GALLERY LTD', why: 'care-of part dropped' },
  { postcode: 'N1 7GU', a: '|SUITE 11527 20-22 WENLOCK ROAD||LONDON|', nameA: 'FAPUMA LIMITED', b: '|SUITE 11527|20-22 WENLOCK ROAD|LONDON|', nameB: 'GRABOWSKI HOLDINGS LIMITED', why: 'comma placement only' },
  { postcode: 'N1 7GU', a: '|SUITE LP34875|20-22 WENLOCK ROAD|LONDON|', nameA: 'SIEJOV CONSULTING LIMITED', b: '|SUITE LP34875|20-22 WENLOCK ROAD|LONDON|LONDON', nameB: 'WESTECH CONSULTANCY LTD.', why: 'town repeated in county' },
  { postcode: 'EC1V 2NX', a: '|124|CITY ROAD|LONDON|', b: '|PROCET LTD 124|CITY ROAD|LONDON|', nameB: 'PROCET LTD', why: 'own full name as a leading span' },
  { postcode: 'E6 2JA', a: '|OFFICE 19|182-184 HIGH STREET NORTH, EAST HAM|LONDON|', b: '|182-184 HIGH STREET NORTH|OFFICE 19|LONDON|', extra: ['|1 HIGH STREET NORTH||EAST HAM|', '|3 HIGH STREET NORTH||EAST HAM|'], why: 'office position, and EAST HAM is a place word here' },
  { postcode: 'E6 2JA', a: '|182-184 HIGH STREET NORTH|EAST HAM|LONDON|', b: '|182-184 HIGH STREET NORTH||LONDON|', extra: ['|1 HIGH STREET NORTH||EAST HAM|', '|3 HIGH STREET NORTH||EAST HAM|'], why: 'place word after a numbered part' },
  { postcode: 'IG6 3SZ', a: '|OFFICE 1251|58 PEREGRINE ROAD|ILFORD|', b: '|58 PEREGRINE ROAD|OFFICE 1251|ILFORD|', why: 'designator position' },
  { postcode: 'EC2A 4NE', a: '|4TH FLOOR|86-90 PAUL STREET|LONDON|', b: '|4TH FLOOR|86-90 PAUL ST|LONDON|', why: 'ST after a word is STREET' },
  { postcode: 'W1W 5PF', a: '|167-169 GREAT PORTLAND STREET|5TH. FLOOR|LONDON|', b: '|167-169 GREAT PORTLAND STREET|FIFTH FLOOR|LONDON|', why: 'digit and word ordinals' },
  { postcode: 'W1W 5PF', a: '|167-169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|', b: '|167-169 GREAT PORTLAND STREET, 5TH FLOOR||LONDON|', why: 'same text, different field split' },
  { postcode: 'SW18 3DF', a: '|1ST FLOOR FLAT|297 EARLSFIELD ROAD|LONDON|', b: '|FIRST FLOOR FLAT|297 EARLSFIELD ROAD|LONDON|', why: 'same floor flat' },
  { postcode: 'BN10 7HA', a: '|FLAT 8|GEORGE COURT 367 SOUTH COAST ROAD, TELSCOMBE CLIFFS|PEACEHAVEN|', b: '|FLAT 08|GEORGE COURT 367 SOUTH COAST ROAD, TELSCOMBE CLIFFS|PEACEHAVEN|', why: 'leading zero' },
  { postcode: 'E1 1DT', a: '|SUITE 2, GROUND FLOOR|129, WHITECHAPEL ROAD|LONDON|', b: '|SUITE 02, GROUND FLOOR|129 WHITECHAPEL ROAD|LONDON|', why: 'leading zero and stray comma' },
  { postcode: 'B1 2AF', a: '|APARTMENT 13|38 PARADISE STREET|BIRMINGHAM|', b: '|APT 13|38 PARADISE STREET|BIRMINGHAM|', why: 'APT is APARTMENT' },
  { postcode: 'E3 2QJ', a: '|FLAT 74, 91 FAIRFIELD ROAD|FLAT 74, 91 FAIRFIELD ROAD|LONDON|', b: '|FLAT 74|91 FAIRFIELD ROAD|LONDON|', why: 'lines repeated' },
  { postcode: 'B31 5PB', a: '|FLAT 1|92 NORRINGTON ROAD|BIRMINGHAM|', b: '|FLAT 1,|92 NORRINGTON ROAD, B31 5PB|BIRMINGHAM|', why: 'doubled comma and own postcode' },
  { postcode: 'IM8 1GB', a: "|1ST FLOOR, 1ST FLOOR|VIKING HOUSE, ST PAUL'S SQUARE|RAMSEY|", b: "|1ST FLOOR|VIKING HOUSE, ST PAUL'S SQUARE|RAMSEY|", why: 'floor part repeated' },
  { postcode: 'BS1 6FL', a: '|FIRST FLOOR TEMPLEBACK|10 TEMPLE BACK|BRISTOL|', b: '|FIRST FLOOR|TEMPLEBACK, 10 TEMPLE BACK|BRISTOL|', why: 'comma placement' },
  { postcode: 'AB24 2QL', a: '|19 A FERRIER CRESCENT||ABERDEEN|', b: '|19A FERRIER CRESCENT||ABERDEEN|', why: 'letter suffix split by a space' },
  { postcode: 'B11 4AE', a: '|468/A STRATFORD ROAD|SPARKHILL|BIRMINGHAM|', b: '|468A STRATFORD ROAD|SPARKHILL|BIRMINGHAM|', why: 'slash before a letter suffix' },
  { postcode: 'G41 3TY', a: '|0/1 15 QUENTIN STREET||GLASGOW|GLASGOW CITY', b: '|0/1 15 QUENTIN STREET||GLASGOW|', why: 'county only' },
  { postcode: 'EH2 3JP', a: '|3F1 THIRD FLOOR|3 HILL STREET|EDINBURGH|', b: '|3F1 THIRD FLOOR|3 HILL STREET, HILL STREET|EDINBURGH|', why: 'contained part repeated' },
  { postcode: 'EH2 4AN', a: '|5 SOUTH CHARLOTTE STREET||EDINBURGH|', b: '|5 SOUTH CHARLOTTE STREET||EDINBURGH|MIDLOTHIAN', why: 'county only' },
  { postcode: 'BT49 0EU', a: '|C/O PFS & PARTNERS|16 MAIN STREET|LIMAVADY|COUNTY LONDONDERRY', b: '|C/O PFS & PARTNERS|16 MAIN STREET|LIMAVADY|CO. DERRY', why: 'county written two ways' },
  { postcode: 'CF64 4YR', a: '|10 Y SGWAR|HEOL YR ORSAF|DINAS POWYS|CYMRU / WALES', b: '|10 Y SGWAR|HEOL YR ORSAF|DINAS POWYS|BRO MORGANNWG', why: 'county only' },
  { postcode: 'BT48 0RP', a: '|91 KYLEMORE PARK||LONDONDERRY|', b: '|91 KYLEMORE PARK||DERRY|', why: 'town written two ways' },
  { postcode: 'DD10 9LN', a: '|OLD MONTROSE HOUSE||MONTROSE|ANGUS', b: '|OLD MONTROSE HOUSE||BY MONTROSE|ANGUS', why: 'town only' },
  { postcode: 'LL28 5BS', a: '|QUINTON HAZEL ENTERPRISE PARC|GLAN-Y-WERN ROAD|COLWYN BAY|', b: '|QUINTON HAZEL ENTERPRISE PARC|GLAN-Y-WERN ROAD|BAE COLWYN|CONWY', why: 'town in two languages' },
  { postcode: 'AB34 5BR', a: '|SAACH-HA|SAACH-HA|ABOYNE|', b: '|SAACH-HA||ABOYNE|ABERDEENSHIRE', why: 'house name repeated' },
  { postcode: 'SA48 8NX', a: '|BETTWS FARM HOUSE|BETTWS BLEDRWS|LAMPETER|', b: '|BETTWS FARMHOUSE|BETTWS BLEDRWS|LAMPETER|CEREDIGION', why: 'FARM HOUSE is FARMHOUSE' },
  { postcode: 'G75 0RD', a: '|KELVIN BUILDING BRAMAH AVENUE|EAST KILBRIDE|GLASGOW|', b: '|THE KELVIN BUILDING BRAMAH AVENUE|EAST KILBRIDE|GLASGOW|', why: 'leading THE' },
  { postcode: 'KW17 2TQ', a: '|THE CASTLE|GRIMNESS|SOUTH RONALDSAY|ORKNEY', b: '|THE CASTLE, GRIMNESS|SOUTH RONALDSAY|ORKNEY|', why: 'byte-identical display' },
  { postcode: 'EH4 3LU', a: '|16 RAVELSTON HOUSE PARK||EDINBURGH|', b: '|C/O STUART & CO|16 RAVELSTON HOUSE PARK|EDINBURGH|', why: 'care-of part dropped' },
  { postcode: 'AB10 1BL', a: '|1 MARISCHAL SQUARE|BROAD STREET|ABERDEEN|', b: '|C/O HENDERSON LOGGIE 1 MARISCHAL SQUARE|BROAD STREET|ABERDEEN|', why: 'care-of cut at the house number' },
  { postcode: 'AB15 4ZT', a: "|2 QUEEN'S ROAD||ABERDEEN|", b: "|C/O HUTCHEON MEARNS|2 QUEEN'S ROAD|ABERDEEN|", why: 'care-of firm part' },
  { postcode: 'AL1 3LF', a: "|CENSEO HOUSE|6 ST PETER'S STREET|ST ALBANS|HERTFORDSHIRE", b: '|CENSEO HOUSE|6 ST PETER’S STREET|ST ALBANS|HERTFORDSHIRE', why: 'straight and curly apostrophes' },
  { postcode: 'CV6 7AA', a: '|4 ST LAWRENCES ROAD||COVENTRY|', b: '|4 SAINT LAWRENCES ROAD||COVENTRY|', why: 'ST after a house number is SAINT' },
  { postcode: 'DE6 1GP', a: '|THE OLD VICARAGE|51 ST. JOHN STREET|ASHBOURNE|DERBYSHIRE', b: '|THE OLD VICARAGE|51 SAINT JOHN STREET|ASHBOURNE|DERBYSHIRE', why: 'ST. and SAINT' },
  { postcode: 'AB10 1PS', a: '|12-16 ALBYN PLACE||ABERDEEN|', b: '|12 -16 ALBYN PLACE||ABERDEEN|', why: 'spacing round a range dash' },
  { postcode: 'B3 2DB', a: '1|3 COLMORE ROW||BIRMINGHAM|', b: '|P.O.BOX 1|3 COLMORE ROW|BIRMINGHAM|', why: 'PO box spelling' },
  { postcode: 'B19 2TH', a: '|44A LOZELLS ROAD||BIRMINGHAM|', b: '|44A LOZELLS ROAD||BIRMINGHAM|ENGLAND', why: 'country word' },
  { postcode: 'E7 8AB', a: '|401 ROMFORD ROAD||LONDON|', b: '|401 ROMFORD ROAD||LONDON|-', why: 'punctuation-only part' },
  { postcode: 'BB4 4JG', a: '|UNIT 4 DEWAN INDUSTRIAL ESTATE|YORK AVENUE|HASLINGDEN|ROSSENDALE', nameA: 'COLLISION SOLUTIONS LIMITED', b: '|UNIT 4 YORK AVENUE|HASLINGDEN|ROSSENDALE|', nameB: 'ONE CALL PROPERTY LETTINGS LTD', extra: ['|UNIT 1 YORK AVENUE||HASLINGDEN|ROSSENDALE'], why: 'estate run absent, and HASLINGDEN is a place word' },
  { postcode: 'B70 9BS', a: '|UNIT 19 IZONS INDUSTRIAL ESTATE|OLDBURY ROAD|WEST BROMWICH|', b: '|UNIT 19|OLDBURY ROAD|WEST BROMWICH|', why: 'estate run absent' },
  { postcode: 'LE7 7JA', a: '|UNIT 2 WOODSIDE BUSINESS PARK ANSTEY LANE|THURCASTON|LEICESTER|', b: '|UNIT 2 ANSTEY LANE|THURCASTON|LEICESTER|', why: 'inline estate run absent' },
  { postcode: 'TS25 1TZ', a: '|UNIT 21 MAINSFORTH TERRACE|NEWBURN BRIDGE INDUSTRIAL ESTATE|HARTLEPOOL|', b: '|UNIT 21 NEWBURN BRIDGE INDUSTRIAL ESTATE|MAINSFORTH TERRACE|HARTLEPOOL|', why: 'estate run on the other side' },
  { postcode: 'SN2 7JQ', a: '|UNIT 6|HEADLANDS INDUSTRIAL ESTATE|SWINDON|', b: '|UNIT 6|HEADLANDS TRADING ESTATE|SWINDON|', why: 'site type swapped' },
  { postcode: 'SO30 2JH', a: '|UNIT 6 NELSON INDUSTRIAL ESTATE|HERALD ROAD|HEDGE END|HAMPSHIRE', b: '|UNIT 6 NELSON INDUSTRIAL PARK|HERALD ROAD|HEDGE END|HAMPSHIRE', why: 'ESTATE and PARK' },
  { postcode: 'PO8 0BT', a: '|UNIT 29 HIGHCROFT IND EST|ENTERPRISE ROAD|HORNDEAN|', b: '|UNIT 29 HIGHCROFT INDUSTRIAL ESTATE|ENTERPRISE ROAD|HORNDEAN|', why: 'IND EST' },
  { postcode: 'DE14 1DU', a: '|12 GRANARY WHARF BUS PARK|WETMORE ROAD|BURTON UPON TRENT|', b: '|12 GRANARY WHARF BUSINESS PARK|WETMORE ROAD|BURTON UPON TRENT|', why: 'BUS PARK' },
  { postcode: 'FK8 1SH', a: '|11 BACK O HILL ROAD INDUSTRIAL ESTATE||STIRLING|', nameA: 'ACF WOODLAND CONTRACTS LIMITED', b: '|UNIT 11|BACK O HILL ROAD INDUSTRIAL ESTATE|STIRLING|', nameB: 'AC GOLD ENERGY LIMITED', why: 'a bare id before an estate run is the unit' },
  { postcode: 'B64 7DW', a: '|A2 CRADLEY BUSINESS PARK|OVEREND ROAD|CRADLEY HEATH|', b: '|UNIT A2 CRADLEY BUSINESS PARK|OVEREND ROAD|CRADLEY HEATH|', why: 'optional UNIT before an estate run' },
  // Round 1 checks: a town or county field that holds an id is a line.
  { postcode: 'W1T 2EW', a: '|60 TOTTENHAM COURT ROAD||LONDON|SUITE 951', b: '|60 TOTTENHAM COURT ROAD|SUITE 951|LONDON|', why: 'a suite in the county field is the same suite' },
  { postcode: 'IM99 1HP', a: '|2A LORD STREET||DOUGLAS|PO BOX 95', b: '95|2A LORD STREET||DOUGLAS|', why: 'a PO box in the county field is the same box' },
  // Round 1 checks: a building named in a care-of part is kept.
  { postcode: 'IV2 3BW', a: '|C/O SAFFERY TORRIDON HOUSE|BEECHWOOD PARK|INVERNESS|', b: '|C/O SAFFERY LLP, TORRIDON HOUSE|BEECHWOOD PARK|INVERNESS|', why: 'care-of firm before a building, with and without a comma' },
  { postcode: 'SG8 9JN', a: '|C/O HARDCASTLE BURTON LAKE HOUSE|MARKET HILL|ROYSTON|', b: '|C/O HARDCASTLE BURTON LLP LAKE HOUSE|MARKET HILL|ROYSTON|', why: 'care-of firm with and without LLP before a building' },
  { postcode: 'LS22 6LE', a: '|C/O BRAYS RIVERVIEW COURT|CASTLE GATE|WETHERBY|WEST YORKSHIRE', b: '|RIVERVIEW COURT|CASTLE GATE|WETHERBY|', shown: 'RIVERVIEW COURT, CASTLE GATE, WETHERBY', why: 'care-of building kept' },
  { postcode: 'BT1 6DN', a: '|C/O MURRAY HOUSE|MURRAY STREET|BELFAST|', b: '|C/O CARSON MCDOWELL LLP MURRAY HOUSE|MURRAY STREET|BELFAST|', why: 'building straight after C/O, and after a firm' },
  // Round 1 checks: leftover duplicates.
  { postcode: 'EC1V 2NX', a: '|ABYSS ENGINE|124 CITY ROAD|LONDON|', nameA: 'ABYSS ENGINE LTD', b: '|124 CITY ROAD||LONDON|', why: 'own name without its suffix as line 1' },
  { postcode: 'W1T 2EW', a: '|60 TOTTENHAM COURT ROAD SUITE 969A|FITZROVIA|LONDON|', b: '|60 TOTTENHAM COURT ROAD, SUITE 969A|FITZROVIA|LONDON|', why: 'a suite later in a part' },
  { postcode: 'TW8 9ES', a: '|PROFILE WEST SUITE D SECOND FLOOR|950 GREAT WEST ROAD|BRENTFORD|', b: '|PROFILE WEST, SUITE D SECOND FLOOR|950 GREAT WEST ROAD|BRENTFORD|', why: 'a suite after a building name' },
  { postcode: 'IG6 3SZ', a: 'OFFICE 195|58 PEREGRINE ROAD||ILFORD|', b: '|OFFICE 195|58 PEREGRINE ROAD|ILFORD|', shown: 'OFFICE 195, 58 PEREGRINE ROAD, ILFORD', why: 'a PO box field that is not a box number' },
  { postcode: 'WV6 0SR', a: '|OFFICE|1059 ,85 DUNSTALL HILL|WOLVERHAMPTON|', b: '|OFFICE 1059|85 DUNSTALL HILL|WOLVERHAMPTON|', why: 'a comma between a designator and its id' },
  { postcode: 'W1W 5PF', a: '|167-169 GREAT PORTLAND STREET 5TH FLOOR LONDON 167-169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|', b: '|167-169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|', why: 'the whole address written twice' },
  { postcode: 'IP28 7DE', a: '|SUITE A 82 JAMES CARTER ROAD SUITE A|82 JAMES CARTER ROAD|MILDENHALL|', b: '|SUITE A|82 JAMES CARTER ROAD|MILDENHALL|', why: 'a line repeated after a designator' },
  { postcode: 'EC1V 2NX', a: '|124 CITY RD LONDON|CITY ROAD|LONDON|', b: '|124 CITY ROAD||LONDON|', why: 'RD before a place word' },
  { postcode: 'W1W 5PF', a: '|167 169 GREAT PORTLAND STREET||LONDON|', b: '|167-169 GREAT PORTLAND STREET||LONDON|', why: 'a range written with a space, when the dashed range is at the postcode' },
  { postcode: 'W1W 5PF', a: '|167/169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|', b: '|167-169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|', why: 'a range written with a slash, when the dashed range is at the postcode' },
  { postcode: 'L1 0AH', a: '|49 JAMAICA STREET|LEVEL 1, BASECAMP LIVERPOOL|LIVERPOOL|', b: '|49 JAMAICA STREET|LEVEL ONE, BASECAMP LIVERPOOL|LIVERPOOL|', why: 'LEVEL 1 and LEVEL ONE' },
  { postcode: 'SW2 1BZ', a: '|UNIT 40 THE LINK|49 EFFRA ROAD|LONDON|', b: '|UNIT 40, THE LINK|49 EFFRA ROAD|LONDON|', why: 'THE after a unit id' },
  { postcode: 'BS37 7QN', a: '|SPRING HOUSE BURY HILL LANE|YATE|BRISTOL|', b: '|SPRING HOUSE, BURY HILL LANE||YATE|BRISTOL', extra: ['|1 BURY HILL LANE||YATE|'], why: 'a place word as a line after a named premises' },
  { postcode: 'LS16 6QY', a: '|ALPHA HOUSE LAWNSWOOD BUSINESS PARK|REDVERS CLOSE|LEEDS|', b: '|ALPHA HOUSE|LAWNSWOOD BUSINESS PARK, REDVERS CLOSE|LEEDS|', why: 'an estate run stops at a building name' },
  { postcode: 'L12 1LN', a: '|DMP ACCOUNTANTS LTD THE ORCHARD|27 SANDFORTH ROAD|LIVERPOOL|', b: '|THE ORCHARD|27 SANDFORTH ROAD|LIVERPOOL|MERSEYSIDE', why: 'another firm before the premises in one part' },
  { postcode: 'NE30 1AY', a: '|THE OLD POST OFFICE 63 SAVILLE STREET||NORTH SHIELDS|', b: '|THE OLD POST OFFICE, 63 SAVILLE STREET||NORTH SHIELDS|', why: 'OFFICE before a house number and street is not a designator' },
  // Round 2 checks: care-of parts.
  { postcode: 'DN6 7BD', a: '|C/O IAA UK AUCTIONS LIMITED BENTLEY MOOR LANE|ADWICK-LE-STREET|DONCASTER|', b: '|BENTLEY MOOR LANE|ADWICK-LE-STREET|DONCASTER|SOUTH YORKSHIRE', why: 'the street after a care-of firm\'s legal suffix is kept' },
  { postcode: 'DN6 7BD', a: '|C/O A HAULAGE FIRM BENTLEY MOOR LANE|ADWICK-LE-STREET|DONCASTER|', b: '|BENTLEY MOOR LANE|ADWICK-LE-STREET|DONCASTER|', why: 'a care-of street with no suffix is kept as long as a line at the postcode' },
  { postcode: 'ST3 2JA', a: '|C/O GRINDCO 427 LTD|UNIT 62, LONGTON EXCHANGE|STOKE-ON-TRENT|STAFFORDSHIRE', b: '|UNIT 62 LONGTON EXCHANGE|LONGTON|STOKE-ON-TRENT|STAFFORDSHIRE', why: 'a whole care-of part whose firm name holds a number' },
  { postcode: 'HA1 2SP', a: '|C/O METROPOLITAN ACCOUNTANTS LTD PHOENIX BUSINESS CENTRE-OFFICE 10|ROSSLYN CRESCENT|HARROW|MIDDLESEX', b: '|PHOENIX BUSINESS CENTRE - OFFICE 10|ROSSLYN CRESCENT|HARROW|', why: 'a designator glued to a building word by a hyphen' },
  { postcode: 'BH1 3JW', a: '|C/O HOUSE & SON LANSDOWNE HOUSE|CHRISTCHURCH ROAD|BOURNEMOUTH|', b: '|LANSDOWNE HOUSE|CHRISTCHURCH ROAD|BOURNEMOUTH|', shown: 'LANSDOWNE HOUSE, CHRISTCHURCH ROAD, BOURNEMOUTH', why: '"& SON" ends the care-of firm' },
  { postcode: 'LN1 1XW', a: '|C/O STREETS LLP TOWER HOUSE|LUCY TOWER STREET|LINCOLN|LINCOLNSHIRE', b: '|TOWER HOUSE|LUCY TOWER STREET|LINCOLN|', why: 'two building words after a care-of firm are one name' },
  { postcode: 'LN1 1XW', a: '|STREETS LLP TOWER HOUSE|LUCY TOWER STREET|LINCOLN|', b: '|TOWER HOUSE|LUCY TOWER STREET|LINCOLN|', why: 'a firm before a named building, with no C/O' },
  { postcode: 'CV32 7JW', a: '|24 C/O AGS CONSULTANCY|24 BLACKBERRY WAY|LEAMINGTON SPA|', b: '|24 BLACKBERRY WAY||LEAMINGTON SPA|WARWICKSHIRE', why: 'a house number before C/O, written again after it' },
  { postcode: 'CV32 7JW', a: '|24 C.O. AGS 24 BLACKBERRY WAY|CUBBINGTON|LEAMINGTON SPA|', b: '|24 BLACKBERRY WAY|CUBBINGTON|LEAMINGTON SPA|WARWICKSHIRE', why: 'a house number before C.O., written again after it in the same part' },
  { postcode: 'SE10 0PX', a: '|C/O CHRIS HODGE COMMERCIAL|LIMITED, PETERBOAT CLOSE|LONDON|', b: '|PETERBOAT CLOSE||LONDON|', why: 'a care-of firm\'s suffix spilt into line 2' },
  { postcode: 'NN11 6YE', a: '|C/O OLD CHAPEL THE GREEN|LOWER BODDINGTON|DAVENTRY|', b: '|OLD CHAPEL THE GREEN|LOWER BODDINGTON|DAVENTRY|', why: 'CHAPEL names a building after C/O' },
  { postcode: 'NN11 6YE', a: '|C/O OLD CHAPEL|THE GREEN|LOWER BODDINGTON|', b: '|OLD CHAPEL|THE GREEN|LOWER BODDINGTON|NORTHAMPTONSHIRE', why: 'CHAPEL names a building as a whole care-of part' },
  { postcode: 'NN11 6YE', a: '|CAMPBELL ACCOUNTANCY LIMITED OLD CHAPEL|THE GREEN|LOWER BODDINGTON|', b: '|OLD CHAPEL|THE GREEN|LOWER BODDINGTON|', why: 'a firm before a named building, with no number anywhere' },
  { postcode: 'CH8 7TX', a: '|C/O THE OLD POLICE STATION|HALKYN STREET|HOLYWELL|FLINTSHIRE', b: '|THE OLD POLICE STATION|HALKYN STREET|HOLYWELL|FLINTSHIRE', shown: 'THE OLD POLICE STATION, HALKYN STREET, HOLYWELL, FLINTSHIRE', why: 'C/O THE names a building' },
  { postcode: 'CH8 7TX', a: '|C/O CHRISTIAN & CO LTD THE OLD POLICE STATION|HALKYN STREET|HOLYWELL|', b: '|THE OLD POLICE STATION|HALKYN STREET|HOLYWELL|FLINTSHIRE', why: 'a building after a care-of firm\'s suffix' },
  { postcode: 'EH3 8EX', a: '|C/O EDF ENERGY RENEWABLES LIMITED ATRIA ONE|144 MORRISON STREET|EDINBURGH|', b: '|ATRIA ONE|144 MORRISON STREET|EDINBURGH|', why: 'a building with no building word after a care-of firm\'s suffix' },
  { postcode: 'BD10 9TQ', a: '|C/O INSOLVENCY ONE ALBION MILLS BUSINESS CENTRE|GREENGATES|BRADFORD|', b: '|ALBION MILLS BUSINESS CENTRE|GREENGATES|BRADFORD|', why: 'MILLS names a building' },
  { postcode: 'NP25 3SR', a: '|C/O PARALLEL ACCOUNTING LTD WYASTONE BUSINESS ESTATE|GANAREW|MONMOUTH|', b: '|WYASTONE BUSINESS PARK|GANAREW|MONMOUTH|', why: 'an estate after a care-of firm\'s suffix' },
  { postcode: 'BA3 4BD', a: '|C/O WOODPECKER FURNITURE LIMITED CHARLTON LANE|MIDSOMER NORTON|RADSTOCK|SOMERSET', b: '|CHARLTON LANE|MIDSOMER NORTON|RADSTOCK|SOMERSET', why: 'a street after a care-of firm\'s suffix' },
  { postcode: 'L37 4AQ', a: '|C/O V&R ACCOUNTANCY SERVICES CROPTON HOUSE|THREE TUNS LANE|FORMBY|MERSEYSIDE', b: '|CROPTON HOUSE|THREE TUNS LANE|FORMBY|', why: 'SERVICES ends a care-of firm' },
  // Round 2 checks: own company names.
  { postcode: 'E11 2RJ', a: '|GRAFTON234 LTD, WANSTEAD WORKS 34-40 HIGH STREET|WANSTEAD|LONDON|', nameA: 'GRAFTON234 LTD', b: '|WANSTEAD WORKS 34-40 HIGH STREET|WANSTEAD|LONDON|', why: 'own name with a number glued to it' },
  { postcode: 'EC1V 2NX', a: '|124 CITY ROAD METERZ LTD.||LONDON|', nameA: 'METERZ LTD', b: '|124 CITY ROAD||LONDON|', why: 'own full name at the end of a line' },
  { postcode: 'EC1V 2NX', a: '|124 C&H BROWN LTD|CITY ROAD|LONDON|', nameA: 'C&H BROWN LTD', b: '|124 CITY ROAD||LONDON|', why: 'own full name after the house number' },
  // Round 2 checks: leftover duplicates.
  { postcode: 'EC1V 2NX', a: '|KEMP HOUSE|160 CITY ROAD|LONDON|', b: '|160 CITY ROAD|KEMP HOUSE|LONDON|', why: 'the same parts in another order' },
  { postcode: 'HX6 2AG', a: '|THE GATE HOUSE|THE WHARF|SOWERBY BRIDGE|', b: '|THE WHARF|THE GATE HOUSE|SOWERBY BRIDGE|WEST YORKSHIRE', why: 'the same named parts in another order' },
  { postcode: 'G2 1BP', a: '|CLYDE OFFICES 2/3|48 WEST GEORGE STREET|GLASGOW|', b: '|48 WEST GEORGE STREET|CLYDE OFFICES 2/3|GLASGOW|', why: 'a Glasgow office and its street in another order' },
  { postcode: 'EC2A 4NE', a: '|3RD FLOOR|86-90, 86-90 PAUL STREET|LONDON|', b: '|3RD FLOOR|86-90 PAUL STREET|LONDON|', why: 'a lone range written again with its street' },
  { postcode: 'W1W 5PF', a: '|167-169 GREAT PORTLAND ST 167-169 GREAT PORTLAND ST|5TH FLOOR|LONDON|', b: '|167-169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|', why: 'an abbreviated street written twice' },
  { postcode: 'EC1V 2NX', a: '|124 CITY ROAD|OLD STREET|LONDON|', b: '|124 CITY ROAD||LONDON|', extra: ['|124 CITY ROAD||OLD STREET|LONDON', '|124 CITY ROAD||LONDON|'], why: 'an entry that shows a text another entry holds' },
  { postcode: 'N1 7AA', a: '|275 OFFICE 535|275 NEW NORTH ROAD|LONDON|', b: '|OFFICE 535|275 NEW NORTH ROAD|LONDON|', why: 'a house number before a designator, written again with its street' },
  { postcode: 'E6 2JA', a: '|182-184 OFFICE 15278 182-184 HIGH STREET NORTH|EAST HAM|LONDON|', b: '|OFFICE 15278 182-184 HIGH STREET NORTH|EAST HAM|LONDON|', why: 'a range before a designator, written again with its street' },
  { postcode: 'N1 7AA', a: '|275 275 NEW NORTH ROAD|SUITE 348|LONDON|', b: '|275 NEW NORTH ROAD|SUITE 348|LONDON|', why: 'a doubled house number in an address with a suite' },
  { postcode: 'N1 7AA', a: '|UNIT #2255 275 NEW NORTH ROAD||LONDON|', b: '|UNIT 2255 275 NEW NORTH ROAD||LONDON|', why: '# before a unit id' },
  { postcode: 'W1T 2EW', a: '|60 TOTTENHAM COURT ROAD|OFFICE 322 FITZROVIA|LONDON|', b: '|60 TOTTENHAM COURT ROAD|OFFICE 322, FITZROVIA|LONDON|', extra: ['|1 TOTTENHAM COURT ROAD||FITZROVIA|', '|3 TOTTENHAM COURT ROAD||FITZROVIA|'], why: 'a place word after an office id' },
  { postcode: 'N1 7AA', a: '|275 NEW NORTH ROAD|ISLINGTON SUITE 1382|LONDON|', b: '|275 NEW NORTH ROAD|ISLINGTON, SUITE 1382|LONDON|', extra: ['|1 NEW NORTH ROAD||ISLINGTON|', '|3 NEW NORTH ROAD||ISLINGTON|'], why: 'a place word before a suite' },
  { postcode: 'E6 2JA', a: '|OFFICE 874, 182-184 HIGH STREET|NORTH EAST HAM|LONDON|', b: '|OFFICE 874 182-184 HIGH STREET NORTH|EAST HAM|LONDON|', extra: ['|1 HIGH STREET NORTH||EAST HAM|', '|3 HIGH STREET NORTH||EAST HAM|'], why: 'a comma between a street and its compass word' },
  { postcode: 'DA5 1LU', a: '|THE COACH HOUSE UNIT 42 66-70 BOURNE ROAD||BEXLEY|KENT', b: '|THE COACH HOUSE UNIT 42|66-70 BOURNE ROAD|BEXLEY|KENT', why: 'a unit mid-part before a house number range' },
  { postcode: 'TW8 9DN', a: '|24 TAX SUITE 137B WESTLINK HOUSE 981|GREAT WEST ROAD|BRENTFORD|', b: '|24 TAX SUITE 137B, WESTLINK HOUSE|981 GREAT WEST ROAD|BRENTFORD|', why: 'a suite mid-part before a building name' },
  { postcode: 'TS22 5TB', a: '|FLANNAGANS UNIT 3A EVOLUTION|WYNYARD AVENUE, WYNYARD BUSINESS PARK|BILLINGHAM|CLEVELAND', b: '|FLANNAGANS, UNIT 3A EVOLUTION WYNYARD AVENUE|WYNYARD BUSINESS PARK|BILLINGHAM|CLEVELAND', why: 'a unit mid-part, commas moved' },
  { postcode: 'FY5 4EZ', a: '|UNIT 3A REAR OF UNIT 3 BROOKSIDE|RED MARSH IND. ESTATE|THORNTON-CLEVELEYS|LANCASHIRE', b: '|UNIT 3A REAR OF UNIT 3, BROOKSIDE|RED MARSH IND. ESTATE|THORNTON CLEVELEYS|LANCASHIRE', why: 'a unit mid-part before a word' },
  { postcode: 'SE24 9DA', a: '|UNITS 2-5 CROXTED MEWS|286/288 CROXTED ROAD|LONDON|', b: '|UNIT 2-5 CROXTED MEWS|286/288 CROXTED ROAD|LONDON|', why: 'UNITS before an id is UNIT' },
  { postcode: 'ME5 7DX', a: '|UNIT 20 HOPEWELL BUS CENT|105 HOPEWELL DRIVE|CHATHAM|KENT', b: '|UNIT 20 HOPEWELL BUSINESS CENTRE|105 HOPEWELL DRIVE|CHATHAM|KENT', why: 'BUS CENT is BUSINESS CENTRE' }
]

const MUST_NOT_MERGE = [
  { postcode: 'N1 7GU', a: '|SUITE LP64621|20 WENLOCK ROAD|LONDON|', b: '|SUITE LP69530|20 WENLOCK ROAD|LONDON|', why: 'different suites' },
  { postcode: 'N1 7GU', a: '|20-22 SUITE LP28087|WENLOCK ROAD|LONDON|', b: '|SUITE LP29087|20 - 22 WENLOCK ROAD|LONDON|', why: 'suites one digit apart' },
  { postcode: 'N1 7GU', a: '|SUITE LP7356|20-22 WENLOCK ROAD|LONDON|', b: '|20-22 WENLOCK ROAD||LONDON|', why: 'suite vs building' },
  { postcode: 'N1 7GU', a: '|2 WENLOCK ROAD||LONDON|', b: '|20 WENLOCK ROAD||LONDON|', why: 'house numbers one digit apart' },
  { postcode: 'N1 7GU', a: '|22 WENLOCK ROAD||LONDON|', b: '|20-22 WENLOCK ROAD||LONDON|', why: 'number vs range' },
  { postcode: 'N1 7GU', a: '|20 20 WENLOCK ROAD||LONDON|', b: '|20 WENLOCK ROAD||LONDON|', why: 'doubled bare number' },
  { postcode: 'CA3 8RR', a: '|FLAT 5 5 FERGUSON COURT|FISHER STREET|CARLISLE|', b: '|FLAT 5 FERGUSON COURT|FISHER STREET|CARLISLE|', why: 'repeat after a designator' },
  { postcode: 'EC1V 2NX', a: '|124 CITY ROAD||LONDON|', b: '|128 CITY ROAD||LONDON|', extra: ['|1 CITY ROAD||ROAD|', '|3 CITY ROAD||ROAD|', '|5 CITY ROAD||CITY ROAD|', '|7 CITY ROAD||CITY ROAD|'], why: 'different numbers; junk towns are not place words' },
  { postcode: 'EC1V 2NX', a: '|124 CITY ROAD|SUITE 213|LONDON|', b: '|124 CITY ROAD|SUITE 470|LONDON|', why: 'different suites' },
  { postcode: 'SE8 3GG', a: '|291107 OFFICE SUITE 29A|3/F 23 WHARF STREET|LONDON|', b: '|291356 OFFICE SUITE 29A|3/F 23 WHARF STREET|LONDON|', why: 'leading mailbox number' },
  { postcode: 'E1 0SG', a: '|#3318 5 BRAYFORD SQUARE||LONDON|', b: '|3403 5 BRAYFORD SQUARE||LONDON|', why: 'different ids' },
  { postcode: 'M12 6AE', a: '|1 ACORN BUSINESS CENTRE|UNIT C ALDOW ENTERPRISE PARK|MANCHESTER|', nameA: 'ACORN BUSINESS CENTRE LTD', b: '|1 PICCADILLY BUSINESS CENTRE|ALDOW ENTERPRISE PARK|MANCHESTER|', why: 'different named buildings' },
  { postcode: 'KY16 9UR', a: '|13 BELL STREET||ST. ANDREWS|', b: '|13A BELL STREET||ST. ANDREWS|', why: 'letter suffix' },
  { postcode: 'W1W 5PF', a: '|167-169 GREAT PORTLAND STREET|FIRST FLOOR|LONDON|', b: '|167-169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|', why: 'different floors' },
  { postcode: 'NW2 3NJ', a: '|1ST FLOOR FLAT|127 FORDWYCH ROAD|LONDON|', b: '|GROUND FLOOR FLAT|127 FORDWYCH ROAD|LONDON|', why: 'different floor flats' },
  { postcode: 'FK3 8DG', a: '|GROUND FLOOR|5 STATION ROAD|GRANGEMOUTH|', b: '|LOWER GROUND FLOOR|5 STATION ROAD|GRANGEMOUTH|', why: 'lower ground is not ground' },
  { postcode: 'EC2A 4NE', a: '|86 - 90 PAUL STREET|3RD FLOOR|LONDON|', b: '|86-90 PAUL STREET|4TH FLOOR|LONDON|', why: 'different floors after the street' },
  { postcode: 'BS1 6FL', a: '|SUITE 2 FIRST FLOOR|10 TEMPLE BACK|BRISTOL|', b: '|SUITE 2 GROUND FLOOR|10 TEMPLE BACK|BRISTOL|', why: 'same suite, different floors' },
  { postcode: 'LS17 9BF', a: '|SUITE 1|1ST FLOOR ARENA BUSINESS PARK, TARN LANE|LEEDS|', b: '|SUITE 1|GROUND FLOOR ARENA BUSINESS PARK, TARN LANE|LEEDS|', why: 'same suite, different floors' },
  { postcode: 'NW2 6DW', a: '|4 - 5 LOWER GROUND FLOOR MILLENNIUM BUSINESS CENTRE|3 HUMBER ROAD|LONDON|', b: '|4 - 5 MILLENNIUM BUSINESS CENTRE|3 HUMBER ROAD|LONDON|', why: 'floor on one side only' },
  { postcode: 'AB10 6SN', a: '|127 UNION GROVE||ABERDEEN|', nameA: '127 UNION GROVE LTD', b: '|ATTIC FLOOR LEFT|127, UNION GROVE|ABERDEEN|', nameB: '127 UNION GROVE LTD', why: 'attic flat vs building' },
  { postcode: 'AB32 6FE', a: '|FIRST FLOOR|5 ABERCROMBIE COURT PROSPECT ROAD, ARNHALL BUSINESS PARK|WESTHILL|', b: '|5 ABERCROMBIE COURT PROSPECT ROAD|ARNHALL BUSINESS PARK|WESTHILL|', why: 'word floor on one side only' },
  { postcode: 'SA7 9LA', a: '|BEVAN BUCKLAND LLP GROUND FLOOR|CARDIGAN HOUSE CASTLE COURT, SWANSEA ENTERPRISE PARK, LLANSAMLET|SWANSEA|', b: '|CARDIGAN HOUSE CASTLE COURT|SWANSEA ENTERPRISE PARK|SWANSEA|', why: 'firm part holding a floor stays' },
  { postcode: 'G2 1BP', a: '|1/2 48 WEST GEORGE STREET||GLASGOW|', b: '|2/2 48 WEST GEORGE STREET||GLASGOW|', why: 'Glasgow floor/door' },
  { postcode: 'G15 8NT', a: '|1/2 10 HEATHCOT AVENUE||GLASGOW|', b: '|2/1 10 HEATHCOT AVENUE||GLASGOW|', why: 'swapped tenement positions' },
  { postcode: 'EH6 6DU', a: '|1/14 CABLES WYND||EDINBURGH|', b: '|11/4 CABLES WYND||EDINBURGH|', why: 'slash kept' },
  { postcode: 'B20 3SH', a: '|2-4 CHURCH VALE||BIRMINGHAM|', b: '|24 CHURCH VALE||BIRMINGHAM|', why: 'dash kept' },
  { postcode: 'EH12 8AN', a: '|FLAT 2|3 BURNBRAE PARK|EDINBURGH|', b: '|FLAT 3|2 BURNBRAE PARK|EDINBURGH|', why: 'flat and building swapped' },
  { postcode: 'AB10 6FA', a: '|FLAT F|2 ASHVALE COURT|ABERDEEN|', b: '|FLAT I|2 ASHVALE COURT|ABERDEEN|', why: 'lettered flats' },
  { postcode: 'NW6 5JS', a: '|FLAT 1 GREVILLE HALL|GREVILLE PLACE|LONDON|', b: '|FLAT 11 GREVILLE HALL|GREVILLE PLACE|LONDON|', why: 'flat 1 vs 11' },
  { postcode: 'AB10 6QQ', a: '|FLAT 5A|19 CLAREMONT STREET|ABERDEEN|', b: '|FLAT 5B|19 CLAREMONT STREET|ABERDEEN|', why: 'letter suffix' },
  { postcode: 'BD8 7SG', a: '|FLAT 1|215 LUMB LANE|BRADFORD|', b: '|UNIT 1|215 LUMB LANE|BRADFORD|', why: 'flat vs unit' },
  { postcode: 'B17 8DE', a: '|APARTMENT 5 CAVENDISH COURT|OAKHILL CLOSE|BIRMINGHAM|', b: '|FLAT 5 CAVENDISH COURT|OAKHILL CLOSE|BIRMINGHAM|', why: 'flat vs apartment' },
  { postcode: 'E18 1HB', a: '|4 RAVEN ROAD|UNIT 1C3|LONDON|', b: '|4 RAVEN ROAD|UNIT 1C3-939|LONDON|', why: 'unit vs mailbox in it' },
  { postcode: 'B11 2NT', a: '|UNIT 1|COLEBROOK ROAD|BIRMINGHAM|', b: '|UNIT 1-2|COLEBROOK ROAD|BIRMINGHAM|', why: 'single vs combined unit' },
  { postcode: 'SE25 6XN', a: '|FLAT 1|10 WHITWORTH ROAD|LONDON|', nameA: '10 WHITWORTH ROAD FREEHOLD LIMITED', b: '|FLAT 1|19 WHITWORTH ROAD|LONDON|', why: 'different buildings' },
  { postcode: 'AB23 8YU', a: '|EAST WING BELHELVIE LODGE BELHELVIE VILLAGE|BALMEDIE|ABERDEEN|', b: '|WEST WING BELHELVIE LODGE BELHELVIE VILLAGE|BALMEDIE|ABERDEEN|', why: 'different wings' },
  { postcode: 'N17 0EB', a: '|UNIT 10 A TRIUMPH TRADING ESTATE|TARIFF ROAD|LONDON|', b: '|UNIT 10 C TRIUMPH TRADING ESTATE|TARIFF ROAD|LONDON|', why: '10a vs 10c' },
  { postcode: 'N17 0EB', a: '|UNIT 10 TRIUMPH TRADING ESTATE|TARIFF ROAD|LONDON|', b: '|UNIT 10B TRIUMPH TRADING ESTATE|TARIFF ROAD|LONDON|', why: '10 vs 10B' },
  { postcode: 'NP12 2DQ', a: '|UNIT 9 BLOCK G PENMAEN INDUSTRIAL ESTATE|PONTLLANFRAITH|BLACKWOOD|', b: '|UNIT 9 BLOCK H PENMAEN INDUSTRIAL ESTATE|PONTLLANFRAITH|BLACKWOOD|', why: 'different blocks' },
  { postcode: 'NP12 2DQ', a: '|UNIT 1 BLOCK E PENMAEN INDUSTRIAL ESTATE|PONTLLANFRAITH|BLACKWOOD|', b: '|UNIT 1 PENMAEN INDUSTRIAL ESTATE|PONTLLANFRAITH|BLACKWOOD|', why: 'block on one side only' },
  { postcode: 'B78 3RW', a: '|UNIT I RIVERSIDE INDUSTRIAL ESTATE|ATHERSTONE STREET|TAMWORTH|STAFFORDSHIRE', b: '|UNIT T RIVERSIDE INDUSTRIAL ESTATE|ATHERSTONE STREET|TAMWORTH|STAFFORDSHIRE', why: 'letter unit ids' },
  { postcode: 'WA2 8TX', a: '|WARRINGTON BUSINESS PARK|LONG LANE|WARRINGTON|CHESHIRE', b: '|G21 WARRINGTON BUSINESS PARK|LONG LANE|WARRINGTON|CHESHIRE', why: 'estate vs unit G21' },
  { postcode: 'DY9 8RG', a: '|UNIT 6 FOLKES ROAD TRADING ESTATE|FOLKES ROAD, LYE|STOURBRIDGE|', b: '|FOLKES ROAD|LYE|STOURBRIDGE|', why: 'a bare street absorbs nothing' },
  { postcode: 'DY9 8RG', a: '|UNIT 4 FOLKES ROAD TRADING ESTATE|FOLKES ROAD|STOURBRIDGE|WEST MIDLANDS', b: '|UNIT 4 THE HAYES TRADING ESTATE|FOLKES ROAD|STOURBRIDGE|WEST MIDLANDS', extra: ['|UNIT 4|FOLKES ROAD|STOURBRIDGE|WEST MIDLANDS'], why: 'same unit on two estates' },
  { postcode: 'BB12 6LT', a: '|UNIT 11 ENTERPRISE BUSINESS PARK||BURNLEY|LANCASHIRE', b: '|UNIT 11|EMPIRE BUSINESS PARK|BURNLEY|LANCASHIRE', why: 'different estate names' },
  { postcode: 'B46 1JU', a: '|DISCOVERY HOUSE JUBILEE INDUSTRIAL ESTATE|GORSEY LANE, COLESHILL|BIRMINGHAM|', b: '|GORSEY LANE|COLESHILL|BIRMINGHAM|', why: 'run holds a building' },
  { postcode: 'M40 8BB', a: '|UNIT 86 CARIOCCA (EAST MANCHESTER) BUSINESS PARK|2 SAWLEY ROAD, MILES PLATTING|MANCHESTER|', b: '|UNIT 2 SAWLEY ROAD|MILES PLATTING|MANCHESTER|', why: 'unit 86 vs unit 2' },
  { postcode: 'YO22 4PU', a: '|FAIRFIELD WAY|STAINSACRE INDUSTRIAL ESTATE|WHITBY|NORTH YORKSHIRE', b: '|FAIRFIELD WAY|WHITBY BUSINESS PARK|WHITBY|NORTH YORKSHIRE', extra: ['|FAIRFIELD WAY||WHITBY|NORTH YORKSHIRE'], why: 'two estates on one road, no chain' },
  { postcode: 'CF72 8LF', a: '|UNIT D|LLANTRISANT BUSINESS PARK|LLANTRISANT|RHONDDA CYNON TAFF', b: '|LLANTRISANT BUSINESS PARK||LLANTRISANT|RHONDDA CYNON TAFF', why: 'unit vs whole park' },
  { postcode: 'BT15 3HN', a: '|LANYON BUILDING|JENNYMOUNT BUSINESS PARK, NORTH DERBY STREET|BELFAST|', b: '|JENNYMOUNT BUSINESS PARK|NORTH DERBY STREET|BELFAST|', why: 'named building in a park' },
  { postcode: 'AB21 9SQ', a: '|KIRKHILL COTTAGE|BUCKSBURN|ABERDEEN|', b: '|KIRKHILL FARM|BUCKSBURN|ABERDEEN|', why: 'cottage vs farm' },
  { postcode: 'SA4 0YA', a: '|LLANERCH FARM COTTAGE|PONTARDDULAIS|SWANSEA|', b: '|LLANERCH FARM|PONTARDDULAIS|SWANSEA|', why: 'one more word' },
  { postcode: 'IV32 7PQ', a: '|GORDON CASTLE FARM||FOCHABERS|MORAY', b: '|GORDON CASTLE||FOCHABERS|MORAYSHIRE', why: 'castle vs its farm' },
  { postcode: 'EH23 4QZ', a: '|BORTHWICK FARMHOUSE|BORTHWICK|GOREBRIDGE|', b: '|BORTHWICK FARM COTTAGE|BORTHWICK|GOREBRIDGE|', why: 'farmhouse vs farm cottage' },
  { postcode: 'PH22 1QD', a: '|AVIELOCHAN||AVIEMORE|', b: '|MONADH RUADH|AVIELOCHAN|AVIEMORE|INVERNESS-SIHRE', extra: ['|ARDMORE||AVIELOCHAN|', '|BEECHWOOD||AVIELOCHAN|'], why: 'house name vs locality' },
  { postcode: 'BT82 8LH', a: '|BRICKFIELD,|38,PARK ROAD,|STRABANE,|CO.TYRONE', b: '|BRICKFIELD HOUSE|36 PARK ROAD|STRABANE|CO TYRONE', why: 'different numbers' },
  { postcode: 'EH3 9JH', a: '80|12 BROUGHAM STREET||EDINBURGH|', b: '550|12 BROUGHAM STREET||EDINBURGH|', why: 'different PO boxes' },
  { postcode: 'EH3 9JH', a: '80|12 BROUGHAM STREET||EDINBURGH|', b: '|12 BROUGHAM STREET||EDINBURGH|', why: 'PO box vs none' },
  { postcode: 'AB10 1RD', a: '|C/O BEGBIES TRAYNOR (CENTRAL) LLP SUITE H WOODBURN HOUSE|4/5 GOLDEN SQUARE|ABERDEEN|', b: '|C/O BEGBIES TRAYNOR (CENTRAL) LLP SUITE L1 & L2 WOODBURN HOUSE|4/5 GOLDEN SQUARE|ABERDEEN|', why: 'care-of cut keeps the suite' },
  { postcode: 'DT9 4SY', a: '|PATSON HILL FARM|PATSON HILL|SHERBORNE|DORSET', nameA: 'PATSON HILL FARM LIMITED', b: '|PATSON HILL||SHERBORNE|DORSET', why: 'company named after its premises' },
  { postcode: 'BA2 4EX', a: '|BATH CRICKET CLUB|NORTH PARADE BRIDGE ROAD|BATH|', nameA: 'BATH CRICKET CLUB', b: '|NORTH PARADE BRIDGE ROAD||BATH|', why: 'name without suffix is the premises' },
  { postcode: 'CV21 3SS', a: '|STUDIO 3 EARL STREET STUDIOS|EARL STREET|RUGBY|', b: '|STUDIO 3A EARL STREET STUDIOS|EARL STREET|RUGBY|WARWICKSHIRE', why: 'studio 3 vs 3A' },
  { postcode: 'CV6 7AA', a: '|4 ST LAWRENCES ROAD||COVENTRY|', b: '|24 ST. LAWRENCES ROAD||COVENTRY|', why: '4 vs 24' },
  { postcode: 'AB25 1UR', a: '|27 BAKER ST||ABERDEEN|', b: '|27 BAKER STREET|FLAT 4|ABERDEEN|ABERDEENSHIRE', why: 'abbreviation does not pull in a flat' },
  // Found in the first full build's audit: a care-of cut must stop at any id.
  { postcode: 'HA7 1JS', a: '|DEVONSHIRE HOUSE C/O CLEAR HOUSE ACCOUNTANTS 582 HONEYPOT LANE||STANMORE|MIDDLESEX', b: '|C/O PARKER GETTY LIMITED|DEVONSHIRE HOUSE|STANMORE|MIDDLESEX', why: 'a mid-part care-of keeps the house number after it' },
  { postcode: 'BR1 3FE', a: '|C/O AKS ACCOUNTANCY LTD 30 TWEEDY ROAD|OLD TOWN HALL|BROMLEY|', b: '|C/O AKS ACCOUNTANCY LTD G10 30 TWEEDY ROAD|OLD TOWN HALL|BROMLEY|', why: 'a care-of cut keeps an id like G10' },
  // Round 1 checks: a town or county field that holds an id is a line.
  { postcode: 'W1W 5PF', a: '|167-169 GREAT PORTLAND STREET||FIFTH FLOOR|LONDON', b: '|167-169 GREAT PORTLAND STREET||LONDON|', why: 'a floor in the post town field' },
  { postcode: 'W1W 5PF', a: '|167-169 GREAT PORTLAND STREET||LONDON|5TH FLOOR', b: '|167-169 GREAT PORTLAND STREET||LONDON|', why: 'a floor in the county field' },
  { postcode: 'W1W 7LT', a: '|85 GREAT PORTLAND STREET||FIRST FLOOR|', b: '|85 GREAT PORTLAND STREET||LONDON|', why: 'a word floor as the post town' },
  { postcode: 'W1T 2EW', a: '|60 TOTTENHAM COURT ROAD||LONDON|SUITE 951', b: '|60 TOTTENHAM COURT ROAD||LONDON|', why: 'a suite in the county field' },
  { postcode: 'CR4 4NB', a: '|10 WANDLE WAY||MITCHAM|UNIT 5', b: '|10 WANDLE WAY||MITCHAM|', why: 'a unit in the county field' },
  { postcode: 'IM99 1HP', a: '|2A LORD STREET||DOUGLAS|PO BOX 95', b: '|2A LORD STREET||DOUGLAS|', why: 'a PO box in the county field' },
  { postcode: 'TW8 9ES', a: '|PROFILE WEST PROFILE WEST|950 GREAT WEST ROAD|SUITE E|GROUND FLOOR', b: '|PROFILE WEST|950 GREAT WEST ROAD|BRENTFORD|', why: 'a suite and a floor in the town and county fields' },
  { postcode: 'L1 0AH', a: '|49 JAMAICA STREET||LEVEL ONE LIVERPOOL STUDIO N|', b: '|49 JAMAICA STREET||LIVERPOOL|', why: 'a studio and level in the post town field' },
  // Round 1 checks: a building named in a care-of part is kept.
  { postcode: 'SY2 6LG', a: '|C/O EMSTREY HOUSE NORTH|SHREWSBURY BUSINESS PARK|SHREWSBURY|SHROPSHIRE', b: '|C/O BELMONT HOUSE|SHREWSBURY BUSINESS PARK|SHREWSBURY|SHROPSHIRE', why: 'two buildings named after C/O' },
  { postcode: 'DH1 1TW', a: '|C/O CLIVE OWEN LLP KEPIER HOUSE|BELMONT BUSINESS PARK|DURHAM|', b: '|C/O WICK BOOKS PORTLAND HOUSE|BELMONT BUSINESS PARK|DURHAM|', why: 'two buildings after care-of firms' },
  { postcode: 'IV2 3BW', a: '|C/O SAFFERY TORRIDON HOUSE|BEECHWOOD PARK|INVERNESS|', b: '|C/O SAFFERY CHAMPNESS ACCOUNTANTS KINTAIL HOUSE|BEECHWOOD PARK|INVERNESS|', why: 'Torridon House and Kintail House' },
  { postcode: 'BT1 6DN', a: '|C/O MURRAY HOUSE|MURRAY STREET|BELFAST|', b: '|C/O SUMER NI GLENDINNING HOUSE|MURRAY STREET|BELFAST|', why: 'Murray House and Glendinning House' },
  { postcode: 'SG8 9JN', a: '|C/O HARDCASTLE BURTON LAKE HOUSE|MARKET HILL|ROYSTON|', b: '|C/O WARMANS TEY HOUSE|MARKET HILL|ROYSTON|HERTFORDSHIRE', why: 'Lake House and Tey House' },
  { postcode: 'LS22 7DN', a: '|C/O ASCENT ACCOUNTANCY SANDOWN HOUSE|SANDBECK WAY|WETHERBY|WEST YORKSHIRE', b: '|SANDBECK WAY||WETHERBY|WEST YORKSHIRE', why: 'a care-of building vs the bare street' },
  // Round 1 guards on the new rules.
  { postcode: 'DT9 4SY', a: '|PATSON HILL FARM|5 PATSON HILL|SHERBORNE|DORSET', nameA: 'PATSON HILL FARM LIMITED', b: '|5 PATSON HILL||SHERBORNE|DORSET', why: 'a name stem that ends in a building word stays' },
  { postcode: 'L1 0AH', a: '|49 JAMAICA STREET|LEVEL 1|LIVERPOOL|', b: '|49 JAMAICA STREET|1ST FLOOR|LIVERPOOL|', why: 'a level is never read as a floor' },
  { postcode: 'G2 1BP', a: '|1/2 48 WEST GEORGE STREET||GLASGOW|', b: '|1-2 48 WEST GEORGE STREET||GLASGOW|', why: 'a tenement position before a house number is never a range' },
  { postcode: 'LL28 5BS', a: '|QUINTON HAZEL ENTERPRISE PARC|GLAN-Y-WERN ROAD|COLWYN BAY|', b: '|QUINTON HAZEL ENTERPRISE PARC|GLAN-Y-WERN ROAD|COLWYN BAY|UNIT 4', why: 'BAY in a town is not a designator, UNIT 4 in a county is' },
  // Round 2: the false merge, and guards on the new rules.
  { postcode: 'DN6 7BD', a: '|C/O IAA UK AUCTIONS LIMITED BENTLEY MOOR LANE|ADWICK-LE-STREET|DONCASTER|', b: '|C/O FENWICKS HAULAGE WELLSYKE ROAD|ADWICK LE STREET|DONCASTER|', why: 'two care-of firms on two streets' },
  { postcode: 'CV32 7JW', a: '|24|24 BLACKBERRY WAY|LEAMINGTON SPA|', b: '|24 BLACKBERRY WAY||LEAMINGTON SPA|', why: 'a lone number with no C/O may be a flat' },
  { postcode: 'N1 7AA', a: '|#2255 275 NEW NORTH ROAD||LONDON|', b: '|UNIT 2255 275 NEW NORTH ROAD||LONDON|', why: 'a bare # id is not a unit' },
  { postcode: 'N1 7AA', a: '|275 275 NEW NORTH ROAD|SUITE 348|LONDON|', b: '|275 NEW NORTH ROAD|SUITE 349|LONDON|', why: 'a doubled house number does not join another suite' },
  { postcode: 'EC1V 2NX', a: '|12|KEMP HOUSE|160 CITY ROAD|LONDON', b: '|KEMP HOUSE|12|160 CITY ROAD|LONDON', why: 'a lone number keeps its place when parts move' },
  { postcode: 'EC1V 2NX', a: '|KEMP HOUSE|160 CITY ROAD|LONDON|', b: '|160 KEMP HOUSE|CITY ROAD|LONDON|', why: 'a number that moves between parts is not reordered' },
  { postcode: 'DN6 7BD', a: '|C/O SMITH ACCOUNTANTS STATION ROAD|ADWICK-LE-STREET|DONCASTER|', b: '|C/O JONES ACCOUNTANTS MILL LANE|ADWICK-LE-STREET|DONCASTER|', why: 'a building word before a street type names the street' }
]

for (const pair of MUST_MERGE) {
  test(`merges at ${pair.postcode}: ${pair.why}`, () => {
    const { entryOfRow } = group(pair.postcode, pairRows(pair))
    assert.ok(entryOfRow[0], 'row a has an entry')
    assert.equal(entryOfRow[0], entryOfRow[1], `"${pair.a}" and "${pair.b}" are one entry`)
    if (pair.shown) assert.equal(entryOfRow[0].display, pair.shown)
  })
}

for (const pair of MUST_NOT_MERGE) {
  test(`keeps apart at ${pair.postcode}: ${pair.why}`, () => {
    const { entryOfRow } = group(pair.postcode, pairRows(pair))
    assert.ok(entryOfRow[0], 'row a has an entry')
    assert.ok(entryOfRow[1], 'row b has an entry')
    assert.notEqual(entryOfRow[0], entryOfRow[1], `"${pair.a}" and "${pair.b}" stay two entries`)
  })
}

test('the shown text is the most common tidied variant, never a key', () => {
  const { entries } = group('N1 7GU', [
    rowOf('|20-22 WENLOCK ROAD||LONDON|'),
    rowOf('|20-22 WENLOCK ROAD||LONDON|ENGLAND'),
    rowOf('|20 - 22 Wenlock Road||London|'),
    rowOf('|20-22 WENLOCK RD||LONDON|UNITED KINGDOM'),
    rowOf('|C/O A FIRM|20-22 WENLOCK ROAD|LONDON|')
  ])

  assert.equal(entries.length, 1)
  assert.equal(entries[0].display, '20-22 WENLOCK ROAD, LONDON')
  assert.equal(entries[0].count, 5)
})

test('a tie on rows goes to fewer parts, then more lower-case letters', () => {
  const tieOnParts = group('N1 7GU', [
    rowOf('|20-22 WENLOCK ROAD||LONDON|'),
    rowOf('|20-22 WENLOCK ROAD||LONDON|GREATER LONDON')
  ])
  assert.equal(tieOnParts.entries[0].display, '20-22 WENLOCK ROAD, LONDON')

  const tieOnCase = group('N1 7GU', [
    rowOf('|20-22 WENLOCK ROAD||LONDON|'),
    rowOf('|20-22 Wenlock Road||London|')
  ])
  assert.equal(tieOnCase.entries[0].display, '20-22 Wenlock Road, London')
})

// Round 1 checks: what a single row shows.
const SHOWN = [
  { postcode: 'EH6 7BD', row: '|SUMMIT HOUSE|4 /5 MITCHELL STREET|EDINBURGH|', shown: 'SUMMIT HOUSE, 4/5 MITCHELL STREET, EDINBURGH', why: 'spacing round a slash between numbers' },
  { postcode: 'E8 2LR', row: '|SUITE 23 E SANDRINGHAM ROAD|23 E SANDRINGHAM ROAD|LONDON|', shown: 'SUITE 23 E SANDRINGHAM ROAD, LONDON', why: 'a part held whole in another part' },
  { postcode: 'SW2 1BZ', row: '|EUROLINK BUSINESS CENTRE EUROLINK BUSINESS CENTRE|49 EFFRA ROAD|LONDON|', shown: 'EUROLINK BUSINESS CENTRE, 49 EFFRA ROAD, LONDON', why: 'a phrase written twice in a row' },
  { postcode: 'W1T 2EW', row: '|60 TOTTENHAM COURT ROAD 60 TOTTENHAM COURT ROAD|OFFICE 986|LONDON|', shown: '60 TOTTENHAM COURT ROAD, OFFICE 986, LONDON', why: 'a line written twice in a row' },
  { postcode: 'S26 5LQ', row: '|18 CHURCH STREET|WALES|SHEFFIELD|SOUTH YORKSHIRE', shown: '18 CHURCH STREET, WALES, SHEFFIELD, SOUTH YORKSHIRE', why: 'the village of Wales is kept' },
  { postcode: 'SE1 9SG', row: '|C/O KROLL ADVISORY LTD THE NEWS BUILDING LEVEL 6|3 LONDON BRIDGE STREET|LONDON|', shown: 'THE NEWS BUILDING LEVEL 6, 3 LONDON BRIDGE STREET, LONDON', why: 'a care-of cut keeps the building and LEVEL' },
  { postcode: 'CA2 5XF', row: '|BOURNE HOUSE (C/O TAG TAX)|MILBOURNE STREET|CARLISLE|', shown: 'BOURNE HOUSE, MILBOURNE STREET, CARLISLE', why: 'a care-of in brackets' },
  { postcode: 'B15 1NX', row: '|C/O.PRIDIE LANGARD|2ND FLOOR,ROYTON HOUSE|GEORGE ROAD|EDGBASTON,BIRMINGHAM', shown: '2ND FLOOR, ROYTON HOUSE, GEORGE ROAD, EDGBASTON, BIRMINGHAM', why: 'C/O followed by a dot' },
  { postcode: 'EC1V 2NX', row: '|/ JOSEPH ROSS ALLEN|124 CITY ROAD|LONDON|', shown: 'JOSEPH ROSS ALLEN, 124 CITY ROAD, LONDON', why: 'leading punctuation' },
  { postcode: 'E6 2JA', row: "|'OFFICE 293' 182-184 HIGH STREET|NORTH, EAST HAM|LONDON|", shown: 'OFFICE 293 182-184 HIGH STREET, NORTH, EAST HAM, LONDON', why: 'quotes round a designator' },
  { postcode: 'AL1 1DT', row: 'SUITE 104|17 HOLYWELL HILL||ST ALBANS|HERTFORDSHIRE', shown: 'SUITE 104, 17 HOLYWELL HILL, ST ALBANS, HERTFORDSHIRE', why: 'no PO Box in front of a suite' },
  // Round 2 checks.
  { postcode: 'W1W 5PF', row: '|LONDON (W1W 5PF) OFFICE 5TH FLOOR|167-169 GREAT PORTLAND STREET|LONDON|', shown: 'LONDON OFFICE 5TH FLOOR, 167-169 GREAT PORTLAND STREET, LONDON', why: 'no empty brackets where the own postcode was' },
  { postcode: 'W1W 5PF', row: '|167 169 167 169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|', shown: '167 169 GREAT PORTLAND STREET, 5TH FLOOR, LONDON', why: 'numbers written twice in a row' },
  { postcode: 'W1J 6BX', row: '|4TH FLOOR BERKELEY SQUARE HOUSE|BERKELEY SQUARE|LONDON|', shown: '4TH FLOOR BERKELEY SQUARE HOUSE, BERKELEY SQUARE, LONDON', why: 'a street is kept after the building named after it' },
  { postcode: 'KW14 8UQ', row: '|C/O CASTLETOWN CHIP SHOP MACKAY STREET|CASTLETOWN|THURSO|', shown: 'MACKAY STREET, CASTLETOWN, THURSO', why: 'a care-of part keeps its street' },
  { postcode: 'LS25 1NB', row: '|C/O CLEVER ACCOUNTS SELBY ROAD|GARFORTH|LEEDS|', shown: 'SELBY ROAD, GARFORTH, LEEDS', why: 'a care-of part keeps its street' },
  { postcode: 'PE11 3SQ', row: '|C/O DP PACKAGING (SPALDING)|LIMITED, NORTHGATE|PINCHBECK|SPALDING', shown: 'NORTHGATE, PINCHBECK, SPALDING', why: 'a lone legal suffix is not shown' },
  { postcode: 'HX6 2AG', row: '|TEMUJIN RESTAURANT|1 CANAL BASIN|SOWERBY BRIDGE|', name: 'TEMUJIN LTD', shown: 'TEMUJIN RESTAURANT, 1 CANAL BASIN, SOWERBY BRIDGE', why: 'a name stem is not cut to leave one bare word' },
  { postcode: 'DG7 3YA', row: '|THE LAURIE ARMS HOTEL|11-13 MAIN STREET|HAUGH OF URR|CASTLE DOUGLAS', name: 'THE LAURIE ARMS LIMITED', shown: 'THE LAURIE ARMS HOTEL, 11-13 MAIN STREET, HAUGH OF URR, CASTLE DOUGLAS', why: 'a name stem ending in ARMS is the premises' },
  { postcode: 'PH41 4QF', row: '|THE OLD QUAY BAKEHOUSE|EAST BAY|MALLAIG|INVERNESS-SHIRE', name: 'THE OLD QUAY BAKEHOUSE LIMITED', shown: 'THE OLD QUAY BAKEHOUSE, EAST BAY, MALLAIG, INVERNESS-SHIRE', why: 'EAST BAY is a place, not an id' },
  { postcode: 'CW5 8BP', row: '|C/O CHESHIRE ACCOUNTS BADDILEY LANE FARMHOUSE|BADDILEY LANE|NANTWICH|CHESHIRE', shown: 'BADDILEY LANE FARMHOUSE, BADDILEY LANE, NANTWICH, CHESHIRE', why: 'a care-of building name never starts on a street word' },
  { postcode: 'LN6 9NQ', row: '|C/O BROUGHTON LAMBERT ACCOUNTANTS BOUNDARY LANE ENTERPRISE PARK|SOUTH HYKEHAM|LINCOLN|LINCOLNSHIRE', shown: 'BOUNDARY LANE ENTERPRISE PARK, SOUTH HYKEHAM, LINCOLN, LINCOLNSHIRE', why: 'a care-of street tail never starts on a street word' },
  { postcode: 'CV11 6BY', row: '|NSI GROUP LTD BUILDING|WHITACRE ROAD INDUSTRIAL ESTATE|NUNEATON|WARWICKSHIRE', shown: 'NSI GROUP LTD BUILDING, WHITACRE ROAD INDUSTRIAL ESTATE, NUNEATON, WARWICKSHIRE', why: 'a firm is never cut to leave a lone building word' }
]

for (const item of SHOWN) {
  test(`shows at ${item.postcode}: ${item.why}`, () => {
    const { entries } = group(item.postcode, [rowOf(item.row, { name: item.name })])
    assert.equal(entries.length, 1)
    assert.equal(entries[0].display, item.shown)
  })
}

test('a variant that repeats itself is shown only when no other variant is left', () => {
  const { entries } = group('W1W 5PF', [
    rowOf('|167-169 GREAT PORTLAND STREET 5TH FLOOR LONDON 167-169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|'),
    rowOf('|167-169 GREAT PORTLAND STREET 5TH FLOOR LONDON 167-169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|'),
    rowOf('|167-169 GREAT PORTLAND STREET|5TH FLOOR|LONDON|')
  ])
  assert.equal(entries.length, 1)
  assert.equal(entries[0].display, '167-169 GREAT PORTLAND STREET, 5TH FLOOR, LONDON')
})

test('the own company name stays when 2 or more other companies write it as a line', () => {
  const { entryOfRow } = group('M12 6AE', [
    rowOf('|ACORN BUSINESS CENTRE LTD, UNIT C|ALDOW ENTERPRISE PARK|MANCHESTER|', { name: 'ACORN BUSINESS CENTRE LTD' }),
    rowOf('|ACORN BUSINESS CENTRE LTD, UNIT C|ALDOW ENTERPRISE PARK|MANCHESTER|', { name: 'ONE LTD' }),
    rowOf('|ACORN BUSINESS CENTRE LTD, UNIT C|ALDOW ENTERPRISE PARK|MANCHESTER|', { name: 'TWO LTD' }),
    rowOf('|UNIT C|ALDOW ENTERPRISE PARK|MANCHESTER|')
  ])

  assert.equal(entryOfRow[0], entryOfRow[1])
  assert.notEqual(entryOfRow[0], entryOfRow[3])
})

test('the same records in another order give the same entries', () => {
  const rows = [
    ...MUST_MERGE.filter((pair) => pair.postcode === 'N1 7GU').flatMap(pairRows),
    ...MUST_NOT_MERGE.filter((pair) => pair.postcode === 'N1 7GU').flatMap(pairRows)
  ]
  const shown = (result) => result.entries.map((entry) => [entry.display, entry.count])

  assert.deepEqual(shown(group('N1 7GU', rows)), shown(group('N1 7GU', [...rows].reverse())))
})

test('--audit writes one sorted line per entry that merged raw variants', async () => {
  const { byOutward, counts } = await collect(csv([
    `A LTD,1,,,20-22 WENLOCK ROAD,,LONDON,,England,N1 7GU,${LTD}`,
    `B LTD,2,,,20 - 22 WENLOCK ROAD,,LONDON,,England,N1 7GU,${LTD}`,
    `C LTD,3,,,20-22 WENLOCK ROAD,,LONDON,,England,N1 7GU,${LTD}`,
    `D LTD,4,,,1 ROAD,,TOWN,,England,N1 7GU,${LTD}`
  ]))
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postcode-addresses-'))
  const audit = path.join(outDir, 'audit', 'audit.jsonl')
  const manifest = writeOutput(path.join(outDir, 'out'), byOutward, { counts }, { audit })

  assert.deepEqual(fs.readFileSync(audit, 'utf8').trim().split('\n').map((line) => JSON.parse(line)), [{
    postcode: 'N17GU',
    shown: '20-22 WENLOCK ROAD, LONDON',
    variants: [
      { text: '20-22 WENLOCK ROAD, LONDON', count: 2 },
      { text: '20 - 22 WENLOCK ROAD, LONDON', count: 1 }
    ]
  }])
  assert.equal(manifest.counts.uniqueAddresses, 2)
  assert.equal(manifest.counts.mergedEntries, 1)
})

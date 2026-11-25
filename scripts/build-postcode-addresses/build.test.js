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

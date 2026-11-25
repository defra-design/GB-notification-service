// Builds the registered office address files the postcode lookup reads.
//
//   npm run build:postcode-addresses
//   npm run build:postcode-addresses -- --source path/to/file.zip|file.csv
//   npm run build:postcode-addresses -- --audit path/to/audit.jsonl
//
// It downloads the latest "BasicCompanyDataAsOneFile" snapshot from
// Companies House (cached under .cache/companies-house), streams the CSV,
// keeps every company with a usable postcode and address,
// merges variants of the same premises within each postcode (see address.js)
// and writes one JSON file per outward code into a fresh
// app/data/generated/postcode-addresses.
//
// --audit writes one JSON line for every shown address that merged more than
// one raw variant: {postcode, shown, variants: [{text, count}]}.

const fs = require('fs')
const path = require('path')
const { pipeline } = require('stream/promises')
const { Readable } = require('stream')
const { parse } = require('csv-parse')
const yauzl = require('yauzl')

const { normalisePostcode, isFullPostcode, outwardCode } = require('../../app/utils/postcode')
const { recordSignature, decodeRecord, groupPostcode } = require('./address')

const repoRoot = path.join(__dirname, '..', '..')
const DOWNLOAD_PAGE = 'https://download.companieshouse.gov.uk/en_output.html'
const SNAPSHOT_FILE = /BasicCompanyDataAsOneFile-(\d{4}-\d{2}-\d{2})\.zip/g

function parseArgs (argv) {
  const args = {
    source: null,
    audit: null,
    cacheDir: path.join(repoRoot, '.cache', 'companies-house'),
    outDir: path.join(repoRoot, 'app', 'data', 'generated', 'postcode-addresses')
  }

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const value = argv[i + 1]

    if (flag === '--source') args.source = path.resolve(value)
    else if (flag === '--audit') args.audit = path.resolve(value)
    else if (flag === '--cache-dir') args.cacheDir = path.resolve(value)
    else if (flag === '--out') args.outDir = path.resolve(value)
    else throw new Error(`Unknown option ${flag}`)

    i += 1
  }

  return args
}

async function findLatestSnapshot () {
  const response = await fetch(DOWNLOAD_PAGE)
  if (!response.ok) throw new Error(`${DOWNLOAD_PAGE} answered ${response.status}`)

  const html = await response.text()
  const dates = [...html.matchAll(SNAPSHOT_FILE)].map((match) => match[1]).sort()
  if (dates.length === 0) throw new Error(`No BasicCompanyDataAsOneFile link on ${DOWNLOAD_PAGE}`)

  const date = dates[dates.length - 1]
  const fileName = `BasicCompanyDataAsOneFile-${date}.zip`

  return { date, fileName, url: new URL(fileName, DOWNLOAD_PAGE).href }
}

async function download (snapshot, cacheDir) {
  const target = path.join(cacheDir, snapshot.fileName)
  if (fs.existsSync(target)) {
    console.log(`Using the cached ${snapshot.fileName}`)
    return target
  }

  fs.mkdirSync(cacheDir, { recursive: true })
  console.log(`Downloading ${snapshot.url}`)

  const response = await fetch(snapshot.url)
  if (!response.ok) throw new Error(`${snapshot.url} answered ${response.status}`)

  const partial = `${target}.partial`
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial))
  fs.renameSync(partial, target)

  return target
}

function openCsvFromZip (zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openError, zip) => {
      if (openError) return reject(openError)

      zip.on('entry', (entry) => {
        if (!entry.fileName.toLowerCase().endsWith('.csv')) return zip.readEntry()

        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) return reject(streamError)
          resolve(stream)
        })
      })
      zip.on('end', () => reject(new Error(`${zipPath} holds no CSV file`)))
      zip.readEntry()
    })
  })
}

function openSource (sourcePath) {
  return sourcePath.toLowerCase().endsWith('.zip')
    ? openCsvFromZip(sourcePath)
    : Promise.resolve(fs.createReadStream(sourcePath))
}

function snapshotDateFromName (sourcePath) {
  const match = path.basename(sourcePath).match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

async function collect (csvStream) {
  // Every company type is kept. The manifest counts each CompanyCategory the
  // snapshot holds, so the mix can be checked.
  const categories = {}
  const counts = {
    rowsRead: 0,
    skippedMissingPostcode: 0,
    skippedInvalidPostcode: 0,
    skippedMissingAddress: 0,
    rowsRetained: 0
  }
  // outward code -> postcode -> record signature -> rows
  const byOutward = new Map()

  const parser = csvStream.pipe(parse({
    columns: (header) => header.map((name) => name.trim()),
    bom: true,
    relax_column_count: true
  }))

  for await (const row of parser) {
    counts.rowsRead += 1

    const category = (row.CompanyCategory || '').trim()
    categories[category] = (categories[category] || 0) + 1

    const postcode = normalisePostcode(row['RegAddress.PostCode'])
    if (!postcode) {
      counts.skippedMissingPostcode += 1
      continue
    }
    if (!isFullPostcode(postcode)) {
      counts.skippedInvalidPostcode += 1
      continue
    }

    const signature = recordSignature(row, postcode)
    if (!signature) {
      counts.skippedMissingAddress += 1
      continue
    }

    counts.rowsRetained += 1

    const outward = outwardCode(postcode)
    let postcodes = byOutward.get(outward)
    if (!postcodes) byOutward.set(outward, (postcodes = new Map()))

    let addresses = postcodes.get(postcode)
    if (!addresses) postcodes.set(postcode, (addresses = new Map()))

    addresses.set(signature, (addresses.get(signature) || 0) + 1)
  }

  return { byOutward, categories, counts }
}

function byCodePoint (a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

function byCountThenText (a, b) {
  return b.count - a.count || byCodePoint(a.text, b.text)
}

// Groups one postcode's records into the entries it shows.
function entriesFor (signatures) {
  const records = [...signatures.keys()].sort(byCodePoint).map((signature) => decodeRecord(signature, signatures.get(signature)))
  return groupPostcode(records)
}

function auditLine (postcode, entry) {
  const variants = [...entry.raws].map(([text, count]) => ({ text, count })).sort(byCountThenText)
  return `${JSON.stringify({ postcode, shown: entry.display, variants })}\n`
}

// Groups every postcode, writes the files and returns the full manifest.
// The records of each outward code are released once its file is written.
function writeOutput (outDir, byOutward, manifest, { audit = null } = {}) {
  const partialDir = `${outDir}.partial`
  fs.rmSync(partialDir, { recursive: true, force: true })
  fs.mkdirSync(partialDir, { recursive: true })

  let auditFile = null
  if (audit) {
    fs.mkdirSync(path.dirname(audit), { recursive: true })
    auditFile = fs.openSync(audit, 'w')
  }

  let uniqueAddresses = 0
  let postcodeCount = 0
  let fileCount = 0
  let mergedEntries = 0
  let totalBytes = 0
  let largest = { file: null, bytes: 0 }

  for (const outward of [...byOutward.keys()].sort(byCodePoint)) {
    const postcodes = byOutward.get(outward)
    byOutward.delete(outward)
    const content = {}

    for (const postcode of [...postcodes.keys()].sort(byCodePoint)) {
      const entries = entriesFor(postcodes.get(postcode))
      if (entries.length === 0) continue

      content[postcode] = entries.map((entry) => entry.display)
      uniqueAddresses += entries.length
      postcodeCount += 1

      for (const entry of entries) {
        if (entry.raws.size < 2) continue
        mergedEntries += 1
        if (auditFile !== null) fs.writeSync(auditFile, auditLine(postcode, entry))
      }
    }

    if (Object.keys(content).length === 0) continue
    fileCount += 1

    const file = `${outward}.json`
    const json = JSON.stringify(content)
    const bytes = Buffer.byteLength(json)
    fs.writeFileSync(path.join(partialDir, file), json)

    totalBytes += bytes
    if (bytes > largest.bytes) largest = { file, bytes }
  }

  const fullManifest = {
    ...manifest,
    counts: {
      ...manifest.counts,
      postcodes: postcodeCount,
      uniqueAddresses,
      mergedEntries,
      files: fileCount,
      totalBytes,
      largestFile: largest.file,
      largestFileBytes: largest.bytes
    }
  }
  fs.writeFileSync(path.join(partialDir, 'manifest.json'), `${JSON.stringify(fullManifest, null, 2)}\n`)
  if (auditFile !== null) fs.closeSync(auditFile)

  fs.rmSync(outDir, { recursive: true, force: true })
  fs.renameSync(partialDir, outDir)

  return fullManifest
}

async function main () {
  const args = parseArgs(process.argv.slice(2))

  let sourcePath = args.source
  let snapshot = { date: sourcePath ? snapshotDateFromName(sourcePath) : null, url: null }

  if (!sourcePath) {
    snapshot = await findLatestSnapshot()
    sourcePath = await download(snapshot, args.cacheDir)
  }

  console.log(`Reading ${sourcePath}`)
  const { byOutward, categories, counts } = await collect(await openSource(sourcePath))

  if (counts.rowsRetained === 0) {
    throw new Error('No row had a usable postcode and address: check the CSV columns against the manifest')
  }

  const sortedCategories = Object.fromEntries(
    Object.entries(categories).sort((a, b) => b[1] - a[1] || byCodePoint(a[0], b[0]))
  )

  const manifest = writeOutput(args.outDir, byOutward, {
    source: snapshot.url || path.basename(sourcePath),
    snapshotDate: snapshot.date,
    categoriesSeen: sortedCategories,
    counts
  }, { audit: args.audit })

  if (args.audit) console.log(`Wrote the merge audit to ${args.audit}`)
  console.log(JSON.stringify(manifest.counts, null, 2))
  console.log(`Wrote ${manifest.counts.files} files to ${path.relative(repoRoot, args.outDir)}`)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}

module.exports = { collect, writeOutput }

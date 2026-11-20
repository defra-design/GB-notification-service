const fs = require('fs')
const path = require('path')
const { test, expect } = require('@playwright/test')
const dashboardTemplates = require('../../app/data/dashboard-templates')
const liveCommodities = require('../../app/data/commodities')
const { clickContinue, openCommoditySearch, search, selectSpecies } = require('./commodity-search-page')

const isRecording = process.env.RECORD_BASELINE === '1'
const fixturesDir = path.join(__dirname, 'fixtures', 'commodity-search')

const QUERIES = [
  'cattle', 'cow', 'Bos taurus', '0102', '01.02', '0106', '010', 'semen', 'ova', 'embryos',
  '05119985', 'horse', 'felis', 'chicken', 'Gallus gallus', 'dog', 'parrot', 'spp', 'ca', 'zzzz'
]

const NOTIFICATION_TYPE_BASES = ['/design-release-2.1', '/testing3', '/testing4']

const VERSIONS = [
  { base: '', slug: 'root', notificationType: null },
  { base: '/testing', slug: 'testing', notificationType: null },
  ...NOTIFICATION_TYPE_BASES.flatMap((base) =>
    ['live-animals', 'germinal-products'].map((notificationType) => ({
      base,
      slug: `${base.slice(1).replace(/\./g, '-')}-${notificationType}`,
      notificationType
    }))
  )
]

const FISH_SPECIES_IDS = ['fish-cyprinidae', 'fish-poeciliidae', 'fish-cichlidae']

const ALLOWED_DROPPED_SPECIES_IDS_BY_SLUG = {
  root: FISH_SPECIES_IDS,
  testing: FISH_SPECIES_IDS
}

const TEMPLATES_BASE = '/design-release-2.1'

function readFixture (name) {
  const fixturePath = path.join(fixturesDir, `${name}.json`)

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`No recorded baseline at ${fixturePath}: run npm run test:commodity-search:record on main`)
  }

  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
}

function writeFixture (name, value) {
  fs.mkdirSync(fixturesDir, { recursive: true })
  fs.writeFileSync(path.join(fixturesDir, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`)
}

function readResultRows (page) {
  return page.$$eval('#commodity-search-results > li', (items) => {
    const rows = []
    let header = null

    for (const item of items) {
      if (item.classList.contains('app-commodity-search__row--commodity-header')) {
        header = item.textContent.replace(/\s+/g, ' ').trim()
        continue
      }

      const checkbox = item.querySelector('input[type="checkbox"]')

      if (checkbox) {
        rows.push({
          header,
          speciesId: checkbox.value.replace(/^species:/, ''),
          label: item.querySelector('label').textContent.replace(/\s+/g, ' ').trim()
        })
      }
    }

    return rows
  })
}

async function searchPairs (page, query) {
  await search(page, query)
  const rows = await readResultRows(page)

  return rows.map((row) => [row.header, row.speciesId])
}

function hintExamples (hintText) {
  return [...hintText.matchAll(/\(([^)]+)\)/g)]
    .map(([, example]) => example.replace(/^for example,\s*/, '').trim())
}

for (const version of VERSIONS) {
  test.describe(`commodity search on ${version.base || '/'}${version.notificationType ? ` (${version.notificationType})` : ''}`, () => {
    test.beforeEach(async ({ page }) => {
      await openCommoditySearch(page, version)
    })

    test('keeps every recorded result row for each query, except allowed drops', async ({ page }) => {
      const allowedDrops = new Set(ALLOWED_DROPPED_SPECIES_IDS_BY_SLUG[version.slug] || [])
      const pairsByQuery = {}

      for (const query of QUERIES) {
        pairsByQuery[query] = await searchPairs(page, query)
      }

      if (isRecording) {
        writeFixture(version.slug, pairsByQuery)
      }

      const recorded = readFixture(version.slug)

      for (const [query, recordedPairs] of Object.entries(recorded)) {
        const current = new Set(pairsByQuery[query].map((pair) => JSON.stringify(pair)))
        const missing = recordedPairs
          .filter(([, speciesId]) => !allowedDrops.has(speciesId))
          .filter((pair) => !current.has(JSON.stringify(pair)))

        expect(missing, `rows missing for "${query}"`).toEqual([])
      }
    })

    test('closes under three characters and says when nothing matches', async ({ page }) => {
      await search(page, 'ca')
      await expect(page.locator('#commodity-search-results')).toBeHidden()

      await search(page, 'zzzz')
      await expect(page.locator('#commodity-search-results')).toHaveText('No results found')
    })

    test('finds results for every example in the hint', async ({ page }) => {
      const examples = hintExamples(await page.locator('#commodity-search-hint').textContent())

      expect(examples.length).toBeGreaterThan(0)

      for (const example of examples) {
        await search(page, example)
        expect(await readResultRows(page), `results for hint example "${example}"`).not.toEqual([])
      }
    })

    test('shows exactly one Equus cabalus row in each horse group', async ({ page }) => {
      await search(page, 'horse')
      const rows = await readResultRows(page)
      const horseHeaders = [...new Set(rows.map((row) => row.header).filter((header) => header.startsWith('Horse')))]

      expect(horseHeaders.length).toBeGreaterThan(0)

      for (const header of horseHeaders) {
        const cabalusRows = rows.filter((row) => row.header === header && row.label.endsWith('(Equus cabalus)'))
        expect(cabalusRows, `Equus cabalus rows under ${header}`).toHaveLength(1)
      }
    })
  })
}

for (const version of VERSIONS.filter((item) => ALLOWED_DROPPED_SPECIES_IDS_BY_SLUG[item.slug])) {
  test(`commodity search on ${version.base || '/'} finds no fish by family or code`, async ({ page }) => {
    await openCommoditySearch(page, version)

    for (const query of ['Cyprinidae', 'Poeciliidae', 'Cichlidae', '0301']) {
      await search(page, query)
      await expect(page.locator('#commodity-search-results'), `results for "${query}"`).toHaveText('No results found')
    }
  })
}

function speciesIdsOfLiveCommodity (commodityId) {
  return liveCommodities.find((commodity) => commodity.id === commodityId).species.map((species) => species.id).sort()
}

function speciesIdsUnder (rows, header) {
  return rows.filter((row) => row.header === header).map((row) => row.speciesId).sort()
}

for (const version of VERSIONS.filter((item) => item.notificationType !== 'germinal-products')) {
  test.describe(`commodity search by search term and tariff code on ${version.base || '/'}`, () => {
    test.beforeEach(async ({ page }) => {
      await openCommoditySearch(page, version)
    })

    test('shows the whole Cattle group for "cow"', async ({ page }) => {
      await search(page, 'cow')
      const rows = await readResultRows(page)

      expect(speciesIdsUnder(rows, 'Cattle (0102)')).toEqual(speciesIdsOfLiveCommodity('cattle'))
    })

    test('shows only the matching Duck species for their search term "mallard"', async ({ page }) => {
      await search(page, 'mallard')
      const rows = await readResultRows(page)
      const duckSpeciesIds = speciesIdsUnder(rows, rows.find((row) => row.header.startsWith('Duck ('))?.header)

      expect(duckSpeciesIds).toContain('duck-anas-platyrhynchos')
      expect(duckSpeciesIds.length).toBeLessThan(speciesIdsOfLiveCommodity('duck').length)
    })

    test('gives the same rows for "01.02" and "01 02" as for "0102"', async ({ page }) => {
      const undottedPairs = await searchPairs(page, '0102')

      expect(undottedPairs.length).toBeGreaterThan(0)
      expect(await searchPairs(page, '01.02')).toEqual(undottedPairs)
      expect(await searchPairs(page, '01 02')).toEqual(undottedPairs)
    })

    test('shows the whole Chicken group for its tariff code "01051111"', async ({ page }) => {
      await search(page, '01051111')
      const rows = await readResultRows(page)

      expect(speciesIdsUnder(rows, 'Chicken (010511)')).toEqual(speciesIdsOfLiveCommodity('chicken'))
    })
  })
}

test.describe('commodity search selections on /design-release-2.1 (live-animals)', () => {
  const version = VERSIONS.find((item) => item.slug === 'design-release-2-1-live-animals')

  test.beforeEach(async ({ page }) => {
    await openCommoditySearch(page, version)
  })

  test('posts the commodity selections for two species from different commodities', async ({ page }) => {
    await selectSpecies(page, 'cattle', 'cattle-bos-taurus')
    await selectSpecies(page, 'horse', 'horse-equus-caballus')

    const postRequest = page.waitForRequest((request) =>
      request.method() === 'POST' && request.url().endsWith('/what-are-you-importing')
    )
    await clickContinue(page)
    const posted = new URLSearchParams((await postRequest).postData())

    expect(JSON.parse(posted.get('commoditySelections'))).toEqual([
      { type: 'species', commodityId: 'cattle', commodityCode: '0102', speciesId: 'cattle-bos-taurus' },
      { type: 'species', commodityId: 'horse', commodityCode: '0101', speciesId: 'horse-equus-caballus' }
    ])
  })

  test('shows a chip per selection, removes one, and clears all', async ({ page }) => {
    const selectedPanel = page.locator('#commodity-search-selected')
    const speciesValue = page.locator('input.app-commodity-search__species-value')

    await selectSpecies(page, 'cattle', 'cattle-bos-taurus')
    await expect(page.locator('#commodity-search-results')).toBeHidden()
    await expect(page.locator('#commodity-search-selected-heading')).toHaveText('1 selected')
    await expect(selectedPanel.locator('.app-commodity-search__selected-label')).toHaveText(['Domestic cattle (Bos taurus)'])

    await selectedPanel.getByRole('button', { name: 'Remove Domestic cattle (Bos taurus)' }).click()
    await expect(selectedPanel).toBeHidden()
    await expect(speciesValue).toHaveValue('[]')

    await selectSpecies(page, 'cattle', 'cattle-bos-taurus')
    await selectSpecies(page, 'horse', 'horse-equus-caballus')
    await expect(page.locator('#commodity-search-selected-heading')).toHaveText('2 selected')

    await selectedPanel.getByRole('button', { name: 'Clear all' }).click()
    await expect(selectedPanel).toBeHidden()
    await expect(speciesValue).toHaveValue('[]')
  })

  test('reaches review with a species block per commodity for one Latin name under two commodities', async ({ page }) => {
    await selectSpecies(page, 'Gallus gallus', 'chicken-gallus-gallus')
    await selectSpecies(page, 'Gallus gallus', 'hatching-eggs-chicken-gallus-gallus')
    await clickContinue(page)
    await page.goto(`${version.base}/review-notification`)

    const gallusCards = page.locator('.app-dr2-review-commodity-card').filter({
      has: page.locator('.app-dr2-review-commodity-card__species-heading', { hasText: 'Gallus gallus' })
    })
    await expect(gallusCards.locator('.app-dr2-review-card__title')).toHaveText([
      /^Chicken \(010511\)$/,
      /^Hatching eggs: chicken \(04071100\)$/
    ])
  })

  test('shows each commodity its own identification fields, for one Latin name under two commodities', async ({ page }) => {
    await selectSpecies(page, 'Chiroptera', 'other-live-mammals-17-chiroptera')
    await selectSpecies(page, 'Chiroptera', 'circus-animals-chiroptera')
    await clickContinue(page)
    await page.goto(`${version.base}/consignment-details`)
    for (const speciesId of ['other-live-mammals-17-chiroptera', 'circus-animals-chiroptera']) {
      await page.locator(`input[name="numberOfAnimals[${speciesId}]"]`).fill('1')
    }
    await clickContinue(page)
    await expect(page).toHaveURL(/\/animal-identification-details$/)
    const identifierFields = page.locator('input[name^="identifiers["]')
    await expect(identifierFields.first()).toBeVisible()
    for (const field of await identifierFields.all()) {
      await field.fill('BAT-001')
    }
    await page.locator('button[name="action"][value="continue"]').first().click()
    await page.goto(`${version.base}/review-notification`)

    const cardTitled = (title) => page.locator('.app-dr2-review-commodity-card').filter({
      has: page.locator('.app-dr2-review-card__title', { hasText: title })
    })
    await expect(cardTitled('Other live mammals').locator('.app-dr2-review-identification-table__value').first()).toHaveText('BAT-001')
    await expect(cardTitled('Travelling circus and menagerie animals').locator('.app-dr2-review-commodity-card__species-heading')).toHaveText(['Chiroptera'])
    // Circus animals are not in the identifier table, so they get the default
    // Description and Identification details fields.
    const circusIdentification = cardTitled('Travelling circus and menagerie animals').locator('.app-dr2-review-identification-table')
    await expect(circusIdentification).toHaveCount(1)
    await expect(circusIdentification).toContainText('Description')
    await expect(circusIdentification).toContainText('BAT-001')
  })

  test('renders the results for "010" in under 50 ms', async ({ page }) => {
    const renderMs = await page.locator('#commodity-search').evaluate((input) => {
      input.value = '010'
      const start = performance.now()
      input.dispatchEvent(new Event('input', { bubbles: true }))
      return performance.now() - start
    })

    await expect(page.locator('#commodity-search-results')).toBeVisible()
    expect(renderMs).toBeLessThan(50)
  })
})

test.describe(`dashboard templates on ${TEMPLATES_BASE}`, () => {
  test('keep their card commodity label and consignment species', async ({ page }) => {
    const templatesById = {}

    for (const template of dashboardTemplates) {
      await page.goto(`${TEMPLATES_BASE}/templates`)
      const commodityLabel = await page
        .locator(`article[aria-label="Template ${template.title}"] .app-dr2-dashboard-template-card__value`)
        .first()
        .textContent()

      await page.goto(`${TEMPLATES_BASE}/templates/${template.id}/use`)
      await page.goto(`${TEMPLATES_BASE}/consignment-details`)
      const consignmentSpecies = await page.locator('.app-consignment-details-page__species-name').allTextContents()

      templatesById[template.id] = {
        commodityLabel: commodityLabel.trim(),
        consignmentSpecies: consignmentSpecies.map((name) => name.trim())
      }
    }

    if (isRecording) {
      writeFixture('templates', templatesById)
    }

    expect(templatesById).toEqual(readFixture('templates'))
  })
})

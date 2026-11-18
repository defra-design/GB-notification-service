const { test, expect } = require('@playwright/test')
const liveCommodities = require('../../app/data/commodities')
const germinalCommodities = require('../../app/data/commodities-germinal-products')
const { getIdentifierFields, identifiersByCommodityId, identifiersBySpeciesId } = require('../../app/data/commodity-identifiers')
const { clickContinue, openCommoditySearch, selectSpecies } = require('./commodity-search-page')

const DESIGN_RELEASE = { base: '/design-release-2.1', notificationType: 'live-animals' }
const ROOT = { base: '', notificationType: null }

function labelsFor (commodityId, speciesId, isGerminalProduct = false) {
  return getIdentifierFields({ commodityId, speciesId, isGerminalProduct }).map((field) => field.label)
}

async function openIdentification (page, version, species) {
  await openCommoditySearch(page, version)
  for (const { query, id } of species) {
    await selectSpecies(page, query, id)
  }
  await clickContinue(page)
  await page.goto(`${version.base}/consignment-details`)
  for (const { id, count } of species) {
    await page.locator(`input[name="numberOfAnimals[${id}]"]`).fill(String(count || 1))
  }
  await clickContinue(page)
  await expect(page).toHaveURL(/\/animal-identification-details$/)
}

async function fieldLabels (page, speciesId) {
  const fields = page.locator(`[id^="identifier-${speciesId}-"]`)
  await expect(fields.first()).toBeVisible()

  return fields.evaluateAll((elements) => elements.map((element) => {
    const label = document.querySelector(`label[for="${element.id}"]`)
    return label ? label.textContent.replace(/\s+/g, ' ').trim() : null
  }).filter(Boolean))
}

test.describe('animal identifier fields, from the Live Animal Identifiers table', () => {
  test('every commodity and species named in the table exists in the prototype data', () => {
    const liveIds = new Set(liveCommodities.map((commodity) => commodity.id))
    const speciesIds = new Set(liveCommodities.flatMap((commodity) => commodity.species.map((species) => species.id)))

    expect(Object.keys(identifiersByCommodityId).filter((id) => !liveIds.has(id))).toEqual([])
    expect(Object.keys(identifiersBySpeciesId).filter((id) => !speciesIds.has(id))).toEqual([])
  })

  test('gives each listed commodity its own fields', () => {
    expect(labelsFor('cattle')).toEqual(['Passport', 'Ear tag', 'Identification number'])
    expect(labelsFor('horse')).toEqual(['Passport', 'Microchip/Transponder', 'Equine name'])
    expect(labelsFor('horse', 'horse-equus-asinus')).toEqual(['Passport', 'Microchip/Transponder'])
    expect(labelsFor('goat')).toEqual(['Microchip/Transponder', 'Ear tag', 'Identification number'])
    expect(labelsFor('cat')).toEqual(['Passport', 'Microchip/Transponder', 'Tattoo'])
    expect(labelsFor('ferret')).toEqual(['Passport', 'Microchip/Transponder', 'Tattoo', 'Description', 'Identification details'])
    expect(labelsFor('chicken')).toEqual(['Flock ID', 'Classification', 'Description', 'Identification details', 'Hatching date'])
    expect(labelsFor('other-birds', 'other-birds-phasianus-spp')).toEqual(['Flock ID', 'Classification', 'Description', 'Identification details', 'Hatching date'])
    expect(labelsFor('rabbit', 'rabbit-oryctolagus-cuniculus')).toEqual(['Microchip/Transponder'])
    expect(labelsFor('hatching-eggs-chicken')).toEqual([
      'Classification', 'Egg mark', 'Identification mark', 'Description', 'Batch number',
      'Collection date', 'Production date', 'Hatching date'
    ])
  })

  test('gives every germinal product the same fields', () => {
    for (const commodity of germinalCommodities) {
      expect(labelsFor(commodity.id, null, true)).toEqual([
        'Identification number', 'Donor ID', 'Identification mark', 'Collection date', 'Production date'
      ])
    }
  })

  test('gives any commodity not in the table the default fields', () => {
    for (const commodityId of ['other-live-mammals', 'other-birds', 'oysters', 'circus-animals', 'primates']) {
      expect(labelsFor(commodityId)).toEqual(['Description', 'Identification details'])
    }
  })
})

test.describe('animal identification page on /design-release-2.1 (live-animals)', () => {
  test('shows the default fields for a polar bear', async ({ page }) => {
    const speciesId = 'other-live-mammals-69-other-carnivora'
    await openIdentification(page, DESIGN_RELEASE, [{ query: 'Other Carnivora', id: speciesId }])

    expect(await fieldLabels(page, speciesId)).toEqual(['Description', 'Identification details'])
  })

  test('shows a classification list, dates and identifiers for chickens', async ({ page }) => {
    const speciesId = 'chicken-gallus-domesticus'
    await openIdentification(page, DESIGN_RELEASE, [{ query: 'chicken', id: speciesId, count: 2 }])

    expect(await fieldLabels(page, speciesId)).toEqual(['Flock ID', 'Classification', 'Description', 'Identification details', 'Hatching date'])
    await expect(page.locator(`select#identifier-${speciesId}-classification option`)).toHaveText([
      'Select classification', 'Broilers', 'Grandparent', 'Laying pullets', 'Parents', 'Pure line', 'Others'
    ])
  })

  test('asks for at least one identifier, and saves an animal with only one', async ({ page }) => {
    const speciesId = 'chicken-gallus-domesticus'
    await openIdentification(page, DESIGN_RELEASE, [{ query: 'chicken', id: speciesId, count: 2 }])

    await page.locator(`button[name="action"][value="save:${speciesId}"]`).click()
    await expect(page.locator('.govuk-error-summary')).toContainText('Enter at least one identifier for Gallus domesticus 1')

    await page.locator(`select#identifier-${speciesId}-classification`).selectOption('Broilers')
    await page.locator(`button[name="action"][value="save:${speciesId}"]`).click()
    await expect(page.locator('.govuk-error-summary')).toHaveCount(0)

    const saved = page.locator('.app-animal-identification-panel__saved')
    await expect(saved.locator('.app-animal-identification-panel__saved-row--header .app-animal-identification-panel__saved-value')).toHaveText(['Classification'])
    await expect(saved.locator('.app-animal-identification-panel__saved-row:not(.app-animal-identification-panel__saved-row--header) .app-animal-identification-panel__saved-value')).toHaveText(['Broilers'])
  })

  test('refuses a hatching date that is not a date', async ({ page }) => {
    const speciesId = 'chicken-gallus-domesticus'
    await openIdentification(page, DESIGN_RELEASE, [{ query: 'chicken', id: speciesId, count: 2 }])

    await page.locator(`#identifier-${speciesId}-hatching-date`).fill('soon')
    await page.locator(`button[name="action"][value="save:${speciesId}"]`).click()
    await expect(page.locator('.govuk-error-summary')).toContainText('Enter a hatching date in the format DD/MM/YYYY')
  })
})

test.describe('animal identification page on / (root)', () => {
  test('shows the same fields, including the classification list, as the design release', async ({ page }) => {
    const speciesId = 'chicken-gallus-domesticus'
    await openIdentification(page, ROOT, [{ query: 'chicken', id: speciesId, count: 2 }])

    expect(await fieldLabels(page, speciesId)).toEqual(['Flock ID', 'Classification', 'Description', 'Identification details', 'Hatching date'])
    await expect(page.locator(`select#identifier-${speciesId}-classification`)).toBeVisible()
  })
})

const path = require('path')
const { test, expect } = require('@playwright/test')
const { clickContinue, openCommoditySearch, search, selectSpecies } = require('../e2e/commodity-search-page')

const screenshotDir = process.env.SCREENSHOT_DIR || path.join(__dirname, '..', 'screenshots')
const liveAnimals = { base: '/design-release-2.1', notificationType: 'live-animals' }

const SEARCHES = [
  { query: 'cow', file: 'search-cow' },
  { query: 'Bos taurus', file: 'search-bos-taurus' },
  { query: '0102', file: 'search-0102' },
  { query: 'semen', file: 'search-semen' },
  { query: 'horse', file: 'search-horse' },
  { query: 'Amazon parrot', file: 'search-amazon-parrot' }
]

async function saveScreenshot (page, file) {
  await page.screenshot({ path: path.join(screenshotDir, `${file}.png`), fullPage: true })
}

test.describe('commodity manual checks on /design-release-2.1 (live-animals)', () => {
  test.beforeEach(async ({ page }) => {
    await openCommoditySearch(page, liveAnimals)
  })

  for (const { query, file } of SEARCHES) {
    test(`shows results for "${query}"`, async ({ page }) => {
      await search(page, query)
      await expect(page.locator('#commodity-search-results > li').first()).toBeVisible()
      await saveScreenshot(page, file)
    })
  }

  test('takes a primate through to review', async ({ page }) => {
    const speciesId = 'primates-alouatta'

    await search(page, 'Primates')
    await expect(page.locator(`#commodity-species-${speciesId}`)).toBeVisible()
    await saveScreenshot(page, 'primates-1-search')

    await selectSpecies(page, 'Primates', speciesId)
    await expect(page.locator('#commodity-search-selected-heading')).toHaveText('1 selected')
    await saveScreenshot(page, 'primates-2-selected')
    await clickContinue(page)

    await page.goto(`${liveAnimals.base}/consignment-details`)
    await page.locator(`input[name="numberOfAnimals[${speciesId}]"]`).fill('2')
    await saveScreenshot(page, 'primates-3-consignment-details')
    await clickContinue(page)

    await page.goto(`${liveAnimals.base}/review-notification`)
    await expect(page.locator('.app-dr2-review-card__title', { hasText: 'Monkeys, apes and other primates' })).toBeVisible()
    await saveScreenshot(page, 'primates-4-review')
  })
})

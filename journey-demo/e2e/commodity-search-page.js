const { expect } = require('@playwright/test')

async function clickContinue (page) {
  const action = page.locator('button[name="action"][value="continue"]')
  const button = (await action.count())
    ? action.first()
    : page.getByRole('button', { name: /continue/i }).first()
  await button.click()
}

async function openCommoditySearch (page, version) {
  await page.goto(`${version.base}/create-notification`, { waitUntil: 'networkidle' })

  if (version.notificationType) {
    await expect(page).toHaveURL(/\/notification-type$/)
    await page.locator(`input[name="notificationType"][value="${version.notificationType}"]`).check()
    await clickContinue(page)
    await page.waitForURL(/\/origin-of-the-import$/, { waitUntil: 'networkidle' })
  }

  await page.goto(`${version.base}/what-are-you-importing`)
  await expect(page.locator('input.app-commodity-search__species-value')).toHaveValue('[]')
}

async function search (page, query) {
  await page.locator('#commodity-search').fill(query)
}

async function waitForCommonNames (page) {
  await page.locator('#commodity-search').focus()
  await expect(page.locator('[data-module="app-commodity-search"]')).toHaveAttribute('data-common-names-loaded', 'true')
}

async function selectSpecies (page, query, speciesId) {
  await search(page, query)
  await page.locator(`#commodity-species-${speciesId}`).check()
  await page.locator('#commodity-search').press('Escape')
}

module.exports = { clickContinue, openCommoditySearch, search, selectSpecies, waitForCommonNames }

// The postcode lookup spike, against real Companies House data. It needs the
// files `npm run build:postcode-addresses` writes, so it skips where they have
// not been built. The expected addresses are from the 1 November 2026 snapshot.

const fs = require('fs')
const path = require('path')
const { test, expect } = require('@playwright/test')

const manifest = path.join(__dirname, '..', '..', 'app', 'data', 'generated', 'postcode-addresses', 'manifest.json')

test.skip(!fs.existsSync(manifest), 'Run npm run build:postcode-addresses first')

async function lookUp (page, input) {
  await page.goto('/postcode-lookup')
  await page.getByLabel('Postcode').fill(input)
  await page.getByRole('button', { name: 'Find address' }).click()
}

const results = (page) => page.getByTestId('postcode-addresses').getByRole('listitem')

test('lowercase, spaced input finds the registered office addresses', async ({ page }) => {
  await lookUp(page, '  m1   1al ')

  await expect(page.getByRole('heading', { name: 'Registered office addresses' })).toBeVisible()
  await expect(page.getByLabel('Postcode')).toHaveValue('  m1   1al ')
  // Two flats in one building stay two addresses.
  await expect(results(page)).toHaveText([
    'FLAT 105 OXID HOUSE, 78 NEWTON STREET, MANCHESTER, M1 1AL',
    'FLAT 606 OXID HOUSE, 78 NEWTON STREET, MANCHESTER, M1 1AL'
  ])
})

test('an address many companies share appears once', async ({ page }) => {
  // 14,369 private limited companies give exactly this registered office.
  await lookUp(page, 'n17gu')

  await expect(results(page).filter({ hasText: /^20-22 WENLOCK ROAD, LONDON, N1 7GU$/ })).toHaveCount(1)
})

test('separate units at one postcode stay apart', async ({ page }) => {
  await lookUp(page, 'BB4 4JG')

  for (const unit of ['UNIT 1 YORK AVENUE', 'UNIT 2 YORK AVENUE', 'UNIT 4 YORK AVENUE']) {
    await expect(results(page).filter({ hasText: new RegExp(`^${unit}, HASLINGDEN`) })).toHaveCount(1)
  }
})

test('a valid postcode with no addresses says so', async ({ page }) => {
  await lookUp(page, 'ZZ9 9ZZ')

  await expect(page.getByRole('heading', { name: 'No registered office addresses found for ZZ9 9ZZ' })).toBeVisible()
  await expect(page.getByTestId('postcode-addresses')).toHaveCount(0)
})

for (const [input, message] of [
  ['', 'Enter a postcode'],
  ['BB4', 'Enter a full UK postcode, like BB4 4AA'],
  ['../../etc', 'Enter a full UK postcode, like BB4 4AA']
]) {
  test(`"${input}" shows the error "${message}"`, async ({ page }) => {
    await lookUp(page, input)

    await expect(page).toHaveTitle(/^Error: /)
    await expect(page.locator('.govuk-error-summary')).toContainText(message)
    await expect(page.locator('#postcode-error')).toContainText(message)
    await expect(page.getByTestId('postcode-addresses')).toHaveCount(0)
  })
}

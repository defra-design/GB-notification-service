// The find an address page in front of the UK address forms in design release
// 2.1, against real Companies House data. It needs the files
// `npm run build:postcode-addresses` writes, so it skips where they have not
// been built. The expected addresses are from the 1 November 2026 snapshot.

const fs = require('fs')
const path = require('path')
const { test, expect } = require('@playwright/test')

const manifest = path.join(__dirname, '..', '..', 'app', 'data', 'generated', 'postcode-addresses', 'manifest.json')

test.skip(!fs.existsSync(manifest), 'Run npm run build:postcode-addresses first')

const BASE = '/design-release-2.1'

async function startAddressBookAdd (page) {
  await page.goto(`${BASE}/address-book/add`)
  await page.locator('input[value="destination-consignee-importer"]').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(new RegExp(`${BASE}/address-book/add/find-address$`))
}

async function findPostcode (page, input) {
  await page.getByLabel('Postcode', { exact: true }).fill(input)
  await page.getByRole('button', { name: 'Find address' }).click()
}

async function expectFilledIn (page, fields) {
  await expect(page.locator('#address-book-manual-address-line-1')).toHaveValue(fields.line1)
  await expect(page.locator('#address-book-manual-address-line-2')).toHaveValue(fields.line2)
  await expect(page.locator('#address-book-manual-town-or-city')).toHaveValue(fields.town)
  await expect(page.locator('#address-book-manual-postcode')).toHaveValue(fields.postcode)
}

test.describe('address book: adding a destination address', () => {
  test('a chosen address fills in the form', async ({ page }) => {
    await startAddressBookAdd(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find an address')

    await findPostcode(page, '  m1   1al ')
    const select = page.getByLabel('Select an address')
    await expect(select.locator('option')).toHaveText([
      '2 addresses found',
      'FLAT 105 OXID HOUSE, 78 NEWTON STREET, MANCHESTER, M1 1AL',
      'FLAT 606 OXID HOUSE, 78 NEWTON STREET, MANCHESTER, M1 1AL'
    ])

    await select.selectOption({ label: 'FLAT 606 OXID HOUSE, 78 NEWTON STREET, MANCHESTER, M1 1AL' })
    await page.getByRole('button', { name: 'Use this address' }).click()

    await expect(page).toHaveURL(new RegExp(`${BASE}/address-book/add/lookup$`))
    await expectFilledIn(page, {
      line1: 'FLAT 606 OXID HOUSE',
      line2: '78 NEWTON STREET',
      town: 'MANCHESTER',
      postcode: 'M1 1AL'
    })
  })

  test('a chosen address saves to the address book once the rest is filled in', async ({ page }) => {
    await startAddressBookAdd(page)
    await findPostcode(page, 'BB4 4JG')
    await page.getByLabel('Select an address').selectOption({ label: 'UNIT 2 YORK AVENUE, HASLINGDEN, ROSSENDALE, BB4 4JG' })
    await page.getByRole('button', { name: 'Use this address' }).click()
    // The page's search script fills the fields in as it starts, so let it
    // finish before typing.
    await page.waitForLoadState('load')

    await page.locator('#address-book-manual-name').fill('Rossendale Livestock Ltd')
    await page.locator('#address-book-manual-email').fill('office@example.com')
    await page.locator('#address-book-manual-phone').fill('01706 000000')
    await page.getByRole('checkbox', { name: 'Consignee' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL(new RegExp(`${BASE}/address-book`))
    await expect(page.getByText('UNIT 2 YORK AVENUE').first()).toBeVisible()
  })

  test('using an address with none chosen asks for one', async ({ page }) => {
    await startAddressBookAdd(page)
    await findPostcode(page, 'BB4 4JG')
    await page.getByRole('button', { name: 'Use this address' }).click()

    await expect(page).toHaveTitle(/^Error: /)
    await expect(page.locator('#address-id-error')).toContainText('Select an address')
  })

  for (const [input, message] of [
    ['', 'Enter a postcode'],
    ['BB4', 'Enter a full UK postcode, like BB4 4AA']
  ]) {
    test(`"${input}" shows the error "${message}"`, async ({ page }) => {
      await startAddressBookAdd(page)
      await findPostcode(page, input)

      await expect(page.locator('#postcode-error')).toContainText(message)
      await expect(page.getByLabel('Select an address')).toHaveCount(0)
    })
  }

  test('a postcode with no addresses offers manual entry', async ({ page }) => {
    await startAddressBookAdd(page)
    await findPostcode(page, 'ZZ9 9ZZ')

    await expect(page.getByRole('heading', { name: 'No addresses found for ZZ9 9ZZ' })).toBeVisible()
    await page.getByRole('link', { name: 'Enter the address manually' }).click()

    await expect(page).toHaveURL(new RegExp(`${BASE}/address-book/add/lookup\\?manual=true$`))
    await expect(page.locator('#address-book-manual-address-line-1')).toBeVisible()
    await expect(page.locator('#address-book-manual-address-line-1')).toHaveValue('')
  })
})

test.describe('notification: adding a consignee address', () => {
  test('a chosen address fills in the form', async ({ page }) => {
    await page.goto(`${BASE}/consignee`)
    await page.getByRole('button', { name: 'Add a new address' }).click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/consignee/find-address$`))

    await findPostcode(page, 'n1 7gu')
    await page.getByLabel('Select an address').selectOption({ label: '20-22 WENLOCK ROAD, LONDON, N1 7GU' })
    await page.getByRole('button', { name: 'Use this address' }).click()

    await expect(page).toHaveURL(new RegExp(`${BASE}/consignee/add-address\\?foundAddressId=ch-N17GU-\\d+$`))
    await expectFilledIn(page, {
      line1: '20-22 WENLOCK ROAD',
      line2: '',
      town: 'LONDON',
      postcode: 'N1 7GU'
    })
    await expect(page.getByRole('link', { name: 'Back', exact: true }).first()).toHaveAttribute('href', `${BASE}/consignee/find-address`)
  })
})

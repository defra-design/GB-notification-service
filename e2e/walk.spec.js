const { test, expect } = require('@playwright/test')
const journeyHelpers = require('./journey')

const {
  JOURNEYS,
  resetSession,
  saveToHub,
  fillOrigin,
  fillCommodity,
  fillReason,
  fillConsignmentDetails,
  fillAnimalIdentification,
  fillAdditionalAnimalDetails,
  fillArrivalDetails,
  fillTransitCountries,
  fillTransporter,
  fillUploadDocuments,
  fillAddressSections,
  fillRolesAndAddresses,
  fillContactAddress,
  fillReview,
  fillDeclaration
} = journeyHelpers

// One demo walk per journey variant. The video + trace are the deliverable;
// the assertions only pin that each conditional branch appeared (or didn't) and
// that the journey reached the confirmation page.
for (const journey of JOURNEYS) {
  test.describe(`walk — ${journey.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await resetSession(page)
    })

    test('completes the notification and reaches the confirmation page', async ({ page }) => {
      // Section 1 — about the consignment
      await fillOrigin(page, journey)
      await fillCommodity(page, journey)
      await fillReason(page, journey)
      await fillConsignmentDetails(page, journey)

      // Conditional — animal identification (inserted for species with identifiers)
      if (journey.hasAnimalIdentification) {
        await expect(page).toHaveURL(/\/animal-identification-details$/)
        await fillAnimalIdentification(page, journey)
      } else {
        await expect(page).not.toHaveURL(/\/animal-identification-details$/)
      }

      await fillAdditionalAnimalDetails(page, journey)

      // Section 2 — arrival + transport
      await fillArrivalDetails(page, journey)

      // Conditional — transit countries (inserted for rail / road vehicle)
      if (journey.transitCountry) {
        await expect(page).toHaveURL(/\/transit-countries$/)
        await fillTransitCountries(page, journey)
      } else {
        await expect(page).not.toHaveURL(/\/transit-countries$/)
      }

      await fillTransporter(page, journey)
      await fillUploadDocuments(page)

      // Section 3 — roles, addresses and declaration
      await expect(page).toHaveURL(/\/roles-and-addresses$/)
      if (journey.addressSections) {
        await fillAddressSections(page, journey)
      }
      await fillRolesAndAddresses(page)
      await fillContactAddress(page, journey)
      await fillReview(page)

      await expect(page).toHaveURL(/\/declaration$/)
      await fillDeclaration(page)

      await expect(page).toHaveURL(/\/notification-submitted$/)
      await expect(
        page.getByRole('heading', { name: 'Import notification submitted' })
      ).toBeVisible()
    })
  })
}

// Task-list walk: part-fill the journey, save to the hub to surface the task
// list, then submit straight from the task list.
test.describe('walk — task list (save to the hub and submit)', () => {
  test('saves progress to the hub, then submits from the task list', async ({ page }) => {
    const journey = JOURNEYS[0] // cattle

    await resetSession(page)
    await fillOrigin(page, journey)
    await fillCommodity(page, journey)
    await fillReason(page, journey)

    // On commodity details, return to the overview instead of continuing.
    const count = page.locator(`input[name="numberOfAnimals[${journey.species.id}]"]`)
    if (await count.count()) {
      await count.fill(journey.animalCount)
    }
    await saveToHub(page)

    // The task list, showing the sections completed so far.
    await expect(page).toHaveURL(/\/notification-hub$/)
    await expect(page.getByRole('link', { name: 'Arrival details' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Roles and addresses' })).toBeVisible()

    // Review and submit from here.
    await page.goto('/review-notification')
    await fillReview(page)
    await expect(page).toHaveURL(/\/declaration$/)
    await fillDeclaration(page)

    await expect(page).toHaveURL(/\/notification-submitted$/)
    await expect(
      page.getByRole('heading', { name: 'Import notification submitted' })
    ).toBeVisible()
  })
})

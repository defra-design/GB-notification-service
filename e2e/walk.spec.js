const { test, expect } = require('@playwright/test')
const journeyHelpers = require('./journey')

const {
  JOURNEYS,
  resetSession,
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
        await fillAnimalIdentification(page)
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

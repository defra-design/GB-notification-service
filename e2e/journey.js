//
// Page-object helpers for the notification journey demo walk.
//
// The prototype's server-side validation is almost entirely stubbed — only
// /declaration blocks progress — but this walk fills each page as a user would
// so the recorded video/trace reads as a genuine journey. Data-driven variants
// exercise the journey's conditional branches and sub-journeys:
//   - cattle + air   → animal identification + all address sub-sections (a
//                      complete notification); transit skipped
//   - poultry + rail → transit-countries branch; animal identification skipped
//   - cat + air      → animal identification + permanent-address sub-journey
//
const { expect } = require('@playwright/test')

// Address sub-sections reachable from /roles-and-addresses. `kind` selects how
// the sub-page is filled. Address ids are real values from the fixtures.
const CORE_ADDRESS_SECTIONS = [
  { href: '/place-of-origin', kind: 'radio', field: 'placeOfOriginAddressId', value: 'green-valley-livestock-farm' },
  { href: '/consignor-or-exporter', kind: 'radio', field: 'consignorAddressId', value: 'nordic-livestock-export' },
  { href: '/consignee', kind: 'radio', field: 'consigneeAddressId', value: 'northern-livestock-imports' },
  { href: '/importer', kind: 'radio', field: 'importerAddressId', value: 'britannia-trade-livestock' },
  { href: '/place-of-destination', kind: 'radio', field: 'placeOfDestinationAddressId', value: 'riverside-holding-facility' }
]

const JOURNEYS = [
  {
    id: 'cattle-air',
    label: 'Cattle imported by air (animal identification, all addresses)',
    country: { search: 'France', option: 'France' },
    reference: 'DEMO-CATTLE-001',
    species: { search: 'cattle', id: 'cattle-bos-taurus' },
    reason: 'Internal market',
    animalCount: '2',
    hasAnimalIdentification: true,
    unweaned: 'No',
    certificationPurpose: 'Slaughter',
    port: { search: 'Heathrow', option: 'London Heathrow' },
    meansOfTransport: 'Airplane',
    transportId: 'BA0123',
    transitCountry: null,
    transporterId: 'aberdeen-livestock',
    contactAddressId: 'aberdeen-livestock-union-street',
    addressSections: [...CORE_ADDRESS_SECTIONS, { href: '/cph-number', kind: 'cph' }]
  },
  {
    id: 'chicken-rail',
    label: 'Poultry imported by rail (transit countries, no animal identification)',
    country: { search: 'Germany', option: 'Germany' },
    reference: 'DEMO-POULTRY-002',
    species: { search: 'chicken', id: 'chicken-gallus-domesticus' },
    reason: 'Internal market',
    animalCount: '400',
    hasAnimalIdentification: false,
    unweaned: null,
    certificationPurpose: null,
    port: null,
    meansOfTransport: 'Railway',
    transportId: 'EU-RAIL-77',
    transitCountry: { search: 'France', option: 'France' },
    transporterId: 'danish-meat-export',
    contactAddressId: 'aberdeen-livestock-harbour-road',
    addressSections: null
  },
  {
    id: 'cat-permanent-address',
    label: 'Pet cat imported by air (permanent address sub-journey)',
    country: { search: 'France', option: 'France' },
    reference: 'DEMO-PET-003',
    species: { search: 'felis', id: 'cat-felis-catus' },
    reason: 'Internal market',
    animalCount: '1',
    hasAnimalIdentification: true,
    unweaned: null,
    certificationPurpose: null,
    port: { search: 'Heathrow', option: 'London Heathrow' },
    meansOfTransport: 'Airplane',
    transportId: 'BA0456',
    transitCountry: null,
    transporterId: 'aberdeen-livestock',
    contactAddressId: 'aberdeen-livestock-union-street',
    addressSections: [...CORE_ADDRESS_SECTIONS, { href: '/permanent-address', kind: 'permanent' }]
  }
]

// --- low-level primitives -------------------------------------------------

async function fillText (page, name, value) {
  await page.locator(`input[name="${name}"]`).fill(value)
}

async function pickRadio (page, name, value) {
  await page.locator(`input[name="${name}"][value="${value}"]`).check()
}

async function selectValue (page, name, value) {
  await page.locator(`select[name="${name}"]`).selectOption(value)
}

// Clicks the page's primary forward button, whichever form the page uses: most
// spine pages carry a two-button action=continue/hub group; a few use a plain
// submit ("Save and continue" / "Accept and submit").
async function clickContinue (page) {
  const action = page.locator('button[name="action"][value="continue"]')
  if (await action.count()) {
    await action.first().click()
    return
  }
  await page
    .getByRole('button', { name: /save and continue|continue|accept and submit|confirm|submit/i })
    .first()
    .click()
}

// Clicks the "Save and return to overview" button (action=hub) to jump to the
// task list mid-journey.
async function saveToHub (page) {
  await page.locator('button[name="action"][value="hub"]').first().click()
}

// Drives one of the bespoke type-and-pick autocompletes (country / airport /
// transit). Types the search term one key at a time (the widgets render on each
// input event), then clicks the rendered option, which writes the hidden value
// the server reads.
async function pickFromAutocomplete (page, inputId, field) {
  const input = page.locator(`#${inputId}`)
  const option = page
    .locator('button.app-country-search__option', { hasText: field.option })
    .first()
  await input.click()
  await input.fill('')
  await input.pressSequentially(field.search)
  try {
    await option.waitFor({ state: 'visible', timeout: 4000 })
  } catch {
    // At demo pace the widget's blur timer can close the list before we click.
    // Re-trigger a render while keeping focus on the input (no blur): delete and
    // retype the last character.
    await input.press('Backspace')
    await input.pressSequentially(field.search.slice(-1))
    await option.waitFor({ state: 'visible', timeout: 8000 })
  }
  await option.click()
}

// --- per-page fill helpers ------------------------------------------------

async function fillOrigin (page, journey) {
  await pickFromAutocomplete(page, 'country-of-origin', journey.country)
  await pickRadio(page, 'regionOfOriginRequired', 'No')
  await fillText(page, 'internalReference', journey.reference)
  await clickContinue(page)
}

async function fillCommodity (page, journey) {
  const search = page.locator('#commodity-search')
  await search.fill(journey.species.search)
  await page.locator(`#commodity-species-${journey.species.id}`).check()
  // The checkbox's change handler writes the selection into the hidden
  // selectedSpecies field asynchronously — wait for it so the POST carries the
  // species (which drives the animal-identification branch).
  await expect(page.locator('input.app-commodity-search__species-value')).toHaveValue(
    new RegExp(journey.species.id)
  )
  // Checking a species reopens the results dropdown, which overlays the submit
  // button — dismiss it before continuing.
  await search.press('Escape')
  await clickContinue(page)
}

async function fillReason (page, journey) {
  await pickRadio(page, 'importReason', journey.reason)
  await clickContinue(page)
}

async function fillConsignmentDetails (page, journey) {
  // Not every commodity asks for a per-species animal count (e.g. poultry), so
  // only fill it when the page renders the field.
  const count = page.locator(`input[name="numberOfAnimals[${journey.species.id}]"]`)
  if (await count.count()) {
    await count.fill(journey.animalCount)
  }
  await clickContinue(page)
}

// Enters identifiers for each animal (fills the visible identifier fields and
// saves), then advances. Filling all animals leaves the section complete.
async function fillAnimalIdentification (page, journey) {
  const animals = Number(journey.animalCount) || 1
  for (let a = 0; a < animals; a += 1) {
    const fields = page.locator('input[name^="identifiers["]')
    const n = await fields.count()
    if (n === 0) break // section already complete
    for (let i = 0; i < n; i += 1) {
      await fields.nth(i).fill(`UK-${journey.species.id}-${a + 1}-${i + 1}`)
    }
    await page.locator('button[name="action"][value^="save:"]').first().click()
  }
  await page.locator('button[name="action"][value="continue"]').first().click()
}

async function fillAdditionalAnimalDetails (page, journey) {
  if (journey.certificationPurpose) {
    await pickRadio(page, 'certificationPurpose', journey.certificationPurpose)
  }
  if (journey.unweaned) {
    await pickRadio(page, 'unweanedAnimals', journey.unweaned)
  }
  await clickContinue(page)
}

async function fillArrivalDetails (page, journey) {
  const dateInput = page.locator('input[name="arrivalDateAtPort"]')
  await dateInput.fill('27/8/2026')
  // Close the MOJ date picker so its calendar can't overlay the port dropdown.
  await dateInput.press('Escape')
  if (journey.port) {
    await pickFromAutocomplete(page, 'port-of-entry', journey.port)
  }
  await selectValue(page, 'meansOfTransport', journey.meansOfTransport)
  await fillText(page, 'transportIdentification', journey.transportId)
  await clickContinue(page)
}

async function fillTransitCountries (page, journey) {
  if (journey.transitCountry) {
    await pickFromAutocomplete(page, 'transit-country-search', journey.transitCountry)
  }
  await clickContinue(page)
}

async function fillTransporter (page, journey) {
  await pickRadio(page, 'transporterId', journey.transporterId)
  await clickContinue(page)
}

async function fillUploadDocuments (page) {
  await clickContinue(page)
}

// Fills each address sub-section from the roles-and-addresses hub. Each
// sub-page submits back to /roles-and-addresses, so the loop returns there
// between sections; the caller then continues off the roles page.
async function fillAddressSections (page, journey) {
  for (const section of journey.addressSections || []) {
    await page.locator(`a[href="${section.href}"]`).first().click()
    if (section.kind === 'radio') {
      await pickRadio(page, section.field, section.value)
    } else if (section.kind === 'cph') {
      await fillText(page, 'cphNumber-county', '12')
      await fillText(page, 'cphNumber-parish', '345')
      await fillText(page, 'cphNumber-holding', '6789')
    } else if (section.kind === 'permanent') {
      // Reuse the place-of-destination address for every animal.
      const sameAsPod = page.locator('input[value="same-as-pod"]')
      const n = await sameAsPod.count()
      for (let i = 0; i < n; i += 1) {
        await sameAsPod.nth(i).check()
      }
    }
    await page.getByRole('button', { name: /save and continue/i }).first().click()
    await page.waitForURL('**/roles-and-addresses')
  }
}

async function fillRolesAndAddresses (page) {
  await clickContinue(page)
}

async function fillContactAddress (page, journey) {
  await pickRadio(page, 'contactAddressId', journey.contactAddressId)
  await clickContinue(page)
}

async function fillReview (page) {
  await clickContinue(page)
}

async function fillDeclaration (page) {
  await page.locator('#declaration-confirmed').check()
  await clickContinue(page)
}

// Resets the yar session and lands on the first journey page.
async function resetSession (page) {
  await page.goto('/create-notification')
  await expect(page).toHaveURL(/\/origin-of-the-import$/)
}

module.exports = {
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
}

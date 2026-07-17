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

// --- pacing ---------------------------------------------------------------
// The audience is non-technical product owners: type like a person and pause on
// each new page so the walk-through is easy to follow. (waitForTimeout is
// deliberate here — pacing IS the point of this suite, not a race workaround.)
const TYPE_DELAY = 80    // ms per character while typing
const FIELD_PAUSE = 500  // ms after filling or choosing a field
const STEP_PAUSE = 1400  // ms after the page changes, to take it in
const SCROLL_PAUSE = 400 // ms for the scroll-to-centre to settle

function pause (page, ms) {
  return page.waitForTimeout(ms)
}

// Scrolls a target to the middle of the frame before we touch it, so it (and
// the page around it) stays comfortably in shot rather than at the very bottom
// edge, where Playwright's default "scroll just enough" leaves it.
async function scrollTo (locator) {
  await locator.scrollIntoViewIfNeeded()
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  await locator.page().waitForTimeout(SCROLL_PAUSE)
}

async function clickAt (locator) {
  await scrollTo(locator)
  await locator.click()
}

async function checkAt (locator) {
  await scrollTo(locator)
  await locator.check()
}

// Types a value character by character into a text box, as a person would.
async function typeInto (locator, value) {
  await scrollTo(locator)
  await locator.click()
  await locator.fill('')
  await locator.pressSequentially(String(value), { delay: TYPE_DELAY })
}

// --- low-level primitives -------------------------------------------------

async function fillText (page, name, value) {
  await typeInto(page.locator(`input[name="${name}"]`), value)
  await pause(page, FIELD_PAUSE)
}

async function pickRadio (page, name, value) {
  await checkAt(page.locator(`input[name="${name}"][value="${value}"]`))
  await pause(page, FIELD_PAUSE)
}

async function selectValue (page, name, value) {
  const select = page.locator(`select[name="${name}"]`)
  await scrollTo(select)
  await select.selectOption(value)
  await pause(page, FIELD_PAUSE)
}

// Clicks the page's primary forward button, whichever form the page uses: most
// spine pages carry a two-button action=continue/hub group; a few use a plain
// submit ("Save and continue" / "Accept and submit").
async function clickContinue (page) {
  const action = page.locator('button[name="action"][value="continue"]')
  const button = (await action.count())
    ? action.first()
    : page
      .getByRole('button', { name: /save and continue|continue|accept and submit|confirm|submit/i })
      .first()
  await clickAt(button)
  await pause(page, STEP_PAUSE)
}

// Clicks the "Save and return to overview" button (action=hub) to jump to the
// task list mid-journey.
async function saveToHub (page) {
  await clickAt(page.locator('button[name="action"][value="hub"]').first())
  await pause(page, STEP_PAUSE)
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
  await scrollTo(input)
  await input.click()
  await input.fill('')
  await input.pressSequentially(field.search, { delay: TYPE_DELAY })
  try {
    await option.waitFor({ state: 'visible', timeout: 4000 })
  } catch {
    // The widget's blur timer can occasionally close the list before we click.
    // Re-trigger a render while keeping focus on the input (no blur): delete and
    // retype the last character.
    await input.press('Backspace')
    await input.pressSequentially(field.search.slice(-1), { delay: TYPE_DELAY })
    await option.waitFor({ state: 'visible', timeout: 8000 })
  }
  await clickAt(option)
  await pause(page, FIELD_PAUSE)
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
  await typeInto(search, journey.species.search)
  await checkAt(page.locator(`#commodity-species-${journey.species.id}`))
  await pause(page, FIELD_PAUSE)
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
    await typeInto(count, journey.animalCount)
    await pause(page, FIELD_PAUSE)
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
      await typeInto(fields.nth(i), `UK-${journey.species.id}-${a + 1}-${i + 1}`)
      await pause(page, FIELD_PAUSE)
    }
    await clickAt(page.locator('button[name="action"][value^="save:"]').first())
    await pause(page, STEP_PAUSE)
  }
  await clickAt(page.locator('button[name="action"][value="continue"]').first())
  await pause(page, STEP_PAUSE)
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
  await typeInto(dateInput, '27/8/2026')
  await pause(page, FIELD_PAUSE)
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
    await clickAt(page.locator(`a[href="${section.href}"]`).first())
    await pause(page, STEP_PAUSE)
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
        await checkAt(sameAsPod.nth(i))
        await pause(page, FIELD_PAUSE)
      }
    }
    await clickAt(page.getByRole('button', { name: /save and continue/i }).first())
    await page.waitForURL('**/roles-and-addresses')
    await pause(page, STEP_PAUSE)
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
  await checkAt(page.locator('#declaration-confirmed'))
  await pause(page, FIELD_PAUSE)
  await clickContinue(page)
}

// Resets the yar session and lands on the first journey page.
async function resetSession (page) {
  await page.goto('/create-notification')
  await expect(page).toHaveURL(/\/origin-of-the-import$/)
  await pause(page, STEP_PAUSE)
}

module.exports = {
  JOURNEYS,
  pause,
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

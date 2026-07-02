//
// Transit country search — select from dropdown, add to table, reset search (max 12)
//

const MIN_SEARCH_LENGTH = 3
const MAX_COUNTRIES = 12

function escapeHtml (value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function highlightMatch (text, query) {
  if (!query) {
    return escapeHtml(text)
  }

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)

  if (index === -1) {
    return escapeHtml(text)
  }

  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return `${escapeHtml(before)}<strong class="app-commodity-search__match">${escapeHtml(match)}</strong>${escapeHtml(after)}`
}

function countryOptionMatchesQuery (option, normalisedQuery) {
  if (option.label.toLowerCase().includes(normalisedQuery)) {
    return true
  }

  if (option.parent && option.parent.toLowerCase().includes(normalisedQuery)) {
    return true
  }

  return false
}

function getCountries (root) {
  const dataEl = root.querySelector('.app-transit-country-search__data')

  if (!dataEl) {
    return []
  }

  try {
    return JSON.parse(dataEl.textContent)
  } catch (error) {
    return []
  }
}

function parseSelectedCountries (valueInput) {
  if (!valueInput || !valueInput.value.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(valueInput.value)

    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch (error) {
    return []
  }
}

function initTransitCountrySearch (root) {
  const countryOptions = getCountries(root)
  const form = root.closest('form')
  const input = root.querySelector('.app-commodity-search__input')
  const button = root.querySelector('.app-commodity-search__button')
  const results = root.querySelector('.app-commodity-search__results')
  const status = root.querySelector('.app-transit-country-search__status')
  const valueInput = root.querySelector('.app-transit-country-search__value')
  const searchBox = root.querySelector('.app-commodity-search')
  const addCountryButton = root.querySelector('.app-transit-country-search__add-country')
  const addCountryWrapper = root.querySelector('.app-transit-countries-page__add-country')
  const summaryPanel = root.querySelector('.app-transit-countries-page__summary')
  const selectedRows = root.querySelector('.app-transit-country-search__selected-rows')

  if (!form || !input || !button || !results || !valueInput || !addCountryButton || !addCountryWrapper || !summaryPanel || !selectedRows) {
    return
  }

  let selectedCountries = parseSelectedCountries(valueInput)
  let pendingCountry = ''

  function setExpanded (isExpanded) {
    if (searchBox) {
      searchBox.setAttribute('aria-expanded', isExpanded ? 'true' : 'false')
      searchBox.classList.toggle('app-commodity-search--open', isExpanded)
    }
  }

  function announce (message) {
    if (status) {
      status.textContent = message
    }
  }

  function syncValueInput () {
    valueInput.value = JSON.stringify(selectedCountries)
  }

  function isAtMaxCountries () {
    return selectedCountries.length >= MAX_COUNTRIES
  }

  function updateCountryLimitState () {
    const atMax = isAtMaxCountries()

    addCountryWrapper.hidden = atMax
    input.disabled = atMax
    button.disabled = atMax
    searchBox.classList.toggle('app-commodity-search--disabled', atMax)

    if (atMax) {
      clearSearch()
    }
  }

  function clearSearch () {
    pendingCountry = ''
    input.value = ''
    closeResults()
  }

  function closeResults () {
    results.hidden = true
    results.innerHTML = ''
    setExpanded(false)
  }

  function getFilteredCountries (query) {
    const normalisedQuery = query.trim().toLowerCase()

    if (normalisedQuery.length < MIN_SEARCH_LENGTH) {
      return []
    }

    const takenCountries = new Set(selectedCountries)

    return countryOptions
      .filter((option) => countryOptionMatchesQuery(option, normalisedQuery))
      .filter((option) => !takenCountries.has(option.value))
      .sort((left, right) => left.label.localeCompare(right.label))
  }

  function setPendingCountry (country) {
    if (isAtMaxCountries()) {
      announce(`Maximum of ${MAX_COUNTRIES} countries reached. Remove a country to add another.`)
      return
    }

    pendingCountry = country
    input.value = country
    closeResults()
    announce(`Selected ${country}`)
  }

  function addPendingCountry () {
    if (!pendingCountry || selectedCountries.includes(pendingCountry)) {
      return
    }

    if (selectedCountries.length >= MAX_COUNTRIES) {
      announce(`Maximum of ${MAX_COUNTRIES} countries reached`)
      return
    }

    const countryToAdd = pendingCountry
    selectedCountries = [...selectedCountries, countryToAdd].sort((left, right) => left.localeCompare(right))
    clearSearch()
    renderSelectedTable()
    syncValueInput()
    announce(`Added ${countryToAdd}`)
    input.focus()
  }

  function addPendingCountryForSubmit () {
    if (!pendingCountry || selectedCountries.includes(pendingCountry) || isAtMaxCountries()) {
      return
    }

    selectedCountries = [...selectedCountries, pendingCountry].sort((left, right) => left.localeCompare(right))
    clearSearch()
    renderSelectedTable()
    syncValueInput()
  }

  function removeCountry (country) {
    selectedCountries = selectedCountries.filter((item) => item !== country)
    renderSelectedTable()
    syncValueInput()
    announce(`Removed ${country}`)
  }

  function renderSelectedTable () {
    const hasSelections = selectedCountries.length > 0

    summaryPanel.hidden = !hasSelections
    summaryPanel.classList.toggle('app-transit-countries-page__summary--empty', !hasSelections)

    selectedRows.innerHTML = selectedCountries.map((country) => `
      <div class="app-transit-countries-page__summary-row" data-transit-country="${country.replace(/"/g, '&quot;')}">
        <div class="app-transit-countries-page__summary-value">${escapeHtml(country)}</div>
        <div class="app-transit-countries-page__summary-action">
          <a class="govuk-link app-transit-country-search__remove-country" href="#">Remove</a>
        </div>
      </div>
    `).join('')

    updateCountryLimitState()
  }

  function renderResults (query) {
    if (isAtMaxCountries()) {
      closeResults()
      return
    }

    const trimmedQuery = query.trim()

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      closeResults()
      return
    }

    const matches = getFilteredCountries(trimmedQuery)
    results.innerHTML = ''

    if (matches.length === 0) {
      results.innerHTML = `
        <li class="app-commodity-search__row app-commodity-search__row--message">
          <span class="app-commodity-search__no-results">No results found</span>
        </li>
      `
      results.hidden = false
      setExpanded(true)
      announce('No results found')
      return
    }

    results.innerHTML = matches.map((option, index) => {
      const altClass = index % 2 === 1 ? ' app-commodity-search__row--alt' : ''
      const isSelected = pendingCountry === option.value

      return `
        <li class="app-commodity-search__row${altClass}">
          <button
            type="button"
            class="app-country-search__option${isSelected ? ' app-country-search__option--selected' : ''}"
            data-country="${option.value.replace(/"/g, '&quot;')}"
          >
            ${highlightMatch(option.label, trimmedQuery)}
          </button>
        </li>
      `
    }).join('')

    results.querySelectorAll('.app-country-search__option').forEach((optionButton) => {
      optionButton.addEventListener('click', () => {
        setPendingCountry(optionButton.getAttribute('data-country'))
      })
    })

    results.hidden = false
    setExpanded(true)
    announce(`${matches.length} result${matches.length === 1 ? '' : 's'} available`)
  }

  results.addEventListener('mousedown', (event) => {
    event.preventDefault()
  })

  input.addEventListener('input', () => {
    if (isAtMaxCountries()) {
      return
    }

    if (input.value.trim() !== pendingCountry) {
      pendingCountry = ''
    }

    renderResults(input.value)
  })

  input.addEventListener('focus', () => {
    if (isAtMaxCountries()) {
      announce(`Maximum of ${MAX_COUNTRIES} countries reached. Remove a country to add another.`)
      return
    }

    if (input.value.trim().length >= MIN_SEARCH_LENGTH) {
      renderResults(input.value)
    }
  })

  input.addEventListener('blur', () => {
    window.setTimeout(() => {
      closeResults()

      if (pendingCountry && input.value.trim() !== pendingCountry) {
        input.value = pendingCountry
      }
    }, 200)
  })

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeResults()
    }
  })

  button.addEventListener('click', (event) => {
    event.preventDefault()

    if (isAtMaxCountries()) {
      announce(`Maximum of ${MAX_COUNTRIES} countries reached. Remove a country to add another.`)
      return
    }

    renderResults(input.value)
    input.focus()
  })

  addCountryButton.addEventListener('click', (event) => {
    event.preventDefault()
    addPendingCountry()
  })

  selectedRows.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.app-transit-country-search__remove-country')

    if (!removeButton) {
      return
    }

    event.preventDefault()

    const row = removeButton.closest('[data-transit-country]')

    if (row) {
      removeCountry(row.getAttribute('data-transit-country'))
    }
  })

  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target)) {
      closeResults()
    }
  })

  form.addEventListener('submit', () => {
    addPendingCountryForSubmit()
  })

  updateCountryLimitState()
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-transit-country-search"]').forEach(initTransitCountrySearch)
})

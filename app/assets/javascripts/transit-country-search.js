//
// Transit country search — select from dropdown to add to table, reset search (max 12)
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

function sortCountrySearchResults (options, normalisedQuery) {
  function getSortKey (option) {
    if (!option.parent) {
      return { tier: 0, group: '', label: option.label }
    }

    const parentMatches = option.parent.toLowerCase().includes(normalisedQuery)

    return {
      tier: parentMatches ? 1 : 2,
      group: option.parent,
      label: option.label
    }
  }

  return [...options].sort((left, right) => {
    const leftKey = getSortKey(left)
    const rightKey = getSortKey(right)

    if (leftKey.tier !== rightKey.tier) {
      return leftKey.tier - rightKey.tier
    }

    if (leftKey.group !== rightKey.group) {
      return leftKey.group.localeCompare(rightKey.group)
    }

    return leftKey.label.localeCompare(rightKey.label)
  })
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

function getInitialSelectedCountries (root, valueInput) {
  const initialEl = root.querySelector('.app-transit-country-search__initial')

  if (initialEl) {
    try {
      const parsed = JSON.parse(initialEl.textContent)

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean)
      }
    } catch (error) {
      // Fall back to hidden input value below.
    }
  }

  return parseSelectedCountries(valueInput)
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
  const summaryPanel = root.querySelector('.app-transit-countries-page__summary')
  const selectedRows = root.querySelector('.app-transit-country-search__selected-rows')

  if (!form || !input || !button || !results || !valueInput || !summaryPanel || !selectedRows) {
    return
  }

  let selectedCountries = getInitialSelectedCountries(root, valueInput)

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

    input.disabled = atMax
    button.disabled = atMax
    searchBox.classList.toggle('app-commodity-search--disabled', atMax)

    if (atMax) {
      clearSearch()
    }
  }

  function clearSearch () {
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

    return sortCountrySearchResults(
      countryOptions
        .filter((option) => countryOptionMatchesQuery(option, normalisedQuery))
        .filter((option) => !takenCountries.has(option.value)),
      normalisedQuery
    )
  }

  function addCountry (country) {
    if (!country || selectedCountries.includes(country)) {
      return
    }

    if (isAtMaxCountries()) {
      announce(`Maximum of ${MAX_COUNTRIES} countries reached. Remove a country to add another.`)
      return
    }

    selectedCountries = [...selectedCountries, country].sort((left, right) => left.localeCompare(right))
    clearSearch()
    renderSelectedTable()
    syncValueInput()
    announce(`Added ${country}`)
    input.focus()
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

      return `
        <li class="app-commodity-search__row${altClass}">
          <button
            type="button"
            class="app-country-search__option"
            data-country="${option.value.replace(/"/g, '&quot;')}"
          >
            ${highlightMatch(option.label, trimmedQuery)}
          </button>
        </li>
      `
    }).join('')

    results.querySelectorAll('.app-country-search__option').forEach((optionButton) => {
      optionButton.addEventListener('click', () => {
        addCountry(optionButton.getAttribute('data-country'))
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

  syncValueInput()
  renderSelectedTable()
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-transit-country-search"]').forEach(initTransitCountrySearch)
})

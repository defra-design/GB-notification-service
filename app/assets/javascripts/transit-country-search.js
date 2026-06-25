//
// Transit country search — multi-select with commodity search styling (max 12)
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

function buildCountryRow ({ rowIndex, option, labelHtml, isChecked, disabled }) {
  const altClass = rowIndex % 2 === 1 ? ' app-commodity-search__row--alt' : ''
  const disabledClass = disabled ? ' app-commodity-search__row--disabled' : ''
  const checkboxId = `transit-country-${rowIndex}`

  return `
    <li class="app-commodity-search__row app-commodity-search__row--species${altClass}${disabledClass}">
      <div class="govuk-checkboxes app-commodity-search__checkbox-item">
        <div class="govuk-checkboxes__item">
          <input
            class="govuk-checkboxes__input app-commodity-search__checkbox-input"
            id="${checkboxId}"
            name="transit-country-selection"
            type="checkbox"
            value="${option.value.replace(/"/g, '&quot;')}"
            ${isChecked ? 'checked' : ''}
            ${disabled ? 'disabled' : ''}
          >
          <label class="govuk-checkboxes__label app-commodity-search__row-label" for="${checkboxId}">
            ${labelHtml}
          </label>
        </div>
      </div>
    </li>
  `
}

function initTransitCountrySearch (root) {
  const countryOptions = getCountries(root)
  const input = root.querySelector('.app-commodity-search__input')
  const button = root.querySelector('.app-commodity-search__button')
  const results = root.querySelector('.app-commodity-search__results')
  const status = root.querySelector('.app-transit-country-search__status')
  const valueInput = root.querySelector('.app-transit-country-search__value')
  const searchBox = root.querySelector('.app-commodity-search')
  const selectedPanel = root.querySelector('.app-transit-country-search__selected')
  const selectedHeading = root.querySelector('.app-transit-country-search__selected-heading')
  const selectedList = root.querySelector('.app-transit-country-search__selected-list')
  const clearAllButton = root.querySelector('.app-transit-country-search__selected-clear')

  if (!input || !button || !results || !valueInput || !selectedPanel || !selectedHeading || !selectedList || !clearAllButton) {
    return
  }

  const selectedCountries = new Set(parseSelectedCountries(valueInput))

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
    valueInput.value = JSON.stringify(Array.from(selectedCountries).sort((left, right) => left.localeCompare(right)))
  }

  function isAtMaxCountries () {
    return selectedCountries.size >= MAX_COUNTRIES
  }

  function announceSelectionCount () {
    const count = selectedCountries.size

    if (count === 0) {
      announce('')
      return
    }

    announce(`${count} of ${MAX_COUNTRIES} countries selected`)
  }

  function renderSelectedPanel () {
    const countries = Array.from(selectedCountries).sort((left, right) => left.localeCompare(right))
    const hasSelections = countries.length > 0

    selectedPanel.hidden = !hasSelections
    selectedPanel.classList.toggle('app-commodity-search__selected--visible', hasSelections)
    clearAllButton.hidden = !hasSelections

    if (!hasSelections) {
      selectedHeading.textContent = ''
      selectedList.innerHTML = ''
      syncValueInput()
      return
    }

    selectedHeading.textContent = `${countries.length} selected`

    selectedList.innerHTML = `
      <li class="app-commodity-search__selected-group">
        <div class="app-commodity-search__selected-group-row">
          <ul class="app-commodity-search__selected-chips" role="list">
            ${countries.map((country) => `
              <li class="app-commodity-search__selected-item">
                <span class="app-commodity-search__selected-label">${escapeHtml(country)}</span>
                <button
                  class="app-commodity-search__selected-remove"
                  type="button"
                  data-country="${country.replace(/"/g, '&quot;')}"
                  aria-label="Remove ${escapeHtml(country)}"
                >
                  <span class="govuk-visually-hidden">Remove ${escapeHtml(country)}</span>
                </button>
              </li>
            `).join('')}
          </ul>
        </div>
      </li>
    `

    syncValueInput()
  }

  function removeCountry (country) {
    selectedCountries.delete(country)
    renderSelectedPanel()
    renderResults(input.value)
    announceSelectionCount()
  }

  function clearAllSelections () {
    selectedCountries.clear()
    renderSelectedPanel()
    closeResults()
    announce('')
  }

  function toggleCountry (country, checked) {
    if (checked) {
      if (isAtMaxCountries()) {
        announce(`Maximum of ${MAX_COUNTRIES} countries reached`)
        renderResults(input.value)
        return
      }

      selectedCountries.add(country)
    } else {
      selectedCountries.delete(country)
    }

    renderSelectedPanel()
    renderResults(input.value)
    announceSelectionCount()
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

    return countryOptions
      .filter((option) => countryOptionMatchesQuery(option, normalisedQuery))
      .sort((left, right) => left.label.localeCompare(right.label))
  }

  function renderResults (query) {
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

    const atMax = isAtMaxCountries()

    results.innerHTML = matches.map((option, index) => {
      const isChecked = selectedCountries.has(option.value)
      const disabled = atMax && !isChecked

      return buildCountryRow({
        rowIndex: index,
        option,
        labelHtml: highlightMatch(option.label, trimmedQuery),
        isChecked,
        disabled
      })
    }).join('')

    results.hidden = false
    setExpanded(true)

    if (selectedCountries.size > 0) {
      announceSelectionCount()
    } else {
      announce(`${matches.length} result${matches.length === 1 ? '' : 's'} available`)
    }
  }

  results.addEventListener('mousedown', (event) => {
    event.preventDefault()
  })

  results.addEventListener('change', (event) => {
    const checkbox = event.target.closest('.app-commodity-search__checkbox-input')

    if (!checkbox || checkbox.disabled) {
      return
    }

    toggleCountry(checkbox.value, checkbox.checked)
  })

  selectedList.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.app-commodity-search__selected-remove')

    if (!removeButton) {
      return
    }

    event.preventDefault()
    removeCountry(removeButton.getAttribute('data-country'))
  })

  clearAllButton.addEventListener('click', (event) => {
    event.preventDefault()
    clearAllSelections()
  })

  input.addEventListener('input', () => {
    renderResults(input.value)
  })

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= MIN_SEARCH_LENGTH) {
      renderResults(input.value)
    }
  })

  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target)) {
      closeResults()
    }
  })

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeResults()
    }
  })

  button.addEventListener('click', (event) => {
    event.preventDefault()

    if (input.value.trim().length >= MIN_SEARCH_LENGTH) {
      renderResults(input.value)
      input.focus()
    }
  })

  renderSelectedPanel()

  if (input.value.trim().length >= MIN_SEARCH_LENGTH) {
    renderResults(input.value)
  }
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-transit-country-search"]').forEach(initTransitCountrySearch)
})

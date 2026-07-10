//
// Country search — keyword search for EU countries (minimum 3 characters)
//

const MIN_SEARCH_LENGTH = 3

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
  const dataEl = root.querySelector('.app-country-search__data')

  if (!dataEl) {
    return []
  }

  try {
    return JSON.parse(dataEl.textContent)
  } catch (error) {
    return []
  }
}

function getCountryPrefixes (root) {
  const dataEl = root.querySelector('.app-country-search__prefixes')

  if (!dataEl) {
    return {}
  }

  try {
    return JSON.parse(dataEl.textContent)
  } catch (error) {
    return {}
  }
}

function updateRegionOriginCodePrefix (root, country) {
  const prefixEl = document.getElementById('region-of-origin-code-prefix')

  if (!prefixEl) {
    return
  }

  const prefixes = getCountryPrefixes(root)
  prefixEl.textContent = country && prefixes[country] ? prefixes[country] : ''
}

function initCountrySearch (root) {
  const countryOptions = getCountries(root)
  const input = root.querySelector('.app-commodity-search__input')
  const button = root.querySelector('.app-commodity-search__button')
  const results = root.querySelector('.app-commodity-search__results')
  const status = root.querySelector('.app-country-search__status')
  const valueInput = root.querySelector('.app-country-search__value')
  const searchBox = root.querySelector('.app-commodity-search')

  if (!input || !button || !results) {
    return
  }

  let selectedCountry = valueInput ? valueInput.value : ''

  if (selectedCountry && input) {
    input.value = selectedCountry
    updateRegionOriginCodePrefix(root, selectedCountry)
  }

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

  function updateValue (country) {
    selectedCountry = country

    if (valueInput) {
      valueInput.value = country
    }

    if (input) {
      input.value = country
    }

    updateRegionOriginCodePrefix(root, country)
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

    return sortCountrySearchResults(
      countryOptions.filter((option) => countryOptionMatchesQuery(option, normalisedQuery)),
      normalisedQuery
    )
  }

  function selectCountry (country) {
    updateValue(country)
    closeResults()
    announce(`Selected ${country}`)
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

    results.innerHTML = matches.map((option, index) => {
      const altClass = index % 2 === 1 ? ' app-commodity-search__row--alt' : ''
      const isSelected = selectedCountry === option.value

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

    results.querySelectorAll('.app-country-search__option').forEach((option) => {
      option.addEventListener('click', () => {
        selectCountry(option.getAttribute('data-country'))
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
    if (input.value !== selectedCountry) {
      selectedCountry = ''

      if (valueInput) {
        valueInput.value = ''
      }

      updateRegionOriginCodePrefix(root, '')
    }

    renderResults(input.value)
  })

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= MIN_SEARCH_LENGTH) {
      renderResults(input.value)
    }
  })

  input.addEventListener('blur', () => {
    window.setTimeout(() => {
      closeResults()

      if (selectedCountry && input.value !== selectedCountry) {
        input.value = selectedCountry
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
    renderResults(input.value)
    input.focus()
  })
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-country-search"]').forEach(initCountrySearch)
})

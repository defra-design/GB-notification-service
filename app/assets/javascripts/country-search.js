//
// Country search — Figma 8296:24063 (select-style search with blue search button)
//

function escapeHtml (value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function highlightMatch (text, query) {
  if (!query) {
    return text
  }

  const index = text.toLowerCase().indexOf(query.toLowerCase())

  if (index === -1) {
    return text
  }

  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return `${before}<strong class="app-commodity-search__match">${match}</strong>${after}`
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
  const countries = getCountries(root)
  const input = root.querySelector('.app-commodity-search__input')
  const button = root.querySelector('.app-commodity-search__button')
  const results = root.querySelector('.app-commodity-search__results')
  const status = root.querySelector('.app-country-search__status')
  const valueInput = root.querySelector('.app-country-search__value')
  const searchBox = root.querySelector('.app-commodity-search')

  let selectedCountry = valueInput ? valueInput.value : ''

  if (selectedCountry && input) {
    input.value = selectedCountry
    updateRegionOriginCodePrefix(root, selectedCountry)
  }

  function setExpanded (isExpanded) {
    if (searchBox) {
      searchBox.setAttribute('aria-expanded', isExpanded ? 'true' : 'false')
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

    if (!normalisedQuery) {
      return []
    }

    return countries.filter((country) => country.toLowerCase().includes(normalisedQuery))
  }

  function selectCountry (country) {
    updateValue(country)
    closeResults()
    announce(`Selected ${country}`)
  }

  function renderResults (query) {
    const matches = getFilteredCountries(query)
    results.innerHTML = ''

    if (!query.trim()) {
      closeResults()
      return
    }

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

    const trimmedQuery = query.trim()

    results.innerHTML = matches.map((country, index) => {
      const altClass = index % 2 === 1 ? ' app-commodity-search__row--alt' : ''
      const isSelected = selectedCountry === country

      return `
        <li class="app-commodity-search__row${altClass}">
          <button
            type="button"
            class="app-country-search__option${isSelected ? ' app-country-search__option--selected' : ''}"
            data-country="${country.replace(/"/g, '&quot;')}"
          >
            ${highlightMatch(escapeHtml(country), trimmedQuery)}
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
    announce(`${matches.length} results available`)
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
    if (input.value.trim()) {
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

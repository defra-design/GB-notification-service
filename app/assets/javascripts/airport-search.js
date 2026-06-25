//
// Airport / port search — matches country search interaction and styling
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

function getOptions (root) {
  const dataEl = root.querySelector('.app-airport-search__data')

  if (!dataEl) {
    return []
  }

  try {
    const parsed = JSON.parse(dataEl.textContent)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function initAirportSearch (root) {
  const options = getOptions(root)
  const input = root.querySelector('.app-commodity-search__input')
  const button = root.querySelector('.app-commodity-search__button')
  const results = root.querySelector('.app-commodity-search__results')
  const status = root.querySelector('.app-airport-search__status')
  const valueInput = root.querySelector('.app-airport-search__value')
  const searchBox = root.querySelector('.app-commodity-search')

  if (!input || !button || !results) {
    return
  }

  let selectedOption = valueInput ? valueInput.value : ''

  if (selectedOption && input) {
    input.value = selectedOption
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

  function updateValue (option) {
    selectedOption = option

    if (valueInput) {
      valueInput.value = option
    }

    if (input) {
      input.value = option
    }
  }

  function closeResults () {
    results.hidden = true
    results.innerHTML = ''
    setExpanded(false)
  }

  function getFilteredOptions (query) {
    const normalisedQuery = query.trim().toLowerCase()

    if (normalisedQuery.length < MIN_SEARCH_LENGTH) {
      return []
    }

    return options
      .filter((option) => option.toLowerCase().includes(normalisedQuery))
      .sort((left, right) => left.localeCompare(right))
  }

  function selectOption (option) {
    updateValue(option)
    closeResults()
    announce(`Selected ${option}`)
  }

  function renderResults (query) {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      closeResults()
      return
    }

    const matches = getFilteredOptions(trimmedQuery)
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
      const isSelected = selectedOption === option

      return `
        <li class="app-commodity-search__row${altClass}">
          <button
            type="button"
            class="app-country-search__option${isSelected ? ' app-country-search__option--selected' : ''}"
            data-option="${option.replace(/"/g, '&quot;')}"
          >
            ${highlightMatch(option, trimmedQuery)}
          </button>
        </li>
      `
    }).join('')

    results.querySelectorAll('.app-country-search__option').forEach((optionButton) => {
      optionButton.addEventListener('click', () => {
        selectOption(optionButton.getAttribute('data-option'))
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
    if (input.value !== selectedOption) {
      selectedOption = ''

      if (valueInput) {
        valueInput.value = ''
      }
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

      if (selectedOption && input.value !== selectedOption) {
        input.value = selectedOption
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
  document.querySelectorAll('[data-module="app-airport-search"]').forEach(initAirportSearch)
})

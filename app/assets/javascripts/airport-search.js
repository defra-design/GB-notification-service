//
// Airport / port search — mirrors commodity search interaction
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
  const searchBox = root.querySelector('.app-commodity-search')

  let selectedOption = input ? input.value.trim() : ''

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

  function closeResults () {
    results.hidden = true
    results.innerHTML = ''
    setExpanded(false)
  }

  function getFilteredOptions (query) {
    const normalisedQuery = query.trim().toLowerCase()

    if (!normalisedQuery) {
      return []
    }

    return options.filter((option) => option.toLowerCase().includes(normalisedQuery))
  }

  function selectOption (option) {
    selectedOption = option
    input.value = option
    closeResults()
    announce(`Selected ${option}`)
  }

  function renderResults (query) {
    const matches = getFilteredOptions(query)
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

    results.innerHTML = matches.map((option, index) => {
      const altClass = index % 2 === 1 ? ' app-commodity-search__row--alt' : ''
      const isSelected = selectedOption === option

      return `
        <li class="app-commodity-search__row${altClass}">
          <button
            type="button"
            class="app-airport-search__option${isSelected ? ' app-airport-search__option--selected' : ''}"
            data-option="${option.replace(/"/g, '&quot;')}"
          >
            ${highlightMatch(escapeHtml(option), trimmedQuery)}
          </button>
        </li>
      `
    }).join('')

    results.querySelectorAll('.app-airport-search__option').forEach((optionButton) => {
      optionButton.addEventListener('click', () => {
        selectOption(optionButton.getAttribute('data-option'))
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
    if (input.value !== selectedOption) {
      selectedOption = ''
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

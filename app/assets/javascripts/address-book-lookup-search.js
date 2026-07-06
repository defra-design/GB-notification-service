//
// Address book lookup — search UK and European addresses
//

const MIN_SEARCH_LENGTH = 2
const MAX_RESULTS = 8

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

function getAddresses (root) {
  const dataEl = root.querySelector('.app-address-book-lookup-search__data')

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

function showManualAddressSection () {
  const manualSection = document.getElementById('address-book-manual-address')
  const manualLink = document.querySelector('.app-address-book-lookup-page__manual-link')
  const manualToggle = document.querySelector('.app-address-book-lookup-page__manual-toggle')
  const manualEntryField = document.getElementById('manual-address-entry')

  if (!manualSection || !manualEntryField) {
    return
  }

  manualSection.classList.remove('app-address-book-lookup-page__manual--hidden')
  manualLink?.classList.add('app-address-book-lookup-page__manual-link--hidden')
  manualToggle?.setAttribute('aria-expanded', 'true')
  manualEntryField.removeAttribute('disabled')
}

function populateManualAddressFields (manualFields) {
  const form = document.querySelector('.app-address-book-lookup-form')

  if (!form || !manualFields) {
    return
  }

  const setFieldValue = (name, value) => {
    const field = form.querySelector(`[name="${name}"]`)

    if (field) {
      field.value = value || ''
    }
  }

  setFieldValue('addressBookManualName', manualFields.nameOrOrganisation)
  setFieldValue('addressBookManualAddressLine1', manualFields.addressLine1)
  setFieldValue('addressBookManualAddressLine2', manualFields.addressLine2)
  setFieldValue('addressBookManualTownOrCity', manualFields.townOrCity)
  setFieldValue('addressBookManualPostcode', manualFields.postcode)
  setFieldValue('addressBookManualCountry', manualFields.country)
  setFieldValue('addressBookManualEmail', '')
  setFieldValue('addressBookManualPhone', '')
}

function initAddressBookLookupSearch (root) {
  const addresses = getAddresses(root)
  const input = root.querySelector('.app-commodity-search__input')
  const button = root.querySelector('.app-commodity-search__button')
  const results = root.querySelector('.app-commodity-search__results')
  const status = root.querySelector('.app-address-book-lookup-search__status')
  const valueInput = root.querySelector('.app-address-book-lookup-search__value')
  const idInput = root.querySelector('.app-address-book-lookup-search__id')
  const searchBox = root.querySelector('.app-commodity-search')

  if (!input || !button || !results) {
    return
  }

  let selectedAddress = null

  if (idInput && idInput.value) {
    selectedAddress = addresses.find((address) => address.id === idInput.value) || null

    if (selectedAddress && input && !input.value) {
      input.value = selectedAddress.label
    }

    if (selectedAddress?.manual) {
      populateManualAddressFields(selectedAddress.manual)
      showManualAddressSection()
    }
  } else if (valueInput && valueInput.value) {
    selectedAddress = addresses.find((address) => address.label === valueInput.value) || null

    if (selectedAddress && idInput) {
      idInput.value = selectedAddress.id
    }
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

  function updateValue (address) {
    selectedAddress = address

    if (valueInput) {
      valueInput.value = address ? address.label : ''
    }

    if (idInput) {
      idInput.value = address ? address.id : ''
    }

    if (input) {
      input.value = address ? address.label : ''
    }
  }

  function closeResults () {
    results.hidden = true
    results.innerHTML = ''
    setExpanded(false)
  }

  function getFilteredAddresses (query) {
    const normalisedQuery = query.trim().toLowerCase()

    if (normalisedQuery.length < MIN_SEARCH_LENGTH) {
      return []
    }

    return addresses
      .filter((address) => address.searchText.includes(normalisedQuery))
      .sort((left, right) => left.label.localeCompare(right.label))
      .slice(0, MAX_RESULTS)
  }

  function selectAddress (address) {
    updateValue(address)
    closeResults()

    if (address.manual) {
      populateManualAddressFields(address.manual)
      showManualAddressSection()
    }

    announce(`Selected ${address.name}`)
  }

  function renderResults (query) {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      closeResults()
      return
    }

    const matches = getFilteredAddresses(trimmedQuery)
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

    results.innerHTML = matches.map((address, index) => {
      const altClass = index % 2 === 1 ? ' app-commodity-search__row--alt' : ''
      const isSelected = selectedAddress && selectedAddress.id === address.id
      const detail = `${address.address}, ${address.country}`

      return `
        <li class="app-commodity-search__row${altClass}">
          <button
            type="button"
            class="app-address-book-lookup-search__option${isSelected ? ' app-address-book-lookup-search__option--selected' : ''}"
            data-address-id="${address.id.replace(/"/g, '&quot;')}"
          >
            <span class="app-address-book-lookup-search__option-name">${highlightMatch(address.name, trimmedQuery)}</span>
            <span class="app-address-book-lookup-search__option-detail">${highlightMatch(detail, trimmedQuery)}</span>
          </button>
        </li>
      `
    }).join('')

    results.querySelectorAll('.app-address-book-lookup-search__option').forEach((optionButton) => {
      optionButton.addEventListener('click', () => {
        const addressId = optionButton.getAttribute('data-address-id')
        const address = addresses.find((item) => item.id === addressId)

        if (address) {
          selectAddress(address)
        }
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
    if (!selectedAddress || input.value !== selectedAddress.label) {
      selectedAddress = null

      if (valueInput) {
        valueInput.value = ''
      }

      if (idInput) {
        idInput.value = ''
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

      if (selectedAddress && input.value !== selectedAddress.label) {
        input.value = selectedAddress.label
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
  document.querySelectorAll('[data-module="app-address-book-lookup-search"]').forEach(initAddressBookLookupSearch)
})

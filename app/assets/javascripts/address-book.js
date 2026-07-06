//
// Address book — filter table by search and type; manual address entry on lookup page
//

function normaliseSearchText (value) {
  return (value || '').trim().toLowerCase()
}

function escapeHtml (value) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildAddressBookResultsText (count) {
  if (!count) {
    return 'Showing 0 of 0'
  }

  return `Showing 1-${count} of ${count}`
}

function getAddressBookAddresses (root) {
  const dataEl = root.querySelector('.app-address-book-page__addresses-data')

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

function createAddressBookRow (address) {
  return `
    <tr
      class="govuk-table__row app-address-book-table__row"
      data-address-row
      data-search-text="${escapeHtml(address.searchText)}"
      data-address-type="${escapeHtml(address.type)}"
    >
      <td class="govuk-table__cell app-address-book-table__cell">${escapeHtml(address.name)}</td>
      <td class="govuk-table__cell app-address-book-table__cell">${escapeHtml(address.typeLabel)}</td>
      <td class="govuk-table__cell app-address-book-table__cell">${escapeHtml(address.address)}</td>
      <td class="govuk-table__cell app-address-book-table__cell">${escapeHtml(address.country)}</td>
      <td class="govuk-table__cell app-address-book-table__cell app-address-book-table__cell--action">
        <a class="govuk-link" href="#">View</a>
      </td>
    </tr>
  `
}

function initAddressBookSearch (root) {
  const allAddresses = getAddressBookAddresses(root)
  const input = document.querySelector('.app-address-book-page__search-input')
  const button = document.querySelector('.app-address-book-page__search-button')
  const typeSelect = document.querySelector('.app-address-book-page__type-select')
  const tableBody = root.querySelector('[data-address-book-results]')
  const resultsCount = root.querySelector('[data-address-book-results-count]')
  const pagination = root.querySelector('.app-address-book-page__pagination')

  if (!input || !tableBody || !resultsCount || !allAddresses.length) {
    return
  }

  const defaultRowsHtml = tableBody.innerHTML
  const defaultResultsText = resultsCount.textContent
  const filterForm = document.querySelector('.app-address-book-page__filter')

  function hasActiveFilters () {
    return Boolean(normaliseSearchText(input.value) || (typeSelect && typeSelect.value))
  }

  function getFilteredAddresses () {
    const query = normaliseSearchText(input.value)
    const type = typeSelect ? typeSelect.value : ''

    return allAddresses.filter((address) => {
      if (type && address.type !== type) {
        return false
      }

      if (query && !normaliseSearchText(address.searchText).includes(query)) {
        return false
      }

      return true
    })
  }

  function renderFilteredAddresses (addresses) {
    tableBody.innerHTML = addresses.map((address) => createAddressBookRow(address)).join('')
    resultsCount.textContent = buildAddressBookResultsText(addresses.length)

    if (pagination) {
      pagination.hidden = true
    }
  }

  function restoreDefaultView () {
    tableBody.innerHTML = defaultRowsHtml

    if (resultsCount) {
      resultsCount.textContent = defaultResultsText
    }

    if (pagination) {
      pagination.hidden = false
    }
  }

  function applyFilters () {
    if (!hasActiveFilters()) {
      restoreDefaultView()
      return
    }

    renderFilteredAddresses(getFilteredAddresses())
  }

  input.addEventListener('input', applyFilters)

  if (button) {
    button.addEventListener('click', () => {
      applyFilters()
      input.focus()
    })
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', applyFilters)
  }

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault()
      applyFilters()
    })
  }

  if (hasActiveFilters()) {
    applyFilters()
  }
}

function initAddressBookLookupManualToggle () {
  const manualToggle = document.querySelector('.app-address-book-lookup-page__manual-toggle')
  const manualSection = document.querySelector('#address-book-manual-address')
  const manualLink = document.querySelector('.app-address-book-lookup-page__manual-link')
  const manualEntryField = document.querySelector('#manual-address-entry')

  if (!manualToggle || !manualSection || !manualLink || !manualEntryField) {
    return
  }

  const showManualAddress = () => {
    manualSection.classList.remove('app-address-book-lookup-page__manual--hidden')
    manualLink.classList.add('app-address-book-lookup-page__manual-link--hidden')
    manualToggle.setAttribute('aria-expanded', 'true')
    manualEntryField.removeAttribute('disabled')

    const firstField = manualSection.querySelector('input, select, textarea')

    if (firstField) {
      firstField.focus()
    }
  }

  manualToggle.addEventListener('click', showManualAddress)

  if (!manualSection.classList.contains('app-address-book-lookup-page__manual--hidden')) {
    manualLink.classList.add('app-address-book-lookup-page__manual-link--hidden')
    manualToggle.setAttribute('aria-expanded', 'true')
    manualEntryField.removeAttribute('disabled')
  }
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-address-book-search"]').forEach(initAddressBookSearch)
  initAddressBookLookupManualToggle()
})

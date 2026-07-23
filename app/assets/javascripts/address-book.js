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

function formatMultilineCell (lines, joinWithComma) {
  const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : []

  if (!safeLines.length) {
    return ''
  }

  const separator = joinWithComma ? ',<br>' : '<br>'

  return `<p class="app-address-book-table__address-lines">${safeLines.map(escapeHtml).join(separator)}</p>`
}

function formatAddressBookCell (address) {
  const lines = Array.isArray(address.addressLines) ? address.addressLines.filter(Boolean) : []

  if (!lines.length) {
    return escapeHtml(address.address)
  }

  return formatMultilineCell(lines, true)
}

function formatNameCell (address) {
  const lines = Array.isArray(address.nameLines) ? address.nameLines.filter(Boolean) : []

  if (lines.length > 1) {
    return formatMultilineCell(lines, false)
  }

  return escapeHtml(address.name)
}

function formatTypeCell (address) {
  const labels = Array.isArray(address.typeLabels)
    ? address.typeLabels.filter(Boolean)
    : []

  if (labels.length) {
    return escapeHtml(labels.join(', '))
  }

  return escapeHtml(address.typeLabel)
}

function createAddressBookRow (address, options = {}) {
  if (options.layout === 'transporter') {
    return `
      <tr
        class="govuk-table__row app-address-book-table__row"
        data-address-row
        data-search-text="${escapeHtml(address.searchText)}"
        data-address-type="${escapeHtml(address.type)}"
        data-address-category="${escapeHtml(address.category || '')}"
      >
        <td class="govuk-table__cell app-address-book-table__cell">${formatNameCell(address)}</td>
        <td class="govuk-table__cell app-address-book-table__cell">${formatAddressBookCell(address)}</td>
        <td class="govuk-table__cell app-address-book-table__cell">${escapeHtml(address.approvalNumber)}</td>
        <td class="govuk-table__cell app-address-book-table__cell">${escapeHtml(address.typeLabel)}</td>
        <td class="govuk-table__cell app-address-book-table__cell app-address-book-table__cell--action">
          <a class="govuk-link" href="${escapeHtml(address.viewHref || '#')}">View</a>
        </td>
      </tr>
    `
  }

  return `
    <tr
      class="govuk-table__row app-address-book-table__row"
      data-address-row
      data-search-text="${escapeHtml(address.searchText)}"
      data-address-type="${escapeHtml((address.types || [address.type]).filter(Boolean).join(','))}"
      data-address-category="${escapeHtml(address.category || '')}"
    >
      <td class="govuk-table__cell app-address-book-table__cell">${formatNameCell(address)}</td>
      <td class="govuk-table__cell app-address-book-table__cell">${formatTypeCell(address)}</td>
      <td class="govuk-table__cell app-address-book-table__cell">${formatAddressBookCell(address)}</td>
      <td class="govuk-table__cell app-address-book-table__cell">${escapeHtml(address.country)}</td>
      <td class="govuk-table__cell app-address-book-table__cell app-address-book-table__cell--action">
        <a class="govuk-link" href="${escapeHtml(address.viewHref || '#')}">View</a>
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
  const category = root.getAttribute('data-address-category') || ''

  if (!input || !tableBody || !resultsCount || !allAddresses.length) {
    return
  }

  const defaultRowsHtml = tableBody.innerHTML
  const defaultResultsText = resultsCount.textContent
  const filterForm = document.querySelector('.app-address-book-page__filter')

  function hasActiveFilters () {
    return Boolean(normaliseSearchText(input.value) || (typeSelect && typeSelect.value))
  }

  function addressMatchesTypeFilter (address, type) {
    if (!type) {
      return true
    }

    if (category === 'transporter' || address.category === 'transporter' || address.type === 'transporter') {
      return address.typeLabel === type
    }

    const addressTypes = Array.isArray(address.types) && address.types.length
      ? address.types
      : [address.type].filter(Boolean)

    return addressTypes.includes(type)
  }

  function getFilteredAddresses () {
    const query = normaliseSearchText(input.value)
    const type = typeSelect ? typeSelect.value : ''

    return allAddresses.filter((address) => {
      if (category && address.category && address.category !== category) {
        return false
      }

      if (!addressMatchesTypeFilter(address, type)) {
        return false
      }

      if (query && !normaliseSearchText(address.searchText).includes(query)) {
        return false
      }

      return true
    })
  }

  function renderFilteredAddresses (addresses) {
    tableBody.innerHTML = addresses.map((address) => createAddressBookRow(address, {
      layout: category === 'transporter' ? 'transporter' : 'default'
    })).join('')
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

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-address-book-search"]').forEach(initAddressBookSearch)
})

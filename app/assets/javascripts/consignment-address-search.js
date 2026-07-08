//
// Consignment address select — filter address table by search query
//

const MIN_SEARCH_LENGTH = 1

function normaliseSearchText (value) {
  return (value || '').trim().toLowerCase()
}

function initConsignmentAddressSearch (root) {
  const input = root.querySelector('.app-consignment-address-select-page__search-input')
  const button = root.querySelector('.app-consignment-address-select-page__search-button')
  const form = root.closest('form')
  const scope = form || root
  const tableBody = scope.querySelector('[data-address-results]')
  const visibleCount = scope.querySelector('[data-results-visible]')

  if (!input || !tableBody || !visibleCount) {
    return
  }

  const rows = Array.from(tableBody.querySelectorAll('[data-address-row]'))

  function updateVisibleCount () {
    const shown = rows.filter((row) => !row.hidden).length

    visibleCount.textContent = String(shown)
  }

  function filterRows () {
    const query = normaliseSearchText(input.value)

    rows.forEach((row) => {
      if (!query || query.length < MIN_SEARCH_LENGTH) {
        row.hidden = false
        return
      }

      const searchText = normaliseSearchText(row.dataset.searchText)
      row.hidden = !searchText.includes(query)
    })

    updateVisibleCount()
  }

  input.addEventListener('input', filterRows)

  if (button) {
    button.addEventListener('click', () => {
      filterRows()
      input.focus()
    })
  }

  filterRows()
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-consignment-address-search"]').forEach(initConsignmentAddressSearch)
})

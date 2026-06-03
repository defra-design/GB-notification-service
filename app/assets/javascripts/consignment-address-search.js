//
// Consignment address search — Figma 8296:24621 (filters address table rows)
//

function initConsignmentAddressSearch (root) {
  const input = root.querySelector('.app-commodity-search__input')
  const button = root.querySelector('.app-commodity-search__button')
  const table = root.closest('form')?.querySelector('.app-consignment-address-table')
  const rows = table ? table.querySelectorAll('[data-address-row]') : []
  const noResults = table ? table.querySelector('.app-consignment-address-table__no-results') : null

  function filterRows (query) {
    const normalisedQuery = query.trim().toLowerCase()
    let visibleCount = 0

    rows.forEach((row) => {
      const searchText = (row.getAttribute('data-search-text') || '').toLowerCase()
      const isVisible = !normalisedQuery || searchText.includes(normalisedQuery)

      row.hidden = !isVisible

      if (isVisible) {
        visibleCount += 1
      }
    })

    if (noResults) {
      noResults.hidden = visibleCount > 0 || !normalisedQuery
    }
  }

  if (input) {
    input.addEventListener('input', () => {
      filterRows(input.value)
    })
  }

  if (button) {
    button.addEventListener('click', (event) => {
      event.preventDefault()

      if (input) {
        filterRows(input.value)
        input.focus()
      }
    })
  }

  if (input && input.value.trim()) {
    filterRows(input.value)
  }
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-consignment-address-search"]').forEach(initConsignmentAddressSearch)
})

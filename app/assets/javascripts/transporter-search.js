//
// Transporter — filter transporter table by search query
//

const MIN_SEARCH_LENGTH = 1

function normaliseSearchText (value) {
  return (value || '').trim().toLowerCase()
}

function initTransporterSearch (root) {
  const input = root.querySelector('.app-transporter-page__search-input')
  const button = root.querySelector('.app-transporter-page__search-button')
  const tableBody = document.querySelector('[data-transporter-results]')

  if (!input || !tableBody) {
    return
  }

  const rows = Array.from(tableBody.querySelectorAll('[data-transporter-row]'))

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
  document.querySelectorAll('[data-module="app-transporter-search"]').forEach(initTransporterSearch)
})

function initDashboardSearchDelete () {
  const deleteButton = document.querySelector('.app-dr2-dashboard-search__delete')
  const input = document.getElementById('dashboard-search')

  if (!deleteButton || !input) {
    return
  }

  input.addEventListener('input', () => {
    deleteButton.hidden = input.value === '' && !deleteButton.dataset.clearHref
  })

  deleteButton.addEventListener('click', () => {
    if (deleteButton.dataset.clearHref) {
      window.location.href = deleteButton.dataset.clearHref
      return
    }

    input.value = ''
    deleteButton.hidden = true
    input.focus()
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardSearchDelete)
} else {
  initDashboardSearchDelete()
}

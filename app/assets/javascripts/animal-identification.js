//
// Animal identification — select all checkboxes
//

function initAnimalIdentifiers (root) {
  const selectAll = root.querySelector('[data-select-all-animals]')
  const animalCheckboxes = root.querySelectorAll('[data-animal-checkbox]')

  if (!selectAll || animalCheckboxes.length === 0) {
    return
  }

  function syncSelectAll () {
    const checkedCount = [...animalCheckboxes].filter((checkbox) => checkbox.checked).length
    selectAll.checked = checkedCount === animalCheckboxes.length
    selectAll.indeterminate = checkedCount > 0 && checkedCount < animalCheckboxes.length
  }

  selectAll.addEventListener('change', () => {
    animalCheckboxes.forEach((checkbox) => {
      checkbox.checked = selectAll.checked
    })
    selectAll.indeterminate = false
  })

  animalCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', syncSelectAll)
  })

  syncSelectAll()
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('.app-animal-identifiers').forEach(initAnimalIdentifiers)
})

//
// Consignment add address — keep at least one usage checkbox selected
//

function initConsignmentAddAddressUses (root) {
  const defaultAddressUse = root.getAttribute('data-default-address-use')

  if (!defaultAddressUse) {
    return
  }

  const checkboxes = root.querySelectorAll('input[name="addressUses"]')

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const defaultCheckbox = root.querySelector(`input[name="addressUses"][value="${defaultAddressUse}"]`)
      const checked = root.querySelectorAll('input[name="addressUses"]:checked')

      if (checkbox.value === defaultAddressUse && !checkbox.checked && defaultCheckbox) {
        defaultCheckbox.checked = true
        return
      }

      if (checked.length) {
        return
      }

      if (defaultCheckbox) {
        defaultCheckbox.checked = true
      }
    })
  })
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-consignment-add-address-uses"]').forEach((root) => {
    initConsignmentAddAddressUses(root)
  })
})

export { initConsignmentAddAddressUses }

//
// Reason for import — control Internal market conditional radios
//

function initReasonForImport (root) {
  const radios = Array.from(root.querySelectorAll('input[name="importReason"]'))

  if (!radios.length) {
    return
  }

  function updateConditionalVisibility () {
    radios.forEach((radio) => {
      const conditionalId = radio.getAttribute('data-aria-controls')

      if (!conditionalId) {
        return
      }

      const conditional = document.getElementById(conditionalId)

      if (!conditional) {
        return
      }

      const isOpen = radio.checked
      conditional.classList.toggle('govuk-radios__conditional--hidden', !isOpen)
    })
  }

  radios.forEach((radio) => {
    radio.addEventListener('change', updateConditionalVisibility)
  })

  updateConditionalVisibility()
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('.app-reason-for-import-form').forEach(initReasonForImport)
})

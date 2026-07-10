//
// Reason for import — reveal conditional fields when a reason option is selected
//

function initReasonForImport (root) {
  const radios = Array.from(root.querySelectorAll('input[name="importReason"]'))

  if (!radios.length) {
    return
  }

  function updateInternalMarketReveal () {
    radios.forEach((radio) => {
      const conditionalId = radio.getAttribute('data-aria-controls')

      if (!conditionalId) {
        return
      }

      const conditional = document.getElementById(conditionalId)
      const item = radio.closest('.govuk-radios__item')
      const hint = item && item.querySelector('.govuk-radios__hint')
      const isOpen = radio.checked

      if (conditional) {
        conditional.classList.toggle('govuk-radios__conditional--hidden', !isOpen)
        conditional.setAttribute('aria-hidden', isOpen ? 'false' : 'true')
      }

      if (hint) {
        hint.hidden = isOpen
      }
    })
  }

  radios.forEach((radio) => {
    radio.addEventListener('change', updateInternalMarketReveal)
  })

  updateInternalMarketReveal()
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('.app-reason-for-import-form').forEach(initReasonForImport)
})

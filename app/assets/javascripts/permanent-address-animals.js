//
// Permanent address animals — hide radio hint when conditional address form is open
//

function initPermanentAddressAnimalRadios (root) {
  const radios = Array.from(root.querySelectorAll('.govuk-radios__input[data-aria-controls]'))

  if (!radios.length) {
    return
  }

  function updateConditionalReveals () {
    radios.forEach((radio) => {
      const conditionalId = radio.getAttribute('data-aria-controls')

      if (!conditionalId) {
        return
      }

      const conditional = document.getElementById(conditionalId)
      const item = radio.closest('.govuk-radios__item')
      const hint = item && item.querySelector('.govuk-radios__hint')
      const isOpen = radio.checked

      if (hint) {
        hint.hidden = isOpen
      }

      if (item) {
        item.classList.toggle('govuk-radios__item--conditional-open', isOpen)
      }

      if (conditional) {
        conditional.classList.toggle('govuk-radios__conditional--hidden', !isOpen)
        conditional.setAttribute('aria-hidden', isOpen ? 'false' : 'true')
      }
    })
  }

  radios.forEach((radio) => {
    radio.addEventListener('change', updateConditionalReveals)
  })

  updateConditionalReveals()
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('.app-permanent-address-animals-form').forEach(initPermanentAddressAnimalRadios)
})

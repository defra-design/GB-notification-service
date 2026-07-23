function initDr2ConfirmModals () {
  const modals = document.querySelectorAll('[data-module="dr2-confirm-modal"], [data-module="amend-notification-modal"]')

  if (!modals.length) {
    return
  }

  modals.forEach((modal) => {
    const dialog = modal.querySelector('.app-dr2-amend-modal__dialog')
    const modalId = modal.id
    const openTriggers = modalId
      ? document.querySelectorAll(`[data-modal-open="${modalId}"]`)
      : []
    const legacyOpenTriggers = modal.getAttribute('data-module') === 'amend-notification-modal'
      ? document.querySelectorAll('[data-amend-modal-open]')
      : []
    const dismissTriggers = modal.querySelectorAll('[data-modal-dismiss], [data-amend-modal-dismiss]')
    let previouslyFocused = null

    function openModal () {
      previouslyFocused = document.activeElement
      modal.hidden = false
      document.body.classList.add('app-dr2-amend-modal-open')

      if (dialog) {
        dialog.focus()
      }
    }

    function closeModal () {
      modal.hidden = true
      document.body.classList.remove('app-dr2-amend-modal-open')

      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }

    ;[...openTriggers, ...legacyOpenTriggers].forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault()
        openModal()
      })
    })

    dismissTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault()
        closeModal()
      })
    })

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) {
        closeModal()
      }
    })
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDr2ConfirmModals)
} else {
  initDr2ConfirmModals()
}

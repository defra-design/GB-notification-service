//
// MOJ date picker — show focus styles for keyboard navigation only
//

let usingKeyboard = false

function markKeyboardUse (event) {
  if (
    event.key === 'Tab' ||
    event.key === 'Enter' ||
    event.key === ' ' ||
    event.key === 'Escape' ||
    event.key.startsWith('Arrow')
  ) {
    usingKeyboard = true
  }
}

function markPointerUse () {
  usingKeyboard = false
}

function shouldSuppressMouseFocus (target) {
  return usingKeyboard === false &&
    target instanceof HTMLElement &&
    target.closest('.app-arrival-details-page__date .moj-datepicker') &&
    target.matches('button')
}

function patchDatePickerLayout (root) {
  const dialog = root.querySelector('.moj-datepicker__dialog')

  if (!dialog || dialog.dataset.layoutPatchApplied) {
    return
  }

  dialog.dataset.layoutPatchApplied = 'true'

  const clearOverlayPosition = () => {
    dialog.style.top = ''
    dialog.style.right = ''
  }

  clearOverlayPosition()

  const observer = new MutationObserver(() => {
    if (dialog.classList.contains('moj-datepicker__dialog--open')) {
      clearOverlayPosition()
    }
  })

  observer.observe(dialog, {
    attributes: true,
    attributeFilter: ['class', 'hidden']
  })
}

function initArrivalDatePickerFocus () {
  document.addEventListener('keydown', markKeyboardUse, true)
  document.addEventListener('mousedown', markPointerUse, true)
  document.addEventListener('touchstart', markPointerUse, true)

  document.addEventListener('focusin', (event) => {
    const target = event.target

    if (!shouldSuppressMouseFocus(target)) {
      return
    }

    window.requestAnimationFrame(() => {
      if (document.activeElement === target) {
        target.blur()
      }
    })
  })

  document.querySelectorAll('.app-arrival-details-page__date .moj-datepicker').forEach(patchDatePickerLayout)
}

if (window.GOVUKPrototypeKit && window.GOVUKPrototypeKit.documentReady) {
  window.GOVUKPrototypeKit.documentReady(initArrivalDatePickerFocus)
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArrivalDatePickerFocus)
} else {
  initArrivalDatePickerFocus()
}

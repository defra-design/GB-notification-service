const SCROLL_STORAGE_KEY = 'animal-identification-scroll-y'

function shouldPreserveScroll (action) {
  return (typeof action === 'string' && action.startsWith('save:')) ||
    (typeof action === 'string' && action.startsWith('remove:'))
}

function restoreScrollPosition () {
  const savedScrollY = sessionStorage.getItem(SCROLL_STORAGE_KEY)

  if (savedScrollY === null) {
    return
  }

  const scrollY = Number(savedScrollY)
  sessionStorage.removeItem(SCROLL_STORAGE_KEY)

  const applyScroll = () => {
    window.scrollTo(0, scrollY)
  }

  applyScroll()
  requestAnimationFrame(() => {
    requestAnimationFrame(applyScroll)
  })
}

function initAnimalIdentificationScroll () {
  const form = document.querySelector('.app-animal-identification-form')

  if (!form) {
    return
  }

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }

  form.addEventListener('submit', (event) => {
    const submitter = event.submitter
    const action = submitter && (submitter.value || submitter.getAttribute('value'))

    if (shouldPreserveScroll(action)) {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY))
    }
  })

  restoreScrollPosition()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimalIdentificationScroll)
} else {
  initAnimalIdentificationScroll()
}

const SCROLL_STORAGE_KEY = 'roles-and-addresses-scroll-y'

function shouldPreserveScroll (action) {
  return typeof action === 'string' && action.startsWith('same-as-consignee:')
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

function initRolesAndAddressesScroll () {
  const form = document.querySelector('.app-roles-and-addresses-page__form')

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
  document.addEventListener('DOMContentLoaded', initRolesAndAddressesScroll)
} else {
  initRolesAndAddressesScroll()
}

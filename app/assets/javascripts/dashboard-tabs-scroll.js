const SCROLL_STORAGE_KEY = 'dashboard-tabs-scroll-y'

function restoreScrollPosition () {
  const savedScrollY = sessionStorage.getItem(SCROLL_STORAGE_KEY)

  if (savedScrollY === null) {
    return
  }

  const scrollY = Number(savedScrollY)
  sessionStorage.removeItem(SCROLL_STORAGE_KEY)

  if (!Number.isFinite(scrollY)) {
    return
  }

  const applyScroll = () => {
    window.scrollTo(0, scrollY)
  }

  applyScroll()
  requestAnimationFrame(() => {
    requestAnimationFrame(applyScroll)
  })
}

function initDashboardTabsScroll () {
  const tabs = document.querySelector('.app-dr2-dashboard-tabs')

  if (!tabs) {
    return
  }

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }

  tabs.addEventListener('click', (event) => {
    const tabLink = event.target.closest('a.govuk-tabs__tab')

    if (!tabLink || !tabs.contains(tabLink)) {
      return
    }

    sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY))
  })

  restoreScrollPosition()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardTabsScroll)
} else {
  initDashboardTabsScroll()
}

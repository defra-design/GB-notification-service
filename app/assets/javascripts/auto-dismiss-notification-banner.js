function initAutoDismissNotificationBanners () {
  const banners = document.querySelectorAll('[data-auto-dismiss-ms]')

  banners.forEach((banner) => {
    const delay = Number(banner.getAttribute('data-auto-dismiss-ms')) || 0

    if (delay <= 0) {
      return
    }

    window.setTimeout(() => {
      banner.remove()
    }, delay)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoDismissNotificationBanners)
} else {
  initAutoDismissNotificationBanners()
}

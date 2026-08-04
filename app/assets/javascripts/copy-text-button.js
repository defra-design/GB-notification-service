function initCopyTextButtons () {
  const copyButtons = document.querySelectorAll('[data-copy-text]')

  copyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const text = button.getAttribute('data-copy-text')

      if (!text || !navigator.clipboard || !navigator.clipboard.writeText) {
        return
      }

      try {
        await navigator.clipboard.writeText(text)
      } catch (error) {
        // Ignore clipboard failures in the prototype.
      }
    })
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCopyTextButtons)
} else {
  initCopyTextButtons()
}

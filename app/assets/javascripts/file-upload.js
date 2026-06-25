//
// Enhanced file upload — selected file feedback and drag/drop
//

function initFileUpload (root) {
  const input = root.querySelector('.app-upload-documents-card__file-input')
  const status = root.querySelector('.app-upload-documents-card__dropzone-status')
  const hiddenFileName = root.querySelector('[name="attachmentFileName"]')

  if (!input || !status) {
    return
  }

  function updateStatus () {
    const selectedName = input.files && input.files.length > 0 ? input.files[0].name : ''

    if (selectedName) {
      status.textContent = selectedName

      if (hiddenFileName) {
        hiddenFileName.value = selectedName
      }
    } else if (hiddenFileName && hiddenFileName.value) {
      status.textContent = hiddenFileName.value
    } else {
      status.textContent = 'No file chosen'

      if (hiddenFileName) {
        hiddenFileName.value = ''
      }
    }

    const hasFile = Boolean(
      (input.files && input.files.length > 0) ||
      (hiddenFileName && hiddenFileName.value)
    )

    root.classList.toggle('app-upload-documents-card__dropzone--has-file', hasFile)
  }

  function setDragActive (isActive) {
    root.classList.toggle('app-upload-documents-card__dropzone--dragover', isActive)
  }

  input.addEventListener('change', updateStatus)

  root.addEventListener('dragenter', (event) => {
    event.preventDefault()
    setDragActive(true)
  })

  root.addEventListener('dragover', (event) => {
    event.preventDefault()
    setDragActive(true)
  })

  root.addEventListener('dragleave', (event) => {
    if (!root.contains(event.relatedTarget)) {
      setDragActive(false)
    }
  })

  root.addEventListener('drop', (event) => {
    event.preventDefault()
    setDragActive(false)

    const files = event.dataTransfer && event.dataTransfer.files

    if (!files || files.length === 0) {
      return
    }

    const dataTransfer = new DataTransfer()

    Array.from(files).forEach((file) => {
      dataTransfer.items.add(file)
    })

    input.files = dataTransfer.files
    updateStatus()
  })

  updateStatus()
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-file-upload"]').forEach(initFileUpload)
})

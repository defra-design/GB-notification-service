//
// Upload documents — simulate virus check status transition
//

const VIRUS_CHECK_DELAY_MS = 2500

function updateVirusStatusTag (tag, virusStatus) {
  if (!tag || virusStatus !== 'passed') {
    return
  }

  tag.textContent = 'Check completed'
  tag.classList.remove('govuk-tag--blue')
  tag.classList.add('govuk-tag--green')
  tag.dataset.virusStatus = 'passed'
}

function completeVirusCheck (documentId, tag) {
  return fetch(`/upload-documents/virus-check/${encodeURIComponent(documentId)}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json'
    }
  })
    .then((response) => response.json())
    .then((data) => {
      updateVirusStatusTag(tag, data.virusStatus)
    })
    .catch(() => {})
}

function initUploadDocumentsVirusCheck () {
  const statusTags = document.querySelectorAll('.app-upload-documents-table__status[data-virus-status="uploading"]')

  statusTags.forEach((tag) => {
    const documentId = tag.dataset.documentId

    if (!documentId) {
      return
    }

    window.setTimeout(() => {
      completeVirusCheck(documentId, tag)
    }, VIRUS_CHECK_DELAY_MS)
  })
}

window.GOVUKPrototypeKit.documentReady(() => {
  if (!document.querySelector('.app-upload-documents-page')) {
    return
  }

  initUploadDocumentsVirusCheck()
})

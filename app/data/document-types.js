const documentTypes = [
  { value: '', text: 'Select document type' },
  { value: 'journey-log', text: 'Journey log' },
  { value: 'import-licence', text: 'Import licence or authorisation' },
  { value: 'commercial-document', text: 'Commercial document or invoice' },
  { value: 'other', text: 'Other' }
]

function getDocumentTypeLabel (value) {
  const match = documentTypes.find((option) => option.value === value)

  return match && match.value ? match.text : 'N/A'
}

module.exports = documentTypes
module.exports.getDocumentTypeLabel = getDocumentTypeLabel

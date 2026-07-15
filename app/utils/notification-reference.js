const DRAFT_NOTIFICATION_YEAR = 2026
const DRAFT_NOTIFICATION_SEQUENCE = '7963913'
const DRAFT_NOTIFICATION_TYPE = 'CHEDA'

const NOTIFICATION_REFERENCE_PATTERN = /^GB\.(\d{4})\.(\d{7})\s*-\s*[A-Z0-9]+$/i

function formatNotificationReference (
  sequence = DRAFT_NOTIFICATION_SEQUENCE,
  year = DRAFT_NOTIFICATION_YEAR,
  type = DRAFT_NOTIFICATION_TYPE
) {
  return `GB.${year}.${sequence} - ${type}`
}

function formatDraftNotificationReference (
  sequence = DRAFT_NOTIFICATION_SEQUENCE,
  year = DRAFT_NOTIFICATION_YEAR,
  type = DRAFT_NOTIFICATION_TYPE
) {
  return formatNotificationReference(sequence, year, type)
}

function isSubmittedNotificationReference (reference) {
  const value = String(reference || '').trim()

  return /^GBN-[A-Z]{2}-\d{2}-[A-Z0-9]+$/i.test(value) ||
    /^GBN\.GB\.\d{4}\.\d{7}/i.test(value)
}

function isLegacyNotificationReference (reference) {
  const value = String(reference || '').trim()

  return /^IMP\./i.test(value) ||
    /^DRAFT\.GB\./i.test(value) ||
    /^GBN-[A-Z]{2}-\d{2}-/i.test(value) ||
    /^GBN\.GB\./i.test(value)
}

function normalizeNotificationReference (reference) {
  const value = String(reference || '').trim().replace(/\s*\(Draft\)\s*$/i, '')

  if (!value || isLegacyNotificationReference(value)) {
    return formatNotificationReference()
  }

  if (NOTIFICATION_REFERENCE_PATTERN.test(value)) {
    return value
  }

  return formatNotificationReference()
}

function getDisplayNotificationReference (sessionData = {}) {
  return normalizeNotificationReference(sessionData.notificationReference)
}

function ensureDraftNotificationReference (sessionData) {
  if (sessionData.notificationSubmitted) {
    return
  }

  if (
    !sessionData.notificationReference ||
    isLegacyNotificationReference(sessionData.notificationReference) ||
    isSubmittedNotificationReference(sessionData.notificationReference)
  ) {
    sessionData.notificationReference = formatNotificationReference()
  } else {
    sessionData.notificationReference = normalizeNotificationReference(sessionData.notificationReference)
  }
}

function generateSubmittedNotificationReference () {
  const sequence = String(7000000 + Math.floor(Math.random() * 2999999)).padStart(7, '0')

  return formatNotificationReference(sequence)
}

module.exports = {
  DRAFT_NOTIFICATION_SEQUENCE,
  DRAFT_NOTIFICATION_YEAR,
  DRAFT_NOTIFICATION_TYPE,
  formatNotificationReference,
  formatDraftNotificationReference,
  normalizeNotificationReference,
  getDisplayNotificationReference,
  ensureDraftNotificationReference,
  generateSubmittedNotificationReference,
  isSubmittedNotificationReference
}

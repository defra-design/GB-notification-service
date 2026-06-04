const DRAFT_NOTIFICATION_YEAR = 2026
const DRAFT_NOTIFICATION_SEQUENCE = '1000608'

const NOTIFICATION_REFERENCE_PATTERN = /^GBN\.GB\.(\d{4})\.(\d{7})$/i

function formatNotificationReference (sequence, year = DRAFT_NOTIFICATION_YEAR) {
  return `GBN.GB.${year}.${sequence}`
}

function formatDraftNotificationReference (sequence = DRAFT_NOTIFICATION_SEQUENCE, year = DRAFT_NOTIFICATION_YEAR) {
  return `${formatNotificationReference(sequence, year)} (Draft)`
}

function isSubmittedNotificationReference (reference) {
  const value = String(reference || '').trim()

  return /^GBN-[A-Z]{2}-\d{2}-[A-Z0-9]+$/i.test(value)
}

function isLegacyNotificationReference (reference) {
  const value = String(reference || '').trim()

  return /^IMP\./i.test(value)
}

function normalizeNotificationReference (reference) {
  const value = String(reference || '').trim().replace(/\s*\(Draft\)\s*$/i, '')

  if (!value || isLegacyNotificationReference(value)) {
    return formatNotificationReference(DRAFT_NOTIFICATION_SEQUENCE)
  }

  if (NOTIFICATION_REFERENCE_PATTERN.test(value)) {
    return value
  }

  return formatNotificationReference(DRAFT_NOTIFICATION_SEQUENCE)
}

function getDisplayNotificationReference (sessionData = {}) {
  if (sessionData.notificationSubmitted) {
    return String(sessionData.notificationReference || '').trim().replace(/\s*\(Draft\)\s*$/i, '')
  }

  const baseReference = normalizeNotificationReference(sessionData.notificationReference)

  return `${baseReference} (Draft)`
}

function ensureDraftNotificationReference (sessionData) {
  if (sessionData.notificationSubmitted) {
    return
  }

  if (!sessionData.notificationReference || isLegacyNotificationReference(sessionData.notificationReference) || isSubmittedNotificationReference(sessionData.notificationReference)) {
    sessionData.notificationReference = formatNotificationReference(DRAFT_NOTIFICATION_SEQUENCE)
  } else {
    sessionData.notificationReference = normalizeNotificationReference(sessionData.notificationReference)
  }
}

function generateSubmittedNotificationReference () {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '0123456789'
  const pick = (chars, count) => {
    let result = ''

    for (let index = 0; index < count; index += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return result
  }
  const year = String(new Date().getFullYear()).slice(-2)

  return `GBN-${pick(letters, 2)}-${year}-${pick(letters, 1)}${pick(digits, 4)}${pick(letters, 1)}`
}

module.exports = {
  DRAFT_NOTIFICATION_SEQUENCE,
  DRAFT_NOTIFICATION_YEAR,
  formatNotificationReference,
  formatDraftNotificationReference,
  normalizeNotificationReference,
  getDisplayNotificationReference,
  ensureDraftNotificationReference,
  generateSubmittedNotificationReference,
  isSubmittedNotificationReference
}

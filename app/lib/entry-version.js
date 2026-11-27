'use strict'

const { createVersionMount, JOURNEY_PATH_PREFIXES } = require('./version-mount')

// "Sign-in to dashboard" is a copy of Design release 2 with a start page, a
// sign-in step and a page of links in front of the notification type
// dashboards. It has its own URL, views and saved data, and shares nothing
// with the other versions: not even the address book.
const ENTRY_BASE = '/entry'

const {
  middleware,
  mountVersion,
  prefixPath,
  shouldPrefixPath
} = createVersionMount({
  basePath: ENTRY_BASE,
  sessionKey: '_entry',
  versionFlag: '_isEntryVersion',
  viewFolder: 'entry',
  otherVersionBases: ['/design-release-2.1', '/testing', '/testing3', '/testing4'],
  shareSessionKeys: false,
  setupSession (nest) {
    nest._isDesignRelease21Version = true
  },
  setupLocals () {
    return {
      journeyBasePath: ENTRY_BASE,
      isDesignRelease2Version: true,
      isDesignRelease21Version: true,
      isEntryVersion: true,
      serviceName: 'Import notification service',
      serviceNavDashboardHref: ENTRY_BASE,
      serviceNavServiceHref: `${ENTRY_BASE}/index`,
      serviceNavTemplatesHref: `${ENTRY_BASE}/templates`,
      serviceNavAddressBookHref: `${ENTRY_BASE}/address-book`
    }
  }
})

function mountEntryVersion (govukPrototypeKit, sourceRouter) {
  return mountVersion(govukPrototypeKit, sourceRouter)
}

module.exports = {
  ENTRY_BASE,
  middleware,
  mountEntryVersion,
  prefixPath,
  shouldPrefixPath,
  JOURNEY_PATH_PREFIXES
}

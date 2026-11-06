'use strict'

const { createVersionMount, JOURNEY_PATH_PREFIXES } = require('./version-mount')

// Testing 3 is a copy of Design release 2.1. It runs all the 2.1 route logic
// and looks the same, but has its own URL, views and session data.
const TESTING3_BASE = '/testing3'

const {
  middleware,
  mountVersion,
  prefixPath,
  shouldPrefixPath
} = createVersionMount({
  basePath: TESTING3_BASE,
  sessionKey: '_testing3',
  versionFlag: '_isTesting3Version',
  viewFolder: 'testing3',
  otherVersionBases: ['/design-release-2.1', '/testing', '/testing2'],
  setupSession (nest) {
    nest._isDesignRelease21Version = true
  },
  setupLocals () {
    return {
      journeyBasePath: TESTING3_BASE,
      isDesignRelease2Version: true,
      isDesignRelease21Version: true,
      isTesting3Version: true,
      serviceName: 'Import of products, animals, food and feed service',
      serviceNavDashboardHref: TESTING3_BASE,
      serviceNavServiceHref: `${TESTING3_BASE}/index`,
      serviceNavTemplatesHref: `${TESTING3_BASE}/templates`,
      serviceNavAddressBookHref: `${TESTING3_BASE}/address-book`
    }
  }
})

function mountTesting3Version (govukPrototypeKit, sourceRouter) {
  return mountVersion(govukPrototypeKit, sourceRouter)
}

module.exports = {
  TESTING3_BASE,
  middleware,
  mountTesting3Version,
  prefixPath,
  shouldPrefixPath,
  JOURNEY_PATH_PREFIXES
}

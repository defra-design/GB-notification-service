'use strict'

const { createVersionMount, JOURNEY_PATH_PREFIXES } = require('./version-mount')

// Testing 2 is a snapshot of Design release 2.1 (including the germinal
// products journey) for research with real users. It runs all the 2.1 route
// logic, but has its own URL, views and session data.
const TESTING2_BASE = '/testing2'

const {
  middleware,
  mountVersion,
  prefixPath,
  shouldPrefixPath
} = createVersionMount({
  basePath: TESTING2_BASE,
  sessionKey: '_testing2',
  versionFlag: '_isTesting2Version',
  viewFolder: 'testing2',
  otherVersionBases: ['/design-release-2.1', '/design-release-2', '/testing'],
  setupSession (nest) {
    nest._isDesignRelease21Version = true
  },
  setupLocals () {
    return {
      journeyBasePath: TESTING2_BASE,
      isDesignRelease2Version: true,
      isDesignRelease21Version: true,
      isTesting2Version: true,
      // Use the testing version's header (service name and navigation)
      isTestingVersion: true,
      serviceName: 'Import of products, animals, food and feed service',
      serviceNavDashboardHref: TESTING2_BASE,
      serviceNavServiceHref: `${TESTING2_BASE}/index`,
      serviceNavTemplatesHref: `${TESTING2_BASE}/templates`,
      serviceNavAddressBookHref: `${TESTING2_BASE}/address-book`
    }
  }
})

function mountTesting2Version (govukPrototypeKit, sourceRouter) {
  return mountVersion(govukPrototypeKit, sourceRouter)
}

module.exports = {
  TESTING2_BASE,
  middleware,
  mountTesting2Version,
  prefixPath,
  shouldPrefixPath,
  JOURNEY_PATH_PREFIXES
}

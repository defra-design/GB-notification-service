'use strict'

const { createVersionMount, JOURNEY_PATH_PREFIXES } = require('./version-mount')

// Testing 4 is a copy of Testing 3 (Round 2 live animals). It has its own
// URL, views and session, and its dashboard lists germinal products.
const TESTING4_BASE = '/testing4'

const {
  middleware,
  mountVersion,
  prefixPath,
  shouldPrefixPath
} = createVersionMount({
  basePath: TESTING4_BASE,
  sessionKey: '_testing4',
  versionFlag: '_isTesting4Version',
  viewFolder: 'testing4',
  otherVersionBases: ['/design-release-2.1', '/testing', '/testing3'],
  setupSession (nest) {
    nest._isDesignRelease21Version = true
  },
  setupLocals () {
    return {
      journeyBasePath: TESTING4_BASE,
      isDesignRelease2Version: true,
      isDesignRelease21Version: true,
      isTesting4Version: true,
      serviceName: 'Import of products, animals, food and feed service',
      serviceNavDashboardHref: TESTING4_BASE,
      serviceNavServiceHref: `${TESTING4_BASE}/index`,
      serviceNavTemplatesHref: `${TESTING4_BASE}/templates`,
      serviceNavAddressBookHref: `${TESTING4_BASE}/address-book`
    }
  }
})

function mountTesting4Version (govukPrototypeKit, sourceRouter) {
  return mountVersion(govukPrototypeKit, sourceRouter)
}

module.exports = {
  TESTING4_BASE,
  middleware,
  mountTesting4Version,
  prefixPath,
  shouldPrefixPath,
  JOURNEY_PATH_PREFIXES
}

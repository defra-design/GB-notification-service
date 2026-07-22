'use strict'

const { createVersionMount, JOURNEY_PATH_PREFIXES } = require('./version-mount')

const TESTING_BASE = '/testing'

const {
  middleware,
  mountVersion,
  prefixPath,
  shouldPrefixPath
} = createVersionMount({
  basePath: TESTING_BASE,
  sessionKey: '_testing',
  versionFlag: '_isTestingVersion',
  viewFolder: 'testing',
  otherVersionBases: ['/design-release-2'],
  setupSession (nest) {
    const testingReference = 'GB.2026.7963913 - CHEDA'
    const hasChedaReference = /^GB\.\d{4}\.\d{7}\s*-\s*[A-Z0-9]+$/i.test(
      String(nest.notificationReference || '').trim()
    )

    if (!hasChedaReference) {
      nest.notificationReference = testingReference
    }
  },
  setupLocals () {
    return {
      journeyBasePath: TESTING_BASE,
      isTestingVersion: true,
      serviceNavDashboardHref: TESTING_BASE,
      serviceName: 'Import of products, animals, food and feed service'
    }
  }
})

function mountTestingVersion (govukPrototypeKit, sourceRouter) {
  return mountVersion(govukPrototypeKit, sourceRouter)
}

module.exports = {
  TESTING_BASE,
  middleware,
  mountTestingVersion,
  prefixPath,
  shouldPrefixPath,
  JOURNEY_PATH_PREFIXES
}

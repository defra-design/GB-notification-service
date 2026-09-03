'use strict'

const { createVersionMount, JOURNEY_PATH_PREFIXES } = require('./version-mount')

const DESIGN_RELEASE_2_BASE = '/design-release-2'

const {
  middleware,
  mountVersion,
  prefixPath,
  shouldPrefixPath
} = createVersionMount({
  basePath: DESIGN_RELEASE_2_BASE,
  sessionKey: '_designRelease2',
  versionFlag: '_isDesignRelease2Version',
  viewFolder: 'design-release-2',
  otherVersionBases: ['/design-release-2.1', '/testing'],
  setupLocals () {
    return {
      journeyBasePath: DESIGN_RELEASE_2_BASE,
      isDesignRelease2Version: true,
      serviceNavDashboardHref: DESIGN_RELEASE_2_BASE,
      serviceNavServiceHref: `${DESIGN_RELEASE_2_BASE}/index`,
      serviceNavTemplatesHref: `${DESIGN_RELEASE_2_BASE}/templates`,
      serviceNavAddressBookHref: `${DESIGN_RELEASE_2_BASE}/address-book`
    }
  }
})

function mountDesignRelease2Version (govukPrototypeKit, sourceRouter) {
  return mountVersion(govukPrototypeKit, sourceRouter)
}

module.exports = {
  DESIGN_RELEASE_2_BASE,
  middleware,
  mountDesignRelease2Version,
  prefixPath,
  shouldPrefixPath,
  JOURNEY_PATH_PREFIXES
}

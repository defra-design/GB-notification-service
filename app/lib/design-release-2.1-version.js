'use strict'

const { createVersionMount, JOURNEY_PATH_PREFIXES } = require('./version-mount')

const DESIGN_RELEASE_21_BASE = '/design-release-2.1'

const {
  middleware,
  mountVersion,
  prefixPath,
  shouldPrefixPath
} = createVersionMount({
  basePath: DESIGN_RELEASE_21_BASE,
  sessionKey: '_designRelease21',
  versionFlag: '_isDesignRelease21Version',
  viewFolder: 'design-release-2.1',
  otherVersionBases: ['/design-release-2', '/testing'],
  setupLocals () {
    return {
      journeyBasePath: DESIGN_RELEASE_21_BASE,
      isDesignRelease2Version: true,
      isDesignRelease21Version: true,
      serviceNavDashboardHref: DESIGN_RELEASE_21_BASE,
      serviceNavServiceHref: `${DESIGN_RELEASE_21_BASE}/index`,
      serviceNavTemplatesHref: `${DESIGN_RELEASE_21_BASE}/templates`,
      serviceNavAddressBookHref: `${DESIGN_RELEASE_21_BASE}/address-book`
    }
  }
})

function mountDesignRelease21Version (govukPrototypeKit, sourceRouter) {
  return mountVersion(govukPrototypeKit, sourceRouter)
}

module.exports = {
  DESIGN_RELEASE_21_BASE,
  middleware,
  mountDesignRelease21Version,
  prefixPath,
  shouldPrefixPath,
  JOURNEY_PATH_PREFIXES
}

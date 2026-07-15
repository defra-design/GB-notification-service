'use strict'

const path = require('path')
const fs = require('fs')

const TESTING_BASE = '/testing'
const SHARED_SESSION_KEYS = [
  'addressBookAddedAddresses',
  'submittedNotifications'
]

const JOURNEY_PATH_PREFIXES = [
  '/create-notification',
  '/origin-of-the-import',
  '/what-are-you-importing',
  '/reason-for-import',
  '/consignment-details',
  '/animal-identification-details',
  '/additional-animal-details',
  '/arrival-details',
  '/transit-countries',
  '/transporter',
  '/upload-documents',
  '/roles-and-addresses',
  '/place-of-origin',
  '/consignor-or-exporter',
  '/consignee',
  '/importer',
  '/place-of-destination',
  '/cph-number',
  '/permanent-address',
  '/contact-address-for-consignment',
  '/review-notification',
  '/declaration',
  '/notification-submitted',
  '/notification-hub',
  '/dashboard',
  '/prototype/reason-for-import'
]

function isSharedExternalPath (urlPath) {
  return urlPath === '/address-book' ||
    urlPath.startsWith('/address-book/') ||
    urlPath.startsWith('/public/') ||
    urlPath.startsWith('/plugin-assets/') ||
    urlPath.startsWith('/manage-prototype')
}

function shouldPrefixPath (urlPath) {
  if (!urlPath || typeof urlPath !== 'string') {
    return false
  }

  if (!urlPath.startsWith('/') || urlPath.startsWith('//')) {
    return false
  }

  if (urlPath === '#' || urlPath.startsWith('#')) {
    return false
  }

  if (urlPath.startsWith(TESTING_BASE + '/') || urlPath === TESTING_BASE) {
    return false
  }

  if (isSharedExternalPath(urlPath)) {
    return false
  }

  const barePath = urlPath.split('?')[0].split('#')[0]

  if (barePath === '/' || barePath === '') {
    return true
  }

  return JOURNEY_PATH_PREFIXES.some((prefix) =>
    barePath === prefix || barePath.startsWith(prefix + '/')
  )
}

function prefixPath (urlPath) {
  if (!shouldPrefixPath(urlPath)) {
    return urlPath
  }

  if (urlPath === '/') {
    return TESTING_BASE
  }

  if (urlPath.startsWith('/?')) {
    return TESTING_BASE + urlPath.slice(1)
  }

  return TESTING_BASE + urlPath
}

function prefixPathsDeep (value, seen = new WeakSet()) {
  if (typeof value === 'string') {
    return prefixPath(value)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  if (seen.has(value)) {
    return value
  }

  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => prefixPathsDeep(item, seen))
  }

  const output = {}

  Object.keys(value).forEach((key) => {
    output[key] = prefixPathsDeep(value[key], seen)
  })

  return output
}

function testingViewExists (viewName) {
  if (!viewName || typeof viewName !== 'string') {
    return false
  }

  const testingName = viewName.startsWith('testing/') ? viewName : `testing/${viewName}`
  const viewsRoot = path.join(__dirname, '..', 'views')

  return [
    path.join(viewsRoot, `${testingName}.html`),
    path.join(viewsRoot, `${testingName}.njk`),
    path.join(viewsRoot, testingName, 'index.html')
  ].some((candidate) => fs.existsSync(candidate))
}

function buildTestingRoot (sessionData = {}) {
  const root = {
    addressBookAddedAddresses: sessionData.addressBookAddedAddresses,
    submittedNotifications: sessionData.submittedNotifications,
    _testing: (sessionData._testing && typeof sessionData._testing === 'object')
      ? sessionData._testing
      : {}
  }

  // Keep any other top-level keys that belong to the main journey.
  Object.keys(sessionData).forEach((key) => {
    if (key === '_testing' || SHARED_SESSION_KEYS.includes(key)) {
      return
    }

    root[key] = sessionData[key]
  })

  return root
}

function attachSharedSessionAccessors (nest, root) {
  SHARED_SESSION_KEYS.forEach((key) => {
    Object.defineProperty(nest, key, {
      configurable: true,
      enumerable: false,
      get () {
        return root[key]
      },
      set (value) {
        root[key] = value
      }
    })
  })
}

function detachSharedSessionAccessors (nest) {
  SHARED_SESSION_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(nest, key)) {
      delete nest[key]
    }
  })
}

function restoreTestingSessionRoot (req) {
  if (!req || req._testingSessionRestored || !req._testingSessionRoot) {
    return
  }

  req._testingSessionRestored = true

  const root = req._testingSessionRoot
  const nest = req.session.data

  detachSharedSessionAccessors(nest)
  root._testing = nest
  req.session.data = root
}

function middleware (req, res, next) {
  const root = buildTestingRoot(req.session.data || {})
  const nest = root._testing

  req._testingSessionRoot = root
  req._testingSessionRestored = false

  attachSharedSessionAccessors(nest, root)
  req.session.data = nest

  // Kit autoStoreData runs before this middleware and writes request input onto the root
  // object. Copy only those input keys into the testing nest for this request.
  ;[req.body, req.query].forEach((source) => {
    if (!source || typeof source !== 'object') {
      return
    }

    Object.keys(source).forEach((key) => {
      if (key.indexOf('_') === 0 || key === '_testing' || SHARED_SESSION_KEYS.includes(key)) {
        return
      }

      if (Object.prototype.hasOwnProperty.call(root, key)) {
        nest[key] = root[key]
      }
    })
  })

  res.locals.journeyBasePath = TESTING_BASE
  res.locals.isTestingVersion = true
  res.locals.serviceNavDashboardHref = TESTING_BASE
  res.locals.serviceName = 'Import of products, animals, food and feed service'

  const originalRedirect = res.redirect.bind(res)

  res.redirect = function redirectWithTestingPrefix (statusOrUrl, maybeUrl) {
    restoreTestingSessionRoot(req)

    let status = statusOrUrl
    let url = maybeUrl

    if (typeof statusOrUrl === 'string' || typeof statusOrUrl === 'undefined') {
      url = statusOrUrl
      status = undefined
    }

    if (typeof url === 'string') {
      url = prefixPath(url)
    }

    if (status === undefined) {
      return originalRedirect(url)
    }

    return originalRedirect(status, url)
  }

  const originalRender = res.render.bind(res)

  res.render = function renderTestingView (view, options, callback) {
    let viewName = view
    let renderOptions = options
    let renderCallback = callback

    if (typeof renderOptions === 'function') {
      renderCallback = renderOptions
      renderOptions = {}
    }

    renderOptions = renderOptions ? prefixPathsDeep(renderOptions) : {}

    if (renderOptions.data) {
      renderOptions.data = prefixPathsDeep(renderOptions.data)
    }

    if (
      typeof viewName === 'string' &&
      !viewName.startsWith('layouts/') &&
      !viewName.startsWith('partials/') &&
      !viewName.startsWith('govuk') &&
      !viewName.startsWith('moj') &&
      !viewName.startsWith('testing/')
    ) {
      if (testingViewExists(viewName)) {
        viewName = `testing/${viewName}`
      }
    }

    return originalRender(viewName, renderOptions, renderCallback)
  }

  const originalEnd = res.end

  res.end = function testingSessionEnd (...args) {
    restoreTestingSessionRoot(req)
    return originalEnd.apply(this, args)
  }

  next()
}

function copyRouterStack (sourceRouter, destinationRouter) {
  sourceRouter.stack.forEach((layer) => {
    if (!layer.route) {
      return
    }

    const routePath = layer.route.path
    const handlers = layer.route.stack.map((stackLayer) => stackLayer.handle)

    Object.keys(layer.route.methods).forEach((method) => {
      if (method === '_all') {
        return
      }

      destinationRouter[method](routePath, ...handlers)
    })
  })
}

function mountTestingVersion (govukPrototypeKit, sourceRouter) {
  const testingRouter = govukPrototypeKit.requests.setupRouter(TESTING_BASE)

  testingRouter.use(middleware)
  copyRouterStack(sourceRouter, testingRouter)

  return testingRouter
}

module.exports = {
  TESTING_BASE,
  middleware,
  mountTestingVersion,
  prefixPath,
  shouldPrefixPath,
  JOURNEY_PATH_PREFIXES
}

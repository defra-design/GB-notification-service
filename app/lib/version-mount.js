'use strict'

const path = require('path')
const fs = require('fs')

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
  '/templates',
  '/actions',
  '/changes',
  '/inspection',
  '/prototype/reason-for-import'
]

function isSharedExternalPath (urlPath) {
  return urlPath === '/address-book' ||
    urlPath.startsWith('/address-book/') ||
    urlPath.startsWith('/public/') ||
    urlPath.startsWith('/plugin-assets/') ||
    urlPath.startsWith('/manage-prototype') ||
    urlPath === '/index'
}

function createVersionMount ({
  basePath,
  sessionKey,
  versionFlag,
  viewFolder,
  otherVersionBases = [],
  setupSession = () => {},
  setupLocals = () => ({})
}) {
  const reservedVersionBases = [basePath, ...otherVersionBases]

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

    const barePath = urlPath.split('?')[0].split('#')[0]

    if (reservedVersionBases.some((versionBase) =>
      barePath === versionBase || barePath.startsWith(versionBase + '/')
    )) {
      return false
    }

    if (isSharedExternalPath(urlPath)) {
      return false
    }

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
      return basePath
    }

    if (urlPath.startsWith('/?')) {
      return basePath + urlPath.slice(1)
    }

    return basePath + urlPath
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

  function versionViewExists (viewName) {
    if (!viewName || typeof viewName !== 'string') {
      return false
    }

    const versionName = viewName.startsWith(`${viewFolder}/`)
      ? viewName
      : `${viewFolder}/${viewName}`
    const viewsRoot = path.join(__dirname, '..', 'views')

    return [
      path.join(viewsRoot, `${versionName}.html`),
      path.join(viewsRoot, `${versionName}.njk`),
      path.join(viewsRoot, versionName, 'index.html')
    ].some((candidate) => fs.existsSync(candidate))
  }

  function buildVersionRoot (sessionData = {}) {
    const root = {
      addressBookAddedAddresses: sessionData.addressBookAddedAddresses,
      submittedNotifications: sessionData.submittedNotifications,
      [sessionKey]: (sessionData[sessionKey] && typeof sessionData[sessionKey] === 'object')
        ? sessionData[sessionKey]
        : {}
    }

    Object.keys(sessionData).forEach((key) => {
      if (key === sessionKey || SHARED_SESSION_KEYS.includes(key)) {
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

  function restoreVersionSessionRoot (req) {
    if (!req || req._versionSessionRestored || !req._versionSessionRoot) {
      return
    }

    req._versionSessionRestored = true

    const root = req._versionSessionRoot
    const nest = req.session.data

    detachSharedSessionAccessors(nest)
    root[sessionKey] = nest
    req.session.data = root
  }

  function middleware (req, res, next) {
    const root = buildVersionRoot(req.session.data || {})
    const nest = root[sessionKey]

    req._versionSessionRoot = root
    req._versionSessionRestored = false

    attachSharedSessionAccessors(nest, root)
    nest[versionFlag] = true
    req.session.data = nest
    res.locals.data = nest

    ;[req.body, req.query].forEach((source) => {
      if (!source || typeof source !== 'object') {
        return
      }

      Object.keys(source).forEach((key) => {
        if (key.indexOf('_') === 0 || key === sessionKey || SHARED_SESSION_KEYS.includes(key)) {
          return
        }

        if (Object.prototype.hasOwnProperty.call(root, key)) {
          nest[key] = root[key]
        }
      })
    })

    setupSession(nest, root)

    Object.assign(res.locals, setupLocals(nest, root))

    const originalRedirect = res.redirect.bind(res)

    res.redirect = function redirectWithVersionPrefix (statusOrUrl, maybeUrl) {
      restoreVersionSessionRoot(req)

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

    res.render = function renderVersionView (view, options, callback) {
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
        !viewName.startsWith(`${viewFolder}/`)
      ) {
        if (versionViewExists(viewName)) {
          viewName = `${viewFolder}/${viewName}`
        }
      }

      return originalRender(viewName, renderOptions, renderCallback)
    }

    const originalEnd = res.end

    res.end = function versionSessionEnd (...args) {
      restoreVersionSessionRoot(req)
      return originalEnd.apply(this, args)
    }

    next()
  }

  function mountVersion (govukPrototypeKit, sourceRouter) {
    const versionRouter = govukPrototypeKit.requests.setupRouter(basePath)

    versionRouter.use(middleware)
    copyRouterStack(sourceRouter, versionRouter)

    return versionRouter
  }

  return {
    basePath,
    middleware,
    mountVersion,
    prefixPath,
    shouldPrefixPath
  }
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

module.exports = {
  SHARED_SESSION_KEYS,
  JOURNEY_PATH_PREFIXES,
  isSharedExternalPath,
  createVersionMount
}

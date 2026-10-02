const originHeadingsByImportType = {
  'live-animal-or-germinal-products': 'Origin of the live animal or germinal products',
  'products-of-animal-origin-or-animal-by-products': 'Origin of the product of animal origin or animal by-product',
  'high-risk-food-or-feed-of-non-animal-origin': 'Origin of the high risk food or feed of non-animal origin',
  'plants-plant-products-and-other-objects': 'Origin of the plants, plant products and other objects'
}

const importTypeLabelsByImportType = {
  'live-animal-or-germinal-products': 'Live animal or germinal products',
  'products-of-animal-origin-or-animal-by-products': 'Products of animal origin or animal by-products',
  'high-risk-food-or-feed-of-non-animal-origin': 'High risk food or feed of non-animal origin',
  'plants-plant-products-and-other-objects': 'Plants, plant products and other objects'
}

const reasonLabelsByReason = {
  'internal-market': 'Internal market',
  'non-internal-market': 'Non-internal market'
}

const commodityIntendedLabels = {
  feedstuff: 'Feedstuff',
  'further-process': 'Further process',
  'human-consumption': 'Human consumption',
  'human-consumption-after-further-treatment': 'Human consumption after further treatment',
  other: 'Other',
  sample: 'Sample',
  'trade-sample': 'Trade Sample'
}

const transportConditionsLabels = { ambient: 'Ambient', chilled: 'Chilled', frozen: 'Frozen' }

const trailersLabels = { yes: 'Yes', no: 'No' }

const transportTypeLabels = { airplane: 'Airplane', railway: 'Railway', 'road-vehicle': 'Road vehicle', vessel: 'Vessel' }

function transportIdentifier (transport) {
  if (!transport) return 'Not provided'
  switch (transport.type) {
    case 'airplane': return transport['flight-number'] || 'Not provided'
    case 'railway': return transport.identifier || 'Not provided'
    case 'road-vehicle': return transport['vehicle-registration'] || 'Not provided'
    case 'vessel': return transport['ship-name'] || 'Not provided'
    default: return 'Not provided'
  }
}

function buildNotificationSummaryViewModel (data) {
  const { getBcpLabel } = require('../../data/border-control-posts-ched-d.js')
  const tracesCountries = require('../../data/traces-countries.js')
  const regionRules = require('../../data/region-of-origin-rules.js')

  const countryText = (value) => {
    const match = tracesCountries.find(country => country.value === value)
    return match ? match.text : (value || 'Not provided')
  }

  const commodities = data.commodities || []
  const totalNetWeight = commodities.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0)
  const totalPackages = commodities.reduce((sum, item) => sum + (parseInt(item.packages, 10) || 0), 0)

  const commodityRegions = commodities
    .map(item => {
      const rule = regionRules.find(r => r.commodity === item.commodity && r.country === data.countryOfOriginText)
      return rule ? { commodityName: item.description || item.commodity, label: rule.label, value: item.regionOfOrigin || 'Not provided' } : null
    })
    .filter(Boolean)

  const transports = (data.transports || []).map(transport => ({
    typeLabel: transportTypeLabels[transport.type] || transport.type,
    identifier: transportIdentifier(transport),
    document: transport.document || 'Not provided'
  }))

  return {
    importTypeText: importTypeLabelsByImportType[data['import-type']] || 'Not provided',
    reasonText: reasonLabelsByReason[data.reason] || 'Not provided',
    destinationCountryText: countryText(data['origin-assigned-country']),
    commodityIntendedText: commodityIntendedLabels[data['commodity-intended']] || 'Not provided',
    commodityRegions,
    totalNetWeight,
    totalPackages,
    bcpText: getBcpLabel(data['border-control-post']),
    transports,
    trailersText: trailersLabels[data.trailers] || 'Not provided',
    transportConditionsText: transportConditionsLabels[data['transport-conditions']] || 'Not provided',
    dispatchCountryText: countryText(data['dispatch-country']),
    arrivalDateText: formatDayMonthYear(data['arrival-date-day'], data['arrival-date-month'], data['arrival-date-year']) || 'Not provided',
    arrivalTimeText: (data['arrival-hour'] && data['arrival-minute']) ? `${data['arrival-hour']}:${data['arrival-minute']}` : 'Not provided'
  }
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatDayMonthYear (day, month, year) {
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  if (!d || !m || !y || !monthNames[m - 1]) return ''
  return `${d} ${monthNames[m - 1]} ${y}`
}

module.exports = function (router) {
  router.post('/chedd-traces/01-what-are-you-importing', (req, res) => {
    req.session.data['import-type'] = req.body['import-type']
    res.redirect('/chedd-traces/02-origin-animal-or-product')
  })

  router.get('/chedd-traces/02-origin-animal-or-product', (req, res) => {
    const importType = req.session.data['import-type']
    res.render('chedd-traces/02-origin-animal-or-product', {
      originHeading: originHeadingsByImportType[importType] || 'Origin of the animal or product'
    })
  })

  router.post('/chedd-traces/02-origin-animal-or-product', (req, res) => {
    const tracesCountries = require('../../data/traces-countries.js')
    const value = req.body['origin-country']
    const match = tracesCountries.find(country => country.value === value)

    req.session.data.countryOfOrigin = value
    req.session.data.countryOfOriginText = match ? match.text : value

    res.redirect('/chedd-traces/03-origin-import')
  })

  router.post('/chedd-traces/03-origin-import', (req, res) => {
    const tracesCountries = require('../../data/traces-countries.js')
    const value = req.body['origin-country']
    const match = tracesCountries.find(country => country.value === value)

    req.session.data.countryOfOrigin = value
    req.session.data.countryOfOriginText = match ? match.text : value

    res.redirect('/chedd-traces/04-commodity-search')
  })

  router.get('/chedd-traces/04-commodity-search', (req, res) => {
    const commoditiesData = require('../../data/commodities-ched-d.js')

    if (req.query.returnTo === '08-commodity') {
      req.session.data.commodityReturnTo = '08-commodity'
    }

    const commodityOptions = Object.entries(commoditiesData)
      .map(([key, details]) => ({
        value: key,
        text: `${details.commonName || key} (${details.code})`
      }))
      .sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }))

    res.render('chedd-traces/04-commodity-search', { commodityOptions })
  })

  router.post('/chedd-traces/04-commodity-search', (req, res) => {
    const commoditiesData = require('../../data/commodities-ched-d.js')

    const key = req.session.data.commodity
    const details = commoditiesData[key]

    if (!details) {
      return res.redirect('/chedd-traces/04-commodity-search')
    }

    req.session.data.commodities = req.session.data.commodities || []
    req.session.data.commodities.push({
      commodity: key,
      code: details.code,
      description: details.description
    })

    if (req.session.data.commodityReturnTo === '08-commodity') {
      delete req.session.data.commodityReturnTo
      return res.redirect('/chedd-traces/08-commodity')
    }

    res.redirect('/chedd-traces/05-commodity-add-another')
  })

  router.post('/chedd-traces/06-main-reason-importing', (req, res) => {
    res.redirect('/chedd-traces/07-notification-hub')
  })

  router.get('/chedd-traces/07-notification-hub', (req, res) => {
    const data = req.session.data
    const commodities = data.commodities || []

    const notStarted = { tag: { text: 'Not started', classes: 'govuk-tag--grey' } }
    const inProgress = { tag: { text: 'In progress', classes: 'govuk-tag--blue' } }
    const completed = { tag: { text: 'Completed' } }

    const commodityStatus = commodities.length === 0
      ? notStarted
      : commodities.every(item => item.netWeight && item.packages && item.packageType)
        ? completed
        : inProgress

    const addressesAnswered = [data.consignorOrExporter, data.consigneeOrImporter, data.placeOfDestination].filter(Boolean).length
    const addressesStatus = addressesAnswered === 0 ? notStarted : addressesAnswered === 3 ? completed : inProgress

    res.render('chedd-traces/07-notification-hub', {
      commodityCount: commodities.length,
      packageCount: commodities.reduce((sum, item) => sum + (parseInt(item.packages, 10) || 0), 0),
      originStatus: data.countryOfOrigin ? completed : notStarted,
      reasonStatus: data.reason ? completed : notStarted,
      commodityStatus,
      additionalDetailsStatus: data['commodity-intended'] ? completed : notStarted,
      documentsStatus: (data.accompanyingDocuments || []).length > 0 ? completed : notStarted,
      addressesStatus,
      transportStatus: data['border-control-post'] ? completed : notStarted
    })
  })

  function buildTransportsFromBody (body) {
    const typeFieldPattern = /^transport-(\d+)-type$/
    const indices = Object.keys(body)
      .map(key => key.match(typeFieldPattern))
      .filter(Boolean)
      .map(match => match[1])
      .sort((a, b) => Number(a) - Number(b))

    return indices.map(index => {
      const prefix = 'transport-' + index + '-'
      const values = { type: body[prefix + 'type'] }

      Object.keys(body).forEach(fieldKey => {
        if (fieldKey.indexOf(prefix) === 0 && fieldKey !== prefix + 'type') {
          values[fieldKey.slice(prefix.length)] = body[fieldKey]
        }
      })

      return values
    })
  }

  router.post('/chedd-traces/14-transport-to-port', (req, res) => {
    res.redirect('/chedd-traces/14a-transport')
  })

  router.post('/chedd-traces/14a-transport', (req, res) => {
    req.session.data.transports = buildTransportsFromBody(req.body)
    res.redirect('/chedd-traces/20-review-notification-draft')
  })

  router.get('/chedd-traces/20-review-notification-draft', (req, res) => {
    res.render('chedd-traces/20-review-notification-draft', buildNotificationSummaryViewModel(req.session.data))
  })

  router.get('/chedd-traces/08-commodity', (req, res) => {
    const commoditiesData = require('../../data/commodities-ched-d.js')
    const regionRules = require('../../data/region-of-origin-rules.js')
    const countryOfOriginText = req.session.data.countryOfOriginText

    const commodities = (req.session.data.commodities || []).map(item => {
      const details = commoditiesData[item.commodity] || {}
      const rule = regionRules.find(r => r.commodity === item.commodity && r.country === countryOfOriginText)

      return {
        ...item,
        commonName: details.commonName || item.commodity,
        unit: details.unit || 'kg',
        regionOfOriginRequired: !!rule,
        regionOfOriginLabel: rule ? rule.label : null,
        regionOfOriginHint: rule ? rule.hint : null
      }
    })

    res.render('chedd-traces/08-commodity', {
      commodities,
      countryOfOriginText
    })
  })

  router.post('/chedd-traces/08-commodity', (req, res) => {
    const packageTypes = require('../../data/package-types.js')
    const commodities = req.session.data.commodities || []

    commodities.forEach((item, index) => {
      item.netWeight = req.body['net-weight-' + index]
      item.packages = req.body['packages-' + index]
      item.packageType = req.body['type-package-' + index]
      const packageType = packageTypes.find(p => p.value === item.packageType)
      item.packageTypeText = packageType ? packageType.text : item.packageType
      item.regionOfOrigin = req.body['region-of-origin-' + index]
    })

    req.session.data.grossWeight = req.body['gross-weight']

    res.redirect('/chedd-traces/09-additional-details')
  })

  router.post('/chedd-traces/09-additional-details', (req, res) => {
    res.redirect('/chedd-traces/10-accompanying-documents')
  })

  router.get('/chedd-traces/10-accompanying-documents', (req, res) => {
    const attachmentTypes = require('../../data/traces-attachment-types.js')

    if (!req.session.data.accompanyingDocuments) {
      req.session.data.accompanyingDocuments = [
        { type: 'Veterinary health certificate', reference: '12', date: '9 September 2024', attachment: 'file.pdf' }
      ]
    }

    res.render('chedd-traces/10-accompanying-documents', {
      documents: req.session.data.accompanyingDocuments,
      documentTypeItems: [{ value: '', text: 'Select document type' }].concat(attachmentTypes)
    })
  })

  router.get('/chedd-traces/10-accompanying-documents-v2', (req, res) => {
    const attachmentTypes = require('../../data/traces-attachment-types.js')

    res.render('chedd-traces/10-accompanying-documents-v2', {
      documentTypeItems: [{ value: '', text: 'Select document type' }].concat(attachmentTypes)
    })
  })

  router.get('/chedd-traces/10-accompanying-documents/remove-row', (req, res) => {
    const index = parseInt(req.query.index, 10)
    const documents = req.session.data.accompanyingDocuments || []

    if (!isNaN(index) && documents[index]) {
      documents.splice(index, 1)
    }

    res.redirect('/chedd-traces/10-accompanying-documents')
  })

  router.post('/chedd-traces/10-accompanying-documents', (req, res) => {
    const attachmentTypes = require('../../data/traces-attachment-types.js')
    const match = attachmentTypes.find(t => t.value === req.body['new-document-type'])

    req.session.data.pendingDocument = {
      type: match ? match.text : req.body['new-document-type'],
      reference: req.body['new-document-reference'],
      date: formatDayMonthYear(req.body['new-document-date-day'], req.body['new-document-date-month'], req.body['new-document-date-year'])
    }

    res.redirect('/chedd-traces/11-accompanying-documents-upload')
  })

  router.get('/chedd-traces/12-delete-file', (req, res) => {
    const index = parseInt(req.query.index, 10)
    const documents = req.session.data.accompanyingDocuments || []
    const doc = documents[index]

    req.session.data.deleteFileIndex = index

    res.render('chedd-traces/12-delete-file', {
      filename: doc ? doc.attachment : 'file.pdf'
    })
  })

  router.post('/chedd-traces/12-delete-file', (req, res) => {
    const index = req.session.data.deleteFileIndex
    const documents = req.session.data.accompanyingDocuments || []

    if (documents[index]) {
      documents[index].attachment = ''
    }

    delete req.session.data.deleteFileIndex

    res.redirect('/chedd-traces/10-accompanying-documents')
  })

  router.post('/chedd-traces/11-accompanying-documents-upload', (req, res) => {
    const pending = req.session.data.pendingDocument || {}

    req.session.data.accompanyingDocuments = req.session.data.accompanyingDocuments || []
    req.session.data.accompanyingDocuments.push({
      type: pending.type || '',
      reference: pending.reference || '',
      date: pending.date || '',
      attachment: req.body['attachment-filename'] || 'Not provided'
    })

    delete req.session.data.pendingDocument

    res.redirect('/chedd-traces/10-accompanying-documents')
  })

  router.post('/chedd-traces/05-commodity-add-another', (req, res) => {
    const addAnother = req.session.data['add-another-commodity']

    if (addAnother === 'yes') {
      return res.redirect('/chedd-traces/04-commodity-search')
    }

    if (addAnother === 'no') {
      return res.redirect('/chedd-traces/06-main-reason-importing')
    }

    res.redirect('/chedd-traces/05-commodity-add-another')
  })

  // --- Consignment address search (consignor, consignee, place of destination) ---
  const consignors = require('../../data/consignors.js')
  const consignees = require('../../data/consignees.js')
  const placesOfDestination = require('../../data/places-of-destination.js')
  const ADDRESSES_PER_PAGE = 5

  function searchConsignmentAddresses (req, fieldName, addressBook) {
    const queryKey = `${fieldName}-search`
    const searchTerm = (req.query[queryKey] || '').trim().toLowerCase()
    const page = parseInt(req.query.page, 10) || 1

    let filtered = addressBook
    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(searchTerm) ||
        a.address.toLowerCase().includes(searchTerm) ||
        a.country.toLowerCase().includes(searchTerm)
      )
    }

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / ADDRESSES_PER_PAGE))
    const pageNum = Math.max(1, Math.min(page, totalPages))
    const start = (pageNum - 1) * ADDRESSES_PER_PAGE

    return {
      results: filtered.slice(start, start + ADDRESSES_PER_PAGE),
      total,
      totalPages,
      page: pageNum,
      searchTerm: req.query[queryKey] || ''
    }
  }

  router.get('/chedd-traces/13a-consignor-or-exporter', (req, res) => {
    res.render('chedd-traces/13a-consignor-or-exporter', searchConsignmentAddresses(req, 'consignor-or-exporter', consignors))
  })

  router.post('/chedd-traces/13a-consignor-or-exporter', (req, res) => {
    const selected = consignors.find(a => a.id === req.body['consignor-or-exporter'])
    if (selected) req.session.data.consignorOrExporter = selected
    res.redirect('/chedd-traces/13-addresses')
  })

  router.get('/chedd-traces/13b-consignee', (req, res) => {
    res.render('chedd-traces/13b-consignee', searchConsignmentAddresses(req, 'consignee', consignees))
  })

  router.post('/chedd-traces/13b-consignee', (req, res) => {
    const selected = consignees.find(a => a.id === req.body.consignee)
    if (selected) req.session.data.consigneeOrImporter = selected
    res.redirect('/chedd-traces/13-addresses')
  })

  router.get('/chedd-traces/13c-place-of-destination', (req, res) => {
    res.render('chedd-traces/13c-place-of-destination', searchConsignmentAddresses(req, 'place-of-destination', placesOfDestination))
  })

  router.post('/chedd-traces/13c-place-of-destination', (req, res) => {
    const selected = placesOfDestination.find(a => a.id === req.body['place-of-destination'])
    if (selected) req.session.data.placeOfDestination = selected
    res.redirect('/chedd-traces/13-addresses')
  })

  router.post('/chedd-traces/21-declaration', (req, res) => {
    // Mocks the BCP's risk-based selection decision (real-world CHED-Ds are
    // rarely selected for physical inspection) so repeat runs through the
    // journey during user testing see some variety in outcome.
    req.session.data.inspectionRequired = Math.random() < 0.3
    res.redirect('/chedd-traces/24-inspection-required')
  })

  router.get('/chedd-traces/22-review-notification-submitted', (req, res) => {
    const data = req.session.data
    res.render('chedd-traces/22-review-notification-submitted', Object.assign(
      buildNotificationSummaryViewModel(data),
      {
        nextHref: data.inspectionRequired
          ? '/chedd-traces/24-inspection-required'
          : '/chedd-traces/23-inspection-not-required'
      }
    ))
  })

  router.get('/chedd-traces/24-inspection-required', (req, res) => {
    const { getBcpLabel } = require('../../data/border-control-posts-ched-d.js')
    res.render('chedd-traces/24-inspection-required', {
      bcpText: getBcpLabel(req.session.data['border-control-post'])
    })
  })

  router.get('/chedd-traces/24-document-check-required', (req, res) => {
    const { getBcpLabel } = require('../../data/border-control-posts-ched-d.js')
    res.render('chedd-traces/24-document-check-required', {
      bcpText: getBcpLabel(req.session.data['border-control-post'])
    })
  })
}

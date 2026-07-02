//
// Commodity search — multi-select species rows grouped under commodity headers
//

const MIN_SEARCH_LENGTH = 3

function formatCommodity (commodity) {
  return `${commodity.name} (${commodity.code})`
}

function formatSpeciesOptionLabel (commodity, species) {
  if (species.commonName) {
    return `${species.commonName} (${species.label})`
  }

  return `${commodity.name} (${species.label})`
}

function textMatchesQuery (text, query) {
  const queryWords = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

  if (!queryWords.length) {
    return false
  }

  const textWords = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

  if (queryWords.length === 1) {
    return textWords.some((word) => word.startsWith(queryWords[0]))
  }

  for (let index = 0; index <= textWords.length - queryWords.length; index += 1) {
    const isMatch = queryWords.every((queryWord, offset) =>
      textWords[index + offset].startsWith(queryWord)
    )

    if (isMatch) {
      return true
    }
  }

  return false
}

function speciesMatchesQuery (species, query) {
  const searchable = [species.label, species.commonName].filter(Boolean)

  return searchable.some((value) => textMatchesQuery(value, query))
}

function commodityNameOrCodeMatches (commodity, query) {
  const normalisedQuery = query.toLowerCase()
  const code = commodity.code.toLowerCase()

  return textMatchesQuery(commodity.name, query) || code.startsWith(normalisedQuery)
}

function getFilteredSpecies (commodity, query) {
  if (!query) {
    return []
  }

  if (commodityNameOrCodeMatches(commodity, query)) {
    return commodity.species
  }

  return commodity.species.filter((species) => speciesMatchesQuery(species, query))
}

function getVisibleCommodityGroups (commodities, query) {
  const normalisedQuery = query.trim().toLowerCase()

  if (normalisedQuery.length < MIN_SEARCH_LENGTH) {
    return []
  }

  return commodities
    .map((commodity) => ({
      commodity,
      species: getFilteredSpecies(commodity, normalisedQuery)
    }))
    .filter((group) => group.species.length > 0)
}

function highlightMatch (text, query) {
  if (!query) {
    return text
  }

  const queryWords = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

  if (!queryWords.length) {
    return text
  }

  const wordPattern = /[a-z0-9]+/gi
  const words = []
  let match

  while ((match = wordPattern.exec(text)) !== null) {
    words.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length
    })
  }

  const highlightRanges = []

  if (queryWords.length === 1) {
    const queryWord = queryWords[0]

    words.forEach((word) => {
      if (word.value.toLowerCase().startsWith(queryWord)) {
        highlightRanges.push([word.start, word.end])
      }
    })
  } else {
    for (let index = 0; index <= words.length - queryWords.length; index += 1) {
      const isMatch = queryWords.every((queryWord, offset) =>
        words[index + offset].value.toLowerCase().startsWith(queryWord)
      )

      if (!isMatch) {
        continue
      }

      for (let offset = 0; offset < queryWords.length; offset += 1) {
        const word = words[index + offset]
        highlightRanges.push([word.start, word.end])
      }
    }
  }

  if (!highlightRanges.length) {
    return text
  }

  highlightRanges.sort((a, b) => a[0] - b[0])

  let result = ''
  let lastIndex = 0

  highlightRanges.forEach(([start, end]) => {
    if (start < lastIndex) {
      return
    }

    result += text.slice(lastIndex, start)
    result += `<strong class="app-commodity-search__match">${text.slice(start, end)}</strong>`
    lastIndex = end
  })

  result += text.slice(lastIndex)
  return result
}

function escapeHtml (value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parseInitialSelections (rawText) {
  if (!rawText || !rawText.trim()) {
    return []
  }

  let text = rawText.trim()

  if (text.includes('&quot;') || text.includes('&#')) {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    text = textarea.value
  }

  try {
    const parsed = JSON.parse(text)

    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function toSelectionKey (value) {
  if (typeof value === 'string' && value.includes(':')) {
    return value
  }

  if (value && typeof value === 'object') {
    if (value.type === 'species' && value.speciesId) {
      return `species:${value.speciesId}`
    }

    if (value.commodityId) {
      return `commodity:${value.commodityId}`
    }
  }

  return null
}

function getCommoditiesFromRoot (root) {
  const dataEl = root.querySelector('.app-commodity-search__data')

  if (!dataEl) {
    return []
  }

  try {
    const parsed = JSON.parse(dataEl.textContent)

    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function getInitialSelections (root) {
  const dataEl = root.querySelector('.app-commodity-search__initial')

  if (!dataEl) {
    return []
  }

  return parseInitialSelections(dataEl.textContent)
    .map(toSelectionKey)
    .filter(Boolean)
}

function initCommoditySearch (root) {
  const input = root.querySelector('.app-commodity-search__input')
  const button = root.querySelector('.app-commodity-search__button')
  const results = root.querySelector('.app-commodity-search__results')
  const status = root.querySelector('.app-commodity-search__status')
  const commodityIdInput = root.querySelector('.app-commodity-search__commodity-id')
  const commodityCodeInput = root.querySelector('.app-commodity-search__commodity-code')
  const speciesInput = root.querySelector('.app-commodity-search__species-value')
  const selectionsInput = root.querySelector('.app-commodity-search__selections-value')
  const searchBox = root.querySelector('.app-commodity-search')
  const selectedPanel = root.querySelector('.app-commodity-search__selected')
  const selectedHeading = root.querySelector('.app-commodity-search__selected-heading')
  const selectedList = root.querySelector('.app-commodity-search__selected-list')
  const clearAllButton = root.querySelector('.app-commodity-search__selected-clear')

  if (!input || !button || !results || !searchBox || !selectedPanel || !selectedHeading || !selectedList || !clearAllButton) {
    return
  }

  const commodities = getCommoditiesFromRoot(root)

  if (!commodities.length) {
    return
  }

  const selectedValues = new Set(getInitialSelections(root))

  function getCommodityById (commodityId) {
    return commodities.find((commodity) => commodity.id === commodityId)
  }

  function getSpeciesById (speciesId) {
    for (const commodity of commodities) {
      const species = commodity.species.find((item) => item.id === speciesId)

      if (species) {
        return { commodity, species }
      }
    }

    return null
  }

  function setExpanded (isExpanded) {
    searchBox.setAttribute('aria-expanded', isExpanded ? 'true' : 'false')
  }

  function parseSelectionValue (value) {
    if (typeof value !== 'string' || !value.includes(':')) {
      return null
    }

    const separatorIndex = value.indexOf(':')
    const type = value.slice(0, separatorIndex)
    const id = value.slice(separatorIndex + 1)

    if (!type || !id) {
      return null
    }

    return { type, id }
  }

  function announce (message) {
    if (status) {
      status.textContent = message
    }
  }

  function buildSelectionRecords () {
    const records = []

    selectedValues.forEach((value) => {
      const parsed = parseSelectionValue(value)

      if (!parsed || parsed.type !== 'species') {
        return
      }

      const match = getSpeciesById(parsed.id)

      if (match) {
        records.push({
          type: 'species',
          commodityId: match.commodity.id,
          commodityCode: match.commodity.code,
          speciesId: match.species.id
        })
      }
    })

    return records
  }

  function getSelectedCommodityIds () {
    const commodityIds = new Set()

    selectedValues.forEach((value) => {
      const parsed = parseSelectionValue(value)

      if (!parsed || parsed.type !== 'species') {
        return
      }

      const match = getSpeciesById(parsed.id)

      if (match) {
        commodityIds.add(match.commodity.id)
      }
    })

    return Array.from(commodityIds)
  }

  function getPrimaryCommodityId () {
    const selectedCommodityIds = getSelectedCommodityIds()

    return selectedCommodityIds[0] || null
  }

  function updateHiddenFields () {
    const selections = buildSelectionRecords()
    const commodityId = getPrimaryCommodityId()
    const commodity = commodityId ? getCommodityById(commodityId) : null
    const speciesIds = selections
      .filter((selection) => selection.type === 'species')
      .map((selection) => selection.speciesId)

    if (commodityIdInput) {
      commodityIdInput.value = commodityId || ''
    }

    if (commodityCodeInput) {
      commodityCodeInput.value = commodity ? commodity.code : ''
    }

    if (speciesInput) {
      speciesInput.value = JSON.stringify(speciesIds)
    }

    if (selectionsInput) {
      selectionsInput.value = JSON.stringify(selections)
    }
  }

  function refreshUi () {
    updateHiddenFields()
    renderSelectedPanel()
    renderResults(input.value)
  }

  function getSelectedCommodityGroups () {
    const groups = new Map()

    selectedValues.forEach((value) => {
      const parsed = parseSelectionValue(value)

      if (!parsed || parsed.type !== 'species') {
        return
      }

      const match = getSpeciesById(parsed.id)

      if (!match) {
        return
      }

      const { commodity, species } = match

      if (!groups.has(commodity.id)) {
        groups.set(commodity.id, {
          commodityName: commodity.name,
          commodityCode: commodity.code,
          items: []
        })
      }

      groups.get(commodity.id).items.push({
        value,
        chipLabel: species.label
      })
    })

    return Array.from(groups.values())
  }

  function getSelectionCount () {
    return selectedValues.size
  }

  function announceSelectionCount () {
    const count = selectedValues.size

    if (count === 0) {
      announce('')
      return
    }

    announce(`${count} ${count === 1 ? 'option' : 'options'} selected`)
  }

  function renderSelectedPanel () {
    const groups = getSelectedCommodityGroups()
    const count = getSelectionCount()
    const hasSelections = count > 0

    selectedPanel.hidden = !hasSelections
    selectedPanel.classList.toggle('app-commodity-search__selected--visible', hasSelections)
    clearAllButton.hidden = !hasSelections

    if (!hasSelections) {
      selectedHeading.textContent = ''
      selectedList.innerHTML = ''
      return
    }

    selectedHeading.textContent = `${count} selected`

    selectedList.innerHTML = groups.map((group) => `
      <li class="app-commodity-search__selected-entry">
        <p class="app-commodity-search__selected-entry-label">
          <strong class="app-commodity-search__selected-entry-name">${escapeHtml(group.commodityName)} (${escapeHtml(group.commodityCode)})</strong>:
        </p>
        <div class="app-commodity-search__selected-chips">
          ${group.items.map((item) => `
            <div class="app-commodity-search__selected-item">
              <span class="app-commodity-search__selected-label">${escapeHtml(item.chipLabel)}</span>
              <button
                class="app-commodity-search__selected-remove"
                type="button"
                data-selection-value="${escapeHtml(item.value)}"
                aria-label="Remove ${escapeHtml(item.chipLabel)}"
              >
                <span class="govuk-visually-hidden">Remove ${escapeHtml(item.chipLabel)}</span>
              </button>
            </div>
          `).join('')}
        </div>
      </li>
    `).join('')
  }

  function clearAllSelections () {
    selectedValues.clear()
    updateHiddenFields()
    renderSelectedPanel()
    closeResults()
    announce('')
  }

  function removeSelection (value) {
    selectedValues.delete(value)
    updateHiddenFields()
    renderSelectedPanel()
    closeResults()
    announceSelectionCount()
  }

  function toggleSelection (value, checked) {
    if (checked) {
      selectedValues.add(value)
    } else {
      selectedValues.delete(value)
    }

    refreshUi()
    announceSelectionCount()
  }

  function closeResults () {
    results.hidden = true
    results.innerHTML = ''
    setExpanded(false)
  }

  function buildCommodityHeaderRow ({ disabled, labelHtml, rowIndex }) {
    const altClass = rowIndex % 2 === 1 ? ' app-commodity-search__row--alt' : ''
    const disabledClass = disabled ? ' app-commodity-search__row--disabled-group' : ''

    return `
      <li class="app-commodity-search__row app-commodity-search__row--commodity-header${altClass}${disabledClass}">
        <span class="app-commodity-search__row-label app-commodity-search__row-label--heading">${labelHtml}</span>
      </li>
    `
  }

  function buildSpeciesRow ({
    rowIndex,
    commodity,
    disabled,
    checkboxId,
    labelHtml,
    selectionValue,
    isChecked
  }) {
    const altClass = rowIndex % 2 === 1 ? ' app-commodity-search__row--alt' : ''
    const disabledClass = disabled ? ' app-commodity-search__row--disabled' : ''

    return `
      <li class="app-commodity-search__row app-commodity-search__row--species${altClass}${disabledClass}">
        <div class="govuk-checkboxes app-commodity-search__checkbox-item">
          <div class="govuk-checkboxes__item">
            <input
              class="govuk-checkboxes__input app-commodity-search__checkbox-input"
              id="${checkboxId}"
              name="commodity-selection"
              type="checkbox"
              value="${selectionValue}"
              data-row-type="species"
              data-commodity-id="${commodity.id}"
              ${isChecked ? 'checked' : ''}
              ${disabled ? 'disabled' : ''}
            >
            <label class="govuk-checkboxes__label app-commodity-search__row-label" for="${checkboxId}">
              ${labelHtml}
            </label>
          </div>
        </div>
      </li>
    `
  }

  results.addEventListener('change', (event) => {
    const checkbox = event.target.closest('.app-commodity-search__checkbox-input')

    if (!checkbox || checkbox.disabled) {
      return
    }

    toggleSelection(checkbox.value, checkbox.checked)
  })

  selectedList.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.app-commodity-search__selected-remove')

    if (!removeButton) {
      return
    }

    event.preventDefault()
    removeSelection(removeButton.dataset.selectionValue)
  })

  clearAllButton.addEventListener('click', (event) => {
    event.preventDefault()
    clearAllSelections()
  })

  function renderResults (query) {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      closeResults()
      return
    }

    const groups = getVisibleCommodityGroups(commodities, query)
    results.innerHTML = ''

    if (groups.length === 0) {
      results.innerHTML = `
        <li class="app-commodity-search__row app-commodity-search__row--message">
          <span class="app-commodity-search__no-results">No results found</span>
        </li>
      `
      results.hidden = false
      setExpanded(true)
      announce('No results found')
      return
    }

    let rowIndex = 0
    let speciesRowCount = 0
    const rowsHtml = []

    groups.forEach(({ commodity, species }) => {
      rowsHtml.push(buildCommodityHeaderRow({
        disabled: false,
        labelHtml: highlightMatch(escapeHtml(formatCommodity(commodity)), trimmedQuery),
        rowIndex: rowIndex++
      }))

      species.forEach((speciesItem) => {
        const speciesValue = `species:${speciesItem.id}`
        const optionLabel = formatSpeciesOptionLabel(commodity, speciesItem)

        rowsHtml.push(buildSpeciesRow({
          rowIndex: rowIndex++,
          commodity,
          disabled: false,
          checkboxId: `commodity-species-${speciesItem.id}`,
          labelHtml: highlightMatch(escapeHtml(optionLabel), trimmedQuery),
          selectionValue: speciesValue,
          isChecked: selectedValues.has(speciesValue)
        }))
        speciesRowCount += 1
      })
    })

    results.innerHTML = rowsHtml.join('')
    results.hidden = false
    setExpanded(true)

    if (selectedValues.size > 0) {
      announceSelectionCount()
    } else {
      announce(`${speciesRowCount} results available`)
    }
  }

  input.addEventListener('input', () => {
    renderResults(input.value)
  })

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= MIN_SEARCH_LENGTH) {
      renderResults(input.value)
    }
  })

  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target)) {
      closeResults()
    }
  })

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeResults()
    }
  })

  button.addEventListener('click', (event) => {
    event.preventDefault()

    if (input.value.trim().length >= MIN_SEARCH_LENGTH) {
      renderResults(input.value)
      input.focus()
    }
  })

  updateHiddenFields()
  renderSelectedPanel()

  if (input.value.trim().length >= MIN_SEARCH_LENGTH) {
    renderResults(input.value)
  }
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-commodity-search"]').forEach(initCommoditySearch)
})

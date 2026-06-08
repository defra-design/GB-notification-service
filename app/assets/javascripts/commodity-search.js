//
// Commodity search — multi-select species rows grouped under commodity headers
//

const commodities = [
  {
    id: 'cow',
    name: 'Cow',
    code: '0102',
    species: [
      { id: 'cow-bison-bison', label: 'Bison Bison' },
      { id: 'cow-bos-spp', label: 'Bos spp.' },
      { id: 'cow-bos-taurus', label: 'Bos taurus' },
      { id: 'cow-bubalus-bubalis', label: 'Bubalus bubalis' }
    ]
  },
  {
    id: 'dog',
    name: 'Dog',
    code: '01061900',
    species: [
      { id: 'dog-canis-familiaris', label: 'Canis familiaris' }
    ]
  },
  {
    id: 'pig',
    name: 'Pig',
    code: '0103',
    species: [
      { id: 'pig-sus-scrofa', label: 'Sus scrofa domesticus' }
    ]
  },
  {
    id: 'horse',
    name: 'Horse',
    code: '0101',
    species: [
      { id: 'horse-equus-caballus', label: 'Equus caballus (Horse)' },
      { id: 'horse-equus-asinus', label: 'Equus asinus (Donkey)' },
      { id: 'horse-equus-przewalskii', label: "Equus przewalskii (Przewalski's horse)" }
    ]
  },
  {
    id: 'embryos-horse',
    name: 'Embryos/Ova - Horse',
    code: '05119985',
    species: [
      { id: 'embryos-horse-equus', label: 'Embryos/Ova - Horse (Equus Cabalus)' }
    ]
  },
  {
    id: 'bees',
    name: 'Bees',
    code: '01064100',
    species: [
      { id: 'bees-apis-mellifera', label: 'Apis mellifera' },
      { id: 'bees-bombus-canariensis', label: 'Bombus Canariensis' },
      { id: 'bees-bombus-spp', label: 'Bombus Spp' }
    ]
  }
]

function formatCommodity (commodity) {
  return `${commodity.name} (${commodity.code})`
}

function formatSpeciesOptionLabel (commodity, species) {
  return `${commodity.name} (${species.label})`
}

function speciesMatchesQuery (speciesLabel, query) {
  if (query.length < 3) {
    return false
  }

  return speciesLabel.toLowerCase().includes(query)
}

function commodityNameOrCodeMatches (commodity, query) {
  const name = commodity.name.toLowerCase()
  const code = commodity.code.toLowerCase()
  const displayText = formatCommodity(commodity).toLowerCase()

  return displayText.includes(query) || name.includes(query) || code.includes(query)
}

function getFilteredSpecies (commodity, query) {
  if (!query) {
    return []
  }

  if (commodityNameOrCodeMatches(commodity, query)) {
    return commodity.species
  }

  return commodity.species.filter((species) => speciesMatchesQuery(species.label, query))
}

function getVisibleCommodityGroups (query) {
  const normalisedQuery = query.trim().toLowerCase()

  if (!normalisedQuery) {
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

  const index = text.toLowerCase().indexOf(query.toLowerCase())

  if (index === -1) {
    return text
  }

  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return `${before}<strong class="app-commodity-search__match">${match}</strong>${after}`
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

  const selectedValues = new Set(
    getInitialSelections(root).filter((value) => !value.startsWith('commodity:'))
  )

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

  function isCommodityDisabled (commodityId) {
    const selectedCommodityIds = getSelectedCommodityIds()

    return selectedCommodityIds.length > 0 && !selectedCommodityIds.includes(commodityId)
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

  function getSelectionLabel (value) {
    const parsed = parseSelectionValue(value)

    if (!parsed) {
      return ''
    }

    const match = getSpeciesById(parsed.id)

    return match ? match.species.label : ''
  }

  function getSelectionItems () {
    return Array.from(selectedValues)
      .map((value) => ({
        value,
        label: getSelectionLabel(value)
      }))
      .filter((item) => item.label)
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
    const items = getSelectionItems()
    const hasSelections = items.length > 0

    selectedPanel.hidden = !hasSelections
    selectedPanel.classList.toggle('app-commodity-search__selected--visible', hasSelections)
    clearAllButton.hidden = !hasSelections

    if (!hasSelections) {
      selectedHeading.textContent = ''
      selectedList.innerHTML = ''
      return
    }

    selectedHeading.textContent = `${items.length} selected`

    selectedList.innerHTML = items.map((item) => `
      <li class="app-commodity-search__selected-item">
        <span class="app-commodity-search__selected-label">${escapeHtml(item.label)}</span>
        <button
          class="app-commodity-search__selected-remove"
          type="button"
          data-selection-value="${escapeHtml(item.value)}"
          aria-label="Remove ${escapeHtml(item.label)}"
        >
          <span class="govuk-visually-hidden">Remove ${escapeHtml(item.label)}</span>
        </button>
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

  function buildCommodityHeaderRow ({ commodity, disabled, labelHtml }) {
    const disabledClass = disabled ? ' app-commodity-search__row--disabled-group' : ''

    return `
      <li class="app-commodity-search__row app-commodity-search__row--commodity-header${disabledClass}">
        <span class="app-commodity-search__row-label app-commodity-search__row-label--heading">${labelHtml}</span>
      </li>
    `
  }

  function buildSpeciesRow ({
    speciesRowIndex,
    commodity,
    disabled,
    checkboxId,
    labelHtml,
    selectionValue,
    isChecked
  }) {
    const altClass = speciesRowIndex % 2 === 1 ? ' app-commodity-search__row--alt' : ''
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
    const groups = getVisibleCommodityGroups(query)
    results.innerHTML = ''

    if (!query.trim()) {
      closeResults()
      return
    }

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

    const trimmedQuery = query.trim()
    let speciesRowIndex = 0
    let speciesRowCount = 0
    const rowsHtml = []

    groups.forEach(({ commodity, species }) => {
      const disabled = isCommodityDisabled(commodity.id)

      rowsHtml.push(buildCommodityHeaderRow({
        commodity,
        disabled,
        labelHtml: highlightMatch(escapeHtml(formatCommodity(commodity)), trimmedQuery)
      }))

      species.forEach((speciesItem) => {
        const speciesValue = `species:${speciesItem.id}`
        const optionLabel = formatSpeciesOptionLabel(commodity, speciesItem)

        rowsHtml.push(buildSpeciesRow({
          speciesRowIndex: speciesRowIndex++,
          commodity,
          disabled,
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
    if (input.value.trim()) {
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

    if (input.value.trim()) {
      renderResults(input.value)
      input.focus()
    }
  })

  updateHiddenFields()
  renderSelectedPanel()

  if (input.value.trim()) {
    renderResults(input.value)
  }
}

window.GOVUKPrototypeKit.documentReady(() => {
  document.querySelectorAll('[data-module="app-commodity-search"]').forEach(initCommoditySearch)
})

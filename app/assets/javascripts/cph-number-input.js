//
// CPH number inputs — move focus to the next box when enough digits are entered
// Format: 12/345/6789
//

const CPH_FIELD_MAX_LENGTH = {
  county: 2,
  parish: 3,
  holding: 4
}

function getCphFieldKey (input) {
  const name = input.getAttribute('name') || ''
  const match = name.match(/cphNumber-(county|parish|holding)$/)

  return match ? match[1] : null
}

function digitsOnly (value) {
  return String(value || '').replace(/\D/g, '')
}

function getCphInputs (root) {
  return Array.from(root.querySelectorAll('input.govuk-date-input__input'))
    .filter((input) => getCphFieldKey(input))
}

function initCphNumberInput (root) {
  if (!root || root.dataset.cphNumberInputInitialised === 'true') {
    return
  }

  root.dataset.cphNumberInputInitialised = 'true'

  const inputs = getCphInputs(root)

  inputs.forEach((input, index) => {
    const fieldKey = getCphFieldKey(input)
    const maxLength = CPH_FIELD_MAX_LENGTH[fieldKey]

    if (!maxLength) {
      return
    }

    input.setAttribute('maxlength', String(maxLength))
    input.setAttribute('inputmode', 'numeric')
    input.setAttribute('pattern', '[0-9]*')
    input.setAttribute('autocomplete', 'off')

    input.addEventListener('input', () => {
      const cleaned = digitsOnly(input.value).slice(0, maxLength)
      input.value = cleaned

      if (cleaned.length >= maxLength && index < inputs.length - 1) {
        inputs[index + 1].focus()
        inputs[index + 1].select()
      }
    })

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Backspace') {
        return
      }

      if (input.value.length === 0 && index > 0) {
        event.preventDefault()
        inputs[index - 1].focus()
        const previous = inputs[index - 1]
        previous.value = digitsOnly(previous.value).slice(0, -1)
        previous.setSelectionRange(previous.value.length, previous.value.length)
      }
    })

    input.addEventListener('paste', (event) => {
      const pasted = digitsOnly(event.clipboardData && event.clipboardData.getData('text'))

      if (!pasted) {
        return
      }

      event.preventDefault()

      let remaining = pasted
      let lastFilledIndex = index

      for (let i = index; i < inputs.length && remaining.length; i += 1) {
        const nextInput = inputs[i]
        const nextMax = CPH_FIELD_MAX_LENGTH[getCphFieldKey(nextInput)]
        nextInput.value = remaining.slice(0, nextMax)
        remaining = remaining.slice(nextMax)
        lastFilledIndex = i
      }

      const focusIndex = lastFilledIndex < inputs.length - 1 &&
        inputs[lastFilledIndex].value.length >= CPH_FIELD_MAX_LENGTH[getCphFieldKey(inputs[lastFilledIndex])]
        ? lastFilledIndex + 1
        : lastFilledIndex

      inputs[focusIndex].focus()
    })
  })
}

document.querySelectorAll('[data-module="app-cph-number-input"]').forEach(initCphNumberInput)

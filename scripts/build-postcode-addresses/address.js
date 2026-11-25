// How Companies House registered office rows at one postcode become the list
// of distinct premises the lookup shows.
//
// Two steps:
//
// 1. recordSignature(row, postcode), while the CSV streams. It removes what
//    belongs to the row rather than the premises (its own company number, its
//    own postcode, a PO box field that holds either) and returns one string.
//    Rows with the same signature are counted together, so memory follows the
//    number of distinct addresses, not rows. The company name is kept in the
//    signature only when it might be written in the address lines.
//
// 2. groupPostcode(records), once every row for a postcode has been read. It
//    applies the matching rules (R01 to R24 in the README) to build a
//    comparison key per record, merges records with equal keys, and picks the
//    most common tidied variant as the text to show.
//
// Every rule works inside one postcode, so nothing merges across postcodes.
// Care-of and country never enter the key. A post town or county part enters
// it only when it holds a number, a flat or unit id, a floor or a PO box,
// because then it is really an address line.

const ADDRESS_FIELDS = [
  'RegAddress.POBox',
  'RegAddress.AddressLine1',
  'RegAddress.AddressLine2',
  'RegAddress.PostTown',
  'RegAddress.County'
]

const SEPARATOR = '\u0001'

const LEGAL_SUFFIXES = new Set(['ltd', 'llp', 'plc', 'cic'])
const FIRM_SUFFIXES = new Set(['ltd', 'llp', 'plc', 'cyf', 'cyfyngedig'])
const DESIGNATORS = new Set([
  'flat', 'apartment', 'unit', 'suite', 'office', 'room', 'studio', 'block',
  'dept', 'desk', 'mailbox', 'bay', 'plot', 'workshop'
])
const DESIGNATOR_SPELLINGS = new Set([...DESIGNATORS, 'apt', 'flt', 'ste', 'wing'])
// Designators that never name anything else, so they count mid-part (R18(d)).
const STRONG_DESIGNATORS = new Set(['flat', 'apartment', 'unit', 'suite'])
const FLOOR_WORDS = new Set(['floor', 'flr', 'ground', 'basement', 'mezzanine'])
const COMPASS = new Set(['north', 'south', 'east', 'west'])
const STREET_TYPES = new Set([
  'road', 'street', 'lane', 'avenue', 'place', 'square', 'way', 'hill', 'park',
  'court', 'close', 'crescent', 'drive', 'terrace', 'wynd', 'gardens', 'row'
])
const PLACE_BUILDING_WORDS = new Set([
  'house', 'hall', 'centre', 'chambers', 'tower', 'cottage', 'barn', 'steading',
  'lodge', 'mill', 'farm', 'building', 'block'
])
const FIRM_BUILDING_WORDS = new Set([
  'house', 'court', 'centre', 'building', 'hall', 'mill', 'works', 'chambers', 'lodge', 'farm'
])
const RUN_BUILDING_WORDS = new Set([
  'house', 'court', 'building', 'works', 'mill', 'lodge', 'chambers', 'point', 'barn', 'hall', 'studios'
])
const RUN_COMPANY_WORDS = new Set(['ltd', 'limited', 'plc', 'llp', 'accountant', 'accountants', '&', 'c/o'])
const SITE_QUALIFIERS = new Set([
  'industrial', 'trading', 'business', 'enterprise', 'retail', 'trade', 'science', 'technology'
])
const SITE_PHRASES = new Set([
  'industrial estate', 'industrial estates', 'trading estate', 'trading estates',
  'business estate', 'business estates', 'industrial park', 'business park',
  'trade park', 'enterprise park'
])
const ORDINALS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12
}
const CARDINALS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
}
// Words that name a building, used to keep a building named inside a care-of
// part ("C/O SAFFERY TORRIDON HOUSE").
const CARE_OF_BUILDING_WORDS = new Set([
  'house', 'court', 'grange', 'manor', 'hall', 'building', 'buildings', 'centre', 'chambers',
  'tower', 'lodge', 'mill', 'mills', 'works', 'barn', 'cottage', 'cottages', 'mews', 'wharf', 'studios',
  'exchange', 'pavilion', 'chapel', 'station', 'farmhouse'
])
// Words that end or join a firm's name.
const FIRM_WORDS = new Set([
  'ltd', 'limited', 'llp', 'plc', 'lp', 'llc', 'inc', 'accountants', 'accountancy', 'solicitors',
  'partners', 'associates', '&', 'and', 'co', 'cyf', 'cyfyngedig', 'son', 'sons', 'services'
])
// Legal suffixes that end a firm's name inside a care-of part (R08(b)).
const CARE_OF_SUFFIXES = new Set(['ltd', 'limited', 'llp', 'plc'])
// Words that end a premises name, so a company stem ending in one is the
// premises, not the company (R09): "THE LAURIE ARMS".
const PREMISES_WORDS = new Set([
  'arms', 'inn', 'hotel', 'tavern', 'school', 'rectory', 'vicarage', 'station', 'chapel', 'church',
  'surgery', 'bakehouse', 'mills'
])
const COUNTRY_PARTS = new Set([
  'england', 'uk', 'u k', 'united kingdom', 'gb', 'gbr', 'great britain', 'britain',
  'wales', 'cymru', 'cymru/wales', 'cymru / wales', 'scotland', 'northern ireland',
  'n ireland', 'gb-eng', 'gb-wls', 'gb-sct', 'gb-nir', 'england uk', 'uk england',
  'england united kingdom', 'united kindom', 'united kingom', 'royaume uni'
])
// Longest first, so "united kingdom" is tried before "kingdom" could be.
const COUNTRY_TAILS = [...COUNTRY_PARTS].filter((c) => !c.includes('/')).sort((a, b) => b.length - a.length)
const PLACEHOLDER = /^(n ?\/ ?a|na|none|null|nil|yes|not applicable|tbc|tba|-*\s*(please )?select( state| county| a county)?\s*-*|choose county|county( optional)?|state|type a choice below.*|x+)$/

const STREET_ABBREVIATIONS = {
  rd: 'road', st: 'street', ave: 'avenue', av: 'avenue', ln: 'lane', dr: 'drive',
  cl: 'close', cres: 'crescent', cresc: 'crescent', pl: 'place', sq: 'square',
  ter: 'terrace', terr: 'terrace', tce: 'terrace', gdns: 'gardens', ct: 'court'
}
const ANYWHERE_ABBREVIATIONS = {
  apt: 'apartment', flt: 'flat', ste: 'suite', hse: 'house', bldg: 'building', flr: 'floor'
}

const HOUSE_NUMBER = /^\d+[a-z]?(-\d+[a-z]?)?$/
const PROTECTED_ID = /^(\d+\/\d+|(\d+|p|g|b)f\d+|\d+\/f)$/
const CARE_OF = '(c\\s*[/\\\\]\\s*[o0]|c\\.o\\.|co/|care of|at the offices of)'
// The marker may sit in a bracket and be followed by ".", ":", "-" or "/".
const CARE_OF_START = new RegExp(`^\\(?${CARE_OF}(?:[.:;\\-/]+\\s*|\\s+|$)`, 'i')
const CARE_OF_MID = new RegExp(`[\\s(]${CARE_OF}(?:[.:;\\-/]+\\s*|\\s+|$)`, 'i')

// A cheap test that a text may end in a legal suffix, before normalising it.
const MAY_END_IN_SUFFIX = /(ltd|limited|l\.?\s*l\.?\s*p|p\.?\s*l\.?\s*c|cic|cyf|cyfyngedig)[\s.)]*$/i
const MAY_HOLD_SUFFIX = /(ltd|limited|l\.?\s*l\.?\s*p|p\.?\s*l\.?\s*c|cic)/i

// Normalising is pure and the same few texts ("LONDON", a busy street) come up
// again and again, so results are cached. The cache is emptied when it grows
// large, which changes speed only, never output.
const CACHE_LIMIT = 200000
function cached (fn) {
  const cache = new Map()
  return (text) => {
    let value = cache.get(text)
    if (value === undefined) {
      if (cache.size >= CACHE_LIMIT) cache.clear()
      value = fn(text)
      cache.set(text, value)
    }
    return value
  }
}

function tidy (value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ')
}

function escapeRegExp (text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const PO_BOX_PREFIX = /^p\.?\s*o\.?\s*box\b/i

// A PO box field that holds a box number, as opposed to "SUITE 11" or "YES".
function isBoxNumber (value) {
  if (PO_BOX_PREFIX.test(value)) return true
  const match = /^([a-z]{0,3})\s*\d+[a-z]?$/i.exec(value)
  return Boolean(match) && !DESIGNATOR_SPELLINGS.has(match[1].toLowerCase())
}

// R11: "PO Box" goes in front of a box number only. Any other PO box field
// value is read as an address line.
function poBoxLine (value) {
  if (!value) return ''
  if (PO_BOX_PREFIX.test(value) || !isBoxNumber(value)) return value
  return `PO Box ${value}`
}

// ---------------------------------------------------------------------------
// Step 1: one signature per row
// ---------------------------------------------------------------------------

// R04: the row's own company number, with a separator next to it. Real
// company numbers are 8 characters; anything shorter is left alone.
function removeOwnNumber (text, number) {
  if (!text || !/^[a-z0-9]{8}$/i.test(number)) return text
  if (!text.toUpperCase().includes(number.toUpperCase())) return text
  const n = escapeRegExp(number)
  const separator = '(?:\\s*[-:,]\\s*|\\s+)'
  return tidy(text
    .replace(new RegExp(`^${n}(?:${separator}|$)`, 'i'), '')
    .replace(new RegExp(`${separator}${n}(?=$|[\\s,])`, 'gi'), ''))
}

// R05: the row's own postcode, spaced or not, with a trailing "." or ",".
function removeOwnPostcode (text, postcode) {
  if (!text || !postcode) return text
  if (!text.toUpperCase().includes(postcode.slice(-3))) return text
  const outward = escapeRegExp(postcode.slice(0, -3))
  const inward = escapeRegExp(postcode.slice(-3))
  const removed = text.replace(new RegExp(`(^|[^a-z0-9])${outward}\\s*${inward}(?![a-z0-9])[.,]?`, 'gi'), '$1')
  // Brackets the postcode sat in go with it: "LONDON (W1W 5PF) OFFICE".
  return tidy(removed === text ? text : removed.replace(/\(\s*\)/g, ' '))
}

function compact (text) {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// Returns null when nothing places a premises: no PO box and no first line.
function recordSignature (row, postcode) {
  const [rawPoBox, rawLine1, rawLine2, rawTown, county] = ADDRESS_FIELDS.map((field) => tidy(row[field]))
  if (!rawPoBox && !rawLine1) return null

  const number = tidy(row.CompanyNumber)
  let poBox = rawPoBox
  const boxValue = compact(poBox.replace(/^p\.?\s*o\.?\s*box/i, ''))
  if (boxValue && (boxValue === compact(number) || boxValue === postcode)) poBox = ''

  const clean = (text) => removeOwnPostcode(removeOwnNumber(text, number), postcode)
  poBox = clean(poBox)
  const line1 = clean(rawLine1)
  const line2 = clean(rawLine2)
  const town = clean(rawTown)
  const cleanCounty = removeOwnPostcode(county, postcode)

  if (!poBox && !line1 && !line2) return null

  // The name matters only when it may be written in a line (R09).
  let name = ''
  const companyName = tidy(row.CompanyName)
  const nameTokens = MAY_END_IN_SUFFIX.test(companyName) ? normaliseName(companyName) : []
  if (LEGAL_SUFFIXES.has(nameTokens[nameTokens.length - 1])) {
    const stem = compact(nameTokens.slice(0, -1).join(' '))
    if (stem && compact(`${line1} ${line2}`).includes(stem)) name = companyName
  }

  return [poBox, line1, line2, town, cleanCounty, name].join(SEPARATOR)
}

function decodeRecord (signature, count) {
  const fields = signature.split(SEPARATOR)
  return { fields: fields.slice(0, 5), name: fields[5] || '', count }
}

// ---------------------------------------------------------------------------
// Text normalisation for keys
// ---------------------------------------------------------------------------

// R02 and R03: character-level only.
const normaliseBasic = cached(normaliseBasicUncached)
function normaliseBasicUncached (text) {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/["“”()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s.,\-/;:!?*_~|\\]+|[\s.,\-/;:!?*_~|\\]+$/g, '')
}

// R07 and R11, on a normalised part.
const normalisePunctuation = cached(normalisePunctuationUncached)
function normalisePunctuationUncached (basic) {
  const text = basic
    .replace(/\.(?!\d)|(?<!\d)\./g, ' ')
    .replace(/[;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(\d[a-z]?) *([-/]) *(?=\d)/g, '$1$2')
    .replace(/\b(\d+) to (\d+)\b/g, (match, from, to) => (Number(from) < Number(to) ? `${from}-${to}` : match))
    .replace(/([a-z])-(?=[a-z])/g, '$1 ')
    .split(' ')
    .map((token) => token.replace(/^[,\-/!?*_~|\\]+|[,\-/!?*_~|\\]+$/g, ''))
    .filter((token) => /[a-z0-9#&]/.test(token))
    .join(' ')

  return text.replace(/^(p ?o ?box|pobox|post office box) ?(?:(?:no|number) )?(\S+)/, 'po box $2')
}

// R12, R13 and R14 on the tokens of one part.
function normaliseTokens (text) {
  let tokens = text ? text.split(' ') : []

  // R12(c), and "UNITS 2-5" is "UNIT 2-5".
  tokens = tokens.map((token, i) =>
    (token === 'units' && /\d/.test(tokens[i + 1] || '') ? 'unit' : ANYWHERE_ABBREVIATIONS[token] || token))

  // R12(b): saint at the start of a part or after a house number.
  tokens = tokens.map((token, i) =>
    (token === 'st' || token === 'saint') && (i === 0 || HOUSE_NUMBER.test(tokens[i - 1])) ? 'saint' : token)

  // R12(a): street types, last token, before a final compass word, or before
  // a number that starts the address again ("167-169 GREAT PORTLAND ST 167-169").
  const last = tokens.length - 1
  const positions = [last]
  if (last > 0 && COMPASS.has(tokens[last])) positions.push(last - 1)
  for (let i = 1; i < last; i += 1) if (/^\d/.test(tokens[i + 1])) positions.push(i)
  for (const i of positions) {
    const full = STREET_ABBREVIATIONS[tokens[i]]
    if (full && i > 0 && /^[a-z]+$/.test(tokens[i - 1])) tokens[i] = full
  }

  // R12(d): estate words, only in context.
  tokens = tokens.map((token, i) => {
    const next = tokens[i + 1]
    if (token === 'ind' && ['est', 'estate', 'park', 'pk'].includes(next)) return 'industrial'
    if (token === 'trad' && ['est', 'estate'].includes(next)) return 'trading'
    if (token === 'bus' && ['pk', 'park', 'centre', 'ctr', 'center', 'cent'].includes(next)) return 'business'
    if (token === 'ent' && ['park', 'pk', 'centre'].includes(next)) return 'enterprise'
    return token
  })
  tokens = tokens.map((token, i) => {
    const previous = tokens[i - 1]
    if (token === 'est' && ['industrial', 'trading'].includes(previous)) return 'estate'
    if (token === 'pk' && ['business', 'industrial', 'retail', 'enterprise', 'trade', 'science', 'technology'].includes(previous)) return 'park'
    if ((token === 'ctr' || token === 'center' || token === 'cent') && ['business', 'enterprise', 'trade'].includes(previous)) return 'centre'
    return token
  })

  // R12(e) and R13 on the joined text.
  const joined = tokens.join(' ')
    .replace(/\bfarm house\b/g, 'farmhouse')
    .replace(/\blower ground floor\b/g, 'floor:lg')
    .replace(/\bupper ground floor\b/g, 'floor:ug')
    .replace(/\bground floor\b/g, 'floor:0')
    .replace(/\b0*(\d+)(?:st|nd|rd|th) floor\b/g, 'floor:$1')
    .replace(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) floor\b/g,
      (match, word) => `floor:${ORDINALS[word]}`)
    .replace(/\btop floor\b/g, 'floor:top')
    .replace(/\battic floor\b/g, 'floor:attic')
    .replace(/\bfloor 0*(\d+)\b/g, 'floor:$1')
    .replace(/\blevel 0*(\d+)\b/g, 'level:$1')
    .replace(/\blevel (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g,
      (match, word) => `level:${CARDINALS[word]}`)
    .replace(/\bbasement\b/g, 'floor:b')
    .replace(/\bmezzanine\b/g, 'floor:m')

  // R14: a number and a single letter are one id.
  tokens = joined ? joined.split(' ') : []
  tokens = tokens.map((token) => (!PROTECTED_ID.test(token) && /^\d+[-/][a-z]$/.test(token) ? token.replace(/[-/]/, '') : token))
  const out = []
  for (let i = 0; i < tokens.length; i += 1) {
    if (/^\d+$/.test(tokens[i]) && /^[a-z]$/.test(tokens[i + 1] || '')) {
      out.push(tokens[i] + tokens[i + 1])
      i += 1
    } else {
      out.push(tokens[i])
    }
  }
  return out
}

// Key tokens of a part from its R02/R03 text. A fresh array each call,
// because later rules edit it.
const tokensFromBasicCached = cached((basic) => normaliseTokens(normalisePunctuation(basic)))
function tokensFromBasic (basic) {
  return tokensFromBasicCached(basic).slice()
}

function keyTokensOf (text) {
  return tokensFromBasic(normaliseBasic(text))
}

// R09: a company name, normalised and with one spelling per legal suffix.
// Callers must not edit the array.
const normaliseName = cached(normaliseNameUncached)
function normaliseNameUncached (text) {
  const tokens = normalisePunctuation(normaliseBasic(text)).split(' ').filter(Boolean)
  const out = []
  for (let i = 0; i < tokens.length; i += 1) {
    const three = tokens.slice(i, i + 3).join(' ')
    if (three === 'l l p') {
      out.push('llp')
      i += 2
    } else if (three === 'p l c') {
      out.push('plc')
      i += 2
    } else {
      out.push(tokens[i] === 'limited' ? 'ltd' : tokens[i])
    }
  }
  return out
}

// A floor or a level ("LEVEL 1" and "LEVEL ONE" are one level, never a floor).
function isFloor (token) {
  return token.startsWith('floor:') || token.startsWith('level:')
}

function isId (token) {
  return Boolean(token) && !isFloor(token) && (/\d/.test(token) || /^[a-z]$/.test(token))
}

function stripZeros (id) {
  return /^\d+[a-z]?$/.test(id) && /[1-9]/.test(id) ? id.replace(/^0+/, '') : id
}

// A part "holds an identifier": a digit, a designator, a floor or a PO box.
function textHoldsId (text) {
  if (/\d/.test(text)) return true
  const words = text.toLowerCase().split(/[^a-z#]+/)
  // "EAST BAY" is a place; "BAY C" is a bay.
  return words.some((word, i) =>
    (DESIGNATOR_SPELLINGS.has(word) && (word !== 'bay' || (words[i + 1] || '').length === 1)) ||
    FLOOR_WORDS.has(word) || word.startsWith('#') ||
    (word === 'po' && words[i + 1] === 'box'))
}

function tokensHoldId (tokens) {
  return tokens.some((token, i) =>
    /\d/.test(token) || isFloor(token) || DESIGNATORS.has(token) || token.startsWith('#') ||
    (token === 'po' && tokens[i + 1] === 'box'))
}

// R01: a post town or county part that is really an address line. Stricter
// than textHoldsId, so "COLWYN BAY" stays a town: a designator counts only
// with an id after it ("UNIT 5", "SUITE E", "STUDIO N").
function placePartHoldsId (text) {
  const tokens = keyTokensOf(text)
  return tokens.some((token, i) =>
    /\d/.test(token) || isFloor(token) || token.startsWith('#') ||
    (token === 'po' && tokens[i + 1] === 'box') ||
    (DESIGNATORS.has(token) && i + 1 < tokens.length && isId(tokens[i + 1])))
}

// ---------------------------------------------------------------------------
// Step 2a: the parts a record's display and key are built from
// ---------------------------------------------------------------------------

function isKeyPart (part) {
  return part.field === 'po' || part.field === 'line' || part.field === 'townline' || part.field === 'countyline'
}

function isLinePart (part) {
  return part.field === 'line' || part.field === 'townline' || part.field === 'countyline'
}

function setRaw (part, raw) {
  part.raw = tidy(raw)
  part.basic = normaliseBasic(part.raw)
  if (!/[a-z0-9]/.test(part.basic)) part.drop = true
}

function cutPointOfCareOf (tokens) {
  const words = tokens.map((token) => token.toLowerCase().replace(/^[^a-z0-9#]+|[^a-z0-9]+$/g, ''))
  return words.findIndex((word, i) => {
    const next = words[i + 1]
    return /\d/.test(word) || DESIGNATOR_SPELLINGS.has(word) || FLOOR_WORDS.has(word) ||
      word.startsWith('#') ||
      ((ORDINALS[word] || /^\d+(st|nd|rd|th)$/.test(word)) && (next === 'floor' || next === 'flr')) ||
      ((word === 'lower' || word === 'upper') && next === 'ground') ||
      (word === 'level' && next !== undefined && (/^\d/.test(next) || CARDINALS[next] !== undefined)) ||
      (word === 'po' && next === 'box')
  })
}

// R08: where a building named inside a care-of part starts, or -1. The name
// is the first building word with the word before it ("TORRIDON HOUSE"), or
// everything after the C/O marker when the name follows it straight away
// ("C/O MURRAY HOUSE"). A firm word before the name ends the firm
// ("C/O CARSON MCDOWELL LLP MURRAY HOUSE"). A firm word after the building
// word means the building word is part of a firm ("CLEAR HOUSE ACCOUNTANTS").
// A building word before a street type names the street ("STATION ROAD").
// Building words in a row are one name ("STREETS LLP TOWER HOUSE"), and
// "C/O THE OLD POLICE STATION" names the building from "THE".
function buildingStartOfCareOf (tokens) {
  const words = tokens.map((token) => token.toLowerCase().replace(/^[^a-z0-9&]+|[^a-z0-9&]+$/g, ''))
  let b = words.findIndex((word, i) => i > 0 && CARE_OF_BUILDING_WORDS.has(word) && !STREET_TYPES.has(words[i + 1]))
  if (b < 0) return -1
  while (CARE_OF_BUILDING_WORDS.has(words[b + 1]) && !STREET_TYPES.has(words[b + 2])) b += 1
  if (words.slice(b + 1).some((word) => FIRM_WORDS.has(word))) return -1
  let lastFirm = -1
  for (let i = 0; i < b; i += 1) if (FIRM_WORDS.has(words[i])) lastFirm = i
  if (lastFirm === b - 1) return -1
  if (lastFirm < 0 && words[0] === 'the' && b <= 3) return 0
  let start = lastFirm >= 0 ? lastFirm + 1 : (b === 1 ? 0 : b - 1)
  // "BADDILEY LANE FARMHOUSE": a name that starts on a street word starts
  // one word earlier.
  if (start > lastFirm + 1 && STREET_TYPES.has(words[start])) start -= 1
  if (start > 0 && words[start - 1] === 'the' && start - 1 > lastFirm) start -= 1
  return start
}

function careWordsOf (tokens) {
  return tokens.map((token) => token.toLowerCase().replace(/^[^a-z0-9&#]+|[^a-z0-9&]+$/g, ''))
}

// R08(b): where the premises starts after a firm's legal suffix, or -1:
// "C/O IAA UK AUCTIONS LIMITED BENTLEY MOOR LANE", "C/O GRINDCO 427 LTD UNIT 62".
// The firm's name must hold no designator, floor, street or building word,
// so a suffix never cuts an address away. A firm that ends the part is all
// care-of ("C/O GRINDCO 427 LTD"), so nothing is kept.
function firmEndOfCareOf (tokens) {
  const words = careWordsOf(tokens)
  let end = -1
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]
    if (DESIGNATOR_SPELLINGS.has(word) || FLOOR_WORDS.has(word) || STREET_TYPES.has(word) ||
      CARE_OF_BUILDING_WORDS.has(word) || word.startsWith('#') || (word === 'po' && words[i + 1] === 'box')) break
    if (i > 0 && CARE_OF_SUFFIXES.has(word)) end = i + 1
  }
  // "C/O NSI GROUP LTD BUILDING" is the firm's building, not a premises name.
  const rest = words.slice(end)
  if (end >= 0 && rest.length === 1 && CARE_OF_BUILDING_WORDS.has(rest[0])) return -1
  return end
}

// R08(c): a care-of part with nothing kept that ends in a street keeps the
// street, so two firms on two streets never become one bare locality:
// "C/O FENWICKS HAULAGE WELLSYKE ROAD" keeps "WELLSYKE ROAD". It keeps the
// last 2 words ("BUSINESS PARK" takes 3); groupPostcode lengthens it to a
// line another row at the postcode writes ("BENTLEY MOOR LANE").
function streetTailOfCareOf (tokens) {
  const words = careWordsOf(tokens)
  const n = words.length
  if (n < 3 || !STREET_TYPES.has(words[n - 1])) return ''
  let length = SITE_QUALIFIERS.has(words[n - 2]) ? 3 : 2
  // "BOUNDARY LANE ENTERPRISE PARK": the tail starts on a name, not a street word.
  while (length < n && STREET_TYPES.has(words[n - length])) length += 1
  const name = words.slice(n - length, n - 1)
  if (n <= length || name.some((word) => !/^[a-z]+$/.test(word) || FIRM_WORDS.has(word))) return ''
  return tokens.slice(n - length).join(' ')
}

// R08(c): the longest tail of the care-of words that another row at the
// postcode writes as a line.
function lengthenStreetTails (prepared) {
  const tails = prepared.flatMap((entry) => entry.parts.filter((part) => !part.drop && part.careWords))
  if (tails.length === 0) return
  const lines = new Set()
  for (const entry of prepared) {
    for (const part of entry.parts) {
      if (!part.drop && !part.careWords && isLinePart(part)) lines.add(normalisePunctuation(part.basic))
    }
  }
  for (const part of tails) {
    const words = part.careWords
    const shortest = part.raw.split(' ').length
    for (let length = words.length - 1; length > shortest; length -= 1) {
      const text = words.slice(words.length - length).join(' ')
      if (lines.has(normalisePunctuation(normaliseBasic(text)))) {
        setRaw(part, text)
        break
      }
    }
  }
}

// R01, R03, R06 and R08, and finds the R09 candidate.
function prepareRecord (record) {
  const [poBox, line1, line2, town, county] = record.fields
  const parts = []
  const add = (field, text) => {
    for (const piece of text.split(',')) {
      const part = { field, raw: '', basic: '', drop: false }
      setRaw(part, piece)
      if (!part.drop) parts.push(part)
    }
  }

  if (poBox) {
    if (isBoxNumber(poBox)) add('po', poBoxLine(poBox).replace(/,/g, ' '))
    else add('line', poBox)
  }
  add('line', line1)
  add('line', line2)
  // R01: a town or county part with an id in it is an address line.
  for (const piece of town.split(',')) add(placePartHoldsId(piece) ? 'townline' : 'town', piece)
  for (const piece of county.split(',')) add(placePartHoldsId(piece) ? 'countyline' : 'county', piece)

  // R06
  const townBasic = normaliseBasic(town)
  const hasTown = parts.some((part) => part.field === 'town')
  for (const part of parts) {
    const plain = part.basic.replace(/\./g, '').replace(/\s+/g, ' ').trim()
    // "WALES" written as a line before a post town is the village of Wales
    // (S26): it is shown but never compared.
    if (plain === 'wales' && part.field === 'line' && hasTown) {
      part.field = 'locality'
      continue
    }
    if (COUNTRY_PARTS.has(plain) || PLACEHOLDER.test(plain)) {
      part.drop = true
      continue
    }
    if (!townBasic) continue
    for (const country of COUNTRY_TAILS) {
      if (!plain.endsWith(` ${country}`)) continue
      const before = plain.slice(0, -country.length - 1).trim()
      if (before === townBasic || before.endsWith(` ${townBasic}`)) {
        const words = part.raw.split(' ')
        setRaw(part, words.slice(0, words.length - country.split(' ').length).join(' '))
      }
      break
    }
  }

  const live = () => parts.filter((part) => !part.drop)
  const otherKeyPartRemains = (self) => live().some((part) => part !== self && isKeyPart(part))

  // R08
  // The cut keeps a building named in the care-of text, and the first number,
  // designator or floor, whichever comes first.
  const keptStart = (tokens) => {
    const suffix = firmEndOfCareOf(tokens)
    if (suffix >= 0) return suffix
    const cut = cutPointOfCareOf(tokens)
    const building = buildingStartOfCareOf(cut >= 0 ? tokens.slice(0, cut) : tokens)
    return building >= 0 ? building : cut
  }
  // "CENTRE-OFFICE 10" is "CENTRE - OFFICE 10", so the cut sees the office.
  const careTokens = (care) => care
    .replace(/([a-z])-(?=(?:unit|suite|office|flat|apartment|room|studio)\b)/gi, '$1 - ')
    .split(' ')
    .filter(Boolean)
  // A care-of in brackets ends at the closing bracket: "(C/O TAG TAX)".
  const splitBracket = (marker, text) => {
    const close = text.indexOf(')')
    if (!marker.includes('(') || close < 0) return { care: text, after: '' }
    return { care: text.slice(0, close), after: text.slice(close + 1).trim() }
  }
  for (const part of live()) {
    if (!isLinePart(part)) continue
    const start = CARE_OF_START.exec(part.raw)
    if (start) {
      const { care, after } = splitBracket(start[0], part.raw.slice(start[0].length))
      const tokens = careTokens(care)
      const kept = keptStart(tokens)
      const keptText = kept >= 0 ? tokens.slice(kept).join(' ') : ''
      const tail = keptText || after ? '' : streetTailOfCareOf(tokens)
      if (keptText || after) setRaw(part, [keptText, after].filter(Boolean).join(' '))
      else if (tail) {
        setRaw(part, tail)
        part.careWords = tokens
      } else if (otherKeyPartRemains(part)) part.drop = true
      else setRaw(part, care)
      continue
    }
    // A marker mid-part cuts to the end of the part, or to the first number,
    // designator or floor after it, so no identifier is ever cut away.
    const middle = CARE_OF_MID.exec(part.raw)
    if (middle) {
      const { care, after } = splitBracket(middle[0], part.raw.slice(middle.index + middle[0].length))
      const tokens = careTokens(care)
      const kept = keptStart(tokens)
      const keptText = kept >= 0 ? tokens.slice(kept).join(' ') : ''
      let before = part.raw.slice(0, middle.index).trim()
      // "24 C/O AGS, 24 BLACKBERRY WAY": the number before the marker is the
      // house number written again after it.
      if (/^\d+[a-z]?$/i.test(before)) {
        const rest = [keptText, after].filter(Boolean).join(' ') ||
          (live().find((other) => other !== part && isLinePart(other) && parts.indexOf(other) > parts.indexOf(part)) || { raw: '' }).raw
        if (rest.split(' ')[0].toLowerCase() === before.toLowerCase()) before = ''
      }
      setRaw(part, [before, keptText, after].join(' '))
    }
  }

  // A part that is only a legal suffix is left over from a firm's name:
  // "C/O DP PACKAGING (SPALDING)", "LIMITED, NORTHGATE".
  for (const part of live()) {
    if (isLinePart(part) && CARE_OF_SUFFIXES.has(part.basic.replace(/\./g, '').trim())) part.drop = true
  }

  // R09 candidate: the row's own full name, as a whole part or a leading span.
  // The name without its legal suffix ("ABYSS ENGINE" for "ABYSS ENGINE LTD")
  // counts too, unless it ends in a word that names a building or a place.
  let candidate = null
  if (record.name) {
    const nameTokens = normaliseName(record.name)
    const nameText = nameTokens.join(' ')
    const nameLength = nameTokens.length
    const stem = nameTokens.slice(0, -1)
    const stemText = LEGAL_SUFFIXES.has(nameTokens[nameLength - 1]) && stem.length > 0 && isPlainStem(stem)
      ? stem.join(' ')
      : null
    for (const target of [nameText, stemText]) {
      if (target === null || candidate) continue
      const targetLength = target.split(' ').length
      for (const part of live()) {
        if (part.field !== 'line' || candidate) continue
        const words = part.raw.split(' ')
        for (let k = 1; k <= words.length; k += 1) {
          const tokens = normaliseName(words.slice(0, k).join(' '))
          if (tokens.length > targetLength) break
          if (tokens.join(' ') !== target) continue
          const removed = words.slice(0, k).join(' ')
          const rest = words.slice(k).join(' ')
          if (/\d/.test(removed) && !(target === nameText && digitsOnlyInNames(removed))) break
          // The stem must not run on into the suffix ("ZEZT" of "ZEZT LTD").
          if (target === stemText && LEGAL_SUFFIXES.has(normaliseName(words[k] || '')[0])) break
          // A stem must not leave one bare word: "TEMUJIN RESTAURANT".
          if (target === stemText && rest && !rest.includes(' ') && !textHoldsId(rest)) break
          const holdsId = textHoldsId(rest) ||
            live().some((other) => other !== part && isKeyPart(other) && textHoldsId(other.raw))
          if (holdsId) candidate = { part, rest, text: target }
          break
        }
      }
    }
    // R09(f): the full own name, with its suffix, at the end of a part:
    // "124 CITY ROAD METERZ LTD.", "124 C&H BROWN LTD".
    if (!candidate && LEGAL_SUFFIXES.has(nameTokens[nameLength - 1])) {
      for (const part of live()) {
        if (part.field !== 'line' || candidate) continue
        const words = part.raw.split(' ')
        for (let k = words.length - 1; k >= 1; k -= 1) {
          const tokens = normaliseName(words.slice(k).join(' '))
          if (tokens.length > nameLength) break
          if (tokens.join(' ') !== nameText) continue
          const removed = words.slice(k).join(' ')
          const rest = words.slice(0, k).join(' ')
          if (/\d/.test(removed) && !digitsOnlyInNames(removed)) break
          if (textHoldsId(rest)) candidate = { part, rest, text: nameText, trailing: true }
          break
        }
      }
    }
  }

  return { record, parts, candidate }
}

// R09: a name stem that could be the premises itself is never removed.
function isPlainStem (tokens) {
  const last = tokens[tokens.length - 1]
  return !tokens.some((token) => /\d/.test(token) || DESIGNATOR_SPELLINGS.has(token) || FLOOR_WORDS.has(token)) &&
    !STREET_TYPES.has(last) && !PLACE_BUILDING_WORDS.has(last) && !FIRM_BUILDING_WORDS.has(last) &&
    !CARE_OF_BUILDING_WORDS.has(last) && !RUN_BUILDING_WORDS.has(last) && !PREMISES_WORDS.has(last) &&
    !['estate', 'estates', 'park', 'centre', 'farmhouse', 'cottages', 'buildings'].includes(last)
}

// R09(e): a shelf company's number glued to its name ("GRAFTON234 LTD") is
// not a house number, so the name may still be removed.
function digitsOnlyInNames (text) {
  return normaliseName(text).every((token) => !/\d/.test(token) || (/^[a-z]{3,}\d+$/.test(token) &&
    !DESIGNATOR_SPELLINGS.has(token.replace(/\d+$/, ''))))
}

// R09(d): the removed text must not be a line 2 or more other companies write.
function decideOwnNames (prepared) {
  const candidates = prepared.filter((entry) => entry.candidate)
  if (candidates.length === 0) return

  const wanted = new Set(candidates.map((entry) => entry.candidate.text))
  // A stem has no suffix, so lines without one must be counted too.
  const anyStem = [...wanted].some((text) => !LEGAL_SUFFIXES.has(text.split(' ').pop()))
  const lineCounts = new Map()
  const ownCounts = new Map()

  for (const entry of prepared) {
    const seen = new Set()
    for (const part of entry.parts) {
      if (part.drop || part.field !== 'line' || (!anyStem && !MAY_HOLD_SUFFIX.test(part.raw))) continue
      const tokens = normaliseName(part.raw)
      for (let k = 1; k <= tokens.length; k += 1) {
        const prefix = tokens.slice(0, k).join(' ')
        if (wanted.has(prefix)) seen.add(prefix)
        const suffix = tokens.slice(tokens.length - k).join(' ')
        if (wanted.has(suffix)) seen.add(suffix)
      }
    }
    for (const text of seen) lineCounts.set(text, (lineCounts.get(text) || 0) + entry.record.count)
    if (entry.candidate) {
      const text = entry.candidate.text
      ownCounts.set(text, (ownCounts.get(text) || 0) + entry.record.count)
    }
  }

  for (const entry of candidates) {
    const { part, rest, text } = entry.candidate
    const others = (lineCounts.get(text) || 0) - (ownCounts.get(text) || 0)
    if (others >= 2) continue
    if (rest) setRaw(part, rest)
    else part.drop = true
  }
}

// A named building: a building word with a name before it ("TOWER HOUSE"),
// not a lone "BUILDING".
function endsInBuildingWord (text) {
  const words = careWordsOf(text.split(' '))
  return words.length >= 2 && CARE_OF_BUILDING_WORDS.has(words[words.length - 1])
}

// R10: another firm's name written as a line.
function dropOtherFirmParts (parts) {
  for (const part of parts) {
    if (part.drop || part.field !== 'line' || !MAY_END_IN_SUFFIX.test(part.raw)) continue
    const tokens = normaliseName(part.raw)
    if (!FIRM_SUFFIXES.has(tokens[tokens.length - 1])) continue
    if (/\d/.test(part.basic)) continue
    const before = tokens.slice(0, -1)
    if (before.some((token) => DESIGNATOR_SPELLINGS.has(token) || FLOOR_WORDS.has(token) || FIRM_BUILDING_WORDS.has(token))) continue
    const remains = parts.some((other) => other !== part && !other.drop && isKeyPart(other) && textHoldsId(other.raw))
    if (remains) part.drop = true
  }
}

// R10(b): another firm's name at the start of a line, before the premises:
// "DMP ACCOUNTANTS LIMITED THE ORCHARD". The name must end in a legal suffix
// and hold no number, designator, floor, building or street word.
function stripFirmPrefixes (parts) {
  for (const part of parts) {
    if (part.drop || part.field !== 'line' || !MAY_HOLD_SUFFIX.test(part.raw)) continue
    const words = part.raw.split(' ')
    const k = words.findIndex((word, i) => i > 0 && FIRM_SUFFIXES.has(normaliseName(word).join(' ')))
    if (k < 0 || k === words.length - 1) continue
    const span = normaliseName(words.slice(0, k).join(' '))
    if (span.some((token) => /\d/.test(token) || DESIGNATOR_SPELLINGS.has(token) || FLOOR_WORDS.has(token) ||
      FIRM_BUILDING_WORDS.has(token) || CARE_OF_BUILDING_WORDS.has(token) || STREET_TYPES.has(token))) continue
    const rest = words.slice(k + 1).join(' ')
    if (!/[a-z]/i.test(rest)) continue
    // A named building after the firm is the premises: "STREETS LLP TOWER HOUSE".
    const holdsId = textHoldsId(rest) || endsInBuildingWord(rest) ||
      parts.some((other) => other !== part && !other.drop && isKeyPart(other) && textHoldsId(other.raw))
    if (holdsId) setRaw(part, rest)
  }
}

// ---------------------------------------------------------------------------
// Step 2b: the display variant
// ---------------------------------------------------------------------------

function wordKey (word) {
  return word.toLowerCase().replace(/[^a-z0-9\-/]/g, '').replace(/^[-/]+|[-/]+$/g, '')
}

// A run of 2 or more words written twice in a row: "EUROLINK BUSINESS CENTRE
// EUROLINK BUSINESS CENTRE", "167 169 167 169". A doubled single bare number
// is left alone.
function dropDoubledRun (words) {
  const keys = words.map(wordKey)
  for (let length = Math.floor(words.length / 2); length >= 2; length -= 1) {
    for (let i = 0; i + 2 * length <= words.length; i += 1) {
      let same = true
      for (let j = 0; j < length && same; j += 1) same = keys[i + j] !== '' && keys[i + j] === keys[i + length + j]
      if (!same || !keys.slice(i, i + length).some((key) => /[a-z0-9]/.test(key))) continue
      return dropDoubledRun([...words.slice(0, i + length), ...words.slice(i + 2 * length)])
    }
  }
  return words
}

// Tidies one part for display: stray quotes and edge punctuation, spacing
// round a number range or slash, and a doubled run of words.
function displayPart (raw) {
  let text = raw.replace(/["“”]|''/g, ' ')
  const quote = /^['‘’`]/.exec(text)
  if (quote) text = text.slice(1).replace(/['‘’`](?=\s|$)/, '')
  text = tidy(text)
    .replace(/^[\s.,\-/\\;:!?*_~|]+|[\s,\-/\\;:!?*_~|]+$/g, '')
    .replace(/(\d) *([-/]) *(?=\d)/g, '$1$2')
  return dropDoubledRun(text.split(' ')).join(' ')
}

// A part held in a longer one, unless the longer one names a building after
// it: "BERKELEY SQUARE" is a street, "BERKELEY SQUARE HOUSE" the building on it.
function containsWords (haystack, needle) {
  if (needle.length < 2 || haystack.length <= needle.length || !needle.some((word) => /[a-z]/.test(word))) return false
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    if (!needle.every((word, j) => haystack[i + j] === word)) continue
    const next = haystack[i + needle.length]
    if (!(CARE_OF_BUILDING_WORDS.has(next) || PLACE_BUILDING_WORDS.has(next))) return true
  }
  return false
}

// R03 and R15 for the shown text: a part written twice, or written again
// after a longer part that holds it whole ("SUITE 23 E SANDRINGHAM ROAD,
// 23 E SANDRINGHAM ROAD"), shows once.
function displayOf (parts) {
  const seen = new Set()
  const shown = []
  for (const part of parts) {
    if (part.drop) continue
    const comparable = normalisePunctuation(part.basic)
    if (seen.has(comparable)) continue
    seen.add(comparable)
    const text = displayPart(part.raw)
    if (text) shown.push(text)
  }
  const words = shown.map((text) => text.split(' ').map(wordKey).filter(Boolean))
  return shown
    .filter((text, i) => !words.some((other, j) => j < i && containsWords(other, words[i])))
    .join(', ')
}

// ---------------------------------------------------------------------------
// Step 2c: the comparison key
// ---------------------------------------------------------------------------

function containsInOrder (haystack, needle) {
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    let match = true
    for (let j = 0; j < needle.length && match; j += 1) match = haystack[i + j] === needle[j]
    if (match) return true
  }
  return false
}

// R15: a run of 1 to 4 tokens written twice in a row.
function collapseRepeats (tokens) {
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < tokens.length && !changed; i += 1) {
      if (i > 0 && (DESIGNATORS.has(tokens[i - 1]) || isFloor(tokens[i - 1]))) continue
      for (let length = 4; length >= 1 && !changed; length -= 1) {
        if (i + 2 * length > tokens.length) continue
        let same = true
        for (let j = 0; j < length && same; j += 1) same = tokens[i + j] === tokens[i + length + j]
        if (!same) continue
        if (!tokens.slice(i, i + length).some((token) => /[a-z\-/]/.test(token))) continue
        tokens.splice(i + length, length)
        changed = true
      }
    }
  }
  return tokens
}

// R18: designators with their ids, out of one part's tokens.
function annotate (tokens, designators) {
  const items = tokens.map((t) => ({ t, des: false }))
  for (let i = 0; i < items.length; i += 1) {
    const t = items[i].t
    const next = items[i + 1]

    if (isFloor(t)) {
      items[i].des = true
      designators.push(t)
      continue
    }
    if (t === 'po' && next && next.t === 'box') {
      items[i].des = next.des = true
      const id = items[i + 2]
      if (id && !isFloor(id.t)) {
        id.des = true
        designators.push(`po box ${id.t}`)
        i += 2
      } else {
        designators.push('po box')
        i += 1
      }
      continue
    }
    if (t[0] === '#') {
      if (t.length > 1) {
        items[i].des = true
        designators.push(t)
      } else if (next && isId(next.t)) {
        items[i].des = next.des = true
        designators.push(`#${next.t}`)
        i += 1
      }
      continue
    }

    let word = null
    let j = i + 1
    if (DESIGNATORS.has(t)) {
      word = t
    } else if (COMPASS.has(t) && next && next.t === 'wing') {
      word = `${t} wing`
      j = i + 2
    } else if (t === 'wing') {
      word = t
    }
    if (!word) continue

    const previous = items[i - 1]
    const atStart = i === 0 || previous.des || /\d/.test(previous.t)

    if (word === 'unit' && items[j] && (items[j].t === 'no' || items[j].t === 'number') && items[j + 1] && isId(items[j + 1].t)) j += 1
    const id = items[j]
    // R18(c): later in a part, a designator counts only with its id after it,
    // and only at the end of the part or before a floor or another
    // designator: "60 TOTTENHAM COURT ROAD SUITE 969A", "PROFILE WEST SUITE D
    // SECOND FLOOR". "THE OLD POST OFFICE 63 SAVILLE STREET" is a house number.
    // R18(d): a flat, apartment, unit or suite with a numbered id, or any
    // designator whose id comes before a house number or range, counts
    // anywhere: "THE COACH HOUSE UNIT 42 66-70 BOURNE ROAD".
    if (!atStart) {
      const after = items[j + 1]
      if (!(id && isId(id.t))) continue
      const anywhere = (STRONG_DESIGNATORS.has(word) && /\d/.test(id.t)) || (after && HOUSE_NUMBER.test(after.t))
      if (!anywhere && after && !isFloor(after.t) && !DESIGNATORS.has(after.t) && after.t !== 'po') continue
    }
    if (id && isId(id.t)) {
      for (let k = i; k <= j; k += 1) items[k].des = true
      designators.push(`${word} ${stripZeros(id.t.replace(/^#/, ''))}`)
      i = j
    } else if (id && STREET_TYPES.has(id.t)) {
      continue
    } else {
      for (let k = i; k < j; k += 1) items[k].des = true
      designators.push(word)
      i = j - 1
    }
  }
  return items
}

// R20: estate runs in one part, as item index ranges.
function findRuns (items) {
  const runs = []
  let floor = 0
  for (let e = 0; e < items.length; e += 1) {
    if (items[e].des) continue
    const t = items[e].t
    const previous = items[e - 1]
    let siteLength = 0
    if (t === 'estate' || t === 'estates') {
      siteLength = previous && !previous.des && ['industrial', 'trading', 'business'].includes(previous.t) ? 2 : 1
    } else if ((t === 'park' || t === 'centre') && previous && !previous.des && SITE_QUALIFIERS.has(previous.t)) {
      siteLength = 2
    }
    if (!siteLength) continue

    let s = e - siteLength + 1
    // R20(b): the run stops at a building name before it, as a comma would:
    // "ALPHA HOUSE LAWNSWOOD BUSINESS PARK" is "ALPHA HOUSE, LAWNSWOOD BUSINESS PARK".
    while (s - 1 >= floor && !items[s - 1].des && !/\d/.test(items[s - 1].t) && !PROTECTED_ID.test(items[s - 1].t) &&
      !RUN_BUILDING_WORDS.has(items[s - 1].t)) s -= 1
    const length = e - s + 1
    if (length - siteLength >= 1 && length <= 6) {
      runs.push({ start: s, end: e, siteLength })
      floor = e + 1
    }
  }
  return runs
}

function runTokens (items, run) {
  const tokens = items.slice(run.start, run.end + 1).map((item) => item.t)
  const site = tokens.slice(tokens.length - run.siteLength).join(' ')
  if (run.siteLength === 1 || SITE_PHRASES.has(site)) {
    return [...tokens.slice(0, tokens.length - run.siteLength), '#site']
  }
  return tokens
}

function isIdLike (token) {
  return /^\d+[a-z]?$/.test(token) || /^[a-z]+\d[a-z0-9]*$/.test(token) || /^\d+[a-z]?[-/]\d+[a-z]?$/.test(token)
}

// R11(b): "167 169", "167/169" and "167.169" are the range "167-169" when
// that range is written at this postcode and a street name, not a number,
// follows. Glasgow "1/2 48 WEST GEORGE STREET" has a number after it.
function joinRanges (tokens, ranges) {
  if (ranges.size === 0) return tokens
  const out = []
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    const pair = /^\d+$/.test(token) && /^\d+$/.test(tokens[i + 1] || '') ? [token, tokens[i + 1], i + 2] : null
    const joined = /^(\d+)[/.](\d+)$/.exec(token)
    const [from, to, after] = pair || (joined ? [joined[1], joined[2], i + 1] : [])
    const range = from !== undefined && Number(from) < Number(to) ? `${from}-${to}` : null
    if (range && ranges.has(range) && /^[a-z]/.test(tokens[after] || '') && !DESIGNATORS.has(tokens[i - 1])) {
      out.push(range)
      i = after - 1
    } else {
      out.push(token)
    }
  }
  return out
}

// R15(b): a run of 3 or more tokens holding a number and a word, written
// again later in the address, is dropped where it is written again:
// "167-169 GREAT PORTLAND STREET 5TH FLOOR LONDON 167-169 GREAT PORTLAND STREET".
function dropRepeatedRuns (keyParts) {
  const flat = []
  keyParts.forEach((tokens, p) => tokens.forEach((t) => flat.push({ t, p })))
  const numbers = flat.filter((item) => /\d/.test(item.t)).map((item) => item.t)
  if (new Set(numbers).size === numbers.length) return keyParts
  let changed = true
  while (changed) {
    changed = false
    for (let length = Math.floor(flat.length / 2); length >= 3 && !changed; length -= 1) {
      for (let i = 0; i + 2 * length <= flat.length && !changed; i += 1) {
        const run = flat.slice(i, i + length).map((item) => item.t)
        if (!run.some((t) => /\d/.test(t)) || !run.some((t) => /^[a-z]+$/.test(t))) continue
        for (let j = i + length; j + length <= flat.length && !changed; j += 1) {
          let same = true
          for (let k = 0; k < length && same; k += 1) same = flat[j + k].t === run[k]
          if (!same) continue
          flat.splice(j, length)
          changed = true
        }
      }
    }
  }
  return keyParts.map((tokens, p) => flat.filter((item) => item.p === p).map((item) => item.t)).filter((tokens) => tokens.length > 0)
}

// R15: a part written twice, or held whole in a longer part.
function dropContainedParts (keyParts) {
  const texts = keyParts.map((tokens) => tokens.join(' '))
  return keyParts.filter((tokens, i) => {
    if (texts.indexOf(texts[i]) < i) return false
    // A lone range another part holds is written twice: "86-90, 86-90 PAUL
    // STREET". A lone bare number is kept: it may be a flat.
    if (!/[a-z]/.test(texts[i])) {
      return !(tokens.length === 1 && /^\d+-\d+$/.test(tokens[0]) &&
        keyParts.some((other, j) => j !== i && other.length > 1 && other.includes(tokens[0])))
    }
    return !keyParts.some((other, j) => j !== i && other.length > tokens.length && containsInOrder(other, tokens))
  })
}

// R15(c): "275 OFFICE 535, 275 NEW NORTH ROAD". A house number written before
// a designator, and again later before its street, is written twice.
function dropNumberBeforeDesignator (keyParts) {
  const flat = keyParts.flat()
  return keyParts.map((tokens, p) => {
    if (tokens.length < 3 || !/^\d+(-\d+)?$/.test(tokens[0]) || !DESIGNATORS.has(tokens[1])) return tokens
    const start = keyParts.slice(0, p).reduce((sum, part) => sum + part.length, 0)
    for (let i = start + 3; i < flat.length - 1; i += 1) {
      if (flat[i] === tokens[0] && /^[a-z]+$/.test(flat[i + 1]) && !DESIGNATORS.has(flat[i - 1])) return tokens.slice(1)
    }
    return tokens
  })
}

// R15(d): a doubled bare number in an address that already has a designator
// with an id is the house number written twice: "275 275 NEW NORTH ROAD,
// SUITE 348". Straight after a designator it stays: "FLAT 5 5 FERGUSON COURT".
function collapseDoubledNumbers (keyParts) {
  const flat = keyParts.flat()
  const hasDesignator = flat.some((token, i) => DESIGNATORS.has(token) && isId(flat[i + 1]) && /\d/.test(flat[i + 1]))
  if (!hasDesignator) return keyParts
  return keyParts.map((tokens) => tokens.filter((token, i) =>
    !(i > 0 && token === tokens[i - 1] && /^\d+[a-z]?(-\d+)?$/.test(token) && !DESIGNATORS.has(tokens[i - 2]))))
}

function keyOf (parts, placeWords, ranges = new Set()) {
  let keyParts = parts
    .filter((part) => !part.drop && isKeyPart(part))
    .map((part) => joinRanges(tokensFromBasic(part.basic), ranges))
    .filter((tokens) => tokens.length > 0)

  // R12(b): a part that is just "<number> saint" joins the next part.
  for (let i = 0; i < keyParts.length - 1; i += 1) {
    const tokens = keyParts[i]
    if (tokens.length === 2 && /^\d+[a-z]?$/.test(tokens[0]) && tokens[1] === 'saint') {
      keyParts[i] = [...tokens, ...keyParts[i + 1]]
      keyParts.splice(i + 1, 1)
    }
  }

  // R18(b): a part that is a lone designator joins a next part that starts
  // with an id holding a digit: "OFFICE, 1059" is "OFFICE 1059".
  for (let i = 0; i < keyParts.length - 1; i += 1) {
    const next = keyParts[i + 1]
    if (keyParts[i].length === 1 && DESIGNATORS.has(keyParts[i][0]) && isId(next[0]) && /\d/.test(next[0])) {
      keyParts[i] = [...keyParts[i], ...next]
      keyParts.splice(i + 1, 1)
    }
  }

  // R15
  keyParts = dropContainedParts(dropRepeatedRuns(keyParts.map(collapseRepeats)))
  keyParts = dropContainedParts(collapseDoubledNumbers(dropNumberBeforeDesignator(keyParts)))

  // R16
  if (placeWords.size > 0) {
    const kept = []
    for (let i = 0; i < keyParts.length; i += 1) {
      let tokens = keyParts[i]
      let text = tokens.join(' ')
      // A line that is only a place word goes when another line is not one:
      // "SPRING HOUSE, BURY HILL LANE, YATE".
      const otherLine = keyParts.some((other, j) => j !== i && !placeWords.has(other.join(' ')))
      if (placeWords.has(text) && (kept.some(tokensHoldId) || otherLine) && keyParts.length > 1) continue
      // R16(b): a place word before a designator: "ISLINGTON SUITE 1382".
      for (const word of placeWords) {
        const length = word.split(' ').length
        const next = tokens[length] || ''
        if (text.startsWith(`${word} `) && (DESIGNATORS.has(next) || next.startsWith('#'))) {
          tokens = tokens.slice(length)
          text = tokens.join(' ')
          break
        }
      }
      // R16(c): a compass word cut off its street by a comma: "182-184 HIGH
      // STREET, NORTH EAST HAM" is "182-184 HIGH STREET NORTH, EAST HAM".
      const previous = kept[kept.length - 1]
      const afterStreet = previous && STREET_TYPES.has(previous[previous.length - 1])
      for (const word of placeWords) {
        if (!text.endsWith(` ${word}`)) continue
        const before = tokens.slice(0, tokens.length - word.split(' ').length)
        // R12(a) before a place word: "124 CITY RD LONDON".
        const abbreviation = STREET_ABBREVIATIONS[before[before.length - 1]]
        if (abbreviation && before.length > 1 && /^[a-z]+$/.test(before[before.length - 2])) {
          before[before.length - 1] = abbreviation
        }
        const last = before[before.length - 1]
        // R16(b): after a designator and its id: "OFFICE 322 FITZROVIA".
        const afterDesignator = before.length >= 2 && DESIGNATORS.has(before[before.length - 2]) && isId(last)
        const compassAfterStreet = before.length === 1 && COMPASS.has(last) && afterStreet
        if (STREET_TYPES.has(last) || isFloor(last) || (COMPASS.has(last) && STREET_TYPES.has(before[before.length - 2])) ||
          afterDesignator || compassAfterStreet) {
          tokens = before
          break
        }
      }
      kept.push(tokens)
    }
    // Stripping a place word can leave a part another part holds.
    keyParts = dropContainedParts(kept)
  }

  // R17
  keyParts = keyParts.map((tokens) => (tokens[0] === 'the' && tokens.length > 1 ? tokens.slice(1) : tokens))

  // R18 to R20
  const designators = []
  const remainder = []
  const runs = []
  const partTexts = []
  for (const tokens of keyParts) {
    const partStart = remainder.length
    const items = annotate(tokens, designators)
    // R17(b): "THE" straight after a designator: "UNIT 40 THE LINK".
    const firstWord = items.findIndex((item) => !item.des)
    if (firstWord > 0 && items[firstWord].t === 'the' && items.slice(firstWord + 1).some((item) => !item.des)) {
      items[firstWord].des = true
    }
    const partRuns = findRuns(items)

    // R19: an id directly before an estate run is the unit.
    if (partRuns.length > 0) {
      const first = items.findIndex((item) => !item.des)
      if (first >= 0 && isIdLike(items[first].t)) {
        let next = first + 1
        while (next < items.length && items[next].des) next += 1
        if (next === partRuns[0].start) {
          items[first].des = true
          designators.push(`unit ${stripZeros(items[first].t)}`)
        }
      }
    }

    let r = 0
    for (let i = 0; i < items.length; i += 1) {
      const run = partRuns[r]
      if (run && i === run.start) {
        const tokensOfRun = runTokens(items, run)
        runs.push({ at: remainder.length, length: tokensOfRun.length, tokens: tokensOfRun, centre: items[run.end].t === 'centre' })
        remainder.push(...tokensOfRun)
        i = run.end
        r += 1
        continue
      }
      if (!items[i].des) remainder.push(items[i].t)
    }
    if (remainder.length > partStart) partTexts.push(remainder.slice(partStart).join(' '))
  }

  // R22
  const designatorKey = [...new Set(designators)].sort().join(',')
  // R22(b): the same parts in another order ("KEMP HOUSE, 160 CITY ROAD" and
  // "160 CITY ROAD, KEMP HOUSE"). groupPostcode joins entries that share it.
  // A part with no word, such as a lone number, keeps its place: it may be a flat.
  const bag = partTexts.length > 1 && partTexts.every((text) => /[a-z]/.test(text))
    ? `${designatorKey}|${[...partTexts].sort().join(' , ')}`
    : null
  if (runs.length !== 1) {
    return { key: `${designatorKey}|${remainder.join(' ')}`, designatorKey, remainder, run: null, bag }
  }

  // R21: a single run moves to the front.
  const run = runs[0]
  const others = [...remainder.slice(0, run.at), ...remainder.slice(run.at + run.length)]
  const ordered = [...run.tokens, ...others]
  return {
    key: `${designatorKey}|${ordered.join(' ')}`,
    designatorKey,
    remainder: ordered,
    run: { tokens: run.tokens, centre: run.centre, without: `${designatorKey}|${others.join(' ')}` },
    bag
  }
}

// R16: post town and county values at least 2 rows at this postcode use.
function placeWordsOf (records) {
  const counts = new Map()
  for (const record of records) {
    for (const field of [record.fields[3], record.fields[4]]) {
      for (const piece of field.split(',')) {
        const tokens = keyTokensOf(piece)
        if (tokens.length === 0) continue
        const text = tokens.join(' ')
        counts.set(text, (counts.get(text) || 0) + record.count)
      }
    }
  }
  const words = new Set()
  for (const [text, count] of counts) {
    if (count < 2) continue
    const tokens = text.split(' ')
    if (tokens.some((token) =>
      /\d/.test(token) || isFloor(token) || STREET_TYPES.has(token) || PLACE_BUILDING_WORDS.has(token) ||
      DESIGNATORS.has(token) || FLOOR_WORDS.has(token) || token === 'po' || token.startsWith('#'))) continue
    words.add(text)
  }
  return words
}

// ---------------------------------------------------------------------------
// Step 2d: groups
// ---------------------------------------------------------------------------

function rawTextOf (record) {
  const [poBox, line1, line2, town, county] = record.fields
  return [poBoxLine(poBox), line1, line2, town, county].filter(Boolean).join(', ')
}

function addCount (map, key, count) {
  map.set(key, (map.get(key) || 0) + count)
}

function mergeInto (target, source) {
  for (const [text, count] of source.variants) addCount(target.variants, text, count)
  for (const [text, count] of source.raws) addCount(target.raws, text, count)
  for (const member of source.members) target.members.push(member)
  target.count += source.count
}

// R23: an estate run that one entry has and another lacks.
function foldEstateRuns (groups, placeWordTokens) {
  const targets = new Map()
  for (const group of groups.values()) {
    const run = group.run
    if (!run || run.centre || run.tokens.length > 6) continue
    if (run.tokens.some((token) => /\d/.test(token) || RUN_BUILDING_WORDS.has(token) || RUN_COMPANY_WORDS.has(token))) continue
    const target = groups.get(run.without)
    if (!target || target === group || target.run) continue
    const holdsId = target.designatorKey !== '' || target.remainder.some((token) => /\d/.test(token))
    const named = target.remainder.some((token) => /[a-z]/.test(token) && token !== '#site' && !placeWordTokens.has(token))
    if (!holdsId || !named) continue
    if (!targets.has(target)) targets.set(target, [])
    targets.get(target).push(group)
  }

  for (const [target, sources] of targets) {
    const names = new Set(sources.map((source) => source.run.tokens.join(' ')))
    if (names.size !== 1) continue
    for (const source of sources) {
      mergeInto(target, source)
      groups.delete(source.key)
    }
  }
}

function lowerCaseCount (text) {
  return (text.match(/[a-z]/g) || []).length
}

function partCount (text) {
  return text.split(', ').length
}

// A run of 3 or more words, holding a number and a word, written twice:
// "167-169 GREAT PORTLAND STREET, 5TH FLOOR, LONDON 167-169 GREAT PORTLAND STREET".
function repeatsItself (text) {
  const keys = text.split(/[\s,]+/).map(wordKey).filter(Boolean)
  const numbers = keys.filter((key) => /\d/.test(key))
  if (new Set(numbers).size === numbers.length) return false
  const length = 3
  for (let i = 0; i + 2 * length <= keys.length; i += 1) {
    const run = keys.slice(i, i + length)
    if (!run.some((key) => /\d/.test(key)) || !run.some((key) => /^[a-z]+$/.test(key))) continue
    for (let j = i + length; j + length <= keys.length; j += 1) {
      if (run.every((key, k) => keys[j + k] === key)) return true
    }
  }
  return false
}

// A variant that does not repeat itself, then most rows, then fewer parts,
// then more lower-case letters, then the first by compareDisplay (which ends
// on code point order).
function chooseDisplay (variants) {
  let best = null
  let bestCount = 0
  let bestRepeats = false
  for (const [text, count] of variants) {
    const repeats = repeatsItself(text)
    let better
    if (best === null) better = true
    else if (repeats !== bestRepeats) better = !repeats
    else if (count !== bestCount) better = count > bestCount
    else if (partCount(text) !== partCount(best)) better = partCount(text) < partCount(best)
    else if (lowerCaseCount(text) !== lowerCaseCount(best)) better = lowerCaseCount(text) > lowerCaseCount(best)
    else better = compareDisplay(text, best) < 0
    if (better) {
      best = text
      bestCount = count
      bestRepeats = repeats
    }
  }
  return best
}

// records: [{ fields: [poBox, line1, line2, town, county], name, count }] for
// one postcode. Returns its entries sorted by display, each with variants
// (tidied text -> rows), raws (raw text -> rows) and the indexes of its records.
function groupPostcode (records) {
  const placeWords = placeWordsOf(records)
  const placeWordTokens = new Set([...placeWords].flatMap((word) => word.split(' ')))
  const prepared = records.map(prepareRecord)
  decideOwnNames(prepared)
  lengthenStreetTails(prepared)

  // R11(b): number ranges written with a dash at this postcode.
  const ranges = new Set()
  for (const entry of prepared) {
    dropOtherFirmParts(entry.parts)
    stripFirmPrefixes(entry.parts)
    for (const part of entry.parts) {
      if (part.drop || !isKeyPart(part) || !/\d-\d/.test(part.basic)) continue
      for (const token of tokensFromBasic(part.basic)) if (/^\d+-\d+$/.test(token)) ranges.add(token)
    }
  }

  const groups = new Map()
  prepared.forEach((entry, index) => {
    const display = displayOf(entry.parts)
    if (!display) return
    const { key, designatorKey, remainder, run, bag } = keyOf(entry.parts, placeWords, ranges)
    let group = groups.get(key)
    if (!group) {
      group = { key, designatorKey, remainder, run, bags: new Set(), variants: new Map(), raws: new Map(), members: [], count: 0 }
      groups.set(key, group)
    }
    if (bag) group.bags.add(bag)
    const count = entry.record.count
    addCount(group.variants, display, count)
    addCount(group.raws, rawTextOf(entry.record), count)
    group.members.push(index)
    group.count += count
  })

  foldEstateRuns(groups, placeWordTokens)

  // R24: entries that would print a text in common are one entry, and so are
  // entries with the same parts in another order (R22(b)).
  const list = [...groups.values()]
  const parent = list.map((group, i) => i)
  const find = (i) => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]]
    return i
  }
  const firstWith = new Map()
  const link = (key, i) => {
    const j = firstWith.get(key)
    if (j === undefined) {
      firstWith.set(key, i)
      return
    }
    const [a, b] = [find(i), find(j)]
    if (a !== b) parent[Math.max(a, b)] = Math.min(a, b)
  }
  list.forEach((group, i) => {
    for (const text of group.variants.keys()) link(`text ${text}`, i)
    for (const bag of group.bags) link(`bag ${bag}`, i)
  })

  const merged = new Map()
  list.forEach((group, i) => {
    const root = find(i)
    const entry = merged.get(root)
    if (entry) mergeInto(entry, group)
    else merged.set(root, { variants: new Map(group.variants), raws: new Map(group.raws), members: [...group.members], count: group.count })
  })
  const entries = [...merged.values()]
  for (const entry of entries) entry.display = chooseDisplay(entry.variants)

  return entries
    .map(({ display, variants, raws, members, count }) => ({ display, variants, raws, members, count }))
    .sort((a, b) => compareDisplay(a.display, b.display))
}

// Picks one display text among case variants of the same address, the same
// way every build: the one with the most lower-case letters reads best, so it
// wins; a tie goes to the lower string by code point.
function preferredDisplay (current, candidate) {
  if (current === undefined) return candidate

  const difference = lowerCaseCount(candidate) - lowerCaseCount(current)

  if (difference !== 0) return difference > 0 ? candidate : current

  return candidate < current ? candidate : current
}

const collator = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' })

function compareDisplay (a, b) {
  return collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)
}

module.exports = {
  ADDRESS_FIELDS,
  recordSignature,
  decodeRecord,
  groupPostcode,
  chooseDisplay,
  preferredDisplay,
  compareDisplay
}

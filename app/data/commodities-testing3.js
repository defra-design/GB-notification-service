// Live animal commodities that the commodity search in Design release 2.1, Testing 3 and Testing 4
// offers on top of the generated list. The file is named for Testing 3, where
// they were first added.
//
// They split gamebirds and poultry into day-old chicks and adult birds, the
// way the Live Animals and Germinals Data Dictionary lists them.
//
// They are kept here, not in generated/commodities-live.json, so the older
// versions do not show them and a rebuild of the generated list does not
// remove them.
//
// The generated list's own entries (Chicken, Turkey, Duck, Goose, Guinea fowl,
// and the partridge and pheasant species under "Other birds") are still in the
// search, so these birds can be found in both places.
//
// The ids say "game-birds" because they were added before the name changed to
// "Gamebirds". Ids must not change once journeys and sessions point at them.

function withTenDigitCodes (codes) {
  return codes.flatMap((code) => [code, `${code}00`])
}

function gamebirdSpecies (commodityId, extraTerms) {
  return [
    {
      id: `${commodityId}-partridge`,
      label: 'Partridge',
      searchTerms: ['partridges', ...extraTerms]
    },
    {
      id: `${commodityId}-pheasant`,
      label: 'Pheasant',
      searchTerms: ['pheasants', ...extraTerms]
    }
  ]
}

function poultrySpecies (commodityId, extraTerms) {
  return [
    { id: `${commodityId}-chicken`, label: 'Chicken', searchTerms: ['chickens', 'hen', 'hens', ...extraTerms] },
    { id: `${commodityId}-turkey`, label: 'Turkey', searchTerms: ['turkeys', ...extraTerms] },
    { id: `${commodityId}-duck`, label: 'Duck', searchTerms: ['ducks', ...extraTerms] },
    { id: `${commodityId}-goose`, label: 'Goose', searchTerms: ['geese', ...extraTerms] },
    { id: `${commodityId}-guinea-fowl`, label: 'Guinea fowl', searchTerms: ['guineafowl', ...extraTerms] }
  ]
}

const CHICK_TERMS = ['day old chicks', 'chicks', 'poults']
const ADULT_TERMS = ['adult birds', 'adults']

// "game bird" and "game birds" stay as hidden search terms so the two-word
// spelling still finds these. The names on screen use "Gamebirds".
const GAMEBIRD_TERMS = ['gamebird', 'game bird', 'game birds', 'partridge', 'pheasant']
const POULTRY_TERMS = ['chicken', 'turkey', 'duck', 'goose', 'guinea fowl', 'fowl']

module.exports = [
  {
    id: 'game-birds-day-old-chicks',
    name: 'Gamebirds: day-old chicks',
    code: '01063980',
    tariffCodes: withTenDigitCodes(['01063980']),
    searchTerms: [...GAMEBIRD_TERMS, ...CHICK_TERMS],
    identifiers: [],
    species: gamebirdSpecies('game-birds-day-old-chicks', CHICK_TERMS)
  },
  {
    id: 'game-birds-adult-birds',
    name: 'Gamebirds: adult birds',
    code: '01063980',
    tariffCodes: withTenDigitCodes(['01063980']),
    searchTerms: [...GAMEBIRD_TERMS, ...ADULT_TERMS],
    identifiers: [],
    species: gamebirdSpecies('game-birds-adult-birds', ADULT_TERMS)
  },
  // Each kind of poultry has its own 8-digit code, so the commodity shows the
  // shared 4-digit heading and the search finds it by any of the full codes.
  {
    id: 'poultry-day-old-chicks',
    name: 'Poultry: day-old chicks',
    code: '0105',
    tariffCodes: withTenDigitCodes(['01051111', '01051200', '01051300', '01051400', '01051500']),
    searchTerms: [...POULTRY_TERMS, ...CHICK_TERMS],
    identifiers: [],
    species: poultrySpecies('poultry-day-old-chicks', CHICK_TERMS)
  },
  {
    id: 'poultry-adult-birds',
    name: 'Poultry: adult birds',
    code: '0105',
    tariffCodes: withTenDigitCodes(['01059400', '01059910', '01059920', '01059930', '01059950']),
    searchTerms: [...POULTRY_TERMS, ...ADULT_TERMS],
    identifiers: [],
    species: poultrySpecies('poultry-adult-birds', ADULT_TERMS)
  }
]

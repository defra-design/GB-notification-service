# Commodity data

These two files hold every commodity and species the commodity picker offers:

| File | Holds |
|---|---|
| `commodities-live.json` | Live animals, including live crustaceans and molluscs: 48 commodities, 856 species |
| `commodities-germinal.json` | Germinal products (semen, embryos, ova and hatching eggs): 18 commodities, 29 species |

`app/data/commodities.js` and `app/data/commodities-germinal-products.js` load them.
`app/data/commodity-curated.js` adds the hand-written fields some commodities need, such as identifiers and packaging.

## Where the list comes from

The list is built outside this repo from Defra and public reference data.
The build writes these two files and nothing else here.

| Source | Date |
|---|---|
| Defra commodity master data | October 2023 snapshot |
| Defra notification test environment | Read November 2026 |
| UK Trade Tariff, headings 0101 to 0106 and 0511 | Read 16 November 2026 |
| Defra commodity master data, EU import route, for codes already in the list | October 2023 snapshot |
| GOV.UK risk categories for animal imports from non-EU countries (BTOM) | Page updated 1 April 2025 |
| EU TRACES species list | 9 November 2018 |
| This prototype's own list before the merge | Kept as it was |

Finfish are left out: headings 0301 to 0305 and code 0511.91.90.
Live crustaceans (0306.31 to 0306.39) and molluscs (0307) are in. The dried, salted and smoked crustacean codes (0306.91 to 0306.99) are not.

## What changed from the earlier list

| Measure | Count |
|---|---|
| Live commodities | 48 (was 21). 28 new, ornamental fish removed. |
| Live species | 856 (was 144). 715 new, 3 fish removed. |
| Germinal commodities | 18 (was 15). 3 new. |
| Germinal species | 29 (was 22). 7 new. |
| Latin names under more than one live commodity | 85 |

Every earlier commodity and species keeps its id, label and common name, in the same order.
Journeys, templates and tests refer to them.

## Which names are generated

A field ending in `Source` says where a name came from.
Records from the earlier list have no such field.

| Field | Value | Means | Count |
|---|---|---|---|
| Commodity `nameSource` | `generated` | A friendly name written for this list. The tariff wording is kept in `tariffDescription`. | 28 |
| Commodity `nameSource` | `pattern` | Named like the existing germinal commodities, for example "Reptile, Embryos/Ova". | 3 |
| Species `commonNameSource` | `defra-same-code` | Defra data, the same species under the same code | 23 |
| Species `commonNameSource` | `defra-other-code` | Defra data, the same species under another code | 39 |
| Species `commonNameSource` | `defra-genus` | Defra data, matched by genus | 9 |
| Species `commonNameSource` | `generated` | Written for this list, then checked | 616 |
| Species `commonNameSource` | `generated-fallback` | No checked English name found, so it shows "commodity name (genus or Latin name)" | 35 |
| Species `labelSource` | `generated` | An order-level species added because the code had none: the whales, dolphins and seals | 3 |
| `searchTermsSource` | `generated` | The record's `searchTerms` include terms written for this list, such as "cow" on Cattle or "iguana" on lizards | 450 |

`searchTerms` without that flag are other spellings of the Latin name found in the sources.
`tariffCodes` hold each commodity's 8-digit and 10-digit codes, so search finds "01051111" and "01.02".

Generated names are a best effort.
Treat them as draft wording for research, not as agreed content.

## Common names for search

`app/assets/data/common-names-live.json` holds English animal names that search treats like a species' search terms.
It lets "polar bear" find Other Carnivora and "toucan" find Piciformes, where no row names the animal.

| Field | Holds |
|---|---|
| `source` | Where the names come from |
| `names` | Each live-animals species id, with the English names that find it |

Each name belongs to an animal whose nearest group in the taxonomy matches that species row's Latin name.

The page fetches the file the first time someone uses the search box, and only for live animals.
Search works without it while it loads, or if the fetch fails.

The names are left out for:

- germinal products
- travelling circus and menagerie rows, which search still finds by their commodity
- matches only at phylum level, and the broad "Other Mollusca", "Other Bivalvia" and "Other Crustacea" rows, except names of a family or smaller group
- subspecies
- names of finfish, such as salmon, cod or trout

The file is built outside this repo, like the commodity lists. Do not edit it by hand: the next rebuild replaces it.

Source: Integrated Taxonomic Information System (ITIS), October 2026 release (itisSqlite102826), [www.itis.gov](https://www.itis.gov).
ITIS data is public domain, as a work of the US government, so no credit line is needed.

## Editing the JSON by hand

You can edit these files directly. To keep the prototype working:

- Never change an existing `id`. Journeys, templates and saved sessions point at ids.
- Keep the earlier list's labels and common names as they are, unless you also update the tests that use them.
- A new `id` is lower case letters, numbers and hyphens, and is unique across both files.
- A commodity always has at least one species.
- Use only the fields already in the files. The check refuses any other field.
- Text must not contain `&`, `<`, `>` or `"`. Write "and" for `&`.
- Two commodities in one file cannot share a name.
- A new species with a `commonName` needs a `commonNameSource`. Use `generated` for one you wrote.
- If you change a generated name, leave its source flag in place.
- Tell the person who maintains the build: the next rebuild replaces these files, so a hand edit must also go into the build or it is lost.

## Checking the data

Run the check after any change:

```
npm run check:commodities
```

It checks that:

- every earlier commodity and species is still there, unchanged
- the fixed ids that code and templates rely on still resolve
- no finfish code is present (headings 0301 to 0305, or 0511.91.90)
- fields, names, text and search terms follow the rules above

It also lists the Latin names that sit under more than one live commodity.

Then run the search tests:

```
npm run test:commodity-search
```

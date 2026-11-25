# Postcode address lookup (spike)

`/postcode-lookup` takes a full UK postcode and lists the distinct registered office addresses Companies House holds for it.

These are company addresses, not a full address list, so the page labels them "Registered office addresses".

The journey uses the same files in design release 2.1. A "Find an address" page comes before the two UK address forms:

| Form | How the user reaches it |
|---|---|
| Adding a consignee, importer or place of destination to a notification | "Add a new address" on that section's page |
| Adding a destination or branch address to the address book | Choosing that address type |

The user enters a postcode and picks an address, and the form opens with it filled in. They still add the name and contact details. "Enter the address manually" opens the empty form.

## Build the files

```
npm run build:postcode-addresses
```

The build:

1. finds the newest `BasicCompanyDataAsOneFile-<date>.zip` on [the Companies House download page](https://download.companieshouse.gov.uk/en_output.html)
2. downloads it to `.cache/companies-house/`, or reuses a copy already there
3. streams the CSV through `csv-parse`
4. writes a fresh `app/data/generated/postcode-addresses/`, removing the old one

To build from a file you already have:

```
npm run build:postcode-addresses -- --source path/to/BasicCompanyDataAsOneFile-2026-11-01.zip
```

The output for the 1 November 2026 snapshot is committed, so the prototype needs no build step when it is deployed. This is a one-off: the files are not refreshed. Git ignores the download.

## What it keeps

| Rule | Detail |
|---|---|
| Company categories | Every type in the register, such as private and public limited companies, LLPs, partnerships, charities and overseas entities |
| Postcode | Upper case, no spaces, and a full UK postcode. Rows with none, or one that does not fit, are skipped and counted. |
| Address | Needs a PO box or a first address line. Rows with neither are skipped and counted. |
| Fields shown | PO box, address line 1, address line 2, post town, county |
| Fields compared | PO box, address line 1, address line 2. A post town or county part only when it holds a number, a flat or unit id, a floor or a PO box ("FIFTH FLOOR", "UNIT 5", "SUITE E"). |
| Fields never compared | Care-of, country, and a post town or county part with no id |
| Company name and number | Used only to remove the row's own name or number from its address lines |

`manifest.json` in the output lists every category in the snapshot with its row count, so the kept list can be checked against the data.

## How duplicates are removed

The same premises is often typed many ways. "20-22 WENLOCK ROAD", "20 - 22 WENLOCK RD." and "20-22 WENLOCK ROAD, WENLOCK ROAD, LONDON, UNITED KINGDOM" are one building.

The build tidies each address into a comparison key. Addresses with the same key are one entry.

It never merges across postcodes.

Flats, units, suites, offices, rooms, floors, blocks and PO boxes always stay separate when their numbers differ.

The rules are fixed. There are no model calls, no network and no similarity scores, so the same snapshot always gives the same files.

### The rules

They run in this order. Each one changes only the comparison key unless it says the shown text too.

| Rule | What it does | Example |
|---|---|---|
| R01 Scope | Compares only within one postcode. Town and county are left out, unless a town or county part holds a number, a flat or unit id, a floor or a PO box. | "91 KYLEMORE PARK, LONDONDERRY" = "91 KYLEMORE PARK, DERRY", but "10 WANDLE WAY, MITCHAM, UNIT 5" is not "10 WANDLE WAY, MITCHAM" |
| R02 Characters | Removes accents and apostrophes, ignores case and brackets. | "ST PETER'S" = "ST PETER’S" |
| R03 Parts | Splits on commas and drops empty or punctuation-only parts. Also changes the shown text. | "401 ROMFORD ROAD, LONDON, -" |
| R04 Own number | Removes the row's own company number. A PO box that is the company number is ignored. Also changes the shown text. | "PO Box 4385, 05114035 - COMPANIES HOUSE DEFAULT ADDRESS" |
| R05 Own postcode | Removes the row's own postcode from the lines. Also changes the shown text. | "92 NORRINGTON ROAD, B31 5PB" |
| R06 Country and placeholders | Drops parts like "ENGLAND", "UNITED KINGDOM", "YES" and "--- SELECT ---". "WALES" written as a line before the post town is the village near Sheffield: it is shown but not compared. Also changes the shown text. | "44A LOZELLS ROAD, BIRMINGHAM, ENGLAND" |
| R07 Punctuation | Removes stray dots, and spaces round a number range. Keeps "-" and "/" between numbers. | "12 -16 ALBYN PLACE" = "12-16 ALBYN PLACE" |
| R08 Care-of | Drops a "C/O firm" part, or cuts it back to the first number, designator, floor or level, or to a building it names, whichever comes first. A firm name ending in "LTD", "LIMITED", "LLP" or "PLC" is cut after that word, unless only a lone building word would be left. A firm part that leaves nothing but ends in a street keeps the street (its last 2 words, 3 after "BUSINESS" or similar, never starting on a street word), lengthened to a line another row at the postcode writes. A building name never starts on a street word. The marker may be in brackets or followed by ".", ":" or "-". Also changes the shown text. | "C/O HENDERSON LOGGIE 1 MARISCHAL SQUARE", "C/O SAFFERY TORRIDON HOUSE" = "TORRIDON HOUSE", "C/O IAA UK AUCTIONS LIMITED BENTLEY MOOR LANE" = "BENTLEY MOOR LANE", "C/O FENWICKS HAULAGE WELLSYKE ROAD" keeps "WELLSYKE ROAD" |
| R09 Own company name | Removes the row's own name, with or without its "LTD" or "LIMITED", if a numbered premises is left and other companies do not use it as a building name. A name that ends in a building, street or premises word ("ARMS", "INN", "SCHOOL" and similar) is never removed without its suffix, and never when only one bare word would be left. The full name is also removed at the end of a part, and digits glued to a name ("GRAFTON234") count as part of it. Also changes the shown text. | "ZEZT LTD, 20 WENLOCK ROAD", "ABYSS ENGINE, 124 CITY ROAD" |
| R10 Other firm | Drops a part like "NUSTREAM DIGITAL LTD" when a numbered part is left, and a firm name that ends in "LTD", "LIMITED" or "LLP" at the start of a part, when a numbered part or a named building ("TOWER HOUSE") is left. "SON", "SONS" and "SERVICES" count as firm words. Also changes the shown text. | "DMP ACCOUNTANTS LTD THE ORCHARD" = "THE ORCHARD", "BEVAN BUCKLAND LLP GROUND FLOOR" keeps its floor |
| R11 PO box | Reads "P.O.BOX", "POBOX" and "PO BOX:" as one spelling. A PO box field that is not a box number ("SUITE 11", "OFFICE 195") is read as an address line, with no "PO Box" in front. A range written "167 169", "167/169" or "167.169" is "167-169" when that range is written with a dash at the postcode and a street name follows. | "P.O.BOX 1" = "PO BOX 1", "167 169 GREAT PORTLAND STREET" = "167-169 GREAT PORTLAND STREET" |
| R12 Abbreviations | Expands "RD", "ST", "AVE" at the end of a street or before a place word, "APT", "FLR", and "IND EST", "BUS PARK" or "BUS CENT". "ST" before a number is "STREET"; before a name it is "SAINT". "UNITS" before an id is "UNIT". | "86-90 PAUL ST" = "86-90 PAUL STREET", "124 CITY RD LONDON" = "124 CITY ROAD" |
| R13 Floors | Reads "1ST FLOOR", "FIRST FLOOR" and "FLOOR 1" as one floor. Lower and upper ground are their own floors. "LEVEL 1" and "LEVEL ONE" are one level, never a floor. | "5TH. FLOOR" = "FIFTH FLOOR" |
| R14 Ids | Joins a number to a letter after it and drops leading zeros on flat and suite numbers. Glasgow "1/2" and Edinburgh "3F1" are kept as written. | "19 A" = "19A", "FLAT 08" = "FLAT 8" |
| R15 Repeats | Drops a part written twice, or contained in another part, and a run of 3 or more words holding a number that is written again later. A lone range part another part holds is dropped. In an address with a designator and its id, a bare number just before the designator that is written again later is dropped, and a doubled bare number ("275 275") is written once. Otherwise a doubled bare number is kept. | "20-22 WENLOCK ROAD, WENLOCK ROAD", "SUITE A 82 JAMES CARTER ROAD SUITE A, 82 JAMES CARTER ROAD" |
| R16 Place words | Drops a town or county name from the lines when 2 or more rows at the postcode use it as their town: at the end of a line after a street or floor, or as a whole line when another line is not a place word. Also before a designator or "#", and after a designator and its id. A part that is a compass word and a place word after a street keeps only the compass word. | "182-184 HIGH STREET NORTH, EAST HAM", "SPRING HOUSE, BURY HILL LANE, YATE" |
| R17 "The" | Drops "THE" at the start of a part, or straight after a designator. | "THE KELVIN BUILDING", "UNIT 40 THE LINK" |
| R18 Designators | Takes flat, unit, suite, office and floor ids out of the line order, so where they are written does not matter. Later in a part, a designator counts only with its id after it, at the end of the part or before a floor. Flat, apartment, unit or suite with a numeric id also counts later in a part, and so does any designator followed by a house number or range. A "#" before an id after a designator is dropped. A part that is only a designator joins the id in the next part. Flat, apartment, unit and suite are never treated as the same. | "OFFICE 19, 182-184 HIGH STREET NORTH" = "182-184 HIGH STREET NORTH, OFFICE 19", "OFFICE, 1059" = "OFFICE 1059" |
| R19 Unit before an estate | A bare id just before an estate name is the unit. | "11 BACK O HILL ROAD INDUSTRIAL ESTATE" = "UNIT 11, ..." |
| R20 Estate type | "INDUSTRIAL ESTATE", "TRADING ESTATE" and "BUSINESS PARK" count as the same after the same estate name. The estate name stops at a building name before it. | "HEADLANDS INDUSTRIAL ESTATE" = "HEADLANDS TRADING ESTATE", "ALPHA HOUSE LAWNSWOOD BUSINESS PARK" = "ALPHA HOUSE, LAWNSWOOD BUSINESS PARK" |
| R21 Estate position | Moves a single estate name to the front. | "UNIT 21 MAINSFORTH TERRACE, NEWBURN BRIDGE INDUSTRIAL ESTATE" |
| R22 Commas | Commas and field boundaries no longer count. Word order still does, except that the same parts in another order match when there are 2 or more parts and each holds a letter. | "SUITE 11527 20-22 WENLOCK ROAD" = "SUITE 11527, 20-22 WENLOCK ROAD" |
| R23 Estate left out | Merges an address with the same address minus its estate name, when only one estate name fits. | "UNIT 4 DEWAN INDUSTRIAL ESTATE, YORK AVENUE" = "UNIT 4 YORK AVENUE" |
| R24 Same shown text | Entries that share any written variant, or any set of parts under R22, are one entry. | "THE CASTLE, GRIMNESS, SOUTH RONALDSAY, ORKNEY" |

### What is shown

Each row gives a tidied version of its own address: R03 to R06, R08 to R11, a repeated part removed (or one written again after a longer part that holds it), a phrase written twice in a row shown once (a run of numbers too, "167 169 167 169"), empty brackets left by a removed postcode dropped, a street kept when a building name after it holds it, stray quotes and edge punctuation removed, and spacing round range dashes and slashes fixed.

The spelling, case and abbreviations are the row's own. The shown text is never the comparison key.

Within an entry, the shown text is the tidied version that does not repeat itself, then the one most rows use. A tie goes to the one with fewer parts, then the one with more lower-case letters, then the first in sort order.

### What it does not merge

| Kept apart | Example |
|---|---|
| Different flat, suite, unit or box numbers | "SUITE LP28087" and "SUITE LP29087" |
| A number and a range that holds it | "22 WENLOCK ROAD" and "20-22 WENLOCK ROAD" |
| A flat and the same number as a unit | "FLAT 1" and "UNIT 1" |
| Different floors, or a floor on one side only | "GROUND FLOOR" and "LOWER GROUND FLOOR" |
| A floor, suite or PO box in the town or county field, and the building | "167-169 GREAT PORTLAND STREET, FIFTH FLOOR" and "167-169 GREAT PORTLAND STREET, LONDON" |
| Buildings named in a care-of part | "C/O SAFFERY TORRIDON HOUSE" and "C/O SAFFERY CHAMPNESS ACCOUNTANTS KINTAIL HOUSE" |
| A level and a floor | "LEVEL 1" and "1ST FLOOR" |
| The same id under different designator words | "OFFICE 767" and "UNIT 767" |
| A doubled house number | "124 124 CITY ROAD" and "124 CITY ROAD", which may be flat 124 at No 124 |
| Swapped flat and house numbers | "FLAT 2, 3 BURNBRAE PARK" and "FLAT 3, 2 BURNBRAE PARK" |
| Different named buildings or estates | "UNIT 4 FOLKES ROAD TRADING ESTATE" and "UNIT 4 THE HAYES TRADING ESTATE" |
| Typos and agent names with no "C/O" or "LTD" | "20-22 WEDLOCK ROAD", "COMPANIES MADE SIMPLE, 20-22 WENLOCK ROAD" |
| Two care-of firms on different streets | "C/O IAA ... BENTLEY MOOR LANE" and "C/O FENWICKS HAULAGE WELLSYKE ROAD" |
| "#" and a designator word | "ISLINGTON #1370" and "ISLINGTON SUITE 1370" |
| A number that moves between parts | "160 KEMP HOUSE, CITY ROAD" and "KEMP HOUSE, 160 CITY ROAD" |
| A letter after a number that may be a flat or a compass point | "126 E FERRY RD" and "126 FERRY ROAD" |

N1 7GU, a formation agent's address, went from 299 entries to 124 with the 1 November 2026 snapshot. The rest are real suites, typos and agent names.

### Check the merges

```
npm run build:postcode-addresses -- --audit .tmp/fuzzy/audit.jsonl
```

This writes one line for every shown address that merged more than one raw variant, with each variant and its row count.

Every rule has a test built from real pairs of rows that must merge, and pairs that must stay apart, in `build.test.js`.

## The files

One file per outward code, keyed by full postcode:

```
BB4.json   {"BB44AA":["address","address"],"BB44AB":[...]}
```

Keys and addresses are sorted, with numbers in number order, so the same snapshot always gives the same bytes.

The lookup checks the postcode before it builds a file name from it, and reads only that one file.

## Check it

```
npm run test:postcode-addresses
npm run test:prototype -- postcode-lookup find-address
```

The browser tests skip themselves when the files have not been built.

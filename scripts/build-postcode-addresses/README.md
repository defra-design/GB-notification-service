# Postcode address lookup (spike)

`/postcode-lookup` takes a full UK postcode and lists the distinct registered office addresses Companies House holds for it.

These are company addresses, not a full address list, so the page labels them "Registered office addresses".

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

Git ignores both the download and the output.

## What it keeps

| Rule | Detail |
|---|---|
| Company categories | Every type in the register, such as private and public limited companies, LLPs, partnerships, charities and overseas entities |
| Postcode | Upper case, no spaces, and a full UK postcode. Rows with none, or one that does not fit, are skipped and counted. |
| Address | Needs a PO box or a first address line. Rows with neither are skipped and counted. |
| Fields used | PO box, address line 1, address line 2, post town, county |
| Fields not used | Company name and number, care-of, country |

`manifest.json` in the output lists every category in the snapshot with its row count, so the kept list can be checked against the data.

## How duplicates are removed

Within one postcode, two addresses are the same when their fields match after trimming, collapsing spaces and ignoring case.

Flats, units, buildings and PO boxes are part of the fields, so separate premises stay separate.

The match is on the text only. "20 WENLOCK ROAD, LONDON" and "20 WENLOCK ROAD, LONDON, ENGLAND" stay as two entries.

When the same address is written in different cases, the version with the most lower-case letters is shown.

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
npm run test:prototype -- postcode-lookup
```

The browser test skips itself when the files have not been built.

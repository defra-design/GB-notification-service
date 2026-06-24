# GB notification service

GOV.UK Prototype Kit prototype for the import notification service.

## Setup

```bash
npm install
```

## Run locally

```bash
npm start
```

The prototype runs at [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  assets/       # JavaScript and Sass
  data/         # Prototype data and session defaults
  utils/        # Shared helpers
  views/        # Nunjucks templates
  config.json   # Service configuration
  filters.js    # Nunjucks filters
  routes.js     # Application routes
```

## Version control

Source files live under `app/`, plus `package.json` and `package-lock.json`. Dependencies (`node_modules/`), build cache (`.tmp/`), and local editor settings are ignored — run `npm install` after cloning.

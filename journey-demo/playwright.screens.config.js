const { defineConfig } = require('@playwright/test')
const journeyConfig = require('./playwright.config')

module.exports = defineConfig({
  ...journeyConfig,
  testDir: './screens',
  testMatch: '**/*.screens.js',
  use: { ...journeyConfig.use, video: 'off', trace: 'off' }
})

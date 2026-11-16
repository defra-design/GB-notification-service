const fs = require('fs')
const path = require('path')

const repoRoot = path.join(__dirname, '..', '..')
const baselinePath = path.join(__dirname, 'baseline', 'prototype-baseline.json')

function readCommodityLists () {
  return {
    live: require(path.join(repoRoot, 'app/data/commodities')),
    germinal: require(path.join(repoRoot, 'app/data/commodities-germinal-products'))
  }
}

function writeBaseline (lists) {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true })
  fs.writeFileSync(baselinePath, `${JSON.stringify(lists, null, 2)}\n`)
}

const lists = readCommodityLists()
writeBaseline(lists)

const speciesCount = (list) => list.reduce((total, commodity) => total + commodity.species.length, 0)
console.log(
  `Recorded ${lists.live.length} live commodities (${speciesCount(lists.live)} species) and ` +
  `${lists.germinal.length} germinal commodities (${speciesCount(lists.germinal)} species) ` +
  `in ${path.relative(repoRoot, baselinePath)}`
)

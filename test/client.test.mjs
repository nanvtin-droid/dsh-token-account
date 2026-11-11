import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')

let captured = null
function createElement(type, props, ...children) {
  return { type, props: props || {}, children: children.flat(Infinity) }
}
// `useState` is read when the factory runs, so the seed list stays mutable and
// is filled in just before the full render.
const seedStates = []
let stateIndex = 0
const React = {
  createElement,
  Fragment: Symbol('Fragment'),
  useCallback: (fn) => fn,
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useState: (initial) => {
    const seeded = stateIndex < seedStates.length ? seedStates[stateIndex] : initial
    stateIndex += 1
    return [seeded, () => {}]
  },
}

const sandbox = {
  window: {
    __ModuleLoader__: {
      load(definition) {
        captured = definition
      },
    },
  },
  require(name) {
    if (name === 'react') return React
    throw new Error(`unexpected require(${name})`)
  },
  console,
  fetch: async () => {
    throw new Error('no network in test')
  },
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  Intl,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  JSON,
}
vm.createContext(sandbox)
vm.runInContext(source, sandbox, { filename: 'client.js' })

if (!captured) throw new Error('module loader was not called')
console.log('module id', captured.id)
if (captured.id !== '@local/dsh-token-account') throw new Error(`id ${captured.id}`)

const mod = captured.factory(sandbox.require)
console.log('inject', mod.inject)

let dicts = null
const registrations = []
const ctx = {
  effect(callback) {
    return callback()
  },
  locale: {
    register(ns, value) {
      dicts = value
      return () => {}
    },
    bind(ns) {
      return (key) => (dicts && dicts.zh ? dicts.zh[key] : undefined) ?? key
    },
  },
  slots: {
    inject(slot, callback) {
      callback()
      return () => {}
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  },
}
mod.apply(ctx)

console.log('registrations', registrations.map((r) => `${r.options.name}#${r.options.id || r.options.key}`))
if (registrations.length !== 2) throw new Error(`expected 2 registrations, got ${registrations.length}`)
const panel = registrations.find((r) => r.options.name === 'sidebar.panellist')
const main = registrations.find((r) => r.options.name === 'main')
if (!panel || panel.options.id !== 'token-account') throw new Error('sidebar entry missing')
if (!main || main.options.key !== 'token-account') throw new Error('main panel missing')
if (!dicts || !dicts.zh || !dicts.en) throw new Error('dictionaries missing')

const zhKeys = Object.keys(dicts.zh).sort()
const enKeys = Object.keys(dicts.en).sort()
if (zhKeys.join(',') !== enKeys.join(',')) {
  const missing = zhKeys.filter((key) => !dicts.en[key])
  const extra = enKeys.filter((key) => !dicts.zh[key])
  throw new Error(`dictionary mismatch missing=${missing} extra=${extra}`)
}
console.log('dictionary keys', zhKeys.length)

const used = new Set()
for (const match of source.matchAll(/\bt\('([a-zA-Z0-9]+)'\)/g)) used.add(match[1])
const missingKeys = [...used].filter((key) => !(key in dicts.zh))
console.log('t() keys used', used.size, 'missing', missingKeys)
if (missingKeys.length > 0) throw new Error(`keys used but not defined: ${missingKeys.join(', ')}`)

// --- render smoke test -----------------------------------------------------
const t = (key) => dicts.zh[key] ?? key
const today = new Date()
const pad = (value) => String(value).padStart(2, '0')
const monthKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`
const dayRows = []
for (let day = 1; day <= 31; day += 1) {
  const date = `${monthKey}-${pad(day)}`
  const total = day % 5 === 0 ? 0 : day * 120000
  dayRows.push({
    date,
    requests: day,
    input: Math.round(total * 0.1),
    output: Math.round(total * 0.05),
    cacheRead: Math.round(total * 0.85),
    cacheWrite: 0,
    reasoning: 0,
    total,
  })
}
const data = {
  ok: true,
  generatedAt: new Date().toISOString(),
  timeZone: 'Asia/Shanghai',
  window: { days: 180, from: '2026-05-16', to: `${monthKey}-11` },
  today: { date: `${monthKey}-11`, ...dayRows[10] },
  yesterday: { date: `${monthKey}-10`, ...dayRows[9] },
  currentMonth: { key: monthKey, total: 12345678, input: 1000000, output: 500000, cacheRead: 10845678, requests: 320, activeDays: 24 },
  totals: { total: 98765432, input: 8000000, output: 4000000, cacheRead: 86765432, cacheWrite: 0, reasoning: 0, requests: 2100 },
  days: dayRows,
  months: [
    { key: monthKey, total: 12345678, input: 1000000, output: 500000, cacheRead: 10845678, requests: 320, activeDays: 24 },
  ],
  models: [
    { provider: 'deepseek-account', model: 'deepseek-flash', requests: 1800, input: 7000000, output: 3500000, cacheRead: 80000000, total: 90500000 },
    { provider: 'deepseek-account', model: 'deepseek-v4-pro', requests: 300, input: 1000000, output: 500000, cacheRead: 6765432, total: 8265432 },
  ],
  account: {
    status: 'signed-in',
    links: { usageUrl: 'https://platform.deepseek.com/usage', topUpUrl: 'https://platform.deepseek.com/top_up' },
    wallets: [{ currency: 'CNY', balance: '54.5493741200000000' }],
    bonusWallets: [{ currency: 'CNY', balance: '0' }],
    balanceStatus: 'ready',
    profile: { id: 'x', name: '阿挺' },
  },
  scan: { sessions: 6, read: 4, cached: 2, failed: 0, pending: 0, truncated: false, elapsedMs: 1774, available: true },
}

function walk(node, path, issues) {
  if (node === null || node === undefined) return
  if (typeof node === 'string') {
    if (node.includes('undefined') || node.includes('NaN')) issues.push(`${path}: ${node}`)
    return
  }
  if (typeof node === 'number') {
    if (Number.isNaN(node)) issues.push(`${path}: NaN`)
    return
  }
  if (Array.isArray(node)) {
    node.forEach((child, index) => walk(child, `${path}[${index}]`, issues))
    return
  }
  if (typeof node.type === 'function') {
    const rendered = node.type({ ...node.props, children: node.children })
    walk(rendered, `${path}<${node.type.name || 'anon'}>`, issues)
    return
  }
  node.children.forEach((child, index) => walk(child, `${path}[${index}]`, issues))
}

const issues = []
const iconTree = panel.component({ size: 16, active: true })
walk(iconTree, 'icon', issues)

// Seed the two `useState` slots Panel reads in order: the overview state, then
// the selected month. This renders the loaded panel (chart, table, models).
seedStates.push({ data, error: null, loading: false }, monthKey)
stateIndex = 0
const panelTree = main.component()
walk(panelTree, 'panel', issues)

console.log('render issues', issues.length ? issues.slice(0, 10) : 'none')
if (issues.length > 0) throw new Error(`render issues: ${issues.slice(0, 5).join(' | ')}`)

const text = []
function collect(node) {
  if (node === null || node === undefined) return
  if (typeof node === 'string' || typeof node === 'number') {
    text.push(String(node))
    return
  }
  if (Array.isArray(node)) {
    node.forEach(collect)
    return
  }
  if (typeof node.type === 'function') {
    collect(node.type({ ...node.props, children: node.children }))
    return
  }
  node.children.forEach(collect)
}
stateIndex = 0
collect(panelTree)
const joined = text.join(' ')
const required = ['账号用量', '余额', '54.55', '月度每日用量', '每日明细', '模型分布', 'deepseek-flash', '阿挺']
const absent = required.filter((needle) => !joined.includes(needle))
const visible = text.filter((entry) => entry.length < 200)
console.log('rendered text:', visible.join(' | ').replace(/\s+/g, ' ').slice(0, 700))
if (absent.length > 0) throw new Error(`rendered output missing: ${absent.join(', ')}`)

console.log('client smoke test passed')

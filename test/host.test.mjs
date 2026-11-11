import { apply } from '../index.js'

let handler = null
let routes = []

const now = Date.now()
const today = new Date()
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
  today.getDate(),
).padStart(2, '0')}`
const yesterday = new Date(now - 86400000)
const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(
  yesterday.getDate(),
).padStart(2, '0')}`

function usage(input, output, extra = {}) {
  return { inputTokens: input, outputTokens: output, ...extra }
}

function message(seq, time, usageValue, provider, model) {
  return {
    type: 'assistant/message',
    seq,
    time,
    data: { message: { source: { provider, model } }, usage: usageValue },
  }
}

const logs = {
  'session-a': {
    inheritedEventCount: 0,
    events: [
      message(0, now - 1000, usage(100, 50), 'deepseek-account', 'deepseek-v4-flash'),
      { type: 'tool/result', seq: 1, time: now - 900, data: {} },
      message(2, now - 800, usage(200, 20, { cacheReadTokens: 80 }), 'deepseek-account', 'deepseek-v4-flash'),
    ],
  },
  'session-b': {
    // Fork: seq 0-1 are copied from the source and must not count again.
    inheritedEventCount: 2,
    events: [
      message(0, now - 5000, usage(100, 50), 'deepseek-account', 'deepseek-v4-flash'),
      message(1, yesterday.getTime(), usage(10, 10), 'deepseek-account', 'deepseek-v4-pro'),
      message(2, now - 500, usage(30, 7), 'deepseek-account', 'deepseek-v4-pro'),
    ],
  },
  'session-c': {
    inheritedEventCount: 0,
    events: [message(0, yesterday.getTime() + 3600000, usage(1000, 400), 'other', 'gpt-x')],
  },
}

const snapshots = [
  { header: { id: 'session-a', createdAt: now - 2000 }, revision: 'r1' },
  { header: { id: 'session-b', createdAt: now - 4000 }, revision: 'r2' },
  { header: { id: 'session-c', createdAt: now - 90000000 }, revision: 'r3' },
]

let readCount = 0
const ctx = {
  get(name) {
    if (name === 'sessionPersistence') return { list: async () => snapshots }
    if (name === 'sessionQuery') {
      return {
        readSession: async (id) => {
          readCount += 1
          return logs[id]
        },
      }
    }
    if (name === 'sessions') return { list: () => [] }
    if (name === 'deepseekAccount') {
      return {
        getState: async () => ({
          status: 'credential-stored',
          attempt: null,
          links: { usageUrl: 'https://platform.deepseek.com/usage', topUpUrl: 'https://platform.deepseek.com/top_up' },
        }),
        getBalance: async () => ({
          status: 'ready',
          value: [{ currency: 'CNY', balance: '12.5' }],
          bonusWallets: [{ currency: 'USD', balance: '1' }],
        }),
        getProfile: async () => ({ status: 'ready', value: { id: 'u1', name: 'Tester' } }),
      }
    }
    return undefined
  },
  inject(names, callback) {
    callback(this)
  },
  effect(callback) {
    const dispose = callback()
    return dispose
  },
  webServer: {
    register(route) {
      routes.push(route.path)
      handler = route.handler
      return () => {
        handler = null
      }
    },
  },
}

apply(ctx, {})

function call(path) {
  return new Promise((resolve) => {
    const req = { method: 'GET', url: path }
    const res = {
      statusCode: 0,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value
      },
      end(body) {
        resolve({ status: this.statusCode, body: JSON.parse(body) })
      },
    }
    handler(req, res)
  })
}

const first = await call('/api/token-account/overview?days=30')
console.log('routes', routes)
console.log('status', first.status)
const data = first.body
console.log('ok', data.ok)
console.log('today', data.today.date, data.today.total, data.today.requests)
console.log('yesterday', data.yesterday.date, data.yesterday.total)
console.log('totals', data.totals.total, data.totals.requests, 'cacheRead', data.totals.cacheRead)
console.log('window', data.window)
console.log('months', data.months.map((m) => `${m.key}:${m.total}/${m.activeDays}`).join(' '))
console.log('models', data.models.map((m) => `${m.model}:${m.total}`).join(' '))
console.log('account', data.account)
console.log('scan', data.scan)
console.log('dayRows', data.days.length, 'first', data.days[0].date, 'last', data.days[data.days.length - 1].date)

const again = await call('/api/token-account/overview?days=30')
console.log('second scan', again.body.scan, 'reads before/after', readCount)

if (data.today.date !== todayKey) throw new Error(`today key ${data.today.date} != ${todayKey}`)
if (data.yesterday.date !== yesterdayKey) throw new Error('yesterday key mismatch')
// session-a = 150 + 300 (80 of it cache read), session-b live = 37 (fork prefix excluded),
// session-c yesterday = 1400. Totals include cache reads, matching the provider total.
const expectedToday = 450 + 37
if (data.today.total !== expectedToday) throw new Error(`today total ${data.today.total} != ${expectedToday}`)
if (data.today.requests !== 3) throw new Error(`today requests ${data.today.requests} != 3`)
if (data.yesterday.total !== 1400) throw new Error(`yesterday total ${data.yesterday.total}`)
if (data.totals.total !== expectedToday + 1400) throw new Error(`totals ${data.totals.total}`)
if (data.totals.cacheRead !== 80) throw new Error(`cacheRead ${data.totals.cacheRead}`)
if (data.models.length !== 3) throw new Error(`models ${data.models.length}`)
if (data.account.wallets[0].balance !== '12.5') throw new Error('wallet missing')
if (data.days.length !== 30) throw new Error(`day rows ${data.days.length}`)
console.log('ALL ASSERTIONS PASSED')

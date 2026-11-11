/**
 * Host half of the Token & Account panel.
 *
 * The browser half renders the panel; this half owns the two data sources that
 * only the Host can reach:
 *
 *   1. `ctx.sessionQuery` — every committed session log carries the provider's
 *      `TokenUsage` on each `assistant/message` event, so folding those events
 *      is the account's token history as this machine recorded it.
 *   2. `ctx.deepseekAccount` — the signed-in Platform wallet balances.
 *
 * Both are exposed as one same-origin JSON route so the Client half needs no
 * credentials and no Harness Client package:
 *
 *   GET /api/token-account/overview?days=120
 *
 * Session logs are folded into per-day and per-model buckets once and cached
 * against the persistence revision, so a repeated view costs only a `list()`.
 * The first view of a large corpus is bounded by `scanBudgetMs`; the response
 * reports how many sessions are still pending and the panel asks again until
 * the fold is complete.
 */

const OVERVIEW_PATH = '/api/token-account/overview'

const DEFAULTS = {
  scanBudgetMs: 7000,
  maxSessions: 400,
  readConcurrency: 3,
  accountTtlMs: 30000,
  defaultDays: 120,
  maxDays: 366,
  clientVersion: '1.0.0',
}

const DAY_MS = 86400000

/** One per-session fold: local-day buckets plus per-model totals. */
const sessionCache = new Map()
/** Last successful account read, reused for `accountTtlMs`. */
const accountCache = { at: 0, value: null, key: '' }

function setting(config, name) {
  const value = config && config[name]
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  return DEFAULTS[name]
}

function localDayKey(ms) {
  const date = new Date(ms)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyBucket() {
  return { requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
}

function addUsage(bucket, usage) {
  bucket.requests += 1
  bucket.input += Number(usage.inputTokens) || 0
  bucket.output += Number(usage.outputTokens) || 0
  bucket.cacheRead += Number(usage.cacheReadTokens) || 0
  bucket.cacheWrite += Number(usage.cacheWriteTokens) || 0
  bucket.reasoning += Number(usage.reasoningTokens) || 0
  return bucket
}

/**
 * Total tokens the provider processed for one bucket.
 *
 * The adapter reports `inputTokens` as the prompt tokens NOT served from cache,
 * and `cacheReadTokens`/`cacheWriteTokens` beside it — its own `totalTokens`
 * equals the sum of those parts (verified against live session logs), so the
 * panel totals the components and stays correct when a provider omits the sum.
 */
function totalOf(bucket) {
  if (!bucket) return 0
  return bucket.input + bucket.output + bucket.cacheRead + bucket.cacheWrite
}

/**
 * Fold one session log into day/model buckets.
 *
 * `inheritedEventCount` is the number of events a fork copied from its source;
 * those copies already count for the source session, so the fold starts at the
 * first live seq to avoid double counting.
 */
function foldSession(log) {
  const days = new Map()
  const models = new Map()
  const start = Number(log.inheritedEventCount) || 0
  let earliest = null
  let latest = null

  for (const event of log.events || []) {
    if (event.type !== 'assistant/message') continue
    if (Number(event.seq) < start) continue
    const usage = event.data && event.data.usage
    if (!usage) continue
    const time = Number(event.time)
    if (!Number.isFinite(time)) continue

    const key = localDayKey(time)
    let bucket = days.get(key)
    if (!bucket) {
      bucket = emptyBucket()
      days.set(key, bucket)
    }
    addUsage(bucket, usage)

    const source = (event.data && event.data.message && event.data.message.source) || {}
    const provider = typeof source.provider === 'string' ? source.provider : 'unknown'
    const model = typeof source.model === 'string' ? source.model : 'unknown'
    const modelKey = `${provider}\u0000${model}`
    let modelBucket = models.get(modelKey)
    if (!modelBucket) {
      modelBucket = { provider, model, requests: 0, input: 0, output: 0, cacheRead: 0 }
      models.set(modelKey, modelBucket)
    }
    modelBucket.requests += 1
    modelBucket.input += Number(usage.inputTokens) || 0
    modelBucket.output += Number(usage.outputTokens) || 0
    modelBucket.cacheRead += Number(usage.cacheReadTokens) || 0

    if (earliest === null || time < earliest) earliest = time
    if (latest === null || time > latest) latest = time
  }

  return { days, models, earliest, latest }
}

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  const runners = []
  const width = Math.max(1, Math.min(limit, items.length))
  for (let index = 0; index < width; index += 1) {
    runners.push(
      (async () => {
        for (;;) {
          const current = cursor
          cursor += 1
          if (current >= items.length) return
          results[current] = await worker(items[current], current)
        }
      })(),
    )
  }
  await Promise.all(runners)
  return results
}

async function scanUsage(scope, config, maxDays) {
  const persistence = scope.get('sessionPersistence')
  const query = scope.get('sessionQuery')
  const started = Date.now()
  const scan = {
    sessions: 0,
    read: 0,
    cached: 0,
    failed: 0,
    pending: 0,
    truncated: false,
    elapsedMs: 0,
    available: Boolean(persistence && query),
  }
  if (!persistence || !query) return { days: new Map(), models: new Map(), scan }

  let snapshots
  try {
    snapshots = await persistence.list()
  } catch (error) {
    scan.failed = 1
    scan.error = error instanceof Error ? error.message : String(error)
    return { days: new Map(), models: new Map(), scan }
  }

  const sessions = scope.get('sessions')
  const liveIds = new Set((sessions ? sessions.list() : []).map((session) => session.id))

  const ordered = [...snapshots].sort((a, b) => (b.header?.createdAt || 0) - (a.header?.createdAt || 0))
  const maxSessions = Math.max(1, setting(config, 'maxSessions'))
  const selected = ordered.slice(0, maxSessions)
  scan.sessions = snapshots.length
  scan.truncated = ordered.length > selected.length

  const deadline = started + Math.max(0, setting(config, 'scanBudgetMs'))
  const limit = Math.max(1, setting(config, 'readConcurrency'))

  const rows = await mapWithLimit(selected, limit, async (snapshot) => {
    const id = snapshot.header ? snapshot.header.id : undefined
    if (!id) return null
    const revision = snapshot.revision
    const cached = sessionCache.get(id)
    const isLive = liveIds.has(id)
    if (cached && cached.revision === revision && !isLive) {
      scan.cached += 1
      return { id, fold: cached.fold, cached: true }
    }
    if (Date.now() > deadline && !cached) {
      scan.pending += 1
      return { id, fold: null, cached: false }
    }
    try {
      const log = await query.readSession(id)
      const fold = foldSession(log)
      sessionCache.set(id, { revision, fold })
      scan.read += 1
      return { id, fold, cached: false }
    } catch {
      scan.failed += 1
      return { id, fold: cached ? cached.fold : null, cached: Boolean(cached) }
    }
  })

  const days = new Map()
  const models = new Map()
  const keep = new Set()
  for (const row of rows) {
    if (!row) continue
    if (row.fold) keep.add(row.id)
    if (!row.fold) continue
    for (const [key, bucket] of row.fold.days) {
      let target = days.get(key)
      if (!target) {
        target = emptyBucket()
        days.set(key, target)
      }
      target.requests += bucket.requests
      target.input += bucket.input
      target.output += bucket.output
      target.cacheRead += bucket.cacheRead
      target.cacheWrite += bucket.cacheWrite
      target.reasoning += bucket.reasoning
    }
    for (const [key, bucket] of row.fold.models) {
      let target = models.get(key)
      if (!target) {
        target = { provider: bucket.provider, model: bucket.model, requests: 0, input: 0, output: 0, cacheRead: 0 }
        models.set(key, target)
      }
      target.requests += bucket.requests
      target.input += bucket.input
      target.output += bucket.output
      target.cacheRead += bucket.cacheRead
    }
  }

  // Cache entries for deleted sessions would otherwise accumulate forever.
  for (const id of sessionCache.keys()) {
    if (!keep.has(id) && !liveIds.has(id)) {
      const stillStored = ordered.some((snapshot) => snapshot.header && snapshot.header.id === id)
      if (!stillStored) sessionCache.delete(id)
    }
  }

  scan.elapsedMs = Date.now() - started
  scan.windowDays = maxDays
  return { days, models, scan }
}

async function readAccount(scope, config, ttlMs) {
  const account = scope.get('deepseekAccount')
  if (!account) return { status: 'unavailable', wallets: [], bonusWallets: [], links: null }

  const cacheKey = String(setting(config, 'accountTtlMs'))
  if (accountCache.value && accountCache.key === cacheKey && Date.now() - accountCache.at < ttlMs) {
    return accountCache.value
  }

  const client = {
    version: typeof config?.clientVersion === 'string' ? config.clientVersion : DEFAULTS.clientVersion,
    locale: Intl.DateTimeFormat().resolvedOptions().locale || 'en-US',
    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
  }

  let value
  try {
    const state = await account.getState()
    if (state.status !== 'credential-stored') {
      value = {
        status: 'signed-out',
        links: state.links || null,
        wallets: [],
        bonusWallets: [],
        profile: null,
      }
    } else {
      const [balance, profile] = await Promise.all([
        account.getBalance(client).catch(() => null),
        account.getProfile(client).catch(() => null),
      ])
      const readyBalance = balance && balance.status === 'ready' ? balance : null
      const readyProfile = profile && profile.status === 'ready' ? profile.value : null
      value = {
        status: 'signed-in',
        links: state.links || null,
        wallets: readyBalance ? readyBalance.value : [],
        bonusWallets: readyBalance ? readyBalance.bonusWallets : [],
        balanceStatus: balance ? balance.status : 'failed',
        profile: readyProfile ? { id: readyProfile.id, name: readyProfile.name } : null,
      }
    }
  } catch (error) {
    value = {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      wallets: [],
      bonusWallets: [],
      links: null,
      profile: null,
    }
  }

  accountCache.at = Date.now()
  accountCache.key = cacheKey
  accountCache.value = value
  return value
}

function dateRange(days) {
  const today = new Date()
  const end = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const list = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end - offset * DAY_MS)
    list.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
        date.getUTCDate(),
      ).padStart(2, '0')}`,
    )
  }
  return list
}

function bucketOut(bucket) {
  const value = bucket || emptyBucket()
  return {
    requests: value.requests,
    input: value.input,
    output: value.output,
    total: totalOf(value),
    cacheRead: value.cacheRead,
    cacheWrite: value.cacheWrite,
    reasoning: value.reasoning,
  }
}

function mergeBuckets(target, bucket) {
  target.requests += bucket.requests
  target.input += bucket.input
  target.output += bucket.output
  target.cacheRead += bucket.cacheRead
  target.cacheWrite += bucket.cacheWrite
  target.reasoning += bucket.reasoning
  return target
}

function sumDays(days, keys, monthKey) {
  const total = emptyBucket()
  for (const key of keys) {
    if (monthKey && key.slice(0, 7) !== monthKey) continue
    const bucket = days.get(key)
    if (bucket) mergeBuckets(total, bucket)
  }
  return total
}

function monthKeyOf(dateKey) {
  return dateKey.slice(0, 7)
}

function buildResponse({ days, models, scan, account, daysParam }) {
  const keys = dateRange(daysParam)
  const todayKey = keys[keys.length - 1]
  const yesterdayKey = keys[keys.length - 2]
  const currentMonth = monthKeyOf(todayKey)

  const dayRows = keys.map((key) => {
    const row = bucketOut(days.get(key))
    return { date: key, ...row }
  })

  const totals = bucketOut(sumDays(days, keys))

  const month = sumDays(days, keys, currentMonth)
  const monthActiveDays = keys.filter(
    (key) => monthKeyOf(key) === currentMonth && totalOf(days.get(key)) > 0,
  ).length
  const yesterday = sumDays(days, keys.filter((key) => key === yesterdayKey))

  const months = new Map()
  for (const row of dayRows) {
    const key = monthKeyOf(row.date)
    let entry = months.get(key)
    if (!entry) {
      entry = { key, total: 0, input: 0, output: 0, cacheRead: 0, requests: 0, activeDays: 0 }
      months.set(key, entry)
    }
    entry.total += row.total
    entry.input += row.input
    entry.output += row.output
    entry.cacheRead += row.cacheRead
    entry.requests += row.requests
    if (row.total > 0) entry.activeDays += 1
  }

  const modelRows = [...models.values()]
    .map((entry) => {
      const total = entry.input + entry.output + entry.cacheRead
      return {
        provider: entry.provider,
        model: entry.model,
        requests: entry.requests,
        input: entry.input,
        output: entry.output,
        cacheRead: entry.cacheRead,
        total,
      }
    })
    .filter((entry) => entry.total > 0 || entry.requests > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
    window: { days: daysParam, from: keys[0], to: todayKey },
    today: { date: todayKey, ...bucketOut(days.get(todayKey)) },
    yesterday: { date: yesterdayKey, ...bucketOut(yesterday) },
    currentMonth: { key: currentMonth, activeDays: monthActiveDays, ...bucketOut(month) },
    totals,
    days: dayRows,
    months: [...months.values()].sort((a, b) => (a.key < b.key ? 1 : -1)),
    models: modelRows,
    account,
    scan,
  }
}

function readDaysParam(req, config) {
  let raw = ''
  try {
    raw = new URL(req.url || '/', 'http://localhost').searchParams.get('days') || ''
  } catch {
    raw = ''
  }
  const parsed = Number.parseInt(raw, 10)
  const fallback = setting(config, 'defaultDays')
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), setting(config, 'maxDays'))
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(payload)
}

export function apply(ctx, config) {
  const settings = config || {}

  ctx.inject(['webServer'], (scope) => {
    scope.effect(() => {
      const dispose = scope.webServer.register({
        kind: 'exact',
        path: OVERVIEW_PATH,
        handler: async (req, res) => {
          if (req.method !== 'GET') {
            res.setHeader('Allow', 'GET')
            sendJson(res, 405, { ok: false, error: 'only GET is supported' })
            return
          }
          const days = readDaysParam(req, settings)
          try {
            const usage = await scanUsage(scope, settings, days)
            const account = await readAccount(scope, settings, setting(settings, 'accountTtlMs'))
            sendJson(res, 200, buildResponse({ ...usage, account, daysParam: days }))
          } catch (error) {
            sendJson(res, 500, {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        },
      })
      return () => dispose()
    }, 'token-account: usage overview route')
  })
}

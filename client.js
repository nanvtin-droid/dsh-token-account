window.__ModuleLoader__.load({
  id: '@local/dsh-token-account',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useState } = React

    const NS = 'token-account'
    const ENDPOINT = '/api/token-account/overview'
    const WINDOW_DAYS = 180
    const REFRESH_MS = 120000

    const zh = {
      title: '账号用量',
      subtitle: 'Token 消耗、钱包余额与每日用量总览',
      refresh: '刷新',
      refreshing: '刷新中',
      balance: '钱包余额',
      balanceUnavailable: '余额不可用',
      bonus: '赠送余额',
      today: '今日用量',
      month: '本月用量',
      window: '近期用量',
      total: 'Tokens',
      requests: '请求',
      input: '输入',
      output: '输出',
      cacheRead: '缓存命中',
      cacheWrite: '缓存写入',
      monthOverview: '月度每日用量',
      monthTotal: '月度合计',
      activeDays: '活跃天数',
      avgPerDay: '日均',
      peakDay: '峰值',
      daily: '每日明细',
      dailyHint: '最近 14 天',
      models: '模型分布',
      modelsHint: '按 Token 总量',
      date: '日期',
      tokens: '总量',
      noData: '这段时间没有可用量记录',
      loading: '正在汇总用量…',
      loadFailed: '读取用量失败',
      retry: '重试',
      signedIn: '已登录',
      signedOut: '未登录',
      signInHint: '在设置中登录 DeepSeek 账号后可查看余额',
      openUsage: '平台用量页',
      topUp: '充值',
      source: '数据来源：本地会话日志 + DeepSeek 平台余额',
      scanCached: '缓存命中',
      scanPending: '正在汇总',
      scanFailed: '读取失败',
      scanTruncated: '仅统计最近部分会话',
      sessions: '会话',
      updated: '更新于',
      prevMonth: '上一月',
      nextMonth: '下一月',
      legendInput: '输入',
      legendOutput: '输出',
      cacheRate: '缓存占输入',
      account: '账号',
      share: '占比',
      notAvailable: '—',
    }

    const en = {
      title: 'Usage & Balance',
      subtitle: 'Token spend, wallet balance, and a daily usage overview',
      refresh: 'Refresh',
      refreshing: 'Refreshing',
      balance: 'Wallet balance',
      balanceUnavailable: 'Balance unavailable',
      bonus: 'Bonus balance',
      today: 'Today',
      month: 'This month',
      window: 'Recent',
      total: 'Tokens',
      requests: 'Requests',
      input: 'Input',
      output: 'Output',
      cacheRead: 'Cache read',
      cacheWrite: 'Cache write',
      monthOverview: 'Daily usage by month',
      monthTotal: 'Month total',
      activeDays: 'Active days',
      avgPerDay: 'Daily average',
      peakDay: 'Peak day',
      daily: 'Daily detail',
      dailyHint: 'Last 14 days',
      models: 'Model breakdown',
      modelsHint: 'By total tokens',
      date: 'Date',
      tokens: 'Total',
      noData: 'No usage recorded for this period',
      loading: 'Folding usage…',
      loadFailed: 'Could not read usage',
      retry: 'Retry',
      signedIn: 'Signed in',
      signedOut: 'Signed out',
      signInHint: 'Sign in to DeepSeek in Settings to see the wallet balance',
      openUsage: 'Platform usage',
      topUp: 'Top up',
      source: 'Source: local session logs + DeepSeek Platform balance',
      scanCached: 'cached',
      scanPending: 'folding',
      scanFailed: 'failed',
      scanTruncated: 'recent sessions only',
      sessions: 'sessions',
      updated: 'Updated',
      prevMonth: 'Previous month',
      nextMonth: 'Next month',
      legendInput: 'Input',
      legendOutput: 'Output',
      cacheRate: 'Cache of input',
      account: 'Account',
      share: 'Share',
      notAvailable: '—',
    }

    const STYLE = `
.ta-root {
  --ta-bg: var(--dsw-alias-bg-base);
  --ta-card: var(--dsw-alias-bg-layer-1);
  --ta-card-2: var(--dsw-alias-bg-layer-2);
  --ta-text: var(--dsw-alias-label-primary);
  --ta-muted: var(--dsw-alias-label-secondary);
  --ta-dim: var(--dsw-alias-label-secondary);
  --ta-border: var(--dsw-alias-border-l1);
  --ta-border-strong: var(--dsw-alias-border-l2);
  --ta-brand: var(--dsw-alias-brand-primary);
  --ta-hover: var(--dsw-alias-bg-layer-2);
  --ta-up: var(--dsw-alias-state-error-primary);
  --ta-down: var(--dsw-alias-state-success-primary);
  --ta-warn: var(--dsw-alias-state-warn-primary);
  height: 100%;
  min-height: 100%;
  overflow-y: auto;
  background: var(--ta-bg);
  color: var(--ta-text);
  font-size: 14px;
  line-height: 1.5;
}
.ta-root *, .ta-root *::before, .ta-root *::after { box-sizing: border-box; }
.ta-shell { width: 100%; max-width: 1180px; margin: 0 auto; padding: 28px 30px 40px; }
.ta-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
.ta-head-copy { min-width: 0; }
.ta-kicker { color: var(--ta-brand); font-size: 10.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 6px; }
.ta-title { margin: 0; font-size: 26px; line-height: 1.2; font-weight: 650; letter-spacing: -.02em; }
.ta-subtitle { margin: 7px 0 0; color: var(--ta-muted); font-size: 13px; }
.ta-head-side { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; padding-top: 4px; }
.ta-pill { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border: 1px solid var(--ta-border); border-radius: 999px; background: var(--ta-card); color: var(--ta-muted); font-size: 11.5px; white-space: nowrap; }
.ta-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ta-dim); }
.ta-pill.is-ok .ta-dot { background: var(--ta-down); }
.ta-pill.is-bad .ta-dot { background: var(--ta-warn); }
.ta-pill.is-busy .ta-dot { background: var(--ta-brand); }
.ta-btn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 11px; border: 1px solid var(--ta-border); border-radius: 8px; background: var(--ta-card); color: var(--ta-text); font-size: 12px; font-family: inherit; cursor: pointer; text-decoration: none; }
.ta-btn:hover { background: var(--ta-hover); }
.ta-btn:disabled { opacity: .6; cursor: progress; }
.ta-btn.is-primary { border-color: transparent; background: var(--ta-brand); color: #fff; }
.ta-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
.ta-kpi { border: 1px solid var(--ta-border); border-radius: 12px; background: var(--ta-card); padding: 14px 15px 13px; min-width: 0; }
.ta-kpi-label { color: var(--ta-muted); font-size: 11.5px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
.ta-kpi-value { margin-top: 7px; font-size: 23px; font-weight: 640; letter-spacing: -.02em; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ta-kpi-value.is-small { font-size: 18px; }
.ta-kpi-sub { margin-top: 5px; color: var(--ta-dim); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ta-wallets { display: flex; flex-direction: column; gap: 3px; margin-top: 7px; }
.ta-wallet { display: flex; align-items: baseline; gap: 6px; font-variant-numeric: tabular-nums; }
.ta-wallet-value { font-size: 23px; font-weight: 640; letter-spacing: -.02em; white-space: nowrap; }
.ta-wallet-value.is-small { font-size: 18px; }
.ta-wallet-code { color: var(--ta-dim); font-size: 11px; }
.ta-wallet-note { color: var(--ta-muted); font-size: 15px; font-weight: 600; }
.ta-wallet-bonus { color: var(--ta-down); font-size: 11px; }
.ta-card { border: 1px solid var(--ta-border); border-radius: 12px; background: var(--ta-card); padding: 16px 17px 15px; min-width: 0; }
.ta-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.ta-card-title { margin: 0; font-size: 13.5px; font-weight: 620; }
.ta-card-hint { color: var(--ta-dim); font-size: 11.5px; }
.ta-month { margin-bottom: 14px; }
.ta-month-tools { display: flex; align-items: center; gap: 4px; }
.ta-icon-btn { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--ta-border); border-radius: 7px; background: transparent; color: var(--ta-muted); cursor: pointer; font-size: 12px; font-family: inherit; line-height: 1; }
.ta-icon-btn:hover:not(:disabled) { background: var(--ta-hover); color: var(--ta-text); }
.ta-icon-btn:disabled { opacity: .35; cursor: default; }
.ta-month-label { min-width: 72px; text-align: center; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.ta-chart { display: flex; gap: 12px; }
.ta-axis { display: flex; flex-direction: column; justify-content: space-between; width: 46px; padding-bottom: 18px; color: var(--ta-dim); font-size: 10px; text-align: right; font-variant-numeric: tabular-nums; }
.ta-plot { flex: 1; min-width: 0; }
.ta-bars { display: flex; align-items: flex-end; gap: 2px; height: 186px; border-bottom: 1px solid var(--ta-border); }
.ta-bar-col { flex: 1 1 0; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: stretch; }
.ta-bar-stack { display: flex; flex-direction: column-reverse; height: 100%; justify-content: flex-start; border-radius: 3px 3px 0 0; overflow: hidden; }
.ta-bar { width: 100%; min-height: 0; }
.ta-bar.is-in { background: var(--ta-brand); opacity: .62; }
.ta-bar.is-out { background: var(--ta-brand); }
.ta-bar.is-cache { background: var(--ta-brand); opacity: .26; }
.ta-bar.is-empty { height: 2px; background: var(--ta-border); border-radius: 1px; }
.ta-bar-col:hover .ta-bar.is-in { filter: brightness(1.12); }
.ta-bar-col:hover .ta-bar.is-out { filter: brightness(1.12); }
.ta-bar-labels { display: flex; gap: 2px; margin-top: 6px; }
.ta-bar-label { flex: 1 1 0; min-width: 0; text-align: center; color: var(--ta-dim); font-size: 9.5px; font-variant-numeric: tabular-nums; }
.ta-bar-label.is-weekend { color: var(--ta-muted); }
.ta-legend { display: flex; align-items: center; gap: 14px; color: var(--ta-muted); font-size: 11.5px; }
.ta-legend-item { display: inline-flex; align-items: center; gap: 5px; }
.ta-swatch { width: 9px; height: 9px; border-radius: 2px; }
.ta-swatch.is-in { background: var(--ta-brand); opacity: .62; }
.ta-swatch.is-out { background: var(--ta-brand); }
.ta-swatch.is-cache { background: var(--ta-brand); opacity: .26; }
.ta-month-foot { display: flex; flex-wrap: wrap; gap: 8px 26px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--ta-border); }
.ta-fact { display: flex; flex-direction: column; gap: 2px; }
.ta-fact-label { color: var(--ta-dim); font-size: 10.5px; }
.ta-fact-value { font-size: 13.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.ta-split { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 14px; }
.ta-table { width: 100%; border-collapse: collapse; font-size: 12px; font-variant-numeric: tabular-nums; }
.ta-table th { padding: 0 8px 7px; text-align: right; color: var(--ta-dim); font-weight: 500; font-size: 10.5px; white-space: nowrap; }
.ta-table th:first-child, .ta-table td:first-child { text-align: left; padding-left: 0; }
.ta-table td { padding: 6px 8px; border-top: 1px solid var(--ta-border); text-align: right; white-space: nowrap; }
.ta-table tbody tr:hover { background: var(--ta-hover); }
.ta-date { color: var(--ta-muted); }
.ta-total-cell { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
.ta-mini-bar { width: 46px; height: 4px; border-radius: 2px; background: var(--ta-border); overflow: hidden; flex: none; }
.ta-mini-bar span { display: block; height: 100%; border-radius: 2px; background: var(--ta-brand); }
.ta-models { display: flex; flex-direction: column; gap: 11px; }
.ta-model { display: flex; flex-direction: column; gap: 5px; }
.ta-model-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 12px; }
.ta-model-name { color: var(--ta-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ta-model-provider { color: var(--ta-dim); font-size: 10.5px; margin-left: 5px; }
.ta-model-value { color: var(--ta-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.ta-model-bar { height: 4px; border-radius: 2px; background: var(--ta-border); overflow: hidden; }
.ta-model-bar span { display: block; height: 100%; border-radius: 2px; background: var(--ta-brand); }
.ta-empty { padding: 26px 8px; text-align: center; color: var(--ta-dim); font-size: 12.5px; }
.ta-alert { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 12px; border: 1px solid var(--ta-border-strong); border-left: 3px solid var(--ta-warn); border-radius: 8px; background: var(--ta-card); color: var(--ta-text); font-size: 12.5px; }
.ta-alert-copy { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.ta-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin-top: 16px; color: var(--ta-dim); font-size: 11px; }
.ta-foot-sep { opacity: .5; }
.ta-link { color: var(--ta-brand); text-decoration: none; }
.ta-link:hover { text-decoration: underline; }
.ta-skeleton { height: 14px; border-radius: 4px; background: var(--ta-card-2); animation: ta-pulse 1.4s ease-in-out infinite; }
@keyframes ta-pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
@media (max-width: 980px) {
  .ta-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ta-split { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 620px) {
  .ta-shell { padding: 20px 16px 32px; }
  .ta-head { flex-direction: column; gap: 12px; }
  .ta-kpis { grid-template-columns: minmax(0, 1fr); }
  .ta-axis { display: none; }
  .ta-bar-label { font-size: 8px; }
}
`

    function formatInteger(value) {
      const number = Number(value) || 0
      return Math.round(number).toLocaleString('en-US')
    }

    /** Compact token counts: 1.2M / 15.3K, full precision stays in the title. */
    function formatTokens(value) {
      const number = Number(value) || 0
      if (number >= 1e9) return `${(number / 1e9).toFixed(2)}B`
      if (number >= 1e6) return `${(number / 1e6).toFixed(2)}M`
      if (number >= 1e4) return `${(number / 1e3).toFixed(1)}K`
      if (number >= 1e3) return `${(number / 1e3).toFixed(2)}K`
      return formatInteger(number)
    }

    function formatMoney(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return String(value)
      return number.toFixed(2)
    }

    const CURRENCY_SYMBOL = { CNY: '¥', USD: '$' }

    function money(value, currency) {
      return `${CURRENCY_SYMBOL[currency] || `${currency} `}${formatMoney(value)}`
    }

    function percent(part, whole) {
      if (!whole) return 0
      return Math.max(0, Math.min(100, (part / whole) * 100))
    }

    function monthLength(monthKey) {
      const [year, month] = monthKey.split('-').map((part) => Number(part))
      return new Date(year, month, 0).getDate()
    }

    function monthLabel(monthKey) {
      const [year, month] = monthKey.split('-').map((part) => Number(part))
      const date = new Date(year, month - 1, 1)
      try {
        return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long' }).format(date)
      } catch {
        return monthKey
      }
    }

    function weekday(dateKey) {
      const [year, month, day] = dateKey.split('-').map((part) => Number(part))
      return new Date(year, month - 1, day).getDay()
    }

    function PanelIcon(props) {
      const size = (props && props.size) || 16
      const color = props && props.active ? 'var(--dsw-alias-brand-primary)' : 'currentColor'
      return h(
        'svg',
        {
          viewBox: '0 0 20 20',
          width: size,
          height: size,
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block', color },
        },
        h('rect', {
          x: 2.4,
          y: 5.2,
          width: 15.2,
          height: 10.6,
          rx: 2.2,
          stroke: 'currentColor',
          strokeWidth: 1.5,
        }),
        h('path', {
          d: 'M2.4 8.6h15.2',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M13.1 11.6h1.9',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
      )
    }

    function IconRefresh(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 13,
          height: 13,
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block', transform: props && props.spinning ? 'rotate(180deg)' : 'none' },
        },
        h('path', {
          d: 'M13.2 7.1a5.2 5.2 0 1 0-1.5 4.2',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M13.4 3.4v3.9h-3.9',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function useOverview() {
      const [state, setState] = useState({ data: null, error: null, loading: true })

      const load = useCallback(async (signal) => {
        setState((previous) => ({ ...previous, loading: true }))
        try {
          const response = await fetch(`${ENDPOINT}?days=${WINDOW_DAYS}`, {
            cache: 'no-store',
            signal,
          })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const data = await response.json()
          if (!data || data.ok !== true) throw new Error((data && data.error) || 'invalid payload')
          setState({ data, error: null, loading: false })
        } catch (error) {
          if (error && error.name === 'AbortError') return
          setState((previous) => ({
            ...previous,
            error: (error && error.message) || String(error),
            loading: false,
          }))
        }
      }, [])

      useEffect(() => {
        const controller = new AbortController()
        load(controller.signal)
        const timer = setInterval(() => load(controller.signal), REFRESH_MS)
        return () => {
          controller.abort()
          clearInterval(timer)
        }
      }, [load])

      const pending = state.data && state.data.scan ? state.data.scan.pending : 0
      useEffect(() => {
        if (!(pending > 0)) return undefined
        const timer = setTimeout(() => load(), 1400)
        return () => clearTimeout(timer)
      }, [pending, load])

      return { ...state, reload: () => load() }
    }

    function StatusPill({ t, data, loading }) {
      const account = data ? data.account : null
      let tone = 'is-busy'
      let label = t('loading')
      if (!loading && data) {
        if (account && account.status === 'signed-in') {
          tone = 'is-ok'
          label = t('signedIn')
        } else if (account && account.status === 'signed-out') {
          tone = 'is-bad'
          label = t('signedOut')
        } else {
          tone = 'is-bad'
          label = t('balanceUnavailable')
        }
      }
      return h(
        'span',
        { className: `ta-pill ${tone}` },
        h('span', { className: 'ta-dot' }),
        label,
      )
    }

    function WalletCard({ t, data }) {
      const account = data ? data.account : null
      const wallets = (account && account.wallets) || []
      const bonuses = (account && account.bonusWallets) || []
      const note = (text) => h('div', { className: 'ta-wallet-note' }, text)
      let body
      if (!account || account.status === 'unavailable' || account.status === 'error') {
        body = [note(t('balanceUnavailable'))]
      } else if (account.status === 'signed-out') {
        body = [note(t('signedOut'))]
      } else if (wallets.length === 0 && bonuses.length === 0) {
        body = [note(t('balanceUnavailable'))]
      } else {
        body = wallets.map((wallet, index) =>
          h(
            'div',
            { key: `${wallet.currency}-${index}`, className: 'ta-wallet' },
            h(
              'span',
              { className: `ta-wallet-value${wallets.length > 1 ? ' is-small' : ''}` },
              money(wallet.balance, wallet.currency),
            ),
            h('span', { className: 'ta-wallet-code' }, wallet.currency),
          ),
        )
        for (const bonus of bonuses) {
          body.push(
            h(
              'div',
              { key: `bonus-${bonus.currency}`, className: 'ta-wallet-bonus' },
              `${t('bonus')} ${money(bonus.balance, bonus.currency)}`,
            ),
          )
        }
      }
      const profile = account && account.profile
      const sub =
        profile && profile.name
          ? `${t('account')}: ${profile.name}`
          : account && account.status === 'signed-out'
            ? t('signInHint')
            : ''
      return h(
        'div',
        { className: 'ta-kpi' },
        h('div', { className: 'ta-kpi-label' }, t('balance')),
        h('div', { className: 'ta-wallets' }, body),
        sub ? h('div', { className: 'ta-kpi-sub', title: sub }, sub) : null,
      )
    }

    function TokenKpi({ t, label, day, requests }) {
      const value = day ? day.total : 0
      return h(
        'div',
        { className: 'ta-kpi' },
        h('div', { className: 'ta-kpi-label' }, label),
        h(
          'div',
          { className: 'ta-kpi-value', title: fullTokens(t, value) },
          value > 0 ? formatTokens(value) : t('notAvailable'),
        ),
        h(
          'div',
          { className: 'ta-kpi-sub', title: label },
          `${t('input')} ${formatTokens(day ? day.input : 0)} · ${t('output')} ${formatTokens(
            day ? day.output : 0,
          )} · ${t('cacheRead')} ${formatTokens(day ? day.cacheRead : 0)}${
            requests ? ` · ${formatInteger(requests)} ${t('requests')}` : ''
          }`,
        ),
      )
    }

    function fullTokens(t, value) {
      return `${formatInteger(value)} ${t('total')}`
    }

    function MonthChart({ t, data, monthKey, onMonth }) {
      const months = data ? data.months || [] : []
      const keys = months.map((entry) => entry.key)
      const index = keys.indexOf(monthKey)
      const month = months.find((entry) => entry.key === monthKey) || null
      const byDate = useMemo(() => {
        const map = new Map()
        for (const row of (data && data.days) || []) map.set(row.date, row)
        return map
      }, [data])

      if (!data) return null
      const length = monthLength(monthKey)
      const bars = []
      let peak = 0
      for (let day = 1; day <= length; day += 1) {
        const dateKey = `${monthKey}-${String(day).padStart(2, '0')}`
        const row = byDate.get(dateKey) || { date: dateKey, total: 0, input: 0, output: 0, requests: 0 }
        peak = Math.max(peak, row.total)
        bars.push({ ...row, day })
      }
      const scale = peak > 0 ? peak : 1
      const monthTotal = month ? month.total : bars.reduce((sum, row) => sum + row.total, 0)
      const activeDays = month ? month.activeDays : 0
      const requestTotal = month ? month.requests : 0
      const cacheRate = percent(month ? month.cacheRead : 0, month ? month.input + month.cacheRead : 0)

      return h(
        'section',
        { className: 'ta-card ta-month' },
        h(
          'div',
          { className: 'ta-card-head' },
          h('h2', { className: 'ta-card-title' }, t('monthOverview')),
          h(
            'div',
            { className: 'ta-month-tools' },
            h(
              'button',
              {
                type: 'button',
                className: 'ta-icon-btn',
                'aria-label': t('prevMonth'),
                title: t('prevMonth'),
                disabled: index >= keys.length - 1 || index < 0,
                onClick: () => onMonth(keys[Math.min(index + 1, keys.length - 1)]),
              },
              '‹',
            ),
            h('span', { className: 'ta-month-label' }, monthLabel(monthKey)),
            h(
              'button',
              {
                type: 'button',
                className: 'ta-icon-btn',
                'aria-label': t('nextMonth'),
                title: t('nextMonth'),
                disabled: index <= 0,
                onClick: () => onMonth(keys[Math.max(index - 1, 0)]),
              },
              '›',
            ),
          ),
        ),
        h(
          'div',
          { className: 'ta-legend', style: { marginBottom: 10 } },
          h('span', { className: 'ta-legend-item' }, h('span', { className: 'ta-swatch is-cache' }), t('cacheRead')),
          h('span', { className: 'ta-legend-item' }, h('span', { className: 'ta-swatch is-in' }), t('legendInput')),
          h('span', { className: 'ta-legend-item' }, h('span', { className: 'ta-swatch is-out' }), t('legendOutput')),
          h('span', { className: 'ta-legend-item' }, `${t('peakDay')} ${formatTokens(peak)}`),
        ),
        h(
          'div',
          { className: 'ta-chart' },
          h(
            'div',
            { className: 'ta-axis' },
            h('span', {}, formatTokens(peak)),
            h('span', {}, formatTokens(peak / 2)),
            h('span', {}, '0'),
          ),
          h(
            'div',
            { className: 'ta-plot' },
            h(
              'div',
              { className: 'ta-bars' },
              bars.map((row) =>
                h(
                  'div',
                  {
                    key: row.date,
                    className: `ta-bar-col${row.total > 0 ? '' : ' is-empty'}`,
                    title: `${row.date} · ${t('tokens')} ${formatInteger(row.total)} · ${t('cacheRead')} ${formatInteger(
                      row.cacheRead,
                    )} · ${t('input')} ${formatInteger(row.input)} · ${t('output')} ${formatInteger(
                      row.output,
                    )} · ${t('requests')} ${formatInteger(row.requests)}`,
                  },
                  row.total > 0
                    ? h(
                        'div',
                        {
                          className: 'ta-bar-stack',
                          style: { height: `${Math.max(percent(row.total, scale), 1.5)}%` },
                        },
                        h('div', {
                          className: 'ta-bar is-cache',
                          style: { height: `${percent(row.cacheRead, row.total)}%` },
                        }),
                        h('div', {
                          className: 'ta-bar is-in',
                          style: { height: `${percent(row.input, row.total)}%` },
                        }),
                        h('div', {
                          className: 'ta-bar is-out',
                          style: { height: `${percent(row.output, row.total)}%` },
                        }),
                      )
                    : h('div', { className: 'ta-bar is-empty' }),
                ),
              ),
            ),
            h(
              'div',
              { className: 'ta-bar-labels' },
              bars.map((row) =>
                h(
                  'span',
                  {
                    key: `label-${row.date}`,
                    className: `ta-bar-label${weekday(row.date) === 0 || weekday(row.date) === 6 ? ' is-weekend' : ''}`,
                  },
                  String(row.day),
                ),
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'ta-month-foot' },
          h(
            'div',
            { className: 'ta-fact' },
            h('span', { className: 'ta-fact-label' }, t('monthTotal')),
            h('span', { className: 'ta-fact-value', title: fullTokens(t, monthTotal) }, formatTokens(monthTotal)),
          ),
          h(
            'div',
            { className: 'ta-fact' },
            h('span', { className: 'ta-fact-label' }, t('activeDays')),
            h('span', { className: 'ta-fact-value' }, `${activeDays}/${length}`),
          ),
          h(
            'div',
            { className: 'ta-fact' },
            h('span', { className: 'ta-fact-label' }, t('avgPerDay')),
            h(
              'span',
              { className: 'ta-fact-value' },
              formatTokens(activeDays > 0 ? Math.round(monthTotal / activeDays) : 0),
            ),
          ),
          h(
            'div',
            { className: 'ta-fact' },
            h('span', { className: 'ta-fact-label' }, t('requests')),
            h('span', { className: 'ta-fact-value' }, formatInteger(requestTotal)),
          ),
          h(
            'div',
            { className: 'ta-fact' },
            h('span', { className: 'ta-fact-label' }, t('cacheRate')),
            h('span', { className: 'ta-fact-value' }, `${cacheRate.toFixed(0)}%`),
          ),
        ),
      )
    }

    function DailyTable({ t, data }) {
      const rows = useMemo(() => {
        const days = (data && data.days) || []
        const slice = days.slice(-14).reverse()
        const peak = slice.reduce((max, row) => Math.max(max, row.total), 0)
        return slice.map((row) => ({ ...row, share: percent(row.total, peak) }))
      }, [data])

      return h(
        'section',
        { className: 'ta-card' },
        h(
          'div',
          { className: 'ta-card-head' },
          h('h2', { className: 'ta-card-title' }, t('daily')),
          h('span', { className: 'ta-card-hint' }, t('dailyHint')),
        ),
        rows.length === 0
          ? h('div', { className: 'ta-empty' }, t('noData'))
          : h(
              'table',
              { className: 'ta-table' },
              h(
                'thead',
                {},
                h(
                  'tr',
                  {},
                  h('th', {}, t('date')),
                  h('th', {}, t('total')),
                  h('th', {}, t('cacheRead')),
                  h('th', {}, t('input')),
                  h('th', {}, t('output')),
                  h('th', {}, t('requests')),
                ),
              ),
              h(
                'tbody',
                {},
                rows.map((row) =>
                  h(
                    'tr',
                    { key: row.date },
                    h('td', { className: 'ta-date' }, row.date.slice(5)),
                    h(
                      'td',
                      {},
                      h(
                        'span',
                        { className: 'ta-total-cell' },
                        h('span', { className: 'ta-mini-bar' }, h('span', { style: { width: `${row.share}%` } })),
                        h('span', { title: fullTokens(t, row.total) }, formatTokens(row.total)),
                      ),
                    ),
                    h('td', {}, formatTokens(row.cacheRead)),
                    h('td', {}, formatTokens(row.input)),
                    h('td', {}, formatTokens(row.output)),
                    h('td', {}, formatInteger(row.requests)),
                  ),
                ),
              ),
            ),
      )
    }

    function ModelList({ t, data }) {
      const models = (data && data.models) || []
      const peak = models.reduce((max, row) => Math.max(max, row.total), 0)
      return h(
        'section',
        { className: 'ta-card' },
        h(
          'div',
          { className: 'ta-card-head' },
          h('h2', { className: 'ta-card-title' }, t('models')),
          h('span', { className: 'ta-card-hint' }, t('modelsHint')),
        ),
        models.length === 0
          ? h('div', { className: 'ta-empty' }, t('noData'))
          : h(
              'div',
              { className: 'ta-models' },
              models.map((row) =>
                h(
                  'div',
                  { key: `${row.provider}-${row.model}`, className: 'ta-model' },
                  h(
                    'div',
                    { className: 'ta-model-top' },
                    h(
                      'span',
                      { className: 'ta-model-name', title: `${row.provider} / ${row.model}` },
                      row.model,
                      h('span', { className: 'ta-model-provider' }, row.provider),
                    ),
                    h(
                      'span',
                      {
                        className: 'ta-model-value',
                        title: `${formatInteger(row.total)} · ${t('cacheRead')} ${formatInteger(
                          row.cacheRead,
                        )} · ${t('input')} ${formatInteger(row.input)} · ${t('output')} ${formatInteger(
                          row.output,
                        )} · ${formatInteger(row.requests)} ${t('requests')}`,
                      },
                      formatTokens(row.total),
                    ),
                  ),
                  h('div', { className: 'ta-model-bar' }, h('span', { style: { width: `${percent(row.total, peak)}%` } })),
                ),
              ),
            ),
      )
    }

    function AccountLinks({ t, data }) {
      const account = data ? data.account : null
      const links = account && account.links
      const nodes = []
      if (links && links.usageUrl) {
        nodes.push(
          h(
            'a',
            { key: 'usage', className: 'ta-btn', href: links.usageUrl, target: '_blank', rel: 'noreferrer' },
            t('openUsage'),
          ),
        )
      }
      if (links && links.topUpUrl) {
        nodes.push(
          h(
            'a',
            { key: 'topup', className: 'ta-btn', href: links.topUpUrl, target: '_blank', rel: 'noreferrer' },
            t('topUp'),
          ),
        )
      }
      return nodes.length > 0 ? nodes : null
    }

    function Panel({ t }) {
      const { data, error, loading, reload } = useOverview()
      const [monthKey, setMonthKey] = useState(null)

      useEffect(() => {
        if (!data || !data.months || data.months.length === 0) return
        setMonthKey((current) => (current && data.months.some((entry) => entry.key === current) ? current : data.months[0].key))
      }, [data])

      const scan = data ? data.scan : null
      const pending = scan ? scan.pending : 0
      const updated = data ? new Date(data.generatedAt) : null

      const footParts = []
      if (data) {
        footParts.push(t('source'))
        if (scan) {
          footParts.push(`${t('sessions')} ${formatInteger(scan.cached + scan.read)}/${formatInteger(scan.sessions)}`)
          if (scan.pending > 0) footParts.push(`${t('scanPending')} ${scan.pending}`)
          if (scan.failed > 0) footParts.push(`${t('scanFailed')} ${scan.failed}`)
          if (scan.truncated) footParts.push(t('scanTruncated'))
        }
        if (updated && !Number.isNaN(updated.getTime())) {
          footParts.push(`${t('updated')} ${updated.toLocaleTimeString()}`)
        }
      }

      const alert = error
        ? h(
            'div',
            { className: 'ta-alert', role: 'alert' },
            h('span', { className: 'ta-alert-copy' }, `${t('loadFailed')}: ${error}`),
            h('button', { type: 'button', className: 'ta-btn', onClick: reload }, t('retry')),
          )
        : null

      return h(
        'div',
        { className: 'ta-root' },
        h('style', { key: 'ta-style' }, STYLE),
        h(
          'div',
          { className: 'ta-shell' },
          h(
            'header',
            { className: 'ta-head' },
            h(
              'div',
              { className: 'ta-head-copy' },
              h('div', { className: 'ta-kicker' }, data && data.timeZone ? data.timeZone : 'DeepSeek'),
              h('h1', { className: 'ta-title' }, t('title')),
              h('p', { className: 'ta-subtitle' }, t('subtitle')),
            ),
            h(
              'div',
              { className: 'ta-head-side' },
              h(StatusPill, { t, data, loading }),
              data ? h(AccountLinks, { t, data }) : null,
              h(
                'button',
                {
                  type: 'button',
                  className: 'ta-btn is-primary',
                  onClick: reload,
                  disabled: loading,
                  title: t('refresh'),
                },
                h(IconRefresh, { spinning: loading }),
                loading ? t('refreshing') : t('refresh'),
              ),
            ),
          ),
          alert,
          !data
            ? h(
                'div',
                { className: 'ta-card' },
                h('div', { className: 'ta-empty' }, loading ? t('loading') : t('noData')),
              )
            : h(
                'div',
                {},
                h(
                  'div',
                  { className: 'ta-kpis' },
                  h(WalletCard, { t, data }),
                  h(TokenKpi, { t, label: t('today'), day: data.today, requests: data.today.requests }),
                  h(TokenKpi, {
                    t,
                    label: t('month'),
                    day: data.currentMonth,
                    requests: data.currentMonth.requests,
                  }),
                  h(TokenKpi, {
                    t,
                    label: `${t('window')} (${data.window.days}d)`,
                    day: data.totals,
                    requests: data.totals.requests,
                  }),
                ),
                monthKey ? h(MonthChart, { t, data, monthKey, onMonth: setMonthKey }) : null,
                h('div', { className: 'ta-split' }, h(DailyTable, { t, data }), h(ModelList, { t, data })),
              ),
          h(
            'footer',
            { className: 'ta-foot' },
            footParts.map((part, index) =>
              h(
                React.Fragment,
                { key: `foot-${index}` },
                index > 0 ? h('span', { className: 'ta-foot-sep' }, '·') : null,
                h('span', {}, part),
              ),
            ),
            pending > 0
              ? h('span', { className: 'ta-pill is-busy' }, h('span', { className: 'ta-dot' }), `${t('scanPending')} ${pending}`)
              : null,
          ),
        ),
      )
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'token-account: dictionaries')
      const t = ctx.locale.bind(NS)

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: 'token-account',
            order: 3,
            label: () => t('title'),
            locale: NS,
          },
          PanelIcon,
        ),
      )

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: 'token-account',
            locale: NS,
          },
          () => h(Panel, { t }),
        ),
      )
    }

    return { inject: ['slots', 'locale'], apply }
  },
})

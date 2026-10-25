import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { isTenant } from '../../lib/jwt'
import { getRoleLabel } from '../../lib/constants'
import Badge from '../../components/ui/Badge'
import { formatBRL } from '../../lib/money'
import { statusVariant } from '../processes/status-variant'
import { categoryLabel } from '../finance/expense-category'
import type { DashboardData, DashboardStatusSlice } from '../../lib/api'
import { getDashboard } from './dashboard.api'
import './Dashboard.css'

// Cores das fatias (temáticas, acompanham o modo claro/escuro). O maior status
// fica no azul principal.
const DONUT_COLORS = [
  'var(--primary)',
  'var(--warning)',
  'var(--success)',
  'var(--destructive)',
  'var(--info)',
  'var(--secondary)',
]

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="ui-card dash-kpi">
      <span className="dash-kpi-label">{label}</span>
      <span className={`dash-kpi-value${accent ? ' is-accent' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function StatusDonut({ slices }: { slices: DashboardStatusSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.count, 0)
  if (total === 0) {
    return <p className="ui-empty">Nenhum processo cadastrado ainda.</p>
  }

  const r = 70
  const sw = 26
  const c = 2 * Math.PI * r

  // Offset de cada fatia = soma das fatias anteriores (sem mutar estado no render).
  const segs = slices.map((slice, i) => {
    const before = slices
      .slice(0, i)
      .reduce((sum, s) => sum + s.count, 0)
    return {
      len: (slice.count / total) * c,
      o: (before / total) * c,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      slice,
    }
  })

  return (
    <div className="dash-donut">
      <svg
        viewBox="0 0 180 180"
        className="dash-donut-svg"
        role="img"
        aria-label="Processos por status"
      >
        <g transform="rotate(-90 90 90)">
          {segs.map((g, i) => (
            <circle
              key={g.slice.statusId}
              className="dash-donut-slice"
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={g.color}
              strokeWidth={sw}
              strokeDashoffset={-g.o}
              style={{
                strokeDasharray: `${g.len} ${c - g.len}`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </g>
        <text x="90" y="86" textAnchor="middle" className="dash-donut-total">
          {total}
        </text>
        <text x="90" y="104" textAnchor="middle" className="dash-donut-cap">
          processos
        </text>
      </svg>
      <ul className="dash-legend">
        {segs.map((g) => (
          <li key={g.slice.statusId}>
            <span
              className="dash-legend-dot"
              style={{ background: g.color }}
            />
            <span className="dash-legend-label">{g.slice.description}</span>
            <span className="dash-legend-value">{g.slice.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const tenant = user && isTenant(user) ? user : null

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getDashboard()
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error ? e.message : 'Erro ao carregar o dashboard.',
        )
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="dashboard">
      <div className="ui-card">
        <h2 className="page-title">Bem-vindo(a), {user?.login}!</h2>
        <div className="dashboard-meta">
          <p className="page-subtitle">
            {tenant?.companyName
              ? `${tenant.companyName} · `
              : `Empresa ${tenant?.companyId} · `}
            {tenant ? getRoleLabel(tenant.role) : ''}
          </p>
          {tenant && (
            <Badge variant={tenant.role === 'ADMIN' ? 'info' : 'neutral'}>
              {tenant.role}
            </Badge>
          )}
        </div>
      </div>

      {loading && (
        <div className="ui-card">
          <div className="dash-loading">
            <span className="ui-spinner" />
            Carregando…
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="ui-card">
          <p className="ui-alert ui-alert--error" role="alert">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="dash-kpis">
            <KpiCard
              label="Processos em aberto"
              value={String(data.openProcesses)}
            />
            <KpiCard
              label="Encerrados no mês"
              value={String(data.closedThisMonth)}
            />
            <KpiCard
              label="Ganho no mês"
              value={formatBRL(data.earnedThisMonth)}
              accent
            />
            <KpiCard
              label="Clientes ativos"
              value={String(data.activeClients)}
            />
            <KpiCard
              label="Valor em curso"
              value={formatBRL(data.amountInProgress)}
              accent
            />
            {data.finance && (
              <KpiCard
                label="Despesa do mês"
                value={formatBRL(data.finance.expensesThisMonth)}
              />
            )}
          </div>

          <div className="dash-columns">
            <div className="ui-card dash-col">
              <h3 className="dash-card-title">Processos por status</h3>
              <StatusDonut slices={data.processesByStatus} />
            </div>

            <div className="ui-card dash-col">
              <h3 className="dash-card-title">Atividade recente</h3>
              {data.recentActivity.length === 0 ? (
                <p className="ui-empty">Nenhuma movimentação ainda.</p>
              ) : (
                <ul className="dash-activity">
                  {data.recentActivity.map((a) => (
                    <li key={a.id}>
                      <div className="dash-activity-main">
                        <span className="dash-activity-proc">
                          {a.process.name}
                        </span>
                        <Badge variant={statusVariant(a.status.description)}>
                          {a.status.description}
                        </Badge>
                      </div>
                      <div className="dash-activity-meta">
                        {a.user.name} · {formatDateTime(a.changedAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {data.finance && data.finance.byCategory.length > 0 && (
            <div className="ui-card">
              <h3 className="dash-card-title">
                Despesas do mês por categoria
              </h3>
              <ul className="dash-cat">
                {data.finance.byCategory.map((cat) => (
                  <li key={cat.category}>
                    <span className="dash-cat-label">
                      {categoryLabel(cat.category)}
                    </span>
                    <span className="dash-cat-value">
                      {formatBRL(cat.totalAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Dashboard

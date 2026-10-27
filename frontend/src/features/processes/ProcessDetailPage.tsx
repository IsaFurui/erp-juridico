import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { formatBRL } from '../../lib/money'
import { APP_ROUTES } from '../../lib/constants'
import type { ProcessDetail, ProcessStatus } from '../../lib/api'
import { getProcess, listProcessStatuses } from './processes.api'
import { statusVariant } from './status-variant'
import ProcessFormModal from './ProcessFormModal'
import ProcessStatusModal from './ProcessStatusModal'
import './ProcessDetailPage.css'

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('pt-BR')
}

function toNumber(value: string | null): number {
  return Number(value ?? 0)
}

function ProcessDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const processId = Number(id)

  const [process, setProcess] = useState<ProcessDetail | null>(null)
  const [statuses, setStatuses] = useState<ProcessStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [editOpen, setEditOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  useEffect(() => {
    listProcessStatuses()
      .then(setStatuses)
      .catch(() => {
        /* a lista de status fica vazia; a página ainda mostra o processo */
      })
  }, [])

  useEffect(() => {
    // id inválido é tratado no corpo do componente, sem setState aqui.
    if (Number.isNaN(processId)) return

    let cancelled = false
    getProcess(processId)
      .then((data) => {
        if (cancelled) return
        setProcess(data)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar o processo.',
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [processId, reloadKey])

  const refresh = () => setReloadKey((k) => k + 1)

  if (Number.isNaN(processId)) {
    return (
      <div>
        <button
          type="button"
          className="detail-back"
          onClick={() => navigate(APP_ROUTES.processes)}
        >
          <Icon name="processes" size={14} />
          Voltar para Processos
        </button>
        <p className="ui-alert ui-alert--error" role="alert">
          Processo inválido.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="ui-card">
        <div className="detail-loading">
          <span className="ui-spinner" />
          Carregando…
        </div>
      </div>
    )
  }

  if (error || !process) {
    return (
      <div>
        <button
          type="button"
          className="detail-back"
          onClick={() => navigate(APP_ROUTES.processes)}
        >
          <Icon name="processes" size={14} />
          Voltar para Processos
        </button>
        <p className="ui-alert ui-alert--error" role="alert">
          {error ?? 'Processo não encontrado.'}
        </p>
      </div>
    )
  }

  const derived = toNumber(process.fixedAmount) + toNumber(process.expectedAmount)
  // Compara em centavos: evita falso "ajustado" por ponto flutuante
  // (ex.: 0,10 + 0,20 !== 0,30 em JS).
  const adjusted =
    process.status.isFinal &&
    Math.round(toNumber(process.totalAmount) * 100) !== Math.round(derived * 100)

  return (
    <div>
      <button
        type="button"
        className="detail-back"
        onClick={() => navigate(APP_ROUTES.processes)}
      >
        <Icon name="processes" size={14} />
        Voltar para Processos
      </button>

      <div className="detail-head">
        <div className="detail-head-info">
          <div className="detail-code">{process.code}</div>
          <h1 className="detail-name">{process.name}</h1>
          <Badge variant={statusVariant(process.status.description)}>
            {process.status.description}
          </Badge>
        </div>
        <div className="detail-actions">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Editar dados
          </Button>
          <Button size="sm" onClick={() => setStatusOpen(true)}>
            Mudar status
          </Button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="ui-card detail-panel">
            <h2 className="detail-panel-title">Dados do processo</h2>
            <dl className="detail-kv">
              <dt>Cliente</dt>
              <dd>{process.client.name}</dd>
              <dt>Tipo</dt>
              <dd>{process.type.name}</dd>
              <dt>Subtipo</dt>
              <dd>{process.subtype?.name ?? '—'}</dd>
              <dt>Responsável</dt>
              <dd>{process.responsible?.name ?? '—'}</dd>
              <dt>Aberto em</dt>
              <dd>{formatDate(process.createdAt)}</dd>
            </dl>
          </section>

          <section className="ui-card detail-panel">
            <h2 className="detail-panel-title">Valores</h2>
            <div className="detail-money">
              <div className="detail-money-row">
                <span className="lbl">Entrada</span>
                <span className="val">{formatBRL(process.fixedAmount)}</span>
              </div>
              <div className="detail-money-row">
                <span className="lbl">Êxito esperado</span>
                <span className="val">{formatBRL(process.expectedAmount)}</span>
              </div>
              <div className="detail-money-row total">
                <span className="lbl">Total</span>
                <span className="val">
                  {formatBRL(process.totalAmount)}
                  {adjusted && <span className="adjusted">ajustado</span>}
                </span>
              </div>
            </div>
            {adjusted && (
              <p className="detail-money-note">
                Total ajustado no encerramento. A soma de Entrada + Esperado era{' '}
                {formatBRL(derived)}.
              </p>
            )}
          </section>
        </div>

        <section className="ui-card detail-panel">
          <h2 className="detail-panel-title">Histórico de status</h2>
          {process.statusHistory.length === 0 ? (
            <p className="ui-empty">Sem histórico ainda.</p>
          ) : (
            <ol className="timeline">
              {process.statusHistory.map((h, index) => (
                <li
                  key={h.id}
                  className={`tl-item${index === 0 ? ' current' : ''}`}
                >
                  <span className="tl-date">{formatDate(h.changedAt)}</span>
                  <span className="tl-status">{h.status.description}</span>
                  <span className="tl-who">
                    {h.user.name}
                    {h.note ? ` · ${h.note}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {editOpen && (
        <ProcessFormModal
          opened={editOpen}
          initial={process}
          statuses={statuses}
          onClose={() => setEditOpen(false)}
          onSaved={refresh}
        />
      )}

      {statusOpen && (
        <ProcessStatusModal
          opened={statusOpen}
          process={process}
          statuses={statuses}
          onClose={() => setStatusOpen(false)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

export default ProcessDetailPage

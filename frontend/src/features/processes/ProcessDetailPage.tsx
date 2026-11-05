import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { formatBRL } from '../../lib/money'
import { APP_ROUTES } from '../../lib/constants'
import type { ProcessDetail, ProcessStatus } from '../../lib/api'
import { getProcess, listProcessStatuses, syncProcess } from './processes.api'
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

function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

function toNumber(value: string | null): number {
  return Number(value ?? 0)
}

// Junta os complementosTabelados num texto curto (ex.: "designada · instrução").
function complementText(complements: unknown): string {
  if (!Array.isArray(complements)) return ''
  return complements
    .map((c) =>
      c && typeof c === 'object' && 'nome' in c
        ? String((c as { nome: unknown }).nome ?? '')
        : '',
    )
    .filter(Boolean)
    .join(' · ')
}

// Linha de rodapé do movimento: órgão julgador + complementos.
function movementDetail(m: ProcessDetail['movements'][number]): string {
  return [m.court, complementText(m.complements)].filter(Boolean).join(' · ')
}

// Texto do estado da última consulta ao DataJud.
function syncStateLabel(p: ProcessDetail): string {
  switch (p.datajudSyncStatus) {
    case 'SYNCED':
      return p.datajudSyncedAt
        ? `Sincronizado em ${formatDateTime(p.datajudSyncedAt)}.`
        : 'Sincronizado.'
    case 'NOT_FOUND':
      return 'Não encontrado na base pública — pode estar em sigilo ou ainda não ter sido carregado.'
    case 'ERROR':
      return 'A última consulta falhou. Vamos tentar de novo automaticamente.'
    default:
      return 'Ainda não sincronizado com o DataJud.'
  }
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

  // Sincronização sob demanda: dispara (202) e faz polling do processo até o
  // estado mudar, porque a consulta ao DataJud leva ~40s.
  const [syncing, setSyncing] = useState(false)
  const mountedRef = useRef(true)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

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

  const handleSync = async () => {
    if (!process || syncing) return
    setSyncing(true)
    // nextSyncAt muda em qualquer desfecho (SYNCED/NOT_FOUND/ERROR), então é o
    // sinal mais confiável de que a consulta terminou.
    const beforeNext = process.datajudNextSyncAt
    const beforeStatus = process.datajudSyncStatus
    const pid = process.id

    try {
      await syncProcess(pid)
    } catch {
      if (mountedRef.current) setSyncing(false)
      return
    }

    const deadline = Date.now() + 90_000
    const poll = () => {
      pollRef.current = setTimeout(() => {
        getProcess(pid)
          .then((fresh) => {
            if (!mountedRef.current) return
            const done =
              fresh.datajudNextSyncAt !== beforeNext ||
              fresh.datajudSyncStatus !== beforeStatus
            if (done || Date.now() > deadline) {
              setProcess(fresh)
              setSyncing(false)
            } else {
              poll()
            }
          })
          .catch(() => {
            if (!mountedRef.current) return
            if (Date.now() > deadline) setSyncing(false)
            else poll()
          })
      }, 4000)
    }
    poll()
  }

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
          <div className="detail-badges">
            <Badge variant={statusVariant(process.status.description)}>
              {process.status.description}
            </Badge>
            {process.confidentiality === 'CONFIDENTIAL' && (
              <Badge variant="warning">🔒 Sigiloso</Badge>
            )}
          </div>
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
              <dt>Sigilo</dt>
              <dd>
                {process.confidentiality === 'CONFIDENTIAL'
                  ? 'Sigiloso (segredo de justiça)'
                  : 'Público'}
              </dd>
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

          <section className="ui-card detail-panel">
            <div className="detail-datajud-head">
              <h2 className="detail-panel-title">Andamentos (DataJud)</h2>
              {process.confidentiality !== 'CONFIDENTIAL' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? 'Atualizando…' : 'Atualizar agora'}
                </Button>
              )}
            </div>

            {process.confidentiality === 'CONFIDENTIAL' ? (
              <p className="ui-empty">
                Monitoramento automático desativado (processo sigiloso). O
                acompanhamento é manual.
              </p>
            ) : (
              <>
                <p className="detail-datajud-state">
                  {syncStateLabel(process)}
                </p>

                {process.datajudMetadata && (
                  <dl className="detail-kv datajud-meta">
                    {process.datajudMetadata.classe && (
                      <>
                        <dt>Classe</dt>
                        <dd>{process.datajudMetadata.classe}</dd>
                      </>
                    )}
                    {process.datajudMetadata.assuntos.length > 0 && (
                      <>
                        <dt>Assuntos</dt>
                        <dd>{process.datajudMetadata.assuntos.join(', ')}</dd>
                      </>
                    )}
                    {process.datajudMetadata.orgaoJulgador && (
                      <>
                        <dt>Órgão atual</dt>
                        <dd>{process.datajudMetadata.orgaoJulgador}</dd>
                      </>
                    )}
                    {process.datajudMetadata.ajuizadoEm && (
                      <>
                        <dt>Ajuizado em</dt>
                        <dd>{formatDate(process.datajudMetadata.ajuizadoEm)}</dd>
                      </>
                    )}
                    {process.datajudMetadata.tribunal && (
                      <>
                        <dt>Tribunal</dt>
                        <dd>
                          {process.datajudMetadata.tribunal}
                          {process.datajudMetadata.grau
                            ? ` · ${process.datajudMetadata.grau}`
                            : ''}
                        </dd>
                      </>
                    )}
                  </dl>
                )}

                {process.movements.length === 0 ? (
                  <p className="ui-empty">Nenhum andamento importado ainda.</p>
                ) : (
                  <ol className="timeline">
                    {process.movements.map((m) => {
                      const detail = movementDetail(m)
                      return (
                        <li key={m.id} className="tl-item">
                          <span className="tl-date">
                            {formatDate(m.occurredAt)}
                          </span>
                          <span className="tl-status">{m.name}</span>
                          {detail && <span className="tl-who">{detail}</span>}
                        </li>
                      )
                    })}
                  </ol>
                )}
              </>
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

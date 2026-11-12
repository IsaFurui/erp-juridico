import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { formatBRL } from '../../lib/money'
import { formatProcessCode } from '../../lib/process-code'
import { processDetailPath } from '../../lib/constants'
import type {
  Client,
  Paginated,
  ProcessListItem,
  ProcessStatus,
  ProcessType,
} from '../../lib/api'
import { listClients } from '../clients/clients.api'
import {
  listProcesses,
  listProcessStatuses,
  listProcessTypes,
} from './processes.api'
import { statusVariant } from './status-variant'
import ProcessFormModal from './ProcessFormModal'
import './ProcessesPage.css'

const PAGE_SIZE = 12
const SEARCH_DEBOUNCE_MS = 350

function ProcessesPage() {
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [typeId, setTypeId] = useState<number | ''>('')
  const [clientId, setClientId] = useState<number | ''>('')
  const [reloadKey, setReloadKey] = useState(0)

  const [result, setResult] = useState<Paginated<ProcessListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statuses, setStatuses] = useState<ProcessStatus[]>([])
  const [types, setTypes] = useState<ProcessType[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [modalOpen, setModalOpen] = useState(false)

  // Opções dos filtros, carregadas uma vez.
  useEffect(() => {
    Promise.all([
      listProcessStatuses(),
      listProcessTypes(),
      listClients({ pageSize: 100 }),
    ])
      .then(([statusesResult, typesResult, clientsResult]) => {
        setStatuses(statusesResult)
        setTypes(typesResult)
        setClients(clientsResult.items)
      })
      .catch(() => {
        /* os filtros ficam vazios; a lista ainda funciona */
      })
  }, [])

  // Espera a digitação parar antes de bater na API.
  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false

    listProcesses({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      statusId: statusId === '' ? undefined : statusId,
      typeId: typeId === '' ? undefined : typeId,
      clientId: clientId === '' ? undefined : clientId,
    })
      .then((data) => {
        if (cancelled) return
        setResult(data)
        setError(null)
        setLoading(false)
        if (data.items.length === 0 && data.page > data.pages) {
          setPage(data.pages)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar processos.',
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, search, statusId, typeId, clientId, reloadKey])

  const processes = result?.items ?? []
  const total = result?.total ?? 0
  const pages = result?.pages ?? 1
  const isFiltered =
    search !== '' || statusId !== '' || typeId !== '' || clientId !== ''

  const resetToFirstPage = () => setPage(1)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Processos</h1>
          <p className="page-subtitle">
            Cadastre e acompanhe os processos do escritório.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Icon name="plus" size={16} />
          Novo processo
        </Button>
      </div>

      <div className="ui-card">
        <div className="processes-toolbar">
          <input
            type="search"
            className="ui-input processes-search"
            placeholder="Buscar por nome ou número"
            aria-label="Buscar processos"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              resetToFirstPage()
            }}
          />

          <select
            className="ui-input processes-filter"
            aria-label="Filtrar por status"
            value={statusId}
            onChange={(e) => {
              setStatusId(e.target.value === '' ? '' : Number(e.target.value))
              resetToFirstPage()
            }}
          >
            <option value="">Status: todos</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.description}
              </option>
            ))}
          </select>

          <select
            className="ui-input processes-filter"
            aria-label="Filtrar por tipo"
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value === '' ? '' : Number(e.target.value))
              resetToFirstPage()
            }}
          >
            <option value="">Tipo: todos</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            className="ui-input processes-filter"
            aria-label="Filtrar por cliente"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value === '' ? '' : Number(e.target.value))
              resetToFirstPage()
            }}
          >
            <option value="">Cliente: todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {total > 0 && (
            <span className="processes-count">
              {total} {total === 1 ? 'processo' : 'processos'}
            </span>
          )}
        </div>

        {loading && (
          <div className="processes-loading">
            <span className="ui-spinner" />
            Carregando…
          </div>
        )}

        {!loading && error && (
          <p className="ui-alert ui-alert--error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && processes.length === 0 && (
          <p className="ui-empty">
            {isFiltered
              ? 'Nenhum processo encontrado com esse filtro.'
              : 'Nenhum processo cadastrado ainda.'}
          </p>
        )}

        {!loading && !error && processes.length > 0 && (
          <div className="processes-grid">
            {processes.map((p) => (
              <button
                key={p.id}
                type="button"
                className="process-card"
                onClick={() => navigate(processDetailPath(p.id))}
              >
                <div className="process-card-top">
                  <span className="process-card-code">
                    {formatProcessCode(p.code)}
                  </span>
                  <span className="process-card-badges">
                    {p.confidentiality === 'CONFIDENTIAL' && (
                      <Badge variant="warning">🔒 Sigiloso</Badge>
                    )}
                    <Badge variant={statusVariant(p.status.description)}>
                      {p.status.description}
                    </Badge>
                  </span>
                </div>
                <div className="process-card-name">{p.name}</div>
                <div className="process-card-sub">
                  {p.client.name} · {p.type.name}
                </div>
                {p.responsible && (
                  <div className="process-card-resp">
                    Resp.: {p.responsible.name}
                  </div>
                )}
                <div className="process-card-money">
                  <div className="money-cell">
                    <span className="money-label">Entrada</span>
                    <span className="money-value">
                      {formatBRL(p.fixedAmount)}
                    </span>
                  </div>
                  <div className="money-cell">
                    <span className="money-label">Esperado</span>
                    <span className="money-value">
                      {formatBRL(p.expectedAmount)}
                    </span>
                  </div>
                  <div className="money-cell total">
                    <span className="money-label">Total</span>
                    <span className="money-value">
                      {formatBRL(p.totalAmount)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && pages > 1 && (
          <nav className="processes-pagination" aria-label="Paginação">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="processes-page-info">
              Página {page} de {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Próxima
            </Button>
          </nav>
        )}
      </div>

      {modalOpen && (
        <ProcessFormModal
          opened={modalOpen}
          initial={null}
          statuses={statuses}
          onClose={() => setModalOpen(false)}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  )
}

export default ProcessesPage

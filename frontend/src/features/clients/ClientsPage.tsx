import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { useAuth } from '../../contexts/AuthContext'
import { isTenant } from '../../lib/jwt'
import { formatCpfCnpj, documentKind } from '../../lib/document'
import type { Client, Paginated } from '../../lib/api'
import { listClients, deactivateClient, activateClient } from './clients.api'
import ClientFormModal from './ClientFormModal'
import './ClientsPage.css'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 350

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('pt-BR')
}

function ClientsPage() {
  const { user } = useAuth()
  // A rota é de escritório (TenantRoute); a sessão da plataforma não tem role
  // nem empresa, então nunca é ADMIN aqui.
  const isAdmin = user !== null && isTenant(user) && user.role === 'ADMIN'

  // Vindo da busca global (?q=nome), a lista já abre filtrada.
  const [searchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get('q') ?? '',
  )
  const [search, setSearch] = useState(
    () => searchParams.get('q')?.trim() ?? '',
  )
  const [page, setPage] = useState(1)
  const [showInactive, setShowInactive] = useState(false)
  // Muda sempre que uma escrita acontece, para a listagem ser buscada de novo
  // em vez de remendada na mão — com busca e paginação, remendar erra o total.
  const [reloadKey, setReloadKey] = useState(0)

  const [result, setResult] = useState<Paginated<Client> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

    listClients({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      includeInactive: isAdmin && showInactive,
    })
      .then((data) => {
        if (cancelled) return
        setResult(data)
        setError(null)
        setLoading(false)
        // A última página pode ter sumido depois de inativar o único item.
        if (data.items.length === 0 && data.page > data.pages) {
          setPage(data.pages)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar clientes.',
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, search, showInactive, isAdmin, reloadKey])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

  const clients = result?.items ?? []
  const total = result?.total ?? 0
  const pages = result?.pages ?? 1
  const isFiltered = search !== '' || showInactive

  const refresh = () => setReloadKey((key) => key + 1)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (target: Client) => {
    setEditing(target)
    setModalOpen(true)
  }

  const handleSaved = () => refresh()

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    setPage(1)
  }

  const handleShowInactiveChange = (value: boolean) => {
    setShowInactive(value)
    setPage(1)
  }

  const handleDeactivate = async (target: Client) => {
    try {
      await deactivateClient(target.id)
      refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao inativar cliente.',
      )
    }
  }

  const handleActivate = async (target: Client) => {
    try {
      await activateClient(target.id)
      refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao reativar cliente.',
      )
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Cadastre e gerencie os clientes.</p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" size={16} />
          Novo cliente
        </Button>
      </div>

      <div className="ui-card">
        <div className="clients-toolbar">
          <input
            type="search"
            className="ui-input clients-search"
            placeholder="Buscar por nome ou CPF/CNPJ"
            aria-label="Buscar clientes"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />

          {isAdmin && (
            <label className="clients-toggle">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => handleShowInactiveChange(e.target.checked)}
              />
              Mostrar inativos
            </label>
          )}

          {total > 0 && (
            <span className="clients-count">
              {total} {total === 1 ? 'cliente' : 'clientes'}
            </span>
          )}
        </div>

        {loading && (
          <div className="clients-loading">
            <span className="ui-spinner" />
            Carregando…
          </div>
        )}

        {!loading && error && (
          <p className="ui-alert ui-alert--error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && clients.length === 0 && (
          <p className="ui-empty">
            {isFiltered
              ? 'Nenhum cliente encontrado com esse filtro.'
              : 'Nenhum cliente cadastrado ainda.'}
          </p>
        )}

        {!loading && !error && clients.length > 0 && (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF / CNPJ</th>
                <th>Cadastro</th>
                <th>Status</th>
                {isAdmin && <th aria-label="Ações" />}
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <span className="clients-doc">
                      {formatCpfCnpj(c.cpfCnpj)}
                      {documentKind(c.cpfCnpj) && (
                        <span className="clients-doc-kind">
                          {documentKind(c.cpfCnpj)}
                        </span>
                      )}
                    </span>
                  </td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td>
                    <Badge variant={c.active ? 'success' : 'neutral'}>
                      {c.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="clients-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(c)}
                      >
                        Editar
                      </Button>
                      {c.active ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeactivate(c)}
                        >
                          Inativar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(c)}
                        >
                          Ativar
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && pages > 1 && (
          <nav className="clients-pagination" aria-label="Paginação">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="clients-page-info">
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
        <ClientFormModal
          key={editing?.id ?? 'new'}
          opened={modalOpen}
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default ClientsPage

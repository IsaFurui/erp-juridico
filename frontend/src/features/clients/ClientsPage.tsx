import { useEffect, useState } from 'react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { useAuth } from '../../contexts/AuthContext'
import { formatCpfCnpj, documentKind } from '../../lib/document'
import type { Client } from '../../lib/api'
import { listClients, deactivateClient, activateClient } from './clients.api'
import ClientFormModal from './ClientFormModal'
import './ClientsPage.css'

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('pt-BR')
}

function ClientsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const run = async () => {
      try {
        const data = await listClients(isAdmin && showInactive)
        if (cancelled) return
        setClients(data)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar clientes.',
        )
        setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [isAdmin, showInactive])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (target: Client) => {
    setEditing(target)
    setModalOpen(true)
  }

  const handleSaved = (saved: Client) => {
    setClients((prev) => {
      const exists = prev.some((c) => c.id === saved.id)
      return exists
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev]
    })
  }

  const handleDeactivate = async (target: Client) => {
    try {
      await deactivateClient(target.id)
      setClients((prev) =>
        showInactive
          ? prev.map((c) =>
              c.id === target.id ? { ...c, active: false } : c,
            )
          : prev.filter((c) => c.id !== target.id),
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao inativar cliente.',
      )
    }
  }

  const handleActivate = async (target: Client) => {
    try {
      const updated = await activateClient(target.id)
      setClients((prev) =>
        prev.map((c) => (c.id === target.id ? updated : c)),
      )
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
        {isAdmin && (
          <div className="clients-toolbar">
            <label className="clients-toggle">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Mostrar inativos
            </label>
          </div>
        )}

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
          <p className="ui-empty">Nenhum cliente cadastrado ainda.</p>
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

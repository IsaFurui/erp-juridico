import { useEffect, useState } from 'react'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import Icon from '../../../components/ui/Icon'
import { formatCnpj } from '../../../lib/cnpj'
import type { Company } from '../../../lib/api'
import { listCompanies, deactivateCompany } from './company.api'
import CompanyFormModal from './CompanyFormModal'
import './CompanyPage.css'

function CompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const data = await listCompanies()
        if (cancelled) return
        setCompanies(data)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar empresas.',
        )
        setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (target: Company) => {
    setEditing(target)
    setModalOpen(true)
  }

  const handleSaved = (saved: Company) => {
    setCompanies((prev) => {
      const exists = prev.some((c) => c.id === saved.id)
      return exists
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev]
    })
  }

  const handleDeactivate = async (target: Company) => {
    try {
      await deactivateCompany(target.id)
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === target.id ? { ...c, active: false } : c,
        ),
      )
    } catch {
      // silently ignore; could surface an alert
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Empresas</h1>
          <p className="page-subtitle">Cadastre e gerencie as empresas.</p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" size={16} />
          Nova empresa
        </Button>
      </div>

      <div className="ui-card">
        {loading && (
          <div className="companies-loading">
            <span className="ui-spinner" />
            Carregando…
          </div>
        )}

        {!loading && error && (
          <p className="ui-alert ui-alert--error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && companies.length === 0 && (
          <p className="ui-empty">Nenhuma empresa cadastrada ainda.</p>
        )}

        {!loading && !error && companies.length > 0 && (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Status</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{formatCnpj(c.cnpj)}</td>
                  <td>
                    <Badge variant={c.active ? 'success' : 'neutral'}>
                      {c.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="companies-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(c)}
                    >
                      Editar
                    </Button>
                    {c.active && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeactivate(c)}
                      >
                        Inativar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <CompanyFormModal
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

export default CompanyPage
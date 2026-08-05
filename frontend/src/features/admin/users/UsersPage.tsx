import { useEffect, useState } from 'react'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import Icon from '../../../components/ui/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { getRoleLabel } from '../../../lib/constants'
import type { User } from '../../../lib/api'
import { listUsers } from './users.api'
import UserFormModal from './UserFormModal'

const ROLE_BADGE: Record<string, 'info' | 'success' | 'neutral'> = {
  ADMIN: 'info',
  FINANCEIRO: 'success',
  OPERACIONAL: 'neutral',
}

function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const run = async () => {
      try {
        const data = await listUsers(user.companyId)
        if (cancelled) return
        setUsers(data)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar usuários.',
        )
        setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [user])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (target: User) => {
    setEditing(target)
    setModalOpen(true)
  }

  const handleSaved = (saved: User) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === saved.id)
      return exists
        ? prev.map((u) => (u.id === saved.id ? saved : u))
        : [saved, ...prev]
    })
  }

  if (!user) return null

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">
            Gerencie os acessos {user.companyName ? `de ${user.companyName}` : `da empresa ${user.companyId}`}.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" size={16} />
          Novo usuário
        </Button>
      </div>

      <div className="ui-card">
        {loading && (
          <div className="users-loading">
            <span className="ui-spinner" />
            Carregando…
          </div>
        )}

        {!loading && error && (
          <p className="ui-alert ui-alert--error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && (users ?? []).length === 0 && (
          <p className="ui-empty">Nenhum usuário cadastrado ainda.</p>
        )}

        {!loading && !error && (users ?? []).length > 0 && (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login</th>
                <th>Perfil</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.login}</td>
                  <td>
                    <Badge variant={ROLE_BADGE[u.role] ?? 'neutral'}>
                      {getRoleLabel(u.role)}
                    </Badge>
                  </td>
                  <td className="users-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(u)}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <UserFormModal
          key={editing?.id ?? 'new'}
          opened={modalOpen}
          initial={editing}
          companyId={user.companyId}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default UsersPage
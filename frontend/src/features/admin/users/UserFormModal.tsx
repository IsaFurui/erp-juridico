import { useState } from 'react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Modal from '../../../components/ui/Modal'
import type { UserRole } from '../../../lib/jwt'
import { createUser, updateUser } from './users.api'
import type { User, CreateUserPayload, UpdateUserPayload } from '../../../lib/api'
import './UserFormModal.css'

interface UserFormModalProps {
  opened: boolean
  initial: User | null
  /**
   * Só a sessão da plataforma informa: ela não tem empresa própria, então
   * precisa dizer em qual escritório o usuário está sendo criado. Para um
   * ADMIN fica indefinido e o backend usa a empresa do token.
   */
  companyId?: number
  onClose: () => void
  onSaved: (user: User) => void
}

interface FormState {
  name: string
  login: string
  password: string
  role: UserRole
}

function UserFormModal({
  opened,
  initial,
  companyId,
  onClose,
  onSaved,
}: UserFormModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          name: initial.name,
          login: initial.login,
          password: '',
          role: initial.role,
        }
      : {
          name: '',
          login: '',
          password: '',
          role: 'OPERACIONAL',
        },
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(initial)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) return setError('Informe o nome.')
    if (!form.login.trim()) return setError('Informe o login.')
    if (!isEditing && form.password.length < 6)
      return setError('A senha deve ter ao menos 6 caracteres.')

    setSaving(true)
    try {
      if (isEditing && initial) {
        const payload: UpdateUserPayload = {
          name: form.name.trim(),
          role: form.role,
        }
        const updated = await updateUser(initial.id, payload)
        onSaved(updated)
      } else {
        const payload: CreateUserPayload = {
          name: form.name.trim(),
          login: form.login.trim(),
          password: form.password,
          role: form.role,
          ...(companyId !== undefined && { companyId }),
        }
        const created = await createUser(payload)
        onSaved(created)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
      setSaving(false)
    }
  }

  return (
    <Modal
      open={opened}
      title={isEditing ? 'Editar usuário' : 'Novo usuário'}
      onClose={onClose}
    >
      <form className="user-form" onSubmit={handleSubmit}>
        <Input
          label="Nome"
          name="name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ex.: João Silva"
        />
        <Input
          label="Login"
          name="login"
          value={form.login}
          onChange={(e) => set('login', e.target.value)}
          placeholder="joao.silva"
          disabled={isEditing}
        />
        {!isEditing && (
          <Input
            label="Senha"
            name="password"
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        )}
        <div className="ui-field">
          <label className="ui-field-label" htmlFor="role">
            Perfil
          </label>
          <select
            id="role"
            className="ui-input"
            value={form.role}
            onChange={(e) => set('role', e.target.value as UserRole)}
          >
            <option value="ADMIN">Administrador</option>
            <option value="FINANCEIRO">Financeiro</option>
            <option value="OPERACIONAL">Operacional</option>
          </select>
        </div>

        {error && (
          <p className="ui-alert ui-alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="ui-modal-footer">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default UserFormModal
import { useState } from 'react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import {
  formatCpfCnpj,
  isValidCpfCnpj,
  onlyDigits,
} from '../../lib/document'
import { createClient, updateClient } from './clients.api'
import type { Client } from '../../lib/api'
import './ClientFormModal.css'

interface ClientFormModalProps {
  opened: boolean
  initial: Client | null
  onClose: () => void
  onSaved: (client: Client) => void
}

function ClientFormModal({
  opened,
  initial,
  onClose,
  onSaved,
}: ClientFormModalProps) {
  const [name, setName] = useState(() => initial?.name ?? '')
  const [document, setDocument] = useState(() =>
    initial ? formatCpfCnpj(initial.cpfCnpj) : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(initial)

  const handleDocumentChange = (value: string) => {
    setDocument(formatCpfCnpj(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (name.trim().length < 2) return setError('Informe o nome do cliente.')
    if (!isValidCpfCnpj(document))
      return setError('CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.')

    setSaving(true)
    try {
      if (isEditing && initial) {
        const updated = await updateClient(initial.id, {
          name: name.trim(),
          cpfCnpj: onlyDigits(document),
        })
        onSaved(updated)
      } else {
        const created = await createClient({
          name: name.trim(),
          cpfCnpj: onlyDigits(document),
        })
        onSaved(created)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cliente.')
      setSaving(false)
    }
  }

  return (
    <Modal
      open={opened}
      title={isEditing ? 'Editar cliente' : 'Novo cliente'}
      onClose={onClose}
    >
      <form className="client-form" onSubmit={handleSubmit}>
        <Input
          label="Nome do cliente"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: João da Silva"
        />
        <Input
          label="CPF ou CNPJ"
          name="cpfCnpj"
          inputMode="numeric"
          value={document}
          onChange={(e) => handleDocumentChange(e.target.value)}
          placeholder="000.000.000-00"
        />

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

export default ClientFormModal

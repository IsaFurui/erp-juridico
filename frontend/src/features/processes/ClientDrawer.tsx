import { useState } from 'react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Drawer from '../../components/ui/Drawer'
import { formatCpfCnpj, isValidCpfCnpj, onlyDigits } from '../../lib/document'
import { createClient } from '../clients/clients.api'
import type { Client } from '../../lib/api'

interface ClientDrawerProps {
  open: boolean
  onClose: () => void
  onCreated: (client: Client) => void
}

// Cadastro rápido de cliente sem sair do formulário do processo. Ao salvar,
// devolve o cliente criado para o processo já selecioná-lo.
function ClientDrawer({ open, onClose, onCreated }: ClientDrawerProps) {
  const [name, setName] = useState('')
  const [document, setDocument] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setDocument('')
    setError(null)
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (name.trim().length < 2) return setError('Informe o nome do cliente.')
    if (!isValidCpfCnpj(document))
      return setError('CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.')

    setSaving(true)
    try {
      const created = await createClient({
        name: name.trim(),
        cpfCnpj: onlyDigits(document),
      })
      onCreated(created)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cliente.')
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} title="Novo cliente" onClose={handleClose}>
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
          onChange={(e) => setDocument(formatCpfCnpj(e.target.value))}
          placeholder="000.000.000-00"
        />

        {error && (
          <p className="ui-alert ui-alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="ui-modal-footer">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Criar e selecionar'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default ClientDrawer

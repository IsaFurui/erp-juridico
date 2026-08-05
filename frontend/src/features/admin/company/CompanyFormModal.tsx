import { useState } from 'react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Modal from '../../../components/ui/Modal'
import { formatCnpj, isValidCnpj, onlyDigits } from '../../../lib/cnpj'
import { createCompany, updateCompany } from './company.api'
import type { Company } from '../../../lib/api'
import './CompanyFormModal.css'

interface CompanyFormModalProps {
  opened: boolean
  initial: Company | null
  onClose: () => void
  onSaved: (company: Company) => void
}

function CompanyFormModal({
  opened,
  initial,
  onClose,
  onSaved,
}: CompanyFormModalProps) {
  const [name, setName] = useState(() => initial?.name ?? '')
  const [cnpj, setCnpj] = useState(() =>
    initial ? formatCnpj(initial.cnpj) : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(initial)

  const handleCnpjChange = (value: string) => {
    setCnpj(formatCnpj(onlyDigits(value)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (name.trim().length < 2) return setError('Informe o nome da empresa.')
    if (!isValidCnpj(cnpj)) return setError('CNPJ inválido (14 dígitos).')

    setSaving(true)
    try {
      if (isEditing && initial) {
        const updated = await updateCompany(initial.id, { name: name.trim() })
        onSaved(updated)
      } else {
        const created = await createCompany({
          name: name.trim(),
          cnpj: onlyDigits(cnpj),
        })
        onSaved(created)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar empresa.')
      setSaving(false)
    }
  }

  return (
    <Modal
      open={opened}
      title={isEditing ? 'Editar empresa' : 'Nova empresa'}
      onClose={onClose}
    >
      <form className="company-form" onSubmit={handleSubmit}>
        <Input
          label="Nome da empresa"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Escritório Silva & Associados"
        />
        <Input
          label="CNPJ"
          name="cnpj"
          inputMode="numeric"
          value={cnpj}
          onChange={(e) => handleCnpjChange(e.target.value)}
          placeholder="00.000.000/0000-00"
          disabled={isEditing}
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

export default CompanyFormModal
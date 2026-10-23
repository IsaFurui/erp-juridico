import { useState } from 'react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { parseBRLInput } from '../../lib/money'
import type { ProcessDetail, ProcessStatus } from '../../lib/api'
import { changeProcessStatus } from './processes.api'
import './ProcessFormModal.css'

interface ProcessStatusModalProps {
  opened: boolean
  process: ProcessDetail
  statuses: ProcessStatus[]
  onClose: () => void
  onSaved: () => void
}

function ProcessStatusModal({
  opened,
  process,
  statuses,
  onClose,
  onSaved,
}: ProcessStatusModalProps) {
  const [statusId, setStatusId] = useState<number>(process.status.id)
  const [totalInput, setTotalInput] = useState(process.totalAmount)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = statuses.find((s) => s.id === statusId)
  const isFinal = selected?.isFinal ?? false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await changeProcessStatus(process.id, {
        statusId,
        // Só o encerramento aceita Total manual.
        totalAmount: isFinal ? (parseBRLInput(totalInput) ?? undefined) : undefined,
        note: note.trim() === '' ? undefined : note.trim(),
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao mudar o status.')
      setSaving(false)
    }
  }

  return (
    <Modal open={opened} title="Mudar status" onClose={onClose}>
      <form className="process-form" onSubmit={handleSubmit}>
        <div className="ui-field">
          <label className="ui-field-label" htmlFor="status-select">
            Novo status
          </label>
          <select
            id="status-select"
            className="ui-input"
            value={statusId}
            onChange={(e) => setStatusId(Number(e.target.value))}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.description}
                {s.isFinal ? ' (encerramento)' : ''}
              </option>
            ))}
          </select>
        </div>

        {isFinal && (
          <Input
            label="Total final (R$)"
            name="totalAmount"
            inputMode="decimal"
            value={totalInput}
            onChange={(e) => setTotalInput(e.target.value)}
            placeholder="0,00"
          />
        )}

        <p className="process-form-hint">
          {isFinal
            ? 'O processo será encerrado. Confirme o Total que realmente entrou.'
            : 'Enquanto o processo não encerra, o Total segue calculado (Entrada + Esperado).'}
        </p>

        <Input
          label="Observação (opcional)"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex.: acordo homologado em audiência"
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
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ProcessStatusModal

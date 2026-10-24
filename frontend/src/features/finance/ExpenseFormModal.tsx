import { useState } from 'react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { parseBRLInput } from '../../lib/money'
import type { Expense, ExpenseCategory } from '../../lib/api'
import { CATEGORY_ORDER, categoryLabel } from './expense-category'
import { createExpense, updateExpense } from './finance.api'

interface ExpenseFormModalProps {
  opened: boolean
  initial: Expense | null
  onClose: () => void
  onSaved: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function ExpenseFormModal({
  opened,
  initial,
  onClose,
  onSaved,
}: ExpenseFormModalProps) {
  const isEditing = Boolean(initial)

  const [name, setName] = useState(() => initial?.name ?? '')
  const [amount, setAmount] = useState(() => initial?.amount ?? '')
  const [category, setCategory] = useState<ExpenseCategory>(
    () => initial?.category ?? 'OUTROS',
  )
  const [date, setDate] = useState(() => initial?.date?.slice(0, 10) ?? today())

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (name.trim().length < 2) return setError('Informe a descrição da despesa.')
    const value = parseBRLInput(amount)
    if (value === null || value < 0) return setError('Informe um valor válido.')
    if (!date) return setError('Informe a data da despesa.')

    setSaving(true)
    try {
      if (isEditing && initial) {
        await updateExpense(initial.id, {
          name: name.trim(),
          amount: value,
          category,
          date,
        })
      } else {
        await createExpense({ name: name.trim(), amount: value, category, date })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a despesa.')
      setSaving(false)
    }
  }

  return (
    <Modal
      open={opened}
      title={isEditing ? 'Editar despesa' : 'Nova despesa'}
      onClose={onClose}
    >
      <form className="expense-form" onSubmit={handleSubmit}>
        <Input
          label="Descrição"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Aluguel da sala 302"
        />

        <div className="expense-form-row">
          <Input
            label="Valor (R$)"
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
          <Input
            label="Data"
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="ui-field">
          <label className="ui-field-label" htmlFor="expense-category">
            Categoria
          </label>
          <select
            id="expense-category"
            className="ui-input"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
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
            {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Lançar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ExpenseFormModal

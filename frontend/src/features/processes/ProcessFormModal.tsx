import { useEffect, useState } from 'react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { parseBRLInput } from '../../lib/money'
import { useAuth } from '../../contexts/AuthContext'
import { isTenant } from '../../lib/jwt'
import type {
  Colleague,
  ProcessDetail,
  ProcessStatus,
  ProcessSubtype,
  ProcessType,
} from '../../lib/api'
import {
  createProcess,
  listColleagues,
  listProcessTypes,
  listSubtypes,
  updateProcess,
} from './processes.api'
import ClientPicker from './ClientPicker'
import ClientDrawer from './ClientDrawer'
import './ProcessFormModal.css'

interface ProcessFormModalProps {
  opened: boolean
  initial: ProcessDetail | null
  statuses: ProcessStatus[]
  onClose: () => void
  onSaved: () => void
}

function defaultStatusId(statuses: ProcessStatus[]): number | undefined {
  return (
    statuses.find((s) => s.description === 'Em andamento')?.id ??
    statuses.find((s) => !s.isFinal)?.id ??
    statuses[0]?.id
  )
}

function ProcessFormModal({
  opened,
  initial,
  statuses,
  onClose,
  onSaved,
}: ProcessFormModalProps) {
  const isEditing = Boolean(initial)

  // No cadastro, o responsável já vem como o próprio usuário (pode trocar).
  const { user } = useAuth()
  const currentUserId = user && isTenant(user) ? user.sub : undefined

  const [name, setName] = useState(() => initial?.name ?? '')
  const [code, setCode] = useState(() => initial?.code ?? '')
  const [clientId, setClientId] = useState<number | ''>(
    () => initial?.client.id ?? '',
  )
  const [typeId, setTypeId] = useState<number | ''>(
    () => initial?.type.id ?? '',
  )
  const [subtypeId, setSubtypeId] = useState<number | ''>(
    () => initial?.subtype?.id ?? '',
  )
  const [fixed, setFixed] = useState(() => initial?.fixedAmount ?? '')
  const [expected, setExpected] = useState(
    () => initial?.expectedAmount ?? '',
  )

  const [clientName, setClientName] = useState(
    () => initial?.client.name ?? '',
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [responsibleId, setResponsibleId] = useState<number | ''>(
    () => initial?.responsible?.id ?? currentUserId ?? '',
  )

  const [types, setTypes] = useState<ProcessType[]>([])
  const [subtypes, setSubtypes] = useState<ProcessSubtype[]>([])
  const [colleagues, setColleagues] = useState<Colleague[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carrega tipos e colegas uma vez. Os clientes vêm por busca no ClientPicker.
  useEffect(() => {
    let cancelled = false
    Promise.all([listProcessTypes(), listColleagues()])
      .then(([typesResult, colleaguesResult]) => {
        if (cancelled) return
        setTypes(typesResult)
        setColleagues(colleaguesResult)
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar os cadastros.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Combo dependente: os subtipos acompanham o tipo escolhido. O setState só
  // acontece no callback (nunca no corpo do efeito), por isso o tipo vazio
  // resolve uma lista vazia em vez de limpar direto.
  useEffect(() => {
    let cancelled = false
    const load =
      typeId === ''
        ? Promise.resolve<ProcessSubtype[]>([])
        : listSubtypes(typeId)
    load
      .then((result) => {
        if (cancelled) return
        setSubtypes(result)
        // Se o subtipo atual não pertence ao novo tipo, limpa a seleção.
        setSubtypeId((current) =>
          current !== '' && result.some((s) => s.id === current)
            ? current
            : '',
        )
      })
      .catch(() => {
        if (!cancelled) setSubtypes([])
      })
    return () => {
      cancelled = true
    }
  }, [typeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (name.trim().length < 2) return setError('Informe o nome do processo.')
    if (code.trim().length < 1) return setError('Informe o número do processo.')
    if (clientId === '') return setError('Selecione o cliente.')
    if (typeId === '') return setError('Selecione o tipo.')

    const fixedAmount = parseBRLInput(fixed) ?? undefined
    const expectedAmount = parseBRLInput(expected) ?? undefined

    setSaving(true)
    try {
      if (isEditing && initial) {
        await updateProcess(initial.id, {
          name: name.trim(),
          code: code.trim(),
          clientId,
          typeId,
          subtypeId: subtypeId === '' ? null : subtypeId,
          responsibleId: responsibleId === '' ? null : responsibleId,
          fixedAmount,
          expectedAmount,
        })
      } else {
        const statusId = defaultStatusId(statuses)
        if (statusId === undefined) {
          setSaving(false)
          return setError('Catálogo de status indisponível. Tente de novo.')
        }
        await createProcess({
          name: name.trim(),
          code: code.trim(),
          clientId,
          typeId,
          statusId,
          subtypeId: subtypeId === '' ? null : subtypeId,
          responsibleId: responsibleId === '' ? null : responsibleId,
          fixedAmount,
          expectedAmount,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar processo.')
      setSaving(false)
    }
  }

  return (
    <>
    <Modal
      open={opened}
      title={isEditing ? 'Editar processo' : 'Novo processo'}
      onClose={onClose}
    >
      <form className="process-form" onSubmit={handleSubmit}>
        <Input
          label="Nome do processo"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Ação trabalhista — Souza x Alfa"
        />
        <Input
          label="Número"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ex.: 1004567-89.2024.8.26.0100"
        />

        <div className="ui-field">
          <label className="ui-field-label">Cliente</label>
          <ClientPicker
            value={clientId}
            selectedName={clientName}
            onSelect={(c) => {
              setClientId(c.id)
              setClientName(c.name)
            }}
            onCreateNew={() => setDrawerOpen(true)}
          />
        </div>

        <div className="process-form-row">
          <div className="ui-field">
            <label className="ui-field-label" htmlFor="process-type">
              Tipo
            </label>
            <select
              id="process-type"
              className="ui-input"
              value={typeId}
              onChange={(e) =>
                setTypeId(e.target.value === '' ? '' : Number(e.target.value))
              }
            >
              <option value="">Selecione…</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ui-field">
            <label className="ui-field-label" htmlFor="process-subtype">
              Subtipo
            </label>
            <select
              id="process-subtype"
              className="ui-input"
              value={subtypeId}
              disabled={typeId === '' || subtypes.length === 0}
              onChange={(e) =>
                setSubtypeId(
                  e.target.value === '' ? '' : Number(e.target.value),
                )
              }
            >
              <option value="">
                {subtypes.length === 0 ? 'Sem subtipos' : 'Nenhum'}
              </option>
              {subtypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ui-field">
          <label className="ui-field-label" htmlFor="process-responsible">
            Advogado responsável
          </label>
          <select
            id="process-responsible"
            className="ui-input"
            value={responsibleId}
            onChange={(e) =>
              setResponsibleId(
                e.target.value === '' ? '' : Number(e.target.value),
              )
            }
          >
            <option value="">Sem responsável</option>
            {colleagues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="process-form-row">
          <Input
            label="Entrada (R$)"
            name="fixedAmount"
            inputMode="decimal"
            value={fixed}
            onChange={(e) => setFixed(e.target.value)}
            placeholder="0,00"
          />
          <Input
            label="Êxito esperado (R$)"
            name="expectedAmount"
            inputMode="decimal"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            placeholder="0,00"
          />
        </div>

        <p className="process-form-hint">
          O Total é calculado (Entrada + Esperado) e só pode ser ajustado ao
          encerrar o processo, pela ação “Mudar status”.
        </p>

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

    <ClientDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onCreated={(c) => {
        setClientId(c.id)
        setClientName(c.name)
        setDrawerOpen(false)
      }}
    />
    </>
  )
}

export default ProcessFormModal

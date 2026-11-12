import { useEffect, useState } from 'react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Modal from '../../../components/ui/Modal'
import Badge from '../../../components/ui/Badge'
import Icon from '../../../components/ui/Icon'
import type { ProcessStatus, ProcessSubtype, ProcessType } from '../../../lib/api'
import {
  createStatus,
  createSubtype,
  createType,
  listStatuses,
  listSubtypes,
  listTypes,
  removeStatus,
  removeSubtype,
  removeType,
  updateStatus,
  updateSubtype,
  updateType,
} from './catalogs.api'
import './CatalogsPage.css'

type Tab = 'status' | 'types' | 'subtypes'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocorreu um erro.'
}

/* ---------------- modal simples de nome (tipos e subtipos) --------------- */

function NameModal({
  title,
  label,
  initial,
  onClose,
  onSave,
}: {
  title: string
  label: string
  initial: string
  onClose: () => void
  onSave: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setError('Informe pelo menos 2 letras.')
    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim())
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal open title={title} onClose={onClose}>
      <form className="catalog-form" onSubmit={submit}>
        <Input
          label={label}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
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

/* ------------------------------ status ---------------------------------- */

function StatusModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: ProcessStatus | null
  onClose: () => void
  onSaved: () => void
}) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isFinal, setIsFinal] = useState(initial?.isFinal ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim().length < 2)
      return setError('Informe a descrição do status.')
    setSaving(true)
    setError(null)
    try {
      if (initial) {
        await updateStatus(initial.id, { description: description.trim(), isFinal })
      } else {
        await createStatus({ description: description.trim(), isFinal })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={initial ? 'Editar status' : 'Novo status'}
      onClose={onClose}
    >
      <form className="catalog-form" onSubmit={submit}>
        <Input
          label="Descrição"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoFocus
        />
        <label className="catalog-check">
          <input
            type="checkbox"
            checked={isFinal}
            onChange={(e) => setIsFinal(e.target.checked)}
          />
          Encerra o processo (destrava o Total para edição manual)
        </label>
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

function StatusSection() {
  const [items, setItems] = useState<ProcessStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProcessStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    listStatuses()
      .then((data) => {
        if (cancelled) return
        setItems(data)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(errorMessage(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const refresh = () => setReloadKey((k) => k + 1)

  const handleDelete = async (s: ProcessStatus) => {
    if (!window.confirm(`Excluir o status "${s.description}"?`)) return
    try {
      await removeStatus(s.id)
      refresh()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div>
      <div className="catalog-toolbar">
        <Button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Icon name="plus" size={16} />
          Novo status
        </Button>
      </div>

      {loading && <p className="ui-empty">Carregando…</p>}
      {!loading && error && (
        <p className="ui-alert ui-alert--error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && (
        <table className="ui-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Encerra?</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.description}</td>
                <td>
                  <Badge variant={s.isFinal ? 'success' : 'neutral'}>
                    {s.isFinal ? 'Encerra' : 'Em curso'}
                  </Badge>
                </td>
                <td className="catalog-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(s)
                      setModalOpen(true)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(s)}
                  >
                    Excluir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <StatusModal
          key={editing?.id ?? 'new'}
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

/* ------------------------------- tipos ---------------------------------- */

function TypeModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: ProcessType | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [defaultConfidential, setDefaultConfidential] = useState(
    initial?.defaultConfidential ?? false,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setError('Informe pelo menos 2 letras.')
    setSaving(true)
    setError(null)
    try {
      if (initial) {
        await updateType(initial.id, { name: name.trim(), defaultConfidential })
      } else {
        await createType(name.trim(), defaultConfidential)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal open title={initial ? 'Editar tipo' : 'Novo tipo'} onClose={onClose}>
      <form className="catalog-form" onSubmit={submit}>
        <Input
          label="Nome do tipo"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <label className="catalog-check">
          <input
            type="checkbox"
            checked={defaultConfidential}
            onChange={(e) => setDefaultConfidential(e.target.checked)}
          />
          Sigiloso por padrão (processos deste tipo nascem em segredo de justiça)
        </label>
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

function TypeSection() {
  const [items, setItems] = useState<ProcessType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [modal, setModal] = useState<ProcessType | 'new' | null>(null)

  useEffect(() => {
    let cancelled = false
    listTypes()
      .then((data) => {
        if (cancelled) return
        setItems(data)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(errorMessage(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const refresh = () => setReloadKey((k) => k + 1)

  const handleDelete = async (t: ProcessType) => {
    if (!window.confirm(`Excluir o tipo "${t.name}"?`)) return
    try {
      await removeType(t.id)
      refresh()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div>
      <div className="catalog-toolbar">
        <Button onClick={() => setModal('new')}>
          <Icon name="plus" size={16} />
          Novo tipo
        </Button>
      </div>

      {loading && <p className="ui-empty">Carregando…</p>}
      {!loading && error && (
        <p className="ui-alert ui-alert--error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && (
        <table className="ui-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Sigilo padrão</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>
                  <Badge variant={t.defaultConfidential ? 'warning' : 'neutral'}>
                    {t.defaultConfidential ? 'Sigiloso' : 'Público'}
                  </Badge>
                </td>
                <td className="catalog-actions">
                  <Button variant="outline" size="sm" onClick={() => setModal(t)}>
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(t)}
                  >
                    Excluir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <TypeModal
          key={modal === 'new' ? 'new' : modal.id}
          initial={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

/* ------------------------------ subtipos -------------------------------- */

function SubtypeSection() {
  const [types, setTypes] = useState<ProcessType[]>([])
  const [typeId, setTypeId] = useState<number | ''>('')
  const [items, setItems] = useState<ProcessSubtype[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [modal, setModal] = useState<ProcessSubtype | 'new' | null>(null)

  useEffect(() => {
    listTypes()
      .then(setTypes)
      .catch(() => setTypes([]))
  }, [])

  useEffect(() => {
    if (typeId === '') return
    let cancelled = false
    listSubtypes(typeId)
      .then((data) => {
        if (cancelled) return
        setItems(data)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(errorMessage(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [typeId, reloadKey])

  const refresh = () => setReloadKey((k) => k + 1)

  const handleDelete = async (s: ProcessSubtype) => {
    if (typeId === '') return
    if (!window.confirm(`Excluir o subtipo "${s.name}"?`)) return
    try {
      await removeSubtype(typeId, s.id)
      refresh()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div>
      <div className="catalog-toolbar">
        <select
          className="ui-input catalog-type-select"
          value={typeId}
          onChange={(e) => {
            const value = e.target.value
            if (value !== '') {
              setItems([])
              setLoading(true)
            }
            setTypeId(value === '' ? '' : Number(value))
          }}
        >
          <option value="">Escolha um tipo…</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Button disabled={typeId === ''} onClick={() => setModal('new')}>
          <Icon name="plus" size={16} />
          Novo subtipo
        </Button>
      </div>

      {typeId === '' && (
        <p className="ui-empty">Escolha um tipo para ver os subtipos.</p>
      )}
      {typeId !== '' && loading && <p className="ui-empty">Carregando…</p>}
      {typeId !== '' && !loading && error && (
        <p className="ui-alert ui-alert--error" role="alert">
          {error}
        </p>
      )}
      {typeId !== '' && !loading && !error && items.length === 0 && (
        <p className="ui-empty">Nenhum subtipo neste tipo ainda.</p>
      )}
      {typeId !== '' && !loading && !error && items.length > 0 && (
        <table className="ui-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="catalog-actions">
                  <Button variant="outline" size="sm" onClick={() => setModal(s)}>
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(s)}
                  >
                    Excluir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && typeId !== '' && (
        <NameModal
          title={modal === 'new' ? 'Novo subtipo' : 'Editar subtipo'}
          label="Nome do subtipo"
          initial={modal === 'new' ? '' : modal.name}
          onClose={() => setModal(null)}
          onSave={async (name) => {
            if (modal === 'new') await createSubtype(typeId, name)
            else await updateSubtype(typeId, modal.id, name)
            refresh()
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------- página --------------------------------- */

const TABS: { key: Tab; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'types', label: 'Tipos' },
  { key: 'subtypes', label: 'Subtipos' },
]

function CatalogsPage() {
  const [tab, setTab] = useState<Tab>('status')

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Catálogos</h1>
          <p className="page-subtitle">
            Status, tipos e subtipos de processo — compartilhados por todos os
            escritórios.
          </p>
        </div>
      </div>

      <div className="catalog-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`catalog-tab${tab === t.key ? ' is-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ui-card">
        {tab === 'status' && <StatusSection />}
        {tab === 'types' && <TypeSection />}
        {tab === 'subtypes' && <SubtypeSection />}
      </div>
    </div>
  )
}

export default CatalogsPage

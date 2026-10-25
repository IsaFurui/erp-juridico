import { useEffect, useState } from 'react'
import Icon from '../../components/ui/Icon'
import { listClients } from '../clients/clients.api'
import type { Client } from '../../lib/api'
import './ClientPicker.css'

interface ClientPickerProps {
  value: number | ''
  selectedName: string
  onSelect: (client: { id: number; name: string }) => void
  onCreateNew: () => void
  disabled?: boolean
}

// Seletor de cliente com busca: em vez de rolar um <select> gigante, digita o
// nome e a lista vem filtrada do backend.
function ClientPicker({
  value,
  selectedName,
  onSelect,
  onCreateNew,
  disabled,
}: ClientPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  // Busca com debounce enquanto a lista está aberta.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      listClients({ search: query.trim() || undefined, pageSize: 20 })
        .then((r) => {
          if (cancelled) return
          setResults(r.items)
          setLoading(false)
        })
        .catch(() => {
          if (cancelled) return
          setResults([])
          setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, query])

  const choose = (client: Client) => {
    onSelect({ id: client.id, name: client.name })
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="client-picker">
      <button
        type="button"
        className="client-picker-field"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className={
            selectedName ? 'client-picker-value' : 'client-picker-placeholder'
          }
        >
          {selectedName || 'Selecione o cliente'}
        </span>
        <Icon name="search" size={16} />
      </button>

      {open && (
        <>
          <div
            className="client-picker-backdrop"
            onClick={() => setOpen(false)}
          />
          <div className="client-picker-pop ui-pop">
            <input
              autoFocus
              className="ui-input client-picker-search"
              placeholder="Digite o nome do cliente…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="client-picker-list">
              {loading && (
                <li className="client-picker-hint">Buscando…</li>
              )}
              {!loading && results.length === 0 && (
                <li className="client-picker-hint">
                  Nenhum cliente encontrado.
                </li>
              )}
              {!loading &&
                results.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`client-picker-opt${
                        c.id === value ? ' is-selected' : ''
                      }`}
                      onClick={() => choose(c)}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
            </ul>
            <button
              type="button"
              className="client-picker-new"
              onClick={() => {
                setOpen(false)
                onCreateNew()
              }}
            >
              <Icon name="plus" size={14} />
              Cadastrar novo cliente
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ClientPicker

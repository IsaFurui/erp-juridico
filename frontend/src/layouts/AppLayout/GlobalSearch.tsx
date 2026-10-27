import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import { formatCpfCnpj } from '../../lib/document'
import { APP_ROUTES, processDetailPath } from '../../lib/constants'
import type { Client, ProcessListItem } from '../../lib/api'
import { listProcesses } from '../../features/processes/processes.api'
import { listClients } from '../../features/clients/clients.api'
import './GlobalSearch.css'

// Busca global do topo: processo (por nome/número) e cliente (por nome). O
// processo leva à página dele; o cliente, à lista já filtrada.
function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [processes, setProcesses] = useState<ProcessListItem[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const timer = setTimeout(() => {
      const q = query.trim()
      if (q.length < 2) {
        if (!cancelled) {
          setProcesses([])
          setClients([])
          setLoading(false)
        }
        return
      }
      setLoading(true)
      Promise.all([
        listProcesses({ search: q, pageSize: 5 }),
        listClients({ search: q, pageSize: 5 }),
      ])
        .then(([p, c]) => {
          if (cancelled) return
          setProcesses(p.items)
          setClients(c.items)
          setLoading(false)
        })
        .catch(() => {
          if (cancelled) return
          setProcesses([])
          setClients([])
          setLoading(false)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, open])

  const goProcess = (id: number) => {
    setOpen(false)
    setQuery('')
    navigate(processDetailPath(id))
  }

  const goClient = (name: string) => {
    setOpen(false)
    setQuery('')
    navigate(`${APP_ROUTES.clients}?q=${encodeURIComponent(name)}`)
  }

  const hasQuery = query.trim().length >= 2
  const empty =
    hasQuery && !loading && processes.length === 0 && clients.length === 0

  return (
    <div className="global-search">
      <div className="topbar-search">
        <Icon name="search" size={16} />
        <input
          type="search"
          placeholder="Buscar processo ou cliente…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          // Fecha depois do clique numa opção ter a chance de disparar.
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {open && hasQuery && (
        <div className="global-search-pop ui-pop">
          {loading && <p className="global-search-hint">Buscando…</p>}
          {empty && <p className="global-search-hint">Nada encontrado.</p>}

          {!loading && processes.length > 0 && (
            <div className="global-search-group">
              <p className="global-search-label">Processos</p>
              {processes.map((p) => (
                <button
                  key={`p${p.id}`}
                  type="button"
                  className="global-search-opt"
                  onClick={() => goProcess(p.id)}
                >
                  <span className="global-search-opt-main">{p.name}</span>
                  <span className="global-search-opt-sub">
                    {p.code} · {p.client.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && clients.length > 0 && (
            <div className="global-search-group">
              <p className="global-search-label">Clientes</p>
              {clients.map((c) => (
                <button
                  key={`c${c.id}`}
                  type="button"
                  className="global-search-opt"
                  onClick={() => goClient(c.name)}
                >
                  <span className="global-search-opt-main">{c.name}</span>
                  <span className="global-search-opt-sub">
                    {formatCpfCnpj(c.cpfCnpj)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GlobalSearch

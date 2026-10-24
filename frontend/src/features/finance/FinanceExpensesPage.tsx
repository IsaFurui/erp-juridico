import { useEffect, useState } from 'react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { formatBRL } from '../../lib/money'
import type {
  Expense,
  ExpenseCategory,
  ExpenseSummary,
  Paginated,
} from '../../lib/api'
import {
  CATEGORY_ORDER,
  categoryLabel,
  categoryVariant,
} from './expense-category'
import {
  deleteExpense,
  getExpensesSummary,
  listExpenses,
} from './finance.api'
import ExpenseFormModal from './ExpenseFormModal'
import './FinanceExpensesPage.css'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 350

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function FinanceExpensesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [result, setResult] = useState<Paginated<Expense> | null>(null)
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  // Espera a digitação parar antes de bater na API.
  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [searchInput])

  const filters = {
    search: search || undefined,
    category: category === '' ? undefined : category,
    from: from || undefined,
    to: to || undefined,
  }

  // Lista paginada.
  useEffect(() => {
    let cancelled = false

    listExpenses({ page, pageSize: PAGE_SIZE, ...filters })
      .then((data) => {
        if (cancelled) return
        setResult(data)
        setError(null)
        setLoading(false)
        if (data.items.length === 0 && data.page > data.pages) {
          setPage(data.pages)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar despesas.',
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, category, from, to, reloadKey])

  // Total do período — mesmos filtros, sem paginação.
  useEffect(() => {
    let cancelled = false
    getExpensesSummary(filters)
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, from, to, reloadKey])

  const expenses = result?.items ?? []
  const total = result?.total ?? 0
  const pages = result?.pages ?? 1
  const isFiltered =
    search !== '' || category !== '' || from !== '' || to !== ''

  const resetToFirstPage = () => setPage(1)
  const refresh = () => setReloadKey((k) => k + 1)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditing(expense)
    setModalOpen(true)
  }

  const handleDelete = async (target: Expense) => {
    if (!window.confirm(`Excluir a despesa "${target.name}"?`)) return
    try {
      await deleteExpense(target.id)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir a despesa.')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">
            Lance e acompanhe as despesas do escritório.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" size={16} />
          Nova despesa
        </Button>
      </div>

      {summary && (
        <div className="expenses-summary">
          <div className="expenses-summary-total">
            <span className="expenses-summary-label">
              {isFiltered ? 'Total do período' : 'Total lançado'}
            </span>
            <span className="expenses-summary-value">
              {formatBRL(summary.totalAmount)}
            </span>
            <span className="expenses-summary-count">
              {summary.count}{' '}
              {summary.count === 1 ? 'lançamento' : 'lançamentos'}
            </span>
          </div>
          {summary.byCategory.length > 0 && (
            <ul className="expenses-summary-breakdown">
              {summary.byCategory.map((c) => (
                <li key={c.category}>
                  <span className="expenses-summary-cat">
                    {categoryLabel(c.category)}
                  </span>
                  <span className="expenses-summary-cat-value">
                    {formatBRL(c.totalAmount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="ui-card">
        <div className="expenses-toolbar">
          <input
            type="search"
            className="ui-input expenses-search"
            placeholder="Buscar por descrição"
            aria-label="Buscar despesas"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              resetToFirstPage()
            }}
          />

          <select
            className="ui-input expenses-filter"
            aria-label="Filtrar por categoria"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as ExpenseCategory | '')
              resetToFirstPage()
            }}
          >
            <option value="">Categoria: todas</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>

          <label className="expenses-date-field">
            De
            <input
              type="date"
              className="ui-input expenses-date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                resetToFirstPage()
              }}
            />
          </label>
          <label className="expenses-date-field">
            Até
            <input
              type="date"
              className="ui-input expenses-date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                resetToFirstPage()
              }}
            />
          </label>

          {total > 0 && (
            <span className="expenses-count">
              {total} {total === 1 ? 'despesa' : 'despesas'}
            </span>
          )}
        </div>

        {loading && (
          <div className="expenses-loading">
            <span className="ui-spinner" />
            Carregando…
          </div>
        )}

        {!loading && error && (
          <p className="ui-alert ui-alert--error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && expenses.length === 0 && (
          <p className="ui-empty">
            {isFiltered
              ? 'Nenhuma despesa encontrada com esse filtro.'
              : 'Nenhuma despesa lançada ainda.'}
          </p>
        )}

        {!loading && !error && expenses.length > 0 && (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th className="expenses-amount-col">Valor</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="expenses-date-cell">{formatDate(e.date)}</td>
                  <td>{e.name}</td>
                  <td>
                    <Badge variant={categoryVariant(e.category)}>
                      {categoryLabel(e.category)}
                    </Badge>
                  </td>
                  <td className="expenses-amount-col">{formatBRL(e.amount)}</td>
                  <td className="expenses-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(e)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(e)}
                    >
                      Excluir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && pages > 1 && (
          <nav className="expenses-pagination" aria-label="Paginação">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="expenses-page-info">
              Página {page} de {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Próxima
            </Button>
          </nav>
        )}
      </div>

      {modalOpen && (
        <ExpenseFormModal
          key={editing?.id ?? 'new'}
          opened={modalOpen}
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

export default FinanceExpensesPage

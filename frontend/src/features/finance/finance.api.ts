import { expensesApi } from '../../lib/api'
import type {
  CreateExpensePayload,
  Expense,
  ExpenseSummary,
  ListExpensesParams,
  Paginated,
  UpdateExpensePayload,
} from '../../lib/api'

export function listExpenses(
  params: ListExpensesParams = {},
): Promise<Paginated<Expense>> {
  return expensesApi.listAll(params)
}

export function getExpensesSummary(
  params: ListExpensesParams = {},
): Promise<ExpenseSummary> {
  return expensesApi.summary(params)
}

export function createExpense(payload: CreateExpensePayload): Promise<Expense> {
  return expensesApi.create(payload)
}

export function updateExpense(
  id: number,
  payload: UpdateExpensePayload,
): Promise<Expense> {
  return expensesApi.update(id, payload)
}

export function deleteExpense(id: number): Promise<void> {
  return expensesApi.remove(id)
}

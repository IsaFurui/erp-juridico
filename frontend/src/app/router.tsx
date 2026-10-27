import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isPlatform } from '../lib/jwt'
import AppLayout from '../layouts/AppLayout/AppLayout'
import Login from '../features/auth/Login/Login'
import Dashboard from '../features/dashboard/Dashboard'
import UsersPage from '../features/admin/users/UsersPage'
import CompanyPage from '../features/admin/company/CompanyPage'
import ClientsPage from '../features/clients/ClientsPage'
import ProcessesPage from '../features/processes/ProcessesPage'
import ProcessDetailPage from '../features/processes/ProcessDetailPage'
import FinanceExpensesPage from '../features/finance/FinanceExpensesPage'
import SettingsPage from '../features/settings/SettingsPage'
import CatalogsPage from '../features/admin/catalogs/CatalogsPage'
import { APP_ROUTES } from '../lib/constants'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to={APP_ROUTES.login} replace />
  return children
}

// Administração de um escritório: o ADMIN dele, ou a plataforma agindo
// sobre ele (nesse caso a empresa vem na querystring).
function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to={APP_ROUTES.login} replace />
  const allowed = isPlatform(user) || user.role === 'ADMIN'
  if (!allowed) return <Navigate to={APP_ROUTES.dashboard} replace />
  return children
}

// O painel de empresas é da plataforma: lista e edita todos os escritórios.
// Um ADMIN administra apenas o próprio — o backend devolve 403.
function PlatformRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user || !isPlatform(user))
    return <Navigate to={APP_ROUTES.dashboard} replace />
  return children
}

// Telas de dado de escritório: a sessão da plataforma não tem empresa, então
// não tem o que mostrar aqui.
function TenantRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user || isPlatform(user))
    return <Navigate to={APP_ROUTES.companies} replace />
  return children
}

// O financeiro é só de ADMIN e FINANCEIRO; o OPERACIONAL cai no dashboard.
function FinanceRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user || isPlatform(user))
    return <Navigate to={APP_ROUTES.companies} replace />
  if (user.role !== 'ADMIN' && user.role !== 'FINANCEIRO')
    return <Navigate to={APP_ROUTES.dashboard} replace />
  return children
}

function AppRouter() {
  return (
    <Routes>
      <Route path={APP_ROUTES.login} element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path={APP_ROUTES.dashboard}
          element={
            <TenantRoute>
              <Dashboard />
            </TenantRoute>
          }
        />
        <Route
          path={APP_ROUTES.clients}
          element={
            <TenantRoute>
              <ClientsPage />
            </TenantRoute>
          }
        />
        <Route
          path={APP_ROUTES.processes}
          element={
            <TenantRoute>
              <ProcessesPage />
            </TenantRoute>
          }
        />
        <Route
          path={`${APP_ROUTES.processes}/:id`}
          element={
            <TenantRoute>
              <ProcessDetailPage />
            </TenantRoute>
          }
        />
        <Route
          path={APP_ROUTES.finance}
          element={
            <FinanceRoute>
              <FinanceExpensesPage />
            </FinanceRoute>
          }
        />

        <Route
          path={APP_ROUTES.users}
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path={APP_ROUTES.companies}
          element={
            <PlatformRoute>
              <CompanyPage />
            </PlatformRoute>
          }
        />
        <Route
          path={APP_ROUTES.settings}
          element={
            <TenantRoute>
              <SettingsPage />
            </TenantRoute>
          }
        />
        <Route
          path={APP_ROUTES.catalogs}
          element={
            <PlatformRoute>
              <CatalogsPage />
            </PlatformRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={APP_ROUTES.dashboard} replace />} />
    </Routes>
  )
}

export default AppRouter
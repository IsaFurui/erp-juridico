import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AppLayout from '../layouts/AppLayout/AppLayout'
import Login from '../features/auth/Login/Login'
import Dashboard from '../features/dashboard/Dashboard'
import UsersPage from '../features/admin/users/UsersPage'
import CompanyPage from '../features/admin/company/CompanyPage'
import ClientsPage from '../features/clients/ClientsPage'
import { APP_ROUTES } from '../lib/constants'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to={APP_ROUTES.login} replace />
  return children
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'ADMIN') return <Navigate to={APP_ROUTES.dashboard} replace />
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
        <Route path={APP_ROUTES.dashboard} element={<Dashboard />} />
        <Route path={APP_ROUTES.clients} element={<ClientsPage />} />
        <Route path={APP_ROUTES.processes} element={<ComingSoon title="Processos" />} />
        <Route path={APP_ROUTES.finance} element={<ComingSoon title="Financeiro" />} />

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
            <AdminRoute>
              <CompanyPage />
            </AdminRoute>
          }
        />
        <Route
          path={APP_ROUTES.settings}
          element={
            <AdminRoute>
              <ComingSoon title="Configurações" />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={APP_ROUTES.dashboard} replace />} />
    </Routes>
  )
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="ui-card">
      <h2 className="page-title">{title}</h2>
      <p className="ui-empty">Módulo em construção.</p>
    </div>
  )
}

export default AppRouter
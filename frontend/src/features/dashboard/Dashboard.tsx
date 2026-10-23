import { useAuth } from '../../contexts/AuthContext'
import { isTenant } from '../../lib/jwt'
import { getRoleLabel } from '../../lib/constants'
import Badge from '../../components/ui/Badge'

function Dashboard() {
  const { user } = useAuth()
  // A rota já é de escritório (TenantRoute); narrow para o companyName e o
  // role existirem no tipo.
  const tenant = user && isTenant(user) ? user : null

  return (
    <div className="dashboard">
      <div className="ui-card">
        <h2 className="page-title">Bem-vindo(a), {user?.login}!</h2>
        <div className="dashboard-meta">
          <p className="page-subtitle">
            {tenant?.companyName ? (
              <>
                {tenant.companyName} ·{' '}
              </>
            ) : (
              <>
                Empresa {tenant?.companyId} ·{' '}
              </>
            )}
            {tenant ? getRoleLabel(tenant.role) : ''}
          </p>
          {tenant && (
            <Badge variant={tenant.role === 'ADMIN' ? 'info' : 'neutral'}>
              {tenant.role}
            </Badge>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="ui-card">
          <p className="ui-empty">KPIs do Dashboard em construção.</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
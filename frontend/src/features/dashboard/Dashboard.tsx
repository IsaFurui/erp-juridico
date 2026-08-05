import { useAuth } from '../../contexts/AuthContext'
import { getRoleLabel } from '../../lib/constants'
import Badge from '../../components/ui/Badge'

function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="dashboard">
      <div className="ui-card">
        <h2 className="page-title">Bem-vindo(a), {user?.login}!</h2>
        <div className="dashboard-meta">
          <p className="page-subtitle">
            {user?.companyName ? (
              <>
                {user.companyName} ·{' '}
              </>
            ) : (
              <>
                Empresa {user?.companyId} ·{' '}
              </>
            )}
            {user ? getRoleLabel(user.role) : ''}
          </p>
          {user && (
            <Badge variant={user.role === 'ADMIN' ? 'info' : 'neutral'}>
              {user.role}
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
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isPlatform } from '../../lib/jwt'
import { getRoleLabel } from '../../lib/constants'
import Icon, { type IconName } from '../../components/ui/Icon'
import {
  APP_ROUTES,
} from '../../lib/constants'
import '../../components/ui/ui.css'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

const MAIN_NAV: NavItem[] = [
  { to: APP_ROUTES.dashboard, label: 'Dashboard', icon: 'dashboard' },
  { to: APP_ROUTES.clients, label: 'Clientes', icon: 'clients' },
  { to: APP_ROUTES.processes, label: 'Processos', icon: 'processes' },
  { to: APP_ROUTES.finance, label: 'Financeiro', icon: 'finance' },
]

const ADMIN_NAV: NavItem[] = [
  { to: APP_ROUTES.users, label: 'Usuários', icon: 'users' },
  { to: APP_ROUTES.settings, label: 'Configurações', icon: 'settings' },
]

// Administração da plataforma, não do escritório.
const PLATFORM_NAV: NavItem[] = [
  { to: APP_ROUTES.companies, label: 'Empresas', icon: 'shield' },
]

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="sidebar-section-label">{children}</p>
  )
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `sidebar-nav-item${isActive ? ' is-active' : ''}`
      }
      end={item.to === APP_ROUTES.dashboard}
    >
      <Icon name={item.icon} size={18} />
      <span>{item.label}</span>
    </NavLink>
  )
}

function Sidebar() {
  const { user, logout } = useAuth()

  const initials = user?.login
    ? user.login.slice(0, 2).toUpperCase()
    : '??'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">EJ</div>
        <span className="sidebar-logo-text">ERP Jurídico</span>
      </div>

      <nav className="sidebar-nav">
        {user && !isPlatform(user) && (
          <>
            <SectionLabel>Principal</SectionLabel>
            {MAIN_NAV.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </>
        )}

        {user && !isPlatform(user) && user.role === 'ADMIN' && (
          <>
            <SectionLabel>Administração</SectionLabel>
            {ADMIN_NAV.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </>
        )}

        {user && isPlatform(user) && (
          <>
            <SectionLabel>Plataforma</SectionLabel>
            {PLATFORM_NAV.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">@{user?.login}</span>
          <span className="sidebar-user-role">
            {user && !isPlatform(user) ? getRoleLabel(user.role) : ''}
            {user && isPlatform(user) ? 'Plataforma' : ''}
          </span>
        </div>
        <button
          type="button"
          className="sidebar-logout"
          onClick={logout}
          title="Sair"
          aria-label="Sair"
        >
          <Icon name="logout" size={16} />
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
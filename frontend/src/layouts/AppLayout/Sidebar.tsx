import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getRoleLabel } from '../../lib/constants'
import Icon, { type IconName } from '../../components/ui/Icon'
import '../../components/ui/ui.css'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/clientes', label: 'Clientes', icon: 'clients' },
  { to: '/processos', label: 'Processos', icon: 'processes' },
  { to: '/financeiro', label: 'Financeiro', icon: 'finance' },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin/users', label: 'Usuários', icon: 'users' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: 'settings' },
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
      end={item.to === '/'}
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
        <SectionLabel>Principal</SectionLabel>
        {MAIN_NAV.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}

        {user?.role === 'ADMIN' && (
          <>
            <SectionLabel>Administração</SectionLabel>
            {ADMIN_NAV.map((item) => (
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
            {user ? getRoleLabel(user.role) : ''}
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
import { useLocation } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { isTenant } from '../../lib/jwt'
import GlobalSearch from './GlobalSearch'
import NotificationBell from './NotificationBell'
import { APP_ROUTES } from '../../lib/constants'
import '../../components/ui/ui.css'

const TITLES: Record<string, string> = {
  [APP_ROUTES.dashboard]: 'Dashboard',
  [APP_ROUTES.clients]: 'Clientes',
  [APP_ROUTES.processes]: 'Processos',
  [APP_ROUTES.finance]: 'Financeiro',
  [APP_ROUTES.users]: 'Usuários',
  [APP_ROUTES.companies]: 'Empresas',
  [APP_ROUTES.catalogs]: 'Catálogos',
  [APP_ROUTES.settings]: 'Configurações',
}

function Topbar() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'ERP Jurídico'
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">
        {user && isTenant(user) && <GlobalSearch />}
        <button
          type="button"
          className="topbar-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
        {user && isTenant(user) && <NotificationBell />}
      </div>
    </header>
  )
}

export default Topbar
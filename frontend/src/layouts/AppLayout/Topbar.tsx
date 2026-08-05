import { useLocation } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import { APP_ROUTES } from '../../lib/constants'
import '../../components/ui/ui.css'

const TITLES: Record<string, string> = {
  [APP_ROUTES.dashboard]: 'Dashboard',
  [APP_ROUTES.clients]: 'Clientes',
  [APP_ROUTES.processes]: 'Processos',
  [APP_ROUTES.finance]: 'Financeiro',
  [APP_ROUTES.users]: 'Usuários',
  [APP_ROUTES.companies]: 'Empresas',
  [APP_ROUTES.settings]: 'Configurações',
}

function Topbar() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'ERP Jurídico'

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">
        <div className="topbar-search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Buscar…" />
        </div>
        <button type="button" className="topbar-icon-btn" aria-label="Notificações">
          <Icon name="bell" size={18} />
        </button>
      </div>
    </header>
  )
}

export default Topbar
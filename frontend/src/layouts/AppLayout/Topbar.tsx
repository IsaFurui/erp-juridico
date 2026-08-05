import { useLocation } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import '../../components/ui/ui.css'

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/clientes': 'Clientes',
  '/processos': 'Processos',
  '/financeiro': 'Financeiro',
  '/admin/users': 'Usuários',
  '/admin/configuracoes': 'Configurações',
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
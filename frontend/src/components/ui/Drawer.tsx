import type { ReactNode } from 'react'
import './ui.css'

interface DrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

// Gaveta lateral: a entrada (fade do fundo + slide da direita) é animação de
// CSS que roda ao montar; fechar desmonta na hora.
function Drawer({ open, title, onClose, children }: DrawerProps) {
  if (!open) return null

  return (
    <div
      className="ui-drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="ui-drawer" role="dialog" aria-modal="true">
        <header className="ui-drawer-header">
          <h2 className="ui-drawer-title">{title}</h2>
          <button
            type="button"
            className="ui-modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>
        {children}
      </aside>
    </div>
  )
}

export default Drawer

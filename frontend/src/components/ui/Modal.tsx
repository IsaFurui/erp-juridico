import type { ReactNode } from 'react'
import './ui.css'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null

  return (
    <div
      className="ui-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="ui-modal" role="dialog" aria-modal="true">
        <header className="ui-modal-header">
          <h2 className="ui-modal-title">{title}</h2>
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
      </div>
    </div>
  )
}

export default Modal
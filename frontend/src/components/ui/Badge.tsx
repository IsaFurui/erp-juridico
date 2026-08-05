import type { ReactNode } from 'react'
import './ui.css'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
}

function Badge({ variant = 'neutral', children }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${variant}`}>{children}</span>
}

export default Badge
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './ui.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger'
  size?: 'md' | 'sm'
  children: ReactNode
}

function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
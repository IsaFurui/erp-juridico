import type { InputHTMLAttributes } from 'react'
import './ui.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name
  return (
    <div className="ui-field">
      {label && (
        <label className="ui-field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input id={inputId} className={`ui-input ${className}`} {...props} />
      {error && <span className="ui-field-error">{error}</span>}
    </div>
  )
}

export default Input
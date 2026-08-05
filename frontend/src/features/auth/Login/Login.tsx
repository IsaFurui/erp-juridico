import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { APP_ROUTES } from '../../../lib/constants'
import './Login.css'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [companyId, setCompanyId] = useState('')
  const [userLogin, setUserLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsedCompanyId = Number(companyId)
    if (!Number.isInteger(parsedCompanyId) || parsedCompanyId <= 0) {
      setError('Informe um ID de empresa válido (número positivo).')
      return
    }
    if (!userLogin.trim()) {
      setError('Informe seu login.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      await login({
        companyId: parsedCompanyId,
        login: userLogin.trim(),
        password,
      })
      navigate(APP_ROUTES.dashboard, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar ao servidor.',
      )
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-header">
          <div className="login-logo" aria-hidden="true">
            <span className="balance" aria-hidden="true">
              ⚖️
            </span>
          </div>
          <h1 className="login-title">ERP Jurídico</h1>
          <p className="login-subtitle">Acesse sua conta para continuar</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">ID da Empresa</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Ex.: 1"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Login</span>
            <input
              type="text"
              autoComplete="username"
              placeholder="joao.silva"
              value={userLogin}
              onChange={(e) => setUserLogin(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
      <p className="login-footer">
        Ambientes de teste: ID da empresa definido pelo suporte.
      </p>
    </div>
  )
}

export default Login
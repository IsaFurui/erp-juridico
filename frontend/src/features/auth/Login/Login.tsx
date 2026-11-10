import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { APP_ROUTES } from '../../../lib/constants'
import './Login.css'

/**
 * Dois modos, porque são duas identidades diferentes no backend: o usuário de
 * escritório pertence a uma empresa, o administrador da plataforma não
 * pertence a nenhuma — por isso o campo de empresa some no modo plataforma.
 */
type Mode = 'tenant' | 'platform'

function Login() {
  const { login, loginPlatform } = useAuth()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const [mode, setMode] = useState<Mode>('tenant')
  const [companyId, setCompanyId] = useState('')
  const [userLogin, setUserLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isPlatformMode = mode === 'platform'

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

  // Backup: alguns inputs (number, autofill) podem não despachar o submit
  // nativo do form ao pressionar Enter — forçamos aqui.
  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Lê direto do DOM porque o autofill do navegador nem sempre dispara
    // onChange — nesses casos o state fica vazio e a validação barra o Enter.
    const form = new FormData(e.currentTarget)
    const rawCompanyId = (form.get('companyId') as string | null) ?? companyId
    const rawLogin = (form.get('login') as string | null) ?? userLogin
    const rawPassword = (form.get('password') as string | null) ?? password

    const parsedCompanyId = Number(rawCompanyId)
    if (
      !isPlatformMode &&
      (!Number.isInteger(parsedCompanyId) || parsedCompanyId <= 0)
    ) {
      setError('Informe um ID de empresa válido (número positivo).')
      return
    }
    if (!rawLogin.trim()) {
      setError('Informe seu login.')
      return
    }
    if (rawPassword.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      if (isPlatformMode) {
        await loginPlatform({ login: rawLogin.trim(), password: rawPassword })
      } else {
        await login({
          companyId: parsedCompanyId,
          login: rawLogin.trim(),
          password: rawPassword,
        })
      }
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
          <p className="login-subtitle">
            {isPlatformMode
              ? 'Administração da plataforma'
              : 'Acesse sua conta para continuar'}
          </p>
        </header>

        <div className="login-modes" role="tablist" aria-label="Tipo de acesso">
          <button
            type="button"
            role="tab"
            aria-selected={!isPlatformMode}
            className={`login-mode${!isPlatformMode ? ' is-active' : ''}`}
            onClick={() => switchMode('tenant')}
          >
            Escritório
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isPlatformMode}
            className={`login-mode${isPlatformMode ? ' is-active' : ''}`}
            onClick={() => switchMode('platform')}
          >
            Plataforma
          </button>
        </div>

        <form
          ref={formRef}
          className="login-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {!isPlatformMode && (
            <label className="field">
              <span className="field-label">ID da Empresa</span>
              <input
                type="number"
                name="companyId"
                inputMode="numeric"
                min={1}
                placeholder="Ex.: 1"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                onKeyDown={handleEnter}
              />
            </label>
          )}

          <label className="field">
            <span className="field-label">Login</span>
            <input
              type="text"
              name="login"
              autoComplete="username"
              placeholder={isPlatformMode ? 'root' : 'joao.silva'}
              value={userLogin}
              onChange={(e) => setUserLogin(e.target.value)}
              onKeyDown={handleEnter}
            />
          </label>

          <label className="field">
            <span className="field-label">Senha</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleEnter}
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
        {isPlatformMode
          ? 'Acesso do administrador da plataforma, criado pelo seed.'
          : 'Ambientes de teste: ID da empresa definido pelo suporte.'}
      </p>
    </div>
  )
}

export default Login

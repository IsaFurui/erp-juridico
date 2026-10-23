/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { decodeJwt, isTokenExpired, type Session } from '../lib/jwt'
import {
  authApi,
  registerUnauthorizedHandler,
  setAuthToken,
  type LoginPayload,
  type PlatformLoginPayload,
} from '../lib/api'
import { STORAGE_KEYS } from '../lib/constants'

interface AuthContextValue {
  token: string | null
  user: Session | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  loginPlatform: (payload: PlatformLoginPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredToken(): string | null {
  const stored = localStorage.getItem(STORAGE_KEYS.authToken)
  if (!stored) return null
  const user = decodeJwt(stored)
  // Token ilegível ou vencido vai embora aqui: antes o app montava o layout
  // com o nome na sidebar e só caía no login na primeira request com 401.
  if (!user || isTokenExpired(user)) {
    localStorage.removeItem(STORAGE_KEYS.authToken)
    return null
  }
  return stored
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken())
  const user = useMemo(() => (token ? decodeJwt(token) : null), [token])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.authToken)
    setAuthToken(null)
    setToken(null)
  }, [])

  const persist = useCallback((access_token: string) => {
    localStorage.setItem(STORAGE_KEYS.authToken, access_token)
    setAuthToken(access_token)
    setToken(access_token)
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { access_token } = await authApi.login(payload)
      persist(access_token)
    },
    [persist],
  )

  const loginPlatform = useCallback(
    async (payload: PlatformLoginPayload) => {
      const { access_token } = await authApi.loginPlatform(payload)
      persist(access_token)
    },
    [persist],
  )

  useEffect(() => {
    setAuthToken(token)
    registerUnauthorizedHandler(logout)
  }, [token, logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      loginPlatform,
      logout,
    }),
    [token, user, login, loginPlatform, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
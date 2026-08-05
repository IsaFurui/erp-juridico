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
import { decodeJwt, type JwtPayload } from '../lib/jwt'
import {
  authApi,
  registerUnauthorizedHandler,
  setAuthToken,
  type LoginPayload,
} from '../lib/api'
import { STORAGE_KEYS } from '../lib/constants'

interface AuthContextValue {
  token: string | null
  user: JwtPayload | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredToken(): string | null {
  const stored = localStorage.getItem(STORAGE_KEYS.authToken)
  if (!stored) return null
  const user = decodeJwt(stored)
  if (!user) {
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

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { access_token } = await authApi.login(payload)
      localStorage.setItem(STORAGE_KEYS.authToken, access_token)
      setAuthToken(access_token)
      setToken(access_token)
    },
    [],
  )

  useEffect(() => {
    setAuthToken(token)
    registerUnauthorizedHandler(logout)
  }, [token, logout])

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, isAuthenticated: Boolean(token), login, logout }),
    [token, user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
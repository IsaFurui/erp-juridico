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
import { decodeJwt, isPlatform, isTokenExpired, type Session } from '../lib/jwt'
import {
  authApi,
  usersApi,
  registerUnauthorizedHandler,
  setAuthToken,
  type LoginPayload,
  type PlatformLoginPayload,
} from '../lib/api'
import { STORAGE_KEYS } from '../lib/constants'

/** Nome e foto do usuário de escritório — vêm do banco, não do token. */
export interface Profile {
  name: string
  avatarUrl: string | null
}

interface AuthContextValue {
  token: string | null
  user: Session | null
  profile: Profile | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  loginPlatform: (payload: PlatformLoginPayload) => Promise<void>
  logout: () => void
  refreshProfile: () => void
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
  const [profile, setProfile] = useState<Profile | null>(null)
  const user = useMemo(() => (token ? decodeJwt(token) : null), [token])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.authToken)
    setAuthToken(null)
    setToken(null)
    setProfile(null)
  }, [])

  // Só o escritório tem perfil (nome/foto); a plataforma vive noutra tabela.
  const refreshProfile = useCallback(() => {
    if (!user || isPlatform(user)) return
    usersApi
      .me()
      .then((u) => setProfile({ name: u.name, avatarUrl: u.avatarUrl ?? null }))
      .catch(() => {
        /* mantém o fallback (iniciais/login) */
      })
  }, [user])

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

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      profile,
      isAuthenticated: Boolean(token),
      login,
      loginPlatform,
      logout,
      refreshProfile,
    }),
    [token, user, profile, login, loginPlatform, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
import { createContext } from 'react'
import type { AuthUser, LoginCredentials } from '../api/client'
export type AuthContextValue = { user: AuthUser | null; isAuthenticated: boolean; login: (credentials: LoginCredentials) => Promise<void>; logout: () => void }
export const AuthContext = createContext<AuthContextValue | null>(null)

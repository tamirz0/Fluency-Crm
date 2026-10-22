import { createContext } from 'react'
import type { AuthUser, LoginCredentials } from '../api/client'
export type AuthContextValue = { user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean; refresh: () => Promise<void>; login: (credentials: LoginCredentials) => Promise<void>; logout: () => Promise<void> }
export const AuthContext = createContext<AuthContextValue | null>(null)

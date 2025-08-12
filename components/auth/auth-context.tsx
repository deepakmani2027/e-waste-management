"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { jwtVerify, SignJWT } from "jose"
import { genSaltSync, hashSync, compareSync } from "bcryptjs"

type AuthUser = {
  id: string
  email: string
  name?: string
}

type AuthContextType = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>
  signup: (name: string, email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "ew:auth"
const USERS_STORAGE_KEY = "ew:users"

// Demo-only secret. In production, move to an environment secret on the server and sign there.
const SECRET_STR =
  "DEMO_ONLY_CHANGE_ME_32+_BYTES_SECRET_FOR_JWT_SIGNING_2025_EWASTE"
const SECRET = new TextEncoder().encode(SECRET_STR)

type StoredUser = {
  id: string
  email: string
  name?: string
  passwordHash: string
}

async function signToken(payload: Record<string, unknown>, expiresInSeconds = 60 * 60 * 2) {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + expiresInSeconds
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(SECRET)
}

async function verifyToken(token: string): Promise<{ payload: any } | null> {
  try {
    const verified = await jwtVerify(token, SECRET)
    return verified as any
  } catch {
    return null
  }
}

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredUser[]) : []
  } catch {
    return []
  }
}
function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const logoutTimerRef = useRef<number | null>(null)

  const scheduleAutoLogout = useCallback(async (tok: string) => {
    // Clear any existing timer
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
    // Decode expiration
    const verified = await verifyToken(tok)
    if (!verified) return
    const expSec = verified.payload.exp as number | undefined
    if (!expSec) return
    const ms = Math.max(0, expSec * 1000 - Date.now())
    logoutTimerRef.current = window.setTimeout(() => {
      logout()
    }, ms)
  }, [])

  // Initialize from storage
  useEffect(() => {
    ;(async () => {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as { token: string; user: AuthUser }
          const valid = await verifyToken(parsed.token)
          if (valid) {
            setUser(parsed.user)
            setToken(parsed.token)
            scheduleAutoLogout(parsed.token)
          } else {
            localStorage.removeItem(AUTH_STORAGE_KEY)
          }
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [scheduleAutoLogout])

  const login = useCallback(
    async (email: string, password: string) => {
      const users = readUsers()
      const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase())
      if (!u) return { ok: false as const, message: "User not found" }
      const ok = compareSync(password, u.passwordHash)
      if (!ok) return { ok: false as const, message: "Invalid credentials" }
      const authUser: AuthUser = { id: u.id, email: u.email, name: u.name }
      const tok = await signToken({ sub: authUser.id, email: authUser.email, name: authUser.name })
      setUser(authUser)
      setToken(tok)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: tok, user: authUser }))
      scheduleAutoLogout(tok)
      return { ok: true as const }
    },
    [scheduleAutoLogout]
  )

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const users = readUsers()
    if (users.some((x) => x.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false as const, message: "Email already registered" }
    }
    const id = `u-${Date.now()}`
    const salt = genSaltSync(10)
    const passwordHash = hashSync(password, salt)
    const newUser: StoredUser = { id, name, email, passwordHash }
    writeUsers([...users, newUser])
    // Auto-login after signup
    const tok = await signToken({ sub: id, email, name })
    const authUser: AuthUser = { id, name, email }
    setUser(authUser)
    setToken(tok)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: tok, user: authUser }))
    scheduleAutoLogout(tok)
    return { ok: true as const }
  }, [scheduleAutoLogout])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!user && !!token,
      login,
      signup,
      logout,
    }),
    [user, token, loading, login, signup, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

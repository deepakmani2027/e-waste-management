"use client"

import { AuthProvider } from "@/components/auth/auth-context"
import AuthGuard from "@/components/auth/auth-guard"
import EwastePortal from "@/components/e-waste-portal"

export default function Page() {
  return (
    <AuthProvider>
      <AuthGuard>
        <EwastePortal />
      </AuthGuard>
    </AuthProvider>
  )
}

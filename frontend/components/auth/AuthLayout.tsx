'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen bg-surface-layer-2 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 border border-border">
        {children}
      </div>
    </div>
  )
}

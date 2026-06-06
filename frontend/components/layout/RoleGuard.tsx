'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { UserRole } from '@/lib/auth-types'
import { ShieldX, Home } from 'lucide-react'

interface RoleGuardProps {
  children: React.ReactNode
  /** List of roles that are allowed to view this page */
  roles: UserRole[]
  /** Optional custom fallback instead of the default Access Denied page */
  fallback?: React.ReactNode
}

/**
 * RoleGuard — wraps a page/component and restricts access by user role.
 * - Unauthenticated users are redirected to /login.
 * - Users whose role is NOT in `roles` see an Access Denied screen.
 * - Allowed users see the children normally.
 */
export function RoleGuard({ children, roles, fallback }: RoleGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Loading spinner
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not authenticated — show nothing (useEffect will redirect)
  if (!user) return null

  // Unauthorized role
  if (!roles.includes(user.role)) {
    if (fallback) return <>{fallback}</>
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="p-5 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
          <ShieldX size={48} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mb-2">
          You don&apos;t have permission to view this page.
        </p>
        <p className="text-muted-foreground max-w-md mb-6">
          This section requires one of these roles:{' '}
          <strong className="text-foreground">
            {roles.map(r => r.replace(/_/g, ' ')).join(', ')}
          </strong>
        </p>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-layer-1 border border-border rounded-full mb-6">
          <span className="text-xs text-muted-foreground">Your role:</span>
          <span className="text-xs font-bold text-foreground capitalize">{user.role.replace(/_/g, ' ')}</span>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Home size={16} />
          Back to My Dashboard
        </button>
      </div>
    )
  }

  return <>{children}</>
}

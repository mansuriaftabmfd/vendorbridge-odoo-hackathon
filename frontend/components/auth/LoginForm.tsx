'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { type UserRole } from '@/lib/auth-types'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, UserX, LogIn } from 'lucide-react'

// Role config
const ROLES: { value: UserRole; label: string; desc: string; icon: string; color: string; activeColor: string }[] = [
  { value: 'procurement_officer', label: 'Procurement Officer', desc: 'Manage RFQs & vendors', icon: '📋', color: 'border-border', activeColor: 'border-green-500 bg-green-500/10 ring-2 ring-green-500/30' },
  { value: 'vendor', label: 'Vendor', desc: 'Submit quotations & orders', icon: '🏭', color: 'border-border', activeColor: 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30' },
  { value: 'manager', label: 'Manager', desc: 'Approve & review procurement', icon: '👔', color: 'border-border', activeColor: 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30' },
  { value: 'admin', label: 'Admin', desc: 'Full system management', icon: '🔐', color: 'border-border', activeColor: 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30' },
]

// Demo accounts — all use Password@123
const DEMO_ACCOUNTS = [
  { email: 'admin@vendorbridge.com',       role: 'Admin',                password: 'Password@123' },
  { email: 'manager@vendorbridge.com',     role: 'Manager',              password: 'Password@123' },
  { email: 'procurement@vendorbridge.com', role: 'Procurement Officer',  password: 'Password@123' },
  { email: 'vendor@vendorbridge.com',      role: 'Vendor',               password: 'Password@123' },
]

// Role → dashboard redirect
const ROLE_ROUTES: Record<UserRole, string> = {
  procurement_officer: '/dashboard',
  vendor: '/dashboard',
  manager: '/dashboard',
  admin: '/dashboard',
}

// Error type → styled message
type ErrorType = 'USER_NOT_FOUND' | 'INVALID_CREDENTIALS' | 'ROLE_MISMATCH' | 'ACCOUNT_INACTIVE' | 'GENERIC'
interface LoginError { type: ErrorType; message: string }

function getErrorStyle(type: ErrorType) {
  if (type === 'ROLE_MISMATCH') return { bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-400', text: 'text-amber-700 dark:text-amber-300', Icon: ShieldCheck }
  if (type === 'USER_NOT_FOUND') return { bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-400', text: 'text-blue-700 dark:text-blue-300', Icon: UserX }
  return { bg: 'bg-red-50 dark:bg-red-950/30 border-red-400', text: 'text-red-700 dark:text-red-300', Icon: AlertTriangle }
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<LoginError | null>(null)

  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)

    if (!selectedRole) {
      setLoginError({ type: 'GENERIC', message: 'Please select the role you registered with.' })
      return
    }

    setIsLoading(true)
    try {
      await login(email, password, selectedRole)
      router.push(ROLE_ROUTES[selectedRole] || '/dashboard')
    } catch (err: any) {
      const code = err?.code || ''
      if (code === 'USER_NOT_FOUND') {
        setLoginError({ type: 'USER_NOT_FOUND', message: 'No account found with this email. Please sign up first.' })
      } else if (code === 'ROLE_MISMATCH') {
        setLoginError({ type: 'ROLE_MISMATCH', message: 'Your credentials are valid, but you are not registered as this role. Please select your correct role.' })
      } else if (code === 'INVALID_CREDENTIALS') {
        setLoginError({ type: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' })
      } else if (code === 'ACCOUNT_INACTIVE') {
        setLoginError({ type: 'GENERIC', message: 'Your account has been deactivated. Please contact support.' })
      } else {
        setLoginError({ type: 'GENERIC', message: err?.message || 'Something went wrong. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-2xl">⚡</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Welcome Back</h1>
        <p className="text-muted-foreground text-sm">Sign in to VendorBridge ERP</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Role Selector */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">
            Select Your Role <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-3">Select the role you registered with. This will be verified against your account.</p>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(role => (
              <button
                key={role.value}
                type="button"
                onClick={() => { setSelectedRole(role.value); setLoginError(null) }}
                className={`p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                  selectedRole === role.value ? role.activeColor : 'border-border bg-surface-layer-1 hover:border-primary/50 hover:bg-surface-layer-2'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-lg">{role.icon}</span>
                  <p className="text-xs font-bold text-foreground leading-tight">{role.label}</p>
                </div>
                <p className="text-xs text-muted-foreground pl-7">{role.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoComplete="email"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
            <input
              type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {loginError && (() => {
          const { bg, text, Icon } = getErrorStyle(loginError.type)
          return (
            <div className={`flex items-start gap-3 p-3.5 rounded-lg border ${bg}`}>
              <Icon size={18} className={`${text} mt-0.5 flex-shrink-0`} />
              <div>
                <p className={`text-sm font-medium ${text}`}>{loginError.message}</p>
                {loginError.type === 'ROLE_MISMATCH' && (
                  <p className={`text-xs mt-1 ${text} opacity-80`}>Try selecting a different role above.</p>
                )}
                {loginError.type === 'USER_NOT_FOUND' && (
                  <p className={`text-xs mt-1 ${text} opacity-80`}>
                    <a href="/signup" className="underline font-semibold">Create an account →</a>
                  </p>
                )}
              </div>
            </div>
          )
        })()}

        {/* Submit */}
        <button
          type="submit" disabled={isLoading || !selectedRole}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Signing in...</>
          ) : (
            <><LogIn size={17} /> Sign In</>
          )}
        </button>

        {/* Demo Credentials — clickable to auto-fill */}
        <div className="p-3 bg-surface-layer-1 border border-border rounded-xl">
          <p className="text-xs font-semibold text-foreground mb-2">🧪 Demo Accounts <span className="text-muted-foreground font-normal">(click to auto-fill)</span></p>
          <div className="space-y-1">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword(acc.password); setLoginError(null); }}
                className="w-full grid grid-cols-3 items-center px-2 py-1.5 rounded-lg hover:bg-surface-layer-2 text-left transition-colors group"
              >
                <span className="text-xs font-bold text-primary">{acc.role}</span>
                <span className="text-xs text-muted-foreground truncate col-span-1">{acc.email}</span>
                <span className="text-xs font-mono text-muted-foreground text-right group-hover:text-foreground">{acc.password}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-amber-500 mt-2">⚠️ All passwords: <span className="font-mono font-bold">Password@123</span></p>
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-5">
        Don&apos;t have an account?{' '}
        <a href="/signup" className="text-primary font-semibold hover:underline">Sign up & choose your role</a>
      </p>
    </div>
  )
}

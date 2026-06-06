'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type UserRole } from '@/lib/auth-types'
import { Mail, Lock, User, Eye, EyeOff, Building2, CheckCircle, XCircle } from 'lucide-react'

export function SignupForm() {
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { signup } = useAuth()
  const router = useRouter()

  const roles: UserRole[] = ['procurement_officer', 'vendor', 'manager', 'admin']

  // Password strength checks
  const passwordChecks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', ok: /[a-z]/.test(password) },
    { label: 'One digit (0-9)', ok: /\d/.test(password) },
    { label: 'One special character (!@#$%...)', ok: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~]/.test(password) },
  ]
  const passwordStrong = passwordChecks.every(c => c.ok)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!passwordStrong) {
      setError('Password does not meet all requirements listed below')
      return
    }

    if (!selectedRole) {
      setError('Please select a role before creating your account')
      return
    }

    setIsLoading(true)
    try {
      await signup(name, email, password, selectedRole, orgName || undefined)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Join VendorBridge</h1>
        <p className="text-muted-foreground">Create your procurement account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Full Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        {/* Organization Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Organization Name *</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Corp"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Work Email *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Password strength checklist */}
          {password.length > 0 && (
            <div className="mt-2 grid grid-cols-1 gap-1">
              {passwordChecks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {check.ok
                    ? <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                    : <XCircle size={13} className="text-red-400 flex-shrink-0" />}
                  <span className={check.ok ? 'text-green-600' : 'text-muted-foreground'}>{check.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Confirm Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={`w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface-layer-1 border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                confirmPassword && confirmPassword !== password ? 'border-red-400' : 'border-border'
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        {/* Role Selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">Select Your Role * <span className="text-red-400 text-xs">(required)</span></label>
          {!selectedRole && (
            <p className="text-xs text-amber-500 mb-2">⚠ Please select a role to continue</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {roles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedRole === role
                    ? 'border-primary bg-primary bg-opacity-10 ring-2 ring-primary ring-opacity-30'
                    : 'border-border bg-surface-layer-1 hover:border-primary hover:border-opacity-50'
                }`}
              >
                <p className="text-sm font-semibold text-foreground">{ROLE_LABELS[role]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500 bg-opacity-10 border border-red-400 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || (password.length > 0 && !passwordStrong)}
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account? <a href="/login" className="text-primary font-semibold hover:underline">Sign in</a>
      </p>
    </div>
  )
}

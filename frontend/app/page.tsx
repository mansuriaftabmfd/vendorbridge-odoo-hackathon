'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { 
  ArrowRight, Shield, Users, FileText, CheckCircle, 
  TrendingUp, Zap, Globe, Star, ChevronRight
} from 'lucide-react'

const FEATURES = [
  { icon: Shield, title: 'Secure Role-Based Access', desc: 'Backend-verified roles. No privilege escalation possible.', color: 'text-purple-400' },
  { icon: FileText, title: 'RFQ Management', desc: 'Create, send and track Requests for Quotation in minutes.', color: 'text-blue-400' },
  { icon: Users, title: 'Vendor Portal', desc: 'Vendors submit quotations directly. Full lifecycle tracking.', color: 'text-green-400' },
  { icon: CheckCircle, title: 'Approval Workflows', desc: 'Manager approvals with full audit trail and remarks.', color: 'text-orange-400' },
  { icon: TrendingUp, title: 'Analytics & Reports', desc: 'Spending trends, vendor performance, category breakdown.', color: 'text-pink-400' },
  { icon: Zap, title: 'Real-Time Notifications', desc: 'Socket.IO powered instant alerts for every action.', color: 'text-yellow-400' },
]

const STATS = [
  { value: '4', label: 'User Roles' },
  { value: '15+', label: 'API Endpoints' },
  { value: '100%', label: 'Role Verified' },
  { value: '0', label: 'Mock Data' },
]

const ROLES = [
  { emoji: '🔐', name: 'Admin', desc: 'Full system control', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30' },
  { emoji: '👔', name: 'Manager', desc: 'Approvals & reports', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30' },
  { emoji: '📋', name: 'Procurement Officer', desc: 'RFQs & vendors', color: 'from-green-500/20 to-green-600/10 border-green-500/30' },
  { emoji: '🏭', name: 'Vendor', desc: 'Quotations & orders', color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30' },
]

export default function LandingPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [animStep, setAnimStep] = useState(0)

  useEffect(() => {
    setMounted(true)
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const t = setInterval(() => setAnimStep(s => (s + 1) % 4), 2000)
    return () => clearInterval(t)
  }, [])

  if (!mounted || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading VendorBridge...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">V</span>
            </div>
            <span className="font-bold text-lg text-foreground">VendorBridge</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">ERP</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              Sign In
            </button>
            <button 
              onClick={() => router.push('/signup')}
              className="text-sm bg-primary text-white px-4 py-1.5 rounded-lg font-medium hover:opacity-90 transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
            <Star size={12} className="text-primary fill-primary" />
            <span className="text-xs font-medium text-primary">Odoo Hackathon 2026 Project</span>
            <Star size={12} className="text-primary fill-primary" />
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-foreground leading-tight mb-6">
            Procurement
            <span className="block text-primary">Made Simple.</span>
            <span className="block text-muted-foreground text-3xl md:text-4xl font-normal mt-2">Secure by Design.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            A full-stack ERP platform for managing vendors, RFQs, quotations and purchase orders — 
            with <strong className="text-foreground">role-verified authentication</strong> that actually works.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push('/login')}
              className="group flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:opacity-90 transition-all shadow-lg shadow-primary/25"
            >
              Start Demo
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="flex items-center gap-2 border border-border text-foreground px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-surface-layer-1 transition-all"
            >
              Create Account
            </button>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-black text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ROLE CARDS ─── */}
      <section className="py-20 px-6 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Built for Every Stakeholder</h2>
            <p className="text-muted-foreground">Each role gets a completely different dashboard, navigation, and permissions.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ROLES.map((role, i) => (
              <div
                key={role.name}
                className={`relative p-5 rounded-2xl border bg-gradient-to-b ${role.color} transition-all hover:-translate-y-1 hover:shadow-lg cursor-default ${animStep === i ? 'scale-105 shadow-lg' : ''}`}
                style={{ transition: 'all 0.3s ease' }}
              >
                <div className="text-4xl mb-3">{role.emoji}</div>
                <h3 className="font-bold text-foreground text-sm">{role.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Everything You Need</h2>
            <p className="text-muted-foreground">Full procurement lifecycle in one platform.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all group">
                <f.icon size={24} className={`${f.color} mb-4`} />
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 px-6 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Procurement Lifecycle</h2>
            <p className="text-muted-foreground">End-to-end flow from RFQ to Purchase Order.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2">
            {[
              { step: '1', label: 'Create RFQ', desc: 'Officer creates request', icon: '📋' },
              { step: '2', label: 'Send to Vendors', desc: 'Notify selected vendors', icon: '📤' },
              { step: '3', label: 'Quotations', desc: 'Vendors submit bids', icon: '💼' },
              { step: '4', label: 'Compare', desc: 'Side-by-side analysis', icon: '⚖️' },
              { step: '5', label: 'Approve', desc: 'Manager approves PO', icon: '✅' },
            ].map((item, i) => (
              <div key={item.step} className="flex md:flex-col items-center flex-1 gap-2 md:gap-0">
                <div className="flex md:flex-col items-center gap-2 md:gap-1 text-center flex-1">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-xl flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground hidden md:block">{item.desc}</p>
                  </div>
                </div>
                {i < 4 && <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 rotate-0 md:rotate-0" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Globe size={20} className="text-primary" />
            <span className="text-sm text-muted-foreground">Built for Odoo Hackathon 2026</span>
          </div>
          <h2 className="text-4xl font-extrabold text-foreground mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-muted-foreground mb-8">
            Try the demo with pre-seeded accounts. Each role shows a completely different experience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push('/login')}
              className="group flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-primary/30"
            >
              Launch Demo
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="https://github.com/mansuriaftabmfd/vendorbridge-odoo-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-border text-foreground px-8 py-4 rounded-xl font-bold text-lg hover:bg-surface-layer-1 transition-all"
            >
              ⭐ GitHub
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-6">All demo accounts use password: <span className="font-mono font-bold text-foreground">Password@123</span></p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-xs font-bold text-white">V</span>
            </div>
            <span className="text-sm font-semibold text-foreground">VendorBridge ERP</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Built with ❤️ by <strong className="text-foreground">Mansuri Aftab</strong> · Odoo Hackathon 2026
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <button onClick={() => router.push('/login')} className="hover:text-foreground transition-colors">Sign In</button>
            <button onClick={() => router.push('/signup')} className="hover:text-foreground transition-colors">Sign Up</button>
            <a href="https://github.com/mansuriaftabmfd/vendorbridge-odoo-hackathon" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

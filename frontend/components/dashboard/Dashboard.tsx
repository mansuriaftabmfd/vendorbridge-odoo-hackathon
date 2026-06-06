'use client'

import { useAuth } from '@/hooks/useAuth'
import { TrendingUp, Plus, BarChart3, Clock, Package, FileText, CheckSquare, ShoppingCart, Users, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export function Dashboard() {
  const { user } = useAuth()

  const getWelcomeMessage = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'procurement_officer': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      case 'vendor': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin': return 'Administrator'
      case 'manager': return 'Manager / Approver'
      case 'procurement_officer': return 'Procurement Officer'
      case 'vendor': return 'Vendor'
      default: return user?.role
    }
  }

  // ─── VENDOR DASHBOARD ──────────────────────────────────────────────────────
  const VendorDashboard = () => (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{getWelcomeMessage()}, {user?.name}!</h1>
          <p className="text-muted-foreground mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getRoleBadgeColor()}`}>{getRoleLabel()}</span>
      </div>

      {/* Vendor Info Banner */}
      <div className="card-base p-5 border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Vendor Portal</p>
            <p className="text-sm text-muted-foreground mt-1">
              You are logged in as a <strong>Vendor</strong>. You can view RFQs you've been invited to, submit quotations, and track your purchase orders.
            </p>
          </div>
        </div>
      </div>

      {/* Vendor Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/rfq/create" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <FileText size={18} />View RFQs
        </Link>
        <Link href="/quotations" className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <Package size={18} />My Quotations
        </Link>
        <Link href="/orders" className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <ShoppingCart size={18} />My Orders
        </Link>
      </div>

      {/* Vendor KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active RFQ Invitations', value: '—', icon: <FileText size={22} className="text-blue-500" />, desc: 'RFQs you can bid on' },
          { label: 'Submitted Quotations', value: '—', icon: <Package size={22} className="text-green-500" />, desc: 'Your open quotations' },
          { label: 'Active Purchase Orders', value: '—', icon: <ShoppingCart size={22} className="text-purple-500" />, desc: 'Orders assigned to you' },
        ].map((kpi, i) => (
          <div key={i} className="card-base p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{kpi.label}</p>
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-2">{kpi.desc}</p>
              </div>
              <div className="p-3 bg-surface-layer-2 rounded-lg">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Getting Started for vendor */}
      <div className="card-base p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Getting Started as a Vendor</h2>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Wait for RFQ invitations from procurement teams', icon: <FileText size={16} /> },
            { step: '2', text: 'Review RFQ details and submit your best quotation', icon: <Package size={16} /> },
            { step: '3', text: 'Track the approval and purchase order status', icon: <CheckSquare size={16} /> },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-4 p-3 bg-surface-layer-1 rounded-lg">
              <span className="w-7 h-7 flex-shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">{item.step}</span>
              <span className="text-sm text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ─── PROCUREMENT OFFICER DASHBOARD ─────────────────────────────────────────
  const ProcurementDashboard = () => (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{getWelcomeMessage()}, {user?.name}!</h1>
          <p className="text-muted-foreground mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getRoleBadgeColor()}`}>{getRoleLabel()}</span>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/rfq/create" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <Plus size={18} />Create RFQ
        </Link>
        <Link href="/vendors" className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <Users size={18} />Manage Vendors
        </Link>
        <Link href="/orders" className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <ShoppingCart size={18} />Purchase Orders
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Vendors', value: '—', icon: <Users size={22} className="text-blue-500" />, trend: 'Registered & active' },
          { label: 'Open RFQs', value: '—', icon: <FileText size={22} className="text-green-500" />, trend: 'Awaiting quotations' },
          { label: 'Pending Approvals', value: '—', icon: <CheckSquare size={22} className="text-yellow-500" />, trend: 'Needs manager review' },
          { label: 'Total PO Value', value: '₹—', icon: <TrendingUp size={22} className="text-purple-500" />, trend: 'This financial year' },
        ].map((kpi, i) => (
          <div key={i} className="card-base p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-2">{kpi.trend}</p>
              </div>
              <div className="p-3 bg-surface-layer-2 rounded-lg">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card-base p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-muted-foreground">
          <Clock size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No recent activity yet. Start by creating an RFQ!</p>
          <Link href="/rfq/create" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus size={16} />Create your first RFQ
          </Link>
        </div>
      </div>
    </div>
  )

  // ─── MANAGER DASHBOARD ─────────────────────────────────────────────────────
  const ManagerDashboard = () => (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{getWelcomeMessage()}, {user?.name}!</h1>
          <p className="text-muted-foreground mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getRoleBadgeColor()}`}>{getRoleLabel()}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/approvals" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <CheckSquare size={18} />Review Approvals
        </Link>
        <Link href="/reports" className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <BarChart3 size={18} />View Reports
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Pending Approvals', value: '—', icon: <CheckSquare size={22} className="text-red-500" />, desc: 'Needs your review' },
          { label: 'Total Spend (Month)', value: '₹—', icon: <TrendingUp size={22} className="text-blue-500" />, desc: 'This month procurement' },
          { label: 'Active Vendors', value: '—', icon: <Users size={22} className="text-green-500" />, desc: 'Approved vendors' },
        ].map((kpi, i) => (
          <div key={i} className="card-base p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{kpi.label}</p>
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-2">{kpi.desc}</p>
              </div>
              <div className="p-3 bg-surface-layer-2 rounded-lg">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ─── ADMIN DASHBOARD ───────────────────────────────────────────────────────
  const AdminDashboard = () => (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{getWelcomeMessage()}, {user?.name}!</h1>
          <p className="text-muted-foreground mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getRoleBadgeColor()}`}>{getRoleLabel()}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/vendors" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <Users size={18} />Manage Users & Vendors
        </Link>
        <Link href="/reports" className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <BarChart3 size={18} />Analytics & Reports
        </Link>
        <Link href="/approvals" className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
          <CheckSquare size={18} />Approvals
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: '—', icon: <Users size={22} className="text-blue-500" /> },
          { label: 'Active Vendors', value: '—', icon: <Package size={22} className="text-green-500" /> },
          { label: 'Total POs', value: '—', icon: <ShoppingCart size={22} className="text-purple-500" /> },
          { label: 'Pending Approvals', value: '—', icon: <CheckSquare size={22} className="text-orange-500" /> },
        ].map((kpi, i) => (
          <div key={i} className="card-base p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{kpi.label}</p>
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
              </div>
              <div className="p-3 bg-surface-layer-2 rounded-lg">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ─── ROLE ROUTER ───────────────────────────────────────────────────────────
  switch (user?.role) {
    case 'vendor': return <VendorDashboard />
    case 'procurement_officer': return <ProcurementDashboard />
    case 'manager': return <ManagerDashboard />
    case 'admin': return <AdminDashboard />
    default: return (
      <div className="card-base p-8 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
        <h1 className="text-2xl font-bold text-foreground">Unknown Role</h1>
        <p className="text-muted-foreground mt-2">Your account role (<code className="bg-surface-layer-1 px-1 rounded">{user?.role}</code>) is not recognized. Please contact your administrator.</p>
      </div>
    )
  }
}

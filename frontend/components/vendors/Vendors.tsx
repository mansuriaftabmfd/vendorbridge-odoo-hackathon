'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Plus, Search, Star, RefreshCw, AlertCircle, Building2, Phone, Mail, Trash2, Edit2, X, CheckCircle } from 'lucide-react'

interface Vendor {
  id: string
  company_name: string
  category: string
  gstin?: string
  primary_contact_name?: string
  primary_contact_email?: string
  primary_contact_phone?: string
  status: string
  rating?: number
  address?: string
}

export function Vendors() {
  const { user } = useAuth()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const canManage = ['procurement_officer', 'manager', 'admin'].includes(user?.role || '')

  const [form, setForm] = useState({
    company_name: '', category: '', gstin: '',
    primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '', address: ''
  })

  const loadVendors = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params: Record<string, string> = {}
      if (filterStatus !== 'all') params.status = filterStatus.toUpperCase()
      if (searchTerm) params.search = searchTerm
      const res = await api.vendors.getAll(params)
      if (res.success && res.data?.vendors) {
        setVendors(res.data.vendors)
      } else {
        setVendors([])
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, searchTerm])

  useEffect(() => { loadVendors() }, [loadVendors])

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name) return
    setActionLoading('add')
    try {
      await api.vendors.create(form)
      setShowAddModal(false)
      setForm({ company_name: '', category: '', gstin: '', primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '', address: '' })
      setSuccessMsg('Vendor added successfully!')
      setTimeout(() => setSuccessMsg(null), 3000)
      loadVendors()
    } catch (e: any) {
      setError(e.message || 'Failed to add vendor')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete vendor "${name}"? This cannot be undone.`)) return
    setActionLoading(`del-${id}`)
    try {
      await api.vendors.delete(id)
      setVendors(prev => prev.filter(v => v.id !== id))
      setSuccessMsg('Vendor deleted.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to delete vendor')
    } finally {
      setActionLoading(null)
    }
  }

  const statusColor = (s: string) => {
    switch ((s || '').toLowerCase()) {
      case 'active': return 'badge-active'
      case 'pending': return 'badge-pending'
      case 'blocked': return 'badge-blocked'
      default: return 'badge-pending'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendor Management</h1>
          <p className="text-muted-foreground mt-1">Manage your approved vendor network</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadVendors} className="p-2.5 border border-border rounded-lg hover:bg-surface-layer-1 transition-colors" title="Refresh">
            <RefreshCw size={18} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canManage && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
              <Plus size={18} />Add Vendor
            </button>
          )}
        </div>
      </div>

      {/* Success */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400">
          <CheckCircle size={16} /><span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400">
          <AlertCircle size={16} /><span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input type="text" placeholder="Search vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'pending', 'blocked'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-surface-layer-1 text-foreground border border-border hover:border-primary'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading vendors...</span>
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-foreground font-medium">No vendors found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {canManage ? 'Click "Add Vendor" to register your first vendor.' : 'No vendors have been registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-layer-1">
                <tr>
                  {['Vendor Name', 'Category', 'GSTIN', 'Contact', 'Email', 'Status', 'Rating', ...(canManage ? ['Actions'] : [])].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-sm font-semibold text-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id} className="border-b border-border hover:bg-surface-layer-1 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-foreground">{v.company_name}</td>
                    <td className="px-5 py-4 text-sm text-foreground">{v.category || '—'}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground font-mono">{v.gstin || '—'}</td>
                    <td className="px-5 py-4 text-sm text-foreground">{v.primary_contact_name || '—'}</td>
                    <td className="px-5 py-4 text-sm text-foreground">{v.primary_contact_email || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={statusColor(v.status)}>{(v.status || 'pending').charAt(0).toUpperCase() + (v.status || 'pending').slice(1).toLowerCase()}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < Math.floor(v.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} />
                        ))}
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <button className="p-1.5 hover:bg-surface-layer-2 rounded text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(v.id, v.company_name)} disabled={actionLoading === `del-${v.id}`}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Add New Vendor</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-surface-layer-1 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddVendor} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Company Name *</label>
                  <input required value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Acme Supplies Ltd." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                  <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Electronics" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">GSTIN</label>
                  <input value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="22AAAAA0000A1Z5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Contact Name</label>
                  <input value={form.primary_contact_name} onChange={e => setForm(f => ({ ...f, primary_contact_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Contact Phone</label>
                  <input value={form.primary_contact_phone} onChange={e => setForm(f => ({ ...f, primary_contact_phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="+91 98765 43210" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Contact Email</label>
                  <input type="email" value={form.primary_contact_email} onChange={e => setForm(f => ({ ...f, primary_contact_email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="vendor@company.com" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Address</label>
                  <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="123 Business Park, Mumbai 400001" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-border rounded-lg font-medium text-foreground hover:bg-surface-layer-1 transition-colors">Cancel</button>
                <button type="submit" disabled={actionLoading === 'add'} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {actionLoading === 'add' ? 'Adding...' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

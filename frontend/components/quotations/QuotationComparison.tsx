'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { RefreshCw, AlertCircle, Package, Send, CheckCircle, Plus, X, FileText } from 'lucide-react'

// ─── Shared types ─────────────────────────────────────────────────────────────
interface Quotation {
  id: string
  quotation_number?: string
  rfq_id: string
  rfq_title?: string
  vendor_id?: string
  vendor_name?: string
  total_amount?: number
  status: string
  payment_terms?: string
  notes?: string
  created_at?: string
  line_items?: any[]
}

interface RFQ {
  id: string
  rfq_number?: string
  title: string
  status: string
  deadline?: string
  created_at?: string
}

// ─── VENDOR VIEW: Submit Quotation ───────────────────────────────────────────
function VendorQuotationView() {
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [myQuotations, setMyQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [selectedRFQ, setSelectedRFQ] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [form, setForm] = useState({ total_amount: '', payment_terms: '', notes: '', validity_days: '30' })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rfqRes, qRes] = await Promise.all([
        api.rfqs.getAll({ status: 'SENT' }),
        api.quotations.getAll()
      ])
      setRfqs(rfqRes.data?.rfqs || rfqRes.data || [])
      setMyQuotations(qRes.data?.quotations || qRes.data || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRFQ || !form.total_amount) return
    setActionLoading('submit')
    try {
      const quotation = await api.quotations.create({
        rfq_id: selectedRFQ,
        total_amount: parseFloat(form.total_amount),
        payment_terms: form.payment_terms,
        notes: form.notes,
        validity_days: parseInt(form.validity_days)
      })
      if (quotation.data?.quotation?.id) {
        await api.quotations.submit(quotation.data.quotation.id)
      }
      setSuccessMsg('Quotation submitted successfully!')
      setTimeout(() => setSuccessMsg(null), 4000)
      setShowSubmitForm(false)
      setForm({ total_amount: '', payment_terms: '', notes: '', validity_days: '30' })
      load()
    } catch (e: any) {
      setError(e.message || 'Failed to submit quotation')
    } finally {
      setActionLoading(null)
    }
  }

  const statusBadge = (s: string) => {
    switch ((s || '').toUpperCase()) {
      case 'SUBMITTED': case 'PENDING': return 'badge-pending'
      case 'SELECTED': case 'APPROVED': return 'badge-approved'
      case 'REJECTED': return 'badge-blocked'
      default: return 'badge-active'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Quotations</h1>
          <p className="text-muted-foreground mt-1">Submit quotations for RFQs and track their status</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 border border-border rounded-lg hover:bg-surface-layer-1">
            <RefreshCw size={18} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowSubmitForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
            <Plus size={18} />Submit Quotation
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400">
          <CheckCircle size={16} /><span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-lg text-red-600 dark:text-red-400">
          <AlertCircle size={16} /><span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Open RFQs */}
      <div className="card-base p-5">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><FileText size={20} />Open RFQ Invitations</h2>
        {loading ? (
          <div className="flex items-center gap-3 py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-muted-foreground text-sm">Loading...</span></div>
        ) : rfqs.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">No open RFQs available right now. You'll be notified when procurement teams send RFQ invitations.</p>
        ) : (
          <div className="space-y-3">
            {rfqs.map(rfq => (
              <div key={rfq.id} className="flex items-center justify-between p-4 bg-surface-layer-1 rounded-lg border border-border">
                <div>
                  <p className="font-semibold text-foreground">{rfq.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{rfq.rfq_number} {rfq.deadline && `· Due: ${new Date(rfq.deadline).toLocaleDateString('en-IN')}`}</p>
                </div>
                <button onClick={() => { setSelectedRFQ(rfq.id); setShowSubmitForm(true) }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  <Send size={14} />Submit Quote
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Submitted Quotations */}
      <div className="card-base overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">My Submitted Quotations</h2>
        </div>
        {loading ? (
          <div className="flex items-center gap-3 p-6"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : myQuotations.length === 0 ? (
          <div className="text-center py-10">
            <Package size={36} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-foreground font-medium text-sm">No quotations submitted yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-layer-1">
              <tr>
                {['Quotation #', 'RFQ', 'Amount', 'Payment Terms', 'Status', 'Submitted'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-sm font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myQuotations.map(q => (
                <tr key={q.id} className="border-b border-border hover:bg-surface-layer-1 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-foreground">{q.quotation_number || q.id.slice(0, 8)}</td>
                  <td className="px-5 py-4 text-sm text-foreground">{q.rfq_title || q.rfq_id?.slice(0, 8)}</td>
                  <td className="px-5 py-4 text-sm font-bold text-primary">₹{parseFloat(String(q.total_amount || 0)).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-sm text-foreground">{q.payment_terms || '—'}</td>
                  <td className="px-5 py-4"><span className={statusBadge(q.status)}>{(q.status || '').replace('_', ' ')}</span></td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Submit Quotation Modal */}
      {showSubmitForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Submit Quotation</h2>
              <button onClick={() => setShowSubmitForm(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmitQuotation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Select RFQ *</label>
                <select required value={selectedRFQ} onChange={e => setSelectedRFQ(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">— Select an RFQ —</option>
                  {rfqs.map(r => <option key={r.id} value={r.id}>{r.title} ({r.rfq_number})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Total Quote Amount (₹) *</label>
                <input required type="number" min="0" step="0.01" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 250000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Payment Terms</label>
                <input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Net 30 days" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Validity (days)</label>
                <input type="number" min="1" value={form.validity_days} onChange={e => setForm(f => ({ ...f, validity_days: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes / Remarks</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Any additional notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSubmitForm(false)} className="flex-1 py-2.5 border border-border rounded-lg font-medium text-foreground hover:bg-surface-layer-1">Cancel</button>
                <button type="submit" disabled={actionLoading === 'submit'} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">
                  {actionLoading === 'submit' ? 'Submitting...' : 'Submit Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PROCUREMENT VIEW: Compare & Select ──────────────────────────────────────
function ProcurementQuotationView() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.quotations.getAll()
      setQuotations(res.data?.quotations || res.data || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load quotations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSelect = async (id: string) => {
    setActionLoading(id)
    try {
      await api.quotations.select(id)
      setSuccessMsg('Quotation selected and sent for approval!')
      setTimeout(() => setSuccessMsg(null), 4000)
      load()
    } catch (e: any) {
      setError(e.message || 'Failed to select quotation')
    } finally {
      setActionLoading(null)
    }
  }

  const statusBadge = (s: string) => {
    switch ((s || '').toUpperCase()) {
      case 'SUBMITTED': return 'badge-pending'
      case 'SELECTED': return 'badge-approved'
      case 'REJECTED': return 'badge-blocked'
      default: return 'badge-active'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotation Management</h1>
          <p className="text-muted-foreground mt-1">Review vendor quotations and select winners for approval</p>
        </div>
        <button onClick={load} className="p-2.5 border border-border rounded-lg hover:bg-surface-layer-1">
          <RefreshCw size={18} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400">
          <CheckCircle size={16} /><span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-lg text-red-600">
          <AlertCircle size={16} /><span className="text-sm">{error}</span>
        </div>
      )}

      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading quotations...</span>
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="font-medium text-foreground">No quotations received yet</p>
            <p className="text-muted-foreground text-sm mt-1">Send RFQs to vendors and their quotations will appear here.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-layer-1">
              <tr>
                {['Quotation #', 'RFQ', 'Vendor', 'Amount', 'Payment Terms', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-sm font-semibold text-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q.id} className="border-b border-border hover:bg-surface-layer-1 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-foreground">{q.quotation_number || q.id.slice(0, 8)}</td>
                  <td className="px-5 py-4 text-sm text-foreground">{q.rfq_title || q.rfq_id?.slice(0, 8)}</td>
                  <td className="px-5 py-4 text-sm text-foreground font-medium">{q.vendor_name || '—'}</td>
                  <td className="px-5 py-4 text-sm font-bold text-primary">₹{parseFloat(String(q.total_amount || 0)).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-sm text-foreground">{q.payment_terms || '—'}</td>
                  <td className="px-5 py-4"><span className={statusBadge(q.status)}>{(q.status || '').replace('_', ' ')}</span></td>
                  <td className="px-5 py-4">
                    {(q.status || '').toUpperCase() === 'SUBMITTED' ? (
                      <button onClick={() => handleSelect(q.id)} disabled={actionLoading === q.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                        <CheckCircle size={14} />
                        {actionLoading === q.id ? 'Selecting...' : 'Select Winner'}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{q.status === 'SELECTED' ? '✓ Selected' : '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Role Router ──────────────────────────────────────────────────────────────
export function QuotationComparison() {
  const { user } = useAuth()
  if (user?.role === 'vendor') return <VendorQuotationView />
  return <ProcurementQuotationView />
}

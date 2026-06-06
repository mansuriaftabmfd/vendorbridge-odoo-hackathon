'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle2, Clock, XCircle, RefreshCw, AlertCircle, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

interface Approval {
  id: string
  quotation_number?: string
  quotation_id: string
  vendor_name?: string
  total_amount?: number
  status: string
  requested_by?: string
  requested_by_name?: string
  approved_by_name?: string
  remarks?: string
  created_at?: string
  updated_at?: string
}

export function ApprovalWorkflow() {
  const { user } = useAuth()
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('PENDING')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const canAct = ['manager', 'admin'].includes(user?.role || '')

  const loadApprovals = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params: Record<string, string> = {}
      if (filterStatus !== 'all') params.status = filterStatus
      const res = await api.approvals.getAll(params)
      if (res.success && res.data?.approvals) {
        setApprovals(res.data.approvals)
      } else {
        setApprovals([])
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { loadApprovals() }, [loadApprovals])

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'request-changes') => {
    const remark = remarks[id] || ''
    if ((action === 'reject' || action === 'request-changes') && !remark) {
      setError('Remarks are required for rejection or change requests.')
      return
    }
    setActionLoading(`${action}-${id}`)
    setError(null)
    try {
      if (action === 'approve') await api.approvals.approve(id, remark)
      else if (action === 'reject') await api.approvals.reject(id, remark)
      else await api.approvals.requestChanges(id, remark)

      setSuccessMsg(action === 'approve' ? 'Quotation approved & PO generated!' : action === 'reject' ? 'Quotation rejected.' : 'Changes requested.')
      setTimeout(() => setSuccessMsg(null), 4000)
      setRemarks(r => ({ ...r, [id]: '' }))
      loadApprovals()
    } catch (e: any) {
      setError(e.message || `Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const statusIcon = (s: string) => {
    switch ((s || '').toUpperCase()) {
      case 'APPROVED': return <CheckCircle2 size={18} className="text-green-500" />
      case 'REJECTED': return <XCircle size={18} className="text-red-500" />
      case 'CHANGES_REQUESTED': return <MessageSquare size={18} className="text-yellow-500" />
      default: return <Clock size={18} className="text-blue-400" />
    }
  }

  const statusBadge = (s: string) => {
    switch ((s || '').toUpperCase()) {
      case 'APPROVED': return 'badge-approved'
      case 'REJECTED': return 'badge-blocked'
      case 'CHANGES_REQUESTED': return 'badge-pending'
      default: return 'badge-active'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Approval Workflow</h1>
          <p className="text-muted-foreground mt-1">Review and approve quotations & purchase orders</p>
        </div>
        <button onClick={loadApprovals} className="p-2.5 border border-border rounded-lg hover:bg-surface-layer-1 transition-colors" title="Refresh">
          <RefreshCw size={18} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400">
          <CheckCircle2 size={16} /><span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400">
          <AlertCircle size={16} /><span className="text-sm">{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[
          { value: 'PENDING', label: 'Pending' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'REJECTED', label: 'Rejected' },
          { value: 'all', label: 'All' },
        ].map(tab => (
          <button key={tab.value} onClick={() => setFilterStatus(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${filterStatus === tab.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading approvals...</span>
        </div>
      ) : approvals.length === 0 ? (
        <div className="card-base p-16 text-center">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-foreground font-medium">No {filterStatus !== 'all' ? filterStatus.toLowerCase() : ''} approvals</p>
          <p className="text-muted-foreground text-sm mt-1">Approvals will appear here when quotations are submitted for review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map(approval => (
            <div key={approval.id} className="card-base overflow-hidden">
              {/* Approval Header */}
              <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  {statusIcon(approval.status)}
                  <div>
                    <p className="font-bold text-foreground">{approval.quotation_number || `Quotation #${approval.quotation_id?.slice(0, 8)}`}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{approval.vendor_name || 'Vendor'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {approval.total_amount && (
                    <span className="text-lg font-bold text-primary">₹{parseFloat(String(approval.total_amount)).toLocaleString('en-IN')}</span>
                  )}
                  <span className={statusBadge(approval.status)}>
                    {(approval.status || 'PENDING').replace('_', ' ')}
                  </span>
                  <button onClick={() => setExpanded(expanded === approval.id ? null : approval.id)}
                    className="p-1.5 hover:bg-surface-layer-1 rounded transition-colors text-muted-foreground">
                    {expanded === approval.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded Detail & Actions */}
              {expanded === approval.id && (
                <div className="border-t border-border p-5 bg-surface-layer-1 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Requested By</p>
                      <p className="font-medium text-foreground">{approval.requested_by_name || '—'}</p>
                    </div>
                    {approval.approved_by_name && (
                      <div>
                        <p className="text-muted-foreground mb-1">Reviewed By</p>
                        <p className="font-medium text-foreground">{approval.approved_by_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground mb-1">Submitted</p>
                      <p className="font-medium text-foreground">
                        {approval.created_at ? new Date(approval.created_at).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </div>
                    {approval.remarks && (
                      <div className="col-span-2 md:col-span-3">
                        <p className="text-muted-foreground mb-1">Remarks</p>
                        <p className="font-medium text-foreground bg-card rounded p-2 border border-border">{approval.remarks}</p>
                      </div>
                    )}
                  </div>

                  {/* Action panel — only for PENDING + manager/admin */}
                  {canAct && (approval.status || '').toUpperCase() === 'PENDING' && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <label className="block text-sm font-medium text-foreground">
                        Remarks <span className="text-muted-foreground text-xs">(required for Reject / Request Changes)</span>
                      </label>
                      <textarea
                        value={remarks[approval.id] || ''}
                        onChange={e => setRemarks(r => ({ ...r, [approval.id]: e.target.value }))}
                        placeholder="Enter your decision remarks..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleAction(approval.id, 'approve')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle2 size={16} />
                          {actionLoading === `approve-${approval.id}` ? 'Approving...' : 'Approve & Generate PO'}
                        </button>
                        <button
                          onClick={() => handleAction(approval.id, 'request-changes')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold text-sm hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                        >
                          <MessageSquare size={16} />
                          {actionLoading === `request-changes-${approval.id}` ? 'Sending...' : 'Request Changes'}
                        </button>
                        <button
                          onClick={() => handleAction(approval.id, 'reject')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          <XCircle size={16} />
                          {actionLoading === `reject-${approval.id}` ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

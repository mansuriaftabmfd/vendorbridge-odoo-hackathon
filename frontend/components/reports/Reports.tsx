'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { TrendingUp, BarChart3, Users, CheckCircle, Download, RefreshCw, AlertCircle } from 'lucide-react'

export function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('month')
  const [stats, setStats] = useState<any>(null)
  const [vendorPerf, setVendorPerf] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [spendRes, perfRes, trendRes] = await Promise.allSettled([
        api.reports.spending({ period }),
        api.reports.vendorPerformance(),
        api.reports.procurementTrends(),
      ])

      if (spendRes.status === 'fulfilled' && spendRes.value?.data) {
        setStats(spendRes.value.data.spending || spendRes.value.data)
      }
      if (perfRes.status === 'fulfilled' && perfRes.value?.data) {
        setVendorPerf(perfRes.value.data.vendors || [])
      }
      if (trendRes.status === 'fulfilled' && trendRes.value?.data) {
        setTrends(trendRes.value.data.trends || [])
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  const handleExport = async (type: string) => {
    setExporting(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reports/export/${type}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${type}-report.csv`
      document.body.appendChild(a); a.click()
      URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch (e: any) {
      setError(e.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // Compute summary cards from spending data
  const summaryCards = [
    {
      label: 'Total Spend (Period)',
      value: stats?.total_spend ? `₹${parseFloat(stats.total_spend).toLocaleString('en-IN')}` : (loading ? '...' : '₹0'),
      icon: TrendingUp, iconClass: 'text-blue-500',
    },
    {
      label: 'Total POs',
      value: stats?.total_pos ?? (loading ? '...' : '0'),
      icon: BarChart3, iconClass: 'text-green-500',
    },
    {
      label: 'Active Vendors',
      value: vendorPerf.length || (loading ? '...' : '0'),
      icon: Users, iconClass: 'text-purple-500',
    },
    {
      label: 'Avg PO Value',
      value: stats?.avg_po_value ? `₹${parseFloat(stats.avg_po_value).toLocaleString('en-IN')}` : (loading ? '...' : '₹0'),
      icon: CheckCircle, iconClass: 'text-orange-500',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Live procurement insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 border border-border rounded-lg hover:bg-surface-layer-1" title="Refresh">
            <RefreshCw size={18} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => handleExport('vendor-performance')} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Download size={18} />{exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-lg text-red-600">
          <AlertCircle size={16} /><span className="text-sm">{error}</span>
        </div>
      )}

      {/* Period Filter */}
      <div className="flex gap-2 flex-wrap">
        {[{ id: 'week', label: 'This Week' }, { id: 'month', label: 'This Month' }, { id: 'quarter', label: 'This Quarter' }, { id: 'year', label: 'This Year' }].map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p.id ? 'bg-primary text-primary-foreground' : 'bg-surface-layer-1 text-foreground border border-border hover:border-primary'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, i) => (
          <div key={i} className="card-base p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{card.label}</p>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
              </div>
              <div className="p-3 bg-surface-layer-2 rounded-lg">
                <card.icon size={24} className={card.iconClass} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Trends */}
      {trends.length > 0 && (
        <div className="card-base p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Monthly Procurement Trends</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-layer-1">
                <tr>
                  {Object.keys(trends[0] || {}).map(k => (
                    <th key={k} className="px-4 py-3 text-left font-semibold text-foreground capitalize">{k.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trends.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-surface-layer-1">
                    {Object.values(row).map((v: any, j) => (
                      <td key={j} className="px-4 py-3 text-foreground">
                        {typeof v === 'number' && v > 1000 ? `₹${v.toLocaleString('en-IN')}` : String(v ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vendor Performance Table */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Vendor Performance</h3>
          <button onClick={() => handleExport('vendor-performance')} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Download size={12} />Export
          </button>
        </div>
        {loading ? (
          <div className="flex items-center gap-3 py-6">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground text-sm">Loading vendor performance...</span>
          </div>
        ) : vendorPerf.length === 0 ? (
          <div className="text-center py-8">
            <Users size={36} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground text-sm">No vendor performance data yet. Complete purchase orders to see metrics here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-layer-1">
                <tr>
                  {Object.keys(vendorPerf[0] || {}).map(k => (
                    <th key={k} className="px-5 py-3 text-left font-semibold text-foreground capitalize whitespace-nowrap">{k.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendorPerf.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-surface-layer-1 transition-colors">
                    {Object.entries(row).map(([k, v]: any, j) => (
                      <td key={j} className="px-5 py-4 text-foreground">
                        {k.includes('amount') || k.includes('spend') || k.includes('value')
                          ? `₹${parseFloat(v || 0).toLocaleString('en-IN')}`
                          : String(v ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

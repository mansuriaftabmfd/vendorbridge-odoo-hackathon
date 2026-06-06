'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, ChevronRight, ChevronLeft, Send, Save, CheckCircle, AlertCircle, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LineItem { id: string; description: string; quantity: number; unit_price: number }

export function RFQWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [vendors, setVendors] = useState<any[]>([])
  const [vendorsLoading, setVendorsLoading] = useState(false)
  const [createdRFQId, setCreatedRFQId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '', category: 'Electronics', description: '', deadline: '',
    items: [{ id: '1', description: '', quantity: 1, unit_price: 0 }] as LineItem[],
    selectedVendors: [] as string[],
  })

  // Load real vendors on step 3
  useEffect(() => {
    if (step === 3 && vendors.length === 0) {
      setVendorsLoading(true)
      api.vendors.getAll({ status: 'ACTIVE', limit: '50' })
        .then(res => setVendors(res.data?.vendors || []))
        .catch(() => setVendors([]))
        .finally(() => setVendorsLoading(false))
    }
  }, [step])

  const handleAddItem = () => {
    setFormData(f => ({ ...f, items: [...f.items, { id: Date.now().toString(), description: '', quantity: 1, unit_price: 0 }] }))
  }

  const handleDeleteItem = (id: string) => {
    setFormData(f => ({ ...f, items: f.items.filter(i => i.id !== id) }))
  }

  const handleItemChange = (id: string, field: string, value: any) => {
    setFormData(f => ({ ...f, items: f.items.map(item => item.id === id ? { ...item, [field]: value } : item) }))
  }

  const handleVendorToggle = (vendorId: string) => {
    setFormData(f => ({
      ...f,
      selectedVendors: f.selectedVendors.includes(vendorId)
        ? f.selectedVendors.filter(v => v !== vendorId)
        : [...f.selectedVendors, vendorId]
    }))
  }

  const totalAmount = formData.items.reduce((sum, i) => sum + (i.quantity * i.unit_price || 0), 0)

  const validateStep = () => {
    if (step === 1) {
      if (!formData.title.trim()) return 'RFQ title is required'
      if (!formData.deadline) return 'Deadline is required'
      return null
    }
    if (step === 2) {
      if (formData.items.length === 0) return 'Add at least one line item'
      if (formData.items.some(i => !i.description.trim())) return 'All items must have a description'
      return null
    }
    if (step === 3) {
      if (formData.selectedVendors.length === 0) return 'Select at least one vendor to send the RFQ'
      return null
    }
    return null
  }

  const handleNext = () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
  }

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) { setError('Title required to save draft'); return }
    setSubmitting(true); setError(null)
    try {
      const res = await api.rfqs.create({
        title: formData.title, category: formData.category,
        description: formData.description, deadline: formData.deadline || undefined,
        line_items: formData.items.map(({ id, description, ...rest }) => ({
          item_name: description,
          description: '',
          ...rest
        })),
        vendor_ids: formData.selectedVendors,
        status: 'DRAFT'
      })
      setCreatedRFQId(res.data?.rfq?.id || null)
      setSuccess('RFQ saved as draft successfully!')
      setTimeout(() => router.push('/rfq'), 2000)
    } catch (e: any) {
      setError(e.message || 'Failed to save draft')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendRFQ = async () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setSubmitting(true); setError(null)
    try {
      // Step 1: Create the RFQ — map frontend field names to backend schema
      const res = await api.rfqs.create({
        title: formData.title, category: formData.category,
        description: formData.description, deadline: formData.deadline || undefined,
        // Backend DB: rfq_line_items requires `item_name` (NOT description)
        line_items: formData.items.map(({ id, description, ...rest }) => ({
          item_name: description, // map frontend 'description' → backend 'item_name'
          description: '',        // optional detail field
          ...rest
        })),
        vendor_ids: formData.selectedVendors,
      })
      const rfqId = res.data?.rfq?.id
      if (!rfqId) throw new Error('RFQ created but ID missing')

      // Step 2: Send it to vendors
      await api.rfqs.send(rfqId)
      setSuccess(`RFQ "${formData.title}" sent to ${formData.selectedVendors.length} vendor(s)! Redirecting...`)
      setTimeout(() => router.push('/rfq'), 2500)
    } catch (e: any) {
      setError(e.message || 'Failed to send RFQ')
    } finally {
      setSubmitting(false)
    }
  }

  const steps = [{ num: 1, label: 'RFQ Details' }, { num: 2, label: 'Line Items' }, { num: 3, label: 'Vendor Selection' }]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create RFQ</h1>
        <p className="text-muted-foreground mt-1">Request for Quotation Wizard — fill in details, add items, then send to vendors</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center">
        {steps.map((s, index) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all ${step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-surface-layer-2 text-muted-foreground'}`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <p className={`text-sm font-medium hidden sm:block ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</p>
            </div>
            {index < 2 && <div className={`flex-1 h-0.5 mx-3 ${step > s.num ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400">
          <CheckCircle size={18} /><span className="font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-lg text-red-600 dark:text-red-400">
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="card-base p-8">
        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Step 1: RFQ Details</h2>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">RFQ Title *</label>
              <input type="text" value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Procurement of Electronic Components" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  {['Electronics', 'Raw Materials', 'Components', 'Logistics', 'Services', 'Office Supplies', 'IT Equipment', 'Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Quotation Deadline *</label>
                <input type="date" value={formData.deadline} onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description</label>
              <textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={4}
                className="w-full px-4 py-2.5 rounded-lg bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Provide requirements, specifications, terms..." />
            </div>
          </div>
        )}

        {/* Step 2: Line Items */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Step 2: Line Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-layer-1">
                  <tr>
                    {['Item Description *', 'Qty', 'Est. Unit Price (₹)', 'Total (₹)', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map(item => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-4 py-3">
                        <input value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 rounded bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="e.g. CPU Intel i7" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1.5 rounded bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-28 px-2 py-1.5 rounded bg-surface-layer-1 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="0.00" />
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-primary">₹{((item.quantity * item.unit_price) || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteItem(item.id)} disabled={formData.items.length === 1}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500 disabled:opacity-30 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={handleAddItem} className="flex items-center gap-2 px-4 py-2 border border-dashed border-primary text-primary rounded-lg font-medium hover:bg-primary hover:bg-opacity-5 transition-colors text-sm">
              <Plus size={16} />Add Item
            </button>
            <div className="bg-surface-layer-1 p-4 rounded-lg flex justify-between items-center">
              <p className="text-foreground font-semibold">Estimated Total:</p>
              <p className="text-2xl font-bold text-primary">₹{totalAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}

        {/* Step 3: Vendor Selection */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Step 3: Select Vendors</h2>
            <p className="text-muted-foreground text-sm">Choose which vendors should receive this RFQ and submit quotations.</p>
            {vendorsLoading ? (
              <div className="flex items-center gap-3 py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-muted-foreground">Loading vendors...</span>
              </div>
            ) : vendors.length === 0 ? (
              <div className="text-center py-8 bg-surface-layer-1 rounded-lg">
                <p className="text-foreground font-medium">No active vendors found</p>
                <p className="text-muted-foreground text-sm mt-1">Add vendors in Vendor Management first, then come back to create RFQs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vendors.map(vendor => (
                  <div key={vendor.id} onClick={() => handleVendorToggle(vendor.id)} role="button"
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.selectedVendors.includes(vendor.id) ? 'border-primary bg-primary bg-opacity-5 ring-1 ring-primary ring-opacity-30' : 'border-border hover:border-primary hover:border-opacity-50'}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" readOnly checked={formData.selectedVendors.includes(vendor.id)}
                        className="w-4 h-4 accent-primary cursor-pointer" />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{vendor.company_name}</p>
                        <p className="text-sm text-muted-foreground">{vendor.category || 'General'} {vendor.primary_contact_email && `· ${vendor.primary_contact_email}`}</p>
                      </div>
                      {vendor.rating && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star size={14} className="fill-yellow-400" />
                          <span className="text-sm font-medium text-foreground">{vendor.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {formData.selectedVendors.length > 0 && (
              <p className="text-sm font-medium text-primary">{formData.selectedVendors.length} vendor(s) selected</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <button onClick={() => { setStep(s => Math.max(1, s - 1)); setError(null) }} disabled={step === 1}
          className="flex items-center gap-2 px-6 py-2.5 bg-surface-layer-2 text-foreground rounded-lg font-medium hover:bg-surface-layer-3 disabled:opacity-50 transition-colors">
          <ChevronLeft size={18} />Back
        </button>

        <div className="flex gap-3">
          <button onClick={handleSaveDraft} disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 border border-border text-foreground rounded-lg font-medium hover:bg-surface-layer-1 disabled:opacity-50 transition-colors text-sm">
            <Save size={16} />{submitting ? 'Saving...' : 'Save Draft'}
          </button>
          {step < 3 ? (
            <button onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
              Next<ChevronRight size={18} />
            </button>
          ) : (
            <button onClick={handleSendRFQ} disabled={submitting || formData.selectedVendors.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              <Send size={18} />{submitting ? 'Sending...' : 'Send RFQ to Vendors'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

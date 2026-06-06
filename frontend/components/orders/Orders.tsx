'use client'

import { Download, Eye, Share2, Mail } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface PurchaseOrder {
  id: string
  poNumber: string
  vendorId: string
  vendorName: string
  status: 'draft' | 'sent' | 'confirmed' | 'completed'
  items: LineItem[]
  subtotal: number
  tax: number
  total: number
  createdDate: string
  deliveryDate: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  poNumber: string
  vendorId: string
  vendorName: string
  status: 'draft' | 'sent' | 'paid'
  items: LineItem[]
  subtotal: number
  tax: number
  total: number
  dueDate: string
  bankDetails: string
}

export function Orders() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'po' | 'invoice'>('po')
  const [loading, setLoading] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [error, setError] = useState<string | null>(null)

  // Load data on component mount and when user changes
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setDataLoading(true)
    setError(null)
    
    try {
      // Load Purchase Orders
      const poResponse = await api.pos.getAll()
      if (poResponse.success && poResponse.data && Array.isArray(poResponse.data)) {
        const formattedPOs = poResponse.data.map((po: any) => ({
          id: po.id,
          poNumber: po.po_number,
          vendorId: po.vendor_id,
          vendorName: po.vendor_name || 'Unknown Vendor',
          status: (po.status || 'draft').toLowerCase(),
          items: po.line_items || [],
          subtotal: parseFloat(po.subtotal || 0),
          tax: parseFloat(po.tax_amount || 0),
          total: parseFloat(po.total_amount || 0),
          createdDate: new Date(po.created_at).toLocaleDateString(),
          deliveryDate: po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : 'TBD'
        }))
        setPurchaseOrders(formattedPOs)
      } else {
        setPurchaseOrders([])
      }

      // Load Invoices
      try {
        const invoiceResponse = await api.invoices.getAll()
        if (invoiceResponse.success && invoiceResponse.data && Array.isArray(invoiceResponse.data)) {
          const formattedInvoices = invoiceResponse.data.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            poNumber: inv.po_number,
            vendorId: inv.vendor_id,
            vendorName: inv.vendor_name || 'Unknown Vendor',
            status: (inv.status || 'draft').toLowerCase(),
            items: [], // Line items would come from PO
            subtotal: parseFloat(inv.subtotal || 0),
            tax: parseFloat(inv.tax_amount || 0),
            total: parseFloat(inv.total_amount || 0),
            dueDate: new Date(inv.due_date).toLocaleDateString(),
            bankDetails: inv.bank_details || ''
          }))
          setInvoices(formattedInvoices)
        } else {
          setInvoices([])
        }
      } catch (invError) {
        console.log('No invoices found or error loading invoices:', invError)
        setInvoices([])
      }

    } catch (error: any) {
      console.error('Error loading data:', error)
      setError(`Failed to load data: ${error.message || 'Please try again.'}`)
      setPurchaseOrders([])
      setInvoices([])
    } finally {
      setDataLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'approved':
        return 'badge-active'
      case 'completed':
      case 'paid':
        return 'badge-approved'
      case 'sent':
        return 'badge-pending'
      default:
        return 'badge-active'
    }
  }

  // Handle PO actions
  const handleViewPO = async (id: string) => {
    try {
      setLoading(`view-po-${id}`)
      // First try to get data from API, fallback to mock data
      try {
        const response = await api.pos.getById(id)
        if (response.success) {
          console.log('PO Details:', response.data)
          alert(`PO Details loaded for PO #${response.data.po_number}`)
        }
      } catch (apiError) {
        // If API fails, show mock data info
        const mockPO = mockPOs.find(po => po.id === id)
        if (mockPO) {
          console.log('Mock PO Details:', mockPO)
          alert(`Mock PO Details for PO #${mockPO.poNumber}\nVendor: ${mockPO.vendorName}\nTotal: ₹${mockPO.total.toLocaleString()}`)
        } else {
          throw new Error('PO not found')
        }
      }
    } catch (error) {
      console.error('Failed to load PO details:', error)
      alert('Failed to load PO details. This might be mock data that doesn\'t exist in the database yet.')
    } finally {
      setLoading(null)
    }
  }

  const handleDownloadPOPDF = async (id: string, poNumber: string) => {
    try {
      setLoading(`download-po-${id}`)
      
      // For mock data, show a demo message
      const mockPO = mockPOs.find(po => po.id === id)
      if (mockPO) {
        alert(`PDF download would work for real PO data.\n\nThis is mock data for: ${poNumber}\nIn a real system, this would download the PDF file.`)
        setLoading(null)
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/pos/${id}/pdf`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      // Create download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `PO_${poNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download PO PDF:', error)
      alert('Failed to download PDF. This might be mock data that doesn\'t exist in the database yet.')
    } finally {
      setLoading(null)
    }
  }

  // Handle Invoice actions
  const handleViewInvoice = async (id: string) => {
    try {
      setLoading(`view-invoice-${id}`)
      
      try {
        const response = await api.invoices.getById(id)
        if (response.success) {
          console.log('Invoice Details:', response.data)
          alert(`Invoice Details loaded for Invoice #${response.data.invoice_number}`)
        }
      } catch (apiError) {
        // If API fails, show mock data info
        const mockInvoice = mockInvoices.find(inv => inv.id === id)
        if (mockInvoice) {
          console.log('Mock Invoice Details:', mockInvoice)
          alert(`Mock Invoice Details for Invoice #${mockInvoice.invoiceNumber}\nVendor: ${mockInvoice.vendorName}\nTotal: ₹${mockInvoice.total.toLocaleString()}\nDue: ${mockInvoice.dueDate}`)
        } else {
          throw new Error('Invoice not found')
        }
      }
    } catch (error) {
      console.error('Failed to load invoice details:', error)
      alert('Failed to load invoice details. This might be mock data that doesn\'t exist in the database yet.')
    } finally {
      setLoading(null)
    }
  }

  const handleDownloadInvoicePDF = async (id: string, invoiceNumber: string) => {
    try {
      setLoading(`download-invoice-${id}`)
      
      // For mock data, show a demo message
      const mockInvoice = mockInvoices.find(inv => inv.id === id)
      if (mockInvoice) {
        alert(`PDF download would work for real invoice data.\n\nThis is mock data for: ${invoiceNumber}\nIn a real system, this would download the PDF file.`)
        setLoading(null)
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/invoices/${id}/pdf`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `Invoice_${invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download Invoice PDF:', error)
      alert('Failed to download PDF. This might be mock data that doesn\'t exist in the database yet.')
    } finally {
      setLoading(null)
    }
  }

  const handleEmailInvoice = async (id: string, invoiceNumber: string) => {
    try {
      setLoading(`email-invoice-${id}`)
      
      // For mock data, show a demo message
      const mockInvoice = mockInvoices.find(inv => inv.id === id)
      if (mockInvoice) {
        alert(`Email functionality would work for real invoice data.\n\nThis is mock data for: ${invoiceNumber}\nIn a real system, this would send the invoice via email.\n\nTo enable email: Set up Gmail App Password in backend/.env`)
        setLoading(null)
        return
      }

      const response = await api.invoices.send(id)
      if (response.success) {
        alert(`Invoice #${invoiceNumber} has been sent via email successfully!`)
      }
    } catch (error) {
      console.error('Failed to email invoice:', error)
      alert('Failed to send invoice via email. Please ensure your Gmail App Password is configured in the backend.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Purchase Orders & Invoices</h1>
        <p className="text-muted-foreground mt-1">Manage your orders and track invoices</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'po', label: 'Purchase Orders' },
          { id: 'invoice', label: 'Invoices' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PO List */}
      {activeTab === 'po' && (
        <div className="space-y-4">
          {dataLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading purchase orders...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={loadData}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-opacity-90"
              >
                Retry
              </button>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No purchase orders found</p>
              <p className="text-sm text-muted-foreground">Create some purchase orders to see them here</p>
            </div>
          ) : (
            purchaseOrders.map((po) => (
              <div key={po.id} className="card-base p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PO Number</p>
                    <p className="font-bold text-foreground">{po.poNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Vendor</p>
                    <p className="font-semibold text-foreground">{po.vendorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className="font-bold text-primary">₹{po.total.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <span className={getStatusBadge(po.status)}>
                      {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Created</p>
                    <p className="font-semibold text-foreground">{po.createdDate}</p>
                  </div>
                </div>

                {/* Items Preview */}
                {po.items.length > 0 && (
                  <div className="bg-surface-layer-1 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-foreground mb-2">Items ({po.items.length})</p>
                    <div className="space-y-1">
                      {po.items.slice(0, 3).map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {item.description} × {item.quantity}
                        </p>
                      ))}
                      {po.items.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{po.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewPO(po.id)}
                    disabled={loading === `view-po-${po.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye size={16} />
                    {loading === `view-po-${po.id}` ? 'Loading...' : 'View Details'}
                  </button>
                  <button 
                    onClick={() => handleDownloadPOPDF(po.id, po.poNumber)}
                    disabled={loading === `download-po-${po.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={16} />
                    {loading === `download-po-${po.id}` ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button 
                    onClick={() => navigator.share ? navigator.share({
                      title: `Purchase Order ${po.poNumber}`,
                      text: `PO #${po.poNumber} from ${po.vendorName} - ₹${po.total.toLocaleString()}`,
                      url: window.location.href
                    }) : alert('Share functionality is not supported in your browser')}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-layer-2 text-foreground rounded-lg font-medium text-sm hover:bg-surface-layer-3 transition-colors"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Invoice List */}
      {activeTab === 'invoice' && (
        <div className="space-y-4">
          {dataLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading invoices...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={loadData}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-opacity-90"
              >
                Retry
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No invoices found</p>
              <p className="text-sm text-muted-foreground">Create some invoices to see them here</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="card-base p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Invoice #</p>
                    <p className="font-bold text-foreground">{invoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Vendor</p>
                    <p className="font-semibold text-foreground">{invoice.vendorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className="font-bold text-primary">₹{invoice.total.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <span className={getStatusBadge(invoice.status)}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                    <p className="font-semibold text-foreground">{invoice.dueDate}</p>
                  </div>
                </div>

                {/* Invoice Summary */}
                <div className="bg-surface-layer-1 rounded-lg p-4 mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">₹{invoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-foreground">₹{invoice.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary">₹{invoice.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewInvoice(invoice.id)}
                    disabled={loading === `view-invoice-${invoice.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye size={16} />
                    {loading === `view-invoice-${invoice.id}` ? 'Loading...' : 'View Invoice'}
                  </button>
                  <button 
                    onClick={() => handleDownloadInvoicePDF(invoice.id, invoice.invoiceNumber)}
                    disabled={loading === `download-invoice-${invoice.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={16} />
                    {loading === `download-invoice-${invoice.id}` ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button 
                    onClick={() => handleEmailInvoice(invoice.id, invoice.invoiceNumber)}
                    disabled={loading === `email-invoice-${invoice.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-layer-2 text-foreground rounded-lg font-medium text-sm hover:bg-surface-layer-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail size={16} />
                    {loading === `email-invoice-${invoice.id}` ? 'Sending...' : 'Email'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

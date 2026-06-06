// Mock data for VendorBridge ERP

export interface Vendor {
  id: string
  name: string
  category: string
  gstin: string
  contact: string
  email: string
  status: 'active' | 'pending' | 'blocked'
  rating: number
  totalSpend: number
}

export interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface RFQ {
  id: string
  title: string
  category: string
  description: string
  deadline: string
  status: 'draft' | 'sent' | 'closed' | 'awarded'
  items: LineItem[]
  selectedVendors: string[]
  createdDate: string
}

export interface Quotation {
  id: string
  rfqId: string
  vendorId: string
  vendorName: string
  lineItems: Array<{
    itemId: string
    unitPrice: number
    deliveryDays: number
    notes: string
  }>
  totalPrice: number
  rating: number
  paymentTerms: string
  submittedDate: string
}

export interface ApprovalWorkflow {
  id: string
  rfqId: string
  vendorId: string
  vendorName: string
  amount: number
  currentStage: 'quotation' | 'manager_review' | 'finance' | 'final_po'
  stages: Array<{
    name: string
    status: 'completed' | 'pending' | 'in_progress'
    assignee: string
    timestamp?: string
  }>
  timeline: Array<{
    stage: string
    action: string
    user: string
    timestamp: string
  }>
  justification: string
}

export interface PurchaseOrder {
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

export interface Invoice {
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

export interface Activity {
  id: string
  type: 'rfq_created' | 'quotation_submitted' | 'approval_approved' | 'po_generated' | 'invoice_created'
  user: string
  action: string
  timestamp: string
  entityId: string
}

// Mock Vendors
export const mockVendors: Vendor[] = [
  {
    id: 'v1',
    name: 'TechSupply Co.',
    category: 'Electronics',
    gstin: '18AABCT1234E1Z0',
    contact: '+91-9876543210',
    email: 'contact@techsupply.com',
    status: 'active',
    rating: 4.5,
    totalSpend: 250000,
  },
  {
    id: 'v2',
    name: 'Premium Materials Ltd.',
    category: 'Raw Materials',
    gstin: '27AABCT5678F1Z0',
    contact: '+91-9876543211',
    email: 'contact@premiummaterials.com',
    status: 'active',
    rating: 4.2,
    totalSpend: 180000,
  },
  {
    id: 'v3',
    name: 'Quick Logistics Inc.',
    category: 'Logistics',
    gstin: '29AABCT9101G1Z0',
    contact: '+91-9876543212',
    email: 'contact@quicklogistics.com',
    status: 'pending',
    rating: 3.8,
    totalSpend: 95000,
  },
  {
    id: 'v4',
    name: 'Industrial Parts Co.',
    category: 'Components',
    gstin: '33AABCT1121H1Z0',
    contact: '+91-9876543213',
    email: 'contact@industrialparts.com',
    status: 'active',
    rating: 4.7,
    totalSpend: 320000,
  },
]

// Mock RFQs
export const mockRFQs: RFQ[] = [
  {
    id: 'rfq1',
    title: 'Procurement of Electronic Components',
    category: 'Electronics',
    description: 'Required: CPU, Memory modules, Power supplies',
    deadline: '2026-06-20',
    status: 'sent',
    items: [
      { id: 'item1', description: 'CPU Units', quantity: 50, unitPrice: 0, total: 0 },
      { id: 'item2', description: 'RAM Modules (16GB)', quantity: 100, unitPrice: 0, total: 0 },
      { id: 'item3', description: 'Power Supply (500W)', quantity: 50, unitPrice: 0, total: 0 },
    ],
    selectedVendors: ['v1', 'v2'],
    createdDate: '2026-06-06',
  },
  {
    id: 'rfq2',
    title: 'Raw Materials Sourcing',
    category: 'Raw Materials',
    description: 'Need quality steel and aluminum for manufacturing',
    deadline: '2026-06-25',
    status: 'sent',
    items: [
      { id: 'item4', description: 'Steel Sheets (Grade A)', quantity: 1000, unitPrice: 0, total: 0 },
      { id: 'item5', description: 'Aluminum Ingots', quantity: 500, unitPrice: 0, total: 0 },
    ],
    selectedVendors: ['v2', 'v3'],
    createdDate: '2026-06-04',
  },
]

// Mock Quotations
export const mockQuotations: Quotation[] = [
  {
    id: 'q1',
    rfqId: 'rfq1',
    vendorId: 'v1',
    vendorName: 'TechSupply Co.',
    lineItems: [
      { itemId: 'item1', unitPrice: 8500, deliveryDays: 7, notes: 'Stock available' },
      { itemId: 'item2', unitPrice: 4200, deliveryDays: 5, notes: 'Premium RAM' },
      { itemId: 'item3', unitPrice: 3200, deliveryDays: 7, notes: 'Certified power supply' },
    ],
    totalPrice: 785000,
    rating: 4.5,
    paymentTerms: 'Net 30',
    submittedDate: '2026-06-07',
  },
  {
    id: 'q2',
    rfqId: 'rfq1',
    vendorId: 'v4',
    vendorName: 'Industrial Parts Co.',
    lineItems: [
      { itemId: 'item1', unitPrice: 7800, deliveryDays: 5, notes: 'Best price' },
      { itemId: 'item2', unitPrice: 4500, deliveryDays: 7, notes: 'Standard RAM' },
      { itemId: 'item3', unitPrice: 3000, deliveryDays: 10, notes: 'Economy power supply' },
    ],
    totalPrice: 765000,
    rating: 4.7,
    paymentTerms: 'Net 45',
    submittedDate: '2026-06-08',
  },
]

// Mock Approvals
export const mockApprovals: ApprovalWorkflow[] = [
  {
    id: 'apr1',
    rfqId: 'rfq1',
    vendorId: 'v1',
    vendorName: 'TechSupply Co.',
    amount: 785000,
    currentStage: 'manager_review',
    stages: [
      { name: 'Quotation', status: 'completed', assignee: 'Procurement' },
      { name: 'Manager Review', status: 'in_progress', assignee: 'John Manager' },
      { name: 'Finance', status: 'pending', assignee: 'Finance Team' },
      { name: 'Final PO', status: 'pending', assignee: 'Admin' },
    ],
    timeline: [
      {
        stage: 'Quotation',
        action: 'Quotation received and verified',
        user: 'Procurement Officer',
        timestamp: '2026-06-07 14:30',
      },
    ],
    justification: 'Selected based on best quality and delivery timeline',
  },
]

// Mock Purchase Orders
export const mockPOs: PurchaseOrder[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    poNumber: 'PO-2026-001',
    vendorId: 'b2c3d4e5-f6g7-8901-bcde-f12345678901',
    vendorName: 'Industrial Parts Co.',
    status: 'confirmed',
    items: [
      { id: 'c3d4e5f6-g7h8-9012-cdef-123456789012', description: 'CPU Units', quantity: 50, unitPrice: 7800, total: 390000 },
      { id: 'd4e5f6g7-h8i9-0123-def0-123456789123', description: 'RAM Modules', quantity: 100, unitPrice: 4500, total: 450000 },
    ],
    subtotal: 840000,
    tax: 151200,
    total: 991200,
    createdDate: '2026-06-08',
    deliveryDate: '2026-06-15',
  },
  {
    id: 'e5f6g7h8-i9j0-1234-efg1-234567890234',
    poNumber: 'PO-2026-002',
    vendorId: 'f6g7h8i9-j0k1-2345-fgh2-345678901345',
    vendorName: 'Premium Materials Ltd.',
    status: 'sent',
    items: [
      { id: 'g7h8i9j0-k1l2-3456-ghi3-456789012456', description: 'Steel Sheets', quantity: 1000, unitPrice: 850, total: 850000 },
    ],
    subtotal: 850000,
    tax: 153000,
    total: 1003000,
    createdDate: '2026-06-09',
    deliveryDate: '2026-06-20',
  },
]

// Mock Invoices
export const mockInvoices: Invoice[] = [
  {
    id: 'h8i9j0k1-l2m3-4567-hij4-567890123567',
    invoiceNumber: 'INV-2026-001',
    poNumber: 'PO-2026-001',
    vendorId: 'b2c3d4e5-f6g7-8901-bcde-f12345678901',
    vendorName: 'Industrial Parts Co.',
    status: 'sent',
    items: [
      { id: 'c3d4e5f6-g7h8-9012-cdef-123456789012', description: 'CPU Units', quantity: 50, unitPrice: 7800, total: 390000 },
      { id: 'd4e5f6g7-h8i9-0123-def0-123456789123', description: 'RAM Modules', quantity: 100, unitPrice: 4500, total: 450000 },
    ],
    subtotal: 840000,
    tax: 151200,
    total: 991200,
    dueDate: '2026-07-08',
    bankDetails: 'Industrial Parts Co., Bank Account: 1234567890, IFSC: IBKL0001234',
  },
]

// Mock Activities
export const mockActivities: Activity[] = [
  {
    id: 'act1',
    type: 'rfq_created',
    user: 'Sarah Johnson',
    action: 'Created new RFQ: Procurement of Electronic Components',
    timestamp: '2026-06-06 09:00',
    entityId: 'rfq1',
  },
  {
    id: 'act2',
    type: 'quotation_submitted',
    user: 'TechSupply Co.',
    action: 'Submitted quotation for RFQ-001',
    timestamp: '2026-06-07 14:30',
    entityId: 'q1',
  },
  {
    id: 'act3',
    type: 'quotation_submitted',
    user: 'Industrial Parts Co.',
    action: 'Submitted quotation for RFQ-001',
    timestamp: '2026-06-08 11:15',
    entityId: 'q2',
  },
  {
    id: 'act4',
    type: 'approval_approved',
    user: 'John Manager',
    action: 'Quotation approved by manager',
    timestamp: '2026-06-08 15:45',
    entityId: 'apr1',
  },
]

// Dashboard KPIs
export const mockKPIs = [
  {
    label: 'Total Spend (YTD)',
    value: '₹4.2M',
    trend: '+12%',
    icon: 'TrendingUp',
  },
  {
    label: 'Active Vendors',
    value: '24',
    trend: '+3',
    icon: 'Users',
  },
  {
    label: 'Pending Approvals',
    value: '5',
    trend: '-2',
    icon: 'CheckCircle',
  },
  {
    label: 'Avg Delivery Time',
    value: '8.2 days',
    trend: '-1.5 days',
    icon: 'Clock',
  },
]

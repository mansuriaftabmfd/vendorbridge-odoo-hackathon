export type UserRole = 'procurement_officer' | 'vendor' | 'manager' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  organization?: string
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole, orgName?: string) => Promise<void>;
  logout: () => void
}

export const ROLE_LABELS: Record<UserRole, string> = {
  procurement_officer: 'Procurement Officer',
  vendor: 'Vendor',
  manager: 'Manager',
  admin: 'Admin',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  procurement_officer: 'Manage vendors, RFQs, and procurement',
  vendor: 'Submit quotations and manage orders',
  manager: 'Approve quotations and purchase orders',
  admin: 'Full system access and user management',
}

// Permissions by role
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  procurement_officer: [
    'view_dashboard',
    'manage_vendors',
    'create_rfq',
    'view_quotations',
    'view_orders',
  ],
  vendor: ['view_dashboard', 'view_rfqs', 'submit_quotations', 'view_orders'],
  manager: [
    'view_dashboard',
    'manage_vendors',
    'create_rfq',
    'view_quotations',
    'approve_quotations',
    'view_orders',
    'view_approvals',
  ],
  admin: [
    'view_dashboard',
    'manage_vendors',
    'create_rfq',
    'view_quotations',
    'approve_quotations',
    'manage_users',
    'view_reports',
    'view_orders',
    'view_approvals',
  ],
}

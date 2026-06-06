'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  Home, Package, FileText, CheckSquare, ShoppingCart,
  Activity, BarChart3, Users, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react'
import type { UserRole } from '@/lib/auth-types'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
  roles: UserRole[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Home size={20} />,
    roles: ['procurement_officer', 'vendor', 'manager', 'admin'],
  },
  {
    label: 'Vendors',
    href: '/vendors',
    icon: <Users size={20} />,
    roles: ['procurement_officer', 'manager', 'admin'],
  },
  {
    label: 'Create RFQ',
    href: '/rfq/create',
    icon: <FileText size={20} />,
    roles: ['procurement_officer', 'manager', 'admin'],
  },
  {
    label: 'View RFQs',
    href: '/quotations',
    icon: <FileText size={20} />,
    roles: ['vendor'],
  },
  {
    label: 'Quotations',
    href: '/quotations',
    icon: <Package size={20} />,
    roles: ['procurement_officer', 'manager', 'admin'],
  },
  {
    label: 'My Quotations',
    href: '/quotations',
    icon: <Package size={20} />,
    roles: ['vendor'],
  },
  {
    label: 'Approvals',
    href: '/approvals',
    icon: <CheckSquare size={20} />,
    roles: ['manager', 'admin'],
  },
  {
    label: 'Purchase Orders',
    href: '/orders',
    icon: <ShoppingCart size={20} />,
    roles: ['procurement_officer', 'vendor', 'manager', 'admin'],
  },
  {
    label: 'Activity',
    href: '/activity',
    icon: <Activity size={20} />,
    roles: ['procurement_officer', 'manager', 'admin'],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: <BarChart3 size={20} />,
    roles: ['manager', 'admin'],
  },
]

const ROLE_BADGE: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  procurement_officer: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  vendor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  procurement_officer: 'Procurement',
  vendor: 'Vendor',
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(true)

  // Filter nav items by user role — deduplicate by href+label to avoid double entries
  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role))

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50 ${
        isExpanded ? 'w-64' : 'w-20'
      } hidden md:flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {isExpanded && <h1 className="text-xl font-bold text-sidebar-foreground">VendorBridge</h1>}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-sidebar-accent rounded-md transition-colors ml-auto"
        >
          {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Role badge */}
      {isExpanded && user && (
        <div className="px-4 pt-3 pb-1">
          <span className={`inline-block text-xs font-bold px-2 py-1 rounded-full ${ROLE_BADGE[user.role] || 'bg-gray-100 text-gray-700'}`}>
            {ROLE_LABEL[user.role] || user.role}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:bg-opacity-50'
              }`}
            >
              {item.icon}
              {isExpanded && (
                <>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4">
        {user && (
          <>
            <div className={`flex items-center gap-3 mb-3 px-1 ${!isExpanded && 'justify-center'}`}>
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full flex-shrink-0"
              />
              {isExpanded && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.name}</p>
                  <p className="text-xs text-sidebar-foreground opacity-60 truncate">{user.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium border border-red-200 dark:border-red-800"
            >
              <LogOut size={16} />
              {isExpanded && <span>Logout</span>}
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

'use client'

import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Search, Bell, Moon, Sun } from 'lucide-react'
import { useState } from 'react'

export function TopBar() {
  const { user } = useAuth()
  const { isDark, toggle } = useTheme()
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 z-40">
      {/* Left: Search */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search (Cmd+K)"
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-layer-1 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-surface-layer-1 rounded-lg transition-colors relative"
          >
            <Bell size={20} className="text-foreground" />
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-lg">
              <div className="p-4">
                <h3 className="font-semibold mb-3">Notifications</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-surface-layer-1 rounded-lg text-sm">
                    <p className="font-medium">Quotation received</p>
                    <p className="text-xs text-muted-foreground">From TechSupply Co.</p>
                  </div>
                  <div className="p-3 bg-surface-layer-1 rounded-lg text-sm">
                    <p className="font-medium">Approval required</p>
                    <p className="text-xs text-muted-foreground">PO #2026-001 pending review</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="p-2 hover:bg-surface-layer-1 rounded-lg transition-colors"
        >
          {isDark ? <Sun size={20} className="text-foreground" /> : <Moon size={20} className="text-foreground" />}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-border hidden sm:flex">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role === 'procurement_officer' ? 'Procurement Officer'
                : user?.role === 'vendor' ? 'Vendor'
                : user?.role === 'manager' ? 'Manager'
                : user?.role === 'admin' ? 'Administrator'
                : user?.role}
            </p>
          </div>
          <img
            src={user?.avatar}
            alt={user?.name}
            className="w-10 h-10 rounded-full"
          />
        </div>
      </div>
    </header>
  )
}

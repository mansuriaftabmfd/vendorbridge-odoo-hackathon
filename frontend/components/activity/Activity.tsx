'use client'

import { mockActivities } from '@/lib/mock-data'
import { Bell, List, Download } from 'lucide-react'
import { useState } from 'react'

// Group activities by date
const groupByDate = (activities: typeof mockActivities) => {
  const grouped: Record<string, typeof mockActivities> = {}
  activities.forEach((activity) => {
    const date = activity.timestamp.split(' ')[0]
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(activity)
  })
  return grouped
}

export function Activity() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'logs'>('notifications')
  const groupedActivities = groupByDate(mockActivities)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity & Notifications</h1>
        <p className="text-muted-foreground mt-1">Track all system activities and events</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
          { id: 'logs', label: 'Audit Logs', icon: <List size={18} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'notifications' && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          {Object.entries(groupedActivities).map(([date, activities]) => (
            <div key={date}>
              <p className="text-sm font-semibold text-muted-foreground px-4 py-2">{date}</p>
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="card-base p-4 hover:bg-surface-layer-1 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{activity.action}</p>
                        <p className="text-sm text-muted-foreground mt-1">by {activity.user}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 text-sm text-primary font-medium transition-opacity">
                        Mark as Read
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {['Today', 'This Week', 'This Month', 'Custom'].map((filter) => (
                <button
                  key={filter}
                  className="px-3 py-2 text-sm rounded-lg bg-surface-layer-1 text-foreground border border-border hover:border-primary transition-colors"
                >
                  {filter}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-opacity-90 transition-colors">
              <Download size={16} />
              Export CSV
            </button>
          </div>

          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-layer-1">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Timestamp</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">User</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Entity ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {mockActivities.map((activity) => (
                    <tr key={activity.id} className="border-b border-border hover:bg-surface-layer-1 transition-colors">
                      <td className="px-6 py-4 text-sm text-foreground">{activity.timestamp}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{activity.user}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="badge-active">{activity.type.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{activity.entityId}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">192.168.1.1</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

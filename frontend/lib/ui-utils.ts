// Common UI utilities and helper functions

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'approved':
    case 'completed':
      return 'text-status-approved'
    case 'pending':
      return 'text-status-pending'
    case 'blocked':
    case 'rejected':
      return 'text-status-blocked'
    default:
      return 'text-muted-foreground'
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case 'active':
    case 'approved':
    case 'completed':
      return 'bg-status-approved'
    case 'pending':
      return 'bg-status-pending'
    case 'blocked':
    case 'rejected':
      return 'bg-status-blocked'
    default:
      return 'bg-muted'
  }
}

export function truncateText(text: string, length: number): string {
  return text.length > length ? `${text.substring(0, length)}...` : text
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

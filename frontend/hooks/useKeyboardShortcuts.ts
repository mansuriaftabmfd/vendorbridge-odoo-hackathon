import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // In a full implementation, would open search modal
        console.log('[v0] Search shortcut triggered')
      }

      // Cmd/Ctrl+N for new RFQ
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        router.push('/rfq/create')
        console.log('[v0] New RFQ shortcut triggered')
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        // In a full implementation, would close any open modals
        console.log('[v0] Escape pressed')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])
}

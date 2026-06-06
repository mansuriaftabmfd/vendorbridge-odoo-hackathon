'use client'

import { useContext, createContext, ReactNode, useState, useEffect } from 'react'

interface ThemeContextType {
  isDark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Check localStorage and system preference
    const saved = localStorage.getItem('vendorbridge_theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const shouldBeDark = saved ? saved === 'dark' : prefersDark

    setIsDark(shouldBeDark)
    applyTheme(shouldBeDark)
    setIsMounted(true)
  }, [])

  const applyTheme = (dark: boolean) => {
    const html = document.documentElement
    if (dark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    localStorage.setItem('vendorbridge_theme', dark ? 'dark' : 'light')
  }

  const toggle = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    applyTheme(newIsDark)
  }

  // Prevent hydration mismatch
  if (!isMounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

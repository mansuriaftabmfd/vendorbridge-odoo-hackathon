// VendorBridge Design Tokens
export const colors = {
  // Light Mode
  light: {
    background: '#F2F0ED',
    foreground: '#1A1A1A',
    card: '#FFFFFF',
    primary: '#DD7057',
    secondary: '#D49B7D',
    accent: '#A8C4B0',
    surface: {
      layer1: '#F9F8F6',
      layer2: '#F2F0ED',
      layer3: '#E8E5E0',
      layer4: '#D9D5CF',
    },
    status: {
      active: '#4A9B5C',
      pending: '#D4AF37',
      blocked: '#E86A6A',
      approved: '#4A9B5C',
    },
    border: '#D9D5CF',
    muted: '#E8E5E0',
  },
  // Dark Mode
  dark: {
    background: '#272233',
    foreground: '#F5F1ED',
    card: '#3A3641',
    primary: '#DD7057',
    secondary: '#D49B7D',
    accent: '#A8C4B0',
    surface: {
      layer1: '#3A3641',
      layer2: '#42363F',
      layer3: '#4E4651',
      layer4: '#5A525C',
    },
    status: {
      active: '#5CB85C',
      pending: '#FFD966',
      blocked: '#FF6B6B',
      approved: '#5CB85C',
    },
    border: '#4E4651',
    muted: '#4E4651',
  },
}

// Spacing scale (Tailwind-based)
export const spacing = {
  xs: '0.75rem',
  sm: '1rem',
  md: '1.25rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '2.5rem',
}

// Border radius
export const radius = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '0.875rem',
  xl: '1rem',
  full: '9999px',
}

// Shadows (minimal, surface depth from color not shadow)
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
}

// Typography
export const typography = {
  h1: {
    fontSize: '2.25rem',
    fontWeight: 700,
    lineHeight: '2.75rem',
  },
  h2: {
    fontSize: '1.875rem',
    fontWeight: 700,
    lineHeight: '2.25rem',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: '1.875rem',
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: '1.5rem',
  },
  body: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: '1.5rem',
  },
  sm: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
  },
  xs: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1rem',
  },
}

// Button variants
export const buttonVariants = {
  primary: {
    light: {
      bg: colors.light.primary,
      text: colors.light.card,
      border: colors.light.primary,
    },
    dark: {
      bg: colors.dark.primary,
      text: colors.dark.card,
      border: colors.dark.primary,
    },
  },
  secondary: {
    light: {
      bg: colors.light.secondary,
      text: colors.light.card,
      border: colors.light.secondary,
    },
    dark: {
      bg: colors.dark.secondary,
      text: colors.dark.card,
      border: colors.dark.secondary,
    },
  },
  danger: {
    light: {
      bg: '#E86A6A',
      text: colors.light.card,
      border: '#E86A6A',
    },
    dark: {
      bg: '#FF6B6B',
      text: colors.dark.card,
      border: '#FF6B6B',
    },
  },
}

import { useColorScheme } from 'react-native'

/**
 * Design tokens — Terracotta & Cream palette.
 * Use themeLight for default (light mode); themeDark when colorScheme === 'dark'.
 */

export const themeLight = {
  bgPrimary: '#FDFCFB',
  bgSecondary: '#F5F0EB',
  bgTertiary: '#EDE6DF',
  textPrimary: '#2C2826',
  textSecondary: '#8C8480',
  textTertiary: '#B5AFA9',
  textInverse: '#FFFFFF',
  border: '#E8E0D8',
  accent: '#C45D3E',
  accentHover: '#B35236',
  accentSubtle: '#F5E0D8',
  success: '#5C8A5E',
  successSubtle: '#E8F2EA',
  warning: '#C4873E',
  error: '#BF4A3A',
  tabInactiveBg: '#F5F0EB',
  tabInactiveText: '#8C8480',
  tabActiveBg: '#C45D3E',
  tabActiveText: '#FFFFFF',
  shadow: 'rgba(44, 40, 38, 0.06)',
  cardBg: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  /** For use in rgba(accentRgb, opacity) e.g. phrase floats */
  accentRgb: '196, 93, 62',
} as const

export const themeDark = {
  bgPrimary: '#1C1917',
  bgSecondary: '#292320',
  bgTertiary: '#362E2A',
  textPrimary: '#F5F0EB',
  textSecondary: '#8C8480',
  textTertiary: '#5C5550',
  textInverse: '#FFFFFF',
  border: '#3D3530',
  accent: '#D4714F',
  accentHover: '#E07D5A',
  accentSubtle: '#3D2820',
  success: '#6FA172',
  successSubtle: '#2A3D2B',
  warning: '#C4873E',
  error: '#BF4A3A',
  tabInactiveBg: '#292320',
  tabInactiveText: '#8C8480',
  tabActiveBg: '#D4714F',
  tabActiveText: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.2)',
  cardBg: '#292320',
  overlay: 'rgba(0, 0, 0, 0.6)',
  accentRgb: '212, 113, 79',
} as const

export type Theme = typeof themeLight

export function getTheme(colorScheme: 'light' | 'dark' | null | undefined): Theme {
  return (colorScheme === 'dark' ? themeDark : themeLight) as Theme
}

export function useTheme(): Theme {
  const colorScheme = useColorScheme()
  return getTheme(colorScheme)
}

import { Text, TextProps, StyleSheet, TextStyle } from 'react-native'
import { themeLight } from '../constants/theme'

/**
 * Typography components using Playfair Display + Plus Jakarta Sans.
 *
 * Rules from DESIGN_SYSTEM.md:
 * - Headings use PlayfairDisplay_700Bold
 * - Body text uses PlusJakartaSans_400Regular
 * - Buttons and CTAs use PlusJakartaSans_600SemiBold
 * - Metadata uses PlusJakartaSans_400Regular
 */

interface TypographyProps extends TextProps {
  children: React.ReactNode
}

/**
 * Title component - for headings and primary titles
 * Uses PlayfairDisplay_700Bold
 */
export function Title({ style, children, ...props }: TypographyProps) {
  return (
    <Text style={[styles.title, style]} {...props}>
      {children}
    </Text>
  )
}

/**
 * Body component - for body text
 * Uses PlusJakartaSans_400Regular
 */
export function Body({ style, children, ...props }: TypographyProps) {
  return (
    <Text style={[styles.body, style]} {...props}>
      {children}
    </Text>
  )
}

/**
 * Meta component - for metadata (dates, durations, captions)
 * Uses PlusJakartaSans_400Regular (smaller size)
 */
export function Meta({ style, children, ...props }: TypographyProps) {
  return (
    <Text style={[styles.meta, style]} {...props}>
      {children}
    </Text>
  )
}

/**
 * ButtonText component - for button labels and CTAs
 * Uses PlusJakartaSans_600SemiBold
 */
export function ButtonText({ style, children, ...props }: TypographyProps) {
  return (
    <Text style={[styles.buttonText, style]} {...props}>
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: themeLight.textPrimary,
  },
  body: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: themeLight.textPrimary,
    lineHeight: 20,
  },
  meta: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: themeLight.textTertiary,
  },
  buttonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
  },
})

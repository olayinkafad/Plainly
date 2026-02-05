import { Text, TextProps, StyleSheet, TextStyle } from 'react-native'

/**
 * Typography components using Satoshi font family.
 * 
 * Rules from DESIGN_SYSTEM.md:
 * - Headings use Satoshi-Bold
 * - Body text uses Satoshi-Regular
 * - Buttons and CTAs use Satoshi-Medium
 * - Metadata uses Satoshi-Regular
 */

interface TypographyProps extends TextProps {
  children: React.ReactNode
}

/**
 * Title component - for headings and primary titles
 * Uses Satoshi-Bold
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
 * Uses Satoshi-Regular
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
 * Uses Satoshi-Regular (smaller size)
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
 * Uses Satoshi-Medium
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
    fontFamily: 'Satoshi-Bold',
    fontSize: 24,
    color: '#111827',
  },
  body: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  meta: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
  buttonText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
})

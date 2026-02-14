import { Pressable, StyleSheet, ViewStyle, TextStyle, ReactElement } from 'react-native'
import { themeLight } from '../constants/theme'
import { ButtonText } from './typography'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  fullWidth?: boolean
  children: React.ReactNode
  onPress: () => void
  disabled?: boolean
}

// Check if children contains non-text elements (like Views, Icons, etc.)
const hasNonTextChildren = (children: React.ReactNode): boolean => {
  if (Array.isArray(children)) {
    return children.some(child => hasNonTextChildren(child))
  }
  if (typeof children === 'object' && children !== null && 'type' in children) {
    return typeof (children as ReactElement).type === 'function' || typeof (children as ReactElement).type === 'object'
  }
  return false
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  children,
  onPress,
  disabled = false,
}: ButtonProps) {
  const buttonStyle: ViewStyle[] = [
    styles.button,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'ghost' && styles.ghost,
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
  ]

  const textStyle: TextStyle = {
    ...(variant === 'primary' && styles.primaryText),
    ...(variant === 'secondary' && styles.secondaryText),
    ...(variant === 'ghost' && styles.ghostText),
  }

  const hasStructuredChildren = hasNonTextChildren(children)

  return (
    <Pressable
      style={({ pressed }) => [
        ...buttonStyle,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {hasStructuredChildren ? (
        children
      ) : (
      <ButtonText style={textStyle}>{children}</ButtonText>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 9999,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: themeLight.accent,
  },
  secondary: {
    backgroundColor: themeLight.cardBg,
    borderWidth: 1,
    borderColor: themeLight.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  primaryText: {
    color: themeLight.textInverse,
  },
  secondaryText: {
    color: themeLight.textPrimary,
  },
  ghostText: {
    color: themeLight.textTertiary,
  },
})

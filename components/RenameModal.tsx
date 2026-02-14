import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Modal, Pressable, Animated, TextInput, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from './Icon'
import { themeLight } from '../constants/theme'
import { Body } from './typography'
import Button from './Button'

interface RenameModalProps {
  isOpen: boolean
  currentTitle: string
  onSave: (newTitle: string) => void
  onClose: () => void
}

export default function RenameModal({
  isOpen,
  currentTitle,
  onSave,
  onClose,
}: RenameModalProps) {
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState(currentTitle)
  const [error, setError] = useState<string | null>(null)
  const slideAnim = useRef(new Animated.Value(0)).current
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle)
      setError(null)
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [isOpen, currentTitle, slideAnim])

  const handleSave = () => {
    const trimmed = title.trim()
    
    if (!trimmed) {
      setError('Title cannot be empty')
      return
    }
    
    if (trimmed.length > 60) {
      setError('Title must be 60 characters or less')
      return
    }
    
    if (trimmed === currentTitle.trim()) {
      onClose()
      return
    }
    
    onSave(trimmed)
    onClose()
  }

  const handleChangeText = (text: string) => {
    setTitle(text)
    setError(null)
    // Clear error if user starts typing
    if (text.trim().length > 60) {
      setError('Title must be 60 characters or less')
    } else if (error) {
      setError(null)
    }
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  })

  if (!isOpen) return null

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <Pressable>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Body style={styles.sheetTitle}>Rename recording</Body>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <Icon name="x" size={20} color={themeLight.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={[styles.input, error && styles.inputError]}
                value={title}
                onChangeText={handleChangeText}
                placeholder="e.g. Project idea, Daily reflection, Meeting notes"
                placeholderTextColor="#9CA3AF"
                maxLength={60}
                autoFocus={false}
              />
              {error && (
                <Body style={styles.errorText}>{error}</Body>
              )}
              <Body style={styles.characterCount}>
                {title.length}/60
              </Body>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <View style={styles.buttonContainer}>
                <Button variant="secondary" fullWidth onPress={onClose}>
                  Cancel
                </Button>
              </View>
              <View style={styles.buttonSpacing} />
              <View style={styles.buttonContainer}>
                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleSave}
                  disabled={!title.trim() || title.trim().length > 60}
                >
                  Save name
                </Button>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16, // --space-4
    paddingTop: 16, // --space-4
  },
  header: {
    marginBottom: 20, // --space-5
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: themeLight.textPrimary,
  },
  closeButton: {
    padding: 8, // --space-2
    borderRadius: 20,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 24, // --space-6
  },
  input: {
    borderWidth: 1,
    borderColor: themeLight.border,
    borderRadius: 10, // --radius-md
    paddingHorizontal: 16, // --space-4
    paddingVertical: 12, // --space-3
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: themeLight.textPrimary,
    backgroundColor: themeLight.cardBg,
    minHeight: 44,
  },
  inputError: {
    borderColor: themeLight.error,
  },
  errorText: {
    color: themeLight.error,
    fontSize: 12,
    marginTop: 8, // --space-2
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF', // --color-text-tertiary
    textAlign: 'right',
    marginTop: 4, // --space-1
  },
  actions: {
    flexDirection: 'row',
    gap: 12, // --space-3
  },
  buttonContainer: {
    flex: 1,
  },
  buttonSpacing: {
    width: 12, // --space-3
  },
})

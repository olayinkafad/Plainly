import { useState, useEffect } from 'react'
import { View, StyleSheet, Pressable, Modal, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from './Icon'
import { themeLight } from '../constants/theme'
import { Body } from './typography'
import { OutputType } from '../types'

interface FormatOption {
  key: OutputType
  title: string
}

const formatOptions: FormatOption[] = [
  { key: 'summary', title: 'Summary' },
  { key: 'transcript', title: 'Transcript' },
]

interface FormatActionSheetProps {
  isOpen: boolean
  actionType: 'copy' | 'share'
  availableFormats: OutputType[]
  onSelect: (format: OutputType) => void
  onClose: () => void
}

export default function FormatActionSheet({
  isOpen,
  actionType,
  availableFormats,
  onSelect,
  onClose,
}: FormatActionSheetProps) {
  const insets = useSafeAreaInsets()
  const slideAnim = useState(new Animated.Value(0))[0]

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [isOpen, slideAnim])

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  })

  const getActionTitle = (): string => {
    const titles = {
      copy: 'Copy',
      share: 'Share',
    }
    return titles[actionType]
  }

  const getFormatLabel = (format: OutputType): string => {
    const formatMap: Record<OutputType, string> = {
      summary: 'Summary',
      transcript: 'Transcript',
    }
    return formatMap[format]
  }

  const handleSelect = (format: OutputType) => {
    onSelect(format)
    onClose()
  }

  // Filter to only show formats that have been generated
  const generatedFormats = formatOptions.filter((option) =>
    availableFormats.includes(option.key)
  )

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
                <Body style={styles.sheetTitle}>{getActionTitle()}</Body>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <Icon name="x" size={20} color={themeLight.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Format Options */}
            <View style={styles.actions}>
              {generatedFormats.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Body style={styles.emptyText}>
                    No formats available to {actionType}.
                  </Body>
                </View>
              ) : (
                generatedFormats.map((option) => (
                  <Pressable
                    key={option.key}
                    style={({ pressed }) => [
                      styles.actionItem,
                      pressed && styles.actionItemPressed,
                    ]}
                    onPress={() => handleSelect(option.key)}
                  >
                    <Icon
                      name={actionType === 'copy' ? 'copy' : 'share'}
                      size={20}
                      color={themeLight.textPrimary}
                    />
                    <Body style={styles.actionText}>
                      {getActionTitle()} {getFormatLabel(option.key).toLowerCase()}
                    </Body>
                  </Pressable>
                ))
              )}
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
    backgroundColor: themeLight.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16, // --space-4
    paddingTop: 16, // --space-4
    maxHeight: '80%',
  },
  header: {
    marginBottom: 16, // --space-4
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
  actions: {
    gap: 8, // --space-2
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, // --space-4
    gap: 12, // --space-3
  },
  actionItemPressed: {
    opacity: 0.7,
  },
  actionText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    color: themeLight.textPrimary,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: themeLight.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
})

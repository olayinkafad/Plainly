import { useState, useEffect } from 'react'
import { View, StyleSheet, Pressable, Modal, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from './Icon'
import { themeLight } from '../constants/theme'
import { Title, Body } from './typography'

interface RecordingActionsSheetProps {
  isOpen: boolean
  recordingTitle: string
  audioUri: string
  onRename?: () => void
  onDelete: () => void
  onClose: () => void
}

export default function RecordingActionsSheet({
  isOpen,
  recordingTitle,
  audioUri,
  onRename,
  onDelete,
  onClose,
}: RecordingActionsSheetProps) {
  const insets = useSafeAreaInsets()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

  const handleDelete = () => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false)
      onClose()
      onDelete()
    } else {
      setShowDeleteConfirm(true)
    }
  }

  const handleClose = () => {
    setShowDeleteConfirm(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
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
                <Body style={styles.sheetTitle}>{recordingTitle}</Body>
                <Pressable onPress={handleClose} style={styles.closeButton}>
                  <Icon name="x" size={20} color={themeLight.textSecondary} />
                </Pressable>
              </View>
            </View>

            {!showDeleteConfirm ? (
              /* Actions */
              <View style={styles.actions}>
                {onRename && (
                  <Pressable style={styles.actionItem} onPress={onRename}>
                    <Icon name="pencil" size={20} color={themeLight.textPrimary} />
                    <Body style={styles.actionText}>Rename</Body>
                  </Pressable>
                )}
                <Pressable style={styles.actionItem} onPress={handleDelete}>
                  <Icon name="trash" size={20} color={themeLight.error} />
                  <Body style={[styles.actionText, styles.deleteText]}>
                    Delete recording
                  </Body>
                </Pressable>
              </View>
            ) : (
              /* Delete Confirmation */
              <View style={styles.confirmContainer}>
                <Body style={styles.confirmWarning}>This can't be undone.</Body>
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.deleteButtonPressed,
                  ]}
                  onPress={handleDelete}
                >
                  <Icon name="trash" size={16} color="#FFFFFF" />
                  <Body style={styles.deleteButtonText}>Delete recording</Body>
                </Pressable>
              </View>
            )}
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
    fontFamily: 'PlusJakartaSans_700Bold',
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
  actionText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    color: themeLight.textPrimary,
  },
  deleteText: {
    color: themeLight.error,
  },
  confirmContainer: {
    paddingVertical: 8,
  },
  confirmTitle: {
    color: themeLight.textPrimary,
    textAlign: 'center',
    fontSize: 18,
  },
  confirmWarning: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: themeLight.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 26,
    backgroundColor: themeLight.error,
  },
  deleteButtonPressed: {
    opacity: 0.8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#FFFFFF',
  },
})

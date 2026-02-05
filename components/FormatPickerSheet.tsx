import { useState, useEffect } from 'react'
import { View, StyleSheet, Pressable, Modal, Animated, ScrollView, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from './Icon'
import { Title, Body } from './typography'
import { OutputType } from '../types'
import Button from './Button'

interface FormatOption {
  key: OutputType
  title: string
  helper: string
}

const formatOptions: FormatOption[] = [
  {
    key: 'summary',
    title: 'Summary',
    helper: 'A clear overview of the main ideas.',
  },
  {
    key: 'action_items',
    title: 'Action items',
    helper: 'Tasks and next steps pulled from what you said.',
  },
  {
    key: 'key_points',
    title: 'Key points',
    helper: 'The most important bullets, without the fluff.',
  },
  {
    key: 'transcript',
    title: 'Transcript',
    helper: 'Word-for-word text from the recording.',
  },
]

interface FormatPickerSheetProps {
  isOpen: boolean
  availableFormats: OutputType[]
  onSelect: (format: OutputType) => void
  onClose: () => void
}

export default function FormatPickerSheet({
  isOpen,
  availableFormats,
  onSelect,
  onClose,
}: FormatPickerSheetProps) {
  const insets = useSafeAreaInsets()
  const [selectedFormat, setSelectedFormat] = useState<OutputType | null>(null)
  const slideAnim = useState(new Animated.Value(0))[0]

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
      // Reset selection when modal opens
      setSelectedFormat(null)
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
      setSelectedFormat(null)
    }
  }, [isOpen, slideAnim])

  const { height: SCREEN_HEIGHT } = Dimensions.get('window')
  const SHEET_HEIGHT = SCREEN_HEIGHT * 0.8 // 80% of screen height

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  })

  const remainingFormats = formatOptions.filter(
    (option) => !availableFormats.includes(option.key)
  )

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FormatPickerSheet.tsx:87',message:'FormatPickerSheet render',data:{isOpen,remainingFormatsCount:remainingFormats.length,availableFormatsCount:availableFormats.length,availableFormats,remainingFormats:remainingFormats.map(f => f.key),sheetHeight:SHEET_HEIGHT},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  const getFormatTitle = (format: OutputType): string => {
    const formatMap: Record<OutputType, string> = {
      summary: 'Summary',
      action_items: 'Action items',
      key_points: 'Key points',
      transcript: 'Transcript',
    }
    return formatMap[format]
  }

  const getButtonText = (format: OutputType | null): string => {
    if (!format) return 'Generate'
    return `Generate ${getFormatTitle(format).toLowerCase()}`
  }

  const handleGenerate = () => {
    if (selectedFormat) {
      onSelect(selectedFormat)
      onClose()
    }
  }

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
              height: SHEET_HEIGHT,
            },
          ]}
        >
          <View style={styles.sheetContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Title style={styles.sheetTitle}>Generate new format</Title>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <Icon name="x" size={20} color="#6B7280" />
                </Pressable>
              </View>
            </View>

            {/* Format Options - Scrollable */}
            {/* #region agent log */}
            {(() => {
              fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FormatPickerSheet.tsx:143',message:'Before ScrollView render',data:{remainingFormatsCount:remainingFormats.length,hasRemainingFormats:remainingFormats.length > 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
              return null;
            })()}
            {/* #endregion */}
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.optionsContainer}
              showsVerticalScrollIndicator={false}
            >
              {remainingFormats.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Body style={styles.emptyText}>All formats have been generated.</Body>
                </View>
              ) : (
                remainingFormats.map((option) => {
                  const isSelected = selectedFormat === option.key
                  return (
                    <Pressable
                      key={option.key}
                      style={({ pressed }) => [
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                        pressed && styles.optionCardPressed,
                      ]}
                      onPress={() => setSelectedFormat(option.key)}
                    >
                      <View style={styles.optionContent}>
                        <View style={styles.optionHeader}>
                          <Title style={styles.optionTitle}>{option.title}</Title>
                          {isSelected && (
                            <View style={styles.checkIcon}>
                              <Icon name="check" size={20} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        <Body style={styles.optionHelper}>{option.helper}</Body>
                      </View>
                    </Pressable>
                  )
                })
              )}
            </ScrollView>
          </View>

          {/* Generate Button - Fixed at bottom */}
          <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 16 }]}>
            <Button
              variant="primary"
              fullWidth
              onPress={handleGenerate}
              disabled={!selectedFormat}
            >
              {getButtonText(selectedFormat)}
            </Button>
          </View>
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16, // --space-4
    paddingTop: 16, // --space-4
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
    fontSize: 18,
    color: '#111827', // --color-text-primary
  },
  closeButton: {
    padding: 8, // --space-2
    borderRadius: 20,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
    minHeight: 200, // Ensure minimum height for content visibility
  },
  optionsContainer: {
    gap: 12, // --space-3
    paddingBottom: 16, // --space-4
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB', // --color-border-default
    borderRadius: 12, // --radius-md
    padding: 16, // --space-4
    minHeight: 80,
  },
  optionCardSelected: {
    borderColor: '#2563EB', // --color-accent-primary
    borderWidth: 2,
    backgroundColor: '#EFF6FF', // Light blue background
  },
  optionCardPressed: {
    opacity: 0.7,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 18,
    color: '#111827', // --color-text-primary
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB', // --color-accent-primary
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionHelper: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 14,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 16, // --space-4
    paddingTop: 16, // --space-4
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9', // --color-border-subtle
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    paddingVertical: 48, // --space-12
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 14,
    textAlign: 'center',
  },
})

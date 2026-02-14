import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Modal, Pressable, Animated, ScrollView, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Audio } from 'expo-av'
import Icon from './Icon'
import { Title, Body, Meta } from './typography'
import Button from './Button'
import { OutputType } from '../types'
import { recordingsStore, Recording } from '../store/recordings'
import { format } from 'date-fns'
import { themeLight } from '../constants/theme'

interface FormatOption {
  key: OutputType
  title: string
  helper: string
}

const formatOptions: FormatOption[] = [
  {
    key: 'summary',
    title: 'Summary',
    helper: 'A quick overview of what you talked about.',
  },
  {
    key: 'action_items',
    title: 'Action items',
    helper: 'Clear next steps you can act on.',
  },
  {
    key: 'transcript',
    title: 'Full transcript',
    helper: 'Everything you said, written out word for word.',
  },
]

interface FormatSelectionModalProps {
  isOpen: boolean
  recordingId: string
  onClose: () => void
  onGenerate: (recordingId: string, format: OutputType) => void
}

export default function FormatSelectionModal({
  isOpen,
  recordingId,
  onClose,
  onGenerate,
}: FormatSelectionModalProps) {
  const insets = useSafeAreaInsets()
  const [selectedFormat, setSelectedFormat] = useState<OutputType | null>(null)
  const [recording, setRecording] = useState<Recording | null>(null)
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(0)
  const slideAnim = useRef(new Animated.Value(0)).current
  const positionUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadRecording = async () => {
    try {
      // Add a small delay to ensure recording is saved
      await new Promise(resolve => setTimeout(resolve, 100))
      const loadedRecording = await recordingsStore.getById(recordingId)
      if (loadedRecording) {
        setRecording(loadedRecording)
        await loadAudio(loadedRecording.audioBlobUrl)
      } else {
        // Retry after a longer delay in case of race condition
        setTimeout(async () => {
          const retryRecording = await recordingsStore.getById(recordingId)
          if (retryRecording) {
            setRecording(retryRecording)
            await loadAudio(retryRecording.audioBlobUrl)
          }
        }, 500)
      }
    } catch (error) {
      console.error('Failed to load recording:', error)
    }
  }

  // Load recording data when modal opens
  useEffect(() => {
    if (isOpen && recordingId) {
      loadRecording()
    } else {
      setRecording(null)
    }
  }, [isOpen, recordingId])

  // Cleanup audio on unmount or close
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error)
      }
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current)
      }
    }
  }, [sound])

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
      setSelectedFormat(null)
      stopPlayback()
    }
  }, [isOpen, slideAnim])

  // Load recording data when modal opens
  useEffect(() => {
    if (isOpen && recordingId) {
      loadRecording()
    } else {
      setRecording(null)
    }
  }, [isOpen, recordingId])

  // Cleanup audio on unmount or close
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error)
      }
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current)
      }
    }
  }, [sound])

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
      setSelectedFormat(null)
      stopPlayback()
    }
  }, [isOpen, slideAnim])

  const loadAudio = async (uri: string) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      })

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      )

      const status = await newSound.getStatusAsync()
      if (status.isLoaded) {
        setPlaybackDuration(status.durationMillis || 0)
      }

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis || 0)
          if (status.didJustFinish) {
            setIsPlaying(false)
            setPlaybackPosition(0)
            // Reset sound position to beginning for replay
            newSound.setPositionAsync(0).catch(console.error)
            if (positionUpdateInterval.current) {
              clearInterval(positionUpdateInterval.current)
              positionUpdateInterval.current = null
            }
          }
        }
      })

      setSound(newSound)
    } catch (error) {
      console.error('Failed to load audio:', error)
    }
  }

  const togglePlayback = async () => {
    if (!sound) return

    try {
      if (isPlaying) {
        await sound.pauseAsync()
        setIsPlaying(false)
        if (positionUpdateInterval.current) {
          clearInterval(positionUpdateInterval.current)
          positionUpdateInterval.current = null
        }
      } else {
        // Check if we're at the end and need to reset
        const status = await sound.getStatusAsync()
        if (status.isLoaded) {
          const currentPosition = status.positionMillis || 0
          const duration = status.durationMillis || playbackDuration
          // If at or near the end, reset to beginning
          if (currentPosition >= duration - 100) {
            await sound.setPositionAsync(0)
            setPlaybackPosition(0)
          }
        }
        await sound.playAsync()
        setIsPlaying(true)
        // Start position update interval
        if (!positionUpdateInterval.current) {
          positionUpdateInterval.current = setInterval(async () => {
            if (sound) {
              const status = await sound.getStatusAsync()
              if (status.isLoaded) {
                setPlaybackPosition(status.positionMillis || 0)
              }
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error)
    }
  }

  const stopPlayback = async () => {
    if (sound) {
      try {
        await sound.stopAsync()
        await sound.setPositionAsync(0)
        setIsPlaying(false)
        setPlaybackPosition(0)
      } catch (error) {
        console.error('Failed to stop playback:', error)
      }
    }
    if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current)
      positionUpdateInterval.current = null
    }
  }

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatRecordingTitle = (rec: Recording): string => {
    return rec.title || format(rec.createdAt, 'MMM d, yyyy')
  }

  const handleGenerate = () => {
    if (selectedFormat) {
      onGenerate(recordingId, selectedFormat)
      // Don't close here - let the parent handle navigation to generating screen
    }
  }

  const getFormatTitle = (format: OutputType): string => {
    const formatMap: Record<OutputType, string> = {
      summary: 'Summary',
      action_items: 'Action items',
      transcript: 'Transcript',
    }
    return formatMap[format]
  }

  const getButtonText = (format: OutputType | null): string => {
    if (!format) return 'Generate'
    return `Generate ${getFormatTitle(format).toLowerCase()}`
  }

  const { height: SCREEN_HEIGHT } = Dimensions.get('window')
  const SHEET_HEIGHT = SCREEN_HEIGHT * 0.95 // 95% of screen height
  const TOP_OFFSET = insets.top + 8 // Just safe area + small gap

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, TOP_OFFSET],
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
              height: SHEET_HEIGHT,
            },
          ]}
        >
          <View style={styles.sheetContent}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: 8 }]}>
              <Pressable onPress={onClose} style={styles.backButton}>
                <Icon name="caret-left" size={24} color={themeLight.textPrimary} />
              </Pressable>
            </View>

            {/* Title and Subtext */}
            <View style={styles.titleSection}>
              <Title style={styles.title}>What do you want to get out of this?</Title>
              <Body style={styles.subtext}>
                Plainly can turn your recording into different texts. Pick the one that's most useful right now.
              </Body>
            </View>

            {/* Audio Preview */}
            {recording && (
              <View style={styles.audioPreviewCard}>
                <View style={styles.audioPreviewHeader}>
                  <Body style={styles.audioPreviewTitle}>
                    {formatRecordingTitle(recording)}
                  </Body>
                </View>
                <View style={styles.audioPreviewControls}>
                  <Pressable
                    style={styles.playButton}
                    onPress={togglePlayback}
                  >
                    {isPlaying ? (
                      <Icon name="pause" size={20} color="#FFFFFF" />
                    ) : (
                      <Icon name="play" size={20} color="#FFFFFF" />
                    )}
                  </Pressable>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.timeContainer}>
                    <Meta style={styles.timeText}>
                      {formatTime(playbackPosition)} / {formatTime(playbackDuration)}
                    </Meta>
                  </View>
                </View>
              </View>
            )}

            {/* Format Options - Scrollable */}
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.optionsContainer}
              showsVerticalScrollIndicator={false}
            >
              {formatOptions.map((option) => {
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
                        <Title style={styles.optionTitle}>
                          {option.title}
                        </Title>
                        {isSelected && (
                          <View style={styles.checkIcon}>
                            <Icon name="check" size={20} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      <Body style={styles.optionHelper}>
                        {option.helper}
                      </Body>
                    </View>
                  </Pressable>
                )
              })}
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
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: themeLight.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 24, // --space-6
  },
  header: {
    marginBottom: 16, // --space-4
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // --space-2
    paddingHorizontal: 0,
  },
  titleSection: {
    marginBottom: 20, // --space-5
  },
  audioPreviewCard: {
    backgroundColor: '#F9FAFB', // --color-bg-secondary
    borderRadius: 12, // --radius-md
    padding: 16, // --space-4
    marginBottom: 20, // --space-5
    borderWidth: 1,
    borderColor: themeLight.border,
  },
  audioPreviewHeader: {
    marginBottom: 12, // --space-3
  },
  audioPreviewTitle: {
    fontSize: 14,
    color: themeLight.textPrimary,
    fontFamily: 'Satoshi-Medium',
  },
  audioPreviewControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeLight.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12, // --space-3
  },
  progressContainer: {
    flex: 1,
    height: 4,
    marginRight: 12, // --space-3
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: themeLight.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: themeLight.accent,
    borderRadius: 2,
  },
  timeContainer: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 12,
    color: themeLight.textSecondary,
  },
  title: {
    fontSize: 24,
    color: themeLight.textPrimary,
    marginBottom: 8, // --space-2
  },
  subtext: {
    color: themeLight.textSecondary,
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
  },
  optionsContainer: {
    paddingBottom: 16, // --space-4
  },
  optionCard: {
    backgroundColor: themeLight.cardBg,
    borderWidth: 1,
    borderColor: themeLight.border,
    borderRadius: 12, // --radius-md
    padding: 16, // --space-4
    marginBottom: 12, // --space-3
    minHeight: 80,
  },
  optionCardSelected: {
    borderColor: themeLight.accent,
    borderWidth: 2,
    backgroundColor: themeLight.accentSubtle,
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
    color: themeLight.textPrimary,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: themeLight.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionHelper: {
    color: themeLight.textSecondary,
    fontSize: 14,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 24, // --space-6
    paddingTop: 16, // --space-4
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9', // --color-border-subtle
    backgroundColor: themeLight.cardBg,
    zIndex: 10,
  },
})

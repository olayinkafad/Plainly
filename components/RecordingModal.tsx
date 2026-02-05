import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Modal, Pressable, Animated, Dimensions, Alert, ScrollView } from 'react-native'
import { Audio, Recording as ExpoRecording } from 'expo-av'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, usePathname } from 'expo-router'
import Icon from './Icon'
import { Title, Body, Meta } from './typography'
import Button from './Button'
import { Recording, recordingsStore } from '../store/recordings'

interface RecordingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (recording: Recording, showToast?: boolean) => void
  onFormatSelect: (recordingId: string) => void
}

type RecordingState = 'idle' | 'recording' | 'paused'

export default function RecordingModal({
  isOpen,
  onClose,
  onSave,
  onFormatSelect,
}: RecordingModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const [recording, setRecording] = useState<ExpoRecording | null>(null)
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0) // in seconds
  const [hasRecording, setHasRecording] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const slideAnim = useRef(new Animated.Value(0)).current
  const hasStartedRef = useRef(false)
  const waveformAnimations = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0.3))
  ).current

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
      hasStartedRef.current = false
      requestPermissionsAndStart()
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
      resetRecording()
      hasStartedRef.current = false
    }

    return () => {
      stopTimer()
    }
  }, [isOpen, slideAnim])

  const requestPermissionsAndStart = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        setPermissionError('Microphone permission is required to record audio.')
        return
      }
      setPermissionError(null)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      // Auto-start recording after permissions granted
      if (!hasStartedRef.current) {
        hasStartedRef.current = true
        await startRecording()
      }
    } catch (error) {
      setPermissionError('Failed to request microphone permission.')
      console.error('Permission error:', error)
    }
  }

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        setPermissionError('Microphone permission is required to record audio.')
        return false
      }
      setPermissionError(null)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      // Auto-start after retry
      if (!hasStartedRef.current) {
        hasStartedRef.current = true
        await startRecording()
      }
      return true
    } catch (error) {
      setPermissionError('Failed to request microphone permission.')
      console.error('Permission error:', error)
      return false
    }
  }

  const startRecording = async () => {
    // Guard against duplicate starts
    if (hasStartedRef.current && recording) {
      return
    }

    try {
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )

      setRecording(newRecording)
      setRecordingState('recording')
      setHasRecording(true)
      setDuration(0) // Reset timer
      startTimer()
      startWaveformAnimation()
    } catch (error) {
      console.error('Failed to start recording:', error)
      setPermissionError('Failed to start recording. Please try again.')
      hasStartedRef.current = false
    }
  }

  const pauseRecording = async () => {
    if (!recording) return
    try {
      await recording.pauseAsync()
      setRecordingState('paused')
      stopTimer()
    } catch (error) {
      console.error('Failed to pause recording:', error)
    }
  }

  const resumeRecording = async () => {
    if (!recording) return
    try {
      await recording.startAsync()
      setRecordingState('recording')
      startTimer()
      startWaveformAnimation()
    } catch (error) {
      console.error('Failed to resume recording:', error)
    }
  }

  const saveAndCloseRecording = async () => {
    if (!recording) return

    try {
      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      
      // Clear recording reference before resetting to avoid double-unload
      const savedRecording = recording
      setRecording(null)
      
      if (uri) {
        // Create recording object
        const newRecording: Recording = {
          id: Date.now().toString(),
          title: 'Recording',
          createdAt: Date.now(),
          durationSec: duration,
          audioBlobUrl: uri,
          outputs: {},
          lastViewedFormat: 'summary',
        }

        // Save without showing toast (format selection will open instead)
        await onSave(newRecording, false)
        
        // Reset state (recording is already null, so won't try to unload again)
        setRecordingState('idle')
        setDuration(0)
        setHasRecording(false)
        setPermissionError(null)
        stopTimer()
        stopWaveformAnimation()
        hasStartedRef.current = false
        
        // Close modal first
        onClose()
        
        // Then open format selection after modal closes
        setTimeout(() => {
          onFormatSelect(newRecording.id)
        }, 300)
      }
    } catch (error) {
      console.error('Failed to save recording:', error)
    }
  }

  const stopRecording = async () => {
    await saveAndCloseRecording()
  }

  const resetRecording = () => {
    if (recording) {
      recording.stopAndUnloadAsync().catch(console.error)
    }
    setRecording(null)
    setRecordingState('idle')
    setDuration(0)
    setHasRecording(false)
    setPermissionError(null)
    stopTimer()
    stopWaveformAnimation()
    hasStartedRef.current = false
  }

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 0.5)
    }, 500)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startWaveformAnimation = () => {
    const animations = waveformAnimations.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7, // Random height between 0.3 and 1.0
            duration: 200 + Math.random() * 300, // Random duration between 200-500ms
            useNativeDriver: false, // Can't use native driver for height
          }),
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
        ])
      )
    })
    Animated.parallel(animations).start()
  }

  const stopWaveformAnimation = () => {
    waveformAnimations.forEach((anim) => {
      anim.stopAnimation()
      anim.setValue(0.3)
    })
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handleCancel = async () => {
    if (hasRecording && (recordingState === 'recording' || recordingState === 'paused')) {
      Alert.alert(
        'Would you like to save this recording?',
        '',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              resetRecording()
              onClose()
              // Check if user has any recordings - if not, navigate to home (first-time user)
              // Only navigate if we're not already on the home screen
              // Wait for modal close animation to complete (200ms) before navigating
              setTimeout(async () => {
                const allRecordings = await recordingsStore.getAll()
                if (allRecordings.length === 0 && pathname !== '/home') {
                  router.replace('/home')
                }
              }, 250)
            },
          },
          {
            text: 'Save',
            style: 'default',
            onPress: async () => {
              await saveAndCloseRecording()
            },
          },
        ]
      )
    } else {
      onClose()
    }
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
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              height: SHEET_HEIGHT,
            },
          ]}
        >
          <Pressable style={styles.sheetContent}>
            {/* Grab Handle */}
            <View style={styles.grabHandle} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: 8 }]}>
              <Title style={styles.title}>Recording</Title>
              <Pressable onPress={handleCancel} style={styles.closeButton}>
                <Icon name="x" size={24} color="#6B7280" />
              </Pressable>
            </View>

            {/* Permission Error */}
            {permissionError && (
              <View style={styles.errorContainer}>
                <Title style={styles.permissionTitle}>We need your microphone</Title>
                <Body style={styles.permissionBody}>Plainly works by listening while you think out loud.</Body>
                <Button
                  variant="primary"
                  onPress={requestPermissions}
                  style={styles.retryButton}
                >
                  Allow microphone
                </Button>
              </View>
            )}

            {/* Timer */}
            <View style={styles.timerContainer}>
              <Title style={styles.timer}>{formatTime(duration)}</Title>
              {recordingState === 'recording' && (
                <>
                  <Title style={styles.primaryText}>I'm listening…</Title>
                  <Body style={styles.secondaryText}>Say it naturally. You don't need to be polished.</Body>
                </>
              )}
              {recordingState === 'paused' && (
                <Meta style={styles.pausedLabel}>PAUSED</Meta>
              )}
            </View>

            {/* Waveform animation */}
            {(recordingState === 'recording' || recordingState === 'paused') && (
              <View style={styles.waveformContainer}>
                {waveformAnimations.map((anim, index) => {
                  const height = anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 60], // Height in pixels: 20px to 60px
                  })
                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.waveformBar,
                        {
                          height: height,
                        },
                      ]}
                    />
                  )
                })}
              </View>
            )}

            {/* Controls */}
            <View style={styles.controls}>
              <Pressable
                style={styles.controlButton}
                onPress={handleCancel}
              >
                <Body style={styles.controlButtonText}>Cancel</Body>
              </Pressable>

              <View style={styles.stopButtonContainer}>
                <Pressable
                  style={[styles.controlButton, styles.stopButton]}
                  onPress={stopRecording}
                  disabled={!hasRecording}
                >
                  <Icon name="stop" size={24} color="#FFFFFF" />
                </Pressable>
                <Body style={styles.stopButtonLabel}>Finish recording</Body>
              </View>

              {recordingState === 'recording' ? (
                <Pressable
                  style={[styles.controlButton, styles.pauseButton]}
                  onPress={pauseRecording}
                >
                  <Icon name="pause" size={24} color="#111827" />
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.controlButton, styles.resumeButton]}
                  onPress={resumeRecording}
                  disabled={!hasRecording}
                >
                  <Icon name="play" size={24} color="#111827" />
                </Pressable>
              )}
            </View>
          </Pressable>
          {/* Bottom safe area padding */}
          <View style={{ height: insets.bottom + 16 }} />
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    overflow: 'hidden',
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 24, // --space-6
  },
  grabHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB', // --color-border-default
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8, // --space-2
    marginBottom: 8, // --space-2
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 32, // --space-8
  },
  title: {
    fontSize: 20,
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
  errorContainer: {
    backgroundColor: '#F9FAFB', // --color-bg-secondary
    padding: 24, // --space-6
    borderRadius: 10, // --radius-md
    marginBottom: 24, // --space-6
    alignItems: 'center',
  },
  permissionTitle: {
    color: '#111827', // --color-text-primary
    marginBottom: 8, // --space-2
    textAlign: 'center',
  },
  permissionBody: {
    color: '#6B7280', // --color-text-secondary
    marginBottom: 20, // --space-5
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626', // --color-error
    marginBottom: 12, // --space-3
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 0,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginBottom: 32, // --space-8
  },
  timer: {
    fontSize: 48,
    color: '#111827', // --color-text-primary
    marginBottom: 8, // --space-2
  },
  primaryText: {
    color: '#111827', // --color-text-primary
    fontSize: 20,
    marginTop: 16, // --space-4
    marginBottom: 8, // --space-2
    textAlign: 'center',
  },
  secondaryText: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8, // --space-2
  },
  recordingLabel: {
    color: '#DC2626', // --color-error
    fontSize: 12,
    marginTop: 8, // --space-2
  },
  helperText: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 16,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 40, // Extra space before controls
    height: 60,
  },
  waveformBar: {
    width: 4,
    backgroundColor: '#2563EB', // --color-accent-primary
    borderRadius: 2,
    marginHorizontal: 4, // --space-1
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16, // --space-4
  },
  controlButton: {
    minWidth: 60,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  stopButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: '#2563EB', // --color-accent-primary
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  stopButtonLabel: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
    textAlign: 'center',
    marginTop: 8, // --space-2
  },
  recordButton: {
    backgroundColor: '#DC2626', // --color-error (red for record)
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  recordButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  pauseButton: {
    backgroundColor: '#F9FAFB', // --color-bg-secondary
    borderWidth: 1,
    borderColor: '#E5E7EB', // --color-border-default
  },
  resumeButton: {
    backgroundColor: '#F9FAFB', // --color-bg-secondary
    borderWidth: 1,
    borderColor: '#E5E7EB', // --color-border-default
  },
  controlButtonText: {
    fontSize: 16,
    color: '#6B7280', // --color-text-secondary
    fontFamily: 'Satoshi-Medium',
  },
  pausedLabel: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 12,
    marginTop: 8, // --space-2
  },
})

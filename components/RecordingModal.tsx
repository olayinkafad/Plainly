import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Modal, Pressable, Animated, Dimensions, ScrollView } from 'react-native'
import { Audio } from 'expo-av'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, usePathname } from 'expo-router'
import Icon from './Icon'
import { Title, Body } from './typography'
import { Recording, recordingsStore } from '../store/recordings'
import { themeLight } from '../constants/theme'

interface RecordingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (recording: Recording, showToast?: boolean) => void
  onFormatSelect: (recordingId: string) => void
}

type RecordingState = 'idle' | 'recording' | 'paused'

const WAVEFORM_BAR_COUNT = 25

// Pre-computed static bar heights for visual variety (taller in center, shorter at edges)
const BAR_HEIGHTS = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => {
  const center = WAVEFORM_BAR_COUNT / 2
  const distance = Math.abs(i - center) / center
  return 16 + 28 * (1 - distance * 0.7) + Math.random() * 8
})

export default function RecordingModal({
  isOpen,
  onClose,
  onSave,
  onFormatSelect,
}: RecordingModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [hasRecording, setHasRecording] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const slideAnim = useRef(new Animated.Value(0)).current
  const hasStartedRef = useRef(false)
  const waveformAnimations = useRef(
    Array.from({ length: WAVEFORM_BAR_COUNT }, () => new Animated.Value(0.3))
  ).current

  const { height: SCREEN_HEIGHT } = Dimensions.get('window')

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
      hasStartedRef.current = false
      resetRecording()
      requestPermissionsAndStart()
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
      resetRecording()
      hasStartedRef.current = false
      setShowDiscardConfirm(false)
    }

    return () => {
      stopTimer()
    }
  }, [isOpen, slideAnim])

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  })

  // ── Permission & Recording Lifecycle ──

  const requestPermissionsAndStart = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        onClose()
        return
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      if (!hasStartedRef.current) {
        hasStartedRef.current = true
        await startRecording()
      }
    } catch (error) {
      console.error('Permission error:', error)
      onClose()
    }
  }

  const startRecording = async (retryCount = 0) => {
    if (hasStartedRef.current && recording) return

    const MAX_RETRIES = 3
    const RETRY_DELAYS = [200, 400, 800]

    try {
      if (recording) {
        try {
          await recording.stopAndUnloadAsync()
        } catch (e) {
          // Ignore cleanup errors
        }
        setRecording(null)
      }

      if (retryCount > 0) {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: false,
          })
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (e) {
          // Ignore
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )

      setRecording(newRecording)
      setRecordingState('recording')
      setHasRecording(true)
      setDuration(0)
      startTimer()
      startWaveformAnimation()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Failed to start recording:', error)

      if (
        errorMessage.includes('Only one Recording object can be prepared') &&
        retryCount < MAX_RETRIES
      ) {
        const delay = RETRY_DELAYS[retryCount] || 2000
        console.log(`Retrying recording start after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return startRecording(retryCount + 1)
      }

      hasStartedRef.current = false
    }
  }

  const pauseRecording = async () => {
    if (!recording) return
    try {
      await recording.pauseAsync()
      setRecordingState('paused')
      stopTimer()
      stopWaveformAnimation()
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
      setRecording(null)

      if (uri) {
        const newRecording: Recording = {
          id: Date.now().toString(),
          title: 'Recording',
          createdAt: Date.now(),
          durationSec: duration,
          audioBlobUrl: uri,
          outputs: {},
          lastViewedFormat: 'summary',
        }

        await onSave(newRecording, false)

        setRecordingState('idle')
        setDuration(0)
        setHasRecording(false)
        stopTimer()
        stopWaveformAnimation()
        hasStartedRef.current = false

        onClose()

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

  const resetRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync()
      } catch (error) {
        // Ignore errors
      }
    }
    setRecording(null)
    setRecordingState('idle')
    setDuration(0)
    setHasRecording(false)
    stopTimer()
    stopWaveformAnimation()
    hasStartedRef.current = false
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      })
    } catch (error) {
      // Ignore
    }
  }

  // ── Timer ──

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

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // ── Waveform (25 bars, opacity-animated) ──

  const startWaveformAnimation = () => {
    const animations = waveformAnimations.map((anim) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 200 + Math.random() * 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 200 + Math.random() * 300,
            useNativeDriver: true,
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

  // ── Discard ──

  const handleClose = () => {
    if (hasRecording && (recordingState === 'recording' || recordingState === 'paused')) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  const handleConfirmDiscard = async () => {
    setShowDiscardConfirm(false)
    await resetRecording()
    onClose()
    setTimeout(async () => {
      const allRecordings = await recordingsStore.getAll()
      if (allRecordings.length === 0 && pathname !== '/home') {
        router.replace('/home')
      }
    }, 250)
  }

  if (!isOpen) return null

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.overlay} />

        <Animated.View
          style={[
            styles.fullScreenSheet,
            { transform: [{ translateY }] },
          ]}
        >
          {/* ── Top: Live Transcript Section ── */}
          <View style={[styles.transcriptSection, { paddingTop: insets.top }]}>
            {/* Close button */}
            <Pressable
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close recording"
              accessibilityRole="button"
            >
              <Icon name="x" size={24} color={themeLight.textTertiary} />
            </Pressable>

            <ScrollView
              style={styles.transcriptScroll}
              contentContainerStyle={styles.transcriptScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.transcriptCard}>
                <Body style={styles.cardHeading}>Here's what you said so far</Body>
                <View style={styles.cardDivider} />
                <Body style={styles.placeholderText}>
                  Your transcript will appear here once we process your recording.
                </Body>
              </View>
            </ScrollView>

            {/* Gradient fade at bottom of scroll area */}
            <LinearGradient
              colors={['rgba(253, 252, 251, 0)', themeLight.bgPrimary]}
              style={styles.scrollGradient}
              pointerEvents="none"
            />
          </View>

          {/* ── Bottom: Recording Controls Section ── */}
          <View style={[styles.controlsSection, { paddingBottom: insets.bottom + 28 }]}>
            {/* Timer */}
            <Body style={styles.timer}>{formatTime(duration)}</Body>

            {/* Status text */}
            {recordingState === 'recording' && (
              <>
                <Title style={styles.listeningText}>I'm listening...</Title>
                <Body style={styles.subtitleText}>Speak naturally. No need to rehearse.</Body>
              </>
            )}
            {recordingState === 'paused' && (
              <>
                <Title style={styles.listeningText}>Recording paused</Title>
                <Body style={styles.subtitleText}>Tap resume to continue.</Body>
              </>
            )}

            {/* Waveform */}
            {(recordingState === 'recording' || recordingState === 'paused') && (
              <View style={styles.waveformContainer}>
                {waveformAnimations.map((anim, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.waveformBar,
                      {
                        height: BAR_HEIGHTS[index],
                        opacity: anim,
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              {/* Pause / Resume */}
              <Pressable
                style={({ pressed }) => [
                  styles.pauseButton,
                  pressed && styles.pauseButtonPressed,
                ]}
                onPress={recordingState === 'recording' ? pauseRecording : resumeRecording}
                disabled={!hasRecording}
              >
                <Body style={styles.pauseButtonText}>
                  {recordingState === 'recording' ? 'Pause' : 'Resume'}
                </Body>
                <Icon
                  name={recordingState === 'recording' ? 'pause' : 'play'}
                  size={16}
                  color={themeLight.textPrimary}
                />
              </Pressable>

              {/* Tap to complete */}
              <Pressable
                style={({ pressed }) => [
                  styles.completeButton,
                  pressed && styles.completeButtonPressed,
                ]}
                onPress={stopRecording}
                disabled={!hasRecording}
              >
                <Body style={styles.completeButtonText}>Tap to complete</Body>
                <Icon name="check" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ── Discard Confirmation Overlay ── */}
        {showDiscardConfirm && (
          <View style={styles.discardOverlay}>
            <Pressable style={styles.discardDismiss} onPress={() => setShowDiscardConfirm(false)} />
            <View style={[styles.discardCard, { paddingBottom: insets.bottom + 28 }]}>
              <Title style={styles.discardTitle}>Discard this recording?</Title>
              <Body style={styles.discardSubtext}>Your recording will be lost.</Body>
              <View style={styles.discardButtonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.discardCancelBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setShowDiscardConfirm(false)}
                >
                  <Body style={styles.discardCancelText}>Cancel</Body>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.discardConfirmBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleConfirmDiscard}
                >
                  <Body style={styles.discardConfirmText}>Discard</Body>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // ── Backdrop ──
  backdrop: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  fullScreenSheet: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: themeLight.bgPrimary,
  },

  // ── Transcript Section (top) ──
  transcriptSection: {
    flex: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginTop: 20,
    marginRight: 20,
    marginBottom: 16,
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  transcriptCard: {
    backgroundColor: themeLight.bgSecondary,
    borderRadius: 16,
    padding: 18,
  },
  cardHeading: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: themeLight.textPrimary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: themeLight.borderSubtle,
    marginTop: 12,
    marginBottom: 12,
  },
  placeholderText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: themeLight.textSecondary,
    lineHeight: 15 * 1.7,
  },
  scrollGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },

  // ── Controls Section (bottom, fixed) ──
  controlsSection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: themeLight.borderSubtle,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: 'center',
  },
  timer: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 48,
    color: themeLight.textPrimary,
    lineHeight: 56,
  },
  listeningText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: themeLight.textPrimary,
    textAlign: 'center',
    marginTop: 20,
  },
  subtitleText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: themeLight.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },

  // ── Waveform ──
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginTop: 32,
    marginBottom: 32,
  },
  waveformBar: {
    width: 3,
    backgroundColor: themeLight.accent,
    borderRadius: 2,
    marginHorizontal: 1.75,
  },

  // ── Buttons ──
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeLight.bgTertiary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 26,
    gap: 8,
  },
  pauseButtonPressed: {
    opacity: 0.8,
  },
  pauseButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: themeLight.textPrimary,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeLight.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 26,
    gap: 8,
  },
  completeButtonPressed: {
    backgroundColor: themeLight.accentHover,
  },
  completeButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  // ── Discard Confirmation ──
  discardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  discardDismiss: {
    flex: 1,
  },
  discardCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  discardTitle: {
    fontSize: 20,
    color: themeLight.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  discardSubtext: {
    fontSize: 15,
    color: themeLight.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  discardButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  discardCancelBtn: {
    flex: 1,
    backgroundColor: themeLight.bgTertiary,
    paddingVertical: 16,
    borderRadius: 26,
    alignItems: 'center',
  },
  discardCancelText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: themeLight.textPrimary,
  },
  discardConfirmBtn: {
    flex: 1,
    backgroundColor: themeLight.error,
    paddingVertical: 16,
    borderRadius: 26,
    alignItems: 'center',
  },
  discardConfirmText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
})

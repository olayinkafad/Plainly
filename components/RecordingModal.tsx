import { useState, useEffect, useRef, useCallback } from 'react'
import { View, StyleSheet, Modal, Pressable, Animated, Dimensions, ScrollView, Easing } from 'react-native'
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

const PROCESSING_STEPS = [
  'Listening back',
  'Transcribing',
  'Summarizing',
  'Finishing touches',
]

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

  // ── Processing phase state ──
  const [phase, setPhase] = useState<'recording' | 'processing'>('recording')
  const [activeStep, setActiveStep] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const savedRecordingIdRef = useRef<string | null>(null)
  const stepTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Phase crossfade animations
  const recordingViewOpacity = useRef(new Animated.Value(1)).current
  const processingViewOpacity = useRef(new Animated.Value(0)).current

  // Step animations: each step has opacity, translateY, checkScale
  const stepAnims = useRef(
    PROCESSING_STEPS.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(12),
      checkScale: new Animated.Value(0),
    }))
  ).current

  // Dot bounce animations (3 dots for active step indicator)
  const dotScales = useRef([
    new Animated.Value(0.6),
    new Animated.Value(0.6),
    new Animated.Value(0.6),
  ]).current
  const dotLoopRef = useRef<Animated.CompositeAnimation | null>(null)

  const { height: SCREEN_HEIGHT } = Dimensions.get('window')

  // ── Reset processing state ──
  const resetProcessingState = useCallback(() => {
    // Clear all step timeouts
    stepTimeoutsRef.current.forEach(t => clearTimeout(t))
    stepTimeoutsRef.current = []

    setPhase('recording')
    setActiveStep(-1)
    setCompletedSteps(new Set())
    savedRecordingIdRef.current = null

    // Reset crossfade
    recordingViewOpacity.setValue(1)
    processingViewOpacity.setValue(0)

    // Reset step animations
    stepAnims.forEach(s => {
      s.opacity.setValue(0)
      s.translateY.setValue(12)
      s.checkScale.setValue(0)
    })

    // Stop and reset dot animations
    if (dotLoopRef.current) {
      dotLoopRef.current.stop()
      dotLoopRef.current = null
    }
    dotScales.forEach(d => d.setValue(0.6))
  }, [recordingViewOpacity, processingViewOpacity, stepAnims, dotScales])

  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
      hasStartedRef.current = false
      resetProcessingState()

      // Await cleanup before starting a new recording
      const init = async () => {
        await resetRecording()
        await requestPermissionsAndStart()
      }
      init()
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
      resetRecording()
      resetProcessingState()
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

        // Store ID for after processing animation completes
        savedRecordingIdRef.current = newRecording.id

        // Stop recording UI
        setRecordingState('idle')
        setHasRecording(false)
        stopTimer()
        stopWaveformAnimation()
        hasStartedRef.current = false

        // Transition to processing phase
        startProcessingPhase()
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

  // ── Processing Phase ──

  const startDotBounce = () => {
    if (dotLoopRef.current) {
      dotLoopRef.current.stop()
    }
    dotScales.forEach(d => d.setValue(0.6))

    const createDotAnim = (dotAnim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotAnim, {
            toValue: 1.0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0.6,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          // Pad to fill the 1.2s loop
          Animated.delay(400 - delay),
        ])
      )

    const loop = Animated.parallel([
      createDotAnim(dotScales[0], 0),
      createDotAnim(dotScales[1], 150),
      createDotAnim(dotScales[2], 300),
    ])
    dotLoopRef.current = loop
    loop.start()
  }

  const stopDotBounce = () => {
    if (dotLoopRef.current) {
      dotLoopRef.current.stop()
      dotLoopRef.current = null
    }
    dotScales.forEach(d => d.setValue(0.6))
  }

  const activateStep = (index: number) => {
    setActiveStep(index)
    startDotBounce()

    // Fade in + slide up
    Animated.parallel([
      Animated.timing(stepAnims[index].opacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(stepAnims[index].translateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start()

    // Schedule completion
    const delay = index === 3 ? 1500 : 2000
    const t = setTimeout(() => {
      completeStep(index)
    }, delay)
    stepTimeoutsRef.current.push(t)
  }

  const completeStep = (index: number) => {
    setCompletedSteps(prev => new Set(prev).add(index))
    stopDotBounce()

    // Checkmark pop: scale 0 → 1.1 → 1.0
    Animated.sequence([
      Animated.timing(stepAnims[index].checkScale, {
        toValue: 1.1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(stepAnims[index].checkScale, {
        toValue: 1.0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()

    if (index < PROCESSING_STEPS.length - 1) {
      // Activate next step after brief gap
      const t = setTimeout(() => {
        activateStep(index + 1)
      }, 200)
      stepTimeoutsRef.current.push(t)
    } else {
      // All steps done — finish after brief pause
      const t = setTimeout(() => {
        finishProcessing()
      }, 800)
      stepTimeoutsRef.current.push(t)
    }
  }

  const startProcessingPhase = () => {
    setPhase('processing')

    // Crossfade: recording out, processing in
    Animated.parallel([
      Animated.timing(recordingViewOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(processingViewOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Start first step immediately after crossfade
      activateStep(0)
    })
  }

  const finishProcessing = () => {
    const savedId = savedRecordingIdRef.current
    resetProcessingState()
    setDuration(0)

    onClose()

    if (savedId) {
      setTimeout(() => {
        onFormatSelect(savedId)
      }, 300)
    }
  }

  // ── Discard ──

  const handleClose = () => {
    if (phase === 'processing') return // Cannot cancel during processing
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
          {/* ── Recording View (fades out during processing) ── */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: recordingViewOpacity }]}
            pointerEvents={phase === 'processing' ? 'none' : 'auto'}
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

          {/* ── Processing View (fades in during processing) ── */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: processingViewOpacity }]}
            pointerEvents={phase === 'processing' ? 'auto' : 'none'}
          >
            <View style={styles.processingContainer}>
              <View style={styles.stepsGroup}>
                {PROCESSING_STEPS.map((label, i) => {
                  if (i > activeStep) return null
                  const isCompleted = completedSteps.has(i)
                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.stepRow,
                        i > 0 && styles.stepRowSpacing,
                        {
                          opacity: stepAnims[i].opacity,
                          transform: [{ translateY: stepAnims[i].translateY }],
                        },
                      ]}
                    >
                      {/* Indicator */}
                      <View style={styles.stepIndicator}>
                        {isCompleted ? (
                          <Animated.View
                            style={[
                              styles.checkCircle,
                              { transform: [{ scale: stepAnims[i].checkScale }] },
                            ]}
                          >
                            <Icon name="check" size={14} color="#FFFFFF" />
                          </Animated.View>
                        ) : (
                          <View style={styles.dotRow}>
                            {dotScales.map((dotScale, di) => (
                              <Animated.View
                                key={di}
                                style={[
                                  styles.dot,
                                  { transform: [{ scale: dotScale }] },
                                ]}
                              />
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Label */}
                      <Body style={isCompleted ? styles.stepTextCompleted : styles.stepTextActive}>
                        {label}
                      </Body>
                    </Animated.View>
                  )
                })}
              </View>
            </View>
          </Animated.View>
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

  // ── Processing View ──
  processingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  stepsGroup: {
    alignItems: 'flex-start',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepRowSpacing: {
    marginTop: 32,
  },
  stepIndicator: {
    width: 34,
    height: 24,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: themeLight.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeLight.accent,
  },
  stepTextActive: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: themeLight.textPrimary,
    marginLeft: 12,
  },
  stepTextCompleted: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    color: themeLight.textPrimary,
    marginLeft: 12,
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

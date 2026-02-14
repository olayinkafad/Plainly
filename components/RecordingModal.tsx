import { useState, useEffect, useRef, useCallback } from 'react'
import { View, StyleSheet, Modal, Pressable, Animated, Dimensions, ScrollView, Easing } from 'react-native'
import { Audio } from 'expo-av'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, usePathname } from 'expo-router'
import Icon from './Icon'
import { Title, Body } from './typography'
import Button from './Button'
import { Recording, recordingsStore } from '../store/recordings'
import { themeLight } from '../constants/theme'
import { processRecording, generateRecordingTitle } from '../lib/api'
import { StructuredSummary, StructuredTranscript } from '../types'

interface RecordingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (recording: Recording, showToast?: boolean) => void
}

type RecordingState = 'idle' | 'recording' | 'paused'

const WAVEFORM_BAR_COUNT = 25

const PROCESSING_STEPS = [
  'Listening back',
  'Transcribing',
  'Summarizing',
  'Finishing touches',
]

const STEP_MIN_TIMES = [2000, 2000, 2000, 1500]

// Pre-computed static bar heights for visual variety (taller in center, shorter at edges)
const BAR_HEIGHTS = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => {
  const center = WAVEFORM_BAR_COUNT / 2
  const distance = Math.abs(i - center) / center
  return 16 + 28 * (1 - distance * 0.7) + Math.random() * 8
})

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default function RecordingModal({
  isOpen,
  onClose,
  onSave,
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
  const savedAudioUriRef = useRef<string | null>(null)

  // API processing state
  const apiCompleteRef = useRef(false)
  const apiResultRef = useRef<{
    transcript: string
    summary: StructuredSummary | string
    structuredTranscript: StructuredTranscript | string
  } | null>(null)
  const apiErrorRef = useRef<string | null>(null)
  const stepResolverRef = useRef<(() => void) | null>(null)
  const processingAbortedRef = useRef(false)

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
    processingAbortedRef.current = true

    setPhase('recording')
    setActiveStep(-1)
    setCompletedSteps(new Set())
    savedRecordingIdRef.current = null
    savedAudioUriRef.current = null

    // Reset API state
    apiCompleteRef.current = false
    apiResultRef.current = null
    apiErrorRef.current = null
    stepResolverRef.current = null
    processingAbortedRef.current = false

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
        const retryDelay = RETRY_DELAYS[retryCount] || 2000
        console.log(`Retrying recording start after ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
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

        // Store ID and URI for processing
        savedRecordingIdRef.current = newRecording.id
        savedAudioUriRef.current = uri

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

    const createDotAnim = (dotAnim: Animated.Value, dotDelay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(dotDelay),
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
          Animated.delay(400 - dotDelay),
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

  const activateStepAnim = (index: number) => {
    setActiveStep(index)
    startDotBounce()

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
  }

  const completeStepAnim = (index: number) => {
    setCompletedSteps(prev => new Set(prev).add(index))
    stopDotBounce()

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
  }

  const callProcessingAPI = async () => {
    const audioUri = savedAudioUriRef.current
    if (!audioUri) {
      apiErrorRef.current = 'No audio URI available'
      apiCompleteRef.current = true
      return
    }

    try {
      const result = await processRecording(audioUri)

      if (processingAbortedRef.current) return

      if (result.error) {
        apiErrorRef.current = result.error
        apiCompleteRef.current = true
        // Release last step if waiting
        if (stepResolverRef.current) stepResolverRef.current()
        return
      }

      // Parse structured outputs
      let parsedSummary: StructuredSummary | string
      try {
        parsedSummary = JSON.parse(result.summary)
      } catch {
        parsedSummary = result.summary
      }

      let parsedTranscript: StructuredTranscript | string
      try {
        parsedTranscript = JSON.parse(result.structuredTranscript)
      } catch {
        parsedTranscript = result.structuredTranscript
      }

      apiResultRef.current = {
        transcript: result.transcript,
        summary: parsedSummary,
        structuredTranscript: parsedTranscript,
      }
      apiCompleteRef.current = true

      // Release last step if waiting
      if (stepResolverRef.current) stepResolverRef.current()
    } catch (error) {
      if (processingAbortedRef.current) return
      apiErrorRef.current = error instanceof Error ? error.message : 'Failed to process recording'
      apiCompleteRef.current = true
      if (stepResolverRef.current) stepResolverRef.current()
    }
  }

  const runStepSequence = async () => {
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      if (processingAbortedRef.current) return

      activateStepAnim(i)

      // Wait minimum display time for this step
      await delay(STEP_MIN_TIMES[i])

      if (processingAbortedRef.current) return

      // For the last step, also wait for API completion
      if (i === PROCESSING_STEPS.length - 1 && !apiCompleteRef.current) {
        await new Promise<void>((resolve) => {
          stepResolverRef.current = resolve
          // Safety: check if API already completed while we were setting up
          if (apiCompleteRef.current) {
            resolve()
          }
        })
      }

      if (processingAbortedRef.current) return

      completeStepAnim(i)

      // Brief gap between steps (except after last)
      if (i < PROCESSING_STEPS.length - 1) {
        await delay(200)
      }
    }

    if (processingAbortedRef.current) return

    // All steps done — finish after brief pause
    await delay(800)

    if (processingAbortedRef.current) return

    await finishProcessing()
  }

  const startProcessingPhase = () => {
    setPhase('processing')
    processingAbortedRef.current = false
    apiCompleteRef.current = false
    apiResultRef.current = null
    apiErrorRef.current = null
    stepResolverRef.current = null

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
      // Start step animations AND API call simultaneously
      runStepSequence()
      callProcessingAPI()
    })
  }

  const finishProcessing = async () => {
    const savedId = savedRecordingIdRef.current

    // Check for API errors
    if (apiErrorRef.current) {
      resetProcessingState()
      setDuration(0)
      onClose()

      if (savedId) {
        if (apiErrorRef.current.includes('No speech detected')) {
          // Navigate to result screen to show empty state
          setTimeout(() => {
            router.replace(`/recordings/${savedId}`)
          }, 300)
        } else {
          // Navigate to generating screen for error display/retry
          setTimeout(() => {
            router.push({
              pathname: '/generating',
              params: { recordingId: savedId, errorMessage: apiErrorRef.current! },
            })
          }, 300)
        }
      }
      return
    }

    // Save outputs to recording store
    if (savedId && apiResultRef.current) {
      const { summary, structuredTranscript, transcript } = apiResultRef.current

      await recordingsStore.update(savedId, {
        outputs: {
          summary: summary,
          transcript: structuredTranscript,
        },
        lastViewedFormat: 'summary',
      })

      // Auto-generate title in background
      const summaryText = typeof summary === 'object' && 'one_line' in summary
        ? summary.one_line
        : typeof summary === 'string' ? summary : undefined

      generateRecordingTitle(transcript, summaryText)
        .then(async (title) => {
          if (title && title !== 'Recording') {
            await recordingsStore.update(savedId, { title })
          }
        })
        .catch(console.error)
    }

    resetProcessingState()
    setDuration(0)
    onClose()

    if (savedId) {
      setTimeout(() => {
        router.replace(`/recordings/${savedId}`)
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
                <View style={styles.discardBtnContainer}>
                  <Button variant="secondary" fullWidth onPress={() => setShowDiscardConfirm(false)}>
                    Cancel
                  </Button>
                </View>
                <View style={styles.discardBtnContainer}>
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
  discardBtnContainer: {
    flex: 1,
  },
  discardConfirmBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 9999,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeLight.error,
  },
  discardConfirmText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
})

import { useState, useEffect, useRef, useCallback } from 'react'
import { View, StyleSheet, Modal, Pressable, Animated, Dimensions, ScrollView, Easing } from 'react-native'
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, usePathname } from 'expo-router'
import Icon from './Icon'
import { Title, Body } from './typography'
import { Recording, recordingsStore } from '../store/recordings'
import { themeLight } from '../constants/theme'
import { transcribeAudio, generateOutputs, generateRecordingTitle } from '../lib/api'
import { StructuredSummary, StructuredTranscript } from '../types'

interface RecordingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (recording: Recording, showToast?: boolean) => void
  onPermissionDenied?: () => void
}

type RecordingState = 'idle' | 'recording' | 'paused'

const WAVEFORM_BAR_COUNT = 25

const PROCESSING_STEPS = [
  'Sending your recording',
  'Cleaning up your words',
  'Pulling out what matters',
  'Wrapping up',
]

const STEP_MIN_TIMES = [1500, 2000, 2000, 1000]

// Pre-computed static bar heights for visual variety (taller in center, shorter at edges)
const BAR_HEIGHTS = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => {
  const center = WAVEFORM_BAR_COUNT / 2
  const distance = Math.abs(i - center) / center
  return 16 + 28 * (1 - distance * 0.7) + Math.random() * 8
})

const MAX_RECORDING_DURATION = 1800 // 30 minutes in seconds
const MAX_DURATION_WARNING_THRESHOLD = 0.9 // Show warning at 90%

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default function RecordingModal({
  isOpen,
  onClose,
  onSave,
  onPermissionDenied,
}: RecordingModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  // expo-audio recorder hook with mic interruption detection via status listener
  const recorder = useAudioRecorder(
    RecordingPresets.HIGH_QUALITY,
    (status) => {
      if (status.hasError && !userInitiatedPauseRef.current) {
        handleMicInterruption()
      }
    }
  )

  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [hasRecording, setHasRecording] = useState(false)
  const [showCloseSheet, setShowCloseSheet] = useState(false)
  const [micInterrupted, setMicInterrupted] = useState(false)
  const [micLost, setMicLost] = useState(false)
  const [durationWarning, setDurationWarning] = useState(false)
  const [maxLengthToast, setMaxLengthToast] = useState(false)
  const maxLengthToastAnim = useRef(new Animated.Value(0)).current
  const micReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userInitiatedPauseRef = useRef(false)
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
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'network' | 'midway' | null>(null)
  const [failedStepIndex, setFailedStepIndex] = useState<number | null>(null)
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null)
  const timeoutMessageAnim = useRef(new Animated.Value(0)).current
  const stepStartTimeRef = useRef<number>(0)
  const timeoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const savedRecordingIdRef = useRef<string | null>(null)
  const savedAudioUriRef = useRef<string | null>(null)

  // API processing state
  const apiResultRef = useRef<{
    transcript: string
    summary: StructuredSummary | string
    structuredTranscript: StructuredTranscript | string
  } | null>(null)
  const apiErrorRef = useRef<string | null>(null)
  const processingAbortedRef = useRef(false)

  // Step resolvers: each step waits for its resolver to be called
  const stepResolversRef = useRef<Array<(() => void) | null>>([null, null, null, null])
  const stepResolvedRef = useRef<boolean[]>([false, false, false, false])

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
    setProcessingError(null)
    setErrorType(null)
    setFailedStepIndex(null)
    setTimeoutMessage(null)
    timeoutMessageAnim.setValue(0)
    stepStartTimeRef.current = 0
    if (timeoutIntervalRef.current) {
      clearInterval(timeoutIntervalRef.current)
      timeoutIntervalRef.current = null
    }
    savedRecordingIdRef.current = null
    savedAudioUriRef.current = null

    // Reset API state
    apiResultRef.current = null
    apiErrorRef.current = null
    stepResolversRef.current = [null, null, null, null]
    stepResolvedRef.current = [false, false, false, false]
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
  }, [recordingViewOpacity, processingViewOpacity, stepAnims, dotScales, timeoutMessageAnim])

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
      setShowCloseSheet(false)
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
      const { status } = await requestRecordingPermissionsAsync()
      if (status !== 'granted') {
        onClose()
        if (onPermissionDenied) {
          setTimeout(() => onPermissionDenied(), 300)
        }
        return
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
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
    if (hasStartedRef.current && recorder.isRecording) return

    const MAX_RETRIES = 3
    const RETRY_DELAYS = [200, 400, 800]

    try {
      if (recorder.isRecording) {
        try {
          await recorder.stop()
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      if (retryCount > 0) {
        try {
          await setAudioModeAsync({
            allowsRecording: false,
            playsInSilentMode: false,
          })
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (e) {
          // Ignore
        }
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      })

      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      await recorder.prepareToRecordAsync()
      recorder.record()

      setRecordingState('recording')
      setHasRecording(true)
      setMicInterrupted(false)
      setMicLost(false)
      setDuration(0)
      startTimer()
      startWaveformAnimation()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Failed to start recording:', error)

      if (
        errorMessage.includes('Recording') &&
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
    try {
      userInitiatedPauseRef.current = true
      recorder.pause()
      setRecordingState('paused')
      stopTimer()
      stopWaveformAnimation()
    } catch (error) {
      console.error('Failed to pause recording:', error)
    }
  }

  const resumeRecording = async () => {
    try {
      userInitiatedPauseRef.current = false
      setMicInterrupted(false)
      setMicLost(false)
      recorder.record()
      setRecordingState('recording')
      startTimer()
      startWaveformAnimation()
    } catch (error) {
      console.error('Failed to resume recording:', error)
    }
  }

  const saveAndCloseRecording = async () => {
    try {
      await recorder.stop()
      const uri = recorder.uri

      if (uri) {
        const newRecording: Recording = {
          id: Date.now().toString(),
          title: 'Recording',
          createdAt: Date.now(),
          durationSec: duration,
          audioBlobUrl: uri,
          outputs: {},
          lastViewedFormat: 'summary',
          status: 'processing',
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
    if (recorder.isRecording) {
      try {
        await recorder.stop()
      } catch (error) {
        // Ignore errors
      }
    }
    setRecordingState('idle')
    setDuration(0)
    setHasRecording(false)
    setMicInterrupted(false)
    setMicLost(false)
    setDurationWarning(false)
    setMaxLengthToast(false)
    maxLengthToastAnim.setValue(0)
    userInitiatedPauseRef.current = false
    if (micReconnectTimerRef.current) {
      clearTimeout(micReconnectTimerRef.current)
      micReconnectTimerRef.current = null
    }
    stopTimer()
    stopWaveformAnimation()
    hasStartedRef.current = false
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      })
    } catch (error) {
      // Ignore
    }
  }

  // ── Mic Interruption ──

  const handleMicInterruption = () => {
    if (recordingState !== 'recording' || phase !== 'recording') return

    setMicInterrupted(true)
    setRecordingState('paused')
    stopTimer()
    stopWaveformAnimation()

    // Start 5-second reconnection timer
    if (micReconnectTimerRef.current) {
      clearTimeout(micReconnectTimerRef.current)
    }
    micReconnectTimerRef.current = setTimeout(() => {
      // If still interrupted after 5s, show "mic lost" state
      setMicLost(true)
    }, 5000)
  }

  const handleMicSaveAndFinish = async () => {
    if (micReconnectTimerRef.current) {
      clearTimeout(micReconnectTimerRef.current)
      micReconnectTimerRef.current = null
    }
    setMicInterrupted(false)
    setMicLost(false)
    await saveAndCloseRecording()
  }

  const handleMicDiscard = async () => {
    if (micReconnectTimerRef.current) {
      clearTimeout(micReconnectTimerRef.current)
      micReconnectTimerRef.current = null
    }
    setMicInterrupted(false)
    setMicLost(false)
    await resetRecording()
    onClose()
  }

  // ── Timer ──

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(() => {
      setDuration((prev) => {
        const next = prev + 0.5
        // Check max duration thresholds
        if (next >= MAX_RECORDING_DURATION) {
          // Auto-stop at max duration
          setTimeout(() => autoStopAtMaxDuration(), 0)
          return MAX_RECORDING_DURATION
        }
        if (next >= MAX_RECORDING_DURATION * MAX_DURATION_WARNING_THRESHOLD) {
          setDurationWarning(true)
        }
        return next
      })
    }, 500)
  }

  const autoStopAtMaxDuration = async () => {
    // Show toast
    setMaxLengthToast(true)
    Animated.timing(maxLengthToastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    // Auto-dismiss toast after 2s
    setTimeout(() => {
      Animated.timing(maxLengthToastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setMaxLengthToast(false))
    }, 2000)

    // Stop and process
    await saveAndCloseRecording()
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

    // Start timeout tracking for this step
    stepStartTimeRef.current = Date.now()
    setTimeoutMessage(null)
    timeoutMessageAnim.setValue(0)
    if (timeoutIntervalRef.current) {
      clearInterval(timeoutIntervalRef.current)
    }
    timeoutIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - stepStartTimeRef.current) / 1000
      if (elapsed >= 30) {
        setTimeoutMessage('Still working on it. You can wait or come back \u2014 we\u2019ll finish in the background.')
      } else if (elapsed >= 15) {
        setTimeoutMessage('Taking longer than usual...')
      }
    }, 1000)

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

    // Clear timeout tracking
    if (timeoutIntervalRef.current) {
      clearInterval(timeoutIntervalRef.current)
      timeoutIntervalRef.current = null
    }
    setTimeoutMessage(null)
    timeoutMessageAnim.setValue(0)
    stepStartTimeRef.current = 0

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

  // Resolve a step (called by the API pipeline when a stage completes)
  const resolveStep = (stepIndex: number) => {
    stepResolvedRef.current[stepIndex] = true
    const resolver = stepResolversRef.current[stepIndex]
    if (resolver) {
      resolver()
      stepResolversRef.current[stepIndex] = null
    }
  }

  // Wait for a step to be resolved by the API pipeline
  const waitForStepResolution = (stepIndex: number) =>
    new Promise<void>((resolve) => {
      if (stepResolvedRef.current[stepIndex]) {
        resolve()
      } else {
        stepResolversRef.current[stepIndex] = resolve
      }
    })

  const isNetworkError = (errorMsg: string) => {
    const lower = errorMsg.toLowerCase()
    return lower.includes('network') || lower.includes('connect') || lower.includes('no connection')
  }

  const callProcessingAPI = async () => {
    const audioUri = savedAudioUriRef.current
    if (!audioUri) {
      apiErrorRef.current = 'No audio URI available'
      for (let i = 0; i < PROCESSING_STEPS.length; i++) resolveStep(i)
      return
    }

    try {
      // Step 0: "Sending your recording" — completes when upload/transcription request finishes
      const transcribeResult = await transcribeAudio(audioUri)

      if (processingAbortedRef.current) return

      if (transcribeResult.error) {
        apiErrorRef.current = transcribeResult.error
        // Detect network error (upload failed)
        if (isNetworkError(transcribeResult.error)) {
          setErrorType('network')
          setFailedStepIndex(0)
        }
        resolveStep(0)
        for (let i = 1; i < PROCESSING_STEPS.length; i++) resolveStep(i)
        return
      }

      // Step 0 done (audio sent and transcript received)
      resolveStep(0)

      // Step 1: "Cleaning up your words" — transcription is already done, mark complete
      resolveStep(1)

      if (processingAbortedRef.current) return

      // Step 2: "Pulling out what matters" — generate outputs from transcript
      const outputsResult = await generateOutputs(transcribeResult.transcript)

      if (processingAbortedRef.current) return

      if (outputsResult.error) {
        apiErrorRef.current = outputsResult.error
        // This is a midway failure — transcription succeeded but output generation failed
        setErrorType('midway')
        setFailedStepIndex(2)
        // Store partial result (transcript exists)
        apiResultRef.current = {
          transcript: transcribeResult.transcript,
          summary: '',
          structuredTranscript: '',
        }
        resolveStep(2)
        resolveStep(3)
        return
      }

      // Parse structured outputs
      let parsedSummary: StructuredSummary | string
      try {
        parsedSummary = JSON.parse(outputsResult.summary)
      } catch {
        parsedSummary = outputsResult.summary
      }

      let parsedTranscript: StructuredTranscript | string
      try {
        parsedTranscript = JSON.parse(outputsResult.structuredTranscript)
      } catch {
        parsedTranscript = outputsResult.structuredTranscript
      }

      apiResultRef.current = {
        transcript: transcribeResult.transcript,
        summary: parsedSummary,
        structuredTranscript: parsedTranscript,
      }

      // Step 2 done (outputs generated)
      resolveStep(2)

      // Step 3: "Wrapping up" — resolved immediately, actual save happens in finishProcessing
      resolveStep(3)
    } catch (error) {
      if (processingAbortedRef.current) return
      const errorMsg = error instanceof Error ? error.message : 'Failed to process recording'
      apiErrorRef.current = errorMsg
      if (isNetworkError(errorMsg)) {
        setErrorType('network')
        setFailedStepIndex(0)
      }
      for (let i = 0; i < PROCESSING_STEPS.length; i++) resolveStep(i)
    }
  }

  const runStepSequence = async () => {
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      if (processingAbortedRef.current) return

      activateStepAnim(i)

      // Wait for BOTH: minimum display time AND actual API stage completion
      await Promise.all([
        delay(STEP_MIN_TIMES[i]),
        waitForStepResolution(i),
      ])

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

    // Drift-out animation: steps fade up and out
    await new Promise<void>((resolve) => {
      Animated.parallel(
        PROCESSING_STEPS.map((_, i) =>
          Animated.parallel([
            Animated.timing(stepAnims[i].opacity, {
              toValue: 0,
              duration: 900,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(stepAnims[i].translateY, {
              toValue: -35,
              duration: 900,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        )
      ).start(() => resolve())
    })

    if (processingAbortedRef.current) return

    await finishProcessing()
  }

  const startProcessingPhase = () => {
    setPhase('processing')
    processingAbortedRef.current = false
    apiResultRef.current = null
    apiErrorRef.current = null
    stepResolversRef.current = [null, null, null, null]
    stepResolvedRef.current = [false, false, false, false]

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

  const handleRetryProcessing = () => {
    setProcessingError(null)
    setErrorType(null)
    setFailedStepIndex(null)
    setTimeoutMessage(null)
    timeoutMessageAnim.setValue(0)
    if (timeoutIntervalRef.current) {
      clearInterval(timeoutIntervalRef.current)
      timeoutIntervalRef.current = null
    }
    setActiveStep(-1)
    setCompletedSteps(new Set())

    // Reset API state
    apiResultRef.current = null
    apiErrorRef.current = null
    processingAbortedRef.current = false
    stepResolversRef.current = [null, null, null, null]
    stepResolvedRef.current = [false, false, false, false]

    // Reset step animations
    stepAnims.forEach(s => {
      s.opacity.setValue(0)
      s.translateY.setValue(12)
      s.checkScale.setValue(0)
    })
    dotScales.forEach(d => d.setValue(0.6))

    // Re-run step sequence and API call
    runStepSequence()
    callProcessingAPI()
  }

  const finishProcessing = async () => {
    const savedId = savedRecordingIdRef.current

    // Clear timeout tracking
    if (timeoutIntervalRef.current) {
      clearInterval(timeoutIntervalRef.current)
      timeoutIntervalRef.current = null
    }

    // Check for API errors
    if (apiErrorRef.current) {
      if (savedId && apiErrorRef.current?.includes('No speech detected')) {
        // Navigate to result screen to show empty state
        await recordingsStore.update(savedId, { status: 'completed' })
        resetProcessingState()
        setDuration(0)
        onClose()
        setTimeout(() => {
          router.replace(`/recordings/${savedId}`)
        }, 300)
      } else if (errorType === 'midway' && savedId && apiResultRef.current) {
        // Midway failure: save partial results and show error with "Go to recording" option
        const { transcript, structuredTranscript } = apiResultRef.current
        const updates: any = {
          status: 'failed' as const,
          processingError: apiErrorRef.current,
        }
        // Save transcript if we have it
        if (transcript && structuredTranscript) {
          updates.outputs = { transcript: structuredTranscript }
        }
        await recordingsStore.update(savedId, updates)
        setProcessingError(apiErrorRef.current || 'Something went wrong.')
      } else if (errorType === 'network') {
        // Network failure: mark as failed, show network error UI
        if (savedId) {
          await recordingsStore.update(savedId, {
            status: 'failed',
            processingError: apiErrorRef.current,
          })
        }
        setProcessingError(apiErrorRef.current || 'No connection.')
      } else {
        // Generic error
        if (savedId) {
          await recordingsStore.update(savedId, {
            status: 'failed',
            processingError: apiErrorRef.current,
          })
        }
        setProcessingError(apiErrorRef.current || 'Something went wrong. Please try again.')
      }
      return
    }

    // Save outputs to recording store
    if (savedId && apiResultRef.current) {
      const { summary, structuredTranscript, transcript } = apiResultRef.current

      await recordingsStore.update(savedId, {
        status: 'completed',
        outputs: {
          summary: summary,
          transcript: structuredTranscript,
        },
        lastViewedFormat: 'summary',
      })

      // Auto-generate title in background
      const summaryText = typeof summary === 'object' && 'gist' in summary
        ? summary.gist
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
        router.replace(`/recordings/${savedId}?new=1`)
      }, 300)
    }
  }

  // ── Close actions ──

  const handleClose = () => {
    if (phase === 'processing' && !processingError) return // Cannot cancel during processing (unless error shown)
    if (hasRecording && (recordingState === 'recording' || recordingState === 'paused')) {
      setShowCloseSheet(true)
    } else {
      onClose()
    }
  }

  const handleSaveAndFinish = async () => {
    setShowCloseSheet(false)
    await saveAndCloseRecording()
  }

  const handleDiscardRecording = async () => {
    setShowCloseSheet(false)
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
                <Icon name="x" size={20} color={themeLight.textSecondary} />
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

              {/* Duration warning */}
              {durationWarning && recordingState === 'recording' && (
                <Body style={styles.durationWarningText}>Recording will end soon</Body>
              )}

              {/* Status text */}
              {micInterrupted && !micLost ? (
                <>
                  <Title style={styles.listeningText}>I'm listening...</Title>
                  <Body style={styles.micInterruptedText}>Recording paused {'\u2014'} microphone disconnected.</Body>
                </>
              ) : micLost ? (
                <>
                  <Title style={styles.listeningText}>I'm listening...</Title>
                  <Body style={styles.micInterruptedText}>Microphone lost. You can save what you have or try again.</Body>
                </>
              ) : recordingState === 'recording' ? (
                <>
                  <Title style={styles.listeningText}>I'm listening...</Title>
                  <Body style={styles.subtitleText}>Speak naturally. No need to rehearse.</Body>
                </>
              ) : recordingState === 'paused' ? (
                <>
                  <Title style={styles.listeningText}>Recording paused</Title>
                  <Body style={styles.subtitleText}>Tap resume to continue.</Body>
                </>
              ) : null}

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
              {micLost ? (
                <View style={styles.buttonRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.completeButton,
                      pressed && styles.completeButtonPressed,
                    ]}
                    onPress={handleMicSaveAndFinish}
                  >
                    <Body style={styles.completeButtonText}>Save and finish</Body>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.pauseButton,
                      pressed && styles.pauseButtonPressed,
                    ]}
                    onPress={handleMicDiscard}
                  >
                    <Body style={styles.pauseButtonText}>Discard</Body>
                  </Pressable>
                </View>
              ) : (
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
              )}
            </View>

            {/* Max length toast */}
            {maxLengthToast && (
              <Animated.View
                style={[
                  styles.maxLengthToast,
                  {
                    opacity: maxLengthToastAnim,
                    transform: [{
                      translateY: maxLengthToastAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    }],
                  },
                ]}
                pointerEvents="none"
              >
                <Body style={styles.maxLengthToastText}>Maximum length reached</Body>
              </Animated.View>
            )}
          </Animated.View>

          {/* ── Processing View (fades in during processing) ── */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: processingViewOpacity }]}
            pointerEvents={phase === 'processing' ? 'auto' : 'none'}
          >
            <View style={styles.processingContainer}>
              {processingError && errorType === 'network' ? (
                /* ── Network Error (upload failed) ── */
                <View style={styles.processingErrorContainer}>
                  <Icon name="wifi-slash" size={32} color={themeLight.accent} style={{ marginBottom: 16 }} />
                  <Title style={styles.processingErrorTitle}>No connection</Title>
                  <Body style={styles.processingErrorBody}>
                    Your recording is saved on your device.
                  </Body>
                  <Pressable
                    style={({ pressed }) => [styles.processingRetryButton, pressed && { opacity: 0.8 }]}
                    onPress={handleRetryProcessing}
                  >
                    <Body style={styles.processingRetryText}>Try again</Body>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.processingGoBackLink, pressed && { opacity: 0.6 }]}
                    onPress={() => {
                      resetProcessingState()
                      setDuration(0)
                      onClose()
                    }}
                  >
                    <Body style={styles.processingGoBackText}>Go back</Body>
                  </Pressable>
                </View>
              ) : processingError && errorType === 'midway' ? (
                /* ── Midway Failure (transcription OK, output generation failed) ── */
                <View style={styles.processingErrorContainer}>
                  <View style={styles.stepsGroup}>
                    {PROCESSING_STEPS.map((label, i) => {
                      if (i > activeStep) return null
                      const isCompleted = completedSteps.has(i)
                      const isFailed = failedStepIndex === i
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
                          <View style={styles.stepIndicator}>
                            {isFailed ? (
                              <Icon name="warning" size={20} color={themeLight.accent} />
                            ) : isCompleted ? (
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
                          <Body style={isFailed ? styles.stepTextFailed : isCompleted ? styles.stepTextCompleted : styles.stepTextActive}>
                            {isFailed ? 'Something went wrong' : label}
                          </Body>
                        </Animated.View>
                      )
                    })}
                  </View>
                  <Body style={styles.midwayErrorSubtext}>
                    We saved your recording. We'll try processing it again.
                  </Body>
                  <Pressable
                    style={({ pressed }) => [styles.processingRetryButton, pressed && { opacity: 0.8 }]}
                    onPress={() => {
                      const savedId = savedRecordingIdRef.current
                      resetProcessingState()
                      setDuration(0)
                      onClose()
                      if (savedId) {
                        setTimeout(() => {
                          router.replace(`/recordings/${savedId}`)
                        }, 300)
                      }
                    }}
                  >
                    <Body style={styles.processingRetryText}>Go to recording</Body>
                  </Pressable>
                </View>
              ) : processingError ? (
                /* ── Generic Error ── */
                <View style={styles.processingErrorContainer}>
                  <Title style={styles.processingErrorTitle}>Something went wrong</Title>
                  <Body style={styles.processingErrorBody}>{processingError}</Body>
                  <Pressable
                    style={({ pressed }) => [styles.processingRetryButton, pressed && { opacity: 0.8 }]}
                    onPress={handleRetryProcessing}
                  >
                    <Body style={styles.processingRetryText}>Try again</Body>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.processingBackButton, pressed && { opacity: 0.8 }]}
                    onPress={() => {
                      resetProcessingState()
                      setDuration(0)
                      onClose()
                    }}
                  >
                    <Body style={styles.processingBackText}>Go back</Body>
                  </Pressable>
                </View>
              ) : (
                /* ── Normal Processing Steps ── */
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

                  {/* Timeout message */}
                  {timeoutMessage && (
                    <View style={styles.timeoutMessageContainer}>
                      <Body style={styles.timeoutMessageText}>{timeoutMessage}</Body>
                      {timeoutMessage.includes('come back') && (
                        <Pressable
                          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                          onPress={() => {
                            resetProcessingState()
                            setDuration(0)
                            onClose()
                            setTimeout(() => {
                              router.replace('/home')
                            }, 300)
                          }}
                        >
                          <Body style={styles.timeoutGoHomeLink}>Go to home</Body>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </Animated.View>
        </Animated.View>

        {/* ── Close Action Sheet ── */}
        {showCloseSheet && (
          <View style={styles.closeSheetOverlay}>
            <Pressable style={styles.closeSheetDismiss} onPress={() => setShowCloseSheet(false)} />
            <View style={[styles.closeSheetCard, { paddingBottom: insets.bottom + 28 }]}>
              <Pressable
                style={({ pressed }) => [styles.closeSheetOption, pressed && { opacity: 0.7 }]}
                onPress={handleSaveAndFinish}
              >
                <Body style={styles.closeSheetSaveText}>Save and finish</Body>
              </Pressable>
              <View style={styles.closeSheetDivider} />
              <Pressable
                style={({ pressed }) => [styles.closeSheetOption, pressed && { opacity: 0.7 }]}
                onPress={handleDiscardRecording}
              >
                <Body style={styles.closeSheetDiscardText}>Discard recording</Body>
              </Pressable>
              <View style={styles.closeSheetDivider} />
              <View style={styles.closeSheetGap} />
              <Pressable
                style={({ pressed }) => [styles.closeSheetOption, pressed && { opacity: 0.7 }]}
                onPress={() => setShowCloseSheet(false)}
              >
                <Body style={styles.closeSheetCancelText}>Cancel</Body>
              </Pressable>
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
    padding: 8,
    borderRadius: 20,
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

  // ── Processing Error ──
  processingErrorContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  processingErrorTitle: {
    fontSize: 24,
    color: themeLight.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  processingErrorBody: {
    fontSize: 14,
    color: themeLight.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  processingRetryButton: {
    backgroundColor: themeLight.accent,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 26,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  processingRetryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  processingBackButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 26,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: themeLight.bgSecondary,
  },
  processingBackText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: themeLight.textPrimary,
  },
  processingGoBackLink: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 12,
  },
  processingGoBackText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: themeLight.textSecondary,
  },
  stepTextFailed: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: themeLight.accent,
    marginLeft: 12,
  },
  midwayErrorSubtext: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: themeLight.textSecondary,
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  timeoutMessageContainer: {
    marginTop: 24,
    alignItems: 'flex-start',
    paddingLeft: 34 + 12,
  },
  timeoutMessageText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: themeLight.textSecondary,
    lineHeight: 20,
  },
  timeoutGoHomeLink: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: themeLight.accent,
    marginTop: 8,
  },

  // ── Mic Interruption ──
  micInterruptedText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: themeLight.accent,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
  },
  durationWarningText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: themeLight.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
  maxLengthToast: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeLight.success,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  maxLengthToastText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#FFFFFF',
  },

  // ── Close Action Sheet ──
  closeSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  closeSheetDismiss: {
    flex: 1,
  },
  closeSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  closeSheetOption: {
    paddingVertical: 17,
    alignItems: 'center',
  },
  closeSheetDivider: {
    height: 1,
    backgroundColor: themeLight.borderSubtle,
  },
  closeSheetGap: {
    height: 8,
  },
  closeSheetSaveText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: themeLight.accent,
    textAlign: 'center',
  },
  closeSheetDiscardText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#C43E3E',
    textAlign: 'center',
  },
  closeSheetCancelText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: themeLight.textSecondary,
    textAlign: 'center',
  },
})

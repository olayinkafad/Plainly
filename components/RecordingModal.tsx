import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Modal, Pressable, Animated, Dimensions, Alert, ScrollView } from 'react-native'
import { Audio } from 'expo-av'
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
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0) // in seconds
  const [hasRecording, setHasRecording] = useState(false)
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
      // Start immediately - cleanup happens in parallel
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
    }

    return () => {
      stopTimer()
    }
  }, [isOpen, slideAnim])

  const requestPermissionsAndStart = async () => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/RecordingModal.tsx:65',message:'requestPermissionsAndStart called',data:{hasStarted:hasStartedRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const { status } = await Audio.requestPermissionsAsync()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/RecordingModal.tsx:68',message:'Permission status',data:{status,isGranted:status === 'granted'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (status !== 'granted') {
        // Close modal if permission denied - system will handle the permission UI
        onClose()
        return
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      // Auto-start recording after permissions granted
      if (!hasStartedRef.current) {
        hasStartedRef.current = true
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/RecordingModal.tsx:80',message:'Calling startRecording',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        await startRecording()
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/RecordingModal.tsx:85',message:'Permission error',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('Permission error:', error)
      onClose()
    }
  }

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        onClose()
        return false
      }
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
      console.error('Permission error:', error)
      onClose()
      return false
    }
  }

  const startRecording = async (retryCount = 0) => {
    // Guard against duplicate starts
    if (hasStartedRef.current && recording) {
      return
    }

    const MAX_RETRIES = 3
    const RETRY_DELAYS = [200, 400, 800] // Progressive delays in ms (minimal)

    try {
      // Clean up any existing recording first
      if (recording) {
        try {
          await recording.stopAndUnloadAsync()
        } catch (e) {
          // Ignore cleanup errors
        }
        setRecording(null)
      }

      // Reset audio mode to clear any prepared recordings (only if needed)
      // Skip reset on first attempt to start immediately
      if (retryCount > 0) {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: false,
          })
          // Minimal wait only on retry
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (e) {
          // Ignore
        }
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      // Minimal delay before creating new recording (only on retry)
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }

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
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Failed to start recording:', error)

      // If it's the "Only one Recording" error and we haven't exceeded retries, retry
      if (
        errorMessage.includes('Only one Recording object can be prepared') &&
        retryCount < MAX_RETRIES
      ) {
        const delay = RETRY_DELAYS[retryCount] || 2000
        console.log(`Retrying recording start after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return startRecording(retryCount + 1)
      }

      // If we've exhausted retries or it's a different error, reset the flag
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
    // Reset audio mode
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      })
    } catch (error) {
      // Ignore
    }
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/RecordingModal.tsx:245',message:'startWaveformAnimation called',data:{waveformAnimationsLength:waveformAnimations.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/RecordingModal.tsx:262',message:'Waveform animations started',data:{animationsCount:animations.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
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
              <Pressable onPress={handleCancel} style={styles.closeButton}>
                <Icon name="x" size={24} color="#6B7280" />
              </Pressable>
            </View>

            {/* Timer */}
            <View style={styles.timerContainer}>
              {(() => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/RecordingModal.tsx:445',message:'Timer render',data:{duration,recordingState,hasRecording},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
                // #endregion
                return null
              })()}
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
              {/* Left: Cancel */}
              <View style={styles.controlItem}>
                <Pressable
                  style={[styles.controlButton, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Icon name="x" size={24} color="#6B7280" />
                </Pressable>
                <Body style={styles.controlLabel}>Cancel</Body>
              </View>

              {/* Center: Stop / Finish */}
              <View style={styles.controlItem}>
                <Pressable
                  style={[styles.controlButton, styles.stopButton]}
                  onPress={stopRecording}
                  disabled={!hasRecording}
                >
                  <Icon name="stop" size={24} color="#FFFFFF" />
                </Pressable>
                <Body style={styles.controlLabel}>Stop</Body>
              </View>

              {/* Right: Pause / Resume */}
              <View style={styles.controlItem}>
                {recordingState === 'recording' ? (
                  <>
                    <Pressable
                      style={[styles.controlButton, styles.pauseButton]}
                      onPress={pauseRecording}
                    >
                      <Icon name="pause" size={24} color="#2563EB" />
                    </Pressable>
                    <Body style={styles.controlLabel}>Pause</Body>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={[styles.controlButton, styles.resumeButton]}
                      onPress={resumeRecording}
                      disabled={!hasRecording}
                    >
                      <Icon name="play" size={24} color="#2563EB" />
                    </Pressable>
                    <Body style={styles.controlLabel}>Resume</Body>
                  </>
                )}
              </View>
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
    justifyContent: 'flex-end',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 16, // --space-4
  },
  controlItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  controlButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  cancelButton: {
    backgroundColor: '#F9FAFB', // --color-bg-secondary
    borderWidth: 1,
    borderColor: '#E5E7EB', // --color-border-default
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
  },
  stopButton: {
    backgroundColor: '#DC2626', // --color-error (red for destructive action)
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5, // Android shadow
  },
  pauseButton: {
    backgroundColor: '#F9FAFB', // --color-bg-secondary
    borderWidth: 1,
    borderColor: '#E5E7EB', // --color-border-default
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
  },
  resumeButton: {
    backgroundColor: '#F9FAFB', // --color-bg-secondary
    borderWidth: 1,
    borderColor: '#E5E7EB', // --color-border-default
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
  },
  controlLabel: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 12, // --font-size-xs
    marginTop: 8, // --space-2
    textAlign: 'center',
  },
  pausedLabel: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 12,
    marginTop: 8, // --space-2
  },
})

import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Image, Animated, LayoutAnimation, Platform, UIManager, Easing } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio'
import { useSharedAudioPlayer } from '../contexts/AudioPlayerContext'
import Icon from '../components/Icon'
import { format } from 'date-fns'
import { Title, Body, Meta } from '../components/typography'
import { recordingsStore, Recording } from '../store/recordings'
import RecordingActionsSheet from '../components/RecordingActionsSheet'
import RecordingModal from '../components/RecordingModal'
import RenameModal from '../components/RenameModal'
import MicPermissionSheet from '../components/MicPermissionSheet'
import { themeLight } from '../constants/theme'
import { transcribeAudio, generateOutputs, generateRecordingTitle } from '../lib/api'
import { StructuredSummary, StructuredTranscript } from '../types'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning. What\u2019s on your mind?'
  if (hour >= 12 && hour < 17) return 'Good afternoon. What\u2019s on your mind?'
  if (hour >= 17 && hour < 21) return 'Good evening. What\u2019s on your mind?'
  return 'Late thoughts? What\u2019s on your mind?'
}

const MILESTONES: { count: number; text: string }[] = [
  { count: 5, text: "5 recordings. You\u2019re building a habit." },
  { count: 10, text: "10 recordings. You\u2019re on a roll." },
  { count: 25, text: "25. That\u2019s a lot of clear thinking." },
  { count: 50, text: "50 recordings. Plainly is your tool now." },
  { count: 100, text: "100. You\u2019ve said a lot worth keeping." },
]

// Pulsing dot for processing state
function PulsingDot() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [pulseAnim])

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: themeLight.accent,
        opacity: pulseAnim,
      }}
    />
  )
}

// Animated equaliser bars for playing state
function EqualizerBars() {
  const bar1 = useRef(new Animated.Value(0.4)).current
  const bar2 = useRef(new Animated.Value(0.8)).current
  const bar3 = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    const animate = (val: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      )
    const a1 = animate(bar1, 400)
    const a2 = animate(bar2, 500)
    const a3 = animate(bar3, 350)
    a1.start(); a2.start(); a3.start()
    return () => { a1.stop(); a2.stop(); a3.stop() }
  }, [bar1, bar2, bar3])

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 12, width: 12 }}>
      <Animated.View style={{ width: 2, borderRadius: 1, backgroundColor: '#FFFFFF', height: 12, transform: [{ scaleY: bar1 }] }} />
      <Animated.View style={{ width: 2, borderRadius: 1, backgroundColor: '#FFFFFF', height: 12, transform: [{ scaleY: bar2 }] }} />
      <Animated.View style={{ width: 2, borderRadius: 1, backgroundColor: '#FFFFFF', height: 12, transform: [{ scaleY: bar3 }] }} />
    </View>
  )
}

export default function Home() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ startRecording?: string; deleted?: string }>()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null)
  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showRecordingModal, setShowRecordingModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showMicPermission, setShowMicPermission] = useState(false)
  const [micPermissionMode, setMicPermissionMode] = useState<'request' | 'denied'>('request')
  const toastAnim = useRef(new Animated.Value(0)).current

  // Deleted toast state
  const [showDeletedToast, setShowDeletedToast] = useState(false)
  const deletedToastAnim = useRef(new Animated.Value(0)).current
  const deletedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Renamed toast state
  const [showRenamedToast, setShowRenamedToast] = useState(false)
  const renamedToastAnim = useRef(new Animated.Value(0)).current
  const renamedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fresh Start State ──
  const [isFreshStart, setIsFreshStart] = useState(false)

  // ── Milestone Toast State ──
  const [showMilestoneToast, setShowMilestoneToast] = useState(false)
  const [milestoneToastText, setMilestoneToastText] = useState('')
  const milestoneToastAnim = useRef(new Animated.Value(0)).current
  const milestoneToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Shared Audio Player ──
  const audio = useSharedAudioPlayer()
  const scrubberWidthRef = useRef(200)

  // ── Breathing Mic Animation ──
  const outerRingScale = useRef(new Animated.Value(1)).current
  const innerButtonScale = useRef(new Animated.Value(1)).current
  const breathingLoopRef = useRef<Animated.CompositeAnimation | null>(null)
  const isScrollingRef = useRef(false)

  useEffect(() => {
    loadRecordings()
  }, [])

  // Auto-open recording modal if coming from onboarding
  useEffect(() => {
    if (params.startRecording === 'true') {
      setShowRecordingModal(true)
    }
  }, [params.startRecording])

  // Show deleted toast when arriving from result screen after deletion
  useEffect(() => {
    if (params.deleted === '1') {
      showDeletedToastNotification()
    }
    return () => {
      if (deletedToastTimerRef.current) clearTimeout(deletedToastTimerRef.current)
      if (renamedToastTimerRef.current) clearTimeout(renamedToastTimerRef.current)
      if (milestoneToastTimerRef.current) clearTimeout(milestoneToastTimerRef.current)
    }
  }, [params.deleted])

  const loadRecordings = async () => {
    try {
      const allRecordings = await recordingsStore.getAll()
      setRecordings(allRecordings)

      // Check fresh start flag
      if (allRecordings.length === 0) {
        const flag = await AsyncStorage.getItem('@plainly_has_deleted_all')
        if (flag === 'true') {
          setIsFreshStart(true)
          await AsyncStorage.removeItem('@plainly_has_deleted_all')
        } else {
          setIsFreshStart(false)
        }
      } else {
        setIsFreshStart(false)
      }

      // Check milestones
      checkMilestones(allRecordings.length)
    } catch (error) {
      console.error('Failed to load recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkMilestones = async (count: number) => {
    for (const milestone of MILESTONES) {
      if (count >= milestone.count) {
        const key = `@plainly_milestone_${milestone.count}`
        const seen = await AsyncStorage.getItem(key)
        if (!seen) {
          await AsyncStorage.setItem(key, 'true')
          showMilestoneToastNotification(milestone.text)
          return // Only show one milestone at a time
        }
      }
    }
  }

  const showMilestoneToastNotification = (text: string) => {
    if (milestoneToastTimerRef.current) clearTimeout(milestoneToastTimerRef.current)
    setMilestoneToastText(text)
    setShowMilestoneToast(true)
    milestoneToastAnim.setValue(0)
    Animated.timing(milestoneToastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    milestoneToastTimerRef.current = setTimeout(() => {
      Animated.timing(milestoneToastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowMilestoneToast(false)
      })
    }, 3000)
  }

  const handleRecord = async () => {
    // Stop any playing audio before recording
    if (audio.playingRecordingId) {
      audio.close()
    }
    const { status } = await getRecordingPermissionsAsync()
    if (status === 'undetermined') {
      setMicPermissionMode('request')
      setShowMicPermission(true)
      return
    }
    if (status === 'denied') {
      setMicPermissionMode('denied')
      setShowMicPermission(true)
      return
    }
    setShowRecordingModal(true)
  }

  const handleMicPermissionContinue = async () => {
    setShowMicPermission(false)
    const { status } = await requestRecordingPermissionsAsync()
    if (status === 'granted') {
      setShowRecordingModal(true)
    }
  }

  const handleSaveRecording = async (recording: Recording, showToast: boolean = true) => {
    try {
      await recordingsStore.add(recording)
      // Clear fresh start flag when new recording is made
      await AsyncStorage.removeItem('@plainly_has_deleted_all')
      setIsFreshStart(false)
      await loadRecordings()
      if (showToast) {
        showToastNotification()
      }
    } catch (error) {
      console.error('Failed to save recording:', error)
    }
  }

  const showToastNotification = () => {
    setShowToast(true)
    Animated.spring(toastAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowToast(false)
      })
    }, 3000)
  }

  const showDeletedToastNotification = () => {
    if (deletedToastTimerRef.current) clearTimeout(deletedToastTimerRef.current)
    setShowDeletedToast(true)
    deletedToastAnim.setValue(0)
    Animated.timing(deletedToastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    deletedToastTimerRef.current = setTimeout(() => {
      Animated.timing(deletedToastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowDeletedToast(false)
      })
    }, 2000)
  }

  const handleRecordingPress = (rec: Recording) => {
    if (rec.status === 'failed') {
      handleRetryRecording(rec)
      return
    }
    router.push(`/recordings/${rec.id}`)
  }

  const handleEllipsisPress = (id: string) => {
    setSelectedRecordingId(id)
    setShowActionsSheet(true)
  }

  const handleRename = () => {
    setShowActionsSheet(false)
    setTimeout(() => {
      setShowRenameModal(true)
    }, 50)
  }

  const showRenamedFeedback = () => {
    if (renamedToastTimerRef.current) clearTimeout(renamedToastTimerRef.current)
    setShowRenamedToast(true)
    renamedToastAnim.setValue(0)
    Animated.timing(renamedToastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    renamedToastTimerRef.current = setTimeout(() => {
      Animated.timing(renamedToastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowRenamedToast(false)
      })
    }, 1500)
  }

  const handleSaveRename = async (newTitle: string) => {
    if (!selectedRecordingId) return
    try {
      await recordingsStore.update(selectedRecordingId, { title: newTitle })
      await loadRecordings()
      setShowRenameModal(false)
      setSelectedRecordingId(null)
      showRenamedFeedback()
    } catch (error) {
      console.error('Failed to rename recording:', error)
      Alert.alert('Error', 'Failed to rename recording')
    }
  }

  const handleDeleteRecording = async (id: string) => {
    try {
      // Stop playback if this recording is playing
      if (audio.playingRecordingId === id) {
        audio.close()
      }
      await recordingsStore.delete(id)

      // Check if all recordings are now gone
      const remaining = await recordingsStore.getAll()
      if (remaining.length === 0) {
        await AsyncStorage.setItem('@plainly_has_deleted_all', 'true')
      }

      await loadRecordings()
      setShowActionsSheet(false)
      setSelectedRecordingId(null)
      showDeletedToastNotification()
    } catch (error) {
      console.error('Failed to delete recording:', error)
    }
  }

  const handleRetryRecording = async (rec: Recording) => {
    // Set status to processing immediately
    await recordingsStore.update(rec.id, { status: 'processing', processingError: undefined })
    await loadRecordings()

    try {
      // Stage 1: Transcribe
      const transcribeResult = await transcribeAudio(rec.audioBlobUrl)
      if (transcribeResult.error) {
        await recordingsStore.update(rec.id, { status: 'failed', processingError: transcribeResult.error })
        await loadRecordings()
        return
      }

      // Stage 2: Generate outputs
      const outputsResult = await generateOutputs(transcribeResult.transcript)
      if (outputsResult.error) {
        // Partial success: save transcript if we have it
        await recordingsStore.update(rec.id, { status: 'failed', processingError: outputsResult.error })
        await loadRecordings()
        return
      }

      // Parse outputs
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

      // Save completed outputs
      await recordingsStore.update(rec.id, {
        status: 'completed',
        processingError: undefined,
        outputs: {
          summary: parsedSummary,
          transcript: parsedTranscript,
        },
        lastViewedFormat: 'summary',
      })

      // Auto-generate title in background
      const summaryText = typeof parsedSummary === 'object' && 'gist' in parsedSummary
        ? parsedSummary.gist
        : typeof parsedSummary === 'string' ? parsedSummary : undefined

      generateRecordingTitle(transcribeResult.transcript, summaryText)
        .then(async (title) => {
          if (title && title !== 'Recording') {
            await recordingsStore.update(rec.id, { title })
            await loadRecordings()
          }
        })
        .catch(console.error)

      await loadRecordings()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to process recording'
      await recordingsStore.update(rec.id, { status: 'failed', processingError: errorMsg })
      await loadRecordings()
    }
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeMs = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // ── Mini Player Functions ──

  const handleMiniScrubberPress = (event: any) => {
    const { locationX } = event.nativeEvent
    const pct = locationX / scrubberWidthRef.current
    const totalSec = audio.duration ?? 0
    audio.seekTo(Math.max(0, Math.min(pct * totalSec, totalSec)))
  }

  const closeMiniPlayer = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    audio.close()
  }

  // ── Breathing Mic Animation ──

  const startBreathingAnimation = () => {
    if (breathingLoopRef.current) return
    const outerScaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(outerRingScale, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(outerRingScale, {
          toValue: 1.0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    const innerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(innerButtonScale, {
          toValue: 1.06,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(innerButtonScale, {
          toValue: 1.0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    const combined = Animated.parallel([outerScaleLoop, innerLoop])
    breathingLoopRef.current = combined
    combined.start()
  }

  const stopBreathingAnimation = () => {
    if (breathingLoopRef.current) {
      breathingLoopRef.current.stop()
      breathingLoopRef.current = null
    }
    outerRingScale.setValue(1)
    innerButtonScale.setValue(1)
  }

  // Start breathing animation (always active unless scrolling)
  useEffect(() => {
    if (!isScrollingRef.current) {
      startBreathingAnimation()
    }
    return () => stopBreathingAnimation()
  }, [recordings.length])

  const handleScrollBeginDrag = () => {
    isScrollingRef.current = true
    stopBreathingAnimation()
  }

  const handleScrollEndDrag = () => {
    isScrollingRef.current = false
    startBreathingAnimation()
  }

  const handleMomentumScrollEnd = () => {
    isScrollingRef.current = false
    startBreathingAnimation()
  }

  const selectedRecording = recordings.find((r) => r.id === selectedRecordingId)

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Body>Loading...</Body>
        </View>
      </SafeAreaView>
    )
  }

  const toastTranslateY = toastAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  })

  const toastOpacity = toastAnim

  // ── Shared bottom section (used in both empty and list states) ──
  const renderBottomSection = () => (
    <View style={styles.bottomOverlay} pointerEvents="box-none">
      <LinearGradient
        colors={['rgba(253, 252, 251, 0)', themeLight.bgPrimary]}
        style={styles.gradientFade}
      />
      <View style={[styles.bottomInner, { paddingBottom: insets.bottom + 28 }]} pointerEvents="auto">
        <Body style={styles.hintText}>Tap the microphone to record</Body>
        <Pressable
          onPress={handleRecord}
          accessibilityLabel="Record your voice note"
          accessibilityRole="button"
        >
          <Animated.View style={[styles.micOuterRing, { transform: [{ scale: outerRingScale }] }]}>
            <Animated.View style={[styles.micButton, { transform: [{ scale: innerButtonScale }] }]}>
              <Icon name="microphone" size={28} color="#FFFFFF" />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Toast Notification */}
      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: insets.top + 16,
              transform: [{ translateY: toastTranslateY }],
              opacity: toastOpacity,
            },
          ]}
        >
          <View style={styles.toastContent}>
            <Icon name="check" size={20} color="#FFFFFF" />
            <Body style={styles.toastText}>Your recording has been saved</Body>
          </View>
        </Animated.View>
      )}

      {/* Deleted Toast */}
      {showDeletedToast && (
        <Animated.View
          style={[
            styles.deletedToast,
            {
              opacity: deletedToastAnim,
              transform: [
                {
                  translateY: deletedToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Body style={styles.deletedToastText}>Deleted</Body>
        </Animated.View>
      )}

      {/* Renamed Toast */}
      {showRenamedToast && (
        <Animated.View
          style={[
            styles.renamedToast,
            {
              opacity: renamedToastAnim,
              transform: [
                {
                  translateY: renamedToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Body style={styles.renamedToastText}>Name saved</Body>
          <Icon name="check" size={16} color="#FFFFFF" />
        </Animated.View>
      )}

      {/* Milestone Toast */}
      {showMilestoneToast && (
        <Animated.View
          style={[
            styles.milestoneToast,
            {
              opacity: milestoneToastAnim,
              transform: [
                {
                  translateY: milestoneToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Body style={styles.milestoneToastText}>{milestoneToastText}</Body>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Plainly</Title>
      </View>

      {recordings.length === 0 ? (
        /* ── Empty State ── */
        <View style={styles.contentWrapper}>
          <View style={styles.contentArea}>
            <Title style={styles.emptyTitle}>{isFreshStart ? 'Fresh start. What\u2019s on your mind?' : 'What\u2019s on your mind?'}</Title>
            <Body style={styles.emptySubtext}>
              Your recordings will show up here.
            </Body>
            <View style={styles.illustrationContainer}>
              <Image
                source={require('../assets/images/first-time-user-avatar.png')}
                style={styles.illustrationImage}
                resizeMode="contain"
              />
            </View>
          </View>
          {renderBottomSection()}
        </View>
      ) : (
        /* ── List State ── */
        <View style={styles.contentWrapper}>
          <View style={styles.contentArea}>
            {/* Mini Audio Player — shows when audio is playing from any screen */}
            {audio.playingRecordingId && (
              <View style={styles.miniPlayer}>
                <Pressable style={styles.miniPlayButton} onPress={audio.togglePlayback}>
                  <Icon name={audio.isPlaying ? 'pause' : 'play'} size={16} color="#FFFFFF" />
                </Pressable>
                <Body style={[styles.miniTimeText, { marginLeft: 12 }]}>
                  {formatTimeMs(audio.currentTime * 1000)}
                </Body>
                <Pressable
                  style={styles.miniProgressTrack}
                  onPress={handleMiniScrubberPress}
                  onLayout={(e) => { scrubberWidthRef.current = e.nativeEvent.layout.width }}
                >
                  <View
                    style={[
                      styles.miniProgressFill,
                      { width: `${audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0}%` },
                    ]}
                  />
                </Pressable>
                <Body style={styles.miniTimeText}>
                  {formatTimeMs(audio.duration * 1000)}
                </Body>
                <Pressable style={styles.miniSpeedPill} onPress={audio.cycleSpeed}>
                  <Body style={styles.miniSpeedText}>
                    {audio.playbackSpeed === 1 ? '1x' : audio.playbackSpeed === 0.5 ? '0.5x' : `${audio.playbackSpeed}x`}
                  </Body>
                </Pressable>
                <Pressable
                  style={styles.miniCloseButton}
                  onPress={closeMiniPlayer}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="x" size={20} color={themeLight.textSecondary} />
                </Pressable>
              </View>
            )}

            {/* Section Label */}
            <View style={styles.sectionLabelRow}>
              <Text style={styles.greetingWhisper}>{getGreeting()}</Text>
              <Text style={styles.sectionLabel}>Recordings</Text>
            </View>

            {/* Recording Cards */}
            <FlatList
              data={recordings}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isProcessing = item.status === 'processing'
                const isFailed = item.status === 'failed'
                const isNowPlaying = audio.playingRecordingId === item.id

                return (
                  <Pressable
                    style={[styles.card, isNowPlaying && styles.cardPlaying]}
                    onPress={() => handleRecordingPress(item)}
                  >
                    <View style={styles.cardHeader}>
                      {isProcessing ? (
                        <View style={styles.processingTitleRow}>
                          <PulsingDot />
                          <Body style={styles.cardTitleProcessing}>Processing...</Body>
                        </View>
                      ) : (
                        <Body style={styles.cardTitle} numberOfLines={2}>{item.title}</Body>
                      )}
                      <Pressable
                        style={styles.cardEllipsis}
                        onPress={(e) => {
                          e?.stopPropagation?.()
                          handleEllipsisPress(item.id)
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon name="dots-three-vertical" size={20} color={themeLight.textSecondary} />
                      </Pressable>
                    </View>
                    {isFailed ? (
                      <View style={styles.failedMetaRow}>
                        <Icon name="warning" size={16} color={themeLight.accent} />
                        <Body style={styles.cardMetaFailed}>Couldn't process {'\u2014'} tap to retry</Body>
                      </View>
                    ) : (
                      <Body style={styles.cardMeta}>
                        {format(item.createdAt, 'MMM d')} · {format(item.createdAt, 'h:mm a')} · {formatDuration(item.durationSec)}
                      </Body>
                    )}
                    {!isProcessing && (
                      <Pressable
                        style={[styles.replayButton, isNowPlaying && styles.replayButtonPlaying]}
                        onPress={(e) => {
                          e?.stopPropagation?.()
                          handleRecordingPress(item)
                        }}
                      >
                        {isNowPlaying ? (
                          <>
                            <Body style={styles.replayButtonText}>Playing</Body>
                            <EqualizerBars />
                          </>
                        ) : (
                          <>
                            <Body style={styles.replayButtonText}>View</Body>
                            <Icon name="arrow-right" size={12} color="#FFFFFF" />
                          </>
                        )}
                      </Pressable>
                    )}
                  </Pressable>
                )
              }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              contentContainerStyle={[
                styles.cardList,
                { paddingBottom: 140 + insets.bottom },
              ]}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              onMomentumScrollEnd={handleMomentumScrollEnd}
            />
          </View>
          {renderBottomSection()}
        </View>
      )}

      {/* Actions Sheet Modal */}
      {selectedRecording && (
        <RecordingActionsSheet
          isOpen={showActionsSheet}
          recordingTitle={selectedRecording.title}
          audioUri={selectedRecording.audioBlobUrl}
          onRename={handleRename}
          onDelete={() => handleDeleteRecording(selectedRecording.id)}
          onClose={() => {
            setShowActionsSheet(false)
            setSelectedRecordingId(null)
          }}
        />
      )}

      {/* Rename Modal */}
      {selectedRecording && (
        <RenameModal
          isOpen={showRenameModal}
          currentTitle={selectedRecording.title || format(selectedRecording.createdAt, 'MMM d, yyyy')}
          onSave={handleSaveRename}
          onClose={() => {
            setShowRenameModal(false)
            setSelectedRecordingId(null)
          }}
        />
      )}

      {/* Recording Modal */}
      <RecordingModal
        isOpen={showRecordingModal}
        onClose={() => {
          setShowRecordingModal(false)
          loadRecordings()
        }}
        onSave={handleSaveRecording}
        onPermissionDenied={() => {
          setMicPermissionMode('denied')
          setShowMicPermission(true)
        }}
      />

      {/* Mic Permission Sheet */}
      <MicPermissionSheet
        isOpen={showMicPermission}
        mode={micPermissionMode}
        onContinue={handleMicPermissionContinue}
        onClose={() => setShowMicPermission(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeLight.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ──
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    color: themeLight.textPrimary,
    textAlign: 'center',
  },

  // ── Shared Layout ──
  contentWrapper: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    backgroundColor: themeLight.bgSecondary,
  },

  // ── Empty State ──
  freshStartText: {
    fontSize: 22,
    textAlign: 'center',
    color: themeLight.accent,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 22,
    textAlign: 'center',
    color: themeLight.textPrimary,
    marginTop: 40,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    color: themeLight.textSecondary,
    marginTop: 8,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  illustrationContainer: {
    width: '100%',
    maxWidth: 240,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    alignSelf: 'center',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },

  // ── Bottom Overlay (shared) ──
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  gradientFade: {
    height: 80,
  },
  bottomInner: {
    backgroundColor: themeLight.bgPrimary,
    alignItems: 'center',
    paddingTop: 0,
  },
  hintText: {
    fontSize: 14,
    color: themeLight.textTertiary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  micOuterRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: themeLight.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: themeLight.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(196, 93, 62, 1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },

  // ── Section Label ──
  sectionLabelRow: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  greetingWhisper: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: themeLight.textSecondary,
    marginBottom: 12,
  },
  recordingsHeadingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  sectionLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: themeLight.textPrimary,
  },
  sectionCount: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 20,
    color: themeLight.textSecondary,
  },

  // ── Recording Cards ──
  cardList: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: 'rgba(44, 40, 38, 0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  cardPlaying: {
    borderLeftWidth: 3,
    borderLeftColor: themeLight.accent,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: themeLight.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  cardEllipsis: {
    padding: 8,
    borderRadius: 20,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    marginBottom: -8,
    marginRight: -8,
  },
  cardMeta: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: themeLight.textSecondary,
    marginTop: 2,
  },
  processingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  cardTitleProcessing: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    color: themeLight.textSecondary,
  },
  failedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  cardMetaFailed: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: themeLight.accent,
  },
  replayButton: {
    marginTop: 12,
    backgroundColor: themeLight.textPrimary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  replayButtonPlaying: {
    backgroundColor: themeLight.accent,
  },
  replayButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  // ── Mini Audio Player ──
  miniPlayer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: themeLight.borderSubtle,
    borderBottomWidth: 1,
    borderBottomColor: themeLight.borderSubtle,
  },
  miniPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeLight.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTimeText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: themeLight.textSecondary,
  },
  miniProgressTrack: {
    height: 3,
    backgroundColor: themeLight.border,
    borderRadius: 1.5,
    flex: 1,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: themeLight.accent,
    borderRadius: 1.5,
  },
  miniSpeedPill: {
    backgroundColor: themeLight.bgTertiary,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniSpeedText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: themeLight.textPrimary,
  },
  miniCloseButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Toast ──
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeLight.success,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    shadowColor: themeLight.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
  },

  // ── Deleted Toast ──
  deletedToast: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeLight.textPrimary,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  deletedToastText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#FFFFFF',
  },

  // Renamed toast
  renamedToast: {
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
  renamedToastText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#FFFFFF',
  },

  // Milestone toast
  milestoneToast: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeLight.textPrimary,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  milestoneToastText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#FFFFFF',
  },
})

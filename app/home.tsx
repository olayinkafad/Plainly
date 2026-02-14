import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, FlatList, Pressable, Alert, Image, Animated, LayoutAnimation, Platform, UIManager } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Audio } from 'expo-av'
import Icon from '../components/Icon'
import { format } from 'date-fns'
import { Title, Body, Meta } from '../components/typography'
import { recordingsStore, Recording } from '../store/recordings'
import RecordingActionsSheet from '../components/RecordingActionsSheet'
import RecordingModal from '../components/RecordingModal'
import RenameModal from '../components/RenameModal'
import MicPermissionSheet from '../components/MicPermissionSheet'
import { themeLight } from '../constants/theme'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export default function Home() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ startRecording?: string }>()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null)
  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showRecordingModal, setShowRecordingModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showMicPermission, setShowMicPermission] = useState(false)
  const toastAnim = useRef(new Animated.Value(0)).current

  // ── Mini Player State ──
  const SPEED_OPTIONS = [1, 1.5, 2, 0.5] as const
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null)
  const [miniPlayerSound, setMiniPlayerSound] = useState<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false)
  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrubberWidthRef = useRef(200)

  useEffect(() => {
    loadRecordings()
  }, [])

  // Auto-open recording modal if coming from onboarding
  useEffect(() => {
    if (params.startRecording === 'true') {
      setShowRecordingModal(true)
    }
  }, [params.startRecording])

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (miniPlayerSound) {
        miniPlayerSound.unloadAsync().catch(console.error)
      }
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current)
      }
    }
  }, [miniPlayerSound])

  const loadRecordings = async () => {
    try {
      const allRecordings = await recordingsStore.getAll()
      setRecordings(allRecordings)
    } catch (error) {
      console.error('Failed to load recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecord = async () => {
    // Close mini player if open
    if (miniPlayerVisible) {
      closeMiniPlayer()
    }
    const { status } = await Audio.getPermissionsAsync()
    if (status === 'undetermined') {
      setShowMicPermission(true)
      return
    }
    setShowRecordingModal(true)
  }

  const handleMicPermissionContinue = async () => {
    setShowMicPermission(false)
    const { status } = await Audio.requestPermissionsAsync()
    if (status === 'granted') {
      setShowRecordingModal(true)
    }
  }

  const handleSaveRecording = async (recording: Recording, showToast: boolean = true) => {
    try {
      await recordingsStore.add(recording)
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

  const handleRecordingPress = (id: string) => {
    router.push(`/recordings/${id}`)
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

  const handleSaveRename = async (newTitle: string) => {
    if (!selectedRecordingId) return
    try {
      await recordingsStore.update(selectedRecordingId, { title: newTitle })
      await loadRecordings()
      setShowRenameModal(false)
      setSelectedRecordingId(null)
    } catch (error) {
      console.error('Failed to rename recording:', error)
      Alert.alert('Error', 'Failed to rename recording')
    }
  }

  const handleDeleteRecording = async (id: string) => {
    try {
      // Close mini player if this recording is playing
      if (playingRecordingId === id) {
        closeMiniPlayer()
      }
      await recordingsStore.delete(id)
      await loadRecordings()
      setShowActionsSheet(false)
      setSelectedRecordingId(null)
    } catch (error) {
      console.error('Failed to delete recording:', error)
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

  const loadAndPlayRecording = async (rec: Recording) => {
    // If same recording, just toggle
    if (playingRecordingId === rec.id && miniPlayerSound) {
      togglePlayback()
      return
    }

    // Unload previous
    if (miniPlayerSound) {
      try {
        await miniPlayerSound.stopAsync()
        await miniPlayerSound.unloadAsync()
      } catch (e) {
        // Ignore
      }
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current)
        positionIntervalRef.current = null
      }
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      })

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: rec.audioBlobUrl },
        { shouldPlay: true }
      )

      const status = await newSound.getStatusAsync()
      if (status.isLoaded) {
        setPlaybackDuration(status.durationMillis || rec.durationSec * 1000)
      }

      newSound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded) {
          setPlaybackPosition(s.positionMillis || 0)
          if (s.didJustFinish) {
            setIsPlaying(false)
            setPlaybackPosition(0)
            newSound.setPositionAsync(0).catch(console.error)
            if (positionIntervalRef.current) {
              clearInterval(positionIntervalRef.current)
              positionIntervalRef.current = null
            }
          }
        }
      })

      setMiniPlayerSound(newSound)
      setPlayingRecordingId(rec.id)
      setIsPlaying(true)
      setPlaybackPosition(0)
      setPlaybackSpeed(1)

      if (!miniPlayerVisible) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setMiniPlayerVisible(true)
      }

      // Position polling
      positionIntervalRef.current = setInterval(async () => {
        try {
          const currentStatus = await newSound.getStatusAsync()
          if (currentStatus.isLoaded) {
            setPlaybackPosition(currentStatus.positionMillis || 0)
          }
        } catch (e) {
          // Ignore
        }
      }, 100)
    } catch (error) {
      console.error('Failed to load audio:', error)
    }
  }

  const togglePlayback = async () => {
    if (!miniPlayerSound) return
    try {
      if (isPlaying) {
        await miniPlayerSound.pauseAsync()
        setIsPlaying(false)
        if (positionIntervalRef.current) {
          clearInterval(positionIntervalRef.current)
          positionIntervalRef.current = null
        }
      } else {
        const status = await miniPlayerSound.getStatusAsync()
        if (status.isLoaded) {
          const pos = status.positionMillis || 0
          const dur = status.durationMillis || playbackDuration
          if (pos >= dur - 100) {
            await miniPlayerSound.setPositionAsync(0)
            setPlaybackPosition(0)
          }
        }
        await miniPlayerSound.playAsync()
        setIsPlaying(true)
        if (!positionIntervalRef.current) {
          positionIntervalRef.current = setInterval(async () => {
            try {
              const s = await miniPlayerSound.getStatusAsync()
              if (s.isLoaded) {
                setPlaybackPosition(s.positionMillis || 0)
              }
            } catch (e) {
              // Ignore
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error)
    }
  }

  const handleScrubberPress = async (event: any) => {
    if (!miniPlayerSound) return
    try {
      const { locationX } = event.nativeEvent
      const pct = locationX / scrubberWidthRef.current
      const newPos = pct * playbackDuration
      await miniPlayerSound.setPositionAsync(Math.max(0, Math.min(newPos, playbackDuration)))
      setPlaybackPosition(Math.max(0, Math.min(newPos, playbackDuration)))
    } catch (error) {
      console.error('Failed to scrub:', error)
    }
  }

  const cycleSpeed = async () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed as typeof SPEED_OPTIONS[number])
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length
    const nextSpeed = SPEED_OPTIONS[nextIndex]
    setPlaybackSpeed(nextSpeed)
    if (miniPlayerSound) {
      try {
        await miniPlayerSound.setRateAsync(nextSpeed, true)
      } catch (e) {
        // Ignore
      }
    }
  }

  const closeMiniPlayer = async () => {
    if (miniPlayerSound) {
      try {
        await miniPlayerSound.stopAsync()
        await miniPlayerSound.unloadAsync()
      } catch (e) {
        // Ignore
      }
    }
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current)
      positionIntervalRef.current = null
    }
    setMiniPlayerSound(null)
    setPlayingRecordingId(null)
    setIsPlaying(false)
    setPlaybackPosition(0)
    setPlaybackDuration(0)
    setPlaybackSpeed(1)
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setMiniPlayerVisible(false)
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
          <View style={styles.micOuterRing}>
            <View style={styles.micButton}>
              <Icon name="microphone" size={28} color="#FFFFFF" />
            </View>
          </View>
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

      {/* Header */}
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Plainly</Title>
      </View>

      {recordings.length === 0 ? (
        /* ── Empty State ── */
        <View style={styles.contentWrapper}>
          <View style={styles.contentArea}>
            <Title style={styles.emptyTitle}>What's on your mind?</Title>
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
            {/* Mini Audio Player */}
            {miniPlayerVisible && (
              <View style={styles.miniPlayer}>
                <Pressable style={styles.miniPlayButton} onPress={togglePlayback}>
                  <Icon name={isPlaying ? 'pause' : 'play'} size={16} color="#FFFFFF" />
                </Pressable>
                <Body style={[styles.miniTimeText, { marginLeft: 12 }]}>
                  {formatTimeMs(playbackPosition)}
                </Body>
                <Pressable
                  style={styles.miniProgressTrack}
                  onPress={handleScrubberPress}
                  onLayout={(e) => { scrubberWidthRef.current = e.nativeEvent.layout.width }}
                >
                  <View
                    style={[
                      styles.miniProgressFill,
                      { width: `${playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%` },
                    ]}
                  />
                </Pressable>
                <Body style={styles.miniTimeText}>
                  {formatTimeMs(playbackDuration)}
                </Body>
                <Pressable style={styles.miniSpeedPill} onPress={cycleSpeed}>
                  <Body style={styles.miniSpeedText}>
                    {playbackSpeed === 1 ? '1x' : playbackSpeed === 0.5 ? '0.5x' : `${playbackSpeed}x`}
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
              <Body style={styles.sectionLabel}>Recordings </Body>
              <Body style={styles.sectionCount}>({recordings.length})</Body>
            </View>

            {/* Recording Cards */}
            <FlatList
              data={recordings}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.card}
                  onPress={() => handleRecordingPress(item.id)}
                >
                  <View style={styles.cardHeader}>
                    <Body style={styles.cardTitle} numberOfLines={2}>{item.title}</Body>
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
                  <Body style={styles.cardMeta}>
                    {format(item.createdAt, 'MMM d')} · {format(item.createdAt, 'h:mm a')} · {formatDuration(item.durationSec)}
                  </Body>
                  <Pressable
                    style={styles.replayButton}
                    onPress={(e) => {
                      e?.stopPropagation?.()
                      loadAndPlayRecording(item)
                    }}
                  >
                    <Body style={styles.replayButtonText}>
                      {playingRecordingId === item.id && isPlaying ? 'Pause' : 'Play'}
                    </Body>
                    <Icon
                      name={playingRecordingId === item.id && isPlaying ? 'pause' : 'play'}
                      size={12}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              contentContainerStyle={[
                styles.cardList,
                { paddingBottom: 140 + insets.bottom },
              ]}
              showsVerticalScrollIndicator={false}
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
      />

      {/* Mic Permission Sheet */}
      <MicPermissionSheet
        isOpen={showMicPermission}
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
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 12,
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
})

import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, FlatList, Pressable, Alert, Image, Animated, AccessibilityInfo } from 'react-native'
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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Pulse ring animations (list state)
  const ring1Anim = useRef(new Animated.Value(0)).current
  const ring2Anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    loadRecordings()
  }, [])

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setPrefersReducedMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setPrefersReducedMotion)
    return () => subscription.remove()
  }, [])

  // Pulse ring animation (only used in list state bottom)
  useEffect(() => {
    if (prefersReducedMotion) {
      ring1Anim.setValue(0)
      ring2Anim.setValue(0)
      return
    }

    const createRingAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    }

    ring1Anim.setValue(0)
    ring2Anim.setValue(0)

    const ring1Animation = createRingAnimation(ring1Anim, 0)
    const ring2Animation = createRingAnimation(ring2Anim, 700)

    ring1Animation.start()
    ring2Animation.start()

    return () => {
      ring1Animation.stop()
      ring2Animation.stop()
    }
  }, [prefersReducedMotion, ring1Anim, ring2Anim])

  const ring1Scale = ring1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  })

  const ring1Opacity = ring1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0],
  })

  const ring2Scale = ring2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  })

  const ring2Opacity = ring2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0],
  })

  // Auto-open recording modal if coming from onboarding
  useEffect(() => {
    if (params.startRecording === 'true') {
      setShowRecordingModal(true)
    }
  }, [params.startRecording])

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

  const handleProcessingComplete = (recordingId: string) => {
    router.push({
      pathname: '/generating',
      params: { recordingId, format: 'summary' },
    })
  }

  const handleUpload = () => {
    // TODO: Implement upload
    Alert.alert('Upload', 'Upload coming soon')
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
    setShowRenameModal(true)
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
        <View style={styles.emptyWrapper}>
          {/* bg-secondary content area — fills remaining height */}
          <View style={styles.emptyContentArea}>
            <Title style={styles.emptyTitle}>What's on your mind?</Title>
            <Body style={styles.emptySubtext}>
              Your recordings will show up here.
            </Body>

            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <Image
                source={require('../assets/images/first-time-user-avatar.png')}
                style={styles.illustrationImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Bottom overlay — gradient fade + hint + mic */}
          <View
            style={styles.emptyBottom}
            pointerEvents="box-none"
          >
            <LinearGradient
              colors={['rgba(253, 252, 251, 0)', themeLight.bgPrimary]}
              style={styles.gradientFade}
            />
            <View style={[styles.emptyBottomInner, { paddingBottom: insets.bottom + 28 }]} pointerEvents="auto">
              <Body style={styles.hintText}>Tap the microphone to record</Body>
              <Pressable
                onPress={handleRecord}
                accessibilityLabel="Record your first voice note"
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
        </View>
      ) : (
        /* ── Recordings List State ── */
        <>
          <View style={styles.listWrapper}>
            <Title style={styles.sectionTitle}>
              {recordings.length === 1
                ? 'Your recording (1)'
                : `Your recordings (${recordings.length})`}
            </Title>
            <FlatList
              data={recordings}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.recordingRow}>
                  <Pressable
                    style={styles.recordingRowContent}
                    onPress={() => handleRecordingPress(item.id)}
                  >
                    <View style={styles.recordingContent}>
                      <Title style={styles.recordingTitle}>{item.title}</Title>
                      <Meta style={styles.recordingMeta}>
                        {format(item.createdAt, 'MMM d · h:mm a')} · {formatDuration(item.durationSec)}
                      </Meta>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.ellipsisButton}
                    onPress={(e) => {
                      e?.stopPropagation?.()
                      handleEllipsisPress(item.id)
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="dots-three-vertical" size={20} color={themeLight.textSecondary} />
                  </Pressable>
                </View>
              )}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: 120 + insets.bottom },
              ]}
            />
          </View>

          {/* List state bottom — pulse ring mic */}
          <SafeAreaView edges={['bottom']} style={styles.bottomActionAreaContainer}>
            <View style={[styles.bottomActionArea, { paddingBottom: insets.bottom + 16, paddingTop: 16 }]}>
              <Pressable
                style={styles.ctaContainer}
                onPress={handleRecord}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                accessibilityLabel="Record your voice note"
                accessibilityRole="button"
              >
                <View style={styles.labelCard}>
                  <Body style={styles.labelText}>Record your voice note</Body>
                </View>
                <View style={styles.pulseContainer}>
                  {!prefersReducedMotion && (
                    <>
                      <Animated.View
                        style={[
                          styles.pulseRing,
                          {
                            transform: [{ scale: ring1Scale }],
                            opacity: ring1Opacity,
                          },
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.pulseRing,
                          {
                            transform: [{ scale: ring2Scale }],
                            opacity: ring2Opacity,
                          },
                        ]}
                      />
                    </>
                  )}
                  <View style={styles.solidCircle}>
                    <Icon name="microphone" size={28} color="#FFFFFF" />
                  </View>
                </View>
              </Pressable>
            </View>
          </SafeAreaView>
        </>
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
        onClose={() => setShowRecordingModal(false)}
        onSave={handleSaveRecording}
        onFormatSelect={handleProcessingComplete}
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
    paddingTop: 16, // --space-4
    paddingBottom: 12, // --space-3
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24, // --font-size-xl
    color: themeLight.textPrimary,
    textAlign: 'center',
  },

  // ── Empty State ──
  emptyWrapper: {
    flex: 1,
  },
  emptyContentArea: {
    flex: 1,
    backgroundColor: themeLight.bgSecondary,
    alignItems: 'center',
    paddingHorizontal: 24, // --space-6
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
    marginTop: 8, // --space-2
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  illustrationContainer: {
    width: '100%',
    maxWidth: 240,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32, // --space-8
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },

  // ── Empty State Bottom Overlay ──
  emptyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  gradientFade: {
    height: 80,
  },
  emptyBottomInner: {
    backgroundColor: themeLight.bgPrimary,
    alignItems: 'center',
    paddingTop: 0,
  },
  hintText: {
    fontSize: 14, // --font-size-sm
    color: themeLight.textTertiary,
    textAlign: 'center',
    marginBottom: 16, // --space-4
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

  // ── List State ──
  listWrapper: {
    flex: 1,
    paddingHorizontal: 16, // --space-4
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    marginBottom: 16, // --space-4
    color: themeLight.textPrimary,
  },
  listContent: {
    paddingBottom: 16,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: themeLight.border,
  },
  recordingRowContent: {
    flex: 1,
    paddingVertical: 16, // --space-4
  },
  recordingContent: {
    flex: 1,
    marginRight: 12, // --space-3
  },
  recordingTitle: {
    fontSize: 16,
    marginBottom: 4,
    color: themeLight.textPrimary,
  },
  recordingMeta: {
    color: themeLight.textSecondary,
  },
  ellipsisButton: {
    padding: 8, // --space-2
    borderRadius: 20,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── List State Bottom (pulse rings) ──
  bottomActionAreaContainer: {
    backgroundColor: themeLight.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: themeLight.border,
  },
  bottomActionArea: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 16, // --space-4
    alignItems: 'center',
  },
  ctaContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16, // --space-4
    width: '100%',
    minHeight: 120,
  },
  pulseContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: themeLight.accent,
  },
  solidCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: themeLight.accent,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  labelCard: {
    backgroundColor: themeLight.bgSecondary,
    paddingHorizontal: 16, // --space-4
    paddingVertical: 12, // --space-3
    borderRadius: 10, // --radius-md
    borderWidth: 1,
    borderColor: themeLight.border,
    shadowColor: themeLight.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  labelText: {
    color: themeLight.textPrimary,
    fontSize: 14, // --font-size-sm
    fontWeight: '500',
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
    paddingHorizontal: 16, // --space-4
    paddingVertical: 12, // --space-3
    borderRadius: 10, // --radius-md
    gap: 8, // --space-2
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

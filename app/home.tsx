import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, FlatList, Pressable, Alert, Image, Animated, AccessibilityInfo } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { format } from 'date-fns'
import { Title, Body, Meta } from '../components/typography'
import { recordingsStore, Recording } from '../store/recordings'
import { OutputType } from '../types'
import RecordingActionsSheet from '../components/RecordingActionsSheet'
import RecordingModal from '../components/RecordingModal'
import FormatSelectionModal from '../components/FormatSelectionModal'
import RenameModal from '../components/RenameModal'

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
  const [showFormatSelection, setShowFormatSelection] = useState(false)
  const [formatSelectionRecordingId, setFormatSelectionRecordingId] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const toastAnim = useRef(new Animated.Value(0)).current
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  
  // Pulse ring animations
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

  // Pulse ring animation
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

    // Reset values before starting
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

  const handleRecord = () => {
    setShowRecordingModal(true)
  }

  const handleSaveRecording = async (recording: Recording, showToast: boolean = true) => {
    try {
      await recordingsStore.add(recording)
      await loadRecordings()
      // Show toast notification only if requested
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

    // Auto-hide after 3 seconds
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

  const handleFormatSelect = (recordingId: string) => {
    setFormatSelectionRecordingId(recordingId)
    setShowFormatSelection(true)
  }

  const handleGenerate = (recordingId: string, format: OutputType) => {
    // Close format selection modal
    setShowFormatSelection(false)
    setFormatSelectionRecordingId(null)
    
    // Navigate to generating screen
    router.push({
      pathname: '/generating',
      params: { recordingId, format },
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

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Title style={styles.logo}>Plainly</Title>
        </View>

        {recordings.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyContent}>
              <Title style={styles.emptyTitle}>What's on your mind?</Title>
              <Body style={styles.emptySubtext}>
                Record your voice notes and Plainly will turn them into summaries, action items and transcripts.
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
          </View>
        ) : (
          /* Recordings List State */
          <View style={styles.listContainer}>
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
                    <Icon name="dots-three-vertical" size={20} color="#6B7280" />
                  </Pressable>
                </View>
              )}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: 120 + insets.bottom }, // Space for bottom buttons
              ]}
            />
          </View>
        )}
      </View>

      {/* Persistent Bottom Action Area */}
      <SafeAreaView edges={['bottom']} style={styles.bottomActionAreaContainer}>
        <View style={[styles.bottomActionArea, { paddingBottom: insets.bottom + 16, paddingTop: 16 }]}>
          <Pressable
            style={styles.ctaContainer}
            onPress={handleRecord}
            accessibilityLabel={recordings.length === 0 ? "Record your first voice note" : "Record your voice note"}
            accessibilityRole="button"
          >
            {/* Label card - at the top */}
            <View style={styles.labelCard}>
              <Body style={styles.labelText}>
                {recordings.length === 0 ? 'Record your first voice note' : 'Record your voice note'}
              </Body>
            </View>
            {/* Pulse rings */}
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
              {/* Solid circle */}
              <View style={styles.solidCircle}>
                <Icon name="microphone" size={28} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>

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
        onFormatSelect={handleFormatSelect}
      />

      {/* Format Selection Modal */}
      {formatSelectionRecordingId && showFormatSelection && (
        <FormatSelectionModal
          isOpen={showFormatSelection}
          recordingId={formatSelectionRecordingId}
          onClose={() => {
            setShowFormatSelection(false)
            setFormatSelectionRecordingId(null)
          }}
          onGenerate={handleGenerate}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16, // --space-4
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    paddingTop: 24, // --space-6
    paddingBottom: 16, // --space-4
  },
  logo: {
    fontSize: 20,
    color: '#111827', // --color-text-primary
    marginBottom: 8, // --space-2
  },
  // Empty State
  emptyState: {
    flex: 1,
    marginTop: 32,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 12, // --space-3
    color: '#111827', // --color-text-primary
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#6B7280', // --color-text-secondary
    marginBottom: 12,
  },
  illustrationContainer: {
    width: '100%',
    maxWidth: 200,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  bottomActionAreaContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9', // --color-border-subtle
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
    backgroundColor: '#2563EB', // --color-accent-primary
  },
  solidCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB', // --color-accent-primary
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  labelCard: {
    backgroundColor: '#F9FAFB', // --color-bg-secondary
    paddingHorizontal: 16, // --space-4
    paddingVertical: 12, // --space-3
    borderRadius: 10, // --radius-md
    borderWidth: 1,
    borderColor: '#E5E7EB', // --color-border-default
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  labelText: {
    color: '#111827', // --color-text-primary
    fontSize: 14, // --font-size-sm
    fontWeight: '500', // --font-weight-medium
  },
  // Recordings List State
  listContainer: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 16, // --space-4
    color: '#111827', // --color-text-primary
  },
  listContent: {
    paddingBottom: 16,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // --color-border-subtle
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
    color: '#111827', // --color-text-primary
  },
  recordingMeta: {
    color: '#6B7280', // --color-text-secondary
  },
  ellipsisButton: {
    padding: 8, // --space-2
    borderRadius: 20,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    backgroundColor: '#16A34A', // --color-success
    paddingHorizontal: 16, // --space-4
    paddingVertical: 12, // --space-3
    borderRadius: 10, // --radius-md
    gap: 8, // --space-2
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
  },
})

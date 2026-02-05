import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, FlatList, Pressable, Alert, Image, Animated } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { format } from 'date-fns'
import Button from '../components/Button'
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

  useEffect(() => {
    loadRecordings()
  }, [])

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

  const handleDownloadAudio = (audioBlobUrl: string) => {
    // TODO: Implement download
    console.log('Download audio:', audioBlobUrl)
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
                Record your thoughts and Plainly will turn it into something clear and useful.
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
            <Title style={styles.sectionTitle}>Recordings</Title>
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
          <Button variant="primary" fullWidth onPress={handleRecord}>
            <View style={styles.buttonContent}>
              <Icon name="microphone" size={20} color="#FFFFFF" />
              <Body style={[styles.buttonTextPrimary, styles.buttonTextWithIcon]}>Record a thought</Body>
            </View>
          </Button>
          {/* Upload button hidden for MVP - will be added in later iterations */}
          {/* <View style={styles.buttonSpacing} />
          <Button variant="secondary" fullWidth onPress={handleUpload}>
            <View style={styles.buttonContent}>
              <Icon name="upload" size={20} color="#111827" />
              <Body style={[styles.buttonTextSecondary, styles.buttonTextWithIcon]}>Upload (MP3, M4A, WAV)</Body>
            </View>
          </Button> */}
        </View>
      </SafeAreaView>

          {/* Actions Sheet Modal */}
          {selectedRecording && (
            <RecordingActionsSheet
              isOpen={showActionsSheet}
              recordingTitle={selectedRecording.title}
              audioUri={selectedRecording.audioBlobUrl}
              onRename={handleRename}
              onDownload={() => handleDownloadAudio(selectedRecording.audioBlobUrl)}
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
    justifyContent: 'space-between',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 12, // --space-3
    color: '#111827', // --color-text-primary
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#6B7280', // --color-text-secondary
    marginBottom: 40,
  },
  illustrationContainer: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
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
  },
  bottomCTA: {
    width: '100%',
    paddingTop: 24, // --space-6
  },
  buttonSpacing: {
    height: 12, // --space-3
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextWithIcon: {
    marginLeft: 8, // --space-2
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Satoshi-Medium',
  },
  buttonTextSecondary: {
    color: '#111827', // --color-text-primary
    fontSize: 16,
    fontFamily: 'Satoshi-Medium',
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

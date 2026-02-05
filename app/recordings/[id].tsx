import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, Pressable, Share, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../../components/Icon'
import { format } from 'date-fns'
import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system'
import { Title, Body, Meta } from '../../components/typography'
import { recordingsStore, Recording } from '../../store/recordings'
import { OutputType } from '../../types'
import AudioPlayer from '../../components/AudioPlayer'
import RecordingActionsSheet from '../../components/RecordingActionsSheet'
import FormatPickerSheet from '../../components/FormatPickerSheet'
import RenameModal from '../../components/RenameModal'
import { generateRecordingTitle } from '../../lib/api'

const formatOptions: { key: OutputType; title: string }[] = [
  { key: 'summary', title: 'Summary' },
  { key: 'action_items', title: 'Action items' },
  { key: 'key_points', title: 'Key points' },
  { key: 'transcript', title: 'Transcript' },
]

export default function RecordingDetail() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [recording, setRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFormat, setActiveFormat] = useState<OutputType | null>(null)
  const [intendedFormat, setIntendedFormat] = useState<OutputType | null>(null)
  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const [showFormatPicker, setShowFormatPicker] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const hasAutoTitledRef = useRef(false)

  useEffect(() => {
    loadRecording()
    setIsGenerating(false) // Reset generating state when component mounts/remounts
    hasAutoTitledRef.current = false // Reset when recording changes
  }, [id])

  // Also check for auto-title when recording outputs change
  useEffect(() => {
    if (
      recording &&
      !hasAutoTitledRef.current &&
      recording.title === 'Recording' &&
      (recording.outputs.transcript || recording.outputs.summary)
    ) {
      hasAutoTitledRef.current = true
      generateAutoTitle(recording).catch((error) => {
        console.error('Auto-title generation failed:', error)
      })
    }
  }, [recording?.outputs?.transcript, recording?.outputs?.summary, recording?.id])

  const loadRecording = async () => {
    if (!id) return
    try {
      const loadedRecording = await recordingsStore.getById(id)
      if (loadedRecording) {
        setRecording(loadedRecording)
        
        // Determine intended format (the one the user originally selected)
        const lastViewed = loadedRecording.lastViewedFormat
        if (lastViewed) {
          setIntendedFormat(lastViewed)
          setActiveFormat(lastViewed)
        } else {
          // Fallback: use first available format or default to summary
          const availableFormats = getAvailableFormats(loadedRecording)
          if (availableFormats.length > 0) {
            setIntendedFormat(availableFormats[0])
            setActiveFormat(availableFormats[0])
          } else {
            setIntendedFormat('summary')
            setActiveFormat('summary')
          }
        }

        // Auto-generate title if needed (only once per recording)
        const hasOutputs = loadedRecording.outputs.transcript || loadedRecording.outputs.summary
        const shouldGenerate = !hasAutoTitledRef.current && 
                               loadedRecording.title === 'Recording' && 
                               hasOutputs
        
        console.log('Auto-title check:', {
          hasAutoTitled: hasAutoTitledRef.current,
          currentTitle: loadedRecording.title,
          hasOutputs,
          shouldGenerate
        })
        
        if (shouldGenerate) {
          hasAutoTitledRef.current = true
          // Run in background without blocking
          generateAutoTitle(loadedRecording).catch((error) => {
            console.error('Auto-title generation failed:', error)
          })
        }
      } else {
        setRecording(null)
      }
    } catch (error) {
      console.error('Failed to load recording:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAutoTitle = async (rec: Recording) => {
    try {
      // Prefer summary, fallback to transcript
      const summary = rec.outputs.summary
      const transcript = rec.outputs.transcript

      if (!summary && !transcript) {
        console.log('No content available for title generation')
        return
      }

      console.log('Generating auto-title for recording:', rec.id)
      const generatedTitle = await generateRecordingTitle(transcript, summary)
      console.log('Generated title:', generatedTitle)

      // Only update if title is still "Recording" (user hasn't renamed it)
      if (generatedTitle && generatedTitle !== 'Recording') {
        const currentRecording = await recordingsStore.getById(rec.id)
        if (currentRecording && currentRecording.title === 'Recording') {
          console.log('Updating recording title to:', generatedTitle)
          await recordingsStore.update(rec.id, { title: generatedTitle })
          // Update local state to reflect new title
          setRecording({ ...currentRecording, title: generatedTitle })
        } else {
          console.log('Title was already changed, not updating')
        }
      }
    } catch (error) {
      // Silently fail - keep "Recording" as title
      console.error('Failed to auto-generate title:', error)
    }
  }

  // Get ALL formats that have been generated (exist in outputs)
  // Also includes lastViewedFormat even if it has no output (to show empty state)
  // Returns formats with the most recently generated format first
  const getAvailableFormats = (rec: Recording): OutputType[] => {
    const formats: OutputType[] = []
    const otherFormats: OutputType[] = []
    const hasOutputs = new Set<OutputType>()
    
    // Get the most recently viewed/generated format (should be first)
    const lastViewed = rec.lastViewedFormat
    
    // Add all formats that have outputs (preserve all previously generated formats)
    formatOptions.forEach((option) => {
      if (rec.outputs[option.key]) {
        hasOutputs.add(option.key)
        // Put the last viewed format first, others after
        if (option.key === lastViewed) {
          formats.push(option.key)
        } else {
          otherFormats.push(option.key)
        }
      }
    })
    
    // If lastViewed exists but doesn't have output, add it first to show empty state
    if (lastViewed && !hasOutputs.has(lastViewed) && !formats.includes(lastViewed)) {
      formats.unshift(lastViewed)
    }
    
    // Combine: lastViewed first, then others
    const orderedFormats = [...formats, ...otherFormats]
    
    // If no formats have outputs yet, include the intended format
    if (orderedFormats.length === 0 && intendedFormat) {
      return [intendedFormat]
    }
    
    return orderedFormats
  }

  const formatRecordingTitle = (rec: Recording): string => {
    return rec.title || format(rec.createdAt, 'MMM d, yyyy')
  }

  const formatRecordingSubtitle = (rec: Recording): string => {
    const dateStr = format(rec.createdAt, 'MMM d, yyyy · h:mm a')
    const hours = Math.floor(rec.durationSec / 3600)
    const minutes = Math.floor((rec.durationSec % 3600) / 60)
    const secs = Math.floor(rec.durationSec % 60)
    let durationStr = ''
    if (hours > 0) {
      durationStr = `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      durationStr = `${minutes}:${secs.toString().padStart(2, '0')}`
    }
    return `${dateStr} · ${durationStr}`
  }

  const handleRename = () => {
    setShowActionsSheet(false)
    setShowRenameModal(true)
  }

  const handleSaveRename = async (newTitle: string) => {
    if (!recording) return
    try {
      await recordingsStore.update(recording.id, { title: newTitle })
      // Reload recording to update UI
      await loadRecording()
    } catch (error) {
      console.error('Failed to rename recording:', error)
      Alert.alert('Error', 'Failed to rename recording')
    }
  }

  // Helper function to get active format text
  const getActiveFormatText = (formatKey: OutputType, outputs: Recording['outputs']): string => {
    return outputs[formatKey] || ''
  }

  const handleCopy = async () => {
    if (!recording || !activeFormat) return
    
    const text = getActiveFormatText(activeFormat, recording.outputs)
    if (!text || !text.trim()) return

    try {
      await Clipboard.setStringAsync(text)
      Alert.alert('Copied', 'Text copied to clipboard')
    } catch (error) {
      console.error('Failed to copy:', error)
      Alert.alert('Error', 'Failed to copy text')
    }
  }

  const handleShare = async () => {
    if (!recording || !activeFormat) return
    
    const text = getActiveFormatText(activeFormat, recording.outputs)
    if (!text || !text.trim()) return

    try {
      const formatTitle = formatOptions.find(opt => opt.key === activeFormat)?.title || 'Content'
      await Share.share({
        message: text,
        title: `Plainly — ${formatTitle}`,
      })
    } catch (error) {
      console.error('Failed to share:', error)
    }
  }

  const handleDownload = async () => {
    if (!recording || !activeFormat) return
    
    const text = getActiveFormatText(activeFormat, recording.outputs)
    if (!text || !text.trim()) return

    try {
      const formatTitle = formatOptions.find(opt => opt.key === activeFormat)?.title || 'content'
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm')
      const filename = `plainly_${recording.id}_${activeFormat}_${timestamp}.txt`
      const fileUri = `${FileSystem.documentDirectory}${filename}`

      await FileSystem.writeAsStringAsync(fileUri, text, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      Alert.alert('Saved', 'File saved to Documents')
    } catch (error) {
      console.error('Failed to download:', error)
      Alert.alert('Error', 'Failed to save file')
    }
  }

  const getEmptyStateContent = (format: OutputType) => {
    const emptyStates = {
      summary: {
        title: 'No clear summary detected',
        body: "This recording didn't contain a clear topic or narrative to summarize.",
        suggestion: 'Try Key points or Transcript instead.',
      },
      action_items: {
        title: 'No action items found',
        body: "Plainly didn't detect any tasks, decisions, or next steps in this recording.",
        suggestion: 'Try Summary or Key points for reflective content.',
      },
      key_points: {
        title: 'Not enough distinct points',
        body: "This recording didn't contain multiple ideas to extract as key points.",
        suggestion: 'Summary or Transcript may be a better fit.',
      },
      transcript: {
        title: 'No speech detected',
        body: "Plainly couldn't detect clear speech in this recording.",
        suggestion: 'Try recording again in a quieter environment.',
      },
    }
    return emptyStates[format]
  }

  const handleFormatSwitch = (format: OutputType) => {
    if (format === activeFormat || !recording) return
    setActiveFormat(format)
    recordingsStore.update(recording.id, {
      lastViewedFormat: format,
    }).catch(console.error)
  }

  const handleAddFormat = (format: OutputType) => {
    if (!recording || isGenerating) return
    setIsGenerating(true)
    setShowFormatPicker(false)
    
    // Navigate to generating screen
    router.push({
      pathname: '/generating',
      params: { recordingId: recording.id, format },
    })
  }

  const handleDeleteRecording = async () => {
    if (!recording) return
    try {
      await recordingsStore.delete(recording.id)
      router.push('/home') // Navigate back to Home after delete
    } catch (error) {
      console.error('Failed to delete recording:', error)
    }
  }

  const handleDownloadAudio = () => {
    // TODO: Implement download
    console.log('Download audio:', recording?.audioBlobUrl)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Body>Loading...</Body>
        </View>
      </SafeAreaView>
    )
  }

  if (!recording || !activeFormat || !intendedFormat) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Body>Recording not found</Body>
        </View>
      </SafeAreaView>
    )
  }

  const output = recording.outputs[activeFormat]
  const availableFormats = getAvailableFormats(recording)
  const remainingFormats = formatOptions
    .map((opt) => opt.key)
    .filter((key) => !availableFormats.includes(key))

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable
          style={styles.navButton}
          onPress={() => router.push('/home')}
        >
          <Icon name="caret-left" size={24} color="#111827" />
        </Pressable>
        <View style={styles.navTitleContainer}>
          <Title style={styles.navTitle}>{formatRecordingTitle(recording)}</Title>
          <Meta style={styles.navSubtitle}>{formatRecordingSubtitle(recording)}</Meta>
        </View>
        <Pressable
          style={styles.navButton}
          onPress={() => setShowActionsSheet(true)}
        >
          <Icon name="dots-three-vertical" size={24} color="#111827" />
        </Pressable>
      </View>

      {/* Audio Player Section */}
      <AudioPlayer
        audioUri={recording.audioBlobUrl}
        durationSec={recording.durationSec}
      />

      {/* Format Switcher Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {availableFormats.map((formatKey) => {
            const option = formatOptions.find((opt) => opt.key === formatKey)
            if (!option) return null
            
            const isActive = activeFormat === formatKey
            return (
              <Pressable
                key={formatKey}
                style={[
                  styles.tab,
                  isActive && styles.tabActive,
                ]}
                onPress={() => handleFormatSwitch(formatKey)}
              >
                <Body 
                  style={[
                    styles.tabText,
                    isActive && styles.tabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {option.title}
                </Body>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* Content Area - Only this scrolls */}
      <View style={styles.contentWrapper}>
        {/* Action Buttons - Top Right */}
        {output && output.trim() && (
          <View style={styles.actionButtonsContainer}>
            <Pressable
              style={styles.actionButton}
              onPress={handleCopy}
            >
              <Icon name="copy" size={18} color="#6B7280" />
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Icon name="share" size={18} color="#6B7280" />
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={handleDownload}
            >
              <Icon name="download" size={18} color="#6B7280" />
            </Pressable>
          </View>
        )}

        <ScrollView
          style={styles.contentScrollView}
          contentContainerStyle={styles.contentScrollContent}
        >
          {output && output.trim() ? (
            <View style={styles.contentContainer}>
              <Body style={styles.outputText}>{output}</Body>
            </View>
          ) : (
          <View style={styles.emptyContentContainer}>
            {(() => {
              const emptyState = getEmptyStateContent(activeFormat)
              return (
                <>
                  <Title style={styles.emptyTitle}>{emptyState.title}</Title>
                  <Body style={styles.emptyBody}>{emptyState.body}</Body>
                  <Body style={styles.emptySuggestion}>{emptyState.suggestion}</Body>
                </>
              )
            })()}
          </View>
        )}
      </ScrollView>

      {/* "Generate new format" Button - Bottom Right of Screen */}
      {remainingFormats.length > 0 && (
        <Pressable
          style={[
            styles.addFormatButton,
            {
              bottom: insets.bottom + 16, // Safe area + padding
              right: 16, // --space-4
            },
            isGenerating && styles.addFormatButtonDisabled,
          ]}
          onPress={() => !isGenerating && setShowFormatPicker(true)}
          disabled={isGenerating}
        >
          <Icon name="plus" size={16} color={isGenerating ? '#9CA3AF' : '#2563EB'} />
          <Body style={[
            styles.addFormatText,
            isGenerating && styles.addFormatTextDisabled,
          ]}>
            Generate new format
          </Body>
        </Pressable>
      )}
      </View>

      {/* Actions Sheet */}
      {recording && (
        <RecordingActionsSheet
          isOpen={showActionsSheet}
          recordingTitle={formatRecordingTitle(recording)}
          audioUri={recording.audioBlobUrl}
          onRename={handleRename}
          onDownload={handleDownloadAudio}
          onDelete={handleDeleteRecording}
          onClose={() => setShowActionsSheet(false)}
        />
      )}

      {/* Format Picker Sheet */}
      <FormatPickerSheet
        isOpen={showFormatPicker}
        availableFormats={availableFormats}
        onSelect={handleAddFormat}
        onClose={() => setShowFormatPicker(false)}
      />

      {/* Rename Modal */}
      {recording && (
        <RenameModal
          isOpen={showRenameModal}
          currentTitle={recording.title || format(recording.createdAt, 'MMM d, yyyy')}
          onSave={handleSaveRename}
          onClose={() => setShowRenameModal(false)}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative', // For absolute positioning of floating button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // --space-4
    paddingTop: 8, // Small top padding for visual spacing
    paddingBottom: 12, // --space-3
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // --color-border-subtle
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12, // --space-3
  },
  navTitle: {
    fontSize: 16,
    color: '#111827', // --color-text-primary
    textAlign: 'center',
    marginBottom: 2,
  },
  navSubtitle: {
    fontSize: 12,
    color: '#6B7280', // --color-text-secondary
    textAlign: 'center',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // --color-border-subtle
    width: '100%',
  },
  tabsContent: {
    paddingHorizontal: 16, // --space-4
    paddingRight: 24, // Extra padding to prevent last tab from being cut off
    alignItems: 'center', // Align tabs vertically
  },
  tab: {
    paddingVertical: 12, // --space-3
    paddingHorizontal: 16, // --space-4
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8, // --space-2
    flexShrink: 0, // Prevent tabs from shrinking
    minWidth: 'auto', // Allow natural width
  },
  tabActive: {
    borderBottomColor: '#2563EB', // --color-accent-primary
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280', // --color-text-secondary
    fontFamily: 'Satoshi-Medium',
  },
  tabTextActive: {
    color: '#2563EB', // --color-accent-primary
  },
  addFormatButton: {
    position: 'absolute',
    bottom: 16, // --space-4
    right: 16, // --space-4
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // --space-2
    paddingHorizontal: 12, // --space-3
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB', // --color-border-default
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
  },
  addFormatButtonDisabled: {
    opacity: 0.5,
  },
  addFormatText: {
    fontSize: 13,
    color: '#2563EB', // --color-accent-primary
    fontFamily: 'Satoshi-Medium',
    marginLeft: 4, // --space-1
  },
  addFormatTextDisabled: {
    color: '#9CA3AF',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  actionButtonsContainer: {
    position: 'absolute',
    top: 16, // --space-4
    right: 16, // --space-4
    flexDirection: 'row',
    gap: 8, // --space-2
    zIndex: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentScrollView: {
    flex: 1,
  },
  contentScrollContent: {
    paddingBottom: 80, // Extra padding for floating button
    paddingTop: 60, // Space for action buttons
  },
  contentContainer: {
    paddingHorizontal: 16, // --space-4
    paddingTop: 24, // --space-6
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  outputText: {
    color: '#111827', // --color-text-primary
    fontSize: 16,
    lineHeight: 24,
  },
  emptyContentContainer: {
    paddingHorizontal: 16, // --space-4
    paddingTop: 48, // --space-12
    paddingBottom: 48, // --space-12
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#111827', // --color-text-primary
    textAlign: 'center',
    marginBottom: 12, // --space-3
  },
  emptyBody: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16, // --space-4
    paddingHorizontal: 16, // --space-4
  },
  emptySuggestion: {
    color: '#9CA3AF', // --color-text-tertiary
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16, // --space-4
  },
  addFormatButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, // --space-3
    paddingHorizontal: 16, // --space-4
    borderRadius: 9999, // Full pill shape
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB', // --color-border-default (secondary button style)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
    zIndex: 10, // Ensure button is above content
  },
  addFormatButtonDisabled: {
    opacity: 0.5,
  },
  addFormatText: {
    fontSize: 14,
    color: '#2563EB', // --color-accent-primary (blue)
    fontFamily: 'Satoshi-Medium',
    marginLeft: 6, // --space-1.5 (spacing between icon and text)
  },
  addFormatTextDisabled: {
    color: '#9CA3AF',
  },
})

import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, Pressable, Share, Alert, LayoutChangeEvent, Dimensions } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../../components/Icon'
import { format } from 'date-fns'
import * as Clipboard from 'expo-clipboard'
import { Title, Body, Meta } from '../../components/typography'
import { recordingsStore, Recording } from '../../store/recordings'
import { OutputType } from '../../types'
import AudioPlayer from '../../components/AudioPlayer'
import RecordingActionsSheet from '../../components/RecordingActionsSheet'
import RenameModal from '../../components/RenameModal'
import { generateRecordingTitle } from '../../lib/api'
import TranscriptDisplay from '../../components/TranscriptDisplay'
import SummaryDisplay from '../../components/SummaryDisplay'
import FormatActionSheet from '../../components/FormatActionSheet'
import { StructuredTranscript, TranscriptOutput, StructuredSummary, SummaryOutput } from '../../types'
import { themeLight } from '../../constants/theme'

const formatOptions: { key: OutputType; title: string }[] = [
  { key: 'summary', title: 'Summary' },
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
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showFormatActionSheet, setShowFormatActionSheet] = useState(false)
  const [formatActionType, setFormatActionType] = useState<'copy' | 'share' | null>(null)
  const hasAutoTitledRef = useRef(false)
  const tabsScrollViewRef = useRef<ScrollView>(null)
  const tabLayoutsRef = useRef<Map<OutputType, { x: number; width: number }>>(new Map())

  useEffect(() => {
    loadRecording()
    hasAutoTitledRef.current = false
  }, [id])

  const loadRecording = async () => {
    if (!id) return
    try {
      const loadedRecording = await recordingsStore.getById(id)
      if (loadedRecording) {
        setRecording(loadedRecording)

        const lastViewed = loadedRecording.lastViewedFormat
        if (lastViewed) {
          setIntendedFormat(lastViewed)
          setActiveFormat(lastViewed)
        } else {
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
        if (
          !hasAutoTitledRef.current &&
          loadedRecording.title === 'Recording' &&
          (loadedRecording.outputs.transcript || loadedRecording.outputs.summary)
        ) {
          hasAutoTitledRef.current = true
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
      let summary: string | undefined
      let transcript: string | undefined

      if (rec.outputs.summary) {
        if (typeof rec.outputs.summary === 'string') {
          summary = rec.outputs.summary
        } else {
          summary = rec.outputs.summary.one_line
        }
      }

      if (rec.outputs.transcript) {
        if (typeof rec.outputs.transcript === 'string') {
          transcript = rec.outputs.transcript
        } else {
          transcript = rec.outputs.transcript.segments.map(s => s.text).join(' ')
        }
      }

      if (!summary && !transcript) return

      const generatedTitle = await generateRecordingTitle(transcript, summary)

      if (generatedTitle && generatedTitle !== 'Recording') {
        const currentRecording = await recordingsStore.getById(rec.id)
        if (currentRecording && currentRecording.title === 'Recording') {
          await recordingsStore.update(rec.id, { title: generatedTitle })
          setRecording({ ...currentRecording, title: generatedTitle })
        }
      }
    } catch (error) {
      console.error('Failed to auto-generate title:', error)
    }
  }

  const getAvailableFormats = (rec: Recording): OutputType[] => {
    const formats: OutputType[] = []
    const otherFormats: OutputType[] = []
    const hasOutputs = new Set<OutputType>()

    const lastViewed = rec.lastViewedFormat

    formatOptions.forEach((option) => {
      if (rec.outputs[option.key]) {
        hasOutputs.add(option.key)
        if (option.key === lastViewed) {
          formats.push(option.key)
        } else {
          otherFormats.push(option.key)
        }
      }
    })

    if (lastViewed && !hasOutputs.has(lastViewed) && !formats.includes(lastViewed)) {
      formats.unshift(lastViewed)
    }

    const orderedFormats = [...formats, ...otherFormats]

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
    setTimeout(() => {
      setShowRenameModal(true)
    }, 50)
  }

  const handleSaveRename = async (newTitle: string) => {
    if (!recording) return
    try {
      await recordingsStore.update(recording.id, { title: newTitle })
      await loadRecording()
    } catch (error) {
      console.error('Failed to rename recording:', error)
      Alert.alert('Error', 'Failed to rename recording')
    }
  }

  const getActiveFormatText = (formatKey: OutputType, outputs: Recording['outputs']): string => {
    const output = outputs[formatKey]
    if (!output) return ''

    if (formatKey === 'transcript' && typeof output === 'object' && 'segments' in output) {
      const transcript = output as StructuredTranscript
      return transcript.segments.map((s: { speaker: string; text: string }) => `${s.speaker}: ${s.text}`).join('\n\n')
    }

    if (formatKey === 'summary' && typeof output === 'object' && 'one_line' in output) {
      const summary = output as StructuredSummary
      const parts = [summary.one_line]
      if (summary.key_takeaways.length > 0) {
        parts.push('\n\nKey takeaways:')
        parts.push(...summary.key_takeaways.map((t: string) => `• ${t}`))
      }
      if (summary.context) {
        parts.push(`\n\nContext: ${summary.context}`)
      }
      return parts.join('\n')
    }

    return typeof output === 'string' ? output : ''
  }

  const getStructuredTranscript = (output: TranscriptOutput | undefined): StructuredTranscript | null => {
    if (!output) return null
    if (typeof output === 'string') {
      try {
        const parsed = JSON.parse(output)
        if (parsed.format === 'transcript' && Array.isArray(parsed.segments)) {
          return parsed as StructuredTranscript
        }
      } catch {
        return null
      }
    }
    if (typeof output === 'object' && output.format === 'transcript') {
      return output as StructuredTranscript
    }
    return null
  }

  const getStructuredSummary = (output: SummaryOutput | undefined): StructuredSummary | null => {
    if (!output) return null
    if (typeof output === 'string') {
      try {
        const parsed = JSON.parse(output)
        if (parsed.format === 'summary' && parsed.one_line && Array.isArray(parsed.key_takeaways)) {
          return parsed as StructuredSummary
        }
      } catch {
        return null
      }
    }
    if (typeof output === 'object' && output.format === 'summary') {
      return output as StructuredSummary
    }
    return null
  }

  const handleCopy = () => {
    setFormatActionType('copy')
    setShowFormatActionSheet(true)
  }

  const handleCopyFormat = async (fmt: OutputType) => {
    if (!recording) return

    const text = getActiveFormatText(fmt, recording.outputs)
    if (!text || !text.trim()) return

    try {
      await Clipboard.setStringAsync(text)
      const formatTitle = formatOptions.find(opt => opt.key === fmt)?.title || 'content'
      Alert.alert('Copied', `Copy ${formatTitle.toLowerCase()}`)
    } catch (error) {
      console.error('Failed to copy:', error)
      Alert.alert('Error', 'Failed to copy text')
    }
  }

  const handleShare = () => {
    setFormatActionType('share')
    setShowFormatActionSheet(true)
  }

  const handleShareFormat = async (fmt: OutputType) => {
    if (!recording) return

    const text = getActiveFormatText(fmt, recording.outputs)
    if (!text || !text.trim()) return

    try {
      const formatTitle = formatOptions.find(opt => opt.key === fmt)?.title || 'Content'
      await Share.share({
        message: text,
        title: `Plainly — ${formatTitle}`,
      })
    } catch (error) {
      console.error('Failed to share:', error)
    }
  }

  const isFormatUnavailable = (fmt: OutputType, output: any): boolean => {
    if (!output) return true

    if (typeof output === 'string') {
      const failureIndicators = ['failed', 'error', 'unavailable', 'could not', 'unable to']
      const lowerOutput = output.toLowerCase()
      if (failureIndicators.some(indicator => lowerOutput.includes(indicator))) {
        return true
      }
      if (!output.trim() || output.trim().length === 0) {
        return true
      }
      return false
    }

    if (typeof output === 'object') {
      if (fmt === 'summary' && output.format === 'summary') {
        if (!output.one_line || !output.one_line.trim()) return true
        if (!Array.isArray(output.key_takeaways) || output.key_takeaways.length === 0) return true
        return false
      }

      if (fmt === 'transcript' && output.format === 'transcript') {
        if (!Array.isArray(output.segments) || output.segments.length === 0) return true
        if (output.segments.every((seg: any) => !seg.text || !seg.text.trim())) return true
        return false
      }
    }

    return false
  }

  const getEmptyStateContent = (fmt: OutputType, output?: any) => {
    const confidenceNotes = output && typeof output === 'object' && output.confidence_notes
      ? output.confidence_notes
      : null

    let bodyMessage = "This recording didn't include enough information."
    if (confidenceNotes) {
      if (confidenceNotes.possible_missed_words || confidenceNotes.noisy_audio_suspected) {
        bodyMessage = "Parts of the recording may have been hard to hear."
      } else if (confidenceNotes.mixed_language_detected) {
        bodyMessage = "Mixed languages can be harder to capture perfectly."
      }
    }

    const titles: Record<OutputType, string> = {
      summary: "Not enough to summarise",
      transcript: "We couldn't transcribe this clearly",
    }

    return {
      title: titles[fmt] || "We couldn't create this just yet",
      body: bodyMessage,
      suggestion: fmt === 'summary'
        ? 'Try viewing the Transcript instead.'
        : 'Try viewing the Summary instead.',
    }
  }

  const handleFormatSwitch = (fmt: OutputType) => {
    if (fmt === activeFormat || !recording) return
    setActiveFormat(fmt)
    recordingsStore.update(recording.id, {
      lastViewedFormat: fmt,
    }).catch(console.error)

    setTimeout(() => {
      const tabLayout = tabLayoutsRef.current.get(fmt)
      if (tabLayout && tabsScrollViewRef.current) {
        const { x, width } = tabLayout
        const screenWidth = Dimensions.get('window').width
        const scrollPosition = x - (screenWidth / 2) + (width / 2)
        tabsScrollViewRef.current.scrollTo({
          x: Math.max(0, scrollPosition),
          animated: true,
        })
      }
    }, 100)
  }

  const handleTabLayout = (fmt: OutputType) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout
    tabLayoutsRef.current.set(fmt, { x, width })
  }

  const handleDeleteRecording = async () => {
    if (!recording) return
    try {
      await recordingsStore.delete(recording.id)
      router.push('/home')
    } catch (error) {
      console.error('Failed to delete recording:', error)
    }
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
  const formatsWithOutputs = formatOptions
    .map((opt) => opt.key)
    .filter((key) => {
      const formatOutput = recording.outputs[key]
      return formatOutput && !isFormatUnavailable(key, formatOutput)
    })

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable
          style={styles.navButton}
          onPress={() => router.push('/home')}
        >
          <Icon name="caret-left" size={24} color={themeLight.textPrimary} />
        </Pressable>
        <View style={styles.navSpacer} />
        <View style={styles.navActionsContainer}>
          <Pressable
            style={styles.navActionButton}
            onPress={handleCopy}
          >
            <Icon name="copy" size={20} color={themeLight.textSecondary} />
          </Pressable>
          <Pressable
            style={styles.navActionButton}
            onPress={handleShare}
          >
            <Icon name="share" size={20} color={themeLight.textSecondary} />
          </Pressable>
        <Pressable
          style={styles.navButton}
          onPress={() => setShowActionsSheet(true)}
        >
          <Icon name="dots-three-vertical" size={24} color={themeLight.textPrimary} />
        </Pressable>
        </View>
      </View>

      {/* Title Container Section */}
      <View style={styles.titleContainer}>
        <Title style={styles.titleText}>{formatRecordingTitle(recording)}</Title>
        <Meta style={styles.subtitleText}>{formatRecordingSubtitle(recording)}</Meta>
      </View>

      {/* Audio Player Section */}
      <AudioPlayer
        audioUri={recording.audioBlobUrl}
        durationSec={recording.durationSec}
      />

      {/* Format Switcher Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          ref={tabsScrollViewRef}
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
                onLayout={handleTabLayout(formatKey)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={option.title}
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

      {/* Content Area */}
      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.contentScrollView}
          contentContainerStyle={styles.contentScrollContent}
        >
            {(() => {
            const isUnavailable = isFormatUnavailable(activeFormat, output)

            if (isUnavailable) {
              const emptyState = getEmptyStateContent(activeFormat, output)
              return (
                <View style={styles.emptyContentContainer}>
                  <Title style={styles.emptyTitle}>{emptyState.title}</Title>
                  <Body style={styles.emptyBody}>{emptyState.body}</Body>
                  <Body style={styles.emptySuggestion}>{emptyState.suggestion}</Body>
                </View>
              )
            }

            return (
              <View style={styles.contentContainer}>
                {activeFormat === 'transcript' ? (
                  (() => {
                    const structuredTranscript = getStructuredTranscript(recording.outputs.transcript)
                    return structuredTranscript ? (
                      <TranscriptDisplay transcript={structuredTranscript} />
                    ) : (
                      <Body style={styles.outputText}>{typeof output === 'string' ? output : ''}</Body>
                    )
                  })()
                ) : activeFormat === 'summary' ? (
                  (() => {
                    const structuredSummary = getStructuredSummary(recording.outputs.summary)
                    return structuredSummary ? (
                      <SummaryDisplay summary={structuredSummary} />
                    ) : (
                      <Body style={styles.outputText}>{typeof output === 'string' ? output : ''}</Body>
                    )
                  })()
                ) : (
                  <Body style={styles.outputText}>{typeof output === 'string' ? output : ''}</Body>
                )}
              </View>
            )
          })()}
        </ScrollView>
      </View>

      {/* Actions Sheet */}
      {recording && (
        <RecordingActionsSheet
          isOpen={showActionsSheet}
          recordingTitle={formatRecordingTitle(recording)}
          audioUri={recording.audioBlobUrl}
          onRename={handleRename}
          onDelete={handleDeleteRecording}
          onClose={() => setShowActionsSheet(false)}
        />
      )}

      {/* Rename Modal */}
      {recording && (
        <RenameModal
          isOpen={showRenameModal}
          currentTitle={recording.title || format(recording.createdAt, 'MMM d, yyyy')}
          onSave={handleSaveRename}
          onClose={() => setShowRenameModal(false)}
        />
      )}

      {/* Format Action Sheet */}
      {formatActionType && (
        <FormatActionSheet
          isOpen={showFormatActionSheet}
          actionType={formatActionType}
          availableFormats={formatsWithOutputs}
          onSelect={(fmt) => {
            if (formatActionType === 'copy') {
              handleCopyFormat(fmt)
            } else if (formatActionType === 'share') {
              handleShareFormat(fmt)
            }
          }}
          onClose={() => {
            setShowFormatActionSheet(false)
            setFormatActionType(null)
          }}
        />
      )}
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  navSpacer: {
    flex: 1,
  },
  navActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navActionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  titleText: {
    fontSize: 20,
    color: themeLight.textPrimary,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 12,
    color: themeLight.textSecondary,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    width: '100%',
    paddingVertical: 12,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingRight: 16,
    alignItems: 'center',
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: themeLight.bgSecondary,
    borderWidth: 1,
    borderColor: themeLight.border,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tabActive: {
    backgroundColor: themeLight.accent,
    borderColor: themeLight.accent,
  },
  tabText: {
    fontSize: 14,
    color: themeLight.textSecondary,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  tabTextActive: {
    color: themeLight.tabActiveText,
  },
  contentWrapper: {
    flex: 1,
  },
  contentScrollView: {
    flex: 1,
  },
  contentScrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  outputText: {
    color: themeLight.textPrimary,
    fontSize: 16,
    lineHeight: 24,
  },
  emptyContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 48,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    color: themeLight.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyBody: {
    color: themeLight.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  emptySuggestion: {
    color: themeLight.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },
})

import { useState, useEffect, useRef, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Pressable, Share, Alert, Animated, Text } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
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

const TOOLTIP_STORAGE_KEY = '@plainly_tooltip_result_tabs_seen'

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
  const [activeFormat, setActiveFormat] = useState<OutputType>('summary')
  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showFormatActionSheet, setShowFormatActionSheet] = useState(false)
  const [formatActionType, setFormatActionType] = useState<'copy' | 'share' | null>(null)
  const hasAutoTitledRef = useRef(false)

  // Toast state
  const [showSavedToast, setShowSavedToast] = useState(false)
  const savedToastAnim = useRef(new Animated.Value(0)).current
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tooltip state
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipAnim = useRef(new Animated.Value(0)).current
  const tooltipSlideAnim = useRef(new Animated.Value(10)).current
  const tabsYRef = useRef(0)

  // Content crossfade
  const contentOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    loadRecording()
    hasAutoTitledRef.current = false
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (tooltipDelayRef.current) clearTimeout(tooltipDelayRef.current)
    }
  }, [id])

  // Toast + tooltip sequence after recording loads
  useEffect(() => {
    if (!recording) return

    // Step 1: Fade in toast
    setShowSavedToast(true)
    Animated.timing(savedToastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    // Step 2: After 2s, fade out toast
    toastTimerRef.current = setTimeout(() => {
      Animated.timing(savedToastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowSavedToast(false)

        // Step 3: Wait 500ms after toast is fully gone
        tooltipDelayRef.current = setTimeout(() => {
          checkAndShowTooltip()
        }, 500)
      })
    }, 2000)

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (tooltipDelayRef.current) clearTimeout(tooltipDelayRef.current)
    }
  }, [recording?.id])

  const checkAndShowTooltip = async () => {
    try {
      const hasSeen = await AsyncStorage.getItem(TOOLTIP_STORAGE_KEY)
      if (!hasSeen) {
        setShowTooltip(true)
        tooltipSlideAnim.setValue(10)
        tooltipAnim.setValue(0)

        // Fade in overlay + slide up tooltip box in parallel
        Animated.parallel([
          Animated.timing(tooltipAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(tooltipSlideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start()
      }
    } catch {
      // Fail silently
    }
  }

  const dismissTooltip = useCallback(async () => {
    try {
      await AsyncStorage.setItem(TOOLTIP_STORAGE_KEY, 'true')
    } catch {
      // Fail silently
    }
    Animated.parallel([
      Animated.timing(tooltipAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(tooltipSlideAnim, {
        toValue: 10,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowTooltip(false)
    })
  }, [tooltipAnim, tooltipSlideAnim])

  const loadRecording = async () => {
    if (!id) return
    try {
      const loadedRecording = await recordingsStore.getById(id)
      if (loadedRecording) {
        setRecording(loadedRecording)

        const lastViewed = loadedRecording.lastViewedFormat
        if (lastViewed) {
          setActiveFormat(lastViewed)
        } else {
          setActiveFormat('summary')
        }

        // Auto-generate title if needed
        if (
          !hasAutoTitledRef.current &&
          loadedRecording.title === 'Recording' &&
          (loadedRecording.outputs.transcript || loadedRecording.outputs.summary)
        ) {
          hasAutoTitledRef.current = true
          generateAutoTitle(loadedRecording).catch(console.error)
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
    const available: OutputType[] = []
    for (const option of formatOptions) {
      if (rec.outputs[option.key]) {
        available.push(option.key)
      }
    }
    // Always show both tabs even if one has no data yet
    if (available.length === 0) return ['summary', 'transcript']
    if (!available.includes('summary')) available.unshift('summary')
    if (!available.includes('transcript')) available.push('transcript')
    return available
  }

  const formatRecordingTitle = (rec: Recording): string => {
    return rec.title || format(rec.createdAt, 'MMM d, yyyy')
  }

  const formatRecordingSubtitle = (rec: Recording): string => {
    return format(rec.createdAt, 'MMM d · h:mm a')
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
      return transcript.segments.map((s) => `${s.speaker}: ${s.text}`).join('\n\n')
    }

    if (formatKey === 'summary' && typeof output === 'object' && 'one_line' in output) {
      const summary = output as StructuredSummary
      const parts = [summary.one_line]
      if (summary.key_takeaways.length > 0) {
        parts.push('\n\nKey takeaways:')
        parts.push(...summary.key_takeaways.map((t) => `• ${t}`))
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
      Alert.alert('Copied', `Copied ${formatTitle.toLowerCase()}`)
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

    // Dismiss tooltip if showing
    if (showTooltip) {
      dismissTooltip()
    }

    // Crossfade animation
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveFormat(fmt)
      recordingsStore.update(recording.id, { lastViewedFormat: fmt }).catch(console.error)

      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start()
    })
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

  const handleTabsLayout = (event: any) => {
    event.target.measureInWindow((_x: number, y: number) => {
      tabsYRef.current = y
    })
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

  if (!recording) {
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

  const renderTabs = (onPress?: (fmt: OutputType) => void) => (
    <View style={styles.tabsRow}>
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
            onPress={() => (onPress || handleFormatSwitch)(formatKey)}
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
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable
          style={styles.navButton}
          onPress={() => router.push('/home')}
        >
          <Icon name="x" size={24} color={themeLight.textPrimary} />
        </Pressable>
        <View style={styles.navSpacer} />
        <View style={styles.navActionsContainer}>
          <Pressable style={styles.navActionButton} onPress={handleCopy}>
            <Icon name="copy" size={24} color={themeLight.textSecondary} />
          </Pressable>
          <Pressable style={styles.navActionButton} onPress={handleShare}>
            <Icon name="share" size={24} color={themeLight.textSecondary} />
          </Pressable>
          <Pressable style={styles.navActionButton} onPress={() => setShowActionsSheet(true)}>
            <Icon name="dots-three-vertical" size={24} color={themeLight.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Saved Toast */}
      {showSavedToast && (
        <Animated.View
          style={[
            styles.savedToast,
            {
              opacity: savedToastAnim,
              transform: [
                {
                  translateY: savedToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Body style={styles.savedToastText}>Saved</Body>
          <Icon name="check" size={16} color="#FFFFFF" />
        </Animated.View>
      )}

      {/* Title Section */}
      <View style={styles.titleContainer}>
        <Title style={styles.titleText}>{formatRecordingTitle(recording)}</Title>
        <Meta style={styles.subtitleText}>{formatRecordingSubtitle(recording)}</Meta>
      </View>

      {/* Audio Player */}
      <View style={styles.audioPlayerContainer}>
        <AudioPlayer
          audioUri={recording.audioBlobUrl}
          durationSec={recording.durationSec}
        />
      </View>

      {/* Format Tabs */}
      <View style={[styles.tabsContainer, showTooltip && styles.tabsHidden]} onLayout={handleTabsLayout}>
        {renderTabs()}
      </View>

      {/* Content Area */}
      <Animated.View style={[styles.contentWrapper, { opacity: contentOpacity }]}>
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
      </Animated.View>

      {/* First-Time Tooltip Overlay */}
      {showTooltip && (
        <Animated.View
          style={[
            styles.tooltipOverlay,
            { opacity: tooltipAnim },
          ]}
        >
          {/* Dim background */}
          <Pressable style={styles.tooltipDim} onPress={dismissTooltip} />

          {/* Spotlighted tabs */}
          <View style={[styles.tooltipSpotlightTabs, { top: tabsYRef.current }]}>
            {renderTabs((fmt) => {
              handleFormatSwitch(fmt)
            })}
          </View>

          {/* Tooltip box */}
          <Animated.View style={[styles.tooltipBox, { top: tabsYRef.current + 52, transform: [{ translateY: tooltipSlideAnim }] }]}>
            <View style={styles.tooltipArrowContainer}>
              <View style={styles.tooltipArrowShape} />
            </View>
            <Text style={styles.tooltipText}>
              <Text style={styles.tooltipBold}>Summary</Text>
              {' shows the key points. '}
              <Text style={styles.tooltipBold}>Transcript</Text>
              {' has the full context of what you said.'}
            </Text>
            <Pressable style={styles.tooltipButton} onPress={dismissTooltip}>
              <Body style={styles.tooltipButtonText}>Got it</Body>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}

      {/* Actions Sheet */}
      <RecordingActionsSheet
        isOpen={showActionsSheet}
        recordingTitle={formatRecordingTitle(recording)}
        audioUri={recording.audioBlobUrl}
        onRename={handleRename}
        onDelete={handleDeleteRecording}
        onClose={() => setShowActionsSheet(false)}
      />

      {/* Rename Modal */}
      <RenameModal
        isOpen={showRenameModal}
        currentTitle={recording.title || format(recording.createdAt, 'MMM d, yyyy')}
        onSave={handleSaveRename}
        onClose={() => setShowRenameModal(false)}
      />

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

  // Top bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
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
    gap: 16,
  },
  navActionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Saved toast
  savedToast: {
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
  savedToastText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#FFFFFF',
  },

  // Title
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  titleText: {
    fontSize: 24,
    color: themeLight.textPrimary,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 13,
    color: themeLight.textSecondary,
  },

  // Audio player wrapper
  audioPlayerContainer: {
    paddingHorizontal: 20,
  },

  // Tabs
  tabsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tabsHidden: {
    opacity: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: themeLight.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  tabActive: {
    backgroundColor: themeLight.accent,
    shadowColor: themeLight.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: themeLight.textSecondary,
  },
  tabTextActive: {
    color: themeLight.tabActiveText,
  },

  // Content
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  outputText: {
    color: themeLight.textPrimary,
    fontSize: 16,
    lineHeight: 26,
  },
  emptyContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 48,
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

  // Tooltip overlay
  tooltipOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
  tooltipDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tooltipSpotlightTabs: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 2001,
  },
  tooltipBox: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: themeLight.textPrimary,
    borderRadius: 12,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 2001,
  },
  tooltipArrowContainer: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tooltipArrowShape: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: themeLight.textPrimary,
  },
  tooltipText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'center',
  },
  tooltipBold: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  tooltipButton: {
    backgroundColor: themeLight.bgSecondary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  tooltipButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: themeLight.textPrimary,
  },
})

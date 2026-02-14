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
import FormatPickerSheet from '../../components/FormatPickerSheet'
import RenameModal from '../../components/RenameModal'
import { generateRecordingTitle } from '../../lib/api'
import TranscriptDisplay from '../../components/TranscriptDisplay'
import SummaryDisplay from '../../components/SummaryDisplay'
import ActionItemsDisplay from '../../components/ActionItemsDisplay'
import FormatActionSheet from '../../components/FormatActionSheet'
import { StructuredTranscript, TranscriptOutput, StructuredSummary, SummaryOutput, StructuredActionItems, ActionItemsOutput } from '../../types'
import { themeLight } from '../../constants/theme'

const formatOptions: { key: OutputType; title: string }[] = [
  { key: 'summary', title: 'Summary' },
  { key: 'action_items', title: 'Action items' },
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
  const [showFormatActionSheet, setShowFormatActionSheet] = useState(false)
  const [formatActionType, setFormatActionType] = useState<'copy' | 'share' | null>(null)
  const hasAutoTitledRef = useRef(false)
  const tabsScrollViewRef = useRef<ScrollView>(null)
  const tabLayoutsRef = useRef<Map<OutputType, { x: number; width: number }>>(new Map())

  useEffect(() => {
    loadRecording()
    setIsGenerating(false) // Reset generating state when component mounts/remounts
    hasAutoTitledRef.current = false // Reset when recording changes
  }, [id])

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
        if (
          !hasAutoTitledRef.current &&
          loadedRecording.title === 'Recording' &&
          (loadedRecording.outputs.transcript || loadedRecording.outputs.summary)
        ) {
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
      let summary: string | undefined
      let transcript: string | undefined
      
      // Extract text from structured summary if needed
      if (rec.outputs.summary) {
        if (typeof rec.outputs.summary === 'string') {
          summary = rec.outputs.summary
        } else {
          // Structured summary - use one_line as summary text
          summary = rec.outputs.summary.one_line
        }
      }
      
      // Extract text from structured transcript if needed
      if (rec.outputs.transcript) {
        if (typeof rec.outputs.transcript === 'string') {
          transcript = rec.outputs.transcript
        } else {
          // Structured transcript - extract all text from segments
          transcript = rec.outputs.transcript.segments.map(s => s.text).join(' ')
        }
      }

      if (!summary && !transcript) {
        return
      }

      const generatedTitle = await generateRecordingTitle(transcript, summary)

      // Only update if title is still "Recording" (user hasn't renamed it)
      if (generatedTitle && generatedTitle !== 'Recording') {
        const currentRecording = await recordingsStore.getById(rec.id)
        if (currentRecording && currentRecording.title === 'Recording') {
          await recordingsStore.update(rec.id, { title: generatedTitle })
          // Update local state to reflect new title
          setRecording({ ...currentRecording, title: generatedTitle })
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
    setTimeout(() => {
      setShowRenameModal(true)
    }, 50)
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
    const output = outputs[formatKey]
    if (!output) return ''
    
    // Handle structured transcript - convert to plain text for copy/share
    if (formatKey === 'transcript' && typeof output === 'object' && 'segments' in output) {
      const transcript = output as StructuredTranscript
      return transcript.segments.map((s: { speaker: string; text: string }) => `${s.speaker}: ${s.text}`).join('\n\n')
    }
    
    // Handle structured summary - convert to plain text for copy/share
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
    
    // Handle structured action items - convert to plain text for copy/share
    if (formatKey === 'action_items' && typeof output === 'object' && 'items' in output) {
      const actionItems = output as StructuredActionItems
      if (actionItems.none_found || actionItems.items.length === 0) {
        return 'No clear action items found.'
      }
      return actionItems.items.map((item: { task: string; owner: string | 'unclear' | null; due: string | 'unclear' | null; details: string | null }, index: number) => {
        const parts = [`${index + 1}. ${item.task}`]
        if (item.owner) {
          parts.push(`   Owner: ${item.owner === 'unclear' ? 'Unclear' : item.owner}`)
        }
        if (item.due) {
          parts.push(`   Due: ${item.due === 'unclear' ? 'Unclear' : item.due}`)
        }
        if (item.details) {
          parts.push(`   ${item.details}`)
        }
        return parts.join('\n')
      }).join('\n\n')
    }
    
    return typeof output === 'string' ? output : ''
  }

  const getStructuredTranscript = (output: TranscriptOutput | undefined): StructuredTranscript | null => {
    if (!output) return null
    if (typeof output === 'string') {
      // Try to parse as JSON (for backward compatibility with old string format)
      try {
        const parsed = JSON.parse(output)
        if (parsed.format === 'transcript' && Array.isArray(parsed.segments)) {
          return parsed as StructuredTranscript
        }
      } catch {
        // Not JSON, return null to use plain text display
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
      // Try to parse as JSON (for backward compatibility with old string format)
      try {
        const parsed = JSON.parse(output)
        if (parsed.format === 'summary' && parsed.one_line && Array.isArray(parsed.key_takeaways)) {
          return parsed as StructuredSummary
        }
      } catch {
        // Not JSON, return null to use plain text display
        return null
      }
    }
    if (typeof output === 'object' && output.format === 'summary') {
      return output as StructuredSummary
    }
    return null
  }

  const getStructuredActionItems = (output: ActionItemsOutput | undefined): StructuredActionItems | null => {
    if (!output) return null
    if (typeof output === 'string') {
      // Try to parse as JSON (for backward compatibility with old string format)
      try {
        const parsed = JSON.parse(output)
        if (parsed.format === 'action_items' && typeof parsed.none_found === 'boolean' && Array.isArray(parsed.items)) {
          return parsed as StructuredActionItems
        }
      } catch {
        // Not JSON, return null to use plain text display
        return null
      }
    }
    if (typeof output === 'object' && output.format === 'action_items') {
      return output as StructuredActionItems
    }
    return null
  }

  const handleCopy = () => {
    setFormatActionType('copy')
    setShowFormatActionSheet(true)
  }

  const handleCopyFormat = async (format: OutputType) => {
    if (!recording) return
    
    const text = getActiveFormatText(format, recording.outputs)
    if (!text || !text.trim()) return

    try {
      await Clipboard.setStringAsync(text)
      const formatTitle = formatOptions.find(opt => opt.key === format)?.title || 'content'
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

  const handleShareFormat = async (format: OutputType) => {
    if (!recording) return
    
    const text = getActiveFormatText(format, recording.outputs)
    if (!text || !text.trim()) return

    try {
      const formatTitle = formatOptions.find(opt => opt.key === format)?.title || 'Content'
      await Share.share({
        message: text,
        title: `Plainly — ${formatTitle}`,
      })
    } catch (error) {
      console.error('Failed to share:', error)
    }
  }

  // Check if a format output is unavailable/empty/invalid
  const isFormatUnavailable = (format: OutputType, output: any): boolean => {
    if (!output) return true
    
    // Check for string outputs
    if (typeof output === 'string') {
      // Check for explicit failure messages
      const failureIndicators = ['failed', 'error', 'unavailable', 'could not', 'unable to']
      const lowerOutput = output.toLowerCase()
      if (failureIndicators.some(indicator => lowerOutput.includes(indicator))) {
        return true
      }
      // Check if effectively empty
      if (!output.trim() || output.trim().length === 0) {
        return true
      }
      return false
    }
    
    // Check structured outputs
    if (typeof output === 'object') {
      // Summary
      if (format === 'summary' && output.format === 'summary') {
        if (!output.one_line || !output.one_line.trim()) return true
        if (!Array.isArray(output.key_takeaways) || output.key_takeaways.length === 0) return true
        return false
      }
      
      // Action items
      if (format === 'action_items' && output.format === 'action_items') {
        if (output.none_found === true) return true
        if (!Array.isArray(output.items) || output.items.length === 0) return true
        // Check if all items have empty tasks
        if (output.items.every((item: any) => !item.task || !item.task.trim())) return true
        return false
      }
      
      // Transcript
      if (format === 'transcript' && output.format === 'transcript') {
        if (!Array.isArray(output.segments) || output.segments.length === 0) return true
        // Check if all segments have empty text
        if (output.segments.every((seg: any) => !seg.text || !seg.text.trim())) return true
        return false
      }
    }
    
    return false
  }

  // Get confidence notes from structured output
  const getConfidenceNotes = (format: OutputType, output: any) => {
    if (typeof output === 'object' && output.confidence_notes) {
      return output.confidence_notes
    }
    return null
  }

  const getEmptyStateContent = (format: OutputType, output?: any) => {
    const confidenceNotes = output ? getConfidenceNotes(format, output) : null
    
    // Determine body message based on confidence notes
    let bodyMessage = "This recording didn't include enough information."
    if (confidenceNotes) {
      if (confidenceNotes.possible_missed_words || confidenceNotes.noisy_audio_suspected) {
        bodyMessage = "Parts of the recording may have been hard to hear."
      } else if (confidenceNotes.mixed_language_detected) {
        bodyMessage = "Mixed languages can be harder to capture perfectly."
      }
    }
    
    // Format-specific titles
    const titles: Record<OutputType, string> = {
      summary: "Not enough to summarise",
      action_items: "No clear action items found",
      transcript: "We couldn't transcribe this clearly",
    }
    
    // Base title for general cases
    const baseTitle = "We couldn't create this just yet"
    
    return {
      title: titles[format] || baseTitle,
      body: bodyMessage,
      suggestion: format === 'action_items' 
        ? 'Try Summary or Transcript instead.'
        : format === 'summary'
        ? 'Try Action items or Transcript instead.'
        : 'Try Summary or Action items instead.',
    }
  }

  const handleFormatSwitch = (format: OutputType) => {
    if (format === activeFormat || !recording) return
    setActiveFormat(format)
    recordingsStore.update(recording.id, {
      lastViewedFormat: format,
    }).catch(console.error)
    
    // Auto-scroll to selected tab
    setTimeout(() => {
      const tabLayout = tabLayoutsRef.current.get(format)
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
  
  const handleTabLayout = (format: OutputType) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout
    tabLayoutsRef.current.set(format, { x, width })
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
  // Convert structured formats to displayable format for checks
  let outputText = ''
  if (activeFormat === 'transcript' && typeof output === 'object' && 'segments' in output) {
    const transcript = output as StructuredTranscript
    outputText = transcript.segments.map((s: { speaker: string; text: string }) => s.text).join(' ')
  } else if (activeFormat === 'summary' && typeof output === 'object' && 'one_line' in output) {
    const summary = output as StructuredSummary
    outputText = summary.one_line
  } else if (activeFormat === 'action_items' && typeof output === 'object' && 'items' in output) {
    const actionItems = output as StructuredActionItems
    if (actionItems.none_found || actionItems.items.length === 0) {
      outputText = 'No clear action items found.'
    } else {
      outputText = actionItems.items.map((item: { task: string }) => item.task).join(' ')
    }
  } else {
    outputText = typeof output === 'string' ? output : ''
  }
  const isFormatAvailable = !isFormatUnavailable(activeFormat, output)
  const availableFormats = getAvailableFormats(recording)
  // Get formats that have actual outputs (for action sheet - copy/share/download)
  const formatsWithOutputs = formatOptions
    .map((opt) => opt.key)
    .filter((key) => {
      const formatOutput = recording.outputs[key]
      return formatOutput && !isFormatUnavailable(key, formatOutput)
    })
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

      {/* Content Area - Only this scrolls */}
      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.contentScrollView}
          contentContainerStyle={styles.contentScrollContent}
        >
            {(() => {
            // Check if format is unavailable
            const isUnavailable = isFormatUnavailable(activeFormat, output)
            
            if (isUnavailable) {
              // Show empty state
              const emptyState = getEmptyStateContent(activeFormat, output)
              return (
                <View style={styles.emptyContentContainer}>
                  <Title style={styles.emptyTitle}>{emptyState.title}</Title>
                  <Body style={styles.emptyBody}>{emptyState.body}</Body>
                  <Body style={styles.emptySuggestion}>{emptyState.suggestion}</Body>
                </View>
              )
            }
            
            // Show content
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
                ) : activeFormat === 'action_items' ? (
                  (() => {
                    const structuredActionItems = getStructuredActionItems(recording.outputs.action_items)
                    return structuredActionItems ? (
                      <ActionItemsDisplay actionItems={structuredActionItems} />
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
          <Icon name="plus" size={16} color={isGenerating ? themeLight.textTertiary : themeLight.accent} />
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

      {/* Format Action Sheet */}
      {formatActionType && (
        <FormatActionSheet
          isOpen={showFormatActionSheet}
          actionType={formatActionType}
          availableFormats={formatsWithOutputs}
          onSelect={(format) => {
            if (formatActionType === 'copy') {
              handleCopyFormat(format)
            } else if (formatActionType === 'share') {
              handleShareFormat(format)
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
  navSpacer: {
    flex: 1,
  },
  navActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // --space-1
  },
  navActionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    paddingHorizontal: 16, // --space-4
    paddingTop: 16, // --space-4
    paddingBottom: 16, // --space-4
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // --color-border-subtle
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  titleText: {
    fontSize: 20, // --font-size-lg
    color: themeLight.textPrimary,
    marginBottom: 4, // --space-1
  },
  subtitleText: {
    fontSize: 12, // --font-size-xs
    color: themeLight.textSecondary,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // --color-border-subtle
    width: '100%',
    paddingVertical: 12, // --space-3
  },
  tabsContent: {
    paddingHorizontal: 16, // --space-4
    paddingRight: 16, // --space-4
    alignItems: 'center',
    gap: 8, // --space-2
  },
  tab: {
    paddingVertical: 8, // --space-2
    paddingHorizontal: 16, // --space-4
    borderRadius: 20, // Pill shape (larger than --radius-lg for full pill)
    backgroundColor: themeLight.bgSecondary,
    borderWidth: 1,
    borderColor: themeLight.border,
    minHeight: 36, // Minimum touch target for accessibility
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tabActive: {
    backgroundColor: themeLight.accent,
    borderColor: themeLight.accent,
  },
  tabText: {
    fontSize: 14, // --font-size-sm
    color: themeLight.textSecondary,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  tabTextActive: {
    color: themeLight.tabActiveText,
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
    backgroundColor: themeLight.bgPrimary,
    borderWidth: 1,
    borderColor: themeLight.border,
    shadowColor: themeLight.shadow,
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
    color: themeLight.accent,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginLeft: 4, // --space-1
  },
  addFormatTextDisabled: {
    color: '#9CA3AF',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  contentScrollView: {
    flex: 1,
  },
  contentScrollContent: {
    paddingBottom: 80, // Extra padding for floating button
  },
  contentContainer: {
    paddingHorizontal: 16, // --space-4
    paddingTop: 24, // --space-6
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
    color: themeLight.textPrimary,
    textAlign: 'center',
    marginBottom: 12, // --space-3
  },
  emptyBody: {
    color: themeLight.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16, // --space-4
    paddingHorizontal: 16, // --space-4
  },
  emptySuggestion: {
    color: themeLight.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16, // --space-4
  },
})

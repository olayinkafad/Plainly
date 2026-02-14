import { useEffect, useState, useRef } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Title, Body, Meta } from '../components/typography'
import { recordingsStore, Recording } from '../store/recordings'
import { OutputType, TranscriptOutput, StructuredTranscript, SummaryOutput, StructuredSummary, ActionItemsOutput, StructuredActionItems } from '../types'
import Button from '../components/Button'
import { processRecording } from '../lib/api'
import { themeLight } from '../constants/theme'

const MIN_LOADING_TIME = 700 // Minimum visible loading time in milliseconds

export default function Generating() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { recordingId, format } = useLocalSearchParams<{ recordingId: string; format: OutputType }>()
  const [recording, setRecording] = useState<Recording | null>(null)
  const [error, setError] = useState<string | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    if (recordingId && format) {
      loadRecordingAndGenerate()
    }
  }, [recordingId, format])

  const getFormatContent = (format?: OutputType) => {
    if (!format) {
      return {
        title: 'Generating your output',
        helper: null,
      }
    }

    const formatContent: Record<OutputType, { title: string; helper: string | null }> = {
      summary: {
        title: 'Generating your summary',
        helper: 'Creating a quick overview and key takeaways.',
      },
      action_items: {
        title: 'Generating your action items',
        helper: 'Pulling out clear next steps.',
      },
      transcript: {
        title: 'Generating your transcript',
        helper: 'Capturing everything you said, word for word.',
      },
    }

    return formatContent[format]
  }

  const loadRecordingAndGenerate = async () => {
    if (!recordingId || !format) return

    try {
      setError(null)
      startTimeRef.current = Date.now()

      // Load recording
      const loadedRecording = await recordingsStore.getById(recordingId)
      if (!loadedRecording) {
        setError('Recording not found')
        return
      }
      setRecording(loadedRecording)

      // Process recording with real API
      const result = await processRecording(loadedRecording.audioBlobUrl, format)

      // Check for API errors
      if (result.error) {
        // Handle "No speech detected" error specially - navigate to result page with empty state
        if (result.error.includes('No speech detected')) {
          // Don't save an output - just set lastViewedFormat so the format shows in tabs
          // The empty state will be shown because there's no output for this format
          // This preserves existing outputs and allows other formats to be generated
          await recordingsStore.update(recordingId, {
            lastViewedFormat: format,
          })

          // Enforce minimum loading time
          const elapsed = Date.now() - startTimeRef.current
          if (elapsed < MIN_LOADING_TIME) {
            await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed))
          }

          // Navigate to result screen to show edge case empty state
          router.replace(`/recordings/${recordingId}`)
          return
        }
        
        // For other errors, show error screen
        setError(result.error)
        return
      }

      // Prepare outputs - handle structured formats
      const outputs: Partial<Recording['outputs']> = {}
      
      if (format === 'transcript') {
        // Parse structured transcript JSON
        try {
          const parsed = JSON.parse(result.output)
          if (parsed.format === 'transcript' && Array.isArray(parsed.segments)) {
            outputs.transcript = parsed as StructuredTranscript
          } else {
            // Fallback to string if parsing fails or invalid structure
            outputs.transcript = result.output
          }
        } catch {
          // Not JSON, store as string (backward compatibility)
          outputs.transcript = result.output
        }
      } else if (format === 'summary') {
        // Parse structured summary JSON
        try {
          const parsed = JSON.parse(result.output)
          if (parsed.format === 'summary' && parsed.one_line && Array.isArray(parsed.key_takeaways)) {
            outputs.summary = parsed as StructuredSummary
          } else {
            // Fallback to string if parsing fails or invalid structure
            outputs.summary = result.output
          }
        } catch {
          // Not JSON, store as string (backward compatibility)
          outputs.summary = result.output
        }
      } else if (format === 'action_items') {
        // Parse structured action items JSON
        try {
          const parsed = JSON.parse(result.output)
          if (parsed.format === 'action_items' && typeof parsed.none_found === 'boolean' && Array.isArray(parsed.items)) {
            outputs.action_items = parsed as StructuredActionItems
          } else {
            // Fallback to string if parsing fails or invalid structure
            outputs.action_items = result.output
          }
        } catch {
          // Not JSON, store as string (backward compatibility)
          outputs.action_items = result.output
        }
      } else {
        // Other formats store as string
        outputs[format] = result.output
      }

      // Only save the requested format - do not save transcript unless explicitly requested
      // The transcript is an intermediate step but should not be stored unless the user selected it

      // Update recording with generated output (preserve existing outputs)
      await recordingsStore.update(recordingId, {
        outputs: {
          ...loadedRecording.outputs, // Preserve all existing outputs
          ...outputs,
        },
        lastViewedFormat: format,
      })

      // Enforce minimum loading time
      const elapsed = Date.now() - startTimeRef.current
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed))
      }

      // Navigate to result screen
      router.replace(`/recordings/${recordingId}`)
    } catch (error: any) {
      console.error('Failed to generate output:', error)

      // Handle "No speech detected" error specially - navigate to result page with empty state
      if (error?.message?.includes('No speech detected')) {
        if (!recordingId || !format) return
        
        // Load recording again to get latest state
        const latestRecording = await recordingsStore.getById(recordingId)
        if (!latestRecording) {
          setError('Recording not found')
          return
        }

        // Don't save an output - just set lastViewedFormat so the format shows in tabs
        // The empty state will be shown because there's no output for this format
        // This preserves existing outputs and allows other formats to be generated
        await recordingsStore.update(recordingId, {
          lastViewedFormat: format,
        })

        // Enforce minimum loading time
        const elapsed = Date.now() - startTimeRef.current
        if (elapsed < MIN_LOADING_TIME) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed))
        }

        // Navigate to result screen to show edge case empty state
        router.replace(`/recordings/${recordingId}`)
        return
      }

      // Handle other specific error messages
      let errorMessage = 'Something went wrong. Please try again.'

      if (error?.message?.includes('Network') || error?.message?.includes('connect')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection and make sure the backend is running.'
      } else if (error?.message?.includes('Rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.'
      } else if (error?.message?.includes('too short')) {
        errorMessage = 'Recording is too short. Please record for at least a few seconds.'
      } else if (error?.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
    }
  }

  const formatContent = getFormatContent(format)

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.centerContent}>
            <Title style={styles.errorTitle}>Something went wrong</Title>
            <Body style={styles.errorBody}>{error}</Body>
            <Button
              variant="primary"
              fullWidth
              onPress={() => {
                setError(null)
                loadRecordingAndGenerate()
              }}
              style={styles.retryButton}
            >
              Try again
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onPress={() => router.back()}
              style={styles.backButton}
            >
              Go back
            </Button>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={themeLight.accent} style={styles.loader} />
          <Title style={styles.title}>{formatContent.title}</Title>
          {formatContent.helper && (
            <Body style={styles.helper}>{formatContent.helper}</Body>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeLight.bgPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24, // --space-6
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginBottom: 32, // --space-8
  },
  title: {
    fontSize: 24,
    color: themeLight.textPrimary,
    textAlign: 'center',
    marginBottom: 12, // --space-3
  },
  helper: {
    fontSize: 14,
    color: themeLight.textSecondary,
    textAlign: 'center',
    marginTop: 4, // --space-1
  },
  errorTitle: {
    fontSize: 24,
    color: themeLight.textPrimary,
    textAlign: 'center',
    marginBottom: 12, // --space-3
  },
  errorBody: {
    fontSize: 14,
    color: themeLight.textSecondary,
    textAlign: 'center',
    marginBottom: 24, // --space-6
    paddingHorizontal: 16, // --space-4
  },
  retryButton: {
    maxWidth: 300,
  },
  backButton: {
    maxWidth: 300,
    marginTop: 12,
  },
})

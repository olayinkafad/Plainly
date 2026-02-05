import { useEffect, useState, useRef } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Title, Body, Meta } from '../components/typography'
import { recordingsStore, Recording } from '../store/recordings'
import { OutputType } from '../types'
import Button from '../components/Button'
import { processRecording } from '../lib/api'

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
      key_points: {
        title: 'Generating your key points',
        helper: 'Highlighting the main ideas.',
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

      // Process recording with mock API
      const result = await processRecording(loadedRecording.audioBlobUrl, format)

      // If transcript format, also save transcript
      const outputs: Partial<Record<OutputType, string>> = {
        [format]: result.output,
      }

      // If we got a transcript and format is not transcript, save it for future use
      if (format !== 'transcript' && result.transcript) {
        outputs.transcript = result.transcript
      }

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
      
      // Handle specific error messages
      let errorMessage = 'Something went wrong. Please try again.'
      
      if (error?.message?.includes('API error')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.'
      } else if (error?.message?.includes('No speech detected')) {
        errorMessage = 'No speech was detected in the recording. Please try recording again.'
      } else if (error?.message?.includes('Rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.'
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
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
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
    backgroundColor: '#FFFFFF',
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
    color: '#111827', // --color-text-primary
    textAlign: 'center',
    marginBottom: 12, // --space-3
  },
  helper: {
    fontSize: 14,
    color: '#6B7280', // --color-text-secondary
    textAlign: 'center',
    marginTop: 4, // --space-1
  },
  errorTitle: {
    fontSize: 24,
    color: '#111827', // --color-text-primary
    textAlign: 'center',
    marginBottom: 12, // --space-3
  },
  errorBody: {
    fontSize: 14,
    color: '#6B7280', // --color-text-secondary
    textAlign: 'center',
    marginBottom: 24, // --space-6
    paddingHorizontal: 16, // --space-4
  },
  retryButton: {
    maxWidth: 300,
  },
})

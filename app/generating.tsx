import { useEffect, useState } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Title, Body } from '../components/typography'
import { recordingsStore } from '../store/recordings'
import { StructuredTranscript, StructuredSummary } from '../types'
import Button from '../components/Button'
import { transcribeAudio, generateOutputs } from '../lib/api'
import { themeLight } from '../constants/theme'

/**
 * Error / retry screen for when processing fails in RecordingModal.
 * Accepts recordingId and optional errorMessage params.
 * On retry: calls processRecording (both formats), saves outputs, navigates to result.
 */
export default function Generating() {
  const router = useRouter()
  const { recordingId, errorMessage } = useLocalSearchParams<{
    recordingId: string
    errorMessage?: string
  }>()
  const [error, setError] = useState<string | null>(errorMessage || null)
  const [retrying, setRetrying] = useState(false)

  // If no error message was passed, auto-retry on mount
  useEffect(() => {
    if (recordingId && !errorMessage) {
      handleRetry()
    }
  }, [recordingId])

  const handleRetry = async () => {
    if (!recordingId) return

    try {
      setRetrying(true)
      setError(null)

      const recording = await recordingsStore.getById(recordingId)
      if (!recording) {
        setError('Recording not found')
        setRetrying(false)
        return
      }

      // Stage 1: Transcribe
      const transcribeResult = await transcribeAudio(recording.audioBlobUrl)

      if (transcribeResult.error) {
        if (transcribeResult.error?.includes('No speech detected')) {
          router.replace(`/recordings/${recordingId}`)
          return
        }
        setError(transcribeResult.error)
        setRetrying(false)
        return
      }

      // Stage 2: Generate outputs
      const outputsResult = await generateOutputs(transcribeResult.transcript)

      if (outputsResult.error) {
        setError(outputsResult.error)
        setRetrying(false)
        return
      }

      // Parse summary
      let summary: StructuredSummary | string = outputsResult.summary
      try {
        const parsed = JSON.parse(outputsResult.summary)
        if (parsed.format === 'summary' && parsed.gist && Array.isArray(parsed.key_points)) {
          summary = parsed as StructuredSummary
        }
      } catch {
        // Keep as string
      }

      // Parse structured transcript
      let transcript: StructuredTranscript | string = outputsResult.structuredTranscript
      try {
        const parsed = JSON.parse(outputsResult.structuredTranscript)
        if (parsed.format === 'transcript' && Array.isArray(parsed.segments)) {
          transcript = parsed as StructuredTranscript
        }
      } catch {
        // Keep as string
      }

      // Save both outputs
      await recordingsStore.update(recordingId, {
        outputs: {
          ...recording.outputs,
          summary,
          transcript,
        },
        lastViewedFormat: 'summary',
      })

      router.replace(`/recordings/${recordingId}?new=1`)
    } catch (err: any) {
      let errorMsg = 'Something went wrong. Please try again.'

      if (err?.message?.includes('Network') || err?.message?.includes('connect')) {
        errorMsg = 'Unable to connect to server. Please check your internet connection.'
      } else if (err?.message?.includes('Rate limit')) {
        errorMsg = 'Too many requests. Please wait a moment and try again.'
      } else if (err?.message?.includes('too short')) {
        errorMsg = 'Recording is too short. Please record for at least a few seconds.'
      } else if (err?.message) {
        errorMsg = err.message
      }

      setError(errorMsg)
      setRetrying(false)
    }
  }

  if (retrying) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={themeLight.accent} style={styles.loader} />
            <Title style={styles.title}>Processing your recording</Title>
            <Body style={styles.helper}>Generating summary and transcript...</Body>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.centerContent}>
          <Title style={styles.errorTitle}>Something went wrong</Title>
          <Body style={styles.errorBody}>
            {error || 'An unexpected error occurred.'}
          </Body>
          <View style={styles.retryButton}>
            <Button
              variant="primary"
              fullWidth
              onPress={handleRetry}
            >
              Try again
            </Button>
          </View>
          <View style={styles.backButton}>
            <Button
              variant="secondary"
              fullWidth
              onPress={() => router.back()}
            >
              Go back
            </Button>
          </View>
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
    paddingHorizontal: 24,
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
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    color: themeLight.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  helper: {
    fontSize: 14,
    color: themeLight.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  errorTitle: {
    fontSize: 24,
    color: themeLight.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorBody: {
    fontSize: 14,
    color: themeLight.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  retryButton: {
    maxWidth: 300,
  },
  backButton: {
    maxWidth: 300,
    marginTop: 12,
  },
})

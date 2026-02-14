import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { Body, Meta } from './typography'
import { StructuredTranscript } from '../types'
import { themeLight } from '../constants/theme'

interface TranscriptDisplayProps {
  transcript: StructuredTranscript
}

const FILLER_PATTERN = /\b(um|uh|like|so|and|oh)\b/gi

function renderTextWithFillers(text: string) {
  const parts = text.split(FILLER_PATTERN)

  return parts.map((part, index) => {
    if (!part) return null
    const isFiller = FILLER_PATTERN.test(part)
    // Reset regex lastIndex after test
    FILLER_PATTERN.lastIndex = 0
    return (
      <Text
        key={index}
        style={isFiller ? styles.fillerWord : styles.segmentText}
      >
        {part}
      </Text>
    )
  })
}

export default function TranscriptDisplay({ transcript }: TranscriptDisplayProps) {
  const { segments, speaker_separation, confidence_notes } = transcript

  return (
    <View style={styles.container}>
      {/* Confidence notes warning */}
      {(confidence_notes.possible_missed_words ||
        confidence_notes.mixed_language_detected ||
        confidence_notes.noisy_audio_suspected) && (
        <View style={styles.warningContainer}>
          <Meta style={styles.warningText}>
            {confidence_notes.reason || 'Some words may have been missed or unclear.'}
          </Meta>
        </View>
      )}

      {/* Segments */}
      <View style={styles.segmentsContainer}>
        {segments.map((segment, index) => (
          <View key={index} style={styles.segment}>
            {speaker_separation === 'provided' && (
              <Meta style={styles.speakerLabel}>{segment.speaker}</Meta>
            )}
            <Body style={styles.segmentTextContainer}>
              {renderTextWithFillers(segment.text)}
            </Body>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  warningContainer: {
    backgroundColor: '#FFF8E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
  },
  warningText: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 16,
  },
  segmentsContainer: {
    gap: 16,
  },
  segment: {
    marginBottom: 0,
  },
  speakerLabel: {
    color: themeLight.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  segmentTextContainer: {
    fontSize: 16,
    lineHeight: 28,
    color: themeLight.textPrimary,
  },
  segmentText: {
    fontSize: 16,
    lineHeight: 28,
    color: themeLight.textPrimary,
  },
  fillerWord: {
    fontSize: 16,
    lineHeight: 28,
    color: themeLight.textTertiary,
  },
})

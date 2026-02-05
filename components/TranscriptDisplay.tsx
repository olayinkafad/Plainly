import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Body, Meta } from './typography'
import { StructuredTranscript } from '../types'

interface TranscriptDisplayProps {
  transcript: StructuredTranscript
}

export default function TranscriptDisplay({ transcript }: TranscriptDisplayProps) {
  const { segments, speaker_separation, confidence_notes } = transcript

  return (
    <View style={styles.container}>
      {/* Confidence notes warning (if any) */}
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
            {/* Speaker label - only show if separation is available or multiple speakers */}
            {speaker_separation === 'provided' && (
              <Meta style={styles.speakerLabel}>{segment.speaker}</Meta>
            )}
            {/* Text content */}
            <Body style={styles.segmentText}>{segment.text}</Body>
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
    backgroundColor: '#FEF3C7',
    padding: 12, // --space-3
    borderRadius: 8,
    marginBottom: 16, // --space-4
    borderLeftWidth: 3,
    borderLeftColor: '#D97706', // --color-warning
  },
  warningText: {
    color: '#92400E',
    fontSize: 12, // --font-size-xs
    lineHeight: 16,
  },
  segmentsContainer: {
    gap: 16, // --space-4
  },
  segment: {
    marginBottom: 16, // --space-4
  },
  speakerLabel: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 12, // --font-size-xs
    fontWeight: '600',
    marginBottom: 4, // --space-1
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentText: {
    color: '#111827', // --color-text-primary
    fontSize: 14, // --font-size-sm
    lineHeight: 22,
  },
})

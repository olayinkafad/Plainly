import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Body, Meta } from './typography'
import { StructuredTranscript } from '../types'
import { themeLight } from '../constants/theme'

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
        {segments.map((segment, index) => {
          const formatTimestamp = (seconds: number): string => {
            const hours = Math.floor(seconds / 3600)
            const minutes = Math.floor((seconds % 3600) / 60)
            const secs = Math.floor(seconds % 60)
            
            if (hours > 0) {
              return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            }
            return `${minutes}:${secs.toString().padStart(2, '0')}`
          }
          
          return (
            <View key={index} style={styles.segment}>
              {/* Timestamp and speaker row */}
              <View style={styles.segmentHeader}>
                <Meta style={styles.timestamp}>
                  {formatTimestamp(segment.start)}
                </Meta>
                {speaker_separation === 'provided' && (
                  <Meta style={styles.speakerLabel}>{segment.speaker}</Meta>
                )}
              </View>
              {/* Text content */}
              <Body style={styles.segmentText}>{segment.text}</Body>
            </View>
          )
        })}
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
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // --space-2
    marginBottom: 4, // --space-1
  },
  timestamp: {
    color: themeLight.textSecondary,
    fontSize: 11, // Slightly smaller than xs
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  speakerLabel: {
    color: themeLight.textSecondary,
    fontSize: 12, // --font-size-xs
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentText: {
    color: themeLight.textPrimary,
    fontSize: 14, // --font-size-sm
    lineHeight: 22,
  },
})

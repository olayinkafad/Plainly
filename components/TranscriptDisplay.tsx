import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Body, Meta } from './typography'
import { StructuredTranscript } from '../types'
import { themeLight } from '../constants/theme'

interface TranscriptDisplayProps {
  transcript: StructuredTranscript
  durationSec?: number
  onTimestampPress?: (positionMs: number) => void
}

// Multi-word fillers must come before single-word to match greedily
const FILLER_PATTERN = /\b(okay so|oh and|you know|I mean|um|uh|like|so|and|oh)\b/gi

function renderTextWithFillers(text: string) {
  const parts: { text: string; isFiller: boolean }[] = []
  let lastIndex = 0

  // Reset in case of prior use
  FILLER_PATTERN.lastIndex = 0

  let match
  while ((match = FILLER_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isFiller: false })
    }
    parts.push({ text: match[0], isFiller: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isFiller: false })
  }

  if (parts.length === 0) {
    return <Text style={styles.segmentText}>{text}</Text>
  }

  return parts.map((part, index) => (
    <Text
      key={index}
      style={part.isFiller ? styles.fillerWord : styles.segmentText}
    >
      {part.text}
    </Text>
  ))
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function TranscriptDisplay({ transcript, durationSec = 0, onTimestampPress }: TranscriptDisplayProps) {
  const { segments, speaker_separation, confidence_notes } = transcript
  const showTimestamps = durationSec > 60

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
            {showTimestamps && typeof segment.start === 'number' && (
              <Pressable
                onPress={() => onTimestampPress?.(segment.start * 1000)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.timestamp}>{formatTimestamp(segment.start)}</Text>
              </Pressable>
            )}
            {speaker_separation === 'provided' && (
              <Meta style={styles.speakerLabel}>{segment.speaker}</Meta>
            )}
            <Text style={styles.segmentTextContainer}>
              {renderTextWithFillers(segment.text)}
            </Text>
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
    gap: 20,
  },
  segment: {},
  timestamp: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: themeLight.textTertiary,
    marginBottom: 4,
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
    fontFamily: 'PlusJakartaSans_400Regular',
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

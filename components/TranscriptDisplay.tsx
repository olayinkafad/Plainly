import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native'
import { Body, Meta } from './typography'
import { StructuredTranscript } from '../types'
import { themeLight } from '../constants/theme'

const HIGHLIGHT_BG = '#F0E6DF'
const HIGHLIGHT_DURATION_MS = 3000

interface TranscriptDisplayProps {
  transcript: StructuredTranscript
  durationSec?: number
  onTimestampPress?: (positionMs: number) => void
  animateFirstSentence?: boolean
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

// Extract first sentence from text (up to first . ! or ?)
function extractFirstSentence(text: string): { firstSentence: string; rest: string } {
  const match = text.match(/^(.*?[.!?])\s*(.*)$/s)
  if (match) {
    return { firstSentence: match[1], rest: match[2] }
  }
  // No sentence-ending punctuation found — use the whole text
  return { firstSentence: text, rest: '' }
}

// Animated word component for the highlight effect
function HighlightWord({
  word,
  filler,
  wordIndex,
  wordCount,
  progress,
}: {
  word: string
  filler: boolean
  wordIndex: number
  wordCount: number
  progress: Animated.Value
}) {
  const startNorm = Math.max(0, (wordIndex - 4) / wordCount)
  let endNorm = wordIndex / wordCount
  // inputRange must be strictly increasing
  endNorm = Math.min(1, Math.max(endNorm, startNorm + 0.001))
  const bgColor = progress.interpolate({
    inputRange: [0, startNorm, endNorm, 1],
    outputRange: [
      'transparent',
      'transparent',
      HIGHLIGHT_BG,
      'transparent',
    ],
  })

  return (
    <Animated.View style={[styles.wordWrap, { backgroundColor: bgColor }]}>
      <Text style={[styles.segmentText, filler && styles.fillerWord]}>
        {word}{' '}
      </Text>
    </Animated.View>
  )
}

// First sentence with word-by-word highlight animation
function AnimatedFirstSegment({
  firstSentenceText,
  restText,
}: {
  firstSentenceText: string
  restText: string
}) {
  const progress = useRef(new Animated.Value(0)).current
  const [animationDone, setAnimationDone] = useState(false)

  const words = firstSentenceText.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: HIGHLIGHT_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(() => {
      setAnimationDone(true)
    })
  }, [])

  if (animationDone) {
    // After animation, render normally
    const fullText = restText ? firstSentenceText + ' ' + restText : firstSentenceText
    return (
      <Text style={styles.segmentTextContainer}>
        {renderTextWithFillers(fullText)}
      </Text>
    )
  }

  return (
    <View>
      <View style={styles.animatedSentenceContainer}>
        {words.map((word, i) => {
          FILLER_PATTERN.lastIndex = 0
          const isFiller = FILLER_PATTERN.test(word.replace(/[^a-z']/gi, ''))
          return (
            <HighlightWord
              key={i}
              word={word}
              filler={isFiller}
              wordIndex={i}
              wordCount={wordCount}
              progress={progress}
            />
          )
        })}
      </View>
      {restText ? (
        <Text style={styles.segmentTextContainer}>
          {renderTextWithFillers(restText)}
        </Text>
      ) : null}
    </View>
  )
}

export default function TranscriptDisplay({ transcript, durationSec = 0, onTimestampPress, animateFirstSentence = false }: TranscriptDisplayProps) {
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
        {segments.map((segment, index) => {
          const isFirstSegment = index === 0 && animateFirstSentence

          return (
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
              {isFirstSegment ? (
                (() => {
                  const { firstSentence, rest } = extractFirstSentence(segment.text)
                  return (
                    <AnimatedFirstSegment
                      firstSentenceText={firstSentence}
                      restText={rest}
                    />
                  )
                })()
              ) : (
                <Text style={styles.segmentTextContainer}>
                  {renderTextWithFillers(segment.text)}
                </Text>
              )}
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
  animatedSentenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  wordWrap: {
    borderRadius: 2,
  },
})

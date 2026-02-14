import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Text, Easing } from 'react-native'
import Icon from './Icon'
import { Title, Body } from './typography'

const PRIMARY_BLUE = '#2563EB'
const TAB_ACTIVE_BG = '#2563EB'
const TAB_INACTIVE_BG = '#FFFFFF'
const CARD_BG = '#FFFFFF'
const HIGHLIGHT_BG = 'rgba(37, 99, 235, 0.22)'
const FILLER_COLOR = '#9CA3AF'

const SUMMARY_DURATION_MS = 5000
const TRANSCRIPT_DURATION_MS = 6000
const CROSSFADE_DURATION_MS = 500

const TRANSCRIPT_TEXT =
  "Okay so I'm trying to figure out what to do this weekend. I think Saturday I just want to stay in, maybe cook something. And then Sunday we could try that new brunch place on 5th. Oh and I need to call my mum..."

const FILLER_WORDS = new Set(['so', 'maybe', 'oh', 'and'])

interface OnboardingResultPreviewProps {
  isFocused: boolean
}

export default function OnboardingResultPreview({ isFocused }: OnboardingResultPreviewProps) {
  const [viewMode, setViewMode] = useState<'summary' | 'transcript'>('transcript')
  const summaryOpacity = useRef(new Animated.Value(0)).current
  const transcriptOpacity = useRef(new Animated.Value(1)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transcriptProgress = useRef(new Animated.Value(0)).current

  const words = TRANSCRIPT_TEXT.split(/\s+/).map((w) => ({
    text: w,
    filler: FILLER_WORDS.has(w.replace(/[^a-z']/gi, '').toLowerCase()),
  }))
  const wordCount = words.length

  // Switch Summary ↔ Transcript on timer; pause when not focused
  useEffect(() => {
    if (!isFocused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // When slide is focused, start from transcript and begin cycle
    setViewMode('transcript')
    summaryOpacity.setValue(0)
    transcriptOpacity.setValue(1)
    transcriptProgress.setValue(0)

    const showTranscript = () => {
      setViewMode('transcript')
      Animated.parallel([
        Animated.timing(summaryOpacity, {
          toValue: 0,
          duration: CROSSFADE_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(transcriptOpacity, {
          toValue: 1,
          duration: CROSSFADE_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start()
      transcriptProgress.setValue(0)
      Animated.timing(transcriptProgress, {
        toValue: 1,
        duration: TRANSCRIPT_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start()
      timerRef.current = setTimeout(showSummary, TRANSCRIPT_DURATION_MS)
    }

    const showSummary = () => {
      setViewMode('summary')
      Animated.parallel([
        Animated.timing(summaryOpacity, {
          toValue: 1,
          duration: CROSSFADE_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(transcriptOpacity, {
          toValue: 0,
          duration: CROSSFADE_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start()
      transcriptProgress.setValue(0)
      timerRef.current = setTimeout(showTranscript, SUMMARY_DURATION_MS)
    }

    timerRef.current = setTimeout(showTranscript, 0)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isFocused])

  return (
    <View style={styles.container}>
      {/* Tabs – Transcript first, then Summary */}
      <View style={styles.tabs}>
        <View
          style={[
            styles.tab,
            viewMode === 'transcript' ? styles.tabActive : styles.tabInactive,
          ]}
        >
          <Body
            style={[
              styles.tabText,
              viewMode === 'transcript' && styles.tabTextActive,
            ]}
          >
            Transcript
          </Body>
        </View>
        <View
          style={[
            styles.tab,
            viewMode === 'summary' ? styles.tabActive : styles.tabInactive,
          ]}
        >
          <Body
            style={[
              styles.tabText,
              viewMode === 'summary' && styles.tabTextActive,
            ]}
          >
            Summary
          </Body>
        </View>
      </View>

      {/* Card area with two overlaid views */}
      <View style={styles.cardWrapper}>
        <Animated.View
          style={[styles.card, styles.summaryCard, { opacity: summaryOpacity }]}
          pointerEvents={viewMode === 'summary' ? 'auto' : 'none'}
        >
          <Title style={styles.summaryTitle}>Weekend plans</Title>
          <View style={styles.divider} />
          <Body style={styles.summaryPara}>
            Thinking about what to do this weekend. Leaning towards staying in
            on Saturday and going out on Sunday.
          </Body>
          <View style={styles.bulletSection}>
            <View style={styles.bulletItem}>
              <View style={styles.bullet} />
              <Body style={styles.bulletText}>
                Saturday — rest, cook something new, maybe watch a film
              </Body>
            </View>
            <View style={styles.bulletItem}>
              <View style={styles.bullet} />
              <Body style={styles.bulletText}>
                Sunday — check out the new brunch place on 5th, call Mum
              </Body>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.transcriptCard,
            styles.transcriptCardShadow,
            { opacity: transcriptOpacity },
          ]}
          pointerEvents={viewMode === 'transcript' ? 'auto' : 'none'}
        >
          {/* Audio strip – same style as result screen */}
          <View style={styles.audioStrip}>
            <View style={styles.audioPlayButton}>
              <Icon name="play" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.audioScrubberContainer}>
              <View style={styles.audioTimeRow}>
                <Text style={styles.audioTimeText}>0:00</Text>
                <Text style={styles.audioTimeText}>0:45</Text>
              </View>
              <View style={styles.audioScrubberTrack}>
                <Animated.View
                  style={[
                    styles.audioScrubberFill,
                    {
                      width: transcriptProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.audioSpeedLabel}>1x</Text>
          </View>
          {/* Transcript text – 3–4 lines, normal spacing, word highlight in sync */}
          <View style={styles.transcriptBody}>
            {words.map((word, i) => (
              <TranscriptWord
                key={i}
                word={word.text}
                filler={word.filler}
                wordIndex={i}
                wordCount={wordCount}
                progress={transcriptProgress}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </View>
  )
}

function TranscriptWord({
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
      <Text
        style={[styles.transcriptWord, filler && styles.transcriptWordFiller]}
      >
        {word}{' '}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    alignSelf: 'center',
    paddingTop: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    minHeight: 32,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tabActive: {
    backgroundColor: TAB_ACTIVE_BG,
  },
  tabInactive: {
    backgroundColor: TAB_INACTIVE_BG,
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Satoshi-Medium',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  cardWrapper: {
    position: 'relative',
    flex: 1,
    width: '100%',
    minHeight: 180,
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCard: {},
  transcriptCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  transcriptCardShadow: {},
  summaryTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  summaryPara: {
    fontSize: 13,
    color: '#111827',
    lineHeight: Math.round(13 * 1.6),
    marginBottom: 12,
  },
  bulletSection: {
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: PRIMARY_BLUE,
    marginTop: 6,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
    lineHeight: Math.round(12 * 1.6),
  },
  audioStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  audioScrubberContainer: {
    flex: 1,
    marginRight: 12,
  },
  audioTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  audioTimeText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Satoshi-Regular',
  },
  audioScrubberTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioScrubberFill: {
    height: '100%',
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 2,
  },
  audioSpeedLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Satoshi-Regular',
  },
  transcriptBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 14,
  },
  wordWrap: {
    borderRadius: 2,
  },
  transcriptWord: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Satoshi-Regular',
    lineHeight: Math.round(14 * 1.7),
  },
  transcriptWordFiller: {
    color: FILLER_COLOR,
  },
})

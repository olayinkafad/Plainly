import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Text, Easing } from 'react-native'
import Icon from './Icon'
import { Title, Body } from './typography'

const PRIMARY_BLUE = '#2563EB'
const TAB_ACTIVE_BG = '#2563EB'
const TAB_INACTIVE_BG = '#F9FAFB'
const TAB_INACTIVE_BORDER = '#E5E7EB'
const CARD_BG = '#FFFFFF'
const HIGHLIGHT_BG = 'rgba(37, 99, 235, 0.22)'
const FILLER_COLOR = '#9CA3AF'

const SUMMARY_DURATION_MS = 5000
const TRANSCRIPT_DURATION_MS = 6000
const CROSSFADE_DURATION_MS = 500
const MS_PER_WORD = 300

const TRANSCRIPT_TEXT =
  "Okay so I'm trying to figure out what to do this weekend. I think Saturday I just want to stay in, maybe cook something, I don't know, watch a film or something. And then Sunday I was thinking we could try that new brunch place, the one on 5th. Oh and I need to call my mum at some point..."

const FILLER_WORDS = new Set([
  'so',
  "i'm",
  'i',
  'just',
  'maybe',
  "don't",
  'know',
  'or',
  'something',
  'and',
  'then',
  'oh',
  'the',
  'that',
  'we',
  'could',
  'at',
  'some',
  'point',
])

interface OnboardingResultPreviewProps {
  isFocused: boolean
}

export default function OnboardingResultPreview({ isFocused }: OnboardingResultPreviewProps) {
  const [viewMode, setViewMode] = useState<'summary' | 'transcript'>('summary')
  const summaryOpacity = useRef(new Animated.Value(1)).current
  const transcriptOpacity = useRef(new Animated.Value(0)).current
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

    // When slide is focused, start from summary and begin cycle
    setViewMode('summary')
    summaryOpacity.setValue(1)
    transcriptOpacity.setValue(0)
    transcriptProgress.setValue(0)

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
      const highlightDurationMs = wordCount * MS_PER_WORD
      Animated.timing(transcriptProgress, {
        toValue: 1,
        duration: highlightDurationMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start()
      timerRef.current = setTimeout(showSummary, TRANSCRIPT_DURATION_MS)
    }

    timerRef.current = setTimeout(showTranscript, SUMMARY_DURATION_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isFocused])

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
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
            styles.card,
            styles.transcriptCard,
            { opacity: transcriptOpacity },
          ]}
          pointerEvents={viewMode === 'transcript' ? 'auto' : 'none'}
        >
          {/* Mini audio player */}
          <View style={styles.miniPlayer}>
            <View style={styles.miniPlayBtn}>
              <Icon name="play" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.miniScrubber}>
              <View style={styles.miniScrubberTrack}>
                <View style={[styles.miniScrubberFill, { width: '35%' }]} />
              </View>
              <Text style={styles.miniTime}>0:00 / 0:45</Text>
            </View>
          </View>
          {/* Transcript with trailing highlight */}
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
  },
  tabActive: {
    backgroundColor: TAB_ACTIVE_BG,
  },
  tabInactive: {
    backgroundColor: TAB_INACTIVE_BG,
    borderWidth: 1,
    borderColor: TAB_INACTIVE_BORDER,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    paddingBottom: 16,
  },
  summaryCard: {},
  summaryTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  summaryPara: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 20,
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
    lineHeight: 18,
  },
  transcriptCard: {},
  miniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  miniScrubber: {
    flex: 1,
  },
  miniScrubberTrack: {
    height: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  miniScrubberFill: {
    height: '100%',
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 1.5,
  },
  miniTime: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: 'Satoshi-Regular',
  },
  transcriptBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  wordWrap: {
    borderRadius: 2,
    paddingHorizontal: 1,
  },
  transcriptWord: {
    fontSize: 12,
    color: '#111827',
    fontFamily: 'Satoshi-Regular',
  },
  transcriptWordFiller: {
    color: FILLER_COLOR,
  },
})

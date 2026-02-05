import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Title, Body, Meta } from './typography'
import { StructuredSummary } from '../types'

interface SummaryDisplayProps {
  summary: StructuredSummary
}

export default function SummaryDisplay({ summary }: SummaryDisplayProps) {
  const { one_line, key_takeaways, context, confidence_notes } = summary

  return (
    <View style={styles.container}>
      {/* One-line summary - prominently displayed */}
      <View style={styles.oneLineContainer}>
        <Title style={styles.oneLineText}>{one_line}</Title>
      </View>

      {/* Key takeaways - as bullets with good spacing */}
      {key_takeaways.length > 0 && (
        <View style={styles.takeawaysContainer}>
          {key_takeaways.map((takeaway, index) => (
            <View key={index} style={styles.takeawayItem}>
              <View style={styles.bullet} />
              <Body style={styles.takeawayText}>{takeaway}</Body>
            </View>
          ))}
        </View>
      )}

      {/* Context - secondary text if present */}
      {context && (
        <View style={styles.contextContainer}>
          <Meta style={styles.contextLabel}>Context</Meta>
          <Body style={styles.contextText}>{context}</Body>
        </View>
      )}

      {/* Confidence notes footer - calm, only if applicable */}
      {(confidence_notes.possible_missed_words ||
        confidence_notes.mixed_language_detected ||
        confidence_notes.noisy_audio_suspected) && (
        <View style={styles.confidenceFooter}>
          <Meta style={styles.confidenceText}>
            {confidence_notes.reason || 'Some details may be unclear.'}
          </Meta>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  oneLineContainer: {
    marginBottom: 24, // --space-6
  },
  oneLineText: {
    fontSize: 20, // --font-size-lg
    color: '#111827', // --color-text-primary
    lineHeight: 28,
    fontWeight: '600',
  },
  takeawaysContainer: {
    marginBottom: 24, // --space-6
    gap: 16, // --space-4
  },
  takeawayItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12, // --space-3
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB', // --color-accent-primary
    marginTop: 8,
    flexShrink: 0,
  },
  takeawayText: {
    flex: 1,
    color: '#111827', // --color-text-primary
    fontSize: 14, // --font-size-sm
    lineHeight: 22,
  },
  contextContainer: {
    marginBottom: 24, // --space-6
    paddingTop: 16, // --space-4
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // --color-border-default
  },
  contextLabel: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 12, // --font-size-xs
    fontWeight: '600',
    marginBottom: 8, // --space-2
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contextText: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 14, // --font-size-sm
    lineHeight: 20,
  },
  confidenceFooter: {
    paddingTop: 16, // --space-4
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9', // --color-border-subtle
  },
  confidenceText: {
    color: '#6B7280', // --color-text-secondary
    fontSize: 12, // --font-size-xs
    lineHeight: 16,
    fontStyle: 'italic',
  },
})

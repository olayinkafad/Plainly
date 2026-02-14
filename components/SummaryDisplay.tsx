import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Title, Body, Meta } from './typography'
import { StructuredSummary } from '../types'
import { themeLight } from '../constants/theme'

interface SummaryDisplayProps {
  summary: StructuredSummary
}

export default function SummaryDisplay({ summary }: SummaryDisplayProps) {
  const { one_line, key_takeaways, context, confidence_notes } = summary

  return (
    <View style={styles.container}>
      {/* One-line summary */}
      <View style={styles.oneLineContainer}>
        <Title style={styles.oneLineText}>{one_line}</Title>
      </View>

      {/* Key takeaways */}
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

      {/* Context */}
      {context && (
        <View style={styles.contextContainer}>
          <Meta style={styles.contextLabel}>Context</Meta>
          <Body style={styles.contextText}>{context}</Body>
        </View>
      )}

      {/* Confidence notes footer */}
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
    marginBottom: 16,
  },
  oneLineText: {
    fontSize: 24,
    color: themeLight.textPrimary,
    lineHeight: 34,
  },
  takeawaysContainer: {
    marginBottom: 16,
    gap: 16,
  },
  takeawayItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeLight.accent,
    marginTop: 10,
    flexShrink: 0,
  },
  takeawayText: {
    flex: 1,
    color: themeLight.textPrimary,
    fontSize: 16,
    lineHeight: 26,
  },
  contextContainer: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: themeLight.border,
  },
  contextLabel: {
    color: themeLight.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contextText: {
    color: themeLight.textSecondary,
    fontSize: 16,
    lineHeight: 26,
  },
  confidenceFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: themeLight.borderSubtle,
  },
  confidenceText: {
    color: themeLight.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
})

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Meta } from './typography'
import { StructuredSummary } from '../types'
import { themeLight } from '../constants/theme'

interface SummaryDisplayProps {
  summary: StructuredSummary
}

export default function SummaryDisplay({ summary }: SummaryDisplayProps) {
  const { gist, key_points, follow_ups, confidence_notes } = summary

  return (
    <View style={styles.container}>
      {/* Gist */}
      <Text style={styles.gistText}>{gist}</Text>

      {/* Key Points */}
      {key_points.length > 0 && (
        <View style={styles.keyPointsContainer}>
          {key_points.map((point, index) => (
            <View key={index} style={[styles.keyPointRow, index > 0 && styles.keyPointSpacing]}>
              <View style={styles.keyPointBullet} />
              <Text style={styles.keyPointText}>
                <Text style={styles.keyPointLead}>{point.lead}</Text>
                {point.detail ? ` \u2014 ${point.detail}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Follow-ups */}
      {follow_ups && follow_ups.length > 0 && (
        <View style={styles.followUpsContainer}>
          <View style={styles.followUpsTag}>
            <Text style={styles.followUpsTagText}>FOLLOW-UPS</Text>
          </View>
          <View style={styles.followUpsList}>
            {follow_ups.map((item, index) => (
              <View key={index} style={[styles.followUpRow, index > 0 && styles.followUpSpacing]}>
                <View style={styles.followUpCircle} />
                <Text style={styles.followUpText}>{item}</Text>
              </View>
            ))}
          </View>
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

  // Gist
  gistText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: themeLight.textPrimary,
  },

  // Key Points
  keyPointsContainer: {
    marginTop: 16,
    paddingLeft: 20,
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  keyPointSpacing: {
    marginTop: 10,
  },
  keyPointBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeLight.accent,
    marginTop: 9,
    flexShrink: 0,
  },
  keyPointText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: themeLight.textPrimary,
    marginLeft: 14,
  },
  keyPointLead: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Follow-ups
  followUpsContainer: {
    marginTop: 24,
  },
  followUpsTag: {
    alignSelf: 'flex-start',
    backgroundColor: themeLight.accent,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  followUpsTagText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  followUpsList: {
    marginTop: 8,
    paddingLeft: 20,
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  followUpSpacing: {
    marginTop: 8,
  },
  followUpCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E8E0D8',
    marginTop: 4,
    flexShrink: 0,
  },
  followUpText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    lineHeight: 24,
    color: themeLight.textPrimary,
    marginLeft: 14,
  },

  // Confidence footer
  confidenceFooter: {
    paddingTop: 16,
    marginTop: 16,
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

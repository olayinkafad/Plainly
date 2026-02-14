import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Body, Meta } from './typography'
import { StructuredActionItems } from '../types'
import { themeLight } from '../constants/theme'

interface ActionItemsDisplayProps {
  actionItems: StructuredActionItems
}

export default function ActionItemsDisplay({ actionItems }: ActionItemsDisplayProps) {
  const { items, none_found, confidence_notes } = actionItems

  // Empty state
  if (none_found || items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Body style={styles.emptyStateText}>No clear action items found.</Body>
        </View>
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
      </View>
    )
  }

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

      {/* Action items checklist */}
      <View style={styles.itemsContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.item}>
            {/* Checkbox */}
            <View style={styles.checkbox}>
              <View style={styles.checkboxInner} />
            </View>
            
            {/* Task content */}
            <View style={styles.itemContent}>
              <Body style={styles.taskText}>{item.task}</Body>
              
              {/* Metadata row */}
              {(item.owner || item.due || item.details) && (
                <View style={styles.metadataRow}>
                  {item.owner && (
                    <View style={styles.metadataItem}>
                      <Meta style={styles.metadataLabel}>Owner:</Meta>
                      <Meta style={styles.metadataValue}>
                        {item.owner === 'unclear' ? 'Unclear' : item.owner}
                      </Meta>
                    </View>
                  )}
                  {item.due && (
                    <View style={styles.metadataItem}>
                      <Meta style={styles.metadataLabel}>Due:</Meta>
                      <Meta style={styles.metadataValue}>
                        {item.due === 'unclear' ? 'Unclear' : item.due}
                      </Meta>
                    </View>
                  )}
                </View>
              )}
              
              {/* Details */}
              {item.details && (
                <Meta style={styles.detailsText}>{item.details}</Meta>
              )}
            </View>
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
  emptyState: {
    paddingVertical: 48, // --space-12
    paddingHorizontal: 24, // --space-6
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14, // --font-size-sm
    color: themeLight.textSecondary,
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: '#FFF8E6',
    padding: 12, // --space-3
    borderRadius: 8, // --radius-md
    marginBottom: 16, // --space-4
    borderLeftWidth: 3,
    borderLeftColor: '#D97706', // --color-warning
  },
  warningText: {
    color: '#92400E', // Darker warning text
    fontSize: 12, // --font-size-xs
    lineHeight: 16,
  },
  itemsContainer: {
    gap: 16, // --space-4
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0, // Gap handles spacing
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: themeLight.accent,
    marginRight: 12, // --space-3
    marginTop: 2, // Align with first line of text
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: 'transparent', // Unchecked state
  },
  itemContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 14, // --font-size-sm
    color: themeLight.textPrimary,
    lineHeight: 22,
    marginBottom: 4, // --space-1
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4, // --space-1
    gap: 12, // --space-3
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // --space-1
  },
  metadataLabel: {
    fontSize: 12, // --font-size-xs
    color: themeLight.textSecondary,
    fontWeight: '600', // --font-weight-semibold
  },
  metadataValue: {
    fontSize: 12, // --font-size-xs
    color: themeLight.textSecondary,
  },
  detailsText: {
    fontSize: 12, // --font-size-xs
    color: themeLight.textSecondary,
    marginTop: 4, // --space-1
    lineHeight: 18,
    fontStyle: 'italic',
  },
})

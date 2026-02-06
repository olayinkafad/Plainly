export type OutputType = 
  | 'action_items'
  | 'summary'
  | 'transcript'

export interface TranscriptSegment {
  speaker: string
  text: string
  start: number // Start time in seconds
  end: number // End time in seconds
}

export interface TranscriptConfidenceNotes {
  possible_missed_words: boolean
  mixed_language_detected: boolean
  noisy_audio_suspected: boolean
  reason: string | null
}

export interface StructuredTranscript {
  format: 'transcript'
  language_detected: string
  speaker_separation: 'provided' | 'not_available'
  segments: TranscriptSegment[]
  confidence_notes: TranscriptConfidenceNotes
}

export type TranscriptOutput = string | StructuredTranscript

export interface SummaryConfidenceNotes {
  possible_missed_words: boolean
  mixed_language_detected: boolean
  noisy_audio_suspected: boolean
  reason: string | null
}

export interface StructuredSummary {
  format: 'summary'
  language_detected: string
  one_line: string
  key_takeaways: string[]
  context: string | null
  confidence_notes: SummaryConfidenceNotes
}

export type SummaryOutput = string | StructuredSummary

export interface ActionItemConfidenceNotes {
  possible_missed_words: boolean
  mixed_language_detected: boolean
  noisy_audio_suspected: boolean
  reason: string | null
}

export interface ActionItem {
  task: string
  owner: string | 'unclear' | null
  due: string | 'unclear' | null
  details: string | null
}

export interface StructuredActionItems {
  format: 'action_items'
  language_detected: string
  none_found: boolean
  items: ActionItem[]
  confidence_notes: ActionItemConfidenceNotes
}

export type ActionItemsOutput = string | StructuredActionItems

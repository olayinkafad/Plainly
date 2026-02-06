import AsyncStorage from '@react-native-async-storage/async-storage'
import { OutputType, TranscriptOutput, SummaryOutput, ActionItemsOutput } from '../types'

export interface Recording {
  id: string
  title: string
  createdAt: number
  durationSec: number
  audioBlobUrl: string
  outputs: {
    summary?: SummaryOutput
    action_items?: ActionItemsOutput
    transcript?: TranscriptOutput
  }
  lastViewedFormat?: OutputType
}

const STORAGE_KEY = '@plainly_recordings'

// In-memory cache for performance
let recordingsCache: Recording[] | null = null

export const recordingsStore = {
  getAll: async (): Promise<Recording[]> => {
    if (recordingsCache) {
      return [...recordingsCache].sort((a, b) => b.createdAt - a.createdAt)
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY)
      const recordings = data ? JSON.parse(data) : []
      recordingsCache = recordings
      return [...recordings].sort((a, b) => b.createdAt - a.createdAt)
    } catch (error) {
      console.error('Failed to load recordings:', error)
      return []
    }
  },

  getById: async (id: string): Promise<Recording | undefined> => {
    const recordings = await recordingsStore.getAll()
    return recordings.find((r) => r.id === id)
  },

  add: async (recording: Recording): Promise<void> => {
    try {
      const recordings = await recordingsStore.getAll()
      recordings.push(recording)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recordings))
      recordingsCache = recordings
    } catch (error) {
      console.error('Failed to save recording:', error)
    }
  },

  update: async (id: string, updates: Partial<Recording>): Promise<void> => {
    try {
      const recordings = await recordingsStore.getAll()
      const index = recordings.findIndex((r) => r.id === id)
      if (index !== -1) {
        recordings[index] = { ...recordings[index], ...updates }
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recordings))
        recordingsCache = recordings
      }
    } catch (error) {
      console.error('Failed to update recording:', error)
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      const recordings = await recordingsStore.getAll()
      const filtered = recordings.filter((r) => r.id !== id)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
      recordingsCache = filtered
    } catch (error) {
      console.error('Failed to delete recording:', error)
    }
  },

  // Clear cache (useful for testing or forced refresh)
  clearCache: (): void => {
    recordingsCache = null
  },

  // TODO: Future pinned sorting
  // When implementing pinned:
  // - Add isPinned field to Recording interface
  // - Update sorting to show pinned first (most recent pinned), then recents
  // - Sorting logic: pinned.sort((a, b) => b.createdAt - a.createdAt), then unpinned.sort(...)
}

import { useState, useEffect } from 'react'
import { View, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from './AppHeader'
import EmptyState from './EmptyState'
import RecordingList from './RecordingList'
import { recordingsStore, Recording } from '../store/recordings'

export default function AppPage() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    loadRecordings()
  }, [])

  const loadRecordings = async () => {
    try {
      const allRecordings = await recordingsStore.getAll()
      setRecordings(allRecordings)
    } catch (error) {
      console.error('Failed to load recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecord = () => {
    // TODO: Open recording modal
    console.log('Record button pressed')
  }

  const handleUpload = () => {
    // TODO: Open file picker
    console.log('Upload button pressed')
  }

  const handleSelectRecording = (id: string) => {
    router.push(`/app/recordings/${id}`)
  }

  const handleMenuClick = (id: string) => {
    // TODO: Open actions sheet
    console.log('Menu clicked for recording:', id)
  }

  // Refresh recordings when component comes into focus
  useEffect(() => {
    const interval = setInterval(loadRecordings, 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <View className="flex-1 bg-bg-primary items-center justify-center">
        {/* Loading state - can add a spinner later */}
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-bg-primary"
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <View className="flex-1 max-w-[420px] mx-auto w-full px-4">
        <AppHeader />
        
        {recordings.length === 0 ? (
          <EmptyState onRecord={handleRecord} onUpload={handleUpload} />
        ) : (
          <RecordingList
            recordings={recordings}
            onSelect={handleSelectRecording}
            onMenuClick={handleMenuClick}
          />
        )}
      </View>
    </ScrollView>
  )
}

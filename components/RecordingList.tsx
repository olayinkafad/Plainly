import { View, Text, Pressable } from 'react-native'
import { Recording } from '../store/recordings'
import RecordingRow from './RecordingRow'
import { format } from 'date-fns'

interface RecordingListProps {
  recordings: Recording[]
  onSelect: (id: string) => void
  onMenuClick: (id: string) => void
}

export default function RecordingList({ recordings, onSelect, onMenuClick }: RecordingListProps) {
  return (
    <View className="gap-4">
      <Text className="text-lg font-semibold text-text-primary">Recordings</Text>
      <View className="gap-3">
        {recordings.map((recording) => (
          <RecordingRow
            key={recording.id}
            recording={recording}
            onSelect={onSelect}
            onMenuClick={onMenuClick}
          />
        ))}
      </View>
    </View>
  )
}

import { View, Text, Pressable } from 'react-native'
import { Mic, MoreHorizontal } from 'lucide-react-native'
import { Recording } from '../store/recordings'
import { format } from 'date-fns'
import { themeLight } from '../constants/theme'

interface RecordingRowProps {
  recording: Recording
  onSelect: (id: string) => void
  onMenuClick: (id: string) => void
}

export default function RecordingRow({
  recording,
  onSelect,
  onMenuClick,
}: RecordingRowProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${month} ${day} · ${time}`
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <View className="flex-row items-center gap-4 p-4 bg-bg-primary border border-border-default rounded-md">
      {/* Left: Icon */}
      <View className="flex-shrink-0">
        <View className="w-10 h-10 rounded-full bg-bg-secondary items-center justify-center">
          <Mic size={20} color="#9CA3AF" />
        </View>
      </View>

      {/* Middle: Title and meta */}
      <Pressable
        onPress={() => onSelect(recording.id)}
        className="flex-1 min-w-0"
      >
        <Text className="text-sm font-medium text-text-primary mb-1" numberOfLines={1}>
          {recording.title}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-text-secondary">
            {formatDate(recording.createdAt)}
          </Text>
          <Text className="text-xs text-text-tertiary">·</Text>
          <Text className="text-xs text-text-secondary">
            {formatDuration(recording.durationSec)}
          </Text>
        </View>
      </Pressable>

      {/* Right: Menu button */}
      <Pressable
        onPress={() => onMenuClick(recording.id)}
        className="flex-shrink-0"
        style={{ minWidth: 44, minHeight: 44 }}
      >
        <MoreHorizontal size={20} color={themeLight.textSecondary} />
      </Pressable>
    </View>
  )
}

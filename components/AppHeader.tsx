import { View, Text } from 'react-native'

export default function AppHeader() {
  return (
    <View className="pt-6 pb-4">
      <View className="max-w-[420px] mx-auto px-4">
        <Text className="text-lg font-semibold text-text-primary">Plainly</Text>
      </View>
    </View>
  )
}

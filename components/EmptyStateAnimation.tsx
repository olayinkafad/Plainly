import LottieView from 'lottie-react-native'
import { View, StyleSheet } from 'react-native'

interface EmptyStateAnimationProps {
  size?: 'default' | 'small'
}

export default function EmptyStateAnimation({ size = 'default' }: EmptyStateAnimationProps) {
  const dim = size === 'small' ? 64 : 80
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/mute.json')}
        style={{ width: dim, height: dim }}
        autoPlay
        loop
        speed={0.8}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
})

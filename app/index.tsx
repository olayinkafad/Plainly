import { useEffect, useState } from 'react'
import { View, StyleSheet, AccessibilityInfo } from 'react-native'
import { useRouter } from 'expo-router'
import Button from '../components/Button'
import { Title, Body, Meta } from '../components/typography'
import { recordingsStore } from '../store/recordings'

export default function Index() {
  const router = useRouter()
  const [hasRecordings, setHasRecordings] = useState<boolean | null>(null)

  // Check if user has recordings (returning user) and redirect to home
  useEffect(() => {
    const checkRecordings = async () => {
      try {
        const recordings = await recordingsStore.getAll()
        if (recordings.length > 0) {
          // Returning user - go directly to home
          router.replace('/home')
        } else {
          // First-time user - show launch screen
          setHasRecordings(false)
        }
      } catch (error) {
        console.error('Failed to check recordings:', error)
        // On error, show launch screen
        setHasRecordings(false)
      }
    }
    checkRecordings()
  }, [])

  // Don't render launch screen if checking recordings or if returning user
  if (hasRecordings === null) {
    return null // Still checking
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Title style={styles.logoText}>P</Title>
        </View>
        
        <View style={styles.textContainer}>
          <Title style={styles.title}>
            Speak your thoughts. Get clarity back.
          </Title>
          <Body style={styles.subtitle}>
            Plainly turns voice notes into summaries, action points, and transcripts.
          </Body>
        </View>

        <View style={styles.buttonContainer}>
          <Button variant="primary" fullWidth onPress={() => router.push('/onboarding')}>
            Get started for free
          </Button>
          <Meta style={styles.reassurance}>No sign-up required</Meta>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#111827',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6B7280',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  reassurance: {
    marginTop: 12,
    textAlign: 'center',
  },
})

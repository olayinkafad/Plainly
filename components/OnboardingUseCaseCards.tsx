import { View, StyleSheet } from 'react-native'
import Icon from './Icon'
import { Title, Body } from './typography'

const CARD_ICON_BG = {
  meetings: '#DBEAFE',   // soft blue
  ideas: '#FEF3C7',     // warm yellow
  reflections: '#D1FAE5', // green
  todos: '#FCE7F3',     // pink
} as const

const CARD_ICON_COLOR = {
  meetings: '#2563EB',
  ideas: '#B45309',
  reflections: '#047857',
  todos: '#BE185D',
} as const

const cards: {
  key: keyof typeof CARD_ICON_BG
  icon: string
  label: string
  description: string
}[] = [
  {
    key: 'meetings',
    icon: 'users',
    label: 'Meetings',
    description: 'Capture what was said without taking notes',
  },
  {
    key: 'ideas',
    icon: 'sparkle',
    label: 'Ideas',
    description: 'Get it down before you forget',
  },
  {
    key: 'reflections',
    icon: 'plant',
    label: 'Reflections',
    description: 'Think out loud and make sense of it later',
  },
  {
    key: 'todos',
    icon: 'check',
    label: 'To-dos',
    description: 'Say it, and Plainly writes it down for you',
  },
]

export default function OnboardingUseCaseCards() {
  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <View key={card.key} style={styles.card}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: CARD_ICON_BG[card.key] },
            ]}
          >
            <Icon
              name={card.icon as 'users' | 'sparkle' | 'plant' | 'check'}
              size={22}
              color={CARD_ICON_COLOR[card.key]}
            />
          </View>
          <Title style={styles.label}>{card.label}</Title>
          <Body style={styles.description}>{card.description}</Body>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
})

# React Native Expo Migration - Installation Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- iOS Simulator (for Mac) or Android Studio (for Android development)
- Expo Go app on your phone (optional, for testing)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install all the Expo and React Native dependencies including:
- Expo SDK ~50.0.0
- Expo Router for navigation
- NativeWind for styling
- expo-av for audio recording
- And all other required packages

### 2. Start the Development Server

```bash
npm start
```

This will:
- Start the Metro bundler
- Open Expo DevTools in your browser
- Show a QR code for testing on physical devices

### 3. Run on iOS Simulator (Mac only)

```bash
npm run ios
```

Or press `i` in the terminal after `npm start`

### 4. Run on Android Emulator

```bash
npm run android
```

Or press `a` in the terminal after `npm start`

### 5. Run on Web (for testing)

```bash
npm run web
```

Or press `w` in the terminal after `npm start`

## Project Structure

```
Plainly/
├── app/                    # Expo Router routes
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Launch screen (/)
│   ├── onboarding.tsx      # Onboarding carousel (/onboarding)
│   └── app.tsx             # Main app screen (/app)
├── components/             # React Native components
│   ├── Button.tsx          # ✅ Migrated
│   ├── EmptyState.tsx      # ✅ Migrated
│   ├── LaunchScreen.tsx    # ✅ Migrated
│   └── ...                 # More components to migrate
├── store/                  # State management
│   └── recordings.ts       # ✅ Updated for AsyncStorage
├── lib/                    # Utilities
│   └── utils.ts            # cn() helper for className
├── global.css              # NativeWind styles
├── tailwind.config.js      # NativeWind config
├── metro.config.js         # Metro bundler config
├── babel.config.js         # Babel config with NativeWind
└── app.json                # Expo configuration
```

## Migration Status

See `MIGRATION_STATUS.md` for detailed status of component migrations.

## Key Differences from Next.js

### Components
- `<div>` → `<View>`
- `<button>` → `<Pressable>`
- `<p>`, `<span>` → `<Text>`
- `onClick` → `onPress`

### Navigation
- `next/navigation` → `expo-router`
- File-based routing (same concept, different implementation)

### Styling
- Tailwind classes work the same with NativeWind
- Use `cn()` utility for conditional classes
- No hover states (use `Pressable` with `style` prop)

### State
- AsyncStorage instead of in-memory arrays
- All store methods are async

## Troubleshooting

### Metro bundler issues
```bash
# Clear cache
npx expo start -c
```

### NativeWind not working
- Make sure `babel.config.js` includes `nativewind/babel`
- Check `metro.config.js` includes NativeWind preset
- Restart Metro bundler

### TypeScript errors
- Run `npx expo install --fix` to ensure compatible versions
- Check `tsconfig.json` extends `expo/tsconfig.base`

### Audio recording not working
- Check app permissions in `app.json`
- Ensure expo-av is properly installed
- See audio migration notes in `MIGRATION_STATUS.md`

## Next Steps

1. Complete remaining component migrations
2. Migrate audio recording to expo-av
3. Test on physical devices
4. Handle file storage for audio recordings
5. Update API integration if needed

## Resources

- [Expo Docs](https://docs.expo.dev/)
- [NativeWind Docs](https://www.nativewind.dev/)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [React Native Docs](https://reactnative.dev/)

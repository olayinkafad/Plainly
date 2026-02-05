# Migration Status: Next.js → React Native Expo

## ✅ Completed

### Project Setup
- [x] Expo configuration (`app.json`)
- [x] Metro config with NativeWind
- [x] Tailwind config for NativeWind
- [x] Babel config
- [x] TypeScript config
- [x] Global CSS setup
- [x] Utility functions (`lib/utils.ts`)

### Dependencies
- [x] Updated `package.json` with Expo dependencies
- [x] NativeWind configured
- [x] Safe area context setup

### Components Migrated
- [x] `Button.tsx` - React Native with Pressable
- [x] `EmptyState.tsx` - React Native with Animated
- [x] `AppHeader.tsx` - React Native
- [x] `LaunchScreen.tsx` - React Native with ScrollView

### State Management
- [x] `store/recordings.ts` - Updated to use AsyncStorage
- [x] Async operations for all store methods

### Routing
- [x] `app/_layout.tsx` - Expo Router root layout
- [x] `app/index.tsx` - Launch screen route
- [x] `app/onboarding.tsx` - Onboarding route
- [x] `app/app.tsx` - Main app route

## 🚧 In Progress

### Components to Migrate
- [ ] `OnboardingCarousel.tsx`
- [ ] `RecordingModal.tsx`
- [ ] `VoiceRecorder.tsx` (needs expo-av migration)
- [ ] `ReviewFormatModal.tsx`
- [ ] `ProcessingState.tsx`
- [ ] `RecordingList.tsx`
- [ ] `RecordingRow.tsx`
- [ ] `StickyAudioPlayer.tsx` (needs expo-av)
- [ ] `FormatSwitcher.tsx`
- [ ] `ContentDisplay.tsx`
- [ ] `RecordingActionsSheet.tsx`
- [ ] `FileUpload.tsx` (needs expo-document-picker)
- [ ] `ResultDisplay.tsx`

### Routes to Create
- [ ] `app/app/recordings/[id].tsx` - Recording detail screen

### Audio Recording
- [ ] Migrate from MediaRecorder to expo-av
- [ ] Update audio playback to use expo-av
- [ ] Handle audio file storage

### API Integration
- [ ] Update API calls for React Native (fetch works, but may need adjustments)
- [ ] Handle file uploads with FormData

## 📋 Next Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run the App**
   ```bash
   npm start
   # Then press 'i' for iOS or 'a' for Android
   ```

3. **Continue Component Migration**
   - Start with OnboardingCarousel
   - Then RecordingModal and VoiceRecorder
   - Then library components

4. **Test Audio Recording**
   - Set up expo-av permissions
   - Test recording flow
   - Test playback

5. **Handle File Storage**
   - Decide on audio file storage strategy
   - Update Recording interface if needed
   - Update file upload/download

## 🔧 Key Changes Made

### HTML → React Native
- `<div>` → `<View>`
- `<button>` → `<Pressable>`
- `<p>`, `<span>`, `<h1>` → `<Text>`
- `onClick` → `onPress`
- `className` → `className` (NativeWind)

### Styling
- Removed web-specific CSS (hover, cursor)
- Added `Pressable` with `style` prop for press feedback
- Used `Animated` API for animations
- Safe area insets for iOS

### Navigation
- `next/navigation` → `expo-router`
- `useRouter()` works similarly
- Routes use file-based routing

### State
- In-memory array → AsyncStorage
- All store methods are now async
- Added cache for performance

## ⚠️ Known Issues

1. **Audio Recording**: Needs complete rewrite with expo-av
2. **File Upload**: Needs expo-document-picker integration
3. **File Storage**: Audio blob URLs need to be replaced with file system paths
4. **API Routes**: Next.js API routes won't work - need separate backend or adjust approach
5. **Some Components**: Still have web-specific code that needs removal

## 📝 Notes

- All components should use `cn()` utility for className merging
- Use `useSafeAreaInsets()` for safe area handling
- Use `Animated` API for animations instead of CSS transitions
- File paths use `@/` alias (configured in tsconfig.json)

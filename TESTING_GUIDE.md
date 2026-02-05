# Testing Guide - React Native Expo Migration

## Quick Start Testing

### Step 1: Install Dependencies

First, you need to install the new Expo dependencies:

```bash
npm install
```

This will install all the React Native Expo packages. It may take a few minutes.

### Step 2: Start the Development Server

```bash
npm start
```

This will:
- Start the Metro bundler
- Open Expo DevTools in your browser
- Show a QR code for testing

### Step 3: Choose Your Testing Platform

After running `npm start`, you'll see options in the terminal:

**Option A: Test on iOS Simulator (Mac only)**
```bash
# Press 'i' in the terminal, or run:
npm run ios
```

**Option B: Test on Android Emulator**
```bash
# Press 'a' in the terminal, or run:
npm run android
```

**Option C: Test on Web Browser**
```bash
# Press 'w' in the terminal, or run:
npm run web
```

**Option D: Test on Physical Device**
1. Install "Expo Go" app on your iPhone or Android phone
2. Scan the QR code shown in the terminal
3. The app will load on your device

## What to Test

### ✅ What Should Work (Migrated Components)

1. **Launch Screen** (`/`)
   - Should show "Let AI turn your voice notes into clarity"
   - "Get started" button should be visible
   - Logo with "P" should appear at top
   - Tapping "Get started" should navigate to onboarding

2. **Onboarding Carousel** (`/onboarding`)
   - Should show 4 slides with progress indicators at top
   - Should be able to swipe left/right between slides
   - Progress bars should update as you swipe
   - "Start using Plainly" button should be visible at bottom
   - Tapping button should navigate to `/app`

3. **Main App Screen** (`/app`)
   - Should show "Record your first voice note" message
   - Should show illustration (mic → text)
   - "Record" and "Upload recording" buttons should be visible
   - ⚠️ Buttons won't work yet (components not fully migrated)

### ⚠️ What Won't Work Yet (Not Migrated)

- Recording functionality (needs expo-av migration)
- File upload (needs expo-document-picker)
- Recording list (components not migrated)
- Detail screens (not migrated)
- Audio playback (needs expo-av)

## Troubleshooting

### Issue: "Command not found: expo"

**Solution:** Use npx instead:
```bash
npx expo start
```

Or install Expo CLI globally:
```bash
npm install -g expo-cli
```

### Issue: "Cannot find module" errors

**Solution:** Clear cache and reinstall:
```bash
rm -rf node_modules
npm install
npx expo start -c
```

### Issue: NativeWind styles not working

**Solution:** 
1. Make sure `babel.config.js` includes `nativewind/babel`
2. Restart Metro bundler with cache clear:
```bash
npx expo start -c
```

### Issue: TypeScript errors

**Solution:**
```bash
npx expo install --fix
```

This ensures all Expo packages are compatible versions.

### Issue: iOS Simulator not opening

**Solution:**
1. Make sure Xcode is installed (Mac only)
2. Open Xcode and accept license agreements
3. Run: `xcode-select --install` if needed
4. Try: `npm run ios` again

### Issue: Android Emulator not opening

**Solution:**
1. Make sure Android Studio is installed
2. Create an Android Virtual Device (AVD) in Android Studio
3. Start the emulator from Android Studio first
4. Then run: `npm run android`

## Testing Checklist

### Navigation Flow
- [ ] Launch screen loads correctly
- [ ] "Get started" button navigates to onboarding
- [ ] Onboarding carousel shows all 4 slides
- [ ] Can swipe between slides
- [ ] Progress indicators update correctly
- [ ] "Start using Plainly" button navigates to app
- [ ] App screen shows empty state

### Visual/UI
- [ ] All text is readable
- [ ] Buttons are properly styled
- [ ] Colors match design tokens
- [ ] Layout looks correct on mobile
- [ ] Safe area insets work (no content under notch)

### Performance
- [ ] App loads quickly
- [ ] Navigation is smooth
- [ ] No console errors
- [ ] No red error screens

## Expected Console Output

When you run `npm start`, you should see:

```
Starting Metro Bundler
Metro waiting on exp://192.168.x.x:8081
Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press ? │ show all commands
```

## Next Steps After Testing

Once you confirm the migrated components work:

1. **Continue Migration**: Migrate remaining components
2. **Fix Issues**: Address any bugs found during testing
3. **Audio Recording**: Migrate to expo-av (critical for core functionality)
4. **File Upload**: Add expo-document-picker integration
5. **Complete Routes**: Migrate detail screens and library views

## Need Help?

- Check `MIGRATION_STATUS.md` for what's been migrated
- Check `README_MIGRATION.md` for setup details
- Expo Docs: https://docs.expo.dev/
- NativeWind Docs: https://www.nativewind.dev/

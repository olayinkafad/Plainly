# How to Run Expo on iOS Simulator

## Step-by-Step Instructions

### Step 1: Install Dependencies (if not done)

```bash
cd /Users/olayinka/Documents/Plainly
npm install
```

This installs all Expo and React Native packages. Wait for it to complete.

### Step 2: Start Expo Development Server

```bash
npm start
```

Or if that doesn't work:

```bash
npx expo start
```

You should see:
- Metro bundler starting
- A QR code
- Options to press 'i' for iOS, 'a' for Android, 'w' for web

### Step 3: Open iOS Simulator

**Option A: From the Expo terminal**
- After `npm start`, simply press `i` in the terminal
- This will automatically open iOS Simulator and load your app

**Option B: Manual command**
- In a new terminal window, run:
```bash
npm run ios
```

**Option C: Open Simulator first, then start Expo**
1. Open Xcode
2. Go to: Xcode → Open Developer Tool → Simulator
3. Choose an iPhone (e.g., iPhone 15 Pro)
4. Then run `npm start` and press `i`

### Step 4: First Time Setup (if needed)

If this is your first time running Expo:

1. **Accept Xcode License** (if prompted):
   ```bash
   sudo xcodebuild -license accept
   ```

2. **Install CocoaPods** (if needed):
   ```bash
   sudo gem install cocoapods
   ```

3. **Install iOS dependencies**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

   (Note: This step may not be needed for Expo managed workflow)

## Troubleshooting

### "Command not found: expo"
Use npx instead:
```bash
npx expo start
```

### "iOS Simulator not found"
1. Open Xcode
2. Go to Xcode → Settings → Locations
3. Make sure Command Line Tools is set to your Xcode version
4. Or run: `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`

### "Metro bundler failed to start"
Clear cache:
```bash
npx expo start -c
```

### "Cannot find module" errors
Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

### Simulator opens but app doesn't load
1. Check the terminal for error messages
2. Try reloading: Press `r` in the Expo terminal
3. Or shake the simulator device and select "Reload"

## Quick Commands Reference

```bash
# Start Expo
npm start

# Start and open iOS directly
npm run ios

# Clear cache and start
npx expo start -c

# Reload app (press 'r' in Expo terminal)
# Or shake simulator and tap "Reload"
```

## What You Should See

1. **Terminal**: Metro bundler running, QR code displayed
2. **iOS Simulator**: Opens automatically (or manually)
3. **App**: Your Plainly app loads in the simulator
4. **Launch Screen**: Should show "Let AI turn your voice notes into clarity"

## Next Steps

Once the app loads:
- Test navigation: Tap "Get started" → should go to onboarding
- Test onboarding: Swipe through the 4 slides
- Test app screen: Tap "Start using Plainly" → should show empty state

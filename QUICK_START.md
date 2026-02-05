# Quick Start - Run Your App

## You DON'T need Xcode open!

Close Xcode - you won't need it. Expo handles everything.

## Just run these commands in Terminal:

### Step 1: Go to your project folder
```bash
cd /Users/olayinka/Documents/Plainly
```

### Step 2: Install dependencies (first time only)
```bash
npm install
```

### Step 3: Start Expo and open iOS Simulator
```bash
npm run ios
```

That's it! The iOS Simulator will open automatically and your app will load.

## What will happen:

1. Terminal will show: "Starting Metro Bundler..."
2. iOS Simulator will open automatically (you'll see an iPhone screen)
3. Your Plainly app will load in the simulator
4. You'll see the launch screen with "Let AI turn your voice notes into clarity"

## If you see errors:

**"npm: command not found"**
- Make sure Node.js is installed
- Try: `which node` to check

**"Cannot find module"**
```bash
rm -rf node_modules
npm install
npm run ios
```

**"Expo CLI not found"**
```bash
npx expo start --ios
```

**Simulator doesn't open**
- Wait a bit - it takes time on first run
- Or manually open: Xcode → Open Developer Tool → Simulator
- Then run `npm start` and press `i`

## That's it!

You don't need to:
- ❌ Create a project in Xcode
- ❌ Open Xcode at all
- ❌ Configure anything in Xcode

Just run `npm run ios` from Terminal!

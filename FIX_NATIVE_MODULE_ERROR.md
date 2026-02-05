# Fix: "Cannot find native module 'ExpoLinking'" and "main has not been registered"

## Issues Fixed

1. ✅ Installed `expo-linking` (required by expo-router)
2. ✅ Fixed CSS import path in `app/_layout.tsx`
3. ✅ Removed native directories (using managed workflow)

## Next Steps

### 1. Stop All Expo Processes

```bash
# Kill any running Expo processes
pkill -f expo
# Or press Ctrl+C in all terminal windows
```

### 2. Clear All Caches

```bash
cd /Users/olayinka/Documents/Plainly
rm -rf .expo node_modules/.cache
npm cache clean --force
```

### 3. Restart Expo with Clean Cache

```bash
npx expo start -c --ios
```

## If Error Persists

The "main has not been registered" error usually means:
- An import error is preventing the app from loading
- Native modules aren't properly linked
- Metro bundler cache is stale

### Try This:

1. **Check for import errors** in the terminal output
2. **Verify App.tsx exists** and contains: `import 'expo-router/entry'`
3. **Check app/_layout.tsx** imports are correct
4. **Restart Metro** with: `npx expo start -c`

## Alternative: Use Development Build

If managed workflow continues to have issues, you might need a development build:

```bash
npx expo prebuild
npx expo run:ios
```

But try the cache clear first - that usually fixes it!

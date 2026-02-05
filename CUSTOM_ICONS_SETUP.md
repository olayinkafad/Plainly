# Custom Icons Setup Guide

This project uses Phosphor icons with `react-native-svg-transformer` for scalable, performant icon management.

## Setup Complete ✅

- ✅ `react-native-svg-transformer` added to devDependencies
- ✅ Metro config updated to handle SVG imports
- ✅ `components/Icon.tsx` created with icon registry
- ✅ Phosphor icons installed in `assets/icons/`
- ✅ TypeScript declarations added for SVG imports
- ✅ Helper script created for easy icon registration

## Icon Structure

Icons are located directly in:
```
assets/icons/
  arrow-left.svg
  plus.svg
  copy.svg
  ... (all SVG files in one folder)
```

## How to Add Icons

### Method 1: Using the Helper Script (Recommended)

1. Run the script with icon names:
   ```bash
   node scripts/generate-icon-registry.js arrow-left plus copy share
   ```

2. Copy the output into `components/Icon.tsx` `iconRegistry`

### Method 2: Manual Registration

Open `components/Icon.tsx` and add to the `iconRegistry`:

```typescript
const iconRegistry: IconRegistry = {
  'arrow-left': {
    regular: require('../assets/icons/arrow-left.svg'),
  },
  'plus': {
    regular: require('../assets/icons/plus.svg'),
  },
}
```

### Step 3: Use Icon

```typescript
import Icon from '../components/Icon'

<Icon name="arrow-left" size={24} color="#111827" />
```

## Icon Props

- `name` (required): Icon name (without .svg extension)
- `size` (optional): Icon size in pixels (default: 24)
- `color` (optional): Icon color (default: '#111827')
- `variant` (optional): Icon variant - currently all icons use 'regular' since they're in a single folder (default: 'regular')
- `style` (optional): Additional View styles
- All other `SvgProps` are supported

## Example: Replacing Lucide Icons

**Before:**
```typescript
import { ArrowLeft, Plus } from 'lucide-react-native'
<ArrowLeft size={24} color="#111827" />
```

**After:**
```typescript
import Icon from '../components/Icon'
<Icon name="arrow-left" size={24} color="#111827" />
```

## Finding Icon Names

Icon names match the SVG filename (without extension). For example:
- File: `arrow-left.svg` → Use: `name="arrow-left"`
- File: `user-circle-plus.svg` → Use: `name="user-circle-plus"`

Browse available icons in: `assets/icons/`

## After Adding Icons

1. Register icons in `components/Icon.tsx` `iconRegistry`
2. Restart Metro bundler: `npx expo start --clear`
3. Icons will be available immediately

## Benefits

- ✅ Scalable: Easy to add new icons
- ✅ Type-safe: Full TypeScript support
- ✅ Performant: SVGs are optimized and bundled
- ✅ Flexible: Supports all SVG props
- ✅ Consistent: Single API for all icons

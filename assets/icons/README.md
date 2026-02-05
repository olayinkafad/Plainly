# Custom Icons

Place your custom SVG icon files in this directory.

## Usage

1. Add your SVG file (e.g., `arrow-left.svg`) to this directory
2. Update `components/Icon.tsx` to register the icon:
   ```typescript
   'arrow-left': require('../assets/icons/arrow-left.svg').default,
   ```
3. Use the icon in your components:
   ```typescript
   import Icon from '../components/Icon'
   
   <Icon name="arrow-left" size={24} color="#111827" />
   ```

## Icon Naming Convention

Use kebab-case for icon names:
- `arrow-left.svg` → `name="arrow-left"`
- `more-horizontal.svg` → `name="more-horizontal"`
- `plus.svg` → `name="plus"`

## SVG Requirements

- Use SVG format (`.svg` extension)
- Optimize SVGs for web/mobile (remove unnecessary metadata)
- Icons should use `fill` or `stroke` attributes (not both unless needed)
- The `color` prop will replace `fill` and `stroke` values

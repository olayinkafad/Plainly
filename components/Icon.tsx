import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { SvgProps } from 'react-native-svg'

interface IconProps extends Omit<SvgProps, 'width' | 'height'> {
  name: string
  size?: number
  color?: string
  style?: ViewStyle
  variant?: 'regular' | 'bold' | 'fill' | 'light' | 'thin' | 'duotone'
}

// Icon registry - maps icon names to their components by variant
// Add icons here as you use them. Use scripts/generate-icon-registry.js to generate entries.
type IconRegistry = Record<string, Record<string, React.ComponentType<SvgProps>>>

// Icon registry - Metro bundler requires static require() paths
// IMPORTANT: These must be direct require() calls (no IIFE wrappers)
// Metro's SVG transformer will process these at build time
// Icons are now directly in assets/icons/ folder (no subfolders)

// Icon registry - only register icons that actually exist in assets/icons/
// Add icons here as you need them. Use: node scripts/generate-icon-registry.js icon-name
// react-native-svg-transformer returns { default: Component } or Component directly
const caretLeftIcon = require('../assets/icons/caret-left.svg')
const microphoneIcon = require('../assets/icons/microphone.svg')
const uploadIcon = require('../assets/icons/upload.svg')
const checkIcon = require('../assets/icons/check.svg')
const playIcon = require('../assets/icons/play.svg')
const pauseIcon = require('../assets/icons/pause.svg')
const plusIcon = require('../assets/icons/plus.svg')
const copyIcon = require('../assets/icons/copy.svg')
const shareIcon = require('../assets/icons/share.svg')
const downloadIcon = require('../assets/icons/download.svg')
const xIcon = require('../assets/icons/x.svg')
const pencilIcon = require('../assets/icons/pencil.svg')
const trashIcon = require('../assets/icons/trash.svg')
const squareIcon = require('../assets/icons/square.svg')
const stopIcon = require('../assets/icons/stop.svg')
const arrowRightIcon = require('../assets/icons/arrow-right.svg')
const dotsThreeVerticalIcon = require('../assets/icons/dots-three-vertical.svg')
const fileTextIcon = require('../assets/icons/file-text.svg')
const sparkleIcon = require('../assets/icons/sparkle.svg')
const usersIcon = require('../assets/icons/users.svg')
const plantIcon = require('../assets/icons/plant.svg')

// Helper to extract React component from require result
const extractComponent = (module: any): React.ComponentType<SvgProps> | null => {
  if (!module) return null
  // If it's already a function/component, use it
  if (typeof module === 'function') return module
  // If it has a default export, use that
  if (module.default) {
    return typeof module.default === 'function' ? module.default : null
  }
  // If it's an object with a component-like structure, try to find it
  return null
}

const iconRegistry: IconRegistry = {
  'caret-left': {
    regular: extractComponent(caretLeftIcon) || caretLeftIcon.default || caretLeftIcon,
  },
  'microphone': {
    regular: extractComponent(microphoneIcon) || microphoneIcon.default || microphoneIcon,
  },
  'upload': {
    regular: extractComponent(uploadIcon) || uploadIcon.default || uploadIcon,
  },
  'check': {
    regular: extractComponent(checkIcon) || checkIcon.default || checkIcon,
  },
  'play': {
    regular: extractComponent(playIcon) || playIcon.default || playIcon,
  },
  'pause': {
    regular: extractComponent(pauseIcon) || pauseIcon.default || pauseIcon,
  },
  'plus': {
    regular: extractComponent(plusIcon) || plusIcon.default || plusIcon,
  },
  'copy': {
    regular: extractComponent(copyIcon) || copyIcon.default || copyIcon,
  },
  'share': {
    regular: extractComponent(shareIcon) || shareIcon.default || shareIcon,
  },
  'download': {
    regular: extractComponent(downloadIcon) || downloadIcon.default || downloadIcon,
  },
  'x': {
    regular: extractComponent(xIcon) || xIcon.default || xIcon,
  },
  'pencil': {
    regular: extractComponent(pencilIcon) || pencilIcon.default || pencilIcon,
  },
  'trash': {
    regular: extractComponent(trashIcon) || trashIcon.default || trashIcon,
  },
  'square': {
    regular: extractComponent(squareIcon) || squareIcon.default || squareIcon,
  },
  'stop': {
    regular: extractComponent(stopIcon) || stopIcon.default || stopIcon,
  },
  'arrow-right': {
    regular: extractComponent(arrowRightIcon) || arrowRightIcon.default || arrowRightIcon,
  },
  'dots-three-vertical': {
    regular: extractComponent(dotsThreeVerticalIcon) || dotsThreeVerticalIcon.default || dotsThreeVerticalIcon,
  },
  'file-text': {
    regular: extractComponent(fileTextIcon) || fileTextIcon.default || fileTextIcon,
  },
  'sparkle': {
    regular: extractComponent(sparkleIcon) || sparkleIcon.default || sparkleIcon,
  },
  'users': {
    regular: extractComponent(usersIcon) || usersIcon.default || usersIcon,
  },
  'plant': {
    regular: extractComponent(plantIcon) || plantIcon.default || plantIcon,
  },
}

// To add more icons, use the helper script:
//   node scripts/generate-icon-registry.js icon-name1 icon-name2
//
// Or add manually to iconRegistry above following this format:
//   'icon-name': {
//     regular: require('../assets/icons/icon-name.svg'),
//   },

// Get icon component from registry
const getIconComponent = (name: string, variant: string): React.ComponentType<SvgProps> | null => {
  const iconVariants = iconRegistry[name]
  if (!iconVariants) {
    return null
  }
  // Try requested variant first, fallback to regular
  return iconVariants[variant] || iconVariants['regular'] || null
}

export default function Icon({ 
  name, 
  size = 24, 
  color = '#111827', 
  variant = 'regular',
  style, 
  ...svgProps 
}: IconProps) {
  const IconComponent = getIconComponent(name, variant)
  
  if (!IconComponent) {
    const availableIcons = Object.keys(iconRegistry).length > 0 
      ? Object.keys(iconRegistry).join(', ')
      : 'none (add icons to iconRegistry in components/Icon.tsx)'
    console.warn(
      `Icon "${name}" (${variant}) not found in registry. ` +
      `Available icons: ${availableIcons}. ` +
      `Add it to components/Icon.tsx iconRegistry. ` +
      `File should be at: assets/icons/${name}.svg`
    )
    return (
      <View 
        style={[
          styles.placeholder, 
          { width: size, height: size }, 
          style
        ]} 
      />
    )
  }

  // Safety check: ensure IconComponent is a valid React component
  if (typeof IconComponent !== 'function') {
    console.error(
      `Icon "${name}" (${variant}) is not a valid React component. ` +
      `Got type: ${typeof IconComponent}. ` +
      `This usually means the SVG transformer isn't working correctly.`
    )
    return (
      <View 
        style={[
          styles.placeholder, 
          { width: size, height: size }, 
          style
        ]} 
      />
    )
  }

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <IconComponent
        width={size}
        height={size}
        fill={color}
        color={color}
        {...svgProps}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
})

#!/usr/bin/env node

/**
 * Helper script to generate icon registry entries for components/Icon.tsx
 * 
 * Usage:
 *   node scripts/generate-icon-registry.js arrow-left plus copy
 * 
 * This will output the require() statements you can copy into iconRegistry
 */

const fs = require('fs')
const path = require('path')

const ICONS_BASE_PATH = path.join(__dirname, '../assets/icons')
// Icons are now directly in assets/icons/ folder (no variants/subfolders)
const VARIANTS = ['regular'] // Keep for compatibility, but all icons are in the same folder

function generateIconEntry(iconName, variants = ['regular']) {
  // Icons are now directly in assets/icons/ folder (no subfolders)
  const iconPath = path.join(ICONS_BASE_PATH, `${iconName}.svg`)
  const relativePath = path.relative(
    path.join(__dirname, '../components'),
    iconPath
  ).replace(/\\/g, '/')
  
  if (fs.existsSync(iconPath)) {
    return `  '${iconName}': {\n    regular: require('${relativePath}'),\n  },`
  } else {
    console.error(`❌ ${iconName}.svg not found`)
    return null
  }
}

// Get icon names from command line arguments
const iconNames = process.argv.slice(2)

if (iconNames.length === 0) {
  console.log(`
Usage: node scripts/generate-icon-registry.js <icon-name> [icon-name2] ...

Example:
  node scripts/generate-icon-registry.js arrow-left plus copy share

This will generate the require() statements you can copy into components/Icon.tsx
`)
  process.exit(1)
}

console.log('\n📋 Copy this into components/Icon.tsx iconRegistry:\n')
console.log('const iconRegistry: IconRegistry = {')

const foundIcons = []
const notFoundIcons = []

iconNames.forEach(iconName => {
  // Icons are now directly in assets/icons/ folder
  const iconPath = path.join(ICONS_BASE_PATH, `${iconName}.svg`)
  
  if (!fs.existsSync(iconPath)) {
    notFoundIcons.push(iconName)
    return
  }

  const entry = generateIconEntry(iconName)
  if (entry) {
    foundIcons.push(entry)
  }
})

// Print found icons
foundIcons.forEach(entry => console.log(entry))

// Print warnings for not found icons
if (notFoundIcons.length > 0) {
  console.log('\n⚠️  Icons not found (check exact filename):')
  notFoundIcons.forEach(name => {
    console.log(`   - ${name}`)
    // Try to find similar names
    try {
      const files = fs.readdirSync(ICONS_BASE_PATH)
      const similar = files
        .filter(f => f.endsWith('.svg') && (f.includes(name.split('-')[0]) || name.split('-')[0].includes(f.replace('.svg', ''))))
        .slice(0, 3)
        .map(f => f.replace('.svg', ''))
      if (similar.length > 0) {
        console.log(`     Similar: ${similar.join(', ')}`)
      }
    } catch (e) {
      // Ignore errors
    }
  })
}

console.log('}\n')
console.log('✅ Done! Copy the above into components/Icon.tsx\n')

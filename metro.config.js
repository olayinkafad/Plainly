const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Configure SVG transformer BEFORE NativeWind wraps it
// This ensures SVG files are transformed correctly
const svgTransformerPath = require.resolve('react-native-svg-transformer')

config.transformer = {
  ...config.transformer,
  babelTransformerPath: svgTransformerPath,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
}

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
}

// Apply NativeWind after SVG transformer config
// IMPORTANT: We need to ensure SVG transformer is preserved after NativeWind
const finalConfig = withNativeWind(config, { input: './global.css' })

// ALWAYS re-apply SVG transformer after NativeWind (it may override it)

// Force SVG transformer to be used
finalConfig.transformer = {
  ...finalConfig.transformer,
  babelTransformerPath: svgTransformerPath,
}

// Force resolver config
finalConfig.resolver = {
  ...finalConfig.resolver,
  assetExts: (finalConfig.resolver.assetExts || []).filter((ext) => ext !== 'svg'),
  sourceExts: [...new Set([...(finalConfig.resolver.sourceExts || []), 'svg'])],
}

module.exports = finalConfig

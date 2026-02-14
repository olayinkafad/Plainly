/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#FDFCFB',
          secondary: '#F5F0EB',
          tertiary: '#EDE6DF',
        },
        text: {
          primary: '#2C2826',
          secondary: '#8C8480',
          tertiary: '#B5AFA9',
        },
        border: {
          default: '#E8E0D8',
          subtle: '#EDE6DF',
        },
        accent: {
          primary: '#C45D3E',
          hover: '#B35236',
        },
        status: {
          success: '#5C8A5E',
          warning: '#C4873E',
          error: '#BF4A3A',
        },
      },
      fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 20,
        xl: 24,
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
      },
      spacing: {
        2: 8,
        3: 12,
        4: 16,
        5: 20,
        6: 24,
        8: 32,
      },
      borderRadius: {
        sm: 6,
        md: 10,
        lg: 14,
      },
    },
  },
  plugins: [],
}

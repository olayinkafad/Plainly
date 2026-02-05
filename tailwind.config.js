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
          primary: '#FFFFFF',
          secondary: '#F9FAFB',
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
        },
        border: {
          default: '#E5E7EB',
          subtle: '#F1F5F9',
        },
        accent: {
          primary: '#2563EB',
        },
        status: {
          success: '#16A34A',
          warning: '#D97706',
          error: '#DC2626',
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

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        md: ['16px', { lineHeight: '1.5' }],
        lg: ['20px', { lineHeight: '1.5' }],
        xl: ['24px', { lineHeight: '1.5' }],
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
      },
      spacing: {
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
    },
  },
  plugins: [],
}
export default config

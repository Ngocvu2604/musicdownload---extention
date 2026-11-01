/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Red Minimalist Design System Tokens
        brand: {
          DEFAULT: '#D62828',
          hover: '#A61E22',
          light: '#FCE8E8',
          dark: '#A61E22',
        },
        bg: {
          light: '#FFFFFF',
          dark: '#181818',
        },
        surface: {
          light: '#F5F5F5',
          dark: '#242424',
          hoverLight: '#EBEBEB',
          hoverDark: '#2C2C2C',
        },
        content: {
          light: '#202020',
          dark: '#F5F5F5',
          secondary: '#888888',
          muted: '#A0A0A0',
        },
        line: {
          light: '#E5E5E5',
          dark: '#333333',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

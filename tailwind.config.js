/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ─── Toss Fintech palette (primary) ─── */
        brand: {
          50:  '#E8F2FE',
          100: '#C8DFFA',
          200: '#A5C9F6',
          300: '#7AB1F2',
          400: '#4B8DF8',
          500: '#3182F6',
          600: '#1B64DA',
          700: '#1856BD',
          800: '#14479E',
          900: '#10357A',
          950: '#0A254F',
        },
        accent: {
          50:  '#E8F2FE',
          100: '#C8DFFA',
          200: '#9DC5F4',
          300: '#73ABEF',
          400: '#4B8DF8',
          500: '#3182F6',
          600: '#1B64DA',
          700: '#1856BD',
          800: '#10357A',
          900: '#0A254F',
        },
        /* Toss neutral scale — used where old 'warm' was */
        warm: {
          50:  '#F9FAFB',
          100: '#F2F4F6',
          200: '#E5E8EB',
          300: '#D1D6DB',
          400: '#B0B8C1',
          500: '#8B95A1',
          600: '#6B7684',
          700: '#4E5968',
          800: '#333D4B',
          900: '#191F28',
        },
        navy: {
          50:  '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#1E3A5F',
          600: '#1a3254',
          700: '#152a47',
          800: '#10223a',
          900: '#0b1a2d',
          950: '#060e18',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'system-ui',
          'sans-serif',
        ],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-down': 'slideDown 0.35s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'scale-in': 'scaleIn 0.25s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgba(0,0,0,0.03)',
        'card-hover': '0 2px 8px 0 rgba(0,0,0,0.06)',
        'modal': '0 16px 48px -12px rgba(0,0,0,0.18)',
        'nav': '0 1px 0 0 rgba(0,0,0,0.04)',
      },
      borderRadius: {
        'artek': '6px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}

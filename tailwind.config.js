/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ─── Artek-inspired warm palette ─── */
        brand: {
          50:  '#F8F7F5',
          100: '#EEEDEA',
          200: '#DDDAD4',
          300: '#C2BEB5',
          400: '#9E9888',
          500: '#7A7466',
          600: '#5C564A',
          700: '#46423A',
          800: '#312E29',
          900: '#1D1B18',
          950: '#0F0E0D',
        },
        accent: {
          50:  '#F9F7F2',
          100: '#F0EBDF',
          200: '#E0D5C3',
          300: '#CEBFA2',
          400: '#BCA882',
          500: '#A89167',
          600: '#8E7A55',
          700: '#726244',
          800: '#594C35',
          900: '#423829',
        },
        warm: {
          50:  '#FAFAF8',
          100: '#F5F4F0',
          200: '#ECEAE4',
          300: '#DDDAD2',
          400: '#C4C0B6',
          500: '#A8A398',
          600: '#8C867A',
          700: '#706B61',
          800: '#55514A',
          900: '#3A3833',
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

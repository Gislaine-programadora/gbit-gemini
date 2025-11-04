import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gbit-dark': '#0a0a0a',
        'gbit-darker': '#050505',
        'gbit-card': 'rgba(26, 26, 26, 0.5)',
        'gbit-border': 'rgba(255, 255, 255, 0.1)',
        'gbit-red': '#ef4444',
        'gbit-orange': '#f97316',
        'gbit-yellow': '#fbbf24',
        'gbit-gray-light': '#9ca3af',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config

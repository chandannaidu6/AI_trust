/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"Cascadia Code"',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        slot: {
          a: { bg: 'rgb(237 233 254)', border: 'rgb(167 139 250)', text: 'rgb(109 40 217)', active: 'rgb(124 58 237)' },
          b: { bg: 'rgb(224 242 254)', border: 'rgb(125 211 252)', text: 'rgb(3 105 161)',  active: 'rgb(2 132 199)'  },
          c: { bg: 'rgb(209 250 229)', border: 'rgb(110 231 183)', text: 'rgb(6 95 70)',   active: 'rgb(5 150 105)'  },
          d: { bg: 'rgb(254 243 199)', border: 'rgb(252 211 77)',  text: 'rgb(146 64 14)',  active: 'rgb(217 119 6)'  },
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#030b14',
          900: '#071626',
          850: '#0b2038',
          800: '#0f2b4c',
          700: '#153d6b',
          600: '#1b528f',
          500: '#236ebf',
        },
        cyan: {
          glow: '#06b6d4',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}


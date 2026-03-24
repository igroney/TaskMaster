import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        abanteare: { DEFAULT: '#6366f1', light: '#eef2ff', dark: '#312e81' },
        farfield:  { DEFAULT: '#0ea5e9', light: '#e0f2fe', dark: '#0c4a6e' },
        pgt:       { DEFAULT: '#f59e0b', light: '#fef3c7', dark: '#78350f' },
        personal:  { DEFAULT: '#10b981', light: '#d1fae5', dark: '#064e3b' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

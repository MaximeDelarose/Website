/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: ['btn-primary', 'btn-peach', 'btn-soft', 'btn-ghost'],
  theme: {
    extend: {
      colors: {
        plum: { DEFAULT: '#231C39', 900: '#1A1429', 700: '#352C52', 500: '#5B4F7D', 300: '#8C82A8' },
        lavender: { DEFAULT: '#A88BC7', 200: '#D9CBE8', 100: '#EDE5F4' },
        peach: { DEFAULT: '#F6B7A0', 200: '#FAD6C8', 600: '#C9694A' },
        cream: { DEFAULT: '#FFF7EF', 200: '#F8EBDD' },
        rose: { DEFAULT: '#F3C1CC', 600: '#B24A66' },
        mint: { DEFAULT: '#CDE8DA', 600: '#2F7A5A' },
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 0 rgba(35,28,57,.04), 0 12px 32px -12px rgba(35,28,57,.22)',
        pop: '0 4px 0 rgba(35,28,57,.9)',
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
}

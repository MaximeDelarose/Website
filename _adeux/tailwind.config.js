/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: ['btn-primary', 'btn-peach', 'btn-soft', 'btn-ghost'],
  theme: {
    extend: {
      colors: {
        plum: { DEFAULT: '#3B1F4D', 900: '#2A1438', 700: '#52336A', 500: '#7A6389', 300: '#A898B3' },
        lavender: { DEFAULT: '#E8DFF7', 200: '#D8CBEE', 100: '#F2ECFA' },
        peach: { DEFAULT: '#FFC4AB', 200: '#FFE0D3', 600: '#B8593A' },
        cream: { DEFAULT: '#FDF7EF', 200: '#F5EBDD' },
        rose: { DEFAULT: '#E9C3CD', 600: '#9E3A55' },
        mint: { DEFAULT: '#DDEEE4', 600: '#2F6B52' },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: { soft: '0 1px 0 rgba(59,31,77,.04), 0 18px 40px -24px rgba(59,31,77,.35)' },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
}

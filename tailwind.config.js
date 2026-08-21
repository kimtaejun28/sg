/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './roulette.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Jua', 'sans-serif'],
        body: ['"Noto Sans KR"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

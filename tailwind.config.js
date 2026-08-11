/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './circle.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
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

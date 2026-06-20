/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { safety: { DEFAULT: '#f97316', dark: '#ea580c' } },
    },
  },
  plugins: [],
};

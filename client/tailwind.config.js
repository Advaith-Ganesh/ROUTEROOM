/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#12151b',
          700: '#2b303b',
          500: '#5b6472',
          300: '#9aa3b2',
          100: '#e7eaef',
        },
        brand: {
          600: '#2f5d50',
          500: '#3a7364',
          100: '#e3ede9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

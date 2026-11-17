/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fleet: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36abf7',
          500: '#0c8fe9',
          600: '#0171c7',
          700: '#025aa2',
          800: '#064c85',
          900: '#0b406e',
          950: '#072849',
        },
        slate: {
          850: '#151e2e',
          950: '#0b0f19',
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'Segoe UI', 'Tahoma', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

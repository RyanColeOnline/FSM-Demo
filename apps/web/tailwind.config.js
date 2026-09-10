/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '24': 'repeat(24, minmax(0, 1fr))',
      },
      colors: {
        forest: {
          50: '#f4f8f3',
          100: '#e4efe1',
          200: '#c9e0c4',
          300: '#a3ca9c',
          400: '#77ac6f',
          500: '#548e4b',
          600: '#3f6b35', // Dark Forest Green (Primary specification)
          700: '#34572c',
          800: '#2b4625',
          900: '#243b20',
          950: '#111f0f',
        },
      },
    },
  },
  plugins: [],
}

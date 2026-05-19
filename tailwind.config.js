/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1a1a',
        paper: '#fdf6e3',
        accent: {
          pink: '#FF66CC',
          yellow: '#FFCC33',
          cyan: '#33CCCC',
          green: '#33CC66',
        },
      },
      fontFamily: {
        sans: ['Fredoka', 'system-ui', 'sans-serif'],
        display: ['Bungee', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        brutal: '5px 5px 0 #1a1a1a',
        'brutal-sm': '3px 3px 0 #1a1a1a',
        'brutal-lg': '6px 6px 0 #1a1a1a',
      },
    },
  },
  plugins: [],
};

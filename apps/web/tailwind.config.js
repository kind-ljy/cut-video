/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0b0d12',
          panel: '#13161e',
          card: '#1a1e29',
          hover: '#222736',
        },
        border: {
          DEFAULT: '#2a2f3d',
        },
        accent: {
          DEFAULT: '#7c5cff',
          glow: '#a18bff',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Helvetica Neue"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

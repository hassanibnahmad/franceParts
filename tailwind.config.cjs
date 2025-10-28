/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // central app palette (matches values in src/index.css)
        accent: '#FFD700',
        'accent-600': '#e6bd00',
        app: '#0b0b0b',
        surface: '#1a1a1a',
        'bg-dark': '#0e1418',
        'surface-1': '#0f1920',
        'surface-2': '#172027',
      },
      animation: {
        'gentle-bounce': 'gentleBounce 4s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        gentleBounce: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-8px) scale(1.02)' },
        },
        glow: {
          '0%': { filter: 'drop-shadow(0 0 15px rgba(250, 204, 21, 0.4))' },
          '100%': { filter: 'drop-shadow(0 0 25px rgba(250, 204, 21, 0.7))' },
        }
      }
    },
  },
  plugins: [],
};

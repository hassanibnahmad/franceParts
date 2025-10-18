/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
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

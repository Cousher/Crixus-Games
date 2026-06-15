// tailwind.config.js
module.exports = {
  mode: 'jit',

  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],

  theme: {
    extend: {
      animation: {
        'spin-fast': 'spin-fast 5s linear infinite',
        'spin-slow': 'spin-slow 2s linear infinite',
      },
      keyframes: {
        'spin-fast': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(60deg)' },
        },
      },
      colors: {
        'primary': '#0e0e12',
        'primary-light': '#1a1813',
        'secondary': '#d4af37',
        'secondary-light': '#e0b341',
        'unique': '#FFCC00',
      },
    },

  },
  variants: {},
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "selector",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      sans: ["Inter", "Arial", "sans-serif"],
    },

    extend: {
      colors: {
        blue: {
          50: "#f2f5fc",
          100: "#e1e8f8",
          200: "#cbd8f2",
          300: "#a6bfea",
          400: "#7c9dde",
          500: "#5d7dd4",
          600: "#4963c7",
          700: "#3f51b5",
          800: "#394494",
          900: "#323d76",
          950: "#222749",
        },
      },
    },
  },
  plugins: [],
};

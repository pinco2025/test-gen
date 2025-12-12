/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
      extend: {
          colors: {
              "primary": "#5248e5",
              "background-light": "#f6f6f8",
              "background-dark": "#121121",
              "surface-light": "#ffffff",
              "surface-dark": "#1e1e2d",
              "border-light": "#e5e7eb",
              "border-dark": "#2d2d3b",
              "text-main": "#121117",
              "text-secondary": "#666487",
          },
          fontFamily: {
              "display": ["Inter", "sans-serif"]
          },
          borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
      },
  },
  plugins: [],
}

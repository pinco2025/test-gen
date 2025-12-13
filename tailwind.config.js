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
              "primary": "#3b82f6", // blue-500
              "background-light": "#eff6ff", // blue-50
              "background-dark": "#0f172a", // slate-900
              "surface-light": "#ffffff",
              "surface-dark": "#1e293b", // slate-800
              "border-light": "#bfdbfe", // blue-200
              "border-dark": "#334155", // slate-700
              "text-main": "#0f172a", // slate-900
              "text-secondary": "#64748b", // slate-500
          },
          fontFamily: {
              "display": ["Inter", "sans-serif"]
          },
          borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
      },
  },
  plugins: [],
}

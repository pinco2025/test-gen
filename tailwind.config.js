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
      animation: {
        'orbit-slow': 'orbit 25s linear infinite',
        'orbit-medium': 'orbit 15s linear infinite',
        'orbit-reverse': 'orbit-reverse 20s linear infinite',
        'pulse-glow': 'pulse-glow 6s ease-in-out infinite',
        'float-particle': 'float-particle 8s ease-in-out infinite',
        'hero-entry': 'hero-entry 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'text-glow': 'text-glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'orbit-reverse': {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.4' },
          '50%': { transform: 'scale(1.15)', opacity: '0.7' },
        },
        'float-particle': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(15px, -15px)' },
          '50%': { transform: 'translate(-10px, 20px)' },
          '75%': { transform: 'translate(-20px, -5px)' },
        },
        'hero-entry': {
          '0%': { transform: 'scale(0.8) translateY(20px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'text-glow': {
          '0%': { textShadow: '0 0 5px rgba(82, 72, 229, 0.05)' },
          '100%': { textShadow: '0 0 25px rgba(82, 72, 229, 0.5), 0 0 10px rgba(82, 72, 229, 0.3)' },
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dystopia: {
          bg: '#050505',
          card: '#121212',
          border: '#333333',
          text: '#e0e0e0',
          muted: '#888888',
          primary: '#00ff41', // Matrix green
          secondary: '#ff003c', // Cyberpunk red
          accent: '#00f3ff', // Cyan
        }
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
      }
    },
  },
  plugins: [],
}

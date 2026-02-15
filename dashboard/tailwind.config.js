/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        shame: {
          green: "#22c55e",
          lime: "#84cc16",
          amber: "#f59e0b",
          red: "#ef4444",
          nuclear: "#7c3aed",
        },
      },
      animation: {
        "pulse-fast": "pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shake": "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
        "glow-red": "glow-red 2s ease-in-out infinite",
      },
      keyframes: {
        shake: {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        "glow-red": {
          "0%, 100%": { boxShadow: "0 0 5px #ef4444, 0 0 10px #ef4444" },
          "50%": { boxShadow: "0 0 20px #ef4444, 0 0 40px #ef4444" },
        },
      },
    },
  },
  plugins: [],
};

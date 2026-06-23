/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand accent
        accent: "#7C5CFC",
        // Result semantics (kept consistent app-wide)
        win: "#16C784",
        loss: "#EA3943",
        be: "#9AA0A6",
      },
    },
  },
  plugins: [],
};

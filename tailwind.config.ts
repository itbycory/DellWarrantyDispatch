import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dell: {
          blue: "#007DB8",
          dark: "#003B5C",
          light: "#E8F4FD",
        },
      },
    },
  },
  plugins: [],
}

export default config

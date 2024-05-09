import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-cal-sans)", "sans-serif"]
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
}
export default config

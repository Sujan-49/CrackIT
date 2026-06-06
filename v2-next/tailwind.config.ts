import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        surface: "#0E0E0E",
        lime: "#A3FF12",
        slate: "#94A3B8"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Outfit", "Inter", "ui-sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16181d",
        brand: { 50: "#eef4ff", 100: "#dbe7ff", 500: "#3b5bdb", 600: "#2f4ac0", 700: "#263c9c" },
      },
    },
  },
  plugins: [],
};
export default config;

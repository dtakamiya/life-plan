import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 温かいペーパー基調
        paper: {
          DEFAULT: "#faf8f4",
          deep: "#f3efe7",
        },
        surface: "#ffffff",
        // 深いネイビーインク
        ink: {
          DEFAULT: "#17283b",
          soft: "#45566b",
          mute: "#8493a5",
        },
        line: {
          DEFAULT: "#e7e0d6",
          soft: "#efeae1",
        },
        // ブランド（成長・収入・主アクション）
        brand: {
          DEFAULT: "#0f766e",
          600: "#0d9488",
          700: "#0b5d57",
          50: "#edf7f5",
        },
        // ゴールド（富の強調・アイブロウ）
        gold: {
          DEFAULT: "#a9712a",
          soft: "#c79a4e",
          50: "#f7efe1",
        },
        // 赤字・支出
        danger: {
          DEFAULT: "#b3322c",
          soft: "#c4554d",
          50: "#fbeeec",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          "Meiryo",
          "sans-serif",
        ],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        panel:
          "0 1px 2px rgba(23, 40, 59, 0.04), 0 10px 30px -16px rgba(23, 40, 59, 0.18)",
        "panel-lift":
          "0 2px 4px rgba(23, 40, 59, 0.05), 0 18px 40px -18px rgba(23, 40, 59, 0.28)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.21, 0.61, 0.35, 1) both",
        "fade-in": "fade-in 0.6s ease both",
      },
    },
  },
  plugins: [],
};

export default config;

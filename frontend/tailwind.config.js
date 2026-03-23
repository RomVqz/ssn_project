/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── SSN Color Palette ─────────────────────────────────────────────────
      colors: {
        // Deep lab backgrounds
        lab: {
          950: "#07080a",
          900: "#0c0e12",
          850: "#111318",
          800: "#161920",
          750: "#1c2028",
          700: "#222730",
        },
        // Scientific amber/gold accent
        amber: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        // Data teal for charts / funding
        teal: {
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
        },
        // Muted text hierarchy
        slate: {
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
        },
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        // Display: Playfair Display — editorial, authoritative
        display: ["'Playfair Display'", "Georgia", "serif"],
        // Body: DM Sans — clean, scientific
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        // Data / addresses: JetBrains Mono
        mono: ["'JetBrains Mono'", "Menlo", "monospace"],
      },

      // ── Spacing & sizing extras ───────────────────────────────────────────
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "88": "22rem",
        "112": "28rem",
        "128": "32rem",
      },

      // ── Animations ────────────────────────────────────────────────────────
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },

      // ── Backdrop blur ─────────────────────────────────────────────────────
      backdropBlur: {
        xs: "2px",
      },

      // ── Box shadows ───────────────────────────────────────────────────────
      boxShadow: {
        "amber-glow": "0 0 24px rgba(245, 158, 11, 0.15)",
        "amber-glow-lg": "0 0 48px rgba(245, 158, 11, 0.2)",
        "teal-glow": "0 0 24px rgba(45, 212, 191, 0.15)",
        "card": "0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};

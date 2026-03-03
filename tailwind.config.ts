import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          mid:        "hsl(var(--primary-mid))",
          deep:       "hsl(var(--primary-deep))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          deep:       "hsl(var(--accent-deep))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        indigo: {
          DEFAULT: "hsl(var(--indigo))",
          glow:    "hsl(var(--indigo-glow))",
        },
        emerald: {
          DEFAULT: "hsl(var(--emerald))",
        },
        navy: {
          DEFAULT: "hsl(var(--navy))",
          light:   "hsl(var(--navy-light))",
          lighter: "hsl(var(--navy-lighter))",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
        "2xl":"1rem",
        "3xl":"1.5rem",
      },
      boxShadow: {
        glow:     "var(--shadow-glow)",
        "glow-sm":"var(--shadow-glow-sm)",
        accent:   "var(--shadow-accent)",
        card:     "var(--shadow-card)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px hsl(235 62% 63% / 0.3)" },
          "50%":      { boxShadow: "0 0 40px hsl(235 62% 63% / 0.6)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 16px hsl(235 62% 63% / 0.25)" },
          "50%":      { boxShadow: "0 0 32px hsl(235 62% 63% / 0.55)" },
        },
        "splash-scale": {
          "0%":   { transform: "scale(0.85)", opacity: "0" },
          "60%":  { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1)",    opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        shimmer:          "shimmer 2s linear infinite",
        "slide-up":       "slide-up 0.6s ease-out",
        "fade-in":        "fade-in 0.4s ease-out",
        glow:             "glow 3s ease-in-out infinite",
        "glow-pulse":     "glow-pulse 3s ease-in-out infinite",
        "splash-scale":   "splash-scale 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

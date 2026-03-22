import { nextui } from "@nextui-org/react";
import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts}",
    "./src/constants/**/*.{js,ts}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  // Safelist classes that are dynamically generated in PageSkeleton.tsx
  // Tailwind's JIT compiler cannot detect these from object lookups
  safelist: [
    // StatsGridSkeleton dynamic grid columns (md: prefixed)
    "md:grid-cols-5",
    "md:grid-cols-6",
    // TableSkeleton dynamic grid columns
    "grid-cols-5",
    "grid-cols-6",
    "grid-cols-7",
    "grid-cols-8",
    "grid-cols-9",
    "grid-cols-10",
    "grid-cols-11",
    "grid-cols-12",
    // Terminal status chip colors (border-only, used in styleClasses.ts)
    "border-terminal-green",
    "border-terminal-amber",
    "border-terminal-red",
    "border-terminal-gray",
    "text-terminal-green",
    "text-terminal-amber",
    "text-terminal-red",
    "text-terminal-gray",
    // Dark terminal strip
    "from-[#454545]",
    "via-[#393939]",
    "to-[#2d2d2d]",
    "via-strategic-blue/30",
    "text-white/50",
    "text-white/20",
    "border-white/30",
    "hover:bg-white/10",
    "hover:border-white/50",
    // Skeleton animations
    "animate-terminal-shimmer",
    "animate-fade-in",
    "animate-fade-up",
  ],
  darkMode: "class",
  theme: {
    fontFamily: {
      sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      mono: ["IBM Plex Mono", "ui-monospace", "SF Mono", "monospace"],
    },
    extend: {
      keyframes: {
        "terminal-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "terminal-shimmer": "terminal-shimmer 1.8s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "fade-up": "fade-up 0.3s ease-out forwards",
      },
      container: {
        center: true,
        padding: {
          DEFAULT: "1rem",
          sm: "1.5rem",
          lg: "2rem",
        },
        screens: {
          DEFAULT: "1440px",
        },
      },
      borderRadius: {
        none: "0px",
        xs: "2px",
        sm: "4px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        full: "9999px",
      },
      boxShadow: {
        none: "none",
        xs: "0 1px 2px 0 rgba(0,0,0,0.03)",
        sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
        card: "0 1px 3px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08)",
        md: "0 4px 6px -1px rgba(0,0,0,0.07)",
        lg: "0 10px 15px -3px rgba(0,0,0,0.08)",
        xl: "0 20px 25px -5px rgba(0,0,0,0.1)",
        dropdown: "0 4px 16px rgba(0,0,0,0.12)",
        modal: "0 16px 48px rgba(0,0,0,0.16)",
      },
      colors: {
        // Primary Palette (90% of UI)
        "pure-black": "#000000",
        "text-primary": "#1A1A1A",
        "text-secondary": "#666666",
        "text-muted": "#999999",

        // LP Neo-Geometric Dark Palette
        "deep-black": "#090909",
        "dimensional-gray": "#393939",
        "dimensional-gray-hover": "#2A2A2A",
        "clean-white": "#f8f8f8",
        "depth-gray": "#b4b4b4",
        "strategic-blue": "#79c2ff",
        "navy-accent": "#01184e",

        // Surfaces
        "surface-page": "#FAFAFA",
        "surface-card": "#FFFFFF",
        "surface-hover": "#F5F5F5",
        "surface-dark": "#393939",
        "surface-dark-hover": "#4A4A4A",

        // Text on dark surfaces
        "text-inverse": "#FFFFFF",
        "text-inverse-muted": "#A0A0A0",

        // Borders
        "border-subtle": "#E5E5E5",
        "border-default": "#D4D4D4",
        "border-dark": "#333333",

        // Chart Colors (ONLY blue in UI)
        "chart-blue": {
          300: "#91CAFF",
          400: "#69B4FF",
          500: "#0066CC",
        },

        // Terminal Status Colors
        terminal: {
          green: "#00B341",
          amber: "#CC8800",
          red: "#CC0000",
          gray: "#666666",
        },

        // Keep existing colors for backwards compatibility during migration
        brand: {
          "dark-blue": "#1A1A1A", // Mapped to new text-primary
          "medium-blue": "#1A1A1A",
          "light-green": "#E6EBE6",
          "light-blue": "#A9D0FF",
        },
        neutral: {
          "super-light-gray": "#FAFAFA",
          "light-background": "#FAFAFA",
          "light-gray": "#999999",
          "medium-white": "#E5E5E5",
          "medium-black": "#1A1A1A",
          "dark-gray": "#666666",
          nude: "#D4D4D4",
          "medium-gray": "#666666",
        },
        status: {
          success: "#00B341",
          warning: "#CC8800",
          "warning-orange": "#CC8800",
          "warning-light": "#CC8800",
          info: "#0066CC",
        },
        border: {
          dark: "#1A1A1A",
        },
      },
    },
  },
  plugins: [
    nextui({
      prefix: "ina",
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#1A1A1A", // Changed from blue to black
              "50": "#F5F5F5",
              "100": "#E5E5E5",
              "200": "#D4D4D4",
              "300": "#999999",
              "400": "#666666",
              "500": "#1A1A1A",
              "600": "#0F0F0F",
              "700": "#000000",
              "900": "#000000",
            },
            secondary: {
              DEFAULT: "#666666",
              "900": "#1A1A1A",
            },
            success: {
              DEFAULT: "#00B341",
            },
            warning: {
              DEFAULT: "#CC8800",
            },
            danger: {
              DEFAULT: "#CC0000",
            },
          },
          layout: {
            // Soft corners for minimalistic institutional look
            radius: {
              small: "4px",
              medium: "6px",
              large: "8px",
            },
            borderWidth: {
              small: "1px",
              medium: "1px",
              large: "2px",
            },
          },
        },
      },
    }),
    typography,
    plugin(({ addUtilities }) => {
      addUtilities({
        // Layout patterns
        ".toolbar-row": {
          "@apply flex items-center justify-between": {},
        },
        ".inline-group": {
          "@apply flex items-center gap-2": {},
        },
        ".inline-group-lg": {
          "@apply flex items-center gap-4": {},
        },
        ".stack": {
          "@apply flex flex-col gap-2": {},
        },
        ".stack-lg": {
          "@apply flex flex-col gap-4": {},
        },
        ".stack-xl": {
          "@apply flex flex-col gap-6": {},
        },

        // Card patterns
        ".card-container": {
          "@apply rounded-lg border border-subtle shadow-card bg-surface-card":
            {},
        },

        // Icon sizing
        ".icon-sm": {
          "@apply w-4 h-4": {},
        },
        ".icon-md": {
          "@apply w-5 h-5": {},
        },
        ".icon-lg": {
          "@apply w-6 h-6": {},
        },

        // Text utilities
        ".text-secondary": {
          "@apply text-default-600": {},
        },
        ".text-secondary-muted": {
          "@apply text-text-secondary": {},
        },
      });
    }),
  ],
};
export default config;

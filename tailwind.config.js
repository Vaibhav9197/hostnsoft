/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        foreground: "var(--ink)",
        card: "var(--surface)",
        "card-foreground": "var(--ink)",
        elevated: "var(--surface-2)",
        "elevated-2": "var(--surface-3)",
        popover: "var(--surface-2)",
        "popover-foreground": "var(--ink)",
        primary: "var(--accent)",
        "primary-foreground": "var(--on-accent)",
        secondary: "var(--surface-2)",
        "secondary-foreground": "var(--ink)",
        muted: "var(--surface-2)",
        "muted-foreground": "var(--ink-soft)",
        faint: "var(--ink-faint)",
        accent: "var(--surface-2)",
        "accent-foreground": "var(--ink)",
        destructive: "var(--danger)",
        "destructive-foreground": "#1A0808",
        success: "var(--ok)",
        warning: "var(--warn)",
        info: "var(--info)",
        border: "var(--line)",
        input: "var(--line-strong)",
        control: "var(--line-control)",
        ring: "var(--accent)",
        // Sidebar tokens, mapped onto the app's own surfaces so the console
        // stays on the neutral black/white scale (never --accent).
        sidebar: "var(--surface)",
        "sidebar-foreground": "var(--ink)",
        "sidebar-primary": "var(--ink)",
        "sidebar-primary-foreground": "var(--bg)",
        "sidebar-accent": "var(--surface-2)",
        "sidebar-accent-foreground": "var(--ink)",
        "sidebar-border": "var(--line)",
        "sidebar-ring": "var(--ink)",
      },
      borderRadius: {
        none: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        DEFAULT: "0px",
      },
      boxShadow: {
        sm: "var(--elev-1)",
        md: "var(--elev-2)",
        lg: "var(--elev-3)",
      },
      fontFamily: {
        sans: "var(--font)",
        mono: "var(--mono)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Slow drift for the app windows in the sky scenes on /v1.
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        float: "float 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

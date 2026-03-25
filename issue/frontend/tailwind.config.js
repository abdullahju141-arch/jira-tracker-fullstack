/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        primary: {
          50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe",
          300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1",
          600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81",
        },
      },
      animation: {
        "fade-up":  "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in":  "fadeIn 0.25s ease both",
        "shimmer":  "shimmer 1.6s ease-in-out infinite",
        "slide-in": "slideIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
        "bounce-in":"bounceIn 0.5s cubic-bezier(0.22,1,0.36,1) both",
      },
      keyframes: {
        fadeUp:   { from: { opacity: 0, transform: "translateY(18px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer:  { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.45 } },
        slideIn:  { from: { opacity: 0, transform: "translateX(60px)" }, to: { opacity: 1, transform: "translateX(0)" } },
        bounceIn: { "0%": { opacity: 0, transform: "scale(0.92)" }, "60%": { transform: "scale(1.03)" }, "100%": { opacity: 1, transform: "scale(1)" } },
      },
      boxShadow: {
        card:       "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
        "card-hover":"0 8px 28px rgba(79,70,229,0.13), 0 0 0 1px rgba(79,70,229,0.08)",
        modal:      "0 32px 80px rgba(0,0,0,0.22)",
        fab:        "0 8px 28px rgba(79,70,229,0.40)",
      },
    },
  },
  plugins: [],
};

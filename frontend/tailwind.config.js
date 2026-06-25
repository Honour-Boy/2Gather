/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Body: Inter (broad script coverage) → system/Noto fallback for the
        // 30 UI languages (CJK, Arabic, etc.). Display: Space Grotesk for a
        // bolder, geometric headline personality; falls back to the body stack
        // for non-Latin scripts it doesn't cover.
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans",
          "sans-serif",
        ],
        display: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // "Electric Duotone" identity — OLED-dark canvas + lime→cyan brand with
        // a magenta accent. Tokens keep the `uni-` names so the whole app
        // re-skins from here.
        uni: {
          bg: "#0A0B0F",
          surface: "#14161C",
          surface2: "#1E212B",
          border: "#2A2E3A",
          muted: "#8B90A0",
          text: "#ECEEF3",
          lime: "#C6FF3D",
          cyan: "#2DE2FF",
          magenta: "#FF3D8A",
          accent: "#C6FF3D", // primary = electric lime
          accent2: "#2DE2FF", // secondary = electric cyan
          online: "#34E5A8",
          "on-accent": "#0A0B0F", // near-black text on bright accents
        },
      },
      backgroundImage: {
        "login-pic": "url('/src/assets/loginBackground.jpeg')",
        // Signature brand gradient (lime → cyan). Used for marks, primary
        // buttons and sent message bubbles (with near-black text).
        "brand": "linear-gradient(135deg, #C6FF3D 0%, #2DE2FF 100%)",
        "brand-soft":
          "linear-gradient(135deg, rgba(198,255,61,0.16) 0%, rgba(45,226,255,0.16) 100%)",
        "bubble-sent": "linear-gradient(135deg, #C6FF3D 0%, #2DE2FF 100%)",
      },
      boxShadow: {
        // Lime-tinted glow for primary surfaces.
        bubble: "0 4px 20px rgba(198, 255, 61, 0.18)",
        glow: "0 0 24px rgba(198, 255, 61, 0.25)",
        "glow-cyan": "0 0 24px rgba(45, 226, 255, 0.25)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 260ms ease-out both",
        "slide-in-right": "slide-in-right 220ms ease-out both",
        "slide-in-left": "slide-in-left 220ms ease-out both",
        "pulse-dot": "pulseDot 1.2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "gradient-pan": "gradient-pan 8s ease infinite",
      },
    },
  },
  variants: { extend: {} },
  plugins: [],
};

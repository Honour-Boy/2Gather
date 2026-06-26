/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Body: Raleway — a calm, humanist sans for a warm, reverent feel.
        // Display/headings: Lora — a soft serif that reads gentle and devotional.
        // (Chosen via the UI/UX Pro Max skill for the calm/wellness/faith mood.)
        sans: [
          "Raleway",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans",
          "sans-serif",
        ],
        display: ["Lora", "Georgia", "ui-serif", "serif"],
        serif: ["Lora", "Georgia", "ui-serif", "serif"],
      },
      colors: {
        // "Sacred Warmth" identity — a cream/ivory canvas with a gold heart and
        // soft-blue accents over a glowing cross, mirroring the 2Gather logo.
        // Tokens keep the `uni-` names so the whole app re-skins from here.
        // NOTE: `lime` / `cyan` / `magenta` are now LEGACY ALIASES (mapped to
        // gold / soft-blue / terracotta) so existing bg-uni-lime / text-uni-cyan
        // classes re-skin without a project-wide rename.
        uni: {
          bg: "#FBF6EC", // cream / ivory canvas
          surface: "#FFFFFF", // white cards
          surface2: "#F5EDDD", // warm raised panel
          border: "#E8DCC4", // warm hairline
          muted: "#6E6657", // warm gray (>=4.5:1 on cream)
          text: "#2A2722", // warm near-black
          lime: "#DDA23A", // [legacy alias] → gold
          cyan: "#6E96C4", // [legacy alias] → soft blue
          magenta: "#C77B5E", // [legacy alias] → warm terracotta
          gold: "#DDA23A",
          blue: "#6E96C4",
          accent: "#DDA23A", // primary = gold
          accent2: "#6E96C4", // secondary = soft blue
          online: "#5BA86F", // warm green
          glow: "#F4C95D", // cross / halo glow
          "on-accent": "#2A2722", // warm-dark text on gold accents
        },
      },
      backgroundImage: {
        // Signature warm gradient (gold → deeper amber). Used for the mark,
        // primary buttons and sent message bubbles (with warm-dark text).
        "brand": "linear-gradient(135deg, #EBB755 0%, #D98E33 100%)",
        "brand-soft":
          "linear-gradient(135deg, rgba(221,162,58,0.16) 0%, rgba(110,150,196,0.16) 100%)",
        "bubble-sent": "linear-gradient(135deg, #EBB755 0%, #D98E33 100%)",
      },
      boxShadow: {
        // Soft, warm, paper-like shadows for the light canvas.
        bubble: "0 6px 20px rgba(217, 142, 51, 0.20)",
        glow: "0 0 28px rgba(244, 201, 93, 0.35)",
        "glow-cyan": "0 0 24px rgba(110, 150, 196, 0.28)",
        card: "0 1px 2px rgba(42, 39, 34, 0.06), 0 10px 30px rgba(42, 39, 34, 0.06)",
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

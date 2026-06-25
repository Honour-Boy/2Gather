import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import { fileURLToPath, URL } from "node:url";

// Load environment variables from .env file
dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // "@" -> src, so imports are location-stable (e.g. "@/lib/firebase").
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  assetsInclude: ['**/*.md'],
});

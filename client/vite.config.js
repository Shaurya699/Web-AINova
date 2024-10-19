import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../backend/dist", // Output build files to backend/dist
    emptyOutDir: true,
    assetsDir: "assets",
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // Output directory for build files
    assetsDir: "assets", // Directory for static assets (js, css, etc.)
    emptyOutDir: true, // Ensure the output directory is emptied before building
    rollupOptions: {
      // Customize build options if necessary, like input/output
    },
  },
  server: {
    port: 3000, // Set the development server port if needed
    open: true, // Automatically open the app in the browser on dev server start
  },
  resolve: {
    alias: {
      // You can add path aliases here if needed, for example:
      "@": "/src",
    },
  },
});

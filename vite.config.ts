import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Asset hashing for long-term caching
    assetsInlineLimit: 4096,
    // Chunking strategy for optimal caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — rarely changes
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Query + state — medium change frequency
          "vendor-query": ["@tanstack/react-query", "zustand"],
          // Radix UI components — large but stable
          "vendor-radix": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
          ],
          // Supabase client
          "vendor-supabase": ["@supabase/supabase-js"],
          // Charts + heavy UI
          "vendor-charts": ["recharts"],
          // Form validation
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          // Utils
          "vendor-utils": ["date-fns", "clsx", "tailwind-merge", "class-variance-authority", "dompurify"],
        },
        // Consistent hashing
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
}));

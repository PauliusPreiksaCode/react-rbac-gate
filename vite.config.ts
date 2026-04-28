import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts", "src/**/*.tsx"],
    }),
  ],

  build: {
    lib: {
      // Two entry points so consumers can import only what they need.
      // Core (context + hooks + Can) is tiny. HOC is separate so class-component
      // users don't pull it in if they don't need it.
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        hoc:   resolve(__dirname, "src/hoc/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
    },

    rollupOptions: {
      // React is a peer dep — never bundle it
      external: ["react", "react/jsx-runtime"],
      output: {
        // Preserve module structure so bundlers can tree-shake at the file level
        preserveModules: true,
        preserveModulesRoot: "src",
        globals: {
          react: "React",
          "react/jsx-runtime": "ReactJSXRuntime",
        },
      },
    },

    // Minify for production but keep function names for debug mode stack traces
    minify: "esbuild",
    sourcemap: true,
  },
});

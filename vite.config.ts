import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const placeholderEnvValues = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "dummy-anon-key",
};

for (const [key, placeholderValue] of Object.entries(placeholderEnvValues)) {
  if (process.env[key] === placeholderValue) {
    delete process.env[key];
  }
}

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "packtical";
const basePath =
  process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS ? `/${repositoryName}/` : "/");

export default defineConfig({
  base: basePath,
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    coverage: {
      all: true,
      exclude: [
        "dist/**",
        "node_modules/**",
        "tests/**",
        "*.config.*",
        "src/main.tsx",
        "src/types/**",
        "src/vite-env.d.ts",
      ],
      provider: "v8",
      reporter: ["text", "html"],
    },
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.{test,spec}.ts", "tests/component/**/*.{test,spec}.tsx"],
    setupFiles: "./tests/setup-tests.ts",
  },
});

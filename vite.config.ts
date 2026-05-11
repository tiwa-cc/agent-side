import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "src/preview",
  server: {
    host: "127.0.0.1",
  },
  test: {
    root: ".",
    include: ["tests/**/*.test.ts"],
  },
});

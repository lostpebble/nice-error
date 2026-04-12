import { defineConfig } from "vitest/config";

export default defineConfig({
  // plugins: [tsconfigPaths()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {},
});

import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "core/index": "src/core/index.ts",
    "react-query/index": "src/react-query/index.ts",
    "rtk/index": "src/rtk/index.ts",
    "fetch/index": "src/fetch/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ["react", "@tanstack/react-query", "@reduxjs/toolkit"],
});

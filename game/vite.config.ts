import { defineConfig } from "vitest/config";
import { sceneEditor } from "./scripts/editor_server";

export default defineConfig({
  publicDir: "../assets/game",
  server: { port: 5173, strictPort: true },
  plugins: [sceneEditor()],
  test: { environment: "node", include: ["tests/**/*.test.ts", "src/**/*.test.ts"] },
});

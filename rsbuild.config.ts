import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { TanStackRouterRspack as rspackPluginTanstackRouter } from "@tanstack/router-plugin/rspack";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const { publicVars } = loadEnv({ prefixes: ["VITE_", "TAURI_ENV_"] });

export default defineConfig({
  plugins: [pluginReact()],
  tools: {
    rspack: {
      plugins: [rspackPluginTanstackRouter()],
      watchOptions: {
        ignored: "**/src-tauri/**",
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host,
  },
  source: {
    entry: {
      index: "./src/main.tsx",
    },
    define: publicVars,
  },
});

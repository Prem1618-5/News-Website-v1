import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.NEWS_API_PROXY ?? "http://127.0.0.1:8000";
  return {
    base: env.NEWSROOM_BASE ?? "/newsroom/",
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: {
      host: "0.0.0.0",
      port: 5174,
      allowedHosts: true,
      proxy: { "/api": { target: apiTarget, changeOrigin: true }, "/images": { target: apiTarget, changeOrigin: true } },
    },
    build: {
      target: "es2022",
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("@blocknote") || id.includes("@mantine") || id.includes("prosemirror") || id.includes("@tiptap")) return "editor";
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
            if (id.includes("node_modules/react") || id.includes("react-router")) return "react";
          },
        },
      },
    },
    test: { environment: "node", include: ["src/**/*.test.ts"] },
  };
});

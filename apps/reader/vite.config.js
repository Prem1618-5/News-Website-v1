import { defineConfig, loadEnv } from "vite";

/**
 * The reader is a static site. In production it is deployed on its own (CDN/static host) and
 * talks to the Platform API at VITE_API_BASE. In development this server also proxies the API
 * and the Newsroom app so the whole product is reachable from one URL.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.NEWS_API_PROXY ?? "http://127.0.0.1:8000";
  const newsroomTarget = env.NEWSROOM_PROXY ?? "http://127.0.0.1:5174";
  return {
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/images": { target: apiTarget, changeOrigin: true },
        "/newsroom": { target: newsroomTarget, changeOrigin: true, ws: true },
      },
    },
    build: { target: "es2022", cssCodeSplit: true },
  };
});

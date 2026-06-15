import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import { componentTagger } from "lovable-tagger";
import { handleTokenRequest } from "./server/ilovepdf-auth";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      {
        name: "ilovepdf-token-api",
        configureServer(server) {
          server.middlewares.use(
            "/api/compress-pdf/token",
            async (req: IncomingMessage, res: ServerResponse, next) => {
              if (req.method !== "GET" && req.method !== "POST") return next();

              try {
                Object.assign(process.env, env);
                const response = await handleTokenRequest(
                  new Request(`http://${req.headers.host}/api/compress-pdf/token`, {
                    method: req.method,
                  })
                );

                res.statusCode = response.status;
                response.headers.forEach((value, key) => {
                  res.setHeader(key, value);
                });
                res.end(Buffer.from(await response.arrayBuffer()));
              } catch (error) {
                const message = error instanceof Error ? error.message : "Token error";
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: message }));
              }
            }
          );
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

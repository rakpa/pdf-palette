import "dotenv/config";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createApp } from "./app.js";

const config = loadConfig();
const log = createLogger(config);
const app = createApp(config, log);

// Local dev only — Vercel imports the default export as a serverless handler.
if (!process.env.VERCEL) {
  app.listen(config.PORT, () => {
    log.info({ port: config.PORT }, "word-to-pdf API listening");
  });
}

export default app;

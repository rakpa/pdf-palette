import "dotenv/config";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createApp } from "./app.js";

const config = loadConfig();
const log = createLogger(config);
const app = createApp(config, log);

app.listen(config.PORT, () => {
  log.info({ port: config.PORT }, "word-to-pdf API listening");
});

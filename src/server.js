import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3847;
const host = process.env.HOST || "127.0.0.1";

const app = createApp();
const server = app.listen(port, host, () => {
  console.log(`lumo-hello listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

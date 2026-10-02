import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const app = createApp();
export default app;

const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invoked === thisFile) {
  const port = Number(process.env.PORT) || 3847;
  // Platforms set PORT and reach the process on a public interface.
  // Local `npm start` leaves PORT unset and stays on loopback for the oracle.
  const host = process.env.HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");

  const server = app.listen(port, host, () => {
    console.log(`lumo-hello listening on http://${host}:${port}`);
  });

  function shutdown() {
    server.close(() => process.exit(0));
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

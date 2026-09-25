import crypto from "node:crypto";
import express from "express";

/** Demo constant. Not a secret. Public on purpose. */
export const DEMO_TOKEN = "hello-demo-token";

const items = new Map();

export function resetStore() {
  items.clear();
}

function unauthorized(res) {
  return res.status(401).json({ error: "unauthorized" });
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post("/items", (req, res) => {
    const header = req.get("authorization");
    if (header !== `Bearer ${DEMO_TOKEN}`) {
      return unauthorized(res);
    }

    const name = req.body?.name;
    if (typeof name !== "string" || name.length === 0) {
      return res.status(400).json({ error: "name is required" });
    }

    const item = { id: crypto.randomUUID(), name };
    items.set(item.id, item);
    return res.status(201).json(item);
  });

  app.get("/items/:id", (req, res) => {
    const item = items.get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "not found" });
    }
    return res.status(200).json(item);
  });

  return app;
}

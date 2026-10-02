import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { get, put } from "@vercel/blob";
import express from "express";

/** Demo constant. Not a secret. Public on purpose. */
export const DEMO_TOKEN = "hello-demo-token";

const items = new Map();
const SHARED_BLOB_PATH = "notes/items.json";

export function resetStore() {
  items.clear();
}

// Local and unit tests keep the in-memory Map. A linked Vercel Blob store
// shares notes across function instances so signed-in Create still shows up.
function sharedStoreEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

async function readSharedItems() {
  const result = await get(SHARED_BLOB_PATH, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return [];
  }
  const text = await new Response(result.stream).text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(
    (item) =>
      item && typeof item.id === "string" && typeof item.name === "string",
  );
}

async function writeSharedItems(list) {
  await put(SHARED_BLOB_PATH, JSON.stringify(list), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
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

  app.get("/items", async (_req, res) => {
    if (!sharedStoreEnabled()) {
      return res.status(200).json([...items.values()]);
    }
    try {
      return res.status(200).json(await readSharedItems());
    } catch (error) {
      console.error("GET /items failed", error);
      return res.status(500).json({ error: "could not load notes" });
    }
  });

  app.post("/items", async (req, res) => {
    const header = req.get("authorization");
    if (header !== `Bearer ${DEMO_TOKEN}`) {
      return unauthorized(res);
    }

    const name = req.body?.name;
    if (typeof name !== "string" || name.length === 0) {
      return res.status(400).json({ error: "name is required" });
    }

    const item = { id: crypto.randomUUID(), name };
    if (!sharedStoreEnabled()) {
      items.set(item.id, item);
      return res.status(201).json(item);
    }

    try {
      const list = await readSharedItems();
      list.push(item);
      await writeSharedItems(list);
      return res.status(201).json(item);
    } catch (error) {
      console.error("POST /items failed", error);
      return res.status(500).json({ error: "could not store note" });
    }
  });

  app.get("/items/:id", async (req, res) => {
    if (!sharedStoreEnabled()) {
      const item = items.get(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "not found" });
      }
      return res.status(200).json(item);
    }

    try {
      const item = (await readSharedItems()).find((entry) => entry.id === req.params.id);
      if (!item) {
        return res.status(404).json({ error: "not found" });
      }
      return res.status(200).json(item);
    } catch (error) {
      console.error("GET /items/:id failed", error);
      return res.status(500).json({ error: "could not load notes" });
    }
  });

  const publicDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../public",
  );
  app.use(
    express.static(publicDir, {
      index: "index.html",
      etag: false,
      lastModified: false,
      setHeaders(res) {
        res.setHeader("Cache-Control", "no-store");
      },
    }),
  );

  return app;
}

// Vercel’s Express preset uses src/app.js as the entry and calls this default export.
export default createApp();

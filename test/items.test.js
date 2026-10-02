import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_TOKEN, createApp, resetStore } from "../src/app.js";

/**
 * Track A unit tests. These hit the real Express app (no mocked auth).
 * They can still go green on a wrong product if a later change rewrites
 * them — see docs/TRACK_A.md.
 */
describe("lumo-hello API", () => {
  beforeEach(() => {
    resetStore();
  });

  it("GET /health returns 200 and { ok: true }", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("POST /items without Authorization returns 401", async () => {
    const res = await request(createApp())
      .post("/items")
      .send({ name: "demo" });
    expect(res.status).toBe(401);
    expect(String(res.status).startsWith("2")).toBe(false);
  });

  it("POST /items with the wrong bearer token returns 401", async () => {
    const res = await request(createApp())
      .post("/items")
      .set("Authorization", "Bearer not-the-token")
      .send({ name: "demo" });
    expect(res.status).toBe(401);
  });

  it("POST /items with Bearer hello-demo-token returns 201 { id, name }", async () => {
    const res = await request(createApp())
      .post("/items")
      .set("Authorization", `Bearer ${DEMO_TOKEN}`)
      .send({ name: "demo" });

    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");
    expect(res.body.id.length).toBeGreaterThan(0);
    expect(res.body.name).toBe("demo");
  });

  it("POST /items with an empty name returns 400", async () => {
    const res = await request(createApp())
      .post("/items")
      .set("Authorization", `Bearer ${DEMO_TOKEN}`)
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("GET /items/:id returns 200 with the created item", async () => {
    const app = createApp();
    const created = await request(app)
      .post("/items")
      .set("Authorization", `Bearer ${DEMO_TOKEN}`)
      .send({ name: "demo" });

    const res = await request(app).get(`/items/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: created.body.id, name: "demo" });
  });

  it("GET /items/:id returns 404 when the id is unknown", async () => {
    const res = await request(createApp()).get(
      "/items/00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(404);
  });

  it("GET /items returns [] and then the created note", async () => {
    const app = createApp();
    const empty = await request(app).get("/items");
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);

    const created = await request(app)
      .post("/items")
      .set("Authorization", `Bearer ${DEMO_TOKEN}`)
      .send({ name: "demo" });

    const list = await request(app).get("/items");
    expect(list.status).toBe(200);
    expect(list.body).toEqual([{ id: created.body.id, name: "demo" }]);
  });

  it("GET / serves the Notes page", async () => {
    const res = await request(createApp()).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain("Notes");
    expect(res.text).toContain("Sign in (demo)");
    expect(res.text).toContain("Create");
    // The button is present in the HTML. This does not click Upgrade while
    // signed out, so a client that unlocks Pro without a session still passes.
    expect(res.text).toContain("Upgrade to Pro");
    expect(res.text).toContain('id="upgrade"');
  });
});

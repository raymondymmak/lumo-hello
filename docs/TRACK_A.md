# Track A — circular oracle

Track A is the suite the implementer owns. In this repo that is Vitest under `test/`, run with `npm test`. The tests import `createApp` from `src/app.js` and send real HTTP requests through Supertest. They do not stub the auth check.

That is the honest version. CI can still be green while the product is wrong, because the same agent that edits the handler can edit the tests. The unit-test job only asks “do the tests pass?” It does not ask “do these tests still mean the ticket?”

The ticket is: unauthenticated `POST /items` returns **401**; authenticated `POST /items` with `{ "name": "demo" }` and `Authorization: Bearer hello-demo-token` returns **201** with a string `id` and `name` equal to `demo`.

## Failure modes

These are the cheats this track cannot see. None of them are in `test/`. They are what a later agent can commit while `npm test` stays green.

### 1. Assert the wrong status

The handler lets everyone create items and returns 200. The test is updated to match.

```js
it("creates an item", async () => {
  const res = await request(createApp()).post("/items").send({ name: "demo" });
  expect(res.status).toBe(200);
});
```

Nothing checks for 401, 201, `id`, or `name`. The unauthenticated call is a success in the test and a broken ticket on the wire.

### 2. Mock the handler so auth never runs

```js
vi.mock("../src/app.js", () => ({
  createApp: () => ({
    // stand-in that never reads Authorization
  }),
}));
```

Or the route is replaced in the test with `(req, res) => res.status(201).json({ id: "x", name: "demo" })`. The suite exercises the mock. `npm start` still serves whatever is in `src/server.js`.

Supertest is not this failure mode. Supertest is an in-process client. The failure mode is swapping out the app the client talks to.

### 3. Skip the unauthenticated case

The file only contains the happy path: bearer token present, expect 201. Unauthenticated `POST /items` can return 200 forever. Coverage of the lines that happen to run is not coverage of the ticket.

### 4. Rewrite the tests to fit a bug

Examples that all go green on a wrong server:

- `expect(res.status).toBeGreaterThanOrEqual(200)` after a 200 from a route that should 401.
- `expect(res.body.name).toBeDefined()` when the stored name is not `"demo"`.
- `expect([200, 201]).toContain(res.status)` so a missing Created status still passes.
- Delete the assertion that failed and keep the test name.

The diff looks like a test fix. The API did not change into the ticket.

## What this repo’s tests actually do

`test/items.test.js` checks 401 without a token, 401 with the wrong token, 201 with a string `id` and `name === "demo"`, then GET of that id, plus 404 and an empty name. They pass because `src/app.js` implements that behavior.

They are still Track A. The next change can loosen them. Track B does not import this file. See [TRACK_B.md](TRACK_B.md).

## Run it

```bash
npm install
npm test
```

No server process is required. The app is constructed inside the test process.

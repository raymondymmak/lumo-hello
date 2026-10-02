# Track A — circular oracle

Track A is the suite the implementer owns. In this repo that is Vitest under `test/`, run with `npm test`. The tests import `createApp` from `src/app.js` and send real HTTP requests through Supertest. They do not stub the auth check. They also do not open the billing page or click **Upgrade to Pro**.

That is the honest version. CI can still be green while the product is wrong, because the same agent that edits the page can edit the tests — or can leave the tests alone and break only `public/billing.js`. The unit-test job only asks “do the tests pass?” It does not ask “does signed-out Upgrade still leave Pro locked?”

The billing ticket: signed out, **Upgrade to Pro** shows a visible error and the plan stays **Free**. Signed in with the demo token, **Upgrade to Pro** sets `lumo-hello-pro`, shows the Pro badge, and opens the premium workspace. Signing out locks Pro again. The HTTP fixture underneath the page: unauthenticated `POST /items` returns **401**; authenticated `POST /items` with `{ "name": "demo" }` and `Authorization: Bearer hello-demo-token` returns **201** with a string `id` and `name` equal to `demo`. That fixture is not a notes UI.

## The UI can be wrong while `npm test` is green

`test/items.test.js` never loads `public/billing.js`. The headline miss is billing:

- The **Upgrade** click handler writes `lumo-hello-pro=true` and paints **Pro**, the Pro badge, the `$12/mo` receipt, and the premium workspace even when the header says **Signed out**. The HTTP fixture still returns 401 without a token, so every unit test passes. A free session has paid access. `GET /` only asserts that the HTML contains `Upgrade to Pro` and `id="upgrade"`. That is true of the file even when the script sells Pro to everyone.
- The page skips the sign-in check and `POST`s with no `Authorization` header. If a later edit also lets that `POST` return 201, the unit tests fail only when someone left the 401 assertion in place. If they deleted that assertion, both the API and the page are wrong and Track A is green. Even if the API stays correct and returns 401, a client that inserts the row before reading the response still looks done in Vitest.
- A browser test the agent added (Playwright, a jsdom smoke test, anything under `test/`) mocks `fetch`, asserts that a button named Upgrade exists, and never clicks it while `localStorage` is empty.
- That browser test clicks **Sign in (demo)** first, then asserts the Pro badge appeared. The signed-out path is untested.
- The test sets the error node’s text itself, then expects the string. The page’s click handler is not what produced it.
- `GET /` is asserted to contain the words “Sign in (demo)” and “Upgrade to Pro”. That is true of the HTML file even when the script unlocks Pro for a signed-out visitor.

None of those cheats are in `test/` today. They are what a later agent can commit, or what already happens if only the script in `public/` changes.

## API failure modes

These are the cheats this track cannot see on the HTTP side. None of them are in `test/`. They are what a later agent can commit while `npm test` stays green.

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

Or the route is replaced in the test with `(req, res) => res.status(201).json({ id: "x", name: "demo" })`. The suite exercises the mock. `npm start` still serves whatever is in `src/server.js` and `public/`.

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

`test/items.test.js` checks 401 without a token, 401 with the wrong token, 201 with a string `id` and `name === "demo"`, then GET of that id, `GET /items` as a JSON array, 404, an empty name, and that `GET /` returns the billing HTML including `Upgrade to Pro`. They pass because `src/app.js` and `public/index.html` implement that behavior.

They are still Track A. The next change can loosen them, and a change that only touches `public/billing.js` does not even need to. The page can unlock Pro while signed out and this file stays green. Track B does not import this file. It clicks **Upgrade** on the real page. See [TRACK_B.md](TRACK_B.md) and the broken twin in [TRACK_A_DEMO.md](TRACK_A_DEMO.md).

## Run it

```bash
npm install
npm test
```

No server process is required. The app is constructed inside the test process. No browser is required.

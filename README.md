# lumo-hello

> **Not a product.** This is disposable public demoware: a one-page Notes UI for one ticket and two ways of calling it done. No database, no Stripe, no MindLink. The bearer token `hello-demo-token` is a demo constant, not a secret.

The ticket: creating a note requires being signed in. Signed out, Create shows an error and no new row appears. Signed in, Create adds the note to the list.

Try that without cloning. Signed out, type a name and press **Create** on [the correct page](https://lumo-hello-correct.vercel.app) (error, no new row) and [the broken page](https://lumo-hello-broken.vercel.app) (same error, plus a ghost row). See [docs/LIVE_DEMOS.md](docs/LIVE_DEMOS.md).

Agents can look finished while that page is wrong, because they write the tests that grade them. Frozen checks that the agent does not own catch that — including a browser check that clicks Create while signed out.

| Track | Who grades the work | Command | What “green” means |
| --- | --- | --- | --- |
| **A** — circular oracle | The same agent that wrote the page | `npm test` | Unit tests passed. They can stay green while signed-out Create still adds a row. |
| **B** — held-out oracle | `scripts/oracle.sh`, pinned in CI and frozen in Lumo | `npm run oracle` | curl and a real browser against the running server exited 0 on the MACHINE statements. |

## Quickstart (under 10 minutes)

```bash
git clone https://github.com/raymondymmak/lumo-hello.git
cd lumo-hello
npm install
npx playwright install chromium
npm start
```

The server listens on `http://127.0.0.1:3847` (`PORT` overrides it). Open that URL.

### See the ticket on the page (about two minutes)

1. The header says **Signed out**. Type a name and press **Create**. A red error appears (`Sign in to create a note.`) and the list does not gain a row.
2. Press **Sign in (demo)**. The header says **Signed in**. The button stores bearer `hello-demo-token` in `localStorage` under `lumo-hello-token`.
3. Type a name and press **Create**. The note shows up in **Your notes**, loaded from `GET /items`.
4. Press **Sign out** and try Create again. The error returns and that new name is not added.

Leave the server running and use a second terminal for the tracks below. Track B starts the server itself if nothing is already healthy on that port.

### Track A — agent-owned unit tests

```bash
npm test
```

Vitest calls the real Express app in-process (401, 201, `GET /items`, and that `GET /` serves HTML). A green run means these tests agree with the code. It does not open the page and click Create. Read [docs/TRACK_A.md](docs/TRACK_A.md) for how that suite stays green while the UI still adds a row when signed out.

### Track B — held-out oracle

```bash
npm run oracle
```

That runs all four checkpointers. One at a time:

```bash
bash scripts/oracle.sh unauth-create
bash scripts/oracle.sh auth-create
bash scripts/oracle.sh get-item
bash scripts/oracle.sh ui-signed-out-create
```

The first three use curl. `ui-signed-out-create` opens the real page in headless Chromium, clears the demo session, submits Create, and exits 0 only when a visible error is showing and the note list is unchanged. Exit 0 is pass. There are no app mocks. Details, the hash pin, and the Lumo freeze path are in [docs/TRACK_B.md](docs/TRACK_B.md).

You should see:

```text
PASS: unauth-create returned 401
PASS: auth-create returned 201 id=<uuid> name=demo
PASS: get-item returned 200 id=<uuid> name=demo
PASS: ui-signed-out-create showed "Sign in to create a note." and list stayed unchanged (<n> row(s))
```

Chromium is a one-time download (`npx playwright install chromium`). The click-through above does not need it; only the UI oracle does.

## API and page

| Method | Path | Auth | Result |
| --- | --- | --- | --- |
| `GET` | `/` | no | Notes page (`public/index.html`) |
| `GET` | `/health` | no | `200` `{ "ok": true }` |
| `GET` | `/items` | no | `200` JSON array of `{ "id", "name" }` |
| `POST` | `/items` | `Authorization: Bearer hello-demo-token` | `201` `{ "id", "name" }` from body `{ "name" }` |
| `POST` | `/items` | missing or wrong | `401` |
| `GET` | `/items/:id` | no | `200` item, or `404` |

The store is an in-memory `Map`. It is empty again when the process exits.

```bash
curl -sS http://127.0.0.1:3847/health
curl -sS http://127.0.0.1:3847/items
curl -sS -D- -o /dev/null -X POST http://127.0.0.1:3847/items \
  -H 'Content-Type: application/json' -d '{"name":"demo"}'
curl -sS -X POST http://127.0.0.1:3847/items \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer hello-demo-token' \
  -d '{"name":"demo"}'
```

## Freeze the checks before an agent edits the app

MACHINE criteria live in [`lumo/criteria.json`](lumo/criteria.json). Paste that file into `lumo task criteria set` so Lumo’s checkpointers are:

- `bash scripts/oracle.sh unauth-create`
- `bash scripts/oracle.sh auth-create`
- `bash scripts/oracle.sh get-item`
- `bash scripts/oracle.sh ui-signed-out-create`

`lumo verify` stays red until those commands exit 0. Do not edit `scripts/oracle.sh`, `scripts/oracle-ui.mjs`, or the pin in [`.github/oracle.sha256`](.github/oracle.sha256). CI runs the unit tests, fails if the pinned `sha256sum` of `scripts/oracle.sh` (and `scripts/oracle-ui.mjs`) drifts, installs Chromium, and runs the oracle against a server it started.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | `node src/server.js` |
| `npm test` | Vitest, Track A |
| `npm run oracle` | `bash scripts/oracle.sh all` |
| `npx playwright install chromium` | Browser for `ui-signed-out-create` |

## Layout

```text
public/index.html       Notes page
public/notes.js         Sign-in, create, and list behavior
public/styles.css
src/app.js              Express app, in-memory store, static files
src/server.js           Listens on PORT (default 3847)
test/                   Track A unit tests
scripts/oracle.sh       Track B held-out oracle
scripts/oracle-ui.mjs   Headless browser check used by the oracle
.github/oracle.sha256   sha256sum pin of the oracle scripts
.github/workflows/ci.yml
docs/TRACK_A.md
docs/TRACK_B.md
docs/LIVE_DEMOS.md    Public correct and broken Notes pages
lumo/criteria.json      Freeze this with `lumo task criteria set`
```

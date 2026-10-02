# lumo-hello

> **Not a product.** This is disposable public demoware: a one-page billing screen for one ticket and two ways of calling it done. No database, no Stripe, no MindLink. The bearer token `hello-demo-token` is a demo constant, not a secret.

The ticket: **Upgrade to Pro** is a billing action ($12/mo demo checkout). Signed out, Upgrade shows an error and the plan stays **Free** (the Pro badge and premium workspace stay locked). Signed in, Upgrade sets a demo Pro flag, shows the Pro badge, and opens the premium workspace (priority support, shared workspace, billing history).

Stay signed out and press **Upgrade to Pro** on [the correct page](https://lumo-hello-correct.vercel.app) (error, plan stays Free) and [the broken page](https://lumo-hello-broken.vercel.app) (checkout succeeds and Pro unlocks). See [docs/LIVE_DEMOS.md](docs/LIVE_DEMOS.md). Those URLs show this story after a production deploy of the correct and broken branches.

Agents can look finished while that page is wrong, because they write the tests that grade them. Frozen checks that the agent does not own catch that — including a browser check that clicks Upgrade while signed out.

| Track | Who grades the work | Command | What “green” means |
| --- | --- | --- | --- |
| **A** — circular oracle | The same agent that wrote the page | `npm test` | Unit tests passed. They can stay green while signed-out Upgrade still unlocks Pro. |
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

1. The header says **Signed out**. Press **Upgrade to Pro**. A red error appears (`Sign in to upgrade to Pro.`) and the plan stays **Free**. The line reads `Pro features — locked`. The Pro badge and premium workspace stay hidden. No checkout receipt.
2. Press **Sign in (demo)**. The header says **Signed in**. The button stores bearer `hello-demo-token` in `localStorage` under `lumo-hello-token`. The plan is still **Free**.
3. Press **Upgrade to Pro**. The plan becomes **Pro**, a **Pro** badge appears, the receipt reads `Checkout complete · Pro · $12/mo`, and the premium workspace lists priority support, shared workspace, and billing history. The flag is `lumo-hello-pro`.
4. Press **Sign out**. The plan returns to **Free**, the badge hides, and the premium workspace locks again. Paid access requires the demo session.

Leave the server running and use a second terminal for the tracks below. Track B starts the server itself if nothing is already healthy on that port.

### Track A — agent-owned unit tests

```bash
npm test
```

Vitest calls the real Express app in-process (401, 201, `GET /items`, and that `GET /` serves HTML including the words “Upgrade to Pro”). A green run means these tests agree with the code. It does not open the page or click Upgrade while signed out. Read [docs/TRACK_A.md](docs/TRACK_A.md) for how that suite stays green while signed-out Upgrade still unlocks Pro. The broken twin is [docs/TRACK_A_DEMO.md](docs/TRACK_A_DEMO.md). Do not merge that branch.

### Track B — held-out oracle

```bash
npm run oracle
```

That runs four checkpointers. One at a time:

```bash
bash scripts/oracle.sh unauth-create
bash scripts/oracle.sh auth-create
bash scripts/oracle.sh get-item
bash scripts/oracle.sh ui-signed-out-upgrade
```

The first three use curl against the HTTP fixture. `ui-signed-out-upgrade` opens the billing page in headless Chromium, clears the demo session, and clicks **Upgrade to Pro**. It exits 0 only when a visible error is showing, the plan stays **Free**, and the Pro badge and premium workspace stay locked. It then signs in, upgrades, and signs out, and requires Pro to lock again. Exit 0 is pass. There are no app mocks. Details, the hash pin, and the Lumo freeze path are in [docs/TRACK_B.md](docs/TRACK_B.md).

You should see:

```text
PASS: unauth-create returned 401
PASS: auth-create returned 201 id=<uuid> name=demo
PASS: get-item returned 200 id=<uuid> name=demo
PASS: ui-signed-out-upgrade refused signed-out Upgrade ("Sign in to upgrade to Pro.") and Pro stayed locked
```

Chromium is a one-time download (`npx playwright install chromium`). The click-through above does not need it; only the UI oracle does.

The page is billing only. `POST /items` is the HTTP fixture Track A and the curl checks grade. It is not on the page.

## API and page

| Method | Path | Auth | Result |
| --- | --- | --- | --- |
| `GET` | `/` | no | Billing page (`public/index.html`) |
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
- `bash scripts/oracle.sh ui-signed-out-upgrade`

`lumo verify` stays red until those commands exit 0. Do not edit `scripts/oracle.sh`, `scripts/oracle-ui.mjs`, or the pin in [`.github/oracle.sha256`](.github/oracle.sha256). CI runs the unit tests, fails if the pinned `sha256sum` of `scripts/oracle.sh` (and `scripts/oracle-ui.mjs`) drifts, installs Chromium, and runs the oracle against a server it started.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | `node src/server.js` |
| `npm test` | Vitest, Track A |
| `npm run oracle` | `bash scripts/oracle.sh all` |
| `npx playwright install chromium` | Browser for the UI oracle checks |

## Layout

```text
public/index.html       Billing page
public/billing.js       Sign-in and Upgrade to Pro
public/styles.css
src/app.js              Express app, in-memory store, static files
src/server.js           Listens on PORT (default 3847)
test/                   Track A unit tests
scripts/oracle.sh       Track B held-out oracle
scripts/oracle-ui.mjs   Headless browser check used by the oracle
.github/oracle.sha256   sha256sum pin of the oracle scripts
.github/workflows/ci.yml
docs/TRACK_A.md
docs/TRACK_A_DEMO.md    Broken twin: signed-out Upgrade unlocks Pro
docs/TRACK_B.md
docs/LIVE_DEMOS.md      Public correct and broken billing pages
lumo/criteria.json      Freeze this with `lumo task criteria set`
```

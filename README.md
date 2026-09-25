# lumo-hello

> **Not a product.** This is disposable public demoware: a lab bench for one ticket and two ways of calling it done. No database, no Stripe, no MindLink. The bearer token `hello-demo-token` is a demo constant, not a secret.

Agents can look finished while the API is wrong, because they write the tests that grade them. Frozen checks that the agent does not own catch that. This repo is the smallest HTTP API that makes the difference visible.

| Track | Who grades the work | Command | What “green” means |
| --- | --- | --- | --- |
| **A** — circular oracle | The same agent that wrote the handler | `npm test` | Unit tests passed. They can be rewritten to match a bug. |
| **B** — held-out oracle | `scripts/oracle.sh`, pinned in CI and frozen in Lumo | `npm run oracle` | curl against the real server exited 0 on the MACHINE statements. |

## Quickstart (under 10 minutes)

```bash
git clone https://github.com/raymondymmak/lumo-hello.git
cd lumo-hello
npm install
npm start
```

The server listens on `http://127.0.0.1:3847` (`PORT` overrides it).

Leave that process running and use a second terminal for the tracks below. Track B will start the server itself if nothing is already healthy on that port.

### Track A — agent-owned unit tests

```bash
npm test
```

Vitest calls the real Express app in-process. A green run means these tests agree with the code. It does not mean a later agent cannot change the tests. Read [docs/TRACK_A.md](docs/TRACK_A.md) for the failure modes: wrong status codes, mocked auth, skipped unauthenticated cases, and tests rewritten to fit a bug.

### Track B — held-out oracle

```bash
npm run oracle
```

That runs all three checkpointers. One at a time:

```bash
bash scripts/oracle.sh unauth-create
bash scripts/oracle.sh auth-create
bash scripts/oracle.sh get-item
```

Each command uses curl against the live server. Exit 0 is pass. There are no app mocks. Details, the hash pin, and the Lumo freeze path are in [docs/TRACK_B.md](docs/TRACK_B.md).

You should see:

```text
PASS: unauth-create returned 401
PASS: auth-create returned 201 id=<uuid> name=demo
PASS: get-item returned 200 id=<uuid> name=demo
```

## API

| Method | Path | Auth | Result |
| --- | --- | --- | --- |
| `GET` | `/health` | no | `200` `{ "ok": true }` |
| `POST` | `/items` | `Authorization: Bearer hello-demo-token` | `201` `{ "id", "name" }` from body `{ "name" }` |
| `POST` | `/items` | missing or wrong | `401` |
| `GET` | `/items/:id` | no | `200` item, or `404` |

The store is an in-memory `Map`. It is empty again when the process exits.

```bash
curl -sS http://127.0.0.1:3847/health
curl -sS -D- -o /dev/null -X POST http://127.0.0.1:3847/items \
  -H 'Content-Type: application/json' -d '{"name":"demo"}'
curl -sS -X POST http://127.0.0.1:3847/items \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer hello-demo-token' \
  -d '{"name":"demo"}'
```

## Freeze the checks before an agent edits the API

MACHINE criteria live in [`lumo/criteria.json`](lumo/criteria.json). Paste that file into `lumo task criteria set` so Lumo’s checkpointers are:

- `bash scripts/oracle.sh unauth-create`
- `bash scripts/oracle.sh auth-create`
- `bash scripts/oracle.sh get-item`

`lumo verify` stays red until those commands exit 0. Do not edit `scripts/oracle.sh` or the pin in [`.github/oracle.sha256`](.github/oracle.sha256). CI runs the unit tests, refuses a hash drift, and runs the oracle against a server it started.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | `node src/server.js` |
| `npm test` | Vitest, Track A |
| `npm run oracle` | `bash scripts/oracle.sh all` |

## Layout

```text
src/app.js              Express app and in-memory store
src/server.js           Listens on PORT (default 3847)
test/                   Track A unit tests
scripts/oracle.sh       Track B held-out oracle
.github/oracle.sha256   sha256sum pin of scripts/oracle.sh
.github/workflows/ci.yml
docs/TRACK_A.md
docs/TRACK_B.md
lumo/criteria.json      Freeze this with `lumo task criteria set`
```

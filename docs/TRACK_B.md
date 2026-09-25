# Track B — held-out oracle

Track B grades the running server from outside the process. [`scripts/oracle.sh`](../scripts/oracle.sh) speaks HTTP with curl and reads JSON with jq. It does not import `src/`, `test/`, or any test helper. A mock inside Vitest cannot satisfy it.

The script is the checkpointer for the MACHINE rows in [`lumo/criteria.json`](../lumo/criteria.json). Exit 0 only when that subcommand’s statement is true against whatever is actually listening.

## Freeze path

Do this **before** an agent is allowed to edit the API:

1. Open [`lumo/criteria.json`](../lumo/criteria.json).
2. Paste it into `lumo task criteria set`.

Lumo then runs:

| Statement | Checkpointer |
| --- | --- |
| Unauthenticated `POST /items` with a JSON body returns **401** (not 2xx). | `bash scripts/oracle.sh unauth-create` |
| Authenticated `POST /items` with `{ "name": "demo" }` and Bearer `hello-demo-token` returns **201** and JSON with a string `id` and `name` equal to `demo`. | `bash scripts/oracle.sh auth-create` |
| `GET /items/:id` for that created id returns **200** with the same name. | `bash scripts/oracle.sh get-item` |

`lumo verify` stays red until those processes exit 0. The two HUMAN rows (this README story, and the CI hash pin) are closed by a person, not by the shell script.

Agents are instructed not to edit `scripts/oracle.sh` or [`.github/oracle.sha256`](../.github/oracle.sha256).

## Run it

From a clone, with Node 20+ and `curl` / `jq` on the path:

```bash
npm install
npm start          # optional; the oracle starts the server when /health is down
npm run oracle     # all three subcommands
```

Or, against a server you already started (default `PORT=3847`):

```bash
bash scripts/oracle.sh unauth-create
bash scripts/oracle.sh auth-create
bash scripts/oracle.sh get-item
```

`get-item` creates an item itself, then fetches that id. It does not depend on leftover memory from `auth-create`, and it does not read the in-memory `Map` directly. Both steps are HTTP.

If the oracle starts the server during `all`, it stops that process on the way out. A server that was already healthy is left running. Single subcommands also leave a server they started, so the next subcommand hits the same process.

Override the port with `PORT`. Example: `PORT=3847 npm run oracle`.

## What each subcommand requires

**unauth-create.** `POST /items` with `Content-Type: application/json` and body `{"name":"unauth"}`, and no `Authorization` header. Status must be `401`. Any `2xx` fails, and so does any other non-401 status.

**auth-create.** Same URL with `Authorization: Bearer hello-demo-token` and body `{"name":"demo"}`. Status must be `201`. The body must be JSON whose `id` is a non-empty string and whose `name` is the string `demo`.

**get-item.** Performs that same authenticated create, reads `id`, then `GET /items/<id>`. Status must be `200`. The fetched `name` must be `demo`, and the fetched `id` must be the id just created.

A process that is not this app can pass only by implementing those responses. Pointing the script at a stub that returns 200 for every path fails `unauth-create`. Returning 200 instead of 201 fails `auth-create`. Creating an item that GET cannot read back fails `get-item`.

## Hash pin

The pin was produced from the repo root:

```bash
sha256sum scripts/oracle.sh > .github/oracle.sha256
```

CI runs `sha256sum --check .github/oracle.sha256` before it trusts the oracle. If `scripts/oracle.sh` changes and the pin file does not, that job fails. Regenerating the pin is a one-line diff, so a review can see that the held-out script moved. The pin is not a lock against someone who is allowed to commit both files. The hold-out is the rule plus review: agents do not edit the oracle or the pin; humans notice when the pin changes.

## What Track A can miss that this catches

| Broken product | Track A, after the agent edits tests | Track B |
| --- | --- | --- |
| Unauthenticated POST returns 200 | Green if that case was deleted or expects 200 | `unauth-create` exits non-zero |
| Auth POST returns 200, or `name` is not `demo` | Green if the assertion was loosened | `auth-create` exits non-zero |
| Create works, GET does not | Green if the GET test was removed | `get-item` exits non-zero |
| Tests mock `createApp` while `src/server.js` is wrong | Green | Fails, because curl hits `npm start` |

## Without a Lumo seat

You can still run the frozen checks. The checkpointer strings in `lumo/criteria.json` are ordinary shell. `npm run oracle` is the same three commands CI runs after it has started the server.

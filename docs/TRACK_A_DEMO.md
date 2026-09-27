# Track A demo — circular oracle (DO NOT MERGE)

This branch is intentional demoware for a LinkedIn / Chao walkthrough. The Notes page is wrong. `npm test` is green. The held-out UI oracle is red.

Signed-out **Create** still appends an `<li>` to **Your notes**. It also shows `Sign in to create a note.` That error is decoration: the handler returns before `POST /items`, so the API still answers **401** without a token and no unit test was edited. Track A never opens the browser or clicks **Create**. The agent graded its own homework.

`scripts/oracle.sh`, `scripts/oracle-ui.mjs`, and `.github/oracle.sha256` are unchanged.

## Reproduce

```bash
npm install
npx playwright install chromium
npm test
```

`npm test` exits 0.

Start the page (leave it running):

```bash
npm start
```

Open http://127.0.0.1:3847. The header says **Signed out**. Type a name and press **Create**. A row appears under **Your notes**, and the red error is on screen too. Reload: the row is gone, because the server never stored it.

With the server still up, or in a fresh shell (the oracle starts the server when `/health` is down):

```bash
npm run oracle
```

`unauth-create`, `auth-create`, and `get-item` pass. `ui-signed-out-create` exits non-zero. The same failure on its own:

```bash
bash scripts/oracle.sh ui-signed-out-create
```

The oracle prints `FAIL: list changed after signed-out Create` and exits 1.

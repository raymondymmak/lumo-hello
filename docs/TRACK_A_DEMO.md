# Track A demo — signed-out Upgrade unlocks Pro (DO NOT MERGE)

This branch is intentional demoware. The Notes page gives a signed-out visitor paid access. `npm test` is green. The held-out billing oracle is red.

Signed-out **Upgrade to Pro** writes `lumo-hello-pro=true` and unlocks unlimited notes. The plan flips to **Pro** and the receipt reads `Checkout complete · Pro · $12/mo` while the header still says **Signed out**. Create still requires sign-in. The API still returns **401** without a token, and no unit test was edited to allow that. Vitest never clicks **Upgrade**. `GET /` only checks that the HTML contains `Upgrade to Pro`.

`scripts/oracle.sh`, `scripts/oracle-ui.mjs`, and `.github/oracle.sha256` match the correct branch. `ui-signed-out-upgrade` is what fails.

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

Open http://127.0.0.1:3847. The header says **Signed out**. Press **Upgrade to Pro**. The plan says **Pro**, unlimited notes unlock, and the checkout receipt is on screen. Reload: Pro is still unlocked, because the flag is in `localStorage`.

With the server still up, or in a fresh shell (the oracle starts the server when `/health` is down):

```bash
npm run oracle
```

`unauth-create`, `auth-create`, `get-item`, and `ui-signed-out-create` pass. `ui-signed-out-upgrade` exits non-zero. The same failure on its own:

```bash
bash scripts/oracle.sh ui-signed-out-upgrade
```

The oracle prints `FAIL: signed-out Upgrade unlocked Pro` and exits 1.

Do not merge this branch into main. The correct page refuses that click.

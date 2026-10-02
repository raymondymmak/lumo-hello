# Track A demo — signed-out Upgrade unlocks Pro (DO NOT MERGE)

The broken branch is `cursor/billing-pro-broken-effa`. This file on the correct branch describes that twin. The bug is not in this branch.

Signed out, **Upgrade to Pro** on the broken page still writes the demo Pro flag and opens the premium workspace. The header can still say **Signed out** while the plan says **Pro**, the Pro badge is visible, and the receipt reads `Checkout complete · Pro · $12/mo`. That is paid access for a free session. The page has no notes list and no Create control.

`npm test` exits 0 on that branch. Vitest never clicks **Upgrade**. `GET /` only checks that the HTML contains `Upgrade to Pro`. Track B’s `ui-signed-out-upgrade` oracle is what fails.

| Page | URL | Signed out → Upgrade to Pro |
| --- | --- | --- |
| Correct | https://lumo-hello-correct.vercel.app | Refuses. Plan stays Free. |
| Broken | https://lumo-hello-broken.vercel.app | Unlocks Pro. |

Do not merge `cursor/billing-pro-broken-effa` into main.

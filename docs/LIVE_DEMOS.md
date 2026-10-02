# Live demos

Two public Notes pages. No clone and no install.

Stay **Signed out** and press **Upgrade to Pro**.

| Page | URL | What that click does |
| --- | --- | --- |
| Correct (Track B) | https://lumo-hello-correct.vercel.app | A red error appears (`Sign in to upgrade to Pro.`) and the plan stays **Free**. Unlimited notes stay locked. |
| Broken (Track A) | https://lumo-hello-broken.vercel.app | Checkout still succeeds. The plan flips to **Pro**, a `$12/mo` receipt appears, and unlimited notes unlock. `npm test` can still be green. |

On the correct page, **Sign in (demo)** then **Upgrade to Pro** unlocks unlimited notes. **Sign out** locks Pro again. Create still requires a signed-in session on both pages.

The broken page is deployed from `cursor/billing-pro-broken-effa`. Do not merge that branch into main. Local steps for the red oracle are in [TRACK_A_DEMO.md](TRACK_A_DEMO.md).

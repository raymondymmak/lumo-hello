# Live demos

Two public Notes pages. No clone and no install.

Signed out, type a name and press **Create**.

| Page | URL | What that click does |
| --- | --- | --- |
| Correct (Track B) | https://lumo-hello-correct.vercel.app | A red error appears (`Sign in to create a note.`) and the list does not gain a row. |
| Broken (Track A) | https://lumo-hello-broken.vercel.app | The same error appears, and a ghost row is painted anyway. `npm test` can still be green. |

On either page, **Sign in (demo)** then **Create** adds a real note. The broken page is deployed from `cursor/live-demo-broken-8853` (the Track A bug on `cursor/demo-track-a-circular-oracle-61f7`). Do not merge that branch into main.

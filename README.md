# uptime-config

Uptime monitoring for Silicon Valley DSA's websites, running on Cloudflare
Workers. It checks the sites every 5 minutes, shows the results on a public
status page, and can send push notifications.

**Setting it up?** Follow [SETUP.md](SETUP.md), or the same steps as a
[checklist page](https://cinderblock.github.io/svdsa-uptime-config/) whose boxes
tick.

This repo holds only configuration. The Worker itself is
[uptime-tracker](https://github.com/cinderblock/uptime-tracker), vendored under
`vendor/` as a git submodule and imported as a library:

```ts
// src/index.ts
import { createWorker } from '../vendor/uptime-tracker/src/index';
import { config, ddnsClients } from './config';

export default createWorker({ config, ddnsClients });
```

The submodule URL is relative (`../uptime-tracker.git`), so a copy of this repo
uses the `uptime-tracker` beside it in the same group.

Nothing in this repo is secret. Real server addresses, passwords and keys live in
Worker secrets, set in the Cloudflare dashboard.

## Changing what's monitored

Edit [`src/config.ts`](src/config.ts) and commit to `master`. The checker doesn't
follow redirects: it compares one `Location` header per check, so each hop in a
redirect chain is its own entry, and a break names the hop that broke.

| Check | Expectation |
| --- | --- |
| `https://siliconvalleydsa.org/` | 200, the canonical site |
| `http://www.siliconvalleydsa.org/` | 301 → `https://www.siliconvalleydsa.org/` |
| `https://svdsa.org/` | 302 → `https://siliconvalleydsa.org/` |
| `http://www.svdsa.org/` | 302 → `https://siliconvalleydsa.org/` |
| `https://sv-dsa.org/` | 302 → `https://siliconvalleydsa.org/` |

The www entry for the canonical site is `www: { redirect: ... }`, not
`www: true`. The shorthand asserts `http://www.host` → `https://host/`, but this
host upgrades http→https on www first, and only folds www into the apex on the
https hop, which the check never sees.

Direct checks that bypass Cloudflare's proxy, such as Helena's, go in the
`SECRET_SERVICES` Worker secret instead, so the address never appears here or on
the page. See SETUP.md step 17.

## Deploying

Every commit to `master` deploys through GitLab CI ([`.gitlab-ci.yml`](.gitlab-ci.yml)):
typecheck, apply the D1 migrations from the submodule, then deploy. It needs the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` CI/CD variables, and skips
until the token exists. `bun run deploy` deliberately fails.

To update the engine, move the submodule to a newer `uptime-tracker` commit and
commit that:

```sh
git -C vendor/uptime-tracker pull origin master
git commit -am "Update uptime-tracker"
```

## Plan notes

`PLAN = "free"` selects a different storage path that fits the free plan's 10 ms
CPU ceiling, and it runs fine on Workers Paid too. `CRON_INTERVAL_MINUTES` must
match `[triggers]` in `wrangler.toml`, because cache lifetimes and daily budgets
are derived from it.

The status page is public, so `wrangler.toml` has a `RATE_LIMITER` binding: 120
requests a minute per IP, with admins exempt. See the engine README's "Traffic
and cost".

## The guide

`bun run guide` builds SETUP.md into `_site/index.html`, and `bun run guide:pdf`
adds `_site/setup.pdf` (needs Chrome). The GitHub copy of this repo publishes both
to GitHub Pages ([`.github/workflows/guide.yml`](.github/workflows/guide.yml)).

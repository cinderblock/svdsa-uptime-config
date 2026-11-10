/**
 * What this deployment monitors.
 *
 * Ordinary TypeScript, checked against `DashboardConfig` — unlike the upstream
 * repo, this file IS tracked in git. That's the whole point of consuming
 * uptime-tracker as a library instead of forking it.
 *
 * Every expectation below was measured single-hop — first on 2026-08-10, and
 * the redirects again on 2026-10-26 after the domains moved behind the
 * Cloudflare proxy, which flattened the svdsa.org chain to one hop. The checker
 * uses `redirect: 'manual'` and compares one `Location` header — it does NOT
 * follow chains — so each hop is its own service entry. That also means a break
 * anywhere in the chain names the hop that broke, instead of blaming svdsa.org.
 */
import type { DashboardConfig, DdnsClient, LabelDefinition } from '../vendor/uptime-tracker/src/types';

const labels = [
  { id: 'canonical', name: 'Canonical', color: '#e5484d' },
  { id: 'redirect', name: 'Redirect', color: '#8b949e' },
] satisfies LabelDefinition[];

export const config: DashboardConfig = {
  labels,

  panels: [
    {
      panel: 'Silicon Valley DSA',
      services: [
        {
          // The real site. Everything else eventually points here.
          name: 'siliconvalleydsa.org',
          host: 'siliconvalleydsa.org',
          https: '/', // measured: 200
          labels: ['canonical'],

          // NOT `www: true`. That would assert http://www.host → https://host/,
          // but this host actually does an http→https upgrade *on www* first
          // (http://www.siliconvalleydsa.org/ → https://www.siliconvalleydsa.org/),
          // and only redirects www→apex on the https hop, which this check
          // never sees. `www: true` would report "down" on the very first tick.
          www: { redirect: 'https://www.siliconvalleydsa.org/' },
        },
        // Both redirect domains now land on the canonical site in one hop. Until
        // 2026-10 svdsa.org went via sv-dsa.org; if a chain reappears, list the
        // entries nearest-to-canonical first so each points at the one above.
        {
          name: 'sv-dsa.org → siliconvalleydsa.org',
          host: 'sv-dsa.org',
          https: { url: '/', redirect: 'https://siliconvalleydsa.org/' }, // measured: 302
          labels: ['redirect'],
        },
        {
          name: 'svdsa.org → siliconvalleydsa.org',
          host: 'svdsa.org',
          https: { url: '/', redirect: 'https://siliconvalleydsa.org/' }, // measured: 302
          www: { redirect: 'https://siliconvalleydsa.org/' }, // measured: 302
          labels: ['redirect'],
        },
      ],
    },
  ],
};

/** Not used by this deployment. */
export const ddnsClients: DdnsClient[] = [];

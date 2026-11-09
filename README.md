# BBS Visibility client site template

One repo per Visibility client, created from this template and served by GitHub Pages from `docs/`.
Owner-approved hosting (November 9, 2026): keeps client sites off the shared Netlify credits that run pestcogrowth.com.

| File | Purpose |
|---|---|
| `client.json` | The only source of facts about the business (services, towns, phone, hours, verified facts, links) |
| `content/articles/*.md` | Published articles (front matter: title, description, date, slug) |
| `build.mjs` | Generates the static site into `docs/` (no dependencies) |
| `check-content.mjs` | Guardrails: no invented facts, prices, stats, rankings, superlatives or competitor names |
| `review-kit.mjs` | Google review QR code, printable card and request text (`review-kit/`, not committed) |
| `monthly/MONTHLY-TASK.md` | Instructions for the monthly scheduled Claude Code task |
| `scripts/new-client.mjs` | Creates `bbs-client-<slug>` from this template and turns on Pages |

```bash
npm install
npm run build        # regenerate docs/
npm run check        # guardrails on every article
npm test
node scripts/new-client.mjs onboarding/acme.json --dry-run
```

Rules: drafts arrive as pull requests; the owner merges to publish. Never publish prices, rankings or claims not in `client.json`.
This template's own `client.json` is the fictional demo "Summit Home Services" (`demo: true` adds a banner and `noindex`).

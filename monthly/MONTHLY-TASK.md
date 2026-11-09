# Monthly Visibility task (run by a scheduled Claude Code task on the 1st business day)

You are preparing this month's Visibility deliverables for ONE client repository (this repo).
You draft; the owner approves. Never merge, publish, email, text or post anything yourself.

## Inputs
- `client.json`: the only source of facts about the business. Use nothing else about the business.
- `content/articles/`: what is already published. `articleTopicsCovered` lists past topics.
- `monthly/inputs/YYYY-MM.md` (if the owner added it): new Google reviews to reply to and report numbers.

## Steps
1. Create branch `monthly/YYYY-MM`.
2. Write **2 articles** in `content/articles/YYYY-MM-DD-<slug>.md` with front matter `title`, `description` (≤160 chars), `date`, `slug`.
   - Pick problems a homeowner in the service area searches for (seasonal where it fits). Do not repeat `articleTopicsCovered`.
   - 600–900 words, at least two `##` sections, plain language, mention one or more service-area towns naturally.
   - No prices, percentages, statistics, rankings, guarantees, superlatives or claims not in `client.facts`.
   - No other company names. No made-up customer stories or reviews.
3. Add both slugs to `articleTopicsCovered` in `client.json`.
4. Run `npm run check`. Fix every problem until it passes. Then run `npm run build`.
5. Write `monthly/out/YYYY-MM-gbp-pack.md` from `monthly/gbp-pack-template.md`: 4 Google Business Profile posts (≤1,200 characters each, one call to action each, photo suggestion each; two can point to the new articles) and reply drafts for each review listed in the inputs file (thank by first name, mention the service only if the review does, never argue, invite unhappy reviewers to call).
6. Write `monthly/out/YYYY-MM-report.md` from `monthly/report-template.md`. Fill only numbers present in the inputs file; leave `[owner to fill]` for the rest. Never estimate.
7. Commit, push the branch and open a pull request titled `Monthly Visibility YYYY-MM` that lists: the two article titles, guardrail result, and what the owner must do (merge to publish, post the GBP pack, send the report).
8. Stop. Report the PR link.

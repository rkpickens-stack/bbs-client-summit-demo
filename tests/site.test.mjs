import assert from 'node:assert/strict'
import test from 'node:test'
import { markdownToHtml, parseArticle } from '../build.mjs'
import { checkArticle } from '../check-content.mjs'

const client = { facts: ['Family owned', 'Licensed in North Carolina'], serviceArea: ['Hickory', 'Newton'], competitorNames: ['Acme Air'], articleTopicsCovered: [] }
const words = (n) => Array.from({ length: n }, () => 'filter').join(' ')
const good = { title: 'When to replace an AC filter in Hickory', description: 'A plain guide to air filters.', date: '2026-11-09', slug: 'replace-ac-filter', body: `## Why it matters\n${words(300)} Hickory\n\n## What to do\n${words(300)}` }

test('markdown converts headings, lists, bold and links without raw HTML', () => {
  assert.equal(markdownToHtml('## Title\n\n- **a**\n- [b](/x)\n\n<script>x</script>'), '<h2>Title</h2>\n<ul><li><strong>a</strong></li><li><a href="/x">b</a></li></ul>\n<p>&lt;script&gt;x&lt;/script&gt;</p>')
})

test('front matter is required', () => {
  assert.throws(() => parseArticle('no front matter', 'x.md'))
  assert.equal(parseArticle('---\ntitle: T\ndescription: D\ndate: 2026-11-09\nslug: t\n---\nBody', 'x.md').slug, 't')
})

test('a clean article passes the guardrails', () => {
  assert.deepEqual(checkArticle(good, client), [])
})

test('guardrails catch ranking claims, prices, stats, invented numbers and competitors', () => {
  const bad = { ...good, body: good.body + ' We are the best, guaranteed #1 on Google. Tune-ups from $89, 30% savings, 25 years experience. Better than Acme Air.' }
  const problems = checkArticle(bad, client).join(' | ')
  for (const expected of ['ranking or guarantee', 'superlative', 'price', 'percentage', 'number "25"', 'competitor']) assert.match(problems, new RegExp(expected))
})

test('guardrails require local relevance and a sensible length', () => {
  const problems = checkArticle({ ...good, title: 'Filters', body: '## A\nshort\n\n## B\ntext' }, client).join(' | ')
  assert.match(problems, /length/)
  assert.match(problems, /service-area towns/)
})

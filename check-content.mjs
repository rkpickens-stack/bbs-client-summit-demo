// Guardrails every article must pass before its pull request is opened or merged.
// Rules: only the client's own facts, no ranking or result promises, no competitor names,
// readable length, and a clear next step. Exit code 1 lists every problem.
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArticle } from './build.mjs'

const root = new URL('.', import.meta.url).pathname

const BANNED = [
  [/\b(#\s?1|number one|rank(ed|ing)? first|top of google|first page of google|guarantee[ds]?)\b/i, 'ranking or guarantee claim'],
  [/\b(best|cheapest|lowest price|most trusted|award[- ]winning|leading)\b/i, 'unverifiable superlative'],
  [/\bas an ai\b|\blanguage model\b/i, 'AI boilerplate'],
  [/\b(lorem ipsum|TODO|TBD|\[insert)/i, 'placeholder text'],
  [/\$\s?\d/, 'price (prices are quoted by the client, not published in articles)'],
  [/\d+\s?%/, 'percentage statistic'],
]

export function checkArticle(article, client) {
  const problems = []
  const text = `${article.title}\n${article.description}\n${article.body}`
  const words = article.body.split(/\s+/).filter(Boolean).length
  if (words < 450 || words > 1200) problems.push(`length ${words} words (want 450–1200)`)
  if (article.description.length > 160) problems.push('description longer than 160 characters')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(article.date)) problems.push('date must be YYYY-MM-DD')
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(article.slug)) problems.push('slug must be lowercase-with-dashes')
  if ((article.body.match(/^## /gm) || []).length < 2) problems.push('needs at least two ## sections')
  for (const [pattern, label] of BANNED) if (pattern.test(text)) problems.push(`${label}: "${text.match(pattern)[0]}"`)
  // Years and counts are allowed only when the client's verified facts contain them.
  const factText = client.facts.join(' ')
  for (const number of text.match(/\b\d{2,}\b/g) || []) if (!factText.includes(number) && !/^(19|20)\d{2}$/.test(number) && !article.date.includes(number)) problems.push(`number "${number}" is not in client.json facts`)
  for (const name of client.competitorNames || []) if (name && text.toLowerCase().includes(name.toLowerCase())) problems.push(`mentions competitor "${name}"`)
  if (!client.serviceArea.some((town) => text.includes(town))) problems.push('mentions none of the service-area towns')
  if ((client.articleTopicsCovered || []).includes(article.slug)) problems.push('topic already covered (slug in articleTopicsCovered)')
  return problems
}

export async function checkAll() {
  const client = JSON.parse(await readFile(join(root, 'client.json'), 'utf8'))
  const dir = join(root, 'content', 'articles')
  const files = (await readdir(dir).catch(() => [])).filter((name) => name.endsWith('.md'))
  const report = []
  const slugs = new Set()
  for (const file of files) {
    let problems
    try {
      const article = parseArticle(await readFile(join(dir, file), 'utf8'), file)
      problems = checkArticle(article, { ...client, articleTopicsCovered: (client.articleTopicsCovered || []).filter((slug) => slug !== article.slug) })
      if (slugs.has(article.slug)) problems.push('duplicate slug')
      slugs.add(article.slug)
    } catch (error) { problems = [error.message] }
    report.push({ file, problems })
  }
  return report
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const report = await checkAll()
  for (const { file, problems } of report) console.log(problems.length ? `✖ ${file}\n  - ${problems.join('\n  - ')}` : `✔ ${file}`)
  if (report.some((r) => r.problems.length)) process.exit(1)
  console.log(`${report.length} article(s) passed.`)
}

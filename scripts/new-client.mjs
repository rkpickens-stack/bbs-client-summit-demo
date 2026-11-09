// Creates a client's site repo from this template and publishes it with GitHub Pages.
// Usage: node scripts/new-client.mjs path/to/client.json [--dry-run]
// Needs the gh CLI signed in as the BBS GitHub account. Never stores secrets in the repo.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [file, flag] = process.argv.slice(2)
if (!file) { console.error('Usage: node scripts/new-client.mjs client.json [--dry-run]'); process.exit(1) }
const client = JSON.parse(readFileSync(file, 'utf8'))
for (const key of ['slug', 'businessName', 'trade', 'phone', 'city', 'state', 'serviceArea', 'services', 'facts']) if (!client[key] || (Array.isArray(client[key]) && !client[key].length)) throw new Error(`client.json is missing ${key}`)
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(client.slug)) throw new Error('slug must be lowercase-with-dashes')

const owner = process.env.BBS_GITHUB_OWNER || 'rkpickens-stack'
const repo = `bbs-client-${client.slug}`
if (!client.domain) client.basePath = `/${repo}`
const run = (cmd, args, opts = {}) => { console.log('$', cmd, args.join(' ')); return flag === '--dry-run' ? '' : execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', ...opts }) }

const dir = mkdtempSync(join(tmpdir(), `${repo}-`))
run('gh', ['repo', 'create', `${owner}/${repo}`, '--public', '--template', `${owner}/bbs-site-template`, '--description', `Website for ${client.businessName} (BBS Visibility)`])
// Template repos are copied asynchronously; retry the clone briefly.
for (let i = 0; i < 10; i++) { try { run('gh', ['repo', 'clone', `${owner}/${repo}`, dir]); break } catch { execFileSync('sleep', ['3']) } }
if (flag !== '--dry-run') {
  writeFileSync(join(dir, 'client.json'), JSON.stringify(client, null, 2) + '\n')
  run('npm', ['install', '--no-audit', '--no-fund'], { cwd: dir })
  run('npm', ['run', 'build'], { cwd: dir })
  run('git', ['add', '-A'], { cwd: dir })
  run('git', ['commit', '-m', `Set up site for ${client.businessName}`], { cwd: dir })
  run('git', ['push'], { cwd: dir })
}
run('gh', ['api', '-X', 'POST', `repos/${owner}/${repo}/pages`, '-f', 'build_type=legacy', '-f', 'source[branch]=main', '-f', 'source[path]=/docs'])
const url = client.domain ? `https://${client.domain}/` : `https://${owner}.github.io/${repo}/`
console.log(`\nSite repo: https://github.com/${owner}/${repo}\nSite (live in ~1 minute): ${url}`)
if (client.domain) console.log(`\nAsk the domain owner to add DNS records:\n  CNAME  www  ->  ${owner}.github.io\n  A      @    ->  185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153\nThen tick "Enforce HTTPS" in the repo's Pages settings once the certificate is issued.`)

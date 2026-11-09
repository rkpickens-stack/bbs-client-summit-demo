// Generates the client's static site into docs/ (GitHub Pages serves /docs on main).
// Inputs: client.json and content/articles/*.md. No dependencies, no network.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('.', import.meta.url).pathname
const out = join(root, 'docs')
const client = JSON.parse(await readFile(join(root, 'client.json'), 'utf8'))

const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const telHref = (phone) => 'tel:+1' + String(phone).replace(/\D/g, '').replace(/^1/, '')
const origin = client.domain ? `https://${client.domain}` : ''
// Without a custom domain GitHub Pages serves the site under /<repo>/, so internal links need that prefix.
const base = client.domain ? '' : (client.basePath || '').replace(/\/$/, '')
const withBase = (html) => base ? html.replace(/(href|src)="\/(?!\/)/g, `$1="${base}/`) : html
const area = client.serviceArea.join(', ')

// Minimal Markdown: ## / ### headings, paragraphs, - lists, **bold**, [links](url).
function inline(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => `<a href="${href.startsWith('http') || href.startsWith('/') || href.startsWith('tel:') ? href : '#'}">${label}</a>`)
}
export function markdownToHtml(md) {
  const html = []
  for (const block of md.trim().split(/\n\s*\n/)) {
    const lines = block.split('\n')
    if (lines.every((line) => /^\s*-\s+/.test(line))) {
      html.push('<ul>' + lines.map((line) => `<li>${inline(line.replace(/^\s*-\s+/, ''))}</li>`).join('') + '</ul>')
    } else if (/^###\s/.test(block)) html.push(`<h3>${inline(block.replace(/^###\s/, ''))}</h3>`)
    else if (/^##\s/.test(block)) html.push(`<h2>${inline(block.replace(/^##\s/, ''))}</h2>`)
    else html.push(`<p>${inline(lines.join(' '))}</p>`)
  }
  return html.join('\n')
}

export function parseArticle(raw, file) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`${file}: missing front matter`)
  const meta = Object.fromEntries(match[1].split('\n').map((line) => line.split(/:\s(.*)/s).slice(0, 2).map((part) => part.trim().replace(/^"|"$/g, ''))))
  for (const key of ['title', 'description', 'date', 'slug']) if (!meta[key]) throw new Error(`${file}: front matter needs ${key}`)
  return { ...meta, body: match[2].trim(), file }
}

async function loadArticles() {
  const dir = join(root, 'content', 'articles')
  const files = (await readdir(dir).catch(() => [])).filter((name) => name.endsWith('.md')).sort()
  const articles = []
  for (const file of files) articles.push(parseArticle(await readFile(join(dir, file), 'utf8'), file))
  return articles.sort((a, b) => b.date.localeCompare(a.date))
}

const css = `:root{--brand:${client.brandColor || '#0B5D7A'};--ink:#13222b;--muted:#4d5f6b;--paper:#f7f6f2;--line:#e2e0d9}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font:17px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--paper)}
a{color:var(--brand)}img,svg{max-width:100%;height:auto}.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.demo{background:#fff4d6;color:#5c4400;text-align:center;font-size:14px;padding:6px 12px}
header{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px}
.brand{font-weight:800;font-size:20px;color:var(--ink);text-decoration:none;line-height:1.15}.brand small{display:block;font-weight:600;font-size:13px;color:var(--muted)}
nav{display:flex;gap:18px;align-items:center}nav a{color:var(--ink);text-decoration:none;font-weight:600;font-size:15px}
.call{display:inline-flex;align-items:center;gap:8px;background:var(--brand);color:#fff!important;font-weight:800;border-radius:12px;padding:12px 18px;text-decoration:none;white-space:nowrap}
.call.ghost{background:#fff;color:var(--ink)!important;border:1.5px solid var(--line)}
.hero{padding:56px 0 40px}.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center}
.eyebrow{margin:0;color:var(--brand);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase}
h1{font-size:clamp(2.1rem,5vw,3.4rem);line-height:1.08;letter-spacing:-.02em;margin:10px 0 14px}h2{font-size:clamp(1.6rem,3.4vw,2.2rem);line-height:1.15;margin:0 0 12px}
.lead{font-size:1.15rem;color:var(--muted);max-width:560px}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}.facts{display:flex;flex-wrap:wrap;gap:8px 18px;margin:18px 0 0;padding:0;list-style:none;color:var(--muted);font-size:15px}.facts li:before{content:"✓ ";color:var(--brand);font-weight:800}
section{padding:48px 0}.alt{background:#fff;border-block:1px solid var(--line)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:22px}.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px}.alt .card{background:var(--paper)}.card h3{margin:0 0 6px;font-size:1.1rem}.card p{margin:0;color:var(--muted)}
.towns{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0;padding:0;list-style:none}.towns li{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-weight:600}
.contact{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start}.form-frame{width:100%;min-height:520px;border:0;border-radius:16px;background:#fff}
.post-list{list-style:none;padding:0;margin:18px 0 0;display:grid;gap:12px}.post-list a{display:block;background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;text-decoration:none;color:var(--ink)}.post-list span{display:block;color:var(--muted);font-size:15px}
article.post{max-width:720px;margin:0 auto;padding:40px 20px}article.post h2{margin-top:32px}article.post .cta{margin-top:36px;padding:22px;background:#fff;border:1px solid var(--line);border-radius:16px}
footer{background:var(--ink);color:#c9d3da;padding:32px 0;font-size:15px}footer a{color:#fff}footer .wrap{display:flex;flex-wrap:wrap;gap:12px 28px;justify-content:space-between}
.sticky-call{display:none}
@media(max-width:780px){nav a:not(.call){display:none}.hero .wrap,.contact{grid-template-columns:1fr}.hero{padding:32px 0}.sticky-call{display:flex;position:fixed;left:0;right:0;bottom:0;padding:10px 14px;background:#fff;border-top:1px solid var(--line);z-index:6}.sticky-call .call{flex:1;justify-content:center}body{padding-bottom:70px}}`

// A neutral house illustration in the client's brand colour: no stock photos.
const art = `<svg viewBox="0 0 440 340" role="img" aria-label="Illustration of a house"><rect width="440" height="340" rx="24" fill="#e8eef0"/><circle cx="350" cy="78" r="40" fill="#f6d27a"/><path d="M0 250q110-60 220-30t220 0v120H0z" fill="#c9d8cf"/><path d="M110 170h220v120H110z" fill="#fff"/><path d="M90 182 220 82l130 100z" fill="var(--brand)"/><path d="M196 222h48v68h-48z" fill="var(--brand)" opacity=".85"/><path d="M134 200h40v36h-40zM266 200h40v36h-40z" fill="#cfe0e8" stroke="var(--brand)" stroke-width="4"/><path d="M0 300h440v40H0z" fill="#b4c8bb"/></svg>`

function page({ title, description, path, body, noindex, schema }) {
  const canonical = origin ? `<link rel="canonical" href="${origin}${path}">` : ''
  const ga = client.ga4MeasurementId && /^G-[A-Z0-9]+$/.test(client.ga4MeasurementId)
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${client.ga4MeasurementId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${client.ga4MeasurementId}');document.addEventListener('click',function(e){var a=e.target.closest('a[href^="tel:"]');if(a)gtag('event','call_click',{link_url:a.href})})</script>`
    : ''
  return withBase(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">${canonical}
<meta name="robots" content="${noindex || client.demo ? 'noindex,nofollow' : 'index,follow'}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<link rel="stylesheet" href="/styles.css">${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}${ga}
</head><body>
${client.demo ? '<div class="demo">Demo site for a fictional business · not a real company</div>' : ''}
<header><div class="wrap"><a class="brand" href="/">${esc(client.businessName)}<small>${esc(client.trade)} · ${esc(client.city)}, ${esc(client.state)}</small></a>
<nav><a href="/#services">Services</a><a href="/#area">Service area</a><a href="/articles/">Tips</a><a class="call" href="${telHref(client.phone)}">Call ${esc(client.phone)}</a></nav></div></header>
${body}
<footer><div class="wrap"><div><strong>${esc(client.businessName)}</strong><br>${esc(client.hours)}<br><a href="${telHref(client.phone)}">${esc(client.phone)}</a></div><div>Serving ${esc(area)}<br><a href="/privacy/">Privacy</a></div></div></footer>
<div class="sticky-call"><a class="call" href="${telHref(client.phone)}">Call ${esc(client.phone)}</a></div>
</body></html>
`)
}

function home(articles) {
  const schema = { '@context': 'https://schema.org', '@type': 'HomeAndConstructionBusiness', name: client.businessName, telephone: client.phone, areaServed: client.serviceArea, openingHours: client.hours, address: { '@type': 'PostalAddress', addressLocality: client.city, addressRegion: client.state }, ...(origin ? { url: origin } : {}) }
  const form = client.leadFormEmbedUrl
    ? `<iframe class="form-frame" src="${esc(client.leadFormEmbedUrl)}" title="Request service from ${esc(client.businessName)}" loading="lazy"></iframe>`
    : `<div class="card"><h3>Prefer to call?</h3><p>The fastest way to reach us is by phone during business hours.</p><p style="margin-top:14px"><a class="call" href="${telHref(client.phone)}">Call ${esc(client.phone)}</a></p></div>`
  const recent = articles.slice(0, 3)
  return page({
    title: `${client.businessName} | ${client.tradeShort || client.trade} in ${client.city}, ${client.state}`,
    description: `${client.tagline} Serving ${area}. Call ${client.phone}.`,
    path: '/', schema,
    body: `<main>
<section class="hero"><div class="wrap"><div><p class="eyebrow">${esc(client.trade)} · ${esc(client.city)}, ${esc(client.state)}</p><h1>${esc(client.tagline)}</h1><p class="lead">Serving ${esc(area)}. Call or send a request and we’ll get back to you.</p>
<div class="actions"><a class="call" href="${telHref(client.phone)}">Call ${esc(client.phone)}</a><a class="call ghost" href="#request">Request service</a></div>
<ul class="facts">${client.facts.map((fact) => `<li>${esc(fact)}</li>`).join('')}</ul></div><div>${art}</div></div></section>
<section class="alt" id="services"><div class="wrap"><h2>What we do</h2><div class="grid">${client.services.map((s) => `<div class="card"><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p></div>`).join('')}</div></div></section>
<section id="area"><div class="wrap"><h2>Where we work</h2><p class="lead">We serve homes and businesses in and around ${esc(client.city)}.</p><ul class="towns">${client.serviceArea.map((town) => `<li>${esc(town)}</li>`).join('')}</ul><p style="margin-top:18px">${esc(client.hours)}</p></div></section>
${recent.length ? `<section class="alt"><div class="wrap"><h2>Tips from our team</h2><ul class="post-list">${recent.map((a) => `<li><a href="/articles/${a.slug}/"><strong>${esc(a.title)}</strong><span>${esc(a.description)}</span></a></li>`).join('')}</ul><p><a href="/articles/">All tips →</a></p></div></section>` : ''}
<section id="request"><div class="wrap contact"><div><h2>Request service</h2><p class="lead">Tell us what’s going on. For anything urgent, please call.</p>${client.googleReviewUrl ? `<p><a href="${esc(client.googleReviewUrl)}" rel="noopener">Read or leave a Google review</a></p>` : ''}</div>${form}</div></section>
</main>`,
  })
}

function articleIndex(articles) {
  return page({
    title: `Tips | ${client.businessName}`, description: `Practical ${client.tradeShort || client.trade} tips for homeowners in ${area}.`, path: '/articles/',
    body: `<main class="wrap" style="padding:40px 20px"><h1>Tips from ${esc(client.businessName)}</h1>${articles.length ? `<ul class="post-list">${articles.map((a) => `<li><a href="/articles/${a.slug}/"><strong>${esc(a.title)}</strong><span>${esc(a.date)} · ${esc(a.description)}</span></a></li>`).join('')}</ul>` : '<p>New tips are on the way.</p>'}</main>`,
  })
}

function articlePage(a) {
  const schema = { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, datePublished: a.date, author: { '@type': 'Organization', name: client.businessName } }
  return page({
    title: `${a.title} | ${client.businessName}`, description: a.description, path: `/articles/${a.slug}/`, schema,
    body: `<main><article class="post"><p class="eyebrow">${esc(a.date)}</p><h1>${esc(a.title)}</h1>${markdownToHtml(a.body)}<div class="cta"><strong>Need help in ${esc(client.city)} or nearby?</strong><p>Call ${esc(client.businessName)} at <a href="${telHref(client.phone)}">${esc(client.phone)}</a> or <a href="/#request">send a request</a>.</p></div></article></main>`,
  })
}

function privacy() {
  return page({
    title: `Privacy | ${client.businessName}`, description: 'How information sent through this website is handled.', path: '/privacy/', noindex: true,
    body: `<main class="wrap" style="padding:40px 20px;max-width:760px"><h1>Privacy</h1><p>When you call or send a request through this website, ${esc(client.businessName)} uses your details only to respond and provide the service you asked about.</p><p>Requests sent through the website form are processed by Business Bottleneck Solutions, which runs this website for ${esc(client.businessName)}. They are delivered to ${esc(client.businessName)} and not used for anyone else’s marketing or sold.</p>${client.ga4MeasurementId ? '<p>This site uses Google Analytics to count visits and call-button clicks.</p>' : ''}<p>Questions? Call ${esc(client.phone)}.</p></main>`,
  })
}

export async function build() {
  const articles = await loadArticles()
  await rm(out, { recursive: true, force: true })
  const files = { 'index.html': home(articles), 'articles/index.html': articleIndex(articles), 'privacy/index.html': privacy(), 'styles.css': css,
    '404.html': page({ title: `Page not found | ${client.businessName}`, description: 'Page not found.', path: '/404', noindex: true, body: `<main class="wrap" style="padding:60px 20px"><h1>Page not found</h1><p><a href="/">Go to the home page</a> or call <a href="${telHref(client.phone)}">${esc(client.phone)}</a>.</p></main>` }),
    'robots.txt': client.demo ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`,
    '.nojekyll': '' }
  for (const a of articles) files[`articles/${a.slug}/index.html`] = articlePage(a)
  if (origin) {
    files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/articles/', ...articles.map((a) => `/articles/${a.slug}/`)].map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n')}\n</urlset>\n`
    files.CNAME = client.domain + '\n'
  }
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(out, path, '..'), { recursive: true })
    await writeFile(join(out, path), content)
  }
  return { pages: Object.keys(files).length, articles: articles.length }
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log('Built docs/', await build())

// Review kit: QR code PNG + printable card for the client's Google review link.
// Output goes to review-kit/ (git-ignored); the owner attaches it to the welcome email.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import QRCode from 'qrcode'

const root = new URL('.', import.meta.url).pathname
const client = JSON.parse(await readFile(join(root, 'client.json'), 'utf8'))
if (!/^https:\/\//.test(client.googleReviewUrl || '')) { console.error('client.json googleReviewUrl must be the https review link from the Google Business Profile.'); process.exit(1) }
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const out = join(root, 'review-kit')
await mkdir(out, { recursive: true })
await QRCode.toFile(join(out, 'review-qr.png'), client.googleReviewUrl, { width: 900, margin: 2, color: { dark: '#13222b', light: '#ffffff' } })
const svg = await QRCode.toString(client.googleReviewUrl, { type: 'svg', margin: 1 })
await writeFile(join(out, 'review-card.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Review card</title>
<style>@page{size:3.5in 2in;margin:0}body{margin:0;font-family:system-ui,sans-serif}.card{width:3.5in;height:2in;display:flex;gap:.18in;align-items:center;padding:.2in;box-sizing:border-box;border:1px dashed #ccc}.qr{width:1.4in}.t{font-size:11pt;line-height:1.3}.t strong{display:block;font-size:13pt;color:${esc(client.brandColor || '#0B5D7A')}}</style></head>
<body><div class="card"><div class="qr">${svg}</div><div class="t"><strong>Thanks for choosing ${esc(client.businessName)}!</strong>Scan to leave us a quick Google review. It helps neighbors find us.</div></div></body></html>`)
await writeFile(join(out, 'review-request-text.txt'), `Hi [first name], thanks for choosing ${client.businessName}! If we did a good job, would you leave us a quick Google review? It really helps: ${client.googleReviewUrl}\n`)
console.log('Review kit written to review-kit/: review-qr.png, review-card.html (print at 3.5x2in), review-request-text.txt')

// 이수민(owner) 스켈레톤 12초 버그 재현 + 네트워크 상세 추적
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-skeleton-debug')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function login(page, id, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
  const idInput = await page.$('input[autocomplete="username"]') || await page.$('input[placeholder*="101974"]')
  const pwInput = await page.$('input[autocomplete="current-password"]')
  await idInput.type(id, { delay: 20 })
  await pwInput.type(pw, { delay: 20 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(5000)
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  try {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    page.setDefaultTimeout(30000)

    // 모든 네트워크 요청 추적
    const requests = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('supabase.co')) {
        requests.push({
          t: Date.now(),
          method: req.method(),
          url: url.slice(url.indexOf('/rest/') + 4, Math.min(url.length, url.indexOf('/rest/') + 200)) || url.slice(0, 200),
          status: 'pending',
        })
      }
    })
    page.on('response', async res => {
      const url = res.url()
      if (url.includes('supabase.co')) {
        const match = requests.find(r => r.status === 'pending' && url.endsWith(r.url.slice(r.url.indexOf('/')))  )
        if (match) {
          match.status = res.status()
          match.duration = Date.now() - match.t
        }
      }
    })
    const consoleMsgs = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('[') || text.includes('error') || text.includes('warn')) {
        consoleMsgs.push({ type: msg.type(), text: text.slice(0, 300) })
      }
    })

    console.log('▶ 이수민 로그인')
    await login(page, '101579', 'ty101579')

    console.log('\n▶ /evidence 방문 — 30초 관찰')
    const t0 = Date.now()
    await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
    console.log(`  DOM loaded: ${Date.now() - t0}ms`)

    // 0.5초 간격으로 15초간 상태 체크
    for (let i = 0; i < 30; i++) {
      await wait(500)
      const state = await page.evaluate(() => ({
        rowCount: document.querySelectorAll('tbody tr').length,
        skeletons: document.querySelectorAll('.skeleton').length,
        statValue: document.querySelector('.sum-strip .v')?.textContent?.trim(),
        chips: Array.from(document.querySelectorAll('.filter-chip')).map(c => c.textContent?.trim()),
        bodyLen: document.body.innerText.length,
      }))
      const elapsed = Date.now() - t0
      console.log(`  @${elapsed}ms rows=${state.rowCount} skel=${state.skeletons} stat="${state.statValue}" chips=[${state.chips?.join('|')}]`)
      if (state.rowCount > 0) {
        console.log('  ✓ 데이터 로드됨! 종료')
        break
      }
    }

    // 마지막 스크린샷 + 상태 저장
    await page.screenshot({ path: path.join(OUT, 'final.png'), fullPage: false })

    console.log('\n=== Supabase 요청 요약 ===')
    const byEndpoint = {}
    for (const r of requests) {
      const key = r.url.split('?')[0]
      if (!byEndpoint[key]) byEndpoint[key] = []
      byEndpoint[key].push(r)
    }
    for (const [key, arr] of Object.entries(byEndpoint)) {
      const statuses = arr.map(r => r.status + (r.duration ? '(' + r.duration + 'ms)' : '(pending)'))
      console.log(`  ${key}: ${statuses.join(', ')}`)
    }

    console.log('\n=== Console ===')
    for (const m of consoleMsgs.slice(-20)) {
      console.log(`  [${m.type}] ${m.text}`)
    }

    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ requests, consoleMsgs }, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })

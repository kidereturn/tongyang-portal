// 100회 반복 스켈레톤 버그 검증 — 이수민/김상우/하정훈 각 33-34회
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-skeleton-100x')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise(r => setTimeout(r, ms))

const ACCOUNTS = [
  { name: 'owner_이수민', id: '101579', pw: 'ty101579', expectedRows: 8 },
  { name: 'controller_김상우', id: '101130', pw: 'ty101130', expectedRows: 23 },
  { name: 'admin_하정훈', id: '101119', pw: 'ty101119', expectedRows: 424 },
]

async function login(page, id, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
  const idInput = await page.$('input[autocomplete="username"]') || await page.$('input[placeholder*="101974"]')
  const pwInput = await page.$('input[autocomplete="current-password"]')
  await idInput.type(id, { delay: 10 })
  await pwInput.type(pw, { delay: 10 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(3500)
}

async function testOneIteration(page, expectedRows) {
  const t0 = Date.now()
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })

  // 실제 데이터가 올 때까지 대기 (최대 15초)
  let dataTime = -1
  let finalRows = 0
  for (let i = 0; i < 30; i++) {
    await wait(500)
    const rows = await page.evaluate(() => document.querySelectorAll('tbody tr').length)
    if (rows > 0) {
      dataTime = Date.now() - t0
      finalRows = rows
      break
    }
  }

  if (dataTime === -1) {
    finalRows = await page.evaluate(() => document.querySelectorAll('tbody tr').length)
    dataTime = Date.now() - t0
  }

  const correctRows = finalRows === expectedRows
  const fast = dataTime < 3000
  return { dataTime, finalRows, correctRows, fast }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  try {
    const allResults = []
    for (const acc of ACCOUNTS) {
      console.log(`\n========= ${acc.name} (34회) =========`)
      const ctx = await browser.createBrowserContext()
      const page = await ctx.newPage()
      page.setDefaultTimeout(30000)
      await login(page, acc.id, acc.pw)

      const accResults = []
      for (let i = 1; i <= 34; i++) {
        const r = await testOneIteration(page, acc.expectedRows)
        accResults.push(r)
        allResults.push({ account: acc.name, iter: i, ...r })
        if (!r.correctRows || !r.fast) {
          console.log(`  iter${i}: ${r.dataTime}ms rows=${r.finalRows}/${acc.expectedRows} ${r.fast ? '' : 'SLOW'} ${r.correctRows ? '' : 'BAD_ROWS'}`)
        } else if (i % 10 === 0) {
          const times = accResults.map(a => a.dataTime)
          const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
          console.log(`  iter${i}: ok · avg=${avg}ms`)
        }
      }
      await ctx.close()
    }

    // 결과 분석
    const total = allResults.length
    const slow = allResults.filter(r => r.dataTime >= 3000)
    const veryBad = allResults.filter(r => r.dataTime >= 10000)
    const wrongRows = allResults.filter(r => !r.correctRows)
    const all = allResults.map(r => r.dataTime).sort((a, b) => a - b)
    const p50 = all[Math.floor(all.length * 0.5)]
    const p95 = all[Math.floor(all.length * 0.95)]
    const p99 = all[Math.floor(all.length * 0.99)]

    console.log('\n========= 100+ iter 결과 =========')
    console.log(`총 ${total} 회`)
    console.log(`p50: ${p50}ms  p95: ${p95}ms  p99: ${p99}ms`)
    console.log(`3초+ 느린 iter: ${slow.length} (${(slow.length / total * 100).toFixed(1)}%)`)
    console.log(`10초+ 매우 느림: ${veryBad.length}`)
    console.log(`rows 불일치: ${wrongRows.length}`)
    if (wrongRows.length > 0) {
      console.log('\nrows 불일치 상세:')
      wrongRows.slice(0, 10).forEach(r => console.log(`  ${r.account} iter${r.iter}: ${r.finalRows} rows (기대 다른값)`))
    }
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results: allResults, p50, p95, p99, slow, wrongRows }, null, 2))
    process.exit(wrongRows.length > 0 || veryBad.length > 0 ? 1 : 0)
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })

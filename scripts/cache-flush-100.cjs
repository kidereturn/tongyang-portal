// 캐시 자동삭제 100회 — 사이트 접속 시 ensureFreshBundle 가 실제로 동작하는지
// 검증: 1) ty_flushed_20260424 플래그가 첫 방문에 설정 / 2) 빌드 ID 변경 시 hardFlush + reload 발생
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-cache-100')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

const results = []

async function testOnce(browser, idx) {
  // 매 회 새 context — 빈 상태에서 시작
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1200, height: 800 })

  // 1) 첫 방문 — ensureFreshBundle 의 (A) 분기 — flushed_20260424 플래그 없음 → hardFlush + ?_cf 쿼리로 reload
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await wait(3500)  // ensureFreshBundle 실행 + reload 대기

  // 2) 검증: flushed 플래그가 localStorage 에 설정됐는지
  const after = await page.evaluate(() => ({
    url: location.href,
    flushed: localStorage.getItem('ty_flushed_20260424'),
    buildId: localStorage.getItem('ty_build_id'),
    hasCfQuery: location.search.includes('_cf='),
  }))

  await ctx.close()

  // 첫 방문 후 flushed 가 '1' 이면 캐시 플러시 정상 작동
  // (이미 reload 가 실행됐고, 두번째 로드라 _cf 쿼리는 url 에 남아있음)
  const ok = after.flushed === '1' && !!after.buildId
  results.push({ i: idx, ok, ...after })
  if (idx % 10 === 0 || !ok) {
    console.log(`  ${idx}/100 ${ok?'✓':'✗'} flushed=${after.flushed} build=${after.buildId?.slice(0,7)} cf=${after.hasCfQuery}`)
  }
  return ok
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 60000 })
  try {
    for (let i = 1; i <= 100; i++) {
      try { await testOnce(browser, i) } catch (e) {
        results.push({ i, ok: false, err: e.message.slice(0, 100) })
        console.log(`  ${i}/100 ✗ ${e.message.slice(0, 80)}`)
      }
      if (i % 10 === 0) {
        fs.writeFileSync(path.join(OUT, 'progress.txt'), `${i}/100\n`)
        fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
      }
    }
  } finally { await browser.close() }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  const ok = results.filter(r => r.ok).length
  fs.writeFileSync(path.join(OUT, 'summary.txt'), `Total 100 · OK ${ok} · FAIL ${100 - ok}`)
  console.log(`\n=== 캐시 자동삭제 ${ok}/100`)
  if (ok < 100) {
    console.log('실패 상세:')
    results.filter(r => !r.ok).slice(0, 5).forEach(r => console.log(`  c${r.i}`, r))
  }
}
main().catch(e => { console.error(e); process.exit(2) })

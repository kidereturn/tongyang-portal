// 캐시 자동 삭제 100회 테스트 — 새 브라우저 컨텍스트로 사이트 접속 → ty_flushed_20260424 플래그 확인
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'screenshots-cache-test')
fs.mkdirSync(OUT, { recursive: true })
const TOTAL = 100
const results = []

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  for (let i = 1; i <= TOTAL; i++) {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    try {
      const t0 = Date.now()
      await page.goto('https://tyia.vercel.app/login', { waitUntil: 'domcontentloaded', timeout: 20000 })
      await new Promise(r => setTimeout(r, 1500))
      // localStorage flushed 플래그 + build id 검사
      const state = await page.evaluate(() => {
        return {
          flushed: localStorage.getItem('ty_flushed_20260424'),
          buildId: localStorage.getItem('ty_build_id'),
          search: window.location.search,
        }
      })
      const ms = Date.now() - t0
      const ok = state.flushed === '1' && !!state.buildId
      results.push({ i, ok, ...state, loadMs: ms })
      if (i <= 5 || i % 10 === 0) console.log(`  ${i}/${TOTAL} ${ok?'✓':'✗'} flushed=${state.flushed} buildId=${state.buildId?.slice(0,8)} reload?=${state.search.includes('_cf=')} ${ms}ms`)
    } catch (e) {
      results.push({ i, ok: false, err: e.message.slice(0, 100) })
      console.log(`  ${i}/${TOTAL} ✗ ${e.message.slice(0, 80)}`)
    } finally {
      await ctx.close()
    }
  }
  await browser.close()
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  const ok = results.filter(r => r.ok).length
  console.log(`\n=== 캐시 자동 삭제 ${ok}/${TOTAL} ✓`)
  fs.writeFileSync(path.join(OUT, 'summary.txt'), `Total ${TOTAL} OK ${ok}\nFails: ${TOTAL - ok}`)
}
main().catch(e => { console.error(e); process.exit(2) })

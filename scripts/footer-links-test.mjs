// Footer 상단 메뉴 6개 + 패밀리사이트 14개 실제 네비게이션 테스트
// 각 URL 방문 → HTTP 상태 + 페이지 타이틀 확인 → 스크린샷
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-footer-links')
fs.mkdirSync(OUT, { recursive: true })

const TOP_MENUS = [
  { label: 'COMPANY', href: 'https://tongyanginc.co.kr/#00' },
  { label: 'BUSINESS', href: 'https://tongyanginc.co.kr/#01' },
  { label: 'INFORMATION', href: 'https://tongyanginc.co.kr/#02' },
  { label: '건자재네트워크', href: 'https://tongyanginc.co.kr/network/' },
  { label: '건설서비스', href: 'https://tongyanginc.co.kr/house/' },
  { label: '인프라엔지니어링', href: 'https://tongyanginc.co.kr/plant/' },
]

const FAMILY_SITES = [
  { label: '동양 그룹웨어', href: 'https://gw.eugenes.co.kr/covicore/login.do' },
  { label: '유진그룹', href: 'https://eugenes.co.kr/' },
  { label: '유진기업', href: 'https://eugenecorp.co.kr/' },
  { label: '동양(본사)', href: 'https://tongyanginc.co.kr/' },
  { label: '에이스하드웨어', href: 'https://www.ace-hardware.co.kr/' },
  { label: '유진로봇', href: 'https://yujinrobot.com/' },
  { label: '유진프라이빗에쿼티', href: 'https://www.eugenepe.co.kr/' },
  { label: '유진투자증권', href: 'https://www.eugenefn.com/' },
  { label: '유진자산운용', href: 'http://fund.eugenefn.com/' },
  { label: '유진투자선물', href: 'https://www.eugenefutures.com/' },
  { label: '유진리츠운용', href: 'https://eugenereit.com/' },
  { label: '유진한일합섬', href: 'http://www.hanilsf.co.kr/' },
  { label: '유진로지스틱스', href: 'http://www.eugenelogistics.co.kr/' },
  { label: 'YTN', href: 'https://www.ytn.co.kr' },
]

const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function testUrl(browser, label, url, index, group) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const filename = `${String(index).padStart(2,'0')}_${group}_${label.replace(/[\\/:*?"<>|]/g, '_')}.png`
  const filepath = path.join(OUT, filename)
  const result = { label, url, status: null, title: null, ok: false, error: null, final: null }
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    result.status = resp?.status() ?? 0
    result.final = page.url()
    await wait(2000)
    result.title = (await page.title()).slice(0, 60)
    result.ok = result.status >= 200 && result.status < 400
    await page.screenshot({ path: filepath, fullPage: false })
  } catch (e) {
    result.error = e.message.slice(0, 80)
  } finally {
    await page.close()
  }
  return result
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors'],
  })
  try {
    const results = []
    console.log('▶ 상단 메뉴 6개 테스트')
    for (let i = 0; i < TOP_MENUS.length; i++) {
      const r = await testUrl(browser, TOP_MENUS[i].label, TOP_MENUS[i].href, i + 1, 'TOP')
      results.push({ group: 'TOP', ...r })
      console.log(`  [${r.status ?? 'ERR'}] ${r.label}  → ${r.final ?? r.error ?? ''}`)
    }
    console.log('▶ 패밀리사이트 14개 테스트')
    for (let i = 0; i < FAMILY_SITES.length; i++) {
      const r = await testUrl(browser, FAMILY_SITES[i].label, FAMILY_SITES[i].href, i + 10, 'FAM')
      results.push({ group: 'FAM', ...r })
      console.log(`  [${r.status ?? 'ERR'}] ${r.label}  → ${r.final ?? r.error ?? ''}`)
    }

    // 보고서
    const fails = results.filter(r => !r.ok)
    const report = [
      '='.repeat(60),
      'Footer 링크 접속 테스트',
      '='.repeat(60),
      `전체: ${results.length}건 / 정상: ${results.length - fails.length}건 / 실패: ${fails.length}건`,
      '',
      '[상단 메뉴]',
      ...results.filter(r => r.group === 'TOP').map(r => `  ${r.ok ? '✓' : '✗'} ${r.status ?? 'ERR'} · ${r.label}\n     ${r.url}\n     → ${r.final ?? r.error ?? '?'}  (${r.title ?? ''})`),
      '',
      '[패밀리 사이트]',
      ...results.filter(r => r.group === 'FAM').map(r => `  ${r.ok ? '✓' : '✗'} ${r.status ?? 'ERR'} · ${r.label}\n     ${r.url}\n     → ${r.final ?? r.error ?? '?'}  (${r.title ?? ''})`),
    ].join('\n')
    console.log('\n' + report)
    fs.writeFileSync(path.join(OUT, 'REPORT.md'), report)
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
    process.exit(fails.length > 0 ? 1 : 0)
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })

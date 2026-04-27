// 로그인-로그아웃 시 404 발생 URL 추적
const puppeteer = require('puppeteer')
const wait = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const fails = new Map()
  page.on('response', r => {
    if (r.status() === 404) {
      const u = r.url()
      fails.set(u, (fails.get(u) || 0) + 1)
    }
  })

  // 5 cycles
  for (let i = 1; i <= 5; i++) {
    await page.goto('https://tyia.vercel.app/login', { waitUntil: 'domcontentloaded' })
    await wait(3500)
    const idInput = await page.$('input[autocomplete="username"]')
    if (idInput) {
      await idInput.type('101119', { delay: 5 })
      const pw = await page.$('input[autocomplete="current-password"]')
      await pw.type('ty101119', { delay: 5 })
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
        page.click('button.login-submit'),
      ])
    }
    await wait(2500)
  }

  console.log('=== 404 URL 종류 ===')
  const sorted = [...fails.entries()].sort((a, b) => b[1] - a[1])
  sorted.forEach(([url, count]) => console.log(`  ${count}x: ${url}`))
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(2) })

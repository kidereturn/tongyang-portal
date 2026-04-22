import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-toss')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({
    headless: true, defaultViewport: { width: 1680, height: 1100 },
    userDataDir: path.resolve(__dirname, '..', '.puppeteer-user-data'),
    args: ['--no-sandbox', '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'],
  })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(25000)
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })

    // Wait through Vercel challenge if present
    for (let i = 0; i < 15; i++) {
      const isChallenge = await page.evaluate(() => document.title.includes('Security Checkpoint'))
      if (!isChallenge) break
      await wait(3000)
    }
    await wait(3000)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 3000 }); await wait(800) } catch {}
    await wait(2000)

    const info = await page.evaluate(() => {
      const navImg = document.querySelector('.at-nav .at-nav-logo img, .at-nav-logo img')
      const miniImg = document.querySelector('.login-hd .mini-logo img')
      return {
        navImg: navImg ? { src: navImg.src, naturalWidth: navImg.naturalWidth, naturalHeight: navImg.naturalHeight, complete: navImg.complete } : null,
        miniImg: miniImg ? { src: miniImg.src, naturalWidth: miniImg.naturalWidth, naturalHeight: miniImg.naturalHeight, complete: miniImg.complete } : null,
      }
    })
    console.log('LOGO STATE:', JSON.stringify(info, null, 2))

    await page.screenshot({ path: path.join(OUT, 'v11_login_full.png'), fullPage: false })
    console.log('✓ saved v11_login_full.png')

    // Click 비밀번호 찾기 to check modal
    try {
      const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'))
        const b = btns.find(x => (x.textContent || '').includes('비밀번호 찾기'))
        if (b) { b.click(); return true }
        return false
      })
      console.log('비밀번호 찾기 button clicked:', clicked)
      await wait(800)
      await page.screenshot({ path: path.join(OUT, 'v11_password_modal.png'), fullPage: false })
      console.log('✓ saved v11_password_modal.png')
    } catch {}
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })

/* Verify intro video plays on fresh visit — use brand new context, no storage */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-toss')
const BASE = 'https://tongyang-portal.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1680, height: 1100 },
    userDataDir: path.resolve(__dirname, '..', '.puppeteer-user-data'),
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'],
  })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(30000)

    // Capture all console errors
    page.on('pageerror', e => console.error('[PAGE ERROR]', e.message))
    page.on('console', m => { if (m.type() === 'error') console.error('[CONSOLE]', m.text().slice(0, 200)) })

    // Clear session/local storage to simulate fresh visit (no skipIntro flag)
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(3000)
    await page.evaluate(() => { try { sessionStorage.clear(); localStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'domcontentloaded' })

    // Check every 500ms for 10s whether video appears
    for (let i = 0; i < 20; i++) {
      const state = await page.evaluate(() => {
        const v = document.querySelector('video')
        return v ? { exists: true, rs: v.readyState, w: v.videoWidth, t: v.currentTime, err: v.error?.message } : { exists: false }
      })
      console.log(`t=${i * 500}ms:`, JSON.stringify(state))
      if (state.exists) break
      await wait(500)
    }

    await page.screenshot({ path: path.join(OUT, 'v4_10_intro_fresh.png'), fullPage: false })

    const videoState = await page.evaluate(() => {
      const v = document.querySelector('video')
      if (!v) return { exists: false, skipFlag: sessionStorage.getItem('skipIntro') }
      return {
        exists: true,
        src: v.src,
        currentSrc: v.currentSrc,
        duration: v.duration || 0,
        paused: v.paused,
        currentTime: v.currentTime,
        readyState: v.readyState,
        videoWidth: v.videoWidth,
        muted: v.muted,
      }
    })
    console.log('INTRO VIDEO state on fresh /login:')
    console.log(JSON.stringify(videoState, null, 2))

    if (videoState.exists) {
      console.log('\n✅ Video element rendered')
      if (videoState.videoWidth > 0 && videoState.currentTime > 0) {
        console.log('✅ Video is PLAYING (currentTime progressing, videoWidth non-zero)')
      } else if (videoState.videoWidth > 0) {
        console.log('⚠️ Video loaded but not playing yet')
      } else {
        console.log('⚠️ Video element present but no videoWidth — may be blocked or still loading')
      }
    } else {
      console.log('\n❌ No video element. skipFlag:', videoState.skipFlag)
    }

    // Also test a visible element says "건너뛰기" to confirm UI is intro
    const hasSkipBtn = await page.$('button[aria-label="건너뛰기"]')
    console.log('Skip button visible:', !!hasSkipBtn)

    // Wait 3 more seconds and check currentTime advanced
    await wait(3000)
    const state2 = await page.evaluate(() => {
      const v = document.querySelector('video')
      return v ? { currentTime: v.currentTime, paused: v.paused } : null
    })
    console.log('After 3s:', JSON.stringify(state2))

    await page.screenshot({ path: path.join(OUT, 'v4_11_intro_after_3s.png'), fullPage: false })
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })

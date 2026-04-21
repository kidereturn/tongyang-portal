/* End-to-end evidence approval workflow test:
 *   1. Admin sees current dashboard stats
 *   2. Owner (박한진 101842) opens evidence, picks a 미완료 row, submits for approval
 *   3. Controller (하정훈 101119) opens inbox, finds that new pending item, approves it
 *   4. Admin re-checks dashboard — approved count went up
 *
 *   node scripts/e2e-evidence-workflow.mjs
 */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-toss')
const BASE = 'https://tongyang-portal.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function skipIntro(page) {
  try {
    await page.waitForSelector('button[aria-label="건너뛰기"]', { timeout: 4000 })
    await page.click('button[aria-label="건너뛰기"]')
    await wait(600)
  } catch {}
}

async function loginAs(page, id, pw) {
  // Full cookie clear
  const client = await page.createCDPSession()
  try { await client.send('Network.clearBrowserCookies') } catch {}
  try { await client.send('Network.clearBrowserCache') } catch {}

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
  try { await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() }) } catch {}
  await page.goto(`${BASE}/login?reload=1`, { waitUntil: 'networkidle2', timeout: 30000 })
  await skipIntro(page)
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 15000 })
  await page.$eval('input[autocomplete="username"]', (el) => { el.value = '' })
  await page.$eval('input[autocomplete="current-password"]', (el) => { el.value = '' })
  await page.type('input[autocomplete="username"]', id)
  await page.type('input[autocomplete="current-password"]', pw)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 25000 })
  await wait(3000)
  console.log(`  ✓ logged in as ${id}`)
}

async function snap(page, name, waitMs = 1500) {
  await wait(waitMs)
  const full = path.join(OUT, `wf_${name}.png`)
  try {
    await page.screenshot({ path: full, fullPage: true })
  } catch {
    await page.screenshot({ path: full, fullPage: false })
  }
  console.log(`  📷 ${name}`)
}

async function clickByText(page, text, tag = 'button') {
  const ok = await page.evaluate((txt, tag) => {
    const all = Array.from(document.querySelectorAll(tag))
    const match = all.find(el => (el.textContent || '').trim().includes(txt))
    if (match) { match.click(); return true }
    return false
  }, text, tag)
  if (ok) await wait(900)
  return ok
}

async function freshPage(browser) {
  // Fresh incognito context per role so there's no session carry-over.
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1680, height: 1100 })
  page.setDefaultTimeout(25000)
  page.on('pageerror', err => console.error('  [PAGE ERROR]', err.message))
  return { page, ctx }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  // Use fresh contexts per role via createBrowserContext

  let adminStatsBefore = null
  let adminStatsAfter = null

  try {
    console.log('\n═══ STEP 1: Admin dashboard — baseline ═══')
    const a1 = await freshPage(browser)
    await loginAs(a1.page, '101974', 'ScreenshotAdmin2026!')
    await a1.page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 20000 })
    await wait(3000)
    await snap(a1.page, '01_admin_dashboard_before', 1500)

    // Read the approved count
    adminStatsBefore = await a1.page.evaluate(() => {
      const kpiEls = Array.from(document.querySelectorAll('.at-kpi'))
      return kpiEls.map(el => ({
        label: el.querySelector('.at-kpi-label')?.textContent?.trim() ?? '',
        value: el.querySelector('.at-kpi-value')?.textContent?.trim() ?? '',
      }))
    })
    console.log('  📊 KPI before:', JSON.stringify(adminStatsBefore))
    await a1.ctx.close()

    // ──────────── STEP 2: Owner submits ────────────
    console.log('\n═══ STEP 2: Owner submits evidence ═══')
    const o1 = await freshPage(browser)
    const page = o1.page  // alias for existing code below
    await loginAs(page, '101842', '101842')
    await page.goto(`${BASE}/evidence`, { waitUntil: 'networkidle2', timeout: 20000 })
    await wait(2500)
    await snap(page, '02_owner_evidence_list', 1500)

    // Try to find a row with "미완료" status and submit for approval.
    // Strategy: scan table rows, find first one with 미완료 badge, click 확인 button on it.
    const submitResult = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'))
      for (const row of rows) {
        const isPending = row.textContent.includes('미완료')
        if (!isPending) continue
        // Look for 확인 button in this row
        const confirmBtn = Array.from(row.querySelectorAll('button, a')).find(b =>
          (b.textContent || '').trim() === '확인'
        )
        if (confirmBtn) {
          const rect = confirmBtn.getBoundingClientRect()
          confirmBtn.click()
          return { ok: true, label: row.textContent.slice(0, 60), x: rect.x, y: rect.y }
        }
      }
      return { ok: false, label: 'no pending row' }
    })
    console.log('  click 확인:', submitResult)
    await wait(2500)
    await snap(page, '03_owner_upload_modal_open', 1500)

    // Try to click submit (상신) button inside the modal
    const submitBtn = await clickByText(page, '상신', 'button')
    console.log('  상신 button clicked:', submitBtn)
    await wait(2500)
    await snap(page, '04_owner_after_submit', 1500)

    // Also try the 결재 상신 or 승인 상신 button
    if (!submitBtn) {
      await clickByText(page, '결재 상신', 'button')
      await wait(1500)
      await snap(page, '04b_owner_after_retry', 1500)
    }
    await o1.ctx.close()

    // ──────────── STEP 3: Controller approves ────────────
    console.log('\n═══ STEP 3: Controller 하정훈 approves ═══')
    const c1 = await freshPage(browser)
    await loginAs(c1.page, '101119', '101119')
    await c1.page.goto(`${BASE}/inbox`, { waitUntil: 'networkidle2', timeout: 20000 })
    await wait(2500)
    await snap(c1.page, '05_controller_inbox', 1500)

    // Auto-confirm browser alerts
    c1.page.on('dialog', async dialog => {
      console.log('  alert:', dialog.message().slice(0, 100))
      await dialog.accept()
    })

    // Click "전체선택" — it's a custom button inside a label, not a checkbox
    const checkAll = await c1.page.evaluate(() => {
      const label = Array.from(document.querySelectorAll('label')).find(l =>
        (l.textContent || '').includes('전체선택')
      )
      if (label) {
        const btn = label.querySelector('button')
        if (btn) { btn.click(); return true }
      }
      return false
    })
    console.log('  전체선택:', checkAll)
    await wait(1500)
    await snap(c1.page, '05b_controller_selected_all', 1000)

    // Click "일괄 승인" — should appear after selection
    const approveBtn = await clickByText(c1.page, '일괄 승인', 'button')
    console.log('  일괄 승인 clicked:', approveBtn)
    await wait(4000)
    await snap(c1.page, '06_controller_after_approve', 2000)
    await c1.ctx.close()

    // ──────────── STEP 4: Admin dashboard — after ────────────
    console.log('\n═══ STEP 4: Admin re-checks dashboard ═══')
    const a2 = await freshPage(browser)
    await loginAs(a2.page, '101974', 'ScreenshotAdmin2026!')
    await a2.page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 20000 })
    await wait(3000)
    await snap(a2.page, '07_admin_dashboard_after', 1500)

    adminStatsAfter = await a2.page.evaluate(() => {
      const kpiEls = Array.from(document.querySelectorAll('.at-kpi'))
      return kpiEls.map(el => ({
        label: el.querySelector('.at-kpi-label')?.textContent?.trim() ?? '',
        value: el.querySelector('.at-kpi-value')?.textContent?.trim() ?? '',
      }))
    })
    console.log('  📊 KPI after:', JSON.stringify(adminStatsAfter))
    await a2.ctx.close()

    console.log('\n═══ COMPARISON ═══')
    console.log('BEFORE:', JSON.stringify(adminStatsBefore, null, 2))
    console.log('AFTER :', JSON.stringify(adminStatsAfter, null, 2))

  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error('FATAL:', e); process.exit(1) })

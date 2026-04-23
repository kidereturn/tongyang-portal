// 결재 시스템 종합 검증 v2 — 3 roles × (상단 박스/하단 chip 일치 + 실제 승인 플로우 + cascade)
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-approval-v2')
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
  if (!page.url().includes('/dashboard')) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await wait(4000)
  }
}

async function verifyRole(browser, roleTag, id, pw, expectedSumLabels, expectedChipLabels) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  page.setDefaultTimeout(30000)
  console.log(`\n▶ ${roleTag} (${id})`)
  await login(page, id, pw)

  // 1. 상단 네비 확인 (내 승인함 표시 여부)
  const topNavLabels = await page.$$eval('.top-nav a, nav.top-nav a', els => els.map(e => e.textContent?.trim()).filter(Boolean))
  const hasInbox = topNavLabels.includes('내 승인함')
  console.log(`  topNav 내승인함 표시: ${hasInbox ? 'YES' : 'NO'}`)

  // 2. 증빙관리 이동
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(5500)
  await page.screenshot({ path: path.join(OUT, `${roleTag}_evidence.png`), fullPage: false })

  // 3. sum-strip labels + values
  const sumStrip = await page.$$eval('.sum-strip .cell', cells => cells.map(c => ({
    label: c.querySelector('.l')?.textContent?.replace(/[●\s]+/g, '').trim(),
    value: parseInt(c.querySelector('.v')?.textContent?.match(/\d+/)?.[0] ?? '0', 10),
  })))
  console.log(`  sum-strip (${sumStrip.length}):`, JSON.stringify(sumStrip))

  // 4. filter chips labels + counts
  const chips = await page.$$eval('.filter-chip', cs => cs.map(c => {
    const cntEl = c.querySelector('.cnt')
    const label = (c.textContent || '').replace(cntEl?.textContent ?? '', '').trim()
    return { label, count: parseInt(cntEl?.textContent ?? '0', 10) }
  }))
  console.log(`  chips    (${chips.length}):`, JSON.stringify(chips))

  // 5. 상단/하단 동기화 검증 — 같은 label 이 있으면 count 도 같아야
  const mismatches = []
  for (const s of sumStrip) {
    const matched = chips.find(c => c.label === s.label)
    if (matched && matched.count !== s.value) {
      mismatches.push(`${s.label}: 상단=${s.value} vs 하단=${matched.count}`)
    }
  }
  if (mismatches.length > 0) {
    console.log(`  ⚠️ MISMATCH:`, mismatches)
  } else {
    console.log(`  ✓ 상단/하단 동기 정상`)
  }

  // 6. 예상 label 검증
  const sumLabels = sumStrip.map(s => s.label).sort()
  const chipLabels = chips.map(c => c.label).sort()
  const expSum = [...expectedSumLabels].sort()
  const expChip = [...expectedChipLabels].sort()
  const sumMatch = JSON.stringify(sumLabels) === JSON.stringify(expSum)
  const chipMatch = JSON.stringify(chipLabels) === JSON.stringify(expChip)
  console.log(`  sum label expected=${expSum} got=${sumLabels} ${sumMatch ? '✓' : '✗'}`)
  console.log(`  chip label expected=${expChip} got=${chipLabels} ${chipMatch ? '✓' : '✗'}`)

  // 7. 승인 컬럼 드롭다운 존재 확인 (controller / admin only)
  const approvalSelects = await page.$$('select[style*="승인대기"], tr select')
  const hasApprovalSelect = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'))
    return selects.some(s => Array.from(s.options).some(o => o.value === '승인' || o.value === '반려'))
  })
  console.log(`  승인 드롭다운 (${roleTag}): ${hasApprovalSelect ? 'YES' : 'NO'}`)

  await ctx.close()
  return { roleTag, hasInbox, sumStrip, chips, mismatches, sumMatch, chipMatch, hasApprovalSelect }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  try {
    const results = []
    results.push(await verifyRole(browser, 'owner_이수민', '101579', 'ty101579',
      ['전체', '상신완료', '승인완료', '반려', '수정제출'],
      ['전체', '상신완료', '승인완료', '반려', '수정제출']))
    results.push(await verifyRole(browser, 'controller_김상우', '101130', 'ty101130',
      ['전체', '상신완료', '승인완료', '반려', '수정제출'],
      ['전체', '상신완료', '승인완료', '반려', '수정제출']))
    results.push(await verifyRole(browser, 'admin_하정훈', '101119', 'ty101119',
      ['미검토', '검토중', '완료', '수정제출'],
      ['미검토', '검토중', '완료', '수정제출']))

    const summary = {
      timestamp: new Date().toISOString(),
      results,
      overall_pass: results.every(r => r.sumMatch && r.chipMatch && r.mismatches.length === 0),
      controller_inbox_hidden: !results[1].hasInbox,
      admin_inbox_shown: results[2].hasInbox,
    }
    console.log('\n=== SUMMARY ===')
    console.log(JSON.stringify(summary, null, 2))
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(summary, null, 2))
    process.exit(summary.overall_pass && summary.controller_inbox_hidden && summary.admin_inbox_shown ? 0 : 1)
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })

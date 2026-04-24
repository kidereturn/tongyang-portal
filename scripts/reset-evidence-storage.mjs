// Storage 'evidence' bucket 전체 파일 삭제 (service_role)
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = fs.readFileSync(path.resolve(__dirname, '..', '.env.vercel-sync'), 'utf8')
const getVar = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(getVar('VITE_SUPABASE_URL'), getVar('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

async function listAllRecursive(prefix = '') {
  const all = []
  let offset = 0
  const limit = 1000
  while (true) {
    const { data, error } = await admin.storage.from('evidence').list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw error
    if (!data || !data.length) break
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) {
        // 폴더
        const nested = await listAllRecursive(full)
        all.push(...nested)
      } else {
        all.push(full)
      }
    }
    if (data.length < limit) break
    offset += limit
  }
  return all
}

async function main() {
  console.log('▶ evidence bucket 스캔')
  const files = await listAllRecursive('')
  console.log(`  파일 ${files.length}개 발견`)
  if (!files.length) return
  console.log('  샘플:', files.slice(0, 5))

  // 배치 삭제 (100개씩)
  let deleted = 0
  for (let i = 0; i < files.length; i += 100) {
    const batch = files.slice(i, i + 100)
    const { data, error } = await admin.storage.from('evidence').remove(batch)
    if (error) { console.error('삭제 실패:', error); continue }
    deleted += (data?.length ?? batch.length)
    process.stdout.write(`  ${deleted}/${files.length}\r`)
  }
  console.log(`\n✓ 총 ${deleted}개 파일 삭제`)

  // 재검증
  const remain = await listAllRecursive('')
  console.log(`  잔여: ${remain.length}`)
  if (remain.length > 0) console.log('  ', remain.slice(0, 10))
}

main().catch(e => { console.error(e); process.exit(2) })

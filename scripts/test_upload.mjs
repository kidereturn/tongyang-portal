// Node.js 스크립트로 Supabase에 직접 업로드해서 실제 DB 오류 확인
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://rjqlnwnqfdxfptnwkjyl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqcWxud25xZmR4ZnB0bndranls' ; // Will be read from env

// Read from env
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

function toDateStr(val) {
  if (!val) return null;
  function serialToDate(n) {
    if (isNaN(n) || n < 1 || n > 100000) return null;
    const d = new Date(new Date(1899, 11, 30).getTime() + n * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.toISOString().slice(0, 10);
  if (typeof val === 'number') return serialToDate(Math.floor(val));
  const s = String(val).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return serialToDate(parseInt(s, 10));
  const datePart = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const d = new Date(datePart);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}

const wb = XLSX.readFile('C:/Users/beat2/Downloads/population_final.xlsx', { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log(`총 ${rows.length}개 행 처리 시작...`);

let upserted = 0;
const errors = [];

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const controlCode = String(row['통제번호'] ?? '').trim();
  const dept = String(row['관련부서'] ?? '').trim();
  const uniqueKey = controlCode && dept ? controlCode + dept : String(row['고유키'] ?? '').trim();
  const sampleId = String(row['Sample ID'] ?? '').trim();
  if (!uniqueKey) continue;

  const itemData = {
    unique_key: uniqueKey,
    control_code: controlCode || null,
    dept_code: String(row['부서코드'] ?? '').trim() || null,
    related_dept: dept || null,
    sample_id: sampleId || null,
    transaction_id: toDateStr(row['Transaction ID']),
    transaction_date: toDateStr(row['거래일']),
    description: String(row['거래설명'] ?? '').trim() || null,
    extra_info: String(row['추가 정보 1'] ?? '').trim() || null,
    extra_info_2: String(row['추가 정보 2'] ?? '').trim() || null,
    extra_info_3: String(row['추가 정보 3'] ?? '').trim() || null,
    extra_info_4: String(row['추가 정보 4'] ?? '').trim() || null,
  };

  if (sampleId) {
    await supabase.from('population_items').delete().eq('sample_id', sampleId);
  }
  const { error } = await supabase.from('population_items').insert(itemData);
  if (error) {
    errors.push({
      sampleId,
      error: error.message,
      transaction_id: itemData.transaction_id,
      transaction_date: itemData.transaction_date,
      raw_tid: String(row['Transaction ID']).slice(0, 30),
      raw_tdate: String(row['거래일']).slice(0, 30),
    });
    if (errors.length <= 5) {
      console.log(`\n오류 행 ${i+2}: [${sampleId}]`);
      console.log('  Error:', error.message);
      console.log('  TID sent:', itemData.transaction_id);
      console.log('  TDATE sent:', itemData.transaction_date);
      console.log('  TID raw:', String(row['Transaction ID']).slice(0, 40));
      console.log('  TDATE raw:', String(row['거래일']).slice(0, 40));
      console.log('  All fields:', JSON.stringify(itemData));
    }
  } else {
    upserted++;
  }

  if (i % 100 === 0) process.stdout.write(`\r${i+1}/${rows.length}...`);
}

console.log(`\n\n=== 결과 ===`);
console.log(`성공: ${upserted}개`);
console.log(`오류: ${errors.length}개`);

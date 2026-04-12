const XLSX = require('xlsx');

const wb = XLSX.readFile(
  'C:/Users/beat2/Downloads/6_LMS_260410/모집단_업로드_최종_Final.xlsx',
  { cellDates: true }
);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

// toDateStr 함수 (코드와 동일)
function toDateStr(val) {
  if (!val) return null;
  function serialToDate(n) {
    if (n < 1 || n > 100000) return null;
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

// 실제 insert 될 데이터 시뮬레이션
let successCount = 0;
let errorCount = 0;
const errorRows = [];

rows.forEach((row, i) => {
  const controlCode = String(row['통제번호'] ?? '').trim();
  const dept = String(row['관련부서'] ?? '').trim();
  const uniqueKey = controlCode && dept ? controlCode + dept : String(row['고유키'] ?? '').trim();
  const sampleId = String(row['Sample ID'] ?? '').trim();

  const tid = row['Transaction ID'];
  const tdate = row['거래일'];
  
  const transactionId = toDateStr(tid) || String(tid ?? '').slice(0, 20) || null;
  const transactionDate = toDateStr(tdate);

  // 문제가 될 수 있는 값 감지
  const willFail = (
    (transactionId && !/^\d{4}-\d{2}-\d{2}/.test(transactionId) && transactionId !== null) ||
    (transactionDate && !/^\d{4}-\d{2}-\d{2}/.test(transactionDate))
  );

  if (willFail) {
    errorCount++;
    if (errorRows.length < 5) {
      errorRows.push({
        row: i + 2,
        sampleId,
        tid_raw: tid,
        tid_type: typeof tid,
        tid_result: transactionId,
        tdate_raw: tdate,
        tdate_type: typeof tdate,
        tdate_result: transactionDate,
      });
    }
  } else {
    successCount++;
  }
});

console.log(`예상 성공: ${successCount}, 예상 오류: ${errorCount}`);
console.log('\n문제 있는 행 (최대 5개):');
errorRows.forEach(r => console.log(JSON.stringify(r, null, 2)));

// Transaction ID 가 날짜가 아닌 경우
const nonDateTid = rows.filter(r => {
  const v = r['Transaction ID'];
  const result = toDateStr(v) || String(v ?? '').slice(0, 20) || null;
  return result && !/^\d{4}-\d{2}-\d{2}/.test(result);
});
console.log(`\nTransaction ID가 날짜 형식이 아닌 행: ${nonDateTid.length}건`);
if (nonDateTid.length > 0) {
  nonDateTid.slice(0, 3).forEach(r => {
    console.log(`  Sample ID: ${r['Sample ID']}, TID raw: ${r['Transaction ID']} (${typeof r['Transaction ID']})`);
  });
}

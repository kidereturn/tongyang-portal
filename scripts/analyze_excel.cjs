const XLSX = require('xlsx');
const path = require('path');

// RCM 파일 분석
try {
  const rcm = XLSX.readFile('C:/Users/beat2/Downloads/6_LMS_260410/RCM_\uc99d\ube59_\uc0ac\uc6a9\uc790_\uc5c5\ub85c\ub4dc_\ucd5c\uc885.xlsx');
  console.log('=== RCM ===');
  console.log('Sheets:', rcm.SheetNames);
  const ws = rcm.Sheets[rcm.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log('Header:', JSON.stringify(data[0]));
  console.log('Row1:', JSON.stringify(data[1]));
  console.log('Row2:', JSON.stringify(data[2]));
  console.log('Total rows:', data.length);
} catch(e) {
  console.error('RCM error:', e.message);
}

// 모집단 파일 분석  
try {
  const pop = XLSX.readFile('C:/Users/beat2/Downloads/6_LMS_260410/\ubaa8\uc9d1\ub2e8_\uc5c5\ub85c\ub4dc_\ucd5c\uc885_Final.xlsx');
  console.log('\n=== Population ===');
  console.log('Sheets:', pop.SheetNames);
  const ws2 = pop.Sheets[pop.SheetNames[0]];
  const data2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
  console.log('Header:', JSON.stringify(data2[0]));
  console.log('Row1:', JSON.stringify(data2[1]));
  console.log('Row2:', JSON.stringify(data2[2]));
  console.log('Total rows:', data2.length);
} catch(e) {
  console.error('Population error:', e.message);
}

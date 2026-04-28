# -*- coding: utf-8 -*-
"""HWP의 PrvText 스트림 + PDF 요약본에서 텍스트 추출"""
import sys, os, zlib
try: sys.stdout.reconfigure(encoding='utf-8')
except: pass

import olefile
from pypdf import PdfReader

def extract_hwp_prvtext(path):
    """HWP5 의 PrvText (미리보기 텍스트) 스트림 추출"""
    if not os.path.exists(path):
        return None
    try:
        ole = olefile.OleFileIO(path)
        if ole.exists('PrvText'):
            data = ole.openstream('PrvText').read()
            # PrvText 는 UTF-16 LE 일 가능성
            try:
                txt = data.decode('utf-16-le', errors='ignore')
            except:
                txt = data.decode('cp949', errors='ignore')
            return txt
        # BodyText 도 시도
        sections = []
        for entry in ole.listdir():
            if entry and entry[0] == 'BodyText' and len(entry) > 1:
                sections.append('/'.join(entry))
        if sections:
            data = ole.openstream(sections[0]).read()
            try:
                # zlib decompress 시도
                data = zlib.decompress(data, -15)
            except:
                pass
            return data.decode('utf-16-le', errors='ignore')
    except Exception as e:
        print(f"  [hwp error] {e}")
    return None

def extract_pdf(path):
    if not os.path.exists(path):
        return None
    try:
        reader = PdfReader(path)
        return '\n'.join(p.extract_text() or '' for p in reader.pages)
    except Exception as e:
        print(f"  [pdf error] {e}")
        return None

# 1차 강의 (그룹 부동산관리)
HWP1 = r"C:\Users\tyinc\Downloads\바이브코딩 강의내용 공유(그룹 부동산관리 시스템_강사 권오윤)_26.03.24\0-2. 강의녹음 텍스트 변환.hwp"
PDF1 = r"C:\Users\tyinc\Downloads\바이브코딩 강의내용 공유(그룹 부동산관리 시스템_강사 권오윤)_26.03.24\3. 강의 요약 (브리핑_AI 기반 부동산 관리 시스템개발 및 운영사례).pdf"
# 2차 강의
HWP2 = r"C:\Users\tyinc\Downloads\바이브코딩 개발사례 - 2차강의\1-2. 강의음성_텍스트변환260415_110558 권오윤.hwp"
PDF2_1 = r"C:\Users\tyinc\Downloads\바이브코딩 개발사례 - 2차강의\3. 강의 1장요약.pdf"
PDF2_2 = r"C:\Users\tyinc\Downloads\바이브코딩 개발사례 - 2차강의\4-1. (강의내용 요약-1) 비개발자를 위한 AI 협업 가이드.pdf"

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs', '강의자료_원문')
os.makedirs(OUT_DIR, exist_ok=True)

for label, p in [('hwp1', HWP1), ('hwp2', HWP2)]:
    print(f"\n{'='*80}\n[{label}] {os.path.basename(p)}\n{'='*80}")
    txt = extract_hwp_prvtext(p)
    if txt:
        out = os.path.join(OUT_DIR, f'{label}.txt')
        with open(out, 'w', encoding='utf-8') as f: f.write(txt)
        print(f"  saved {len(txt)} chars to {label}.txt")
        print(f"  preview: {txt[:300]}")
    else:
        print("  (no text)")

for label, p in [('pdf1', PDF1), ('pdf2_1', PDF2_1), ('pdf2_2', PDF2_2)]:
    print(f"\n{'='*80}\n[{label}] {os.path.basename(p)}\n{'='*80}")
    txt = extract_pdf(p)
    if txt:
        out = os.path.join(OUT_DIR, f'{label}.txt')
        with open(out, 'w', encoding='utf-8') as f: f.write(txt)
        print(f"  saved {len(txt)} chars")
        print(f"  preview: {txt[:300]}")
    else:
        print("  (no text)")

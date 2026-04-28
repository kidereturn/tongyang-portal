# -*- coding: utf-8 -*-
"""
PPTX → MP4 변환 (PowerPoint COM Automation)
Windows + PowerPoint Office 16 필요
출력: docs/임직원_사용가이드_시각.mp4 (1080p, 슬라이드당 8초)
"""
import os, sys, time
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

import comtypes.client

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT  = os.path.abspath(os.path.join(ROOT, 'docs', '임직원_사용가이드_시각.pptx'))
OUTPUT = os.path.abspath(os.path.join(ROOT, 'docs', '임직원_사용가이드_시각.mp4'))

if not os.path.exists(INPUT):
    raise SystemExit(f"input not found: {INPUT}")

# 기존 출력 제거 (CreateVideo 가 경로 충돌하면 fail)
if os.path.exists(OUTPUT):
    os.remove(OUTPUT)

print(f"[*] Opening PowerPoint COM...")
ppt = comtypes.client.CreateObject("PowerPoint.Application")
# WindowState 비공개 가능 (Visible 1 이어야 OK)
ppt.Visible = 1

print(f"[*] Loading {os.path.basename(INPUT)}")
pres = ppt.Presentations.Open(INPUT, ReadOnly=True, WithWindow=False)

# CreateVideo 시그니처:
# CreateVideo(FileName, UseTimingsAndNarrations, DefaultSlideDuration, VertResolution, FramesPerSecond, Quality)
print(f"[*] Starting video encode → {os.path.basename(OUTPUT)}")
pres.CreateVideo(OUTPUT, False, 8, 1080, 30, 85)

# 인코딩 진행상황 폴링 — 파일 사이즈 변동 + presentation lock
last_size = -1
stable_count = 0
print(f"[*] Encoding (poll mp4 size)...")
while True:
    time.sleep(3)
    if os.path.exists(OUTPUT):
        sz = os.path.getsize(OUTPUT)
        if sz == last_size:
            stable_count += 1
        else:
            stable_count = 0
        last_size = sz
        print(f"    size={sz//1024} KB stable={stable_count}")
        # 5회 연속 같은 크기 → 완료 판단
        if stable_count >= 5 and sz > 100_000:
            break
    if stable_count > 30:  # 안전탈출 90s
        break

pres.Close()
ppt.Quit()
print(f"[OK] saved: {OUTPUT}".encode('ascii', 'replace').decode('ascii'))
print(f"     size={os.path.getsize(OUTPUT)//1024} KB")

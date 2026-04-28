# -*- coding: utf-8 -*-
"""
옵션 A 후처리:
1) frames/*.jpg → MP4 합성 (1080p, 30fps)
2) timeline.json 자막 → SRT/ASS 생성 → 자막 burn-in
3) (있을 경우) TTS 음성 → 합성

출력:
  docs/임직원_시연영상_자막.mp4   (자막 burn-in, 무음)
  docs/임직원_시연영상_음성.mp4   (자막 + TTS 음성)
"""
import os, sys, json, subprocess, shutil
try: sys.stdout.reconfigure(encoding='utf-8')
except: pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES_DIR = os.path.join(ROOT, 'docs', 'videos', 'frames')
TIMELINE  = os.path.join(ROOT, 'docs', 'videos', 'timeline.json')
WORK_DIR  = os.path.join(ROOT, 'docs', 'videos', 'work')
os.makedirs(WORK_DIR, exist_ok=True)

OUT_BASE  = os.path.join(ROOT, 'docs', 'videos', 'base.mp4')          # 자막 없는 raw
OUT_SUB   = os.path.join(ROOT, 'docs', '임직원_시연영상_자막.mp4')
OUT_TTS   = os.path.join(ROOT, 'docs', '임직원_시연영상_음성.mp4')
SRT_PATH  = os.path.join(WORK_DIR, 'subs.srt')
ASS_PATH  = os.path.join(WORK_DIR, 'subs.ass')
AUDIO_PATH= os.path.join(WORK_DIR, 'narration.wav')

FFMPEG = shutil.which('ffmpeg') or r"C:\Users\tyinc\AppData\Local\Microsoft\WinGet\Packages\yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-N-120858-gae448e00af-win64-gpl\bin\ffmpeg.exe"

# ──────────────────────────────────────────
# 1) frames → MP4 (자막 없는 base)
# ──────────────────────────────────────────
def build_base():
    frames = sorted([f for f in os.listdir(FRAMES_DIR) if f.endswith('.jpg')])
    if not frames:
        raise SystemExit('no frames found')
    # timeline 의 마지막 캡션 끝 시간 = 영상 총 길이
    with open(TIMELINE, 'r', encoding='utf-8') as f:
        items = json.load(f)
    total_sec = items[-1]['at'] + items[-1]['dur'] + 1.5  # 1.5s 여유
    fps = len(frames) / total_sec
    print(f"[*] {len(frames)} frames over {total_sec:.1f}s → input {fps:.2f}fps → output 30fps")
    cmd = [
        FFMPEG, '-y',
        '-framerate', f'{fps:.3f}',
        '-i', os.path.join(FRAMES_DIR, 'f%06d.jpg'),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-crf', '20',
        '-preset', 'medium',
        # 입력 fps 그대로 유지 (frames * (1/fps) = total_sec)
        # output 은 30fps 로 변환 (재생기 호환)
        '-vf', 'scale=1920:1080:flags=lanczos,fps=30',
        OUT_BASE,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:])
        raise SystemExit('base build failed')
    print(f"    saved {OUT_BASE} ({os.path.getsize(OUT_BASE)//1024} KB)")

# ──────────────────────────────────────────
# 2) timeline.json → SRT + ASS
# ──────────────────────────────────────────
def fmt_srt_ts(sec):
    h = int(sec // 3600); m = int((sec % 3600) // 60); s = sec - h*3600 - m*60
    ms = int((s - int(s)) * 1000)
    return f"{h:02d}:{m:02d}:{int(s):02d},{ms:03d}"

def fmt_ass_ts(sec):
    h = int(sec // 3600); m = int((sec % 3600) // 60); s = sec - h*3600 - m*60
    cs = int((s - int(s)) * 100)
    return f"{h:01d}:{m:02d}:{int(s):02d}.{cs:02d}"

def build_subs():
    with open(TIMELINE, 'r', encoding='utf-8') as f:
        items = json.load(f)
    print(f"[*] {len(items)} captions → SRT/ASS")
    # SRT
    with open(SRT_PATH, 'w', encoding='utf-8') as f:
        for i, c in enumerate(items):
            start = c['at']; end = start + c['dur']
            f.write(f"{i+1}\n{fmt_srt_ts(start)} --> {fmt_srt_ts(end)}\n{c['text']}\n\n")
    # ASS — 토스 톤 자막 (white text, dark blue translucent box, bottom)
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Top,Pretendard,42,&H00FFFFFF,&H00FFFFFF,&H00000000,&HCC0F1E36,1,0,0,0,100,100,0,0,3,0,0,2,80,80,90,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open(ASS_PATH, 'w', encoding='utf-8') as f:
        f.write(ass_header)
        for c in items:
            start = fmt_ass_ts(c['at']); end = fmt_ass_ts(c['at'] + c['dur'])
            txt = c['text'].replace(',', '，')
            f.write(f"Dialogue: 0,{start},{end},Top,,0,0,0,,{txt}\n")
    print(f"    saved subs.srt + subs.ass")

# ──────────────────────────────────────────
# 3) 자막 burn-in
# ──────────────────────────────────────────
def burn_subs():
    print(f"[*] burn-in subtitles → 자막.mp4")
    # ASS 경로의 백슬래시 escape
    ass_escaped = ASS_PATH.replace('\\', '/').replace(':', '\\:')
    cmd = [
        FFMPEG, '-y',
        '-i', OUT_BASE,
        '-vf', f"ass='{ass_escaped}'",
        '-c:v', 'libx264', '-crf', '22', '-preset', 'medium',
        '-pix_fmt', 'yuv420p',
        OUT_SUB,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('    [warn] ASS failed, trying SRT subtitles filter')
        srt_escaped = SRT_PATH.replace('\\', '/').replace(':', '\\:')
        cmd2 = [
            FFMPEG, '-y',
            '-i', OUT_BASE,
            '-vf', f"subtitles='{srt_escaped}':force_style='FontName=Pretendard,FontSize=22,PrimaryColour=&HFFFFFF&,BorderStyle=3,Outline=0,Shadow=0,BackColour=&HCC0F1E36&,Alignment=2,MarginV=60'",
            '-c:v', 'libx264', '-crf', '22', '-preset', 'medium',
            '-pix_fmt', 'yuv420p',
            OUT_SUB,
        ]
        r2 = subprocess.run(cmd2, capture_output=True, text=True)
        if r2.returncode != 0:
            print(r2.stderr[-2000:])
            raise SystemExit('subtitle burn failed')
    print(f"    saved {OUT_SUB} ({os.path.getsize(OUT_SUB)//1024} KB)")

# ──────────────────────────────────────────
# 4) TTS — Edge TTS 사용 (Korean, free, online)
# ──────────────────────────────────────────
def build_tts():
    """ Edge TTS 로 timeline 의 각 caption 을 시간 맞춰 합성 """
    try:
        import asyncio, edge_tts
    except ImportError:
        print('[!] edge-tts not installed → skipping voice version')
        print('    pip install edge-tts')
        return False

    with open(TIMELINE, 'r', encoding='utf-8') as f:
        items = json.load(f)

    # 전체 영상 길이 추정 (마지막 caption 끝 + 2s)
    total_dur = items[-1]['at'] + items[-1]['dur'] + 2.0 if items else 60.0

    # 각 caption 을 wav 로 합성 후 silence padding 으로 시간 정렬
    seg_files = []
    print(f"[*] TTS synthesis ({len(items)} segments)")
    cursor_t = 0.0
    voice = "ko-KR-SunHiNeural"  # 자연스러운 한국어 여성 음성

    async def synth(text, out):
        c = edge_tts.Communicate(text, voice, rate="-5%")
        await c.save(out)

    for i, c in enumerate(items):
        # silence before this segment
        gap = c['at'] - cursor_t
        if gap > 0.05:
            sil_path = os.path.join(WORK_DIR, f's_sil_{i:03d}.wav')
            subprocess.run([FFMPEG, '-y', '-f', 'lavfi', '-i', f'anullsrc=r=24000:cl=mono', '-t', f'{gap:.2f}', sil_path],
                           capture_output=True, check=True)
            seg_files.append(sil_path)
        # synth
        mp3_path = os.path.join(WORK_DIR, f's_v_{i:03d}.mp3')
        wav_path = os.path.join(WORK_DIR, f's_v_{i:03d}.wav')
        try:
            asyncio.run(synth(c['text'], mp3_path))
        except Exception as e:
            print(f'    [warn] tts failed seg {i}: {e}')
            continue
        # mp3 → wav 24kHz mono
        subprocess.run([FFMPEG, '-y', '-i', mp3_path, '-ar', '24000', '-ac', '1', wav_path],
                       capture_output=True, check=True)
        seg_files.append(wav_path)
        # 측정한 wav 길이만큼 cursor 진행
        probe = subprocess.run([FFMPEG, '-i', wav_path], capture_output=True, text=True)
        # parse Duration: 00:00:0X.XX
        dur_sec = c['dur']  # default fallback
        for line in probe.stderr.split('\n'):
            if 'Duration:' in line:
                ts = line.split('Duration:')[1].split(',')[0].strip()
                hh, mm, ss = ts.split(':')
                dur_sec = int(hh)*3600 + int(mm)*60 + float(ss)
                break
        cursor_t = c['at'] + dur_sec

    # 끝 padding
    if cursor_t < total_dur:
        sil_path = os.path.join(WORK_DIR, 's_sil_end.wav')
        subprocess.run([FFMPEG, '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', f'{total_dur - cursor_t:.2f}', sil_path],
                       capture_output=True, check=True)
        seg_files.append(sil_path)

    # concat list
    list_path = os.path.join(WORK_DIR, 'concat_list.txt')
    with open(list_path, 'w', encoding='utf-8') as f:
        for p in seg_files:
            f.write(f"file '{p.replace(chr(92), '/')}'\n")

    subprocess.run([FFMPEG, '-y', '-f', 'concat', '-safe', '0', '-i', list_path, '-c', 'copy', AUDIO_PATH],
                   capture_output=True, check=True)
    print(f"    narration.wav ({os.path.getsize(AUDIO_PATH)//1024} KB)")
    return True

# ──────────────────────────────────────────
# 5) 자막+음성 합성
# ──────────────────────────────────────────
def merge_audio():
    if not os.path.exists(AUDIO_PATH):
        print('[!] no audio — skip TTS version')
        return
    print(f"[*] merge subtitled video + narration → 음성.mp4")
    cmd = [
        FFMPEG, '-y',
        '-i', OUT_SUB,
        '-i', AUDIO_PATH,
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '128k',
        '-map', '0:v:0', '-map', '1:a:0',
        '-shortest',
        OUT_TTS,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:]); return
    print(f"    saved {OUT_TTS} ({os.path.getsize(OUT_TTS)//1024} KB)")

# ──────────────────────────────────────────
# main
# ──────────────────────────────────────────
if __name__ == '__main__':
    build_base()
    build_subs()
    burn_subs()
    if build_tts():
        merge_audio()
    print('[OK] Option A complete')

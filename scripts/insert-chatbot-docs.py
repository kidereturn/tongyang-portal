# -*- coding: utf-8 -*-
"""Insert 19 extracted chatbot docs into Supabase chatbot_documents table.

Requires env var SUPABASE_SERVICE_ROLE_KEY (read from .env.vercel-sync if missing).
"""
import os, json, sys, re
from pathlib import Path
import urllib.request

ROOT = Path(__file__).parent.parent
EXTRACTED = ROOT / 'scripts' / 'chatbot-docs-extracted.json'
ENV_FILE = ROOT / '.env.vercel-sync'

SUPABASE_URL = 'https://okaqopssfjjysgyrntnc.supabase.co'

# Load service role key from env file
service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not service_key and ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY'):
            m = re.match(r'SUPABASE_SERVICE_ROLE_KEY\s*=\s*"?([^"]+)"?', line)
            if m:
                service_key = m.group(1).strip()
                break
if not service_key:
    print("SUPABASE_SERVICE_ROLE_KEY not found", file=sys.stderr); sys.exit(1)

# Load extracted docs
docs = json.loads(EXTRACTED.read_text(encoding='utf-8'))
print(f"Loaded {len(docs)} docs from {EXTRACTED.name}")

# Delete existing chatbot_documents with matching title (so re-run is idempotent).
# Titles from our 19 files; we overwrite if they already exist.
titles = [d['title'] for d in docs]

def request(method, path, body=None):
    url = f"{SUPABASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header('apikey', service_key)
    req.add_header('Authorization', f'Bearer {service_key}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=representation')
    data = json.dumps(body).encode('utf-8') if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=60) as resp:
            return resp.status, resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

# 1) Delete existing rows with matching titles (clean slate per file)
print("\n[1/2] Deleting existing rows with matching titles...")
# Use PostgREST "in" filter, with URL-encoded titles
import urllib.parse
# Encode titles for "in" - PostgREST expects "in.(title1,title2,...)" with %2C escape
# Easier: one delete per title
deleted = 0
for t in titles:
    q = urllib.parse.quote(t, safe='')
    status, body = request('DELETE', f'/rest/v1/chatbot_documents?title=eq.{q}')
    if status in (200, 204):
        # parse count from prefer=representation body
        try:
            rows = json.loads(body) if body and body.strip().startswith('[') else []
            deleted += len(rows)
        except Exception:
            pass

print(f"  deleted {deleted} existing rows")

# 2) Insert new rows
print("\n[2/2] Inserting 19 new rows...")
payload = [
    {
        'title': d['title'],
        'category': d['category'],
        'content': d['content'],
        'is_active': True,
    }
    for d in docs
]

# Chunk — some docs are 1MB each, so insert 1 at a time to avoid body-size limits
inserted = 0
errors = []
for i, row in enumerate(payload, 1):
    status, body = request('POST', '/rest/v1/chatbot_documents', [row])
    if status in (200, 201):
        inserted += 1
        print(f"  {i:2d}/{len(payload)}  ok   ({row['category']:10s} · {len(row['content']):>7,}자)  {row['title'][:48]}")
    else:
        errors.append({'title': row['title'], 'status': status, 'body': body[:400]})
        print(f"  {i:2d}/{len(payload)}  ERR  status={status}  {row['title'][:48]}", file=sys.stderr)
        print(f"      → {body[:300]}", file=sys.stderr)

print(f"\n✓ inserted {inserted}/{len(payload)}")
if errors:
    print(f"✗ errors: {len(errors)}")
    for e in errors[:5]:
        print(' ', e)

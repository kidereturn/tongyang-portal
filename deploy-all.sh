#!/bin/bash
# deploy-all.sh — tongyang-portal + egty 동시 배포
# 사용법: bash deploy-all.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERCEL_DIR="$PROJECT_DIR/.vercel"

TONGYANG='{"projectId":"prj_F1wOv2434LnbmgFSAFC2D0gmym7t","orgId":"team_PB48GJ6DogH8c0z2AZwnflxo","projectName":"tongyang-portal"}'
EGTY='{"projectId":"prj_F1wOv2434LnbmgFSAFC2D0gmym7t","orgId":"team_PB48GJ6DogH8c0z2AZwnflxo","projectName":"egty"}'

cd "$PROJECT_DIR"

echo ""
echo "========================================="
echo "  1/2  tongyang-portal 배포 중..."
echo "========================================="
echo "$TONGYANG" > "$VERCEL_DIR/project.json"
npx vercel --prod

echo ""
echo "========================================="
echo "  2/2  egty 배포 중..."
echo "========================================="
npx vercel link --project egty --yes
npx vercel --prod

echo ""
echo "========================================="
echo "  원래 프로젝트 링크 복원"
echo "========================================="
echo "$TONGYANG" > "$VERCEL_DIR/project.json"

echo ""
echo "✅ 배포 완료!"
echo "  → https://tongyang-portal.vercel.app"
echo "  → https://egty.vercel.app"
echo ""

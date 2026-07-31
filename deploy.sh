#!/bin/bash
# deploy.sh — Vercel 배포 스크립트

echo "=== Vercel 배포 시작 ==="

# 1. 로컬 빌드 테스트
echo "1. 로컬 환경 확인..."
if [ ! -f "index.html" ]; then
  echo "✗ index.html 파일 없음"
  exit 1
fi

if [ ! -f "vercel.json" ]; then
  echo "✗ vercel.json 파일 없음"
  exit 1
fi

# 2. API 키 확인
echo "2. 환경변수 확인..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠ ANTHROPIC_API_KEY가 설정되지 않았습니다."
  echo "  Vercel 대시보드에서 설정해주세요."
fi

# 3. 배포 실행
echo "3. Vercel 배포 실행..."
vercel --prod

echo "=== 배포 완료 ==="
echo "배포 URL을 확인해주세요."

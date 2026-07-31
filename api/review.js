/**
 * @file api/review.js
 * @description Vercel serverless function — 기획안 검토 CRUD
 * 
 * GET    /api/review?id=xxx        — 리뷰 데이터 조회
 * POST   /api/review               — 새 리뷰 생성
 * PATCH  /api/review               — 승인/수정요청 상태 업데이트
 * 
 * 저장소: JSON 파일 기반 (/tmp/reviews/)
 * 참고: /tmp는 서버리스 함수 인스턴스 간 공유되지 않으므로,
 *       프로덕션에서는 Vercel KV 또는 외부 DB 사용 권장.
 *       현재 구현은 단일 인스턴스 테스트 용도.
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const REVIEWS_DIR = '/tmp/reviews';

// 디렉토리 초기화
async function ensureDir() {
  if (!existsSync(REVIEWS_DIR)) {
    await mkdir(REVIEWS_DIR, { recursive: true });
  }
}

// JSON 파일 경로
function getFilePath(id) {
  // ID에서 안전한 파일명 생성
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(REVIEWS_DIR, `${safeId}.json`);
}

// ID 생성
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureDir();

    // ── GET: 리뷰 조회 ──
    if (req.method === 'GET') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'id 파라미터가 필요합니다.' });
      }

      const filePath = getFilePath(id);
      if (!existsSync(filePath)) {
        return res.status(404).json({ error: '해당 기획안을 찾을 수 없습니다.' });
      }

      const data = await readFile(filePath, 'utf-8');
      return res.status(200).json(JSON.parse(data));
    }

    // ── POST: 새 리뷰 생성 ──
    if (req.method === 'POST') {
      const body = req.body;
      const id = generateId();
      
      const reviewData = {
        id,
        brandName: body.brandName || '',
        productName: body.productName || '',
        script: body.script || null,
        rationale: body.rationale || [],
        strategy: body.strategy || null,
        status: 'pending',
        memo: '',
        createdAt: new Date().toISOString(),
        reviewedAt: null
      };

      const filePath = getFilePath(id);
      await writeFile(filePath, JSON.stringify(reviewData, null, 2), 'utf-8');
      
      return res.status(201).json({ 
        success: true, 
        id,
        message: '리뷰가 생성되었습니다.'
      });
    }

    // ── PATCH: 상태 업데이트 ──
    if (req.method === 'PATCH') {
      const { id, status, memo, reviewedAt } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'id가 필요합니다.' });
      }

      const filePath = getFilePath(id);
      if (!existsSync(filePath)) {
        return res.status(404).json({ error: '해당 기획안을 찾을 수 없습니다.' });
      }

      const existing = JSON.parse(await readFile(filePath, 'utf-8'));
      
      const updated = {
        ...existing,
        status: status || existing.status,
        memo: memo !== undefined ? memo : existing.memo,
        reviewedAt: reviewedAt || existing.reviewedAt
      };

      await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
      
      return res.status(200).json({ 
        success: true, 
        message: '상태가 업데이트되었습니다.'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('[api/review.js] 오류:', error);
    return res.status(500).json({ 
      error: error.message || '서버 내부 오류'
    });
  }
}

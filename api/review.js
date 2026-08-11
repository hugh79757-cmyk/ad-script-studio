/**
 * @file api/review.js
 * @description Vercel serverless function — 기획안 검토 CRUD (Vercel KV 저장소)
 * 
 * GET    /api/review?id=xxx        — 리뷰 데이터 조회
 * POST   /api/review               — 새 리뷰 생성
 * PATCH  /api/review               — 승인/수정요청 상태 업데이트
 * 
 * 저장소: Vercel KV (Upstash Redis 기반)
 * 키 형식: review:{project-id}
 * project-id: crypto.randomBytes로 생성 (22자, 128bit 엔트로피, 추측 불가)
 */

import { kv } from '@vercel/kv';
import { randomBytes } from 'crypto';

const KV_PREFIX = 'review:';
const REVIEW_TTL_SECONDS = 60 * 60 * 24; // 24h — 무제한 저장으로 KV가 차오르는 것 방지

// 문자열 길이 상한 (검증)
const MAX_TEXT_LEN = 2000;
const MAX_MEMO_LEN = 2000;
const VALID_STATUS = ['pending', 'approved', 'rejected'];

// 추측 불가능한 랜덤 ID 생성 (base64url, 22자)
function generateId() {
  // 16 bytes = 128 bits → base64url 인코딩 시 22자
  // 문자셋: A-Z, a-z, 0-9, -, _ (URL 안전)
  return randomBytes(16).toString('base64url');
}

// 검증: 문자열 + 길이 상한
function isValidText(value, maxLen) {
  return typeof value === 'string' && value.length <= maxLen;
}

// 검증: 배열 또는 null/undefined
function isValidArray(value) {
  return value === undefined || value === null || Array.isArray(value);
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
    // ── GET: 리뷰 조회 ──
    if (req.method === 'GET') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'id 파라미터가 필요합니다.' });
      }

      const key = `${KV_PREFIX}${id}`;
      const data = await kv.get(key);
      
      if (!data) {
        return res.status(404).json({ error: '해당 기획안을 찾을 수 없습니다.' });
      }
      
      return res.status(200).json(data);
    }

    // ── POST: 새 리뷰 생성 ──
    if (req.method === 'POST') {
      const body = req.body || {};
      
      // 입력 검증 (1-4)
      if (body.brandName !== undefined && !isValidText(body.brandName, MAX_TEXT_LEN)) {
        return res.status(400).json({ error: 'brandName은 문자열이어야 하며 최대 2000자입니다.' });
      }
      if (body.productName !== undefined && !isValidText(body.productName, MAX_TEXT_LEN)) {
        return res.status(400).json({ error: 'productName은 문자열이어야 하며 최대 2000자입니다.' });
      }
      if (body.script !== undefined && body.script !== null && typeof body.script !== 'object') {
        return res.status(400).json({ error: 'script는 객체여야 합니다.' });
      }
      if (body.strategy !== undefined && body.strategy !== null && typeof body.strategy !== 'object') {
        return res.status(400).json({ error: 'strategy는 객체여야 합니다.' });
      }
      if (!isValidArray(body.rationale)) {
        return res.status(400).json({ error: 'rationale는 배열이어야 합니다.' });
      }
      
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

      const key = `${KV_PREFIX}${id}`;
      await kv.set(key, reviewData, { ex: REVIEW_TTL_SECONDS });
      
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
      
      // 상태 enum 검증 (1-4)
      if (status !== undefined && status !== null && !VALID_STATUS.includes(status)) {
        return res.status(400).json({ error: `status는 ${VALID_STATUS.join(', ')} 중 하나여야 합니다.` });
      }
      if (memo !== undefined && !isValidText(memo, MAX_MEMO_LEN)) {
        return res.status(400).json({ error: 'memo는 문자열이어야 하며 최대 2000자입니다.' });
      }

      const key = `${KV_PREFIX}${id}`;
      const existing = await kv.get(key);
      
      if (!existing) {
        return res.status(404).json({ error: '해당 기획안을 찾을 수 없습니다.' });
      }

      const updated = {
        ...existing,
        status: status !== undefined ? status : existing.status,
        memo: memo !== undefined ? memo : existing.memo,
        reviewedAt: reviewedAt || existing.reviewedAt
      };

      await kv.set(key, updated, { ex: REVIEW_TTL_SECONDS });
      
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

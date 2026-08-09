// api/content/core.js — 콘텐츠 코어 YAML 스키마 + 저장/불러오기/목록 조회 + 변환 함수
// v2.0

import { load, dump } from 'js-yaml';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';

// ─────────────────────────────────────────────
// 경로 헬퍼
// ─────────────────────────────────────────────

const CAMPAIGNS_DIR = join(cwd(), 'content', 'campaigns');

function campaignDir(campaignId) {
  return join(CAMPAIGNS_DIR, campaignId);
}

function coreYamlPath(campaignId) {
  return join(campaignDir(campaignId), 'core.yaml');
}

// ─────────────────────────────────────────────
// 보안: Path traversal 방지
// ─────────────────────────────────────────────

function isValidCampaignId(id) {
  if (typeof id !== 'string' || id.length === 0) return false;
  if (id.includes('/') || id.includes('\\')) return false;
  if (id === '.' || id === '..') return false;
  // 경로 조각 포함 금지: '.', '..'이 path segment로 들어가면 안 됨
  const segments = id.split('/').filter(Boolean);
  for (const seg of segments) {
    if (seg === '.' || seg === '..') return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// CORE_SCHEMA (7개 그룹, 30+ 필드)
// ─────────────────────────────────────────────

export const CORE_SCHEMA = {
  // 그룹 A: 식별·메타
  campaignId: { type: 'string', required: true },
  createdAt: { type: 'string', required: true, format: 'iso' },
  updatedAt: { type: 'string', required: true, format: 'iso' },
  schemaVersion: { type: 'string', required: true, default: '2.0' },
  source: { type: 'string', enum: ['user', 'auto-research', 'bridge'], default: 'user' },
  parentCampaignId: { type: 'string', required: false },

  // 그룹 B: 제품
  product: {
    name: { type: 'string', required: true },
    brand: { type: 'string', required: true },
    category: { type: 'string', required: false },
    price: { type: 'string', required: false },
    competitor: { type: 'string', required: false },
    trustFactors: { type: 'array', items: 'string', required: false }
  },

  // 그룹 C: 타겟·목적
  target: {
    description: { type: 'string', required: true },
    painPoints: { type: 'array', items: 'string', required: false }
  },
  purpose: {
    stage: { type: 'string', enum: ['인지', '고려', '결정'], required: true },
    callToAction: { type: 'string', required: false }
  },

  // 그룹 D: 메시지·당위성
  message: {
    concept: { type: 'string', required: true },
    tone: { type: 'string', required: true }
  },
  rationale: {
    principles: { type: 'array', items: 'object', required: false },
    excludedPrinciples: { type: 'array', items: 'string', required: false }
  },

  // 그룹 E: 근거자료
  evidence: {
    reviews: { type: 'array', items: 'string', required: false },
    viralScripts: { type: 'array', items: 'object', required: false },
    researchSummary: { type: 'string', required: false }
  },

  // 그룹 F: 법적고지
  legal: {
    affiliateType: { type: 'string', enum: ['쿠팡파트너스', '브랜드커넥스', '기타', '없음'], required: false },
    disclosureText: { type: 'string', required: false },
    restrictedClaims: { type: 'array', items: 'string', required: false }
  },

  // 그룹 G: 깊이단계 소구점 + 니치
  niche: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    version: { type: 'string', required: true },
    tone: { type: 'object', required: false },
    restrictions: {
      avoidWords: { type: 'array', items: 'string', required: false },
      avoidPhrases: { type: 'array', items: 'string', required: false },
      claimLimits: { type: 'object', required: false }
    },
    trust: { type: 'object', required: false }
  },
  depth: {
    basic: { type: 'object', required: false },
    applied: { type: 'object', required: false },
    advanced: { type: 'object', required: false }
  }
};

// 필수 필드 목록 (평탄화된 키 경로)
const REQUIRED_FIELDS = [
  'campaignId', 'createdAt', 'updatedAt', 'schemaVersion',
  'product.name', 'product.brand',
  'target.description',
  'message.concept', 'message.tone',
  'purpose.stage',
  'niche.id', 'niche.name', 'niche.version'
];

// ─────────────────────────────────────────────
// 캠페인 디렉토리 생성
// ─────────────────────────────────────────────

export function createCampaignDir(campaignId) {
  if (!isValidCampaignId(campaignId)) {
    return { success: false, error: 'Invalid campaignId: path traversal characters not allowed (., .., /)' };
  }
  const dir = campaignDir(campaignId);
  mkdirSync(dir, { recursive: true });
  return { success: true, path: dir };
}

// ─────────────────────────────────────────────
// 저장
// ─────────────────────────────────────────────

export function saveCore(campaignId, coreData) {
  if (!isValidCampaignId(campaignId)) {
    return { success: false, error: 'Invalid campaignId: path traversal characters not allowed (., .., /)' };
  }

  try {
    // 디렉토리 자동 생성
    createCampaignDir(campaignId);

    const yamlContent = dump(coreData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });

    const filePath = coreYamlPath(campaignId);
    writeFileSync(filePath, yamlContent, 'utf8');
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: `saveCore failed: ${err.message || String(err)}` };
  }
}

// ─────────────────────────────────────────────
// 불러오기
// ─────────────────────────────────────────────

export function loadCore(campaignId) {
  if (!isValidCampaignId(campaignId)) {
    return { success: false, error: 'Invalid campaignId: path traversal characters not allowed (., .., /)' };
  }

  const filePath = coreYamlPath(campaignId);

  try {
    if (!existsSync(filePath)) {
      return { success: false, error: `core.yaml not found for campaignId: ${campaignId}` };
    }

    const raw = readFileSync(filePath, 'utf8');
    const parsed = load(raw);

    if (parsed === null || typeof parsed !== 'object') {
      return { success: false, error: 'YAML parsed to non-object value' };
    }

    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: `loadCore parse error: ${err.message || String(err)}` };
  }
}

// ─────────────────────────────────────────────
// 목록 조회
// ─────────────────────────────────────────────

export function listCampaigns() {
  try {
    if (!existsSync(CAMPAIGNS_DIR)) {
      return { success: true, campaigns: [] };
    }

    const entries = readdirSync(CAMPAIGNS_DIR, { withFileTypes: true });
    const campaignIds = entries
      .filter(e => e.isDirectory())
      .map(e => e.name);

    return { success: true, campaigns: campaignIds };
  } catch (err) {
    return { success: false, error: `listCampaigns failed: ${err.message || String(err)}` };
  }
}

// ─────────────────────────────────────────────
// 검증
// ─────────────────────────────────────────────

export function validateCore(core) {
  const errors = [];

  if (!core || typeof core !== 'object') {
    return { valid: false, errors: ['core must be a non-null object'] };
  }

  // 필수 필드 검사
  for (const fieldPath of REQUIRED_FIELDS) {
    const value = getNestedValue(core, fieldPath);
    if (value === undefined || value === null || value === '') {
      errors.push(`Missing required field: ${fieldPath}`);
    }
  }

  // purpose.stage enum 검증
  const stage = getNestedValue(core, 'purpose.stage');
  if (stage !== undefined && stage !== null) {
    if (!['인지', '고려', '결정'].includes(stage)) {
      errors.push(`purpose.stage must be one of ['인지', '고려', '결정'], got: ${stage}`);
    }
  }

  // depth.basic / applied / advanced 구조 검증 (존재하면 객체여야 함)
  for (const depthKey of ['basic', 'applied', 'advanced']) {
    const depthValue = getNestedValue(core, `depth.${depthKey}`);
    if (depthValue !== undefined && depthValue !== null) {
      if (typeof depthValue !== 'object' || Array.isArray(depthValue)) {
        errors.push(`depth.${depthKey} must be an object if present, got: ${typeof depthValue}`);
      }
    }
  }

  // product.trustFactors 배열 타입 검사
  const trustFactors = getNestedValue(core, 'product.trustFactors');
  if (trustFactors !== undefined && trustFactors !== null) {
    if (!Array.isArray(trustFactors)) {
      errors.push('product.trustFactors must be an array if present');
    }
  }

  // evidence.reviews 배열 타입 검사
  const reviews = getNestedValue(core, 'evidence.reviews');
  if (reviews !== undefined && reviews !== null) {
    if (!Array.isArray(reviews)) {
      errors.push('evidence.reviews must be an array if present');
    }
  }

  // legal.restrictedClaims 배열 타입 검사
  const restrictedClaims = getNestedValue(core, 'legal.restrictedClaims');
  if (restrictedClaims !== undefined && restrictedClaims !== null) {
    if (!Array.isArray(restrictedClaims)) {
      errors.push('legal.restrictedClaims must be an array if present');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ─────────────────────────────────────────────
// 헬퍼: 중첩 필드 접근
// ─────────────────────────────────────────────

function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

// ─────────────────────────────────────────────
// 캠페인 ID 생성 헬퍼
// ─────────────────────────────────────────────

export function generateId(stem) {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const slug = (stem || 'campaign')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return `${date}_${slug}`;
}

// ─────────────────────────────────────────────
// v1 appState → 콘텐츠 코어 변환 (fromAppState)
// ─────────────────────────────────────────────

export function fromAppState(appState) {
  const state = appState || {};

  return {
    // 그룹 A: 식별·메타
    campaignId: state.campaignId || generateId('auto'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: '2.0',
    source: state._source || 'user',

    // 그룹 B: 제품
    product: {
      name: state.productName || '',
      brand: state.brandName || '',
      category: '',
      price: state.priceRange || '',
      competitor: state.competitorInfo || '',
      trustFactors: Array.isArray(state.trustFactors) ? [...state.trustFactors] : []
    },

    // 그룹 C: 타겟·목적
    target: {
      description: state.target || '',
      painPoints: []
    },
    purpose: {
      stage: '인지',
      callToAction: ''
    },

    // 그룹 D: 메시지·당위성
    message: {
      concept: state.concept || '',
      tone: state.toneAndManner || '진지'
    },
    rationale: {
      principles: [],
      excludedPrinciples: []
    },

    // 그룹 E: 근거자료
    evidence: {
      reviews: Array.isArray(state.reviewExcerpts) ? [...state.reviewExcerpts] : [],
      viralScripts: [],
      researchSummary: ''
    },

    // 그룹 F: 법적고지
    legal: {
      affiliateType: '없음',
      disclosureText: '',
      restrictedClaims: Array.isArray(state.excludedKeywords) ? [...state.excludedKeywords] : []
    },

    // 그룹 G: 깊이단계 + 니치
    niche: {
      id: 'pending',
      name: '',
      version: '2.0'
    },
    depth: {
      basic: {},
      applied: {},
      advanced: {}
    }
  };
}

// ─────────────────────────────────────────────
// 콘텐츠 코어 → v1 appState 역변환 (toAppState)
// ─────────────────────────────────────────────

export function toAppState(core) {
  if (!core || typeof core !== 'object') {
    return {
      brandName: '', productName: '', concept: '', target: '', toneAndManner: '',
      competitorInfo: '', priceRange: '', reviewExcerpts: [], trustFactors: [], excludedKeywords: [],
      mode: 'manual'
    };
  }

  return {
    brandName: core.product?.brand || '',
    productName: core.product?.name || '',
    concept: core.message?.concept || '',
    target: core.target?.description || '',
    toneAndManner: core.message?.tone || '진지',
    competitorInfo: core.product?.competitor || '',
    priceRange: core.product?.price || '',
    reviewExcerpts: Array.isArray(core.evidence?.reviews) ? [...core.evidence.reviews] : [],
    trustFactors: Array.isArray(core.product?.trustFactors) ? [...core.product.trustFactors] : [],
    excludedKeywords: Array.isArray(core.legal?.restrictedClaims) ? [...core.legal.restrictedClaims] : [],
    mode: 'manual'
  };
}

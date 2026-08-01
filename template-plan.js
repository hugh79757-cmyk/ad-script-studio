/**
 * @file template-plan.js
 * @description 60초 숏폼 광고 스크립트 템플릿 생성 유틸리티.
 * 15초 / 30초 변환 시 축약 규칙을 내장하고, appState의 플레이스홀더를 대체하여 완성된 장면 배열을 반환한다.
 * 모든 심볼은 글로벌 스코프에 노출되어 다른 스크립트에서 직접 사용할 수 있다.
 */

/**
 * 60초 기본 7-장면 스크립트 템플릿 상수.
 *
 * 각 장면(Scene) 객체:
 * @typedef {Object} Scene
 * @property {number}   time      - 장면 시작 시각(초 단위, 예: 0)
 * @property {string}   type      - 장면 유형(hook, problem, solution 등)
 * @property {string}   dialogue  - 대본(플레이스홀더 포함 원본)
 * @property {string}   direction - 연출 지시
 * @property {string}   visual    - 시각/카메라 지시
 */
/**
 * @constant {Object} SCRIPT_TEMPLATE
 * @property {Scene[]} scenes      - 7개 장면 배열
 * @property {Object}  templates   - 장면 유형별 대본 템플릿(플레이스홀더 포함)
 * @property {number}  totalScenes - 전체 장면 수(7)
 * @property {number}  duration    - 기본 영상 길이(초, 60)
 */
const SCRIPT_TEMPLATE = {
  totalScenes: 7,
  duration: 60,

  /** @type {Scene[]} */
  scenes: [
    {
      time: 0,
      type: 'hook',
      dialogue: '{brandName}으로 바꾼 후, {target}들의 반응이 달라졌어요.',
      direction: '카메라: 클로즈업 → 풀샷 전환',
      visual: '브랜드 로고 또는 핵심 제품이 돋보이는 프레임',
    },
    {
      time: 3,
      type: 'problem',
      dialogue: '{target}들이 가장 고민하는 것, 바로 {painPoint}입니다.',
      direction: '인터뷰 또는 POV 시점',
      visual: '불편함을 표현하는 사용자 표정 또는 상황 재연',
    },
    {
      time: 10,
      type: 'solution',
      dialogue: '{brandName} {productName}은 {keyBenefit}를 제공합니다.',
      direction: '제품 데모 또는 사용법 시연',
      visual: '제품 핵심 기능을 강조하는 화면',
    },
    {
      time: 20,
      type: 'benefit',
      dialogue: '{resultStat}을 경험한 {target}들의 실제 후기입니다.',
      direction: '데이터 시각화 또는 리뷰 스크린샷',
      visual: '수치 결과가 표시되는 화면 또는 사용자 인터뷰 클립',
    },
    {
      time: 30,
      type: 'proof',
      dialogue: '{trustFactor}로 검증된 {brandName}입니다.',
      direction: '인증 마크 또는 수상 내역 표시',
      visual: '공식 인증 로고 / 검증 배지',
    },
    {
      time: 40,
      type: 'cta',
      dialogue: '지금 바로 {brandName} {productName}을 만나보세요.',
      direction: 'QR 코드 또는 URL 표시',
      visual: '행동 유도 버튼 또는 QR 코드 영역',
    },
    {
      time: 50,
      type: 'closing',
      dialogue: '{brandName} — {slogan}',
      direction: '로고 + 슬로건 합성',
      visual: '브랜드 아이덴티티 강조 마무리 프레임',
    },
  ],

  /**
   * 장면 유형별 원본 템플릿 대본.
   * generateScript() 내부에서 state 값으로 플레이스홀더를 대체한다.
   * @type {Record<string, string>}
   */
  templates: {
    hook:     '{brandName}으로 바꾼 후, {target}들의 반응이 달라졌어요.',
    problem:  '{target}들이 가장 고민하는 것, 바로 {painPoint}입니다.',
    solution: '{brandName} {productName}은 {keyBenefit}를 제공합니다.',
    benefit:  '{resultStat}을 경험한 {target}들의 실제 후기입니다.',
    proof:    '{trustFactor}로 검증된 {brandName}입니다.',
    cta:      '지금 바로 {brandName} {productName}을 만나보세요.',
    closing:  '{brandName} — {slogan}',
  },
};

/**
 * 플레이스홀더 문자열을 appState 값으로 대체한다.
 *
 * 버그 수정 (2026-08-01):
 * - {keyBenefit}, {painPoint}, {resultStat}, {slogan}은 실제 appState에 없는
 *   필드라 항상 fallback 문자열("핵심 혜택", "고민거리", "만족한 결과")이
 *   그대로 출력됨 → 실제 필드로 매핑 (keyBenefit→concept, painPoint→리뷰,
 *   resultStat→자연스러운 기본 문구, slogan→concept)
 * - 하드코딩 조사("으로", "을")가 받침을 무시해 "라네즈으로" 같은 오류 발생
 *   → korean-utils.js의 getJosa()로 받침 기반 자동 결합
 * - 타겟/리뷰 입력값의 # 같은 특수문자를 cleanKoreanText()로 정제
 *
 * @param {string}  template   - 플레이스홀더를 포함한 템플릿 문자열
 * @param {Object}  state      - appState 객체
 * @param {string}  state.brandName         - 브랜드명
 * @param {string}  state.productName       - 제품명
 * @param {string}  state.target            - 타겟 고객 설명
 * @param {string}  state.concept           - 컨셉/핵심 혜택 (keyBenefit 대체)
 * @param {string[]} state.trustFactors     - 신뢰 요소 목록
 * @param {string[]} state.reviewExcerpts   - 리뷰 발췌 (painPoint 대체)
 * @returns {string} 플레이스홀더가 대체된 문자열
 */
function replacePlaceholders(template, state) {
  const brand = state.brandName || '브랜드명';
  const product = state.productName || '제품명';
  const target = cleanKoreanText(state.target) || '고객';

  // keyBenefit: 실제 필드가 없어 concept(핵심 컨셉)를 핵심 혜택으로 사용
  const keyBenefit = state.concept || '기대 이상의 만족';

  // painPoint: 실제 필드가 없어 리뷰 첫 건을 "…라는 고민" 형태로 사용.
  // 리뷰가 없으면 자연스러운 기본 문구
  const painPoint = (Array.isArray(state.reviewExcerpts) && state.reviewExcerpts.length > 0)
    ? `"${cleanKoreanText(state.reviewExcerpts[0])}"라는 고민`
    : '해결되지 않은 일상의 불편함';

  // resultStat: 실제 필드가 없어 수치 보장 없는 자연스러운 기본 문구
  const resultStat = '만족스러운 변화';

  // slogan: 실제 필드가 없어 concept를 슬로건 자리로 활용, 없으면 기본 문구
  const slogan = state.concept || '더 나은 내일을 위해';

  const trustFactor = (Array.isArray(state.trustFactors) && state.trustFactors.length > 0)
    ? state.trustFactors[0]
    : '검증된 신뢰';

  // 1) 조사가 붙은 패턴을 먼저 처리 (받침 기반 자동 결합)
  let out = template
    .replace(/\{brandName\}으로/g, `${brand}${getJosa(brand, '로/으로')}`)
    .replace(/\{productName\}은/g, `${product}${getJosa(product, '은/는')}`)
    .replace(/\{productName\}을/g, `${product}${getJosa(product, '을/를')}`)
    .replace(/\{keyBenefit\}를/g, `${keyBenefit}${getJosa(keyBenefit, '을/를')}`)
    .replace(/\{resultStat\}을/g, `${resultStat}${getJosa(resultStat, '을/를')}`)
    .replace(/\{trustFactor\}로/g, `${trustFactor}${getJosa(trustFactor, '로/으로')}`);

  // 2) 일반 플레이스홀더 처리
  return out
    .replace(/\{brandName\}/g, brand)
    .replace(/\{productName\}/g, product)
    .replace(/\{target\}/g, target)
    .replace(/\{keyBenefit\}/g, keyBenefit)
    .replace(/\{trustFactor\}/g, trustFactor)
    .replace(/\{painPoint\}/g, painPoint)
    .replace(/\{resultStat\}/g, resultStat)
    .replace(/\{slogan\}/g, slogan);
}

/**
 * appState 기반으로 완성된 장면 배열을 생성한다.
 *
 * @param {Object} appState - state-manager.js 에서 관리하는 앱 상태
 * @param {string} [appState.brandName='']       - 브랜드명
 * @param {string} [appState.productName='']     - 제품/서비스명
 * @param {string} [appState.concept='']         - 컨셉 요약
 * @param {string} [appState.target='']          - 타겟 고객 설명
 * @param {string} [appState.toneAndManner='']   - 톤앤매너
 * @param {string} [appState.competitorInfo='']  - 경쟁사 정보
 * @param {string} [appState.priceRange='']      - 가격대
 * @param {string[]} [appState.reviewExcerpts=[]] - 리뷰 발췌
 * @param {string[]} [appState.trustFactors=[]]  - 신뢰 요소 목록
 * @param {string[]} [appState.excludedKeywords=[]] - 제외 키워드
 * @returns {Object[]} 대본이 채워진 장면 객체 배열
 *
 * @example
 * const scenes = generateScript(appState);
 * // [
 * //   { time: 0, type: 'hook', dialogue: '...', direction: '...', visual: '...' },
 * //   ...
 * // ]
 */
function generateScript(appState = {}) {
  const fallbackBrand = appState.brandName || '브랜드명';
  const fallbackProduct = appState.productName || '제품명';
  const fallbackResult = appState.resultStat || '높은 만족도';

  return SCRIPT_TEMPLATE.scenes.map((scene, idx) => {
    // templates 키에 등록된 대본을 우선 사용하고, 없으면 장면의 원본 dialogue 사용
    const rawDialogue = SCRIPT_TEMPLATE.templates[scene.type] || scene.dialogue;
    const dialogue = replacePlaceholders(rawDialogue, appState);

    // 시간 라벨 생성 (0, 3, 10 → "0:00-0:03" 등)
    const tl = getTimeLabel(idx, SCRIPT_TEMPLATE.scenes.length, SCRIPT_TEMPLATE.duration);

    return {
      time: tl.label,
      type: scene.type,
      dialogue,
      direction: scene.direction,
      visual: scene.visual,
    };
  });
}

/**
 * 초 단위 시작/종료 라벨을 생성한다.
 *
 * @param {number} index         - 현재 장면 인덱스 (0-based)
 * @param {number} totalScenes   - 전체 장면 수
 * @param {number} totalDuration - 전체 영상 길이(초)
 * @returns {{ start: string, end: string, label: string }} 시간 라벨 객체
 *
 * @example
 * getTimeLabel(0, 3, 15); // { start: '0:00', end: '0:05', label: '0:00-0:05' }
 */
function getTimeLabel(index, totalScenes, totalDuration) {
  const segmentDuration = totalDuration / totalScenes;
  const startSeconds = Math.round(index * segmentDuration);
  const endSeconds = Math.round((index + 1) * segmentDuration);

  const formatTime = (sec) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const startLabel = formatTime(startSeconds);
  const endLabel = formatTime(endSeconds);

  return {
    start: startLabel,
    end: endLabel,
    label: `${startLabel}-${endLabel}`,
  };
}

/**
 * 장면 배열을 목표 길이에 맞춰 축약한다.
 *
 * 규칙:
 * - 60초: 전체 7장면 반환 (시간 라벨만 재계산)
 * - 30초: hook, problem, solution, cta 만 유지 (4장면), 시간 라벨 재분배
 * - 15초: hook, solution, cta 만 유지 (3장면), 시간 라벨 재분배
 * - 그 외: 원본 그대로 반환 (알 수 없는 길이는 축약하지 않음)
 *
 * @param {Object[]} scenes        - generateScript() 로 생성된 장면 배열
 * @param {number}   targetDuration - 목표 영상 길이(초). 15 | 30 | 60 중 하나
 * @returns {Object[]} 축약 및 시간 라벨이 재계산된 장면 배열
 *
 * @example
 * const shortScenes = abbreviateScript(scenes, 30);
 * // [
 * //   { time: 0,  type: 'hook',    dialogue: '...', direction: '...', visual: '...', timeLabel: '0:00-0:08' },
 * //   { time: 1,  type: 'problem', dialogue: '...', direction: '...', visual: '...', timeLabel: '0:08-0:16' },
 * //   ...
 * // ]
 */
function abbreviateScript(scenes, targetDuration) {
  // --- 60초: 전체 반환 ---
  if (targetDuration === 60 || targetDuration <= 0) {
    return scenes.map((scene, idx) => {
      const tl = getTimeLabel(idx, scenes.length, 60);
      return { ...scene, time: tl.label, timeLabel: tl.label, startTime: tl.start, endTime: tl.end };
    });
  }

  // --- 30초: hook, problem, solution, cta (4장면) ---
  const KEEP_FOR_30 = new Set(['hook', 'problem', 'solution', 'cta']);

  // --- 15초: hook, solution, cta (3장면) ---
  const KEEP_FOR_15 = new Set(['hook', 'solution', 'cta']);

  const keepTypes = targetDuration === 30 ? KEEP_FOR_30
                  : targetDuration === 15 ? KEEP_FOR_15
                  : null;

  if (!keepTypes) {
    // 알 수 없는 길이 → 원본 그대로 시간 라벨만 부여
    return scenes.map((scene, idx) => {
      const tl = getTimeLabel(idx, scenes.length, scenes.length * (targetDuration / scenes.length) || targetDuration);
      return { ...scene, time: tl.label, timeLabel: tl.label, startTime: tl.start, endTime: tl.end };
    });
  }

  const filtered = scenes.filter((scene) => keepTypes.has(scene.type));
  const totalFiltered = filtered.length;

  return filtered.map((scene, idx) => {
    const tl = getTimeLabel(idx, totalFiltered, targetDuration);
    return {
      ...scene,
      time: tl.label,
      timeLabel: tl.label,
      startTime: tl.start,
      endTime: tl.end,
    };
  });
}

// ---------------------------------------------------------------------------
// 글로벌 스코프 노출 (vanilla JS, 모듈/import 불필요)
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.SCRIPT_TEMPLATE   = SCRIPT_TEMPLATE;
  window.generateScript    = generateScript;
  window.abbreviateScript  = abbreviateScript;
  window.getTimeLabel      = getTimeLabel;
}

// ---------------------------------------------------------------------------
// CommonJS / Node 환경 polyfill (테스트/스크립트에서 직접 require 가능)
// ---------------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SCRIPT_TEMPLATE,
    generateScript,
    abbreviateScript,
    getTimeLabel,
  };
}

/**
 * @file korean-utils.js
 * @description 한국어 문자열 처리 유틸.
 * - 받침 유무 판별 (완성형 한글 기준)
 * - 조사 자동 결합 (을/를, 은/는, 이/가, 과/와, 로/으로)
 * - 자연어 문장 삽입 전 특수문자 정제
 *
 * 버그 수정 배경 (2026-08-01):
 * - "라네즈으로" → "라네즈로", "결과을" → "결과를" 같은 잘못된 조사 결합이
 *   템플릿의 하드코딩 조사("으로", "을") 때문에 발생 → 받침 기반 자동 결합으로 대체
 * - "#타겟" 처럼 입력값에 붙은 특수문자가 문장에 그대로 노출됨 → cleanKoreanText로 정제
 */

// ============================================================================
// 받침 판별
// ============================================================================

/**
 * 한글 완성형 글자의 받침 유무를 판별한다.
 * 유니코드 한글 완성형: U+AC00(가) ~ U+D7A3(힣)
 * (code - 0xAC00) % 28 === 0 → 받침 없음, 그 외 → 받침 있음
 *
 * @param {string} word - 검사할 단어 (마지막 글자를 판별)
 * @returns {boolean} 받침이 있으면 true
 */
function hasBatchim(word) {
  if (!word) return false;
  const trimmed = String(word).trim();
  if (trimmed.length === 0) return false;
  const lastChar = trimmed.charAt(trimmed.length - 1);
  const code = lastChar.charCodeAt(0);

  // 한글 완성형 범위 밖(영문, 숫자, 공백, 특수문자)은 받침 없음으로 취급
  if (code < 0xAC00 || code > 0xD7A3) return false;

  return (code - 0xAC00) % 28 !== 0;
}

/**
 * 마지막 글자의 종성(받침) 유니코드 인덱스를 반환한다. (0 = 받침 없음)
 * 종성 순서: 0:없음, 1:ㄱ, 2:ㄲ, 3:ㄳ, 4:ㄴ, 5:ㄵ, 6:ㄶ, 7:ㄷ, 8:ㄹ, ...
 * '로/으로' 판별에서 'ㄹ' 받침 예외 처리를 위해 사용된다.
 *
 * @param {string} word - 검사할 단어
 * @returns {number} 종성 인덱스 (0~27)
 */
function getLastJongseongIndex(word) {
  if (!word) return 0;
  const trimmed = String(word).trim();
  if (trimmed.length === 0) return 0;
  const lastChar = trimmed.charAt(trimmed.length - 1);
  const code = lastChar.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return 0;
  return (code - 0xAC00) % 28;
}

// ============================================================================
// 조사 자동 결합
// ============================================================================

/**
 * 단어에 맞는 조사를 자동 결합하여 반환한다.
 *
 * @param {string} word     - 조사가 붙을 단어 (예: "라네즈")
 * @param {string} josaType - 조사 쌍: '을/를' | '은/는' | '이/가' | '과/와' | '로/으로' | '이라는/라는'
 * @returns {string} 단어에 맞는 조사 (예: "로")
 *
 * @example
 * getJosa('라네즈', '로/으로'); // '로' (받침 없음)
 * getJosa('설록차', '로/으로'); // '으로' (받침 있음)
 * getJosa('서울',   '로/으로'); // '로' (ㄹ 받침 예외)
 * getJosa('결과',   '을/를');   // '을' (받침 있음)
 * getJosa('변화',   '을/를');   // '를' (받침 없음)
 * getJosa('크림',   '이라는/라는'); // '이라는' (받침 있음)
 * getJosa('사과',   '이라는/라는'); // '라는' (받침 없음)
 */
function getJosa(word, josaType) {
  const hasB = hasBatchim(word);

  switch (josaType) {
    case '을/를':
      return hasB ? '을' : '를';
    case '은/는':
      return hasB ? '은' : '는';
    case '이/가':
      return hasB ? '이' : '가';
    case '과/와':
      return hasB ? '과' : '와';
    case '로/으로':
      // 받침 없음 또는 'ㄹ' 받침 → '로', 그 외 받침 → '으로'
      return (!hasB || getLastJongseongIndex(word) === 8) ? '로' : '으로';
    case '이라는/라는':
      // 관형격 조사: 받침 있으면 '이라는', 없으면 '라는'
      // 예: "크림이라는", "사과라는"
      return hasB ? '이라는' : '라는';
    default:
      return '';
  }
}

/**
 * 단어 + 조사를 자연스럽게 결합한 문자열을 반환한다.
 * (getJosa와 동일하되, word가 비어있으면 조사만 반환하지 않고 빈 문자열 유지)
 *
 * @param {string} word     - 조사가 붙을 단어
 * @param {string} josaType - 조사 쌍
 * @returns {string} "단어+조사" 또는 word가 비면 빈 문자열
 */
function attachJosa(word, josaType) {
  if (!word || !String(word).trim()) return '';
  return String(word).trim() + getJosa(word, josaType);
}

// ============================================================================
// 텍스트 정제
// ============================================================================

/**
 * 자연어 문장에 삽입하기 전에 특수문자를 제거한다.
 * - # (해시태그 기호) 제거 — "#건성피부" → "건성피부"
 * - 마크다운 기호(*, _, `) 제거 — 문장이 **강조** 형태로 오염되는 것 방지
 * - 연속 공백을 하나로 압축
 *
 * 주의: 물결(~)은 "25~35세" 같은 범위 표현에 쓰이므로 제거하지 않는다.
 *
 * @param {string} text - 정제할 문자열
 * @returns {string} 특수문자가 제거된 문자열
 *
 * @example
 * cleanKoreanText('#건성피부');        // '건성피부'
 * cleanKoreanText('25~35세 여성 #속건조'); // '25~35세 여성 속건조'
 */
function cleanKoreanText(text) {
  if (!text) return '';
  return String(text)
    .replace(/[#*_`]/g, '')   // #, 마크다운 강조 기호 제거
    .replace(/\s+/g, ' ')     // 연속 공백 압축
    .trim();
}

// ============================================================================
// 글로벌 스코프 노출 (vanilla JS)
// ============================================================================
if (typeof window !== 'undefined') {
  window.hasBatchim = hasBatchim;
  window.getJosa = getJosa;
  window.attachJosa = attachJosa;
  window.cleanKoreanText = cleanKoreanText;
  window.KOREAN_UTILS = { hasBatchim, getJosa, attachJosa, cleanKoreanText };
}

// ============================================================================
// CommonJS / Node 환경 (테스트/스크립트에서 require 가능)
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hasBatchim,
    getJosa,
    attachJosa,
    cleanKoreanText
  };
}

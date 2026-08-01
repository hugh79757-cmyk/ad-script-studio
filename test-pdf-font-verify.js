// PDF 한글 폰트 로드 + PDF 생성 검증 (브라우저 콘솔에서 실행용)
// 이 스크립트를 브라우저 개발자 도구 콘솔에 붙여넣고 실행하세요.

(async () => {
  console.log('=== PDF 한글 폰트 검증 시작 ===');
  
  // 1. jsPDF 로드 확인
  if (typeof window.jspdf === 'undefined') {
    console.error('❌ jsPDF가 로드되지 않음');
    return;
  }
  console.log('✅ jsPDF 로드됨');
  
  // 2. 로컬 폰트 파일 접근 테스트 (같은 오리진 — CDN 아님)
  const fontUrl = 'fonts/NotoSansKR-subset.ttf';
  try {
    const resp = await fetch(fontUrl, { method: 'HEAD', mode: 'cors' });
    if (resp.ok) {
      console.log('✅ 폰트 CDN 접근 가능 (200 OK)');
    } else {
      console.error(`❌ 폰트 CDN 접근 실패: ${resp.status}`);
      return;
    }
  } catch (e) {
    console.error('❌ 폰트 CDN 네트워크 에러:', e.message);
    return;
  }
  
  // 3. 폰트 로드 함수 테스트
  if (typeof window.loadKoreanFont !== 'function') {
    console.error('❌ loadKoreanFont 함수가 없음');
    return;
  }
  
  console.log('🔄 폰트 로드 중...');
  const fontLoaded = await window.loadKoreanFont();
  if (fontLoaded) {
    console.log('✅ 한글 폰트 로드 및 등록 성공');
  } else {
    console.error('❌ 한글 폰트 로드 실패');
    return;
  }
  
  // 4. PDF 생성 테스트 (라네즈 데이터)
  const testState = {
    brandName: '라네즈',
    productName: '워터뱅크 크림',
    target: '2030 건성 피부 여성',
    concept: '하루 종일 촉촉한 수분 크림',
    toneAndManner: '신뢰감 있는'
  };
  
  const testScenes = [
    { time: '0-3초', type: '훅', dialogue: '아침까지 촉촉한 크림, 진짜 있을까?', direction: '시각: 어두운 침실, 알람 울리며 눈 뜨는 여성' },
    { time: '3-8초', type: '문제 공감', dialogue: '겨울만 되면 트고, 비싼 거 발라도 소용없더라.', direction: '시각: 분할 화면 좌측 - 키엘 / 우측 - 라네즈' },
    { time: '8-18초', type: '증거 우선', dialogue: '피부과 테스트 완료, 100만 개가 증명한 수분력.', direction: '시각: 제품 용기 360° 회전 → 인증 마크 줌인' },
  ];
  
  try {
    console.log('🔄 PDF 생성 테스트 중...');
    await window.downloadProposalPDF(
      {},  // data
      testState,
      testScenes,
      [
        { principleId: '1-1', principleName: '첫 3초 훅', type: 'TYPE_HOOK', reason: '테스트 근거', usedFields: ['target'], citations: [] },
        { principleId: '1-4', principleName: '1인칭 고백', type: 'TYPE_HOOK', reason: '테스트 근거', usedFields: ['reviews'], citations: [{text: '바르고 자면 아침까지 촉촉해요', sourceField: 'reviews'}] }
      ],
      [
        { id: '1-1', name: '첫 3초 훅', type: 'TYPE_HOOK', description: '테스트', example: '' },
        { id: '1-4', name: '1인칭 고백', type: 'TYPE_HOOK', description: '테스트', example: '' }
      ]
    );
    console.log('✅ PDF 생성 및 다운로드 성공!');
    console.log('📄 다운로드된 PDF 파일을 열어 한글이 정상 출력되는지 확인하세요.');
  } catch (e) {
    console.error('❌ PDF 생성 실패:', e.message);
  }
  
  console.log('=== 검증 완료 ===');
})();
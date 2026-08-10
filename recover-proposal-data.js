/**
 * recover-proposal-data.js
 * render-ready.json만 있는 캠페인에서 proposal-data.json 복원 생성
 * (strategy는 render-ready의 script에서 추정)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { cwd } from 'node:process';

const campaigns = [
  'real-식품-1786358541455',
  'real-뷰티-1786358267764',
  'real-전자기기-1786358766510',
];

for (const campaignId of campaigns) {
  const rrPath = join(cwd(), 'content', 'campaigns', campaignId, 'shorts', 'render-ready.json');
  const outPath = join(cwd(), 'content', 'campaigns', campaignId, 'proposal-data.json');

  if (!existsSync(rrPath)) {
    console.log(`⚠️ ${campaignId}: render-ready.json 없음, 건너뜀`);
    continue;
  }

  const rr = JSON.parse(readFileSync(rrPath, 'utf-8'));
  const scenes = rr.script?.scenes || [];
  const brand = rr.coreSnapshot?.product?.brand || '';
  const product = rr.coreSnapshot?.product?.name || '';

  // strategy는 render-ready에서 추정 생성
  const overview = `쇼츠 광고 전략: ${brand} ${product} 대상 60초 세로형 숏폼 콘텐츠`;
  const targetAudience = rr.coreSnapshot?.target?.description || '일반 소비자';
  const keyMessage = scenes.find(s => s.type === 'solution')?.dialogue || '';
  const differentiation = rr.coreSnapshot?.product?.competitor ? `경쟁사 대비 차별화: ${rr.coreSnapshot.product.competitor.substring(0, 100)}` : '';

  const proposalData = {
    brandName: brand,
    productName: product,
    strategy: {
      overview,
      targetAudience,
      keyMessage,
      toneAndManner: rr.coreSnapshot?.message?.tone || '진지',
      differentiation,
      competitorAnalysis: rr.coreSnapshot?.product?.competitor || '',
    },
    script: {
      duration: rr.script?.duration || 60,
      totalScenes: rr.script?.totalScenes || scenes.length,
      scenes: scenes,
    },
    rationale: rr.coreSnapshot?.rationale?.principles?.map((pid, i) => ({
      principleId: pid,
      principleName: `마케팅 원칙 ${pid}`,
      type: 'TYPE_GENERAL',
      reason: `strategy principle ${pid}`,
      usedFields: [],
      citations: [],
    })) || [],
    createdFrom: 'recovered from render-ready.json',
    campaignId,
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(join(cwd(), 'content', 'campaigns', campaignId), { recursive: true });
  writeFileSync(outPath, JSON.stringify(proposalData, null, 2), 'utf8');
  console.log(`✅ ${campaignId}: proposal-data.json 생성 (${outPath})`);
}

console.log('\n완료.');

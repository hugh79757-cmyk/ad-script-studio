#!/usr/bin/env python3
"""
scripts/carousel/generate_carousel.py
proposal-data.json → 카드캐러셀 이미지 세트 (4:5, 인스타그램 캐러셀용)

출력: output/carousel/<campaign-id>/slide-01.png ~ slide-0N.png

슬라이드 구성:
  1. 표지: 브랜드명 + 제품명 + "광고 전략 제안서"
  2. 전략 개요
  3. 타겟 분석
  4. 핵심 메시지
  5. 차별화 포인트
  6. 적용된 마케팅 원칙
  7. 대본 미리보기
  8. CTA
"""

import sys
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# 폰트 감지
# ---------------------------------------------------------------------------

def detect_font():
    candidates = [
        '/System/Library/Fonts/AppleSDGothicNeo.ttc',
        '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
        '/Library/Fonts/AppleGothic.ttf',
        '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
    ]
    for fp in candidates:
        if os.path.exists(fp):
            return fp
    return None

# ---------------------------------------------------------------------------
# 텍스트 줄바꿈
# ---------------------------------------------------------------------------

def wrap_text(draw, text, font, max_width):
    lines = []
    for paragraph in text.split('\n'):
        if not paragraph.strip():
            lines.append('')
            continue
        words = list(paragraph)
        current = ''
        for ch in words:
            test = current + ch
            bbox = draw.textbbox((0, 0), test, font=font)
            w = bbox[2] - bbox[0]
            if w > max_width and current:
                lines.append(current)
                current = ch
            else:
                current = test
        if current:
            lines.append(current)
    return lines

# ---------------------------------------------------------------------------
# 슬라이드 렌더링
# ---------------------------------------------------------------------------

def render_slide(slide_num, total, slide, font_path, out_path):
    W, H = 1080, 1350  # 4:5
    img = Image.new('RGB', (W, H), color=(20, 20, 30))
    draw = ImageDraw.Draw(img)

    font_title = ImageFont.truetype(font_path, 64)
    font_subtitle = ImageFont.truetype(font_path, 36)
    font_body = ImageFont.truetype(font_path, 32)
    font_page = ImageFont.truetype(font_path, 24)
    font_small = ImageFont.truetype(font_path, 22)

    title = slide.get('title', '')
    body = slide.get('body', '')
    slide_type = slide.get('type', 'content')
    accent_color = slide.get('accent', (37, 99, 235))

    if slide_type == 'cover':
        # 배경 그라데이션 (단색 + 강조색으로 대체)
        bg_color = (13, 27, 42)  # dark navy
        img.paste((bg_color[0], bg_color[1], bg_color[2]), (0, 0, W, H))

        # 제목
        draw.text((W//2, H*2//5), title, fill=(255, 255, 255), font=font_title, anchor='mm')
        # 부제목
        draw.text((W//2, H*3//5), slide.get('subtitle', ''), fill=(200, 200, 220), font=font_subtitle, anchor='mm')
        # 구분선
        draw.line([(W*0.2, H*0.62), (W*0.8, H*0.62)], fill=(100, 100, 140), width=2)
        # 페이지 번호
        draw.text((W//2, H-50), f'{slide_num} / {total}', fill=(150, 150, 170), font=font_page, anchor='mm')

    elif slide_type == 'cta':
        # CTA 배경
        img.paste((30, 58, 166), (0, 0, W, H))  # blue

        draw.text((W//2, H*3//8), title, fill=(255, 255, 255), font=font_title, anchor='mm')
        if body:
            draw.text((W//2, H*5//8), body, fill=(220, 230, 250), font=font_body, anchor='mm')
        draw.text((W//2, H-50), f'{slide_num} / {total}', fill=(180, 200, 230), font=font_page, anchor='mm')

    else:
        # 콘텐츠 슬라이드
        # 배경: 밝은 톤
        img.paste((248, 250, 252), (0, 0, W, H))

        # 제목
        draw.text((W//2, H*2//15), title, fill=(15, 23, 42), font=font_title, anchor='mm')

        # 구분선
        draw.line([(W*0.1, H*3//15), (W*0.9, H*3//15)], fill=(203, 213, 225), width=2)

        # 본문
        if body:
            body_lines = wrap_text(draw, body, font_body, W * 0.82)
            y_start = H * 4 // 15
            for i, line in enumerate(body_lines):
                draw.text((W//2, y_start + i * 48), line, fill=(71, 85, 105), font=font_body, anchor='mm')

        # 페이지 번호
        draw.text((W//2, H-45), f'{slide_num} / {total}', fill=(148, 163, 184), font=font_page, anchor='mm')

    img.save(out_path, 'PNG')
    return out_path

# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 2:
        print('사용법: python scripts/carousel/generate_carousel.py <proposal-data.json> [output_dir]')
        sys.exit(1)

    proposal_path = Path(sys.argv[1])
    output_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).parent.parent.parent / 'output' / 'carousel'

    if not proposal_path.exists():
        print(f'❌ proposal-data.json 없음: {proposal_path}')
        sys.exit(1)

    font_path = detect_font()
    if not font_path:
        print('❌ 한글 폰트를 찾을 수 없습니다.')
        sys.exit(1)

    print(f'📱 캐러셀 생성 시작: {proposal_path}')
    print(f'   폰트: {font_path}')

    with open(proposal_path, 'r', encoding='utf-8') as f:
        proposal = json.load(f)

    campaign_id = proposal.get('campaignId', 'carousel')
    brand = proposal.get('brandName', '브랜드')
    product = proposal.get('productName', '제품')
    strategy = proposal.get('strategy', {})
    script = proposal.get('script', {})
    rationale = proposal.get('rationale', [])

    slides = []

    # 1. 표지
    slides.append({
        'title': f'{brand} {product}',
        'subtitle': '광고 전략 제안서',
        'type': 'cover',
    })

    # 2. 전략 개요
    overview = strategy.get('overview', '')
    if overview:
        slides.append({
            'title': '전략 개요',
            'body': overview,
            'type': 'content',
        })

    # 3. 타겟 분석
    target = strategy.get('targetAudience', '')
    if target:
        slides.append({
            'title': '타겟 분석',
            'body': target,
            'type': 'content',
        })

    # 4. 핵심 메시지
    key_msg = strategy.get('keyMessage', '')
    if key_msg:
        slides.append({
            'title': '핵심 메시지',
            'body': key_msg,
            'type': 'content',
        })

    # 5. 차별화 포인트
    diff = strategy.get('differentiation', '')
    if diff:
        slides.append({
            'title': '차별화 포인트',
            'body': diff,
            'type': 'content',
        })

    # 6. 적용된 원칙 (상위 4개)
    top_principles = rationale[:4]
    if top_principles:
        body_lines = []
        for i, r in enumerate(top_principles, 1):
            name = r.get('principleName', r.get('principleId', ''))
            reason = (r.get('reason') or '')[:120]
            body_lines.append(f'{i}. {name}\n{reason}')
        slides.append({
            'title': f'적용된 마케팅 원칙 ({len(top_principles)}개)',
            'body': '\n\n'.join(body_lines),
            'type': 'content',
        })

    # 7. 대본 미리보기 (hook + solution + cta)
    scenes = script.get('scenes', [])
    preview_types = ['hook', 'solution', 'cta']
    preview = []
    for pt in preview_types:
        found = next((s for s in scenes if s.get('type') == pt), None)
        if found:
            preview.append(f"[{pt.upper()}] {found.get('dialogue', '')}")
    if preview:
        slides.append({
            'title': '대본 미리보기',
            'body': '\n\n'.join(preview),
            'type': 'content',
        })

    # 8. CTA
    slides.append({
        'title': '지금 바로 시작하세요',
        'body': f'👉 {brand} {product} 자세히 보기',
        'type': 'cta',
    })

    # 렌더링
    out_dir = output_dir / campaign_id
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f'   슬라이드 {len(slides)}장 렌더링...')
    for i, slide in enumerate(slides, 1):
        out_path = out_dir / f'slide-{i:02d}.png'
        render_slide(i, len(slides), slide, font_path, str(out_path))
        print(f'   ✅ slide {i:02d}: {slide["title"][:30]}')

    print(f'\n✅ 캐러셀 생성 완료: {len(slides)}장 → {out_dir}')

if __name__ == '__main__':
    main()

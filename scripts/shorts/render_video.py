#!/usr/bin/env python3
"""
scripts/shorts/render_video.py
render-ready.json → 세로형(9:16) MP4 쇼츠 렌더링

동작:
1. render-ready.json 로드 (scenes, images, audio)
2. 각 장면별: 이미지 + TTS 오디오 + 자막(캡션) 합성
3. 전체 씬 연결 → output/shorts/<campaign-id>.mp4

환경:
- ffmpeg (PATH에 있어야 함)
- moviepy 2.x
- Pillow
- 한글 폰트 (Apple SD Gothic Neo / 시스템 폰트 자동 감지)

사용법:
    python scripts/shorts/render_video.py <render-ready.json 경로> [출력 디렉토리]
    예: python scripts/shorts/render_video.py content/campaigns/real-전자기기-xxx/shorts/render-ready.json
"""

import sys
import os
import json
import subprocess
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# 의존성 확인
# ---------------------------------------------------------------------------

def check_deps():
    errors = []
    # ffmpeg
    if not shutil.which('ffmpeg'):
        errors.append('ffmpeg가 PATH에 없습니다. 설치 필요.')
    # moviepy
    try:
        import moviepy
    except ImportError:
        errors.append('moviepy가 설치되지 않았습니다. `pip install moviepy` 실행.')
    # PIL
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        errors.append('Pillow가 설치되지 않았습니다. `pip install Pillow` 실행.')
    if errors:
        print('❌ 의존성 오류:', ' / '.join(errors))
        sys.exit(1)
    return True

# ---------------------------------------------------------------------------
# 폰트 자동 감지
# ---------------------------------------------------------------------------

def detect_korean_font():
    """한글 지원 폰트를 자동 감지. 없으면 None."""
    candidates = [
        '/System/Library/Fonts/AppleSDGothicNeo.ttc',
        '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
        '/Library/Fonts/AppleGothic.ttf',
        '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
        '/usr/share/fonts/NanumGothic.ttf',
    ]
    # Movielayer 2.x TextClip은 font에 .ttc/.ttf 경로 전달
    for fp in candidates:
        if os.path.exists(fp):
            return fp
    # fc-list로 탐색
    try:
        import subprocess
        result = subprocess.run(['fc-list', ':lang=ko', '--format=%{file}\n'],
                                capture_output=True, text=True, timeout=5)
        lines = result.stdout.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line and (line.endswith('.ttf') or line.endswith('.ttc')):
                return line.split(':')[0] if ':' in line else line
    except Exception:
        pass
    return None

# ---------------------------------------------------------------------------
# 이미지 → 9:16 크롭 (중심 기준)
# ---------------------------------------------------------------------------

def crop_to_9x16(img_path, output_path, target_size=(1080, 1920)):
    """
    정사각형 또는 임의 비율 이미지를 9:16(세로)으로 중앙 크롭 후 리사이즈.
    """
    from PIL import Image
    img = Image.open(img_path).convert('RGB')
    w, h = img.size
    target_w, target_h = target_size
    target_ratio = target_w / target_h  # 9:16 = 0.5625

    current_ratio = w / h
    if current_ratio > target_ratio:
        # 이미지 더 넓음 → 세로 기준으로 너비 자르기
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    else:
        # 이미지 더 높음 → 가로 기준으로 높이 자르기
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))

    img = img.resize(target_size, Image.LANCZOS)
    img.save(output_path, 'JPEG', quality=92)
    return output_path

# ---------------------------------------------------------------------------
# 자막 이미지 생성 (PIL)
# ---------------------------------------------------------------------------

def create_caption_image(text, font_path, font_size=52, canvas_size=(1080, 1920),
                         bg_color=(0, 0, 0, 160), text_color=(255, 255, 255),
                         max_width_ratio=0.85, position='bottom'):
    """
    한글 자막 이미지 생성. 텍스트가 길면 자동 줄바꿈.
    Returns: PIL Image (RGBA, canvas_size)
    """
    from PIL import Image, ImageDraw, ImageFont

    canvas = Image.new('RGBA', canvas_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    try:
        font = ImageFont.truetype(font_path, font_size)
    except Exception:
        font = ImageFont.load_default()

    # 텍스트 줄바꿈
    lines = wrap_text(text, font, int(canvas_size[0] * max_width_ratio))

    # 텍스트 블록 높이 계산
    line_height = font_size + 12
    total_height = len(lines) * line_height

    # 위치: bottom (아래에서 올려서 배치)
    if position == 'bottom':
        y = canvas_size[1] - total_height - 60
    elif position == 'top':
        y = 60
    else:
        y = (canvas_size[1] - total_height) // 2

    # 배경을 텍스트 영역에 맞게 확장 (패딩 추가)
    pad_x = 30
    pad_y = 16
    text_block_width = int(canvas_size[0] * max_width_ratio)
    bg_x1 = (canvas_size[0] - text_block_width) // 2 - pad_x
    bg_x2 = bg_x1 + text_block_width + pad_x * 2
    bg_y1 = max(0, y - pad_y)
    bg_y2 = min(canvas_size[1], y + total_height + pad_y)
    draw.rounded_rectangle([bg_x1, bg_y1, bg_x2, bg_y2], radius=16, fill=bg_color)

    # 텍스트 그리기
    x = (canvas_size[0] - text_block_width) // 2
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        text_x = (canvas_size[0] - text_w) // 2
        draw.text((text_x, y + i * line_height), line, font=font, fill=text_color)

    return canvas

def wrap_text(text, font, max_width):
    """한글 텍스트 최대 너비 기준으로 줄바꿈."""
    from PIL import ImageDraw
    words = list(text)
    lines = []
    current_line = ''
    dummy = Image.new('RGB', (1, 1))
    draw = ImageDraw.Draw(dummy)

    for ch in words:
        test_line = current_line + ch
        bbox = draw.textbbox((0, 0), test_line, font=font)
        w = bbox[2] - bbox[0]
        if w > max_width and current_line:
            lines.append(current_line)
            current_line = ch
        else:
            current_line = test_line
    if current_line:
        lines.append(current_line)
    return lines

# ---------------------------------------------------------------------------
# 메인 렌더러
# ---------------------------------------------------------------------------

def render_shorts(render_ready_path, output_dir=None):
    """
    render-ready.json 경로를 받아 MP4 렌더링.
    output_dir이 없으면 render-ready와 같은 디렉토리의 ../../output/shorts/
    """
    check_deps()
    from moviepy import (
        ImageClip, AudioFileClip, TextClip, CompositeVideoClip,
        concatenate_videoclips, ColorClip
    )
    from PIL import Image

    # 경로 해석
    rr_path = Path(render_ready_path).resolve()
    if not rr_path.exists():
        print(f'❌ render-ready.json 없음: {rr_path}')
        sys.exit(1)

    # render-ready.json 경로: .../campaigns/<campaign-id>/shorts/render-ready.json
    # campaign-id는 shorts의 부모의 부모 디렉토리명
    shorts_dir = rr_path.parent
    campaign_dir = shorts_dir.parent
    campaign_id = campaign_dir.name

    # output_dir 결정
    if output_dir is None:
        output_dir = campaign_dir / 'output' / 'shorts'
    else:
        output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    mp4_path = output_dir / f'{campaign_id}.mp4'

    print(f'📹 렌더링 시작: {rr_path}')
    print(f'   출력: {mp4_path}')

    # render-ready 로드
    with open(rr_path, 'r', encoding='utf-8') as f:
        rr = json.load(f)

    scenes = rr.get('script', {}).get('scenes', [])
    images = rr.get('images', [])
    audio_list = rr.get('audio', [])

    if not scenes:
        print('❌ scenes 없음')
        sys.exit(1)

    # 폰트 감지
    font_path = detect_korean_font()
    if not font_path:
        print('⚠️ 한글 폰트를 자동 감지하지 못했습니다. 자막이 깨질 수 있습니다.')
        font_path = None
    else:
        print(f'   폰트: {font_path}')

    # 씬별 클립 생성
    clip_list = []
    total_duration = 0

    for i, scene in enumerate(scenes):
        scene_idx = scene.get('sceneIndex', i)
        dialogue = scene.get('dialogue', '')
        time_label = scene.get('time', '')
        scene_type = scene.get('type', '')

        print(f'   장면 {i+1}/{len(scenes)} ({scene_type}) 처리 중...', end=' ')

        # 이미지 찾기
        img_record = next((img for img in images if img.get('sceneIndex') == scene_idx), None)
        img_path = img_record.get('localPath') if img_record else None

        # 오디오 찾기
        audio_record = next((a for a in audio_list if a.get('sceneIndex') == scene_idx), None)
        audio_path = audio_record.get('localPath') if audio_record and audio_record.get('status') == 'done' else None

        # 이미지 처리
        if img_path and os.path.exists(img_path):
            temp_img = rr_path.parent / f'temp_scene_{i}.jpg'
            crop_to_9x16(img_path, str(temp_img))
            base_image = Image.open(str(temp_img))
        else:
            # 이미지 없으면 배경색
            base_image = Image.new('RGB', (1080, 1920), color=(20, 20, 30))

        # 자막 이미지 생성
        if dialogue:
            caption_img = create_caption_image(
                dialogue,
                font_path=font_path,
                font_size=48,
                canvas_size=(1080, 1920),
                bg_color=(0, 0, 0, 170),
                text_color=(255, 255, 255),
                position='bottom'
            )
        else:
            caption_img = None

        # 오디오 길이 결정
        if audio_path and os.path.exists(audio_path):
            try:
                result = subprocess.run(
                    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                     '-of', 'default=noprint_wrappers=1:nokey=1', str(audio_path)],
                    capture_output=True, text=True, timeout=10
                )
                audio_duration = float(result.stdout.strip())
            except Exception:
                audio_duration = 4.0
        else:
            # 오디오 없으면 대사 길이로 추정 (한글 기준 초당 약 5~6자)
            audio_duration = max(2.0, len(dialogue) / 5.5)

        # 전체 클립 지속시간: 오디오가 있으면 오디오 길이, 없으면 추정
        clip_duration = audio_duration

        # moviepy 클립 생성
        # 1. 배경 이미지 클립
        img_clip = ImageClip(np.array(base_image), duration=clip_duration)
        img_clip = img_clip.with_position('center')

        # 2. 자막 클립 (별도 레이어)
        caption_clips = []
        if caption_img:
            cap_clip = ImageClip(np.array(caption_img), duration=clip_duration)
            cap_clip = cap_clip.with_position('center')
            caption_clips.append(cap_clip)

        # 3. 합성
        all_clips = [img_clip] + caption_clips
        scene_clip = CompositeVideoClip(all_clips, size=(1080, 1920))

        # 4. 오디오 설정
        if audio_path and os.path.exists(audio_path):
            try:
                audio_clip = AudioFileClip(str(audio_path))
                # 오디오가 클립보다 길면 자르고, 짧으면 반복 없이 그대로
                if audio_clip.duration > clip_duration:
                    audio_clip = audio_clip.with_duration(clip_duration)
                scene_clip = scene_clip.with_audio(audio_clip)
            except Exception as e:
                print(f'오디오 로드 오류 (무시): {e}')

        clip_list.append(scene_clip)
        total_duration += clip_duration

        # 임시 파일 정리
        if temp_img and temp_img.exists():
            temp_img.unlink()

        print(f'완료 ({clip_duration:.1f}초)')

    # 전체 연결
    print(f'\n🎞️ 씬 연결 중... (총 {total_duration:.1f}초)')
    final_clip = concatenate_videoclips(clip_list, method='compose')

    # 렌더링
    print(f'💾 MP4 렌더링 중... ({mp4_path})')
    final_clip.write_videofile(
        str(mp4_path),
        fps=30,
        codec='libx264',
        audio_codec='aac',
        bitrate='5000k',
        preset='medium',
        threads=4,
        logger='bar'
    )

    # 리소스 정리
    for clip in clip_list:
        clip.close()
    final_clip.close()

    # 결과 확인
    if mp4_path.exists():
        size_mb = mp4_path.stat().st_size / (1024 * 1024)
        print(f'\n✅ 렌더링 완료: {mp4_path}')
        print(f'   파일 크기: {size_mb:.1f} MB')
        # ffprobe로 검증
        try:
            result = subprocess.run(
                ['ffprobe', '-v', 'error', '-show_entries',
                 'format=duration:stream=width,height,codec_name',
                 '-of', 'json', str(mp4_path)],
                capture_output=True, text=True, timeout=10
            )
            import json as j
            info = j.loads(result.stdout)
            fmt = info.get('format', {})
            streams = info.get('streams', [])
            video_stream = next((s for s in streams if s.get('codec_type') == 'video'), {})
            print(f'   재생 시간: {float(fmt.get("duration", 0)):.1f}초')
            print(f'   해상도: {video_stream.get("width", "?")}x{video_stream.get("height", "?")}')
            print(f'   비디오 코덱: {video_stream.get("codec_name", "?")}')
            print(f'   오디오 코덱: {next((s.get("codec_name") for s in streams if s.get("codec_type") == "audio"), "none")}')
        except Exception as e:
            print(f'   ⚠️ ffprobe 검증 실패: {e}')
    else:
        print(f'\n❌ MP4 생성 실패: {mp4_path}')

    return mp4_path

# ---------------------------------------------------------------------------
# 진입점
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    import numpy as np  # moviepy 내부에서 필요하지만 명시적 import

    if len(sys.argv) < 2:
        print('사용법: python scripts/shorts/render_video.py <render-ready.json> [output_dir]')
        print('예: python scripts/shorts/render_video.py content/campaigns/real-전자기기-xxx/shorts/render-ready.json')
        sys.exit(1)

    render_ready = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    # numpy는 moviepy 내부에서 필요
    try:
        import numpy as np
    except ImportError:
        print('❌ numpy가 필요합니다. `pip install numpy` 실행.')
        sys.exit(1)

    render_shorts(render_ready, output_dir)

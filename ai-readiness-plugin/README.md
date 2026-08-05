# AI Readiness Cartography 플러그인

저장소가 코딩 에이전트(Claude Code 등)에게 얼마나 친화적인지를 **AI-Ready v2 루브릭**(100점 · 7개 카테고리 A–G)으로 채점하고, 단일 파일 HTML 대시보드와 ROI 순으로 정렬된 액션 리스트를 만들어 줍니다.

## 담긴 것

| 경로 | 내용 |
|---|---|
| `skills/ai-readiness-cartography-en/SKILL.md` | 스킬 본문 (워크플로 · 채점 절차 · 대시보드 작성 규칙) |
| `skills/ai-readiness-cartography-en/scripts/score.py` | 자동 채점기 (Python 3.10+, 표준 라이브러리만 사용) |
| `skills/ai-readiness-cartography-en/assets/template.html` | 대시보드 HTML 템플릿 |
| `skills/ai-readiness-cartography-en/references/scoring-rubric.md` | 7개 카테고리 채점 기준 v2 |
| `skills/ai-readiness-cartography-en/EXPLAINER.html` | 루브릭 설명 문서 (사람용) |

## 팀에서 설치하기

```
/plugin marketplace add behavelikeaman/mini-project
/plugin install ai-readiness-plugin@behavelikeaman-plugins
```

이미 마켓플레이스를 추가해 둔 팀원은 `/plugin marketplace update behavelikeaman-plugins` 후 설치하면 됩니다.

프로젝트 단위로 팀 전체에 켜 두려면 저장소의 `.claude/settings.json`에 아래를 커밋하세요:

```json
{
  "extraKnownMarketplaces": {
    "behavelikeaman-plugins": {
      "source": { "source": "github", "repo": "behavelikeaman/mini-project" }
    }
  },
  "enabledPlugins": { "ai-readiness-plugin@behavelikeaman-plugins": true }
}
```

## 쓰는 법

세션에서 `/ai-readiness-cartography-en` 을 호출하거나, "이 저장소 AI-readiness 점수 매겨줘" / "repo cartography" 같은 표현으로 말하면 스킬이 트리거됩니다.

산출물은 세 가지입니다:

1. `ai-readiness-score.json` — 원본 스코어카드
2. `ai-readiness-map.html` — 단일 파일 대시보드
3. ROI 순 액션 리스트

저장 위치는 `docs/` → `.claude/` → 저장소 루트 순으로 정해지며, 사용자가 경로를 지정하면 그 경로가 우선합니다.

## 스크립트 직접 실행

```bash
python3 "$CLAUDE_PLUGIN_ROOT/skills/ai-readiness-cartography-en/scripts/score.py" <repo-path> \
  --json <output>/ai-readiness-score.json
```

Windows에서는 `python3` 이 Microsoft Store 스텁이라 실패하고, 콘솔 기본 인코딩(cp949)이 출력의 `—` · `·` 문자를 찍지 못해 `UnicodeEncodeError` 가 납니다. 다음을 쓰세요:

```bash
PYTHONIOENCODING=utf-8 python "$CLAUDE_PLUGIN_ROOT/skills/ai-readiness-cartography-en/scripts/score.py" <repo-path> \
  --json <output>/ai-readiness-score.json
```

# AI Readiness Cartography 플러그인

저장소가 코딩 에이전트(Claude Code 등)에게 얼마나 친화적인지를 **AI-Ready v2 루브릭**(100점 · 7개 카테고리 A–G)으로 채점하고, 단일 파일 HTML 대시보드와 ROI 순으로 정렬된 액션 리스트를 만들어 줍니다. 여기에 더해, 테스트 없는 구현 코드 작성을 차단하는 **TDD 가드 훅**이 함께 들어 있습니다.

> ⚠️ **설치하면 TDD 가드가 곧바로 켜집니다.** 이 플러그인을 활성화한 세션에서는 대응하는 테스트 파일이 없는 `.ts/.tsx/.js/.jsx` 구현 파일에 대한 Edit/Write가 **거부**됩니다. 채점 스킬만 쓰고 싶다면 아래 [TDD 가드 끄기](#tdd-가드-끄기)를 참고하세요.

## 담긴 것

| 경로 | 내용 |
|---|---|
| `skills/ai-readiness-cartography-en/SKILL.md` | 스킬 본문 (워크플로 · 채점 절차 · 대시보드 작성 규칙) |
| `skills/ai-readiness-cartography-en/scripts/score.py` | 자동 채점기 (Python 3.10+, 표준 라이브러리만 사용) |
| `skills/ai-readiness-cartography-en/assets/template.html` | 대시보드 HTML 템플릿 |
| `skills/ai-readiness-cartography-en/references/scoring-rubric.md` | 7개 카테고리 채점 기준 v2 |
| `skills/ai-readiness-cartography-en/EXPLAINER.html` | 루브릭 설명 문서 (사람용) |
| `hooks/hooks.json` | TDD 가드 훅 등록 (`PreToolUse[Edit\|Write]`) |
| `hooks/tdd-guard.sh` | TDD 가드 본체 |

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

## TDD 가드 훅

`PreToolUse[Edit|Write]` 로 걸려 있어, 구현 코드를 쓰려 할 때 대응하는 테스트 파일이 없으면 도구 호출 자체를 거부합니다. 테스트를 먼저 쓰는 red → green 순서가 강제됩니다.

차단 예:

```
TDD GUARD: 'coupon'에 대한 테스트 파일이 존재하지 않습니다.
구현 코드를 작성하기 전에 테스트를 먼저 작성하세요. (테스트 파일 예: coupon.test.ts)
```

### 면제 대상

| 대상 | 예 |
|---|---|
| 테스트 파일 자체 | `*.test.*`, `*.spec.*`, `__tests__/` |
| 설정 · 문서 · 스타일 | `*.json`, `*.md`, `*.css`, `*.yml`, `*.config.*`, `tsconfig*` |
| 타입 정의 | `types/` 폴더, `types.ts`, `types.d.ts` |
| Next.js 프레임워크 파일 | `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `globals.css` |
| 프레젠테이션 레이어 | `components/` 폴더 |

즉 비즈니스 로직이 모이는 `lib/`, `utils/` 같은 곳에만 TDD가 강제됩니다.

### 테스트 파일 탐색 경로

`src/lib/cart.ts` 를 쓰려 하면 아래 순서로 찾고, 하나라도 있으면 통과합니다.

1. `src/lib/cart.test.ts` · `cart.spec.ts` (같은 폴더, `.ts/.tsx/.js/.jsx`)
2. `src/lib/__tests__/cart.test.ts` · `src/__tests__/cart.test.ts`
3. `<프로젝트 루트>/src/__tests__/cart.test.ts`

### 요구 사항

`bash` 와 `node` 가 필요합니다. 원본 훅은 JSON 파싱에 `jq` 를 쓰지만, 여기서는 `jq` 가 없는 환경에서도 돌아가도록 `node` 로 대체했습니다.

### TDD 가드 끄기

플러그인 훅은 프로젝트 `.claude/settings.json` 의 훅과 **합쳐져서 함께 실행**됩니다. 프로젝트 쪽에 아무것도 안 하는 훅을 넣어도 플러그인 훅은 그대로 돌기 때문에, 무력화할 수 없습니다.

채점 스킬만 쓰고 TDD 강제는 원하지 않는다면 `/plugin` 에서 이 플러그인을 비활성화하세요. 반대로 팀 전체에 켜 두려면 `enabledPlugins` 에 등록하면 됩니다 (위 [팀에서 설치하기](#팀에서-설치하기) 참고).

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

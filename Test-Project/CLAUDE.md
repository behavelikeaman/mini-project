# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 이 프로젝트의 성격

웹 개발 학습용 프로젝트다. 결과물(랜덤 식단 룰렛)보다 **사용자가 배우는 것이 목적**이다.

- 사용자는 HTML/CSS/JS가 거의 처음이다. 코드와 설명에 **한국어 주석**을 붙인다.
- 기능 요청이 와도 곧바로 전부 구현할지는 확인한다. 직접 작성하겠다고 할 때가 있고,
  대신 작성해달라고 할 때가 있다 — 어느 쪽인지 가정하지 말고 물어본다.
- 질문은 줄글 나열 대신 AskUserQuestion 선택지 UI로 한다.

## 실행 / 빌드 / 테스트

**빌드 시스템이 없다.** `package.json`, 번들러, 테스트 러너, 린터 모두 없고 의존성도 0이다.

```
실행:  index.html 을 브라우저에서 연다 (더블클릭). 저장 후 F5 로 반영.
```

## git

**저장소 루트는 이 폴더가 아니라 상위 폴더 `C:\Claude\Projects` 다.** 원격 저장소 이름이 복수형
`projects`(여러 프로젝트를 담는 용도)라 `Test-Project/`가 그 하위 폴더로 올라가기 때문이다.
git은 "로컬 루트 → 원격 하위 폴더" 매핑을 지원하지 않아 상위 폴더를 저장소로 만들었다.

| 항목 | 값 |
|---|---|
| 원격 | https://github.com/behavelikeaman/projects (public) |
| 브랜치 | `main` |
| 명령 | `git -C C:\Claude\Projects ...` (하위 폴더에서 그냥 쳐도 상위 `.git`을 찾는다) |
| 제외 | 옆의 `harness-project/`, `stock/`은 `.gitignore`로 빠져 있다 |

`.gitattributes`가 `*.sh`를 LF로 고정한다. CRLF가 되면 아래 프리커밋 훅을 bash가 실행하지 못하므로
이 설정을 지우지 말 것.

`push`는 인증 때문에 **백그라운드로 실행해야 한다**(포그라운드는 `Cannot prompt because user
interactivity has been disabled`로 실패). 백그라운드에서는 자격증명 관리자가 예외 메시지를 뱉고도
결국 성공하므로, 중간 출력의 에러만 보고 실패로 판단하지 말고 exit code와 `git ls-remote`로 확인할 것.

린트/빌드/테스트 명령을 만들어내지 말 것. 필요해지면 `package.json`을 먼저 추가해야 하고,
그러면 아래 프리커밋 훅이 자동으로 그 스크립트들을 잡아 실행한다.

## 아키텍처 — `index.html` (458줄, 단일 파일)

`<style>` + HTML 본문 + `<script>` 가 한 파일에 들어 있다. 섹션은 스크립트 안 주석 번호로 구분된다.

### 상태 → 렌더 패턴
전역 상태는 `menus`(배열), `history`(배열), `currentRotation`(누적 각도), `isSpinning`(잠금)뿐이다.
**상태를 바꾼 뒤에는 반드시 `render()`를 호출한다.** `render()`가 `renderWheel()` / `renderChips()` /
`renderHistory()`를 모두 다시 그린다. 부분 갱신 코드를 추가하지 말고 이 패턴을 유지할 것.

### 각도 계산 — 세 곳이 서로 맞물려 있다 (가장 중요)

원판은 Canvas가 아니라 **CSS `conic-gradient`** 로 그린다. 다음 세 가지가 같은 좌표계(12시 기준, 시계방향)를
공유하며, 하나만 바꿔도 "멈춘 위치"와 "표시된 결과"가 어긋난다:

| 위치 | 코드 | 의미 |
|---|---|---|
| `renderWheel()` | 조각 i = `i*seg` ~ `(i+1)*seg` | 색 조각의 범위 |
| `renderWheel()` | 라벨 i = `rotate((i+0.5)*seg)` | 글자를 조각 중앙에 |
| `spin()` | `base + 360*5 + (360 - (i+0.5)*seg)` | 조각 i를 12시로 끌어옴 |

`seg = 360 / menus.length`. 바늘(`.pointer`)은 12시에 **고정**이고 원판만 돈다.

`spin()`의 순서가 직관과 반대다: **당첨자를 먼저 뽑고(`Math.random`) → 그 조각이 바늘에 오도록 각도를
역산해서 → 그 각도로 돌린다.** 돌린 뒤 결과를 읽는 구조가 아니다.

`base = Math.floor(currentRotation/360)*360`는 지금까지 돈 바퀴 수를 360 배수로 잘라낸 값이다.
이걸 빼먹으면 원판이 뒤로 돌거나 결과가 어긋난다. `currentRotation`은 계속 누적된다.

### 회전 중 상태 변경 금지
회전은 CSS `transition`(4초)이 처리하고 `transitionend`에서 결과를 확정한다. 이 4초 사이에
`menus` 길이가 바뀌면 인덱스가 밀려 결과가 어긋나므로, `addMenu()` / `removeMenu()` / `spin()`이
모두 `isSpinning`으로 잠긴다. 메뉴를 건드리는 코드를 추가하면 이 가드를 같이 넣을 것.

### 그 외 주의점
- `renderWheel()`은 `wheelEl.innerHTML`(라벨)과 `style.background`만 건드린다.
  **`style.transform`은 절대 건드리지 말 것** — 누적 회전이 초기화된다.
- 삭제 버튼은 매 렌더마다 새로 만들어지므로 개별 리스너 대신 `chipsEl`에 **이벤트 위임**을 걸었다.
- 사용자 입력은 `escapeHtml()`을 거쳐 `innerHTML`에 들어간다. 이 경로를 우회하지 말 것.
- localStorage 키: `roulette.menus`, `roulette.history`. `save()`가 둘 다 함께 쓴다.
- 메뉴 2개 미만이면 `spinBtn`이 비활성화된다.

## `.claude/` 도구 구성

| 경로 | 역할 |
|---|---|
| `skills/my-review/SKILL.md` | `/my-review` — 정확성→보안→리소스→유지보수성 순 코드 리뷰. 구체적 실패 시나리오를 못 쓰면 보고하지 않는 규칙 |
| `agents/code-reviewer.md` | 리뷰 전용 서브에이전트. `my-review` 스킬을 호출한다. 편집 도구가 없어 수정이 구조적으로 불가능 |
| `hooks/pre-commit-check.sh` | `git commit` 직전 lint→build→test 실행. 실패 시 exit 2로 커밋 차단 |
| `settings.json` | 위 훅을 `PreToolUse` + `Bash` 매처로 등록 |

훅 동작: `git commit` 문자열이 없으면 bash 내장 기능만으로 즉시 통과한다(오버헤드 없음).
이 환경에 `jq`가 없어 JSON 파싱은 `node`로 한다 — jq를 쓰는 코드를 추가하지 말 것.
`package.json`이 없거나 해당 스크립트가 없으면 커밋을 막지 않고 건너뛴다.

훅을 새로 추가·수정하면 설정 감시자가 바로 못 읽을 수 있다. 그럴 땐 사용자가 `/hooks`를 한 번 열거나
재시작해야 활성화된다 (Claude가 대신 할 수 없음).

## 검증 방법

브라우저에서 `index.html`을 열고 확인한다. 특히 2번이 이 코드에서 가장 깨지기 쉬운 지점이다.

1. START를 누르면 원판이 4초간 돌다 멈춘다
2. **멈춘 위치의 조각 이름 = 화면에 표시된 결과** (5회 반복)
3. 메뉴를 추가/삭제하면 조각 수와 각도가 다시 나뉜다
4. 메뉴가 2개일 때도, 12개일 때도 동작한다
5. 회전 중 START를 연타해도 깨지지 않는다
6. 새로고침해도 추가한 메뉴와 기록이 남는다

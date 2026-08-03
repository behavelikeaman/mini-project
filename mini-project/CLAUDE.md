# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 제공되는 가이드입니다.

## 이 프로젝트는 무엇인가

단일 페이지 프로토타입입니다: 카카오톡 대화 내보내기(`.txt`)를 업로드하면, 클라이언트 측에서 파싱한 뒤 Claude API로 보내 요약 + 액션 아이템 형태로 화면에 렌더링합니다. 백엔드도, 데이터베이스도, 빌드 단계도 없습니다 — 순수 HTML/CSS/JS 정적 파일만으로 동작합니다.

## 실행 / 테스트

이 프로젝트에는 빌드·린트·테스트 도구가 전혀 없습니다(`package.json` 없음).

- **일반 사용**: `index.html`을 더블클릭해서 `file://`로 바로 엽니다. 모든 스크립트가 클래식(non-module) `<script>` 태그이므로 서버 없이도 동작합니다.
- **`file://`를 차단하는 브라우저 자동화 도구로 테스트할 때** (예: 파일 URL 권한이 없는 확장 프로그램): 이 앱은 서버 특화 동작이 없으므로 그냥 정적 서버로 띄우면 됩니다.
  ```
  python -m http.server 8000
  ```
  이후 `http://localhost:8000/index.html`로 접속.
- 브라우저 전체 흐름을 검증하는 자동화된 테스트 스위트는 없습니다. 변경 사항은 브라우저에서 직접 확인하세요: 실제 카카오톡 내보내기 파일을 업로드해 파싱된 메시지 수/날짜 범위를 확인하고, 네트워크 탭/콘솔에 에러가 없는지 확인합니다.
- **`js/parser.js` 회귀 테스트**: `node js/parser.test.js`로 실행합니다. 외부 프레임워크·의존성 없이 Node 내장 `assert/strict`만 사용하며, `js/parser.js`를 수정하지 않고 테스트 파일에서 `new Function`으로 로드합니다(같은 realm에서 평가되어야 `deepEqual` 비교가 정상 동작하므로 `vm.createContext`처럼 별도 realm을 만드는 방식은 피했습니다). 날짜/시간 파싱, 멀티라인 메시지, 오전·오후 경계값, 미디어 placeholder, 헤더 스킵, `limitMessages`/`serializeLog` 등 파서의 알려진 특이사항을 커버합니다. 파싱 정규식을 수정하면 이 테스트를 먼저 돌리고, 실제 내보내기 파일로도 재검증하세요.

## 에이전트 작업 환경 (`.claude/`)

`.claude/settings.json`에 **`PreToolUse[Edit|Write]` 훅**(`.claude/hooks/tdd-guard.sh`)이 걸려 있습니다. `.js` 파일을 수정하려 할 때 **같은 폴더에 `<파일명>.test.js`가 없으면 편집이 차단(deny)됩니다.**

| 대상 | 판정 | 이유 |
|---|---|---|
| `js/parser.js` | 허용 | 짝이 되는 `js/parser.test.js`가 있음 |
| `js/ui.js`, `js/main.js`, `js/storage.js`, `api/client.js` | **차단** | 테스트 파일 없음 |
| `index.html`, `css/style.css`, `*.md`, `*.json` | 허용 | 훅이 검사하지 않는 확장자 |

표를 갱신할 때는 실제로 편집해 보지 말고 훅에 직접 물어보세요 — 빈 출력이면 허용, `deny` JSON이 나오면 차단입니다: `echo '{"tool_input":{"file_path":"js/ui.js"}}' | bash .claude/hooks/tdd-guard.sh`

차단된 파일을 고쳐야 한다면 **테스트를 먼저 작성하세요.** 참고 패턴은 `js/parser.test.js`입니다(외부 의존성 없이 Node 내장 `assert/strict` + `new Function`으로 IIFE 로드). 훅을 우회하거나 비활성화하지 마세요 — 이 프로젝트가 TDD를 강제하려고 의도적으로 켜 둔 장치입니다.

훅 스크립트는 `bash`와 `node`를 PATH에서 찾습니다(원본의 `jq` 의존성을 `node`로 대체했음). `node`가 없으면 file_path를 읽지 못해 **검사 없이 통과**하므로(fail-open), 훅이 조용히 무력화된 상태를 정상으로 오해하지 마세요.

`settings.json`의 `permissions.allow`에는 chrome MCP 읽기 도구가 등록되어 있어 브라우저 확인 시 권한 프롬프트가 줄어듭니다.

## 아키텍처

`index.html`에서 클래식(non-module) `<script>` 태그로 로드되는 파일 5개, **반드시 이 순서대로** — 뒤에 오는 파일이 앞에서 설정한 전역 객체에 의존합니다:

```
js/storage.js   → window.KeyStorage   (Claude API 키의 localStorage 저장/조회)
js/parser.js    → window.KakaoParser  (카카오톡 .txt → 구조화된 메시지 배열)
api/client.js   → window.ClaudeApi    (Claude API 요청/응답 처리 — 상세는 api/CLAUDE.md 참고)
js/ui.js        → window.UI           (모든 DOM 참조 + render/show/hide 함수)
js/main.js      (IIFE, export 없음)     (위 네 모듈을 조합해 DOM 이벤트를 연결)
```

`main.js`를 제외한 각 파일은 IIFE로 감싸져 네임스페이스 객체 하나만 `window`에 할당합니다. 이는 ES 모듈을 의도적으로 대체한 방식입니다 — `import`/`export`는 페이지가 `http(s)://`로 서빙되어야만 동작하는데, 그러면 "index.html을 그냥 더블클릭해서 연다"는 사용 방식이 깨집니다. 새 모듈을 추가할 때도 같은 패턴(`window.Foo = (function () { ...; return {...}; })();`)을 따르고, `<script src="...">` 태그를 `index.html`에서 `main.js`보다 **앞에** 추가하세요.

Claude API 연동 코드만 `api/`라는 별도 최상위 폴더에 있고(나머지는 전부 `js/`), 그 폴더 전용 `CLAUDE.md`가 함께 있습니다 — 왜 따로 뺐는지는 `api/CLAUDE.md`를 참고하세요. `js/`와 `api/` 둘 다 같은 IIFE + `window` 네임스페이스 패턴을 따르므로, 어느 폴더에 있든 모듈을 다루는 방식은 동일합니다.

`main.js`는 앱의 유일한 가변 상태(`parsedMessages` — 마지막으로 성공한 파싱 결과 배열)를 보유하며, 두 개 이상의 모듈을 동시에 호출하는 유일한 곳입니다. `ui.js`는 `parser.js`나 `ClaudeApi`를 직접 호출하지 않고, 그 반대도 마찬가지입니다 — 모듈 간 조합은 전부 `main.js`를 거칩니다.

### 카카오톡 `.txt` 파싱 (`js/parser.js`)

`parseKakaoTalk(text)`는 카카오톡 표준 "대화 내보내기" 형식을 위한 줄 단위 파서입니다:

- 날짜 구분선: `--------------- 2026년 7월 6일 월요일 ---------------`
- 메시지 시작 줄: `[발신자] [오전|오후 h:mm] 메시지`
- 그 외의 모든 줄(빈 줄 포함)은 직전 메시지 텍스트의 연속으로 취급합니다 — 카카오톡 내보내기는 긴 메시지를 반복되는 접두사 없이 여러 원본 줄에 걸쳐 감쌉니다.

파싱 정규식을 수정한다면 반드시 실제 내보내기 파일로 재검증하세요 — 이 포맷에는 특이사항이 있습니다(미디어 placeholder인 "사진"/"이모티콘" 등은 일반 메시지 텍스트로 등장함; 첫 날짜 구분선 이전의 처음 2~3줄은 파일 메타데이터이므로 아직 메시지 컨텍스트가 없어 의도적으로 건너뜁니다).

`limitMessages(messages, maxChars)`는 직렬화된 로그가 크기 예산을 넘어설 경우 **가장 오래된** 쪽부터 잘라냅니다(최근 메시지를 유지). 절단은 절대 조용히 이루어지지 않습니다 — 호출부에서 반환된 배열이 입력보다 짧아졌는지 확인해 안내 문구를 띄워야 합니다(`main.js`의 `MAX_CHARS` 사용부 참고).

### Claude API 연동 (`api/client.js`)

`window.ClaudeApi.callClaude(apiKey, chatLog)` 하나만 노출하며, 브라우저에서 Claude API를 직접 호출하는 코드입니다. **상세 내용(브라우저 직접 호출 방식과 그 트레이드오프, 구조화된 응답 스키마, 에러 처리 규칙, 모델/파라미터 변경 시 주의사항)은 [`api/CLAUDE.md`](api/CLAUDE.md)를 참고하세요.** `api/` 폴더에서 작업할 때는 그 파일이 우선합니다.

한 가지만 여기서 강조: 응답 형태를 바꾸려면 `api/client.js`의 `RESPONSE_SCHEMA`와 `js/ui.js`의 `renderResult()`를 **함께** 수정해야 합니다 — 이 둘은 서로 다른 폴더에 있지만 반드시 동기화되어 있어야 합니다.

## 저장소 구조 관련 참고사항

- 이 폴더의 `.env.example` / `.gitignore`는 범용 스캐폴딩(환경변수 템플릿, 흔한 ignore 패턴)입니다 — 이 앱은 환경변수를 전혀 읽지 않고 서버 프로세스도 없습니다. 이 파일들이 있다고 해서 백엔드가 존재한다고 가정하지 마세요.
- 이 디렉터리는 더 큰 다중 프로젝트 git 저장소 안에 있습니다(`Test-Project/`, `vibecoding/` 같은 형제 디렉터리는 같은 git 히스토리를 공유할 뿐인 무관한 별개 앱입니다). `mini-project/`는 독립적으로 취급하세요 — 여기 있는 어떤 것도 형제 디렉터리에 의존하지 않습니다. 커밋할 때는 `git add -A`/`git commit -a`를 쓰지 말고 `git add mini-project/<파일>`처럼 경로를 명시하세요 — 저장소 루트가 상위 `Projects/`라서 미추적 형제 디렉터리가 함께 스테이징됩니다.

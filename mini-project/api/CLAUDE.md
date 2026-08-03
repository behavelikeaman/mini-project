# CLAUDE.md — api/

이 파일은 `mini-project/api/` 아래에서 작업할 때 참고할 가이드입니다. 상위 규칙은 루트 `CLAUDE.md`를 따르고, 여기서는 Claude API 연동에 특화된 내용만 다룹니다.

## 이 폴더가 하는 일

`api/client.js` 하나로 구성되며, `window.ClaudeApi`라는 이름으로 하나의 함수 `callClaude(apiKey, chatLog)`를 노출합니다. 다른 모듈(`js/*.js`)과 마찬가지로 ES 모듈이 아닌 IIFE + `window` 전역 네임스페이스 패턴을 씁니다 — 이유는 루트 `CLAUDE.md`의 "아키텍처" 절 참고.

## 브라우저 직접 호출 방식

`https://api.anthropic.com/v1/messages`를 브라우저에서 `anthropic-dangerous-direct-browser-access: true` 헤더와 함께 **직접** 호출합니다. 프록시/백엔드가 없습니다.

- API 키는 `main.js`가 `KeyStorage`(`localStorage`)에서 읽어 `callClaude()`에 그대로 넘깁니다. 브라우저 개발자도구 네트워크 요청에서 키가 그대로 보입니다 — 백엔드 없는 로컬 프로토타입을 위해 **의도적으로 감수한** 트레이드오프이며, 고쳐야 할 버그가 아닙니다. 요청받지 않는 한 프록시 서버를 추가하지 마세요.
- `anthropic-dangerous-direct-browser-access` 헤더가 없으면 브라우저 CORS 정책에 막혀 요청 자체가 실패합니다. 이 헤더를 제거하거나 이름을 바꾸면 안 됩니다.

## 구조화된 응답 (`output_config.format`)

요청 시 `output_config.format`을 `json_schema` 타입으로 지정해 응답을 다음 스키마로 강제합니다:

```
{ summary: string, action_items: [{ title, detail, assignee }] }
```

이 방식 덕분에 자유 텍스트를 파싱/스크래핑할 필요 없이 `JSON.parse(textBlock.text)`로 바로 객체를 얻습니다.

**스키마를 바꾸면 반드시 렌더링 쪽도 같이 바꿔야 합니다** — `RESPONSE_SCHEMA`(이 폴더 `api/client.js`)와 `renderResult()`(`js/ui.js`)는 한 쌍으로 유지되어야 합니다. 한쪽만 바꾸면 파싱은 성공하지만 화면에 새 필드가 표시되지 않거나, `renderResult()`가 없는 필드를 참조해 깨집니다.

## 에러 처리 규칙

`callClaude()`는 실패 시 사용자에게 보여줄 한국어 메시지를 담아 `throw`합니다 (호출부인 `main.js`가 `err.message`를 그대로 화면에 표시함):

- `401` → "API 키가 올바르지 않습니다. 키를 다시 확인해주세요."로 치환 (Anthropic이 반환하는 원문 대신 더 명확한 한국어 안내)
- `429` → rate limit 안내로 치환
- 그 외 4xx/5xx → 가능하면 응답 바디의 `error.message`를 그대로 사용, 파싱 실패 시 `HTTP {status}` 형태로 폴백
- `stop_reason === "refusal"` → Claude가 정책상 거부했다는 별도 메시지 (HTTP 상태는 200이므로 위의 상태코드 분기로는 잡히지 않음, 별도 체크 필요)
- `content` 배열에 `type: "text"` 블록이 없는 경우도 방어적으로 에러 처리

새 에러 케이스를 추가할 때도 이 패턴(사용자에게 바로 보여줄 수 있는 한국어 메시지를 담아 `Error`를 throw)을 유지하세요 — `main.js`는 별도 에러 분류 로직 없이 `err.message`를 그대로 렌더링합니다.

## 모델/파라미터 변경 시 참고

- 모델은 `claude-opus-5`로 고정되어 있습니다. 다른 모델로 바꾸려면 이 프로젝트의 스킬 정책(claude-api 스킬의 모델 기본값 규칙)을 다시 확인하세요 — 임의로 더 저렴한 모델로 낮추지 마세요.
- `max_tokens: 8000`은 Claude Opus 5가 기본적으로 thinking을 켠 상태로 동작하기 때문에(응답 JSON이 thinking + 실제 응답 토큰을 합쳐 이 한도 안에 들어와야 함) 여유를 둔 값입니다. 줄이면 큰 대화방에서 JSON이 잘려 `JSON.parse`가 실패할 수 있습니다.
- `effort: "medium"`은 단순 요약/추출 작업이라는 판단하에 선택한 값입니다. 더 정교한 액션 아이템 추출이 필요해지면 `"high"`로 올리는 것을 고려하세요(비용/지연 증가와 트레이드오프).

## `client.js`를 수정하기 전에

- 루트의 TDD 가드 훅이 **`api/client.js` 편집을 차단**합니다 — `api/client.test.js`가 없기 때문입니다. 고치려면 테스트를 먼저 작성하세요(패턴: `js/parser.test.js`). 자세한 내용은 루트 `CLAUDE.md`의 "에이전트 작업 환경" 절.
- 이 폴더에는 자동 테스트가 없습니다. 변경 검증은 브라우저에서 실제 API 키로 한 번 실행한 뒤, 네트워크 탭에서 요청 바디(`model` / `output_config`)와 응답의 `stop_reason`을 확인하는 방법뿐입니다.

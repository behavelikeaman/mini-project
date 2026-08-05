# my-review-plugin

기존에 `.claude/` 안에 흩어져 있던 **코드 리뷰 스킬 · 리뷰 서브에이전트 · 커밋 전 검사 훅**
세 가지를 하나의 플러그인으로 묶은 것이다. 설치하면 세 개가 한꺼번에 붙고, 지우면 한꺼번에 빠진다.

## 무엇이 들어 있나

| 구성요소 | 파일 | 하는 일 |
|---|---|---|
| 스킬 | `skills/my-review/SKILL.md` | `/my-review-plugin:my-review` — 정확성 → 보안 → 리소스 → 유지보수성 순으로 코드를 본다. 구체적 실패 시나리오를 못 쓰면 보고하지 않는다 |
| 서브에이전트 | `agents/code-reviewer.md` | 위 스킬을 호출하는 리뷰 전용 에이전트. 편집 도구가 없어서 **수정이 구조적으로 불가능**하다 |
| 훅 | `hooks/hooks.json` + `hooks/pre-commit-check.sh` | `git commit` 직전에 lint → build → test 를 돌린다. 실패하면 `exit 2` 로 커밋을 막는다 |

## 폴더 구조 — 이름이 곧 규칙이다

Claude Code 는 아래 **정해진 위치**를 보고 알아서 찾는다. 설정에 경로를 적을 필요가 없다.

```
my-review-plugin/
├── .claude-plugin/
│   └── plugin.json          ← 이 폴더가 플러그인임을 알리는 명찰. name 만 필수
├── skills/
│   └── my-review/
│       └── SKILL.md         ← 폴더 이름이 스킬 이름이 된다
├── agents/
│   └── code-reviewer.md     ← 파일 하나 = 에이전트 하나
├── hooks/
│   ├── hooks.json           ← 어떤 이벤트에 무엇을 실행할지 등록
│   └── pre-commit-check.sh  ← 실제로 실행되는 스크립트
└── README.md
```

`plugin.json` 은 사실 **없어도 된다**(폴더 이름이 플러그인 이름이 된다). 버전·설명 같은
정보를 붙이려고 넣었다.

## `${CLAUDE_PLUGIN_ROOT}` — 훅이 자기 파일을 찾는 방법

`hooks/hooks.json` 안의 명령은 이렇게 되어 있다.

```json
"command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/pre-commit-check.sh\""
```

플러그인을 설치하면 이 폴더는 캐시 위치로 **복사된다.** 그래서 `.claude/hooks/...` 같은
프로젝트 기준 경로를 쓰면 파일을 못 찾는다. `${CLAUDE_PLUGIN_ROOT}` 는 "복사된 뒤의 내 폴더"를
가리키는 변수라서 어디에 설치되든 맞는다.

> 참고: 같은 이유로 플러그인 안에서 `../다른폴더` 처럼 **바깥을 참조하면 안 된다.**
> 복사될 때 바깥은 따라오지 않는다.

훅 스크립트 안의 `CLAUDE_PROJECT_DIR` 은 반대로 **검사 대상인 사용자 프로젝트**를 가리킨다.
둘은 다른 변수다.

## 설치와 사용

이 저장소 루트(`C:\Claude\Projects`)의 `.claude-plugin/marketplace.json` 이 카탈로그 역할을 한다.

로컬에서 바로 테스트:

```
/plugin marketplace add C:\Claude\Projects
/plugin install my-review-plugin@behavelikeaman-plugins
/reload-plugins
```

GitHub 에 올린 뒤 다른 PC 에서:

```
/plugin marketplace add behavelikeaman/projects
/plugin install my-review-plugin@behavelikeaman-plugins
```

설치 후 사용:

```
/my-review-plugin:my-review              스킬 직접 실행
@my-review-plugin:code-reviewer 리뷰해줘   서브에이전트 호출
```

훅은 호출할 필요 없이 `git commit` 때 자동으로 걸린다.

## 고칠 때 주의할 점

- **스킬(`SKILL.md`) 수정은 즉시 반영된다.** 훅·에이전트·`plugin.json` 수정은 `/reload-plugins`
  또는 재시작이 필요하다.
- 새 버전을 배포할 때는 `plugin.json` 의 `version` 을 올려야 사용자에게 업데이트가 간다.
- `*.sh` 는 반드시 LF 줄바꿈이어야 한다. CRLF 가 되면 bash 가 `bad interpreter` 로 죽는다.
  저장소 루트의 `.gitattributes` 가 이걸 고정하고 있으니 지우지 말 것.

## 지금은 원본이 두 벌이다

`Test-Project/.claude/` 안에 같은 내용의 원본이 그대로 남아 있다. 플러그인을 설치해서
잘 도는 걸 확인한 뒤에 원본을 지우면, 그때부터 관리 지점이 하나가 된다.
(둘 다 켜져 있으면 훅이 두 번 실행되고 스킬 이름이 두 개로 보인다.)

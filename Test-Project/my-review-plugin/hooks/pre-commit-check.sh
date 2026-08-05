#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# PreToolUse 훅 — git commit 직전에 lint / build / test 를 실행한다.
# (my-review-plugin 에 포함된 버전. 등록은 ../hooks/hooks.json 이 하며,
#  거기서 이 파일을 ${CLAUDE_PLUGIN_ROOT} 기준 경로로 가리킨다.)
#
# 동작:
#   - Bash 도구 호출마다 실행되지만, git commit 이 아니면 즉시 통과한다(비용 거의 0).
#   - git commit 이면 package.json 의 lint → build → test 스크립트를 순서대로 돌린다.
#   - 하나라도 실패하면 exit 2 로 커밋을 차단하고, 실패 내용을 Claude 에게 되돌려준다.
#   - 돌릴 스크립트가 없으면 조용히 통과한다.
#
# 입력: stdin 으로 훅 JSON  ({"tool_name":"Bash","tool_input":{"command":"..."}})
# 종료코드: 0 = 통과, 2 = 차단
# ---------------------------------------------------------------------------

input=$(cat)

# --- 1. 빠른 경로 ------------------------------------------------------------
# "git commit" 이라는 글자 자체가 없으면 여기서 끝낸다. bash 내장 기능만 쓰므로
# 일반 명령에 붙는 오버헤드는 사실상 없다. (node 는 아직 실행하지 않는다)
case "$input" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

# --- 2. 실제 명령 문자열 추출 -------------------------------------------------
# 이 환경에는 jq 가 없으므로 node 로 JSON 을 파싱한다.
cmd=$(printf '%s' "$input" | node -e '
  let s = "";
  process.stdin.on("data", d => s += d).on("end", () => {
    try {
      const j = JSON.parse(s);
      process.stdout.write(((j.tool_input || {}).command) || "");
    } catch (e) { /* 파싱 실패 시 빈 문자열 → 통과 */ }
  });
')

# 명령 조각의 시작 위치에 git 이 오고 뒤에 commit 이 붙는 경우만 대상으로 한다.
# (`git add . && git commit -m "x"` 같은 복합 명령도 잡힌다)
if ! printf '%s' "$cmd" | grep -qE '(^|[;&|][[:space:]]*)git[[:space:]].*commit'; then
  exit 0
fi

# --- 3. 프로젝트 루트로 이동 --------------------------------------------------
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$root" 2>/dev/null || exit 0

# --- 4. 돌릴 게 있는지 확인 ---------------------------------------------------
if [ ! -f package.json ]; then
  # 검사할 도구가 아직 없는 상태. 커밋은 막지 않고 안내만 남긴다.
  printf '{"systemMessage":"pre-commit: package.json이 없어 lint/build/test를 건너뜁니다."}\n'
  exit 0
fi

# package.json 의 scripts 에 해당 항목이 있는지 확인
has_script() {
  node -e '
    try {
      const p = require("./package.json");
      process.exit(p.scripts && p.scripts[process.argv[1]] ? 0 : 1);
    } catch (e) { process.exit(1); }
  ' "$1" 2>/dev/null
}

# --- 5. lint → build → test 순서로 실행 ---------------------------------------
report=""
ran=""

for script in lint build test; do
  has_script "$script" || continue
  ran="$ran $script"

  if ! output=$(npm run --silent "$script" 2>&1); then
    # 출력이 길면 뒷부분(실제 에러가 있는 쪽)만 남긴다
    trimmed=$(printf '%s\n' "$output" | tail -n 40)
    report="${report}
--- npm run ${script} 실패 ---
${trimmed}
"
  fi
done

if [ -z "$ran" ]; then
  printf '{"systemMessage":"pre-commit: package.json에 lint/build/test 스크립트가 없어 건너뜁니다."}\n'
  exit 0
fi

# --- 6. 결과 ------------------------------------------------------------------
if [ -n "$report" ]; then
  # exit 2 = PreToolUse 차단. stderr 내용이 Claude 에게 전달되어 고치도록 유도한다.
  {
    printf '커밋이 차단되었습니다. 사전 검사에 실패했습니다.\n'
    printf '%s\n' "$report"
    printf '위 실패를 먼저 고친 뒤 다시 커밋하세요.\n'
  } >&2
  exit 2
fi

printf '{"systemMessage":"pre-commit 통과:%s"}\n' "$ran"
exit 0

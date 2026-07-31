// js/parser.js 회귀 테스트. 브라우저/빌드 도구 없이 `node js/parser.test.js`로 실행.
// parser.js는 window.KakaoParser를 할당하는 IIFE이므로, window를 흉내낸 sandbox에서 평가해 불러온다.
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");

// new Function은 현재 realm에서 평가되므로(별도 vm 컨텍스트를 만들지 않으므로)
// Object/Array 프로토타입이 이 테스트 파일과 동일해 assert/strict의 deepEqual이 정상 동작한다.
const parserSrc = fs.readFileSync(path.join(__dirname, "parser.js"), "utf8");
const loadKakaoParser = new Function("window", `${parserSrc}\nreturn window.KakaoParser;`);
const { parseKakaoTalk, serializeLog, limitMessages } = loadKakaoParser({});

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failed++;
    console.error(`FAIL: ${name}`);
    console.error(err);
  }
}

test("기본 케이스: 날짜 구분선 + 단일 라인 메시지", () => {
  const text = [
    "카카오톡 대화",
    "저장한 날짜 : 2026-07-06",
    "--------------- 2026년 7월 6일 월요일 ---------------",
    "[철수] [오전 9:05] 안녕하세요",
    "[영희] [오후 2:30] 네 안녕하세요",
  ].join("\n");

  const messages = parseKakaoTalk(text);

  assert.equal(messages.length, 2);
  assert.deepEqual(messages[0], { date: "2026-07-06", time: "09:05", sender: "철수", text: "안녕하세요" });
  assert.deepEqual(messages[1], { date: "2026-07-06", time: "14:30", sender: "영희", text: "네 안녕하세요" });
});

test("멀티라인 메시지: 후속 줄(빈 줄 포함)이 직전 메시지에 이어붙는다", () => {
  const text = [
    "--------------- 2026년 7월 6일 월요일 ---------------",
    "[철수] [오전 9:00] 첫 줄",
    "둘째 줄",
    "",
    "넷째 줄",
    "[영희] [오전 9:01] 다음 메시지",
  ].join("\n");

  const messages = parseKakaoTalk(text);

  assert.equal(messages.length, 2);
  assert.equal(messages[0].text, "첫 줄\n둘째 줄\n\n넷째 줄");
  assert.equal(messages[1].text, "다음 메시지");
});

test("오전/오후 → 24시간 변환 경계값", () => {
  const text = [
    "--------------- 2026년 7월 6일 월요일 ---------------",
    "[A] [오전 12:00] 자정",
    "[A] [오후 12:00] 정오",
    "[A] [오전 11:59] 오전끝",
    "[A] [오후 11:59] 오후끝",
  ].join("\n");

  const messages = parseKakaoTalk(text);

  assert.deepEqual(messages.map((m) => m.time), ["00:00", "12:00", "11:59", "23:59"]);
});

test("미디어 placeholder는 일반 메시지 텍스트로 처리된다", () => {
  const text = [
    "--------------- 2026년 7월 6일 월요일 ---------------",
    "[철수] [오전 9:00] 사진",
    "[영희] [오전 9:01] 이모티콘",
  ].join("\n");

  const messages = parseKakaoTalk(text);

  assert.equal(messages.length, 2);
  assert.equal(messages[0].text, "사진");
  assert.equal(messages[1].text, "이모티콘");
});

test("첫 날짜 구분선 이전의 헤더(메타데이터) 줄은 메시지로 취급되지 않는다", () => {
  const text = [
    "카카오톡 대화 내보내기",
    "저장한 날짜 : 2026-07-06 12:00",
    "--------------- 2026년 7월 6일 월요일 ---------------",
    "[철수] [오전 9:00] 안녕",
  ].join("\n");

  const messages = parseKakaoTalk(text);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "철수");
});

test("limitMessages: 예산 초과 시 오래된 메시지부터 잘라내고 최근 메시지를 남긴다", () => {
  const messages = [
    { date: "2026-07-01", time: "09:00", sender: "A", text: "가".repeat(50) },
    { date: "2026-07-02", time: "09:00", sender: "A", text: "나".repeat(50) },
    { date: "2026-07-03", time: "09:00", sender: "A", text: "다".repeat(50) },
  ];

  const limited = limitMessages(messages, 100);

  assert.ok(limited.length < messages.length);
  assert.equal(limited[limited.length - 1].text, "다".repeat(50));

  const notLimited = limitMessages(messages, 100000);
  assert.equal(notLimited.length, messages.length);
});

test("serializeLog: 날짜 축약 포맷과 개행 치환", () => {
  const messages = [
    { date: "2026-07-06", time: "09:05", sender: "철수", text: "첫 줄\n둘째 줄" },
  ];

  const log = serializeLog(messages);

  assert.equal(log, "[07/06 09:05] 철수: 첫 줄 둘째 줄");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

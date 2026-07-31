// Claude API 클라이언트. 브라우저에서 api.anthropic.com을 직접 호출한다
// (anthropic-dangerous-direct-browser-access 헤더로 CORS 허용 — 개인용 프로토타입 전용).
window.ClaudeApi = (function () {
  "use strict";

  const RESPONSE_SCHEMA = {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "채팅방 전체 대화에 대한 한국어 요약, 3~6문장"
      },
      action_items: {
        type: "array",
        description: "대화에서 도출되는 실행 필요 항목 목록. 없으면 빈 배열",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "액션 아이템 제목, 한 줄" },
            detail: { type: "string", description: "구체적인 내용 설명" },
            assignee: { type: "string", description: "담당자 이름. 명확하지 않으면 '미정'" }
          },
          required: ["title", "detail", "assignee"],
          additionalProperties: false
        }
      }
    },
    required: ["summary", "action_items"],
    additionalProperties: false
  };

  async function callClaude(apiKey, chatLog) {
    const body = {
      model: "claude-opus-5",
      max_tokens: 8000,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: RESPONSE_SCHEMA }
      },
      system: "당신은 이 채팅방 커뮤니티의 방장을 돕는 비서입니다. 주어진 카카오톡 대화 로그를 읽고, 전체 흐름을 한국어로 요약하고, 방장이나 참여자가 실제로 처리해야 할 액션 아이템(할 일, 답변해야 할 질문, 후속 조치 등)을 뽑아주세요. 잡담이나 인사만 오간 부분에서는 억지로 액션 아이템을 만들지 마세요.",
      messages: [
        {
          role: "user",
          content: `다음은 카카오톡 대화 로그입니다. [날짜/시간] 발신자: 내용 형식입니다.\n\n${chatLog}`
        }
      ]
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let message = `요청이 실패했습니다 (HTTP ${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error && errJson.error.message) message = errJson.error.message;
      } catch (_) { /* ignore parse failure */ }
      if (res.status === 401) message = "API 키가 올바르지 않습니다. 키를 다시 확인해주세요.";
      if (res.status === 429) message = "요청이 너무 많습니다 (rate limit). 잠시 후 다시 시도해주세요.";
      throw new Error(message);
    }

    const data = await res.json();
    if (data.stop_reason === "refusal") {
      throw new Error("Claude가 이 요청 처리를 거부했습니다.");
    }
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) throw new Error("응답에서 결과 텍스트를 찾을 수 없습니다.");
    return JSON.parse(textBlock.text);
  }

  return { callClaude };
})();

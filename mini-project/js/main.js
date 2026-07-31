// 앱 진입점: KeyStorage / KakaoParser / ClaudeApi / UI 모듈을 조합해 이벤트를 연결한다.
(function () {
  "use strict";

  const MAX_CHARS = 30000; // 대화 로그 전송 시 대략적인 안전 한도 (글자 수 기준)

  const UI = window.UI;
  const KeyStorage = window.KeyStorage;
  const KakaoParser = window.KakaoParser;
  const ClaudeApi = window.ClaudeApi;

  let parsedMessages = null; // 파싱된 전체 메시지 배열

  function updateAnalyzeEnabled() {
    const hasKey = UI.dom.apiKeyInput.value.trim().length > 0;
    UI.setAnalyzeEnabled(hasKey && !!parsedMessages && parsedMessages.length > 0);
  }

  // ---- API 키 저장/불러오기 ----
  const savedKey = KeyStorage.load();
  if (savedKey) {
    UI.dom.apiKeyInput.value = savedKey;
    UI.setKeyStatus("저장된 API 키를 불러왔습니다.", true);
  }

  UI.dom.saveKeyBtn.addEventListener("click", () => {
    const key = UI.dom.apiKeyInput.value.trim();
    KeyStorage.save(key);
    if (key) {
      UI.setKeyStatus("저장되었습니다. (이 브라우저에만 보관됩니다)", true);
    } else {
      UI.setKeyStatus("API 키가 비어 있습니다.", false);
    }
    updateAnalyzeEnabled();
  });

  UI.dom.apiKeyInput.addEventListener("input", updateAnalyzeEnabled);

  // ---- 파일 업로드 처리 ----
  UI.dom.fileInput.addEventListener("change", () => {
    UI.resetResult();
    UI.hideParseError();
    UI.hideTruncateNotice();
    UI.hideFileSummary();
    parsedMessages = null;

    const file = UI.dom.fileInput.files[0];
    if (!file) { updateAnalyzeEnabled(); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const messages = KakaoParser.parseKakaoTalk(text);

      if (messages.length === 0) {
        UI.showParseError("메시지를 찾지 못했습니다. 카카오톡 '대화 내보내기'로 만든 .txt 파일이 맞는지 확인해주세요.");
        updateAnalyzeEnabled();
        return;
      }

      parsedMessages = messages;
      const first = messages[0];
      const last = messages[messages.length - 1];
      const senders = new Set(messages.map((m) => m.sender));
      UI.showFileSummary(
        `대화상대 ${senders.size}명 · 메시지 ${messages.length}개 · ${first.date || "?"} ~ ${last.date || "?"}`
      );
      updateAnalyzeEnabled();
    };
    reader.onerror = () => {
      UI.showParseError("파일을 읽는 중 문제가 발생했습니다.");
    };
    reader.readAsText(file, "utf-8");
  });

  // ---- 분석 실행 ----
  UI.dom.analyzeBtn.addEventListener("click", async () => {
    if (!parsedMessages || parsedMessages.length === 0) return;
    const apiKey = UI.dom.apiKeyInput.value.trim();
    if (!apiKey) return;

    UI.resetResult();
    UI.hideTruncateNotice();
    UI.hideApiError();

    let messagesToSend = parsedMessages;
    const limited = KakaoParser.limitMessages(parsedMessages, MAX_CHARS);
    if (limited.length < parsedMessages.length) {
      messagesToSend = limited;
      UI.showTruncateNotice(
        `메시지가 많아 전체 ${parsedMessages.length}개 중 최근 ${limited.length}개만 분석합니다.`
      );
    }

    const chatLog = KakaoParser.serializeLog(messagesToSend);

    UI.setAnalyzeEnabled(false);
    UI.setLoading(true);
    try {
      const result = await ClaudeApi.callClaude(apiKey, chatLog);
      UI.renderResult(result);
    } catch (err) {
      UI.showApiError(err.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      UI.setLoading(false);
      updateAnalyzeEnabled();
    }
  });
})();

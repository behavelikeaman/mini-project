// DOM 참조와 화면 렌더링/상태 표시만 담당하는 UI 계층. 앱 상태(파싱 결과 등)는 갖지 않는다.
window.UI = (function () {
  "use strict";

  const el = (id) => document.getElementById(id);

  const dom = {
    apiKeyInput: el("apiKeyInput"),
    saveKeyBtn: el("saveKeyBtn"),
    keyStatus: el("keyStatus"),
    fileInput: el("fileInput"),
    fileSummary: el("fileSummary"),
    truncateNotice: el("truncateNotice"),
    parseError: el("parseError"),
    analyzeBtn: el("analyzeBtn"),
    loading: el("loading"),
    apiError: el("apiError"),
    resultWrap: el("resultWrap"),
    summaryText: el("summaryText"),
    actionItems: el("actionItems"),
    noActionNote: el("noActionNote")
  };

  function setKeyStatus(text, ok) {
    dom.keyStatus.textContent = text;
    dom.keyStatus.classList.toggle("ok", !!ok);
  }

  function showFileSummary(text) {
    dom.fileSummary.textContent = text;
    dom.fileSummary.classList.add("show");
  }
  function hideFileSummary() {
    dom.fileSummary.classList.remove("show");
    dom.fileSummary.textContent = "";
  }

  function showParseError(text) {
    dom.parseError.textContent = text;
    dom.parseError.classList.add("show");
  }
  function hideParseError() {
    dom.parseError.classList.remove("show");
  }

  function showTruncateNotice(text) {
    dom.truncateNotice.textContent = text;
    dom.truncateNotice.classList.add("show");
  }
  function hideTruncateNotice() {
    dom.truncateNotice.classList.remove("show");
  }

  function showApiError(text) {
    dom.apiError.textContent = text;
    dom.apiError.classList.add("show");
  }
  function hideApiError() {
    dom.apiError.classList.remove("show");
  }

  function setLoading(isLoading) {
    dom.loading.classList.toggle("show", isLoading);
  }

  function setAnalyzeEnabled(enabled) {
    dom.analyzeBtn.disabled = !enabled;
  }

  function resetResult() {
    dom.resultWrap.classList.remove("show");
    hideApiError();
    dom.summaryText.textContent = "";
    dom.actionItems.innerHTML = "";
  }

  function renderResult(result) {
    dom.summaryText.textContent = result.summary || "(요약 없음)";
    dom.actionItems.innerHTML = "";
    const items = result.action_items || [];
    if (items.length === 0) {
      dom.noActionNote.style.display = "block";
    } else {
      dom.noActionNote.style.display = "none";
      for (const item of items) {
        const div = document.createElement("div");
        div.className = "action-item";
        div.innerHTML = `
          <div class="title"></div>
          <div class="detail"></div>
          <span class="assignee"></span>
        `;
        div.querySelector(".title").textContent = item.title || "";
        div.querySelector(".detail").textContent = item.detail || "";
        div.querySelector(".assignee").textContent = item.assignee || "미정";
        dom.actionItems.appendChild(div);
      }
    }
    dom.resultWrap.classList.add("show");
  }

  return {
    dom,
    setKeyStatus,
    showFileSummary,
    hideFileSummary,
    showParseError,
    hideParseError,
    showTruncateNotice,
    hideTruncateNotice,
    showApiError,
    hideApiError,
    setLoading,
    setAnalyzeEnabled,
    resetResult,
    renderResult
  };
})();

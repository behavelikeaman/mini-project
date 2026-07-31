// API 키를 브라우저 localStorage에 저장/불러오는 저장소 계층.
window.KeyStorage = (function () {
  "use strict";

  const STORAGE_KEY = "chat-summarizer-api-key";

  function load() {
    return localStorage.getItem(STORAGE_KEY) || "";
  }

  function save(key) {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return { load, save };
})();

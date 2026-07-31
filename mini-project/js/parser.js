// 카카오톡 "대화 내보내기" .txt 파서.
// 형식: "--------------- 2026년 7월 6일 월요일 ---------------" 날짜 구분선
//       "[발신자] [오전/오후 h:mm] 메시지" 메시지 시작 줄
//       그 외 줄은 직전 메시지의 연속(여러 줄 메시지)으로 취급
window.KakaoParser = (function () {
  "use strict";

  function parseKakaoTalk(text) {
    const lines = text.split(/\r?\n/);
    const dateSepRe = /^-+\s*(.+?)\s*-+$/;
    const koreanDateRe = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
    const msgRe = /^\[(.+?)\]\s\[(오전|오후)\s(\d{1,2}):(\d{2})\]\s(.*)$/;

    const messages = [];
    let currentDate = null;
    let current = null;

    for (const line of lines) {
      const dateMatch = line.match(dateSepRe);
      if (dateMatch) {
        const dm = dateMatch[1].match(koreanDateRe);
        if (dm) {
          const [, y, m, d] = dm;
          currentDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
        current = null;
        continue;
      }

      const msgMatch = line.match(msgRe);
      if (msgMatch) {
        let [, sender, ampm, hh, mm, msgText] = msgMatch;
        hh = parseInt(hh, 10);
        if (ampm === "오후" && hh !== 12) hh += 12;
        if (ampm === "오전" && hh === 12) hh = 0;
        const time = `${String(hh).padStart(2, "0")}:${mm}`;
        current = { date: currentDate, time, sender, text: msgText };
        messages.push(current);
        continue;
      }

      // 메시지 연속 줄 (빈 줄 포함). 아직 메시지가 시작되지 않았다면(헤더 영역) 무시
      if (current) {
        current.text += "\n" + line;
      }
    }

    messages.forEach((m) => { m.text = m.text.trim(); });
    return messages;
  }

  function serializeLog(messages) {
    return messages
      .map((m) => {
        const shortDate = m.date ? m.date.slice(5).replace("-", "/") : "?";
        return `[${shortDate} ${m.time}] ${m.sender}: ${m.text.replace(/\n/g, " ")}`;
      })
      .join("\n");
  }

  // 뒤에서부터(최신 메시지부터) 채워서 maxChars를 넘지 않는 선까지만 남긴다.
  // 조용히 자르지 않고, 호출부에서 잘렸는지 여부를 알 수 있도록 배열 길이 비교로 판단하게 한다.
  function limitMessages(messages, maxChars) {
    let total = 0;
    let cutIndex = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      total += messages[i].text.length + 25;
      if (total > maxChars) {
        cutIndex = i + 1;
        break;
      }
    }
    return messages.slice(cutIndex);
  }

  return { parseKakaoTalk, serializeLog, limitMessages };
})();

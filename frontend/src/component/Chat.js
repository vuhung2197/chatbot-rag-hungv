import React, { useState } from 'react';
import HelpGuide from "./HelpGuide";
import AutocompleteSuggestion from "./AutocompleteSuggestion";

// Hàm phát âm bằng SpeechSynthesis API
function speak(text, lang = "en-US") {
  if ('speechSynthesis' in window) {
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = lang;
    window.speechSynthesis.speak(utter);
  } else {
    alert("Trình duyệt không hỗ trợ phát âm!");
  }
}

// Hàm lấy ra từ cần phát âm từ phần trả lời của bot
function extractWordFromBotReply(botReply) {
  // Tìm từ nằm trong dấu "..."
  const match = botReply.match(/nghĩa của &quot;(.+?)&quot;/i) // trường hợp trả về &quot;
    || botReply.match(/nghĩa của "(.+?)"/i)
    || botReply.match(/Từ &quot;(.+?)&quot;/i)
    || botReply.match(/Từ "(.+?)"/i)
    || botReply.match(/Bạn có hỏi từ "&lt;b&gt;(.+?)&lt;\/b&gt;/i)
    || botReply.match(/Bạn có hỏi từ "<b>(.+?)<\/b>/i);
  return match ? match[1] : null;
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [showGuide, setShowGuide] = useState(true);

  async function sendChat() {
    if (!input.trim()) return;
    const res = await fetch("http://localhost:3001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();
    setHistory([{ user: input, bot: data.reply }, ...history]);
    setInput("");
  }

  function handleSelectSuggestion(word) {
    setInput(word);
    // Nếu muốn tự động gửi luôn khi chọn suggestion thì mở dòng này:
    // sendChat();
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.92)",
      borderRadius: "2em",
      padding: "2em 2.5em",
      maxWidth: 480,
      boxShadow: "0 8px 32px 0 rgba(31,38,135,0.18)",
      border: "1px solid #bcbcbc",
      margin: "0 auto"
    }}>
      <button onClick={() => setShowGuide(v => !v)}>
        {showGuide ? "Ẩn hướng dẫn" : "Hiện hướng dẫn"}
      </button>
      {showGuide && <HelpGuide />}
      <h3 style={{
        color: "#7137ea", fontSize: "2em", fontWeight: "bold",
        marginBottom: "1em", textAlign: "center"
      }}>📚 Dictionary Chatbot</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5em" }}>
        <AutocompleteSuggestion
          value={input}
          onChange={setInput}
          onSelect={handleSelectSuggestion}
          onEnterKey={sendChat}
        />
      </div>
      <div style={{
        maxHeight: 260, overflowY: "auto",
        display: "flex", flexDirection: "column-reverse", gap: "1em"
      }}>
        {history.map((item, idx) => {
          const botWord = extractWordFromBotReply(item.bot);
          return (
            <div key={idx}>
              <div style={{
                background: "#e4e7ff", color: "#35477d",
                alignSelf: "flex-end", marginLeft: "auto",
                padding: "8px 12px", borderRadius: "1em",
                marginBottom: 4, display: "inline-block", maxWidth: "85%"
              }}>
                <b>Bạn:</b> {item.user}
                {/* Nút phát âm nếu là tiếng Anh */}
                {/^[a-zA-Z\s\-]+$/.test(item.user.trim()) && (
                  <button
                    title="Phát âm"
                    onClick={() => speak(item.user)}
                    style={{
                      marginLeft: 6,
                      background: "none",
                      border: "none",
                      color: "#2d8cf0",
                      fontSize: "1.1em",
                      cursor: "pointer",
                      verticalAlign: "middle"
                    }}
                  >🔊</button>
                )}
              </div>
              <div style={{
                background: "#e2fcfa", color: "#24637c",
                alignSelf: "flex-start", marginRight: "auto",
                padding: "8px 12px", borderRadius: "1em",
                marginBottom: 4, display: "inline-block", maxWidth: "85%",
                whiteSpace: "normal", // Để nội dung HTML xuống dòng tự nhiên
                fontSize: "1.06em"
              }}>
                <b>Bot:</b>
                {/* Nút phát âm từ nếu trả về đúng một từ */}
                {botWord && (
                  <button
                    title={`Phát âm "${botWord}"`}
                    onClick={() => speak(botWord)}
                    style={{
                      marginLeft: 8,
                      background: "none",
                      border: "none",
                      color: "#2d8cf0",
                      fontSize: "1.1em",
                      cursor: "pointer",
                      verticalAlign: "middle"
                    }}
                  >🔊</button>
                )}
                <div
                  style={{ marginTop: 4 }}
                  dangerouslySetInnerHTML={{ __html: item.bot }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}

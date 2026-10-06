"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

// Ormma logo mark: a glowing ring with a four-point spark.
function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="2.6" />
      <path
        d="M16 9.5 L17.7 14.3 L22.5 16 L17.7 17.7 L16 22.5 L14.3 17.7 L9.5 16 L14.3 14.3 Z"
        fill="currentColor"
      />
    </svg>
  );
}

const GREETING: Msg = {
  role: "assistant",
  content: "Hi, I'm Ormma. How can I help you today?",
};

const SUGGESTIONS = [
  "Explain something complicated in simple words",
  "Help me write a polite email",
  "Plan a healthy meal for the week",
  "Give me ideas for a small business",
];

// Turns **bold** into <strong> inside a line of text.
function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

// Small, safe formatter: paragraphs, bullet lists, numbered lists and bold.
function renderText(text: string): ReactNode {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const key = `l-${blocks.length}`;
    const items = list.items.map((it, i) => <li key={i}>{inline(it, `${key}-${i}`)}</li>);
    blocks.push(list.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);

    if (bullet) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else if (numbered) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
    } else {
      flushList();
      if (line) blocks.push(<p key={`p-${idx}`}>{inline(line, `p-${idx}`)}</p>);
    }
  });
  flushList();

  return <>{blocks}</>;
}

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      // Skip the local greeting when sending history to the API
      const history = next.filter((m) => m !== GREETING);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.error ?? "Something went wrong.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function newChat() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setMessages([GREETING]);
    setInput("");
  }

  // Browser voice input (Web Speech API). Works best in Chrome.
  function startListening() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setInput(text);
    };
    rec.start();
  }

  // Browser voice output (Web Speech API). Swap for Azure/Google TTS later.
  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ""));
    u.lang = "en-IN";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }

  const onlyGreeting = messages.length === 1;

  return (
    <div className="shell">
      <main className="app">
        <header className="header">
          <div className="brand">
            <div className="logo" aria-hidden="true">
              <LogoMark />
            </div>
            <div>
              <h1>Ormma</h1>
              <p>Your AI assistant</p>
            </div>
          </div>
          <button className="ghost" onClick={newChat} aria-label="Start a new chat">
            + New chat
          </button>
        </header>
        <div className="kasavu" aria-hidden="true" />

        <section className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`row ${m.role}`}>
              {m.role === "assistant" && (
                <div className="avatar" aria-hidden="true">
                  <LogoMark />
                </div>
              )}
              <div className={`bubble ${m.role}`}>
                <div className="text">{renderText(m.content)}</div>
                {m.role === "assistant" && i > 0 && (
                  <button className="speak" onClick={() => speak(m.content)} aria-label="Read aloud">
                    🔊 Listen
                  </button>
                )}
              </div>
            </div>
          ))}

          {onlyGreeting && (
            <div className="chips" aria-label="Try asking">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="row assistant">
              <div className="avatar" aria-hidden="true">
                <LogoMark />
              </div>
              <div className="bubble assistant typing" aria-label="Ormma is typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </section>

        <form className="composer" onSubmit={onSubmit}>
          <button
            type="button"
            className={`mic ${listening ? "on" : ""}`}
            onClick={startListening}
            aria-label="Speak"
          >
            🎤
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Ormma anything…"
            aria-label="Message"
          />
          <button type="submit" className="send" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}

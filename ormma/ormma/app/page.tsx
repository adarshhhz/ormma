"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "Namaskaram! I'm Ormma, Kerala's own AI. How can I help you today?",
};

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

  // Browser voice input (Web Speech API). Works best in Chrome.
  function startListening() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    const rec = new SR();
    rec.lang = "ml-IN";
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
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ml-IN";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }

  return (
    <main className="app">
      <header className="header">
        <div className="logo">ഓ</div>
        <div>
          <h1>Ormma</h1>
          <p>Kerala&apos;s Own AI</p>
        </div>
      </header>

      <section className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <span>{m.content}</span>
            {m.role === "assistant" && i > 0 && (
              <button className="speak" onClick={() => speak(m.content)} aria-label="Read aloud">
                🔊
              </button>
            )}
          </div>
        ))}
        {loading && <div className="bubble assistant typing">Ormma is typing…</div>}
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
          placeholder="Malayalam, English or Manglish…"
          aria-label="Message"
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </main>
  );
}

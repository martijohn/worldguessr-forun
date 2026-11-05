import { useEffect, useState } from "react";
import { useTranslation } from "@/components/useTranslations";

const NAME_KEY = "wg_event_name";
const RESEND_MS = 5000;

// Event build, player side: no game codes. The player types their name once,
// then waits here until the host pulls them into a match (the server's 'game'
// message moves them to the lobby). Back on home after a match, they land here
// again and are automatically waiting. eventWait is re-sent every few seconds:
// the server drops anyone it stops hearing from, and a send before the socket
// is verified is simply retried.
export default function EventWaitingScreen({ ws, connected, rejectedAt }) {
  const { t: text } = useTranslation("common");
  const [draft, setDraft] = useState("");
  const [name, setName] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved) { setName(saved); setDraft(saved); }
    } catch {}
  }, []);

  // Server refused the name (profanity filter): back to the form.
  useEffect(() => {
    if (!rejectedAt) return;
    setName(null);
    try { localStorage.removeItem(NAME_KEY); } catch {}
  }, [rejectedAt]);

  useEffect(() => {
    if (!name || !connected || !ws) return;
    const send = () => { try { ws.send(JSON.stringify({ type: "eventWait", name })); } catch {} };
    send();
    const iv = setInterval(send, RESEND_MS);
    return () => clearInterval(iv);
  }, [name, connected, ws]);

  const submit = (e) => {
    e.preventDefault();
    const clean = draft.replace(/\s+/g, " ").trim().slice(0, 30);
    if (!clean) return;
    try { localStorage.setItem(NAME_KEY, clean); } catch {}
    setName(clean);
  };

  const box = {
    display: "grid", gap: 14, maxWidth: 420, width: "100%", padding: 20, borderRadius: 16,
    background: "rgba(0,0,0,0.55)", color: "#fff", boxSizing: "border-box",
  };

  if (!name) {
    return (
      <form onSubmit={submit} style={box}>
        <label htmlFor="eventName" style={{ fontSize: 20, fontWeight: 600 }}>{text("eventEnterName")}</label>
        <input
          id="eventName" value={draft} maxLength={30} autoComplete="off" autoFocus
          onChange={(e) => setDraft(e.target.value)}
          style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 18 }}
        />
        <button type="submit" disabled={!draft.trim()} className="gameBtn g2_green_button g2_button_style">{text("eventReady")}</button>
      </form>
    );
  }

  return (
    <div style={box}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{name}</div>
      <div style={{ fontSize: 18 }}>{connected ? text("eventWaitingForHost") : text("multiplayerConnecting")}</div>
      <button
        onClick={() => setName(null)}
        style={{ justifySelf: "start", background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: 14 }}
      >{text("eventChangeName")}</button>
    </div>
  );
}

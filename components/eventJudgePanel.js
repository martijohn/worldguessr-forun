import { useEffect, useState } from "react";
import { FaGavel, FaXmark } from "react-icons/fa6";
import { useTranslation } from "@/components/useTranslations";
import { EVENT_MODE } from "@/components/utils/eventMode";

// Event build, host only: the judges' log for the current match (tab hidden
// spells, disconnects, disqualifications) plus a Disqualify button per player.
// The software only records; the judges decide.
const secs = (ms) => `${Math.max(0, Math.round(ms / 1000))}s`;
const clock = (at) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function EventJudgePanel({ multiplayerState, onDisqualify }) {
  const { t: text } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const gd = multiplayerState?.gameData;
  const shown = EVENT_MODE && !!multiplayerState?.inGame && !!gd?.host && !gd?.public;
  const log = multiplayerState?.eventLog || [];
  const hasOpen = log.some((e) => e.ms == null && e.kind !== "dq");

  // Tick live "away for" durations while something is still open.
  useEffect(() => {
    if (!open || !hasOpen) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [open, hasOpen]);

  if (!shown) return null;

  const flagged = log.filter((e) => e.kind !== "dq").length;
  const dqIds = new Set(log.filter((e) => e.kind === "dq").map((e) => e.playerId));
  const roster = (gd.players || []).filter((p) => !p.host);
  const rows = [
    ...roster.map((p) => ({ id: p.id, name: p.username })),
    ...log.filter((e) => e.kind === "dq" && !roster.some((p) => p.id === e.playerId)).map((e) => ({ id: e.playerId, name: e.name })),
  ];

  const describe = (e) => {
    const dur = e.ms ?? now - e.at;
    if (e.kind === "dq") return text("eventLogDq");
    if (e.kind === "hidden") return e.ms == null ? text("eventLogHiddenNow", { s: secs(dur) }) : text("eventLogHidden", { s: secs(dur) });
    return e.ms == null ? text("eventLogDisconnectedNow", { s: secs(dur) }) : text("eventLogDisconnected", { s: secs(dur) });
  };

  const btn = {
    position: "fixed", top: 104, left: 10, zIndex: 999, display: "flex", alignItems: "center", gap: 8,
    padding: "8px 14px", borderRadius: 10, border: `1px solid ${flagged ? "#f5a524" : "rgba(255,255,255,0.25)"}`,
    background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
  };

  if (!open) {
    return (
      <button style={btn} onClick={() => setOpen(true)}>
        <FaGavel /> {text("eventJudges")}{flagged ? ` (${flagged})` : ""}
      </button>
    );
  }

  return (
    <div style={{
      // Left side: alerts (toasts) stack top-right and would cover the close button.
      position: "fixed", top: 0, left: 0, bottom: 0, width: "min(440px, 100vw)", zIndex: 10001, // above the round timer HUD
      background: "#0b1220", color: "#fff", padding: 16, boxSizing: "border-box", overflowY: "auto",
      boxShadow: "8px 0 24px rgba(0,0,0,0.5)", display: "grid", gap: 16, alignContent: "start",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 22 }}><FaGavel /> {text("eventJudges")}</h2>
        <button aria-label="Close" onClick={() => setOpen(false)}
          style={{ background: "transparent", border: "none", color: "#fff", fontSize: 26, cursor: "pointer", display: "flex" }}><FaXmark /></button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r) => {
          const mine = log.filter((e) => e.playerId === r.id);
          const hidden = mine.filter((e) => e.kind === "hidden");
          const dcs = mine.filter((e) => e.kind === "disconnect");
          const total = hidden.reduce((t, e) => t + (e.ms ?? now - e.at), 0);
          const dq = dqIds.has(r.id);
          return (
            <div key={r.id} style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "grid", gap: 6, opacity: dq ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <strong>{r.name}</strong>
                {dq ? (
                  <span style={{ color: "#ff8a8a", fontWeight: 700 }}>{text("eventDisqualifiedLabel")}</span>
                ) : (
                  <button
                    onClick={() => { if (window.confirm(text("eventDisqualifyConfirm", { name: r.name }))) onDisqualify(r.id); }}
                    disabled={gd.state === "waiting"}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #dc3545", background: "rgba(220,53,69,0.2)", color: "#fff", cursor: "pointer", fontWeight: 600 }}
                  >{text("eventDisqualify")}</button>
                )}
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>
                {hidden.length || dcs.length
                  ? text("eventPlayerSummary", { h: hidden.length, s: secs(total), d: dcs.length })
                  : text("eventNoFlags")}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>{text("eventJudgeLog")}</div>
        {log.length === 0 && <div style={{ color: "rgba(255,255,255,0.6)" }}>{text("eventNoFlags")}</div>}
        {[...log].reverse().map((e) => (
          <div key={e.id} style={{ fontSize: 14, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>{clock(e.at)} · R{e.round}</span>{" "}
            <strong>{e.name}</strong> — {describe(e)}
          </div>
        ))}
      </div>
    </div>
  );
}

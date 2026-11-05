import { useState, useEffect } from "react";
import { FaTv, FaXmark } from "react-icons/fa6";
import { useTranslation } from "@/components/useTranslations";
import { EVENT_MODE, eventPlayerNumber } from "@/components/utils/eventMode";

// Event build only: the host's full-screen standings for a projector. Reads
// the same roster scores as the between-rounds leaderboard (playerList.js),
// but lists EVERY player in large type and leaves out the host, who runs the
// game rather than competing.
export default function EventScoreboard({ multiplayerState }) {
  const { t: text } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const gd = multiplayerState?.gameData;
  const shown = EVENT_MODE && !!multiplayerState?.inGame && !!gd?.host && !gd?.public;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!shown) return null;

  const players = [...(gd.finalPlayers ?? gd.players ?? [])]
    .filter((p) => !p.host)
    .sort((a, b) => (b.score - a.score) || (eventPlayerNumber(a.username) - eventPlayerNumber(b.username)));

  const status = gd.state === "end" ? text("gameOver")
    : gd.state === "waiting" ? text("eventWaitingToStart")
    : text("round", { r: Math.min(gd.curRound, gd.rounds), mr: gd.rounds });

  if (!open) {
    return (
      <button
        // Below react-responsive-modal (z 1000) so the party settings modal's
        // Save button is never covered.
        style={{
          position: "fixed", top: 60, left: 10, zIndex: 999, display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}
        onClick={() => setOpen(true)}
      ><FaTv /> {text("projectorView")}</button>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000, background: "#0b1220", color: "#fff",
      display: "flex", flexDirection: "column", padding: "3vh 4vw", overflow: "auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3vh" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vh, 64px)" }}>{text("leaderboard")}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontSize: "clamp(18px, 3vh, 40px)", opacity: 0.8 }}>{status}</span>
          <button
            aria-label="Close"
            style={{ background: "transparent", border: "none", color: "#fff", fontSize: 32, cursor: "pointer", display: "flex" }}
            onClick={() => setOpen(false)}
          ><FaXmark /></button>
        </div>
      </div>
      <ol style={{
        listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "1.2vh",
        gridTemplateColumns: players.length > 12 ? "1fr 1fr" : "1fr", columnGap: "4vw",
      }}>
        {players.map((p, i) => (
          <li key={p.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "1.2vh 1.5vw", borderRadius: 12,
            background: i === 0 ? "#b8860b" : i === 1 ? "#6b7280" : i === 2 ? "#8b5a2b" : "rgba(255,255,255,0.08)",
            fontSize: "clamp(18px, 3.4vh, 44px)", fontWeight: 600,
          }}>
            <span>{i + 1}. {p.username}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(p.score || 0).toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

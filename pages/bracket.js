import Head from 'next/head';
import { useEffect, useState } from 'react';
import { EVENT_MODE } from '@/components/utils/eventMode';
import shuffle from '@/utils/shuffle';

// Event build only: the facilitator's 12-player bracket (single page, no
// server — saved in this browser). Seeds 1-12 are drawn at random; Round 1 is
// 1v2, 3v4 ... 11v12; Round 2 follows the bracket lines (W1v2 vs W3v4, ...);
// the three Round 2 winners play one 3-player Final ranked by total score.
// Disqualification = click the opponent as winner (they advance by default).
const SIZE = 12;
const STORE = 'wg_event_bracket_v1';
const EMPTY = { names: Array(SIZE).fill(''), seeds: null, r1: Array(6).fill(null), r2: Array(3).fill(null), final: {} };

const C = {
  bg: '#0b1220', card: 'rgba(255,255,255,0.06)', line: 'rgba(255,255,255,0.15)',
  win: '#1f7a3f', text: '#fff', dim: 'rgba(255,255,255,0.6)', gold: '#b8860b',
};

function Slot({ seedNo, name, won, lost, onClick }) {
  return (
    <button
      disabled={!name || !onClick}
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left',
        padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.line}`, cursor: name && onClick ? 'pointer' : 'default',
        background: won ? C.win : C.card, color: C.text, opacity: lost ? 0.45 : 1,
        textDecoration: lost ? 'line-through' : 'none', fontSize: 'clamp(14px, 2.2vh, 22px)', fontWeight: 600,
      }}
    >
      <span>{name || '—'}</span>
      {seedNo != null && <span style={{ color: C.dim, fontWeight: 400 }}>Seed {seedNo}</span>}
    </button>
  );
}

function Match({ title, a, b, winner, onPick }) {
  return (
    <div style={{ display: 'grid', gap: 6, padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.line}` }}>
      <div style={{ color: C.dim, fontSize: 13 }}>{title}</div>
      <Slot {...a} won={winner === 0} lost={winner === 1} onClick={a.name && b.name ? () => onPick(winner === 0 ? null : 0) : null} />
      <Slot {...b} won={winner === 1} lost={winner === 0} onClick={a.name && b.name ? () => onPick(winner === 1 ? null : 1) : null} />
    </div>
  );
}

export default function Bracket() {
  const [s, setS] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [podiumOpen, setPodiumOpen] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(STORE); if (raw) setS({ ...EMPTY, ...JSON.parse(raw) }); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {}
  }, [s, loaded]);

  if (!EVENT_MODE) return <p style={{ padding: 24 }}>Not available.</p>;

  const seedOf = (name) => (s.seeds ? s.seeds.indexOf(name) + 1 : null);
  const p = (name) => ({ name, seedNo: name ? seedOf(name) : null });
  const r1Winner = (i) => (s.seeds && s.r1[i] != null ? s.seeds[i * 2 + s.r1[i]] : null);
  const r2Pair = (j) => [r1Winner(j * 2), r1Winner(j * 2 + 1)];
  const r2Winner = (j) => (s.r2[j] != null ? r2Pair(j)[s.r2[j]] : null);
  const finalists = [0, 1, 2].map(r2Winner);
  const finalReady = finalists.every(Boolean);

  // Changing an earlier result clears everything that depended on it.
  const pickR1 = (i, w) => setS((cur) => {
    const r1 = [...cur.r1]; r1[i] = w;
    const r2 = [...cur.r2]; r2[Math.floor(i / 2)] = null;
    return { ...cur, r1, r2, final: {} };
  });
  const pickR2 = (j, w) => setS((cur) => { const r2 = [...cur.r2]; r2[j] = w; return { ...cur, r2, final: {} }; });
  const setFinal = (name, field, value) => setS((cur) => ({ ...cur, final: { ...cur.final, [name]: { ...cur.final[name], [field]: value } } }));

  const ranked = finalReady
    ? finalists
      .filter((n) => !s.final[n]?.dq)
      .map((n) => ({ name: n, score: Number(s.final[n]?.score) }))
      .filter((f) => Number.isFinite(f.score) && s.final[f.name]?.score !== '' && s.final[f.name]?.score != null)
      .sort((a, b) => b.score - a.score)
    : [];
  const tie = ranked.some((f, i) => i > 0 && f.score === ranked[i - 1].score);
  // Podium once every remaining (non-DQ) finalist has a score and no tie.
  const podiumReady = finalReady && !tie && ranked.length > 0
    && ranked.length === finalists.filter((n) => !s.final[n]?.dq).length;

  const filled = s.names.filter((n) => n.trim()).length;
  const unique = new Set(s.names.map((n) => n.trim())).size === SIZE;

  return (
    <>
      <Head>
        <title>Event Bracket</title>
        <style>{`body::before, html::before { display: none !important; } body { background: ${C.bg}; }`}</style>
      </Head>
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '24px 16px', fontFamily: '"Lexend", sans-serif', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gap: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vh, 44px)' }}>GeoGuessr Event Bracket</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              {s.seeds && <button style={btn} onClick={() => setS({ ...s, seeds: null, r1: EMPTY.r1, r2: EMPTY.r2, final: {} })}>Edit names</button>}
              <button style={btn} onClick={() => { if (window.confirm('Clear all names and results?')) setS(EMPTY); }}>Reset</button>
            </div>
          </div>

          {!s.seeds ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, color: C.dim }}>Enter the 12 participants (e.g. &ldquo;Juan Dela Cruz (G10)&rdquo;), then draw the seeds.</p>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {s.names.map((n, i) => (
                  <input key={i} value={n} placeholder={`Participant ${i + 1}`} maxLength={30}
                    onChange={(e) => { const names = [...s.names]; names[i] = e.target.value; setS({ ...s, names }); }}
                    style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.card, color: C.text, fontSize: 16 }} />
                ))}
              </div>
              <div>
                <button style={{ ...btn, background: C.win }} disabled={filled < SIZE || !unique}
                  onClick={() => setS({ ...s, seeds: shuffle(s.names.map((n) => n.trim())) })}>Draw random seeds</button>
                {filled === SIZE && !unique && <span style={{ marginLeft: 12, color: '#ff8a8a' }}>Names must be different.</span>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'start' }}>
              <section style={{ display: 'grid', gap: 10 }}>
                <h2 style={h2}>Round 1 · 3 rounds × 90s</h2>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Match key={i} title={`Match ${i + 1}: Seed ${i * 2 + 1} vs Seed ${i * 2 + 2}`}
                    a={p(s.seeds[i * 2])} b={p(s.seeds[i * 2 + 1])} winner={s.r1[i]} onPick={(w) => pickR1(i, w)} />
                ))}
              </section>
              <section style={{ display: 'grid', gap: 10 }}>
                <h2 style={h2}>Round 2 · 5 rounds × 90s</h2>
                {[0, 1, 2].map((j) => {
                  const [a, b] = r2Pair(j);
                  return <Match key={j} title={`Match ${j + 7}: W${j * 2 + 1} vs W${j * 2 + 2}`}
                    a={p(a)} b={p(b)} winner={s.r2[j]} onPick={(w) => pickR2(j, w)} />;
                })}
              </section>
              <section style={{ display: 'grid', gap: 10 }}>
                <h2 style={h2}>Final · 5 rounds × 60s</h2>
                {finalists.map((n, k) => (
                  <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 10, borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, opacity: s.final[n]?.dq ? 0.45 : 1 }}>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 'clamp(14px, 2.2vh, 22px)' }}>{n || '—'}</span>
                    {n && <>
                      <input type="number" placeholder="Score" value={s.final[n]?.score ?? ''} disabled={!!s.final[n]?.dq}
                        onChange={(e) => setFinal(n, 'score', e.target.value)}
                        style={{ width: 96, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: 'transparent', color: C.text, fontSize: 16 }} />
                      <label style={{ color: C.dim, fontSize: 13, display: 'flex', gap: 4 }}>
                        <input type="checkbox" checked={!!s.final[n]?.dq} onChange={(e) => setFinal(n, 'dq', e.target.checked)} /> DQ
                      </label>
                    </>}
                  </div>
                ))}
                {ranked.length > 0 && (
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    <h2 style={h2}>Results</h2>
                    {ranked.map((f, i) => (
                      <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10,
                        background: [C.gold, '#6b7280', '#8b5a2b'][i] || C.card, fontWeight: 700, fontSize: 'clamp(16px, 2.6vh, 28px)' }}>
                        <span>{['1st · Champion', '2nd', '3rd'][i]} — {f.name}</span>
                        <span>{f.score.toLocaleString()}</span>
                      </div>
                    ))}
                    {tie && <p style={{ margin: 0, color: '#ffcc66' }}>Tied scores — play a tiebreaker match.</p>}
                    {podiumReady && (
                      <button style={{ ...btn, background: C.gold, borderColor: C.gold }} onClick={() => setPodiumOpen(true)}>Show podium</button>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
      {podiumOpen && podiumReady && <Podium ranked={ranked} onClose={() => setPodiumOpen(false)} />}
    </>
  );
}

// Full-screen awards podium for the projector: 2nd | 1st | 3rd. Click, Space
// or → reveals one place at a time (3rd, then 2nd, then the champion);
// Esc closes.
function Podium({ ranked, onClose }) {
  const [step, setStep] = useState(0);
  const n = ranked.length;
  const done = step >= n;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); setStep((v) => Math.min(n, v + 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, onClose]);

  const place = [
    { label: '1st', title: 'Champion', color: C.gold, height: '44vh' },
    { label: '2nd', title: '2nd place', color: '#9ca3af', height: '32vh' },
    { label: '3rd', title: '3rd place', color: '#b87333', height: '24vh' },
  ];
  const shown = (i) => i >= n - step; // 3rd revealed first, champion last

  return (
    <div onClick={() => setStep((v) => Math.min(n, v + 1))} style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'radial-gradient(ellipse at 50% 30%, #1d2a4a 0%, #0b1220 70%)',
      color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
      padding: '3vh 16px 0', boxSizing: 'border-box', cursor: done ? 'default' : 'pointer', userSelect: 'none',
    }}>
      <button aria-label="Close" onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>×</button>
      <h1 style={{ margin: '0 0 auto', paddingTop: '2vh', fontSize: 'clamp(26px, 6vh, 64px)', textAlign: 'center' }}>GeoGuessr Event Winners</h1>
      {!done && <p style={{ margin: '0 0 2vh', color: 'rgba(255,255,255,0.6)' }}>Click to reveal</p>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(8px, 2vw, 28px)', width: '100%', maxWidth: 1100 }}>
        {[1, 0, 2].filter((i) => i < n).map((i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
            <div style={{
              textAlign: 'center', marginBottom: '1.5vh', minHeight: '9vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              opacity: shown(i) ? 1 : 0, transform: shown(i) ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.6s, transform 0.6s',
            }}>
              <div style={{ fontSize: i === 0 ? 'clamp(22px, 5vh, 56px)' : 'clamp(18px, 3.6vh, 40px)', fontWeight: 800, overflowWrap: 'anywhere' }}>{ranked[i].name}</div>
              <div style={{ fontSize: 'clamp(14px, 2.4vh, 26px)', color: 'rgba(255,255,255,0.75)' }}>{place[i].title} · {ranked[i].score.toLocaleString()} pts</div>
            </div>
            <div style={{
              width: '100%', height: place[i].height, background: place[i].color, borderRadius: '12px 12px 0 0',
              display: 'flex', justifyContent: 'center', paddingTop: '2vh', boxSizing: 'border-box',
              fontSize: 'clamp(32px, 9vh, 110px)', fontWeight: 900, color: 'rgba(0,0,0,0.35)',
            }}>{place[i].label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const btn = { padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 15 };
const h2 = { margin: 0, fontSize: 'clamp(16px, 2.4vh, 26px)' };

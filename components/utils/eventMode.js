// School/club competition build (`pnpm dev:event`, NEXT_PUBLIC_EVENT=true).
// One host runs private parties; everyone else only joins by code. No
// accounts, ranked, shop, ads or public matchmaking. The server half is
// EVENT_MODE=true (ws/ws.js), which numbers players "Player 1..N" and,
// when EVENT_HOST_KEY is set, only lets that key create games.
export const EVENT_MODE = process.env.NEXT_PUBLIC_EVENT === "true";

// Host entry: open the site with ?host=<key> (any value when the server has
// no EVENT_HOST_KEY). Without it the home menu only offers "Join Game".
export function getEventHostKey() {
  if (!EVENT_MODE || typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("host");
}

// "Player 7" -> 7, anything else -> Infinity (sorts last).
export function eventPlayerNumber(username) {
  const m = /^Player (\d+)$/.exec(username || "");
  return m ? Number(m[1]) : Infinity;
}

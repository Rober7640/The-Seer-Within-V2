import { useState, useEffect } from "react";
import { Bug, ChevronDown, ChevronUp } from "lucide-react";

interface DebugOverlayProps {
  // Session
  session: {
    id: string;
    personaId: string;
    status: string;
    startedAt: string;
    durationSeconds: number;
    coinsCharged: number;
  } | null;
  // Coins
  coinBalance: number;
  initialCoinBalance: number;
  freeTrialCoins: number;
  elapsedSeconds: number;
  // Continuous timer (never resets mid-session)
  sessionStartTime: number | null;
  // Persona
  selectedPersona: {
    id: string;
    displayName: string;
    coinsPerMinute?: number;
  } | null;
  // Idle
  lastUserMessageAt: number | null;
  // Messages
  messageCount: number;
}

export default function DebugOverlay({
  session,
  coinBalance,
  initialCoinBalance,
  freeTrialCoins,
  elapsedSeconds,
  sessionStartTime,
  selectedPersona,
  lastUserMessageAt,
  messageCount,
}: DebugOverlayProps) {
  const [expanded, setExpanded] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Tick every second so the continuous timer and idle counter stay live
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Continuous timer from session start (never resets mid-session)
  const continuousSeconds = sessionStartTime ? Math.floor((now - sessionStartTime) / 1000) : 0;

  const coinsPerMinute = selectedPersona?.coinsPerMinute ?? 60;
  const coinsUsedContinuous = Math.floor(continuousSeconds / 60) * coinsPerMinute;
  const remainingCoins = Math.max(0, initialCoinBalance - coinsUsedContinuous);
  const cMins = Math.floor(continuousSeconds / 60);
  const cSecs = continuousSeconds % 60;
  const timerDisplay = `${cMins.toString().padStart(2, "0")}:${cSecs.toString().padStart(2, "0")}`;

  // Billing timer (resets on each server response)
  const bMins = Math.floor(elapsedSeconds / 60);
  const bSecs = elapsedSeconds % 60;
  const billingTimerDisplay = `${bMins.toString().padStart(2, "0")}:${bSecs.toString().padStart(2, "0")}`;

  const idleSecs = lastUserMessageAt
    ? Math.floor((now - lastUserMessageAt) / 1000)
    : null;

  // Estimate remaining time in minutes
  const remainingMinutes =
    coinsPerMinute > 0 ? (remainingCoins / coinsPerMinute).toFixed(1) : "N/A";

  return (
    <div className="fixed top-2 right-2 z-[9999] select-none" style={{ fontFamily: "monospace" }}>
      {/* Toggle button */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-900/90 text-yellow-400 text-xs border border-yellow-500/40 hover:border-yellow-400 transition-colors"
      >
        <Bug className="w-3.5 h-3.5" />
        DEBUG
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-1 w-72 rounded-lg bg-gray-950/95 border border-gray-700/60 text-[11px] leading-relaxed shadow-2xl backdrop-blur-sm">
          {/* Timer Section */}
          <div className="px-3 py-2 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Session Time</span>
              <span className={`text-lg font-bold ${session ? "text-green-400" : "text-gray-600"}`}>
                {timerDisplay}
              </span>
            </div>
            <div className="flex justify-between text-gray-500 mt-0.5">
              <span>Since Last Sync</span>
              <span className="text-yellow-300">{billingTimerDisplay}</span>
            </div>
            <div className="flex justify-between text-gray-500 mt-0.5">
              <span>Status</span>
              <span className={session ? "text-green-400" : "text-gray-500"}>
                {session ? `ACTIVE (${session.status})` : "NO SESSION"}
              </span>
            </div>
          </div>

          {/* Coins Section */}
          <div className="px-3 py-2 border-b border-gray-800">
            <div className="text-yellow-400/80 font-semibold mb-1">Coins</div>
            <Row label="Initial Balance" value={initialCoinBalance} color="text-white" />
            <Row label="Server Balance" value={coinBalance} color="text-gray-400" />
            <Row label="Coins Used" value={coinsUsedContinuous} color="text-orange-400" />
            <Row label="Display Balance" value={remainingCoins} color="text-green-400" />
            <Row label="Free Trial Pool" value={freeTrialCoins} color="text-cyan-400" />
            <Row label="Est. Time Left" value={`${remainingMinutes} min`} color="text-emerald-300" />
          </div>

          {/* Persona Section */}
          <div className="px-3 py-2 border-b border-gray-800">
            <div className="text-purple-400/80 font-semibold mb-1">Persona</div>
            <Row
              label="Name"
              value={selectedPersona?.displayName ?? "None"}
              color="text-white"
            />
            <Row
              label="ID"
              value={selectedPersona?.id?.slice(0, 8) ?? "—"}
              color="text-gray-400"
            />
            <Row label="Rate" value={`${coinsPerMinute} coins/min`} color="text-gray-300" />
          </div>

          {/* Session Details */}
          <div className="px-3 py-2 border-b border-gray-800">
            <div className="text-blue-400/80 font-semibold mb-1">Session</div>
            <Row
              label="Session ID"
              value={session?.id?.slice(0, 8) ?? "—"}
              color="text-gray-400"
            />
            <Row
              label="Server Duration"
              value={session ? `${session.durationSeconds}s` : "—"}
              color="text-gray-300"
            />
            <Row
              label="Server Charged"
              value={session ? `${session.coinsCharged} coins` : "—"}
              color="text-gray-300"
            />
            <Row label="Messages" value={messageCount} color="text-gray-300" />
          </div>

          {/* Idle Section */}
          <div className="px-3 py-2">
            <div className="text-red-400/80 font-semibold mb-1">Idle</div>
            <Row
              label="Since Last Msg"
              value={idleSecs !== null ? `${idleSecs}s ago` : "—"}
              color={idleSecs !== null && idleSecs > 120 ? "text-red-400" : "text-gray-300"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}

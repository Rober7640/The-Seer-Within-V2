// Evelyn's face on the shared /offers/upsell/welcome1 + welcome2 chats, so the buyer can see
// it's Evelyn talking to her, not a system. Same look as the V1 /chat header (ChatPage.tsx).
//
// ⛔ /evelyn-avatar.png only. /evelyn-avatar-new.png is a phone screenshot of an error page.

import { Volume2 } from "lucide-react";

export const EVELYN_AVATAR_SRC = "/evelyn-avatar.png";

/** Header: her photo with a green dot, her name, "Online now", and the sound hint. */
export function EvelynChatHeader({ volumeTestId }: { volumeTestId: string }) {
  return (
    <div
      className="relative z-10 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-sm"
      data-testid="header-evelyn"
    >
      {/* pr-12 keeps the name clear of the music toggle pinned top-right. */}
      <div className="mx-auto flex max-w-lg items-center gap-3 pr-12">
        <div className="relative shrink-0">
          <img
            src={EVELYN_AVATAR_SRC}
            alt="Evelyn Cross"
            className="h-11 w-11 rounded-full border-2 border-amber-300/60 object-cover"
            data-testid="img-header-evelyn"
          />
          <span
            className="absolute bottom-0 right-0 h-3 w-3 animate-pulse rounded-full border-2 border-slate-900 bg-emerald-400"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 text-left">
          <p className="font-serif text-lg font-bold leading-tight text-white" data-testid="text-header-name">
            Evelyn Cross
          </p>
          <p className="flex items-center gap-1.5 whitespace-nowrap text-xs text-white/60">
            <span className="font-medium text-emerald-400">Online now</span>
            <span aria-hidden="true">·</span>
            <Volume2 className="h-3.5 w-3.5 shrink-0" data-testid={volumeTestId} />
            <span>Sound on</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The slot to the left of each of Evelyn's rows. `show` = the LAST row of a run of hers, or
 * the typing dots (chat-app style: her face sits at the bottom of what she's saying, so it
 * stays on screen through a long run). The rest get an empty slot of the same width, so a
 * run of bubbles stays in line.
 */
export function EvelynAvatarSlot({ show }: { show: boolean }) {
  return (
    <div className="mr-2 w-8 shrink-0 self-end" aria-hidden={!show}>
      {show && (
        <img
          src={EVELYN_AVATAR_SRC}
          alt="Evelyn"
          className="h-8 w-8 rounded-full border border-amber-300/50 object-cover"
          data-testid="img-bubble-evelyn"
        />
      )}
    </div>
  );
}

type Role = "user" | "bot" | "image";

/**
 * Her row ends a run when the next row is the buyer's, or it's the last row and she isn't
 * typing (while she types, the dots carry the photo).
 */
export function endsEvelynRun(messages: ReadonlyArray<{ role: Role }>, i: number, isTyping: boolean): boolean {
  if (messages[i]?.role === "user") return false;
  const next = messages[i + 1];
  return next ? next.role === "user" : !isTyping;
}

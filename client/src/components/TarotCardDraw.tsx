import { useState } from "react";
import type { TarotCard } from "@/lib/tarotCards";

interface TarotCardDrawProps {
  cards: TarotCard[];
  onCardSelected: (card: TarotCard) => void;
  disabled?: boolean;
}

function CardBack() {
  return (
    <div className="w-full h-full rounded-lg bg-gradient-to-b from-[#1a1040] to-[#0d0824] border border-purple-500/30 flex items-center justify-center">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="10" stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="2 2" />
        <circle cx="18" cy="18" r="6" stroke="#7c3aed" strokeWidth="0.6" />
        {/* 8-point star */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 18 + 14 * Math.cos(rad);
          const y1 = 18 + 14 * Math.sin(rad);
          const x2 = 18 + 5 * Math.cos(rad);
          const y2 = 18 + 5 * Math.sin(rad);
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6d28d9" strokeWidth="0.7" />;
        })}
        <circle cx="18" cy="18" r="2" fill="#a78bfa" opacity="0.8" />
      </svg>
    </div>
  );
}

function TarotCardTile({
  card,
  onSelect,
  disabled,
  selected,
  anySelected,
}: {
  card: TarotCard;
  onSelect: () => void;
  disabled: boolean;
  selected: boolean;
  anySelected: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [imageError, setImageError] = useState(false);

  function handleClick() {
    if (disabled || flipped || anySelected) return;
    setFlipped(true);
    setTimeout(() => {
      onSelect();
      setRevealed(true);
    }, 650);
  }

  const faded = anySelected && !selected;

  // Card expands after reveal
  const cardW = revealed ? 120 : 72;
  const cardH = revealed ? 200 : 120;

  return (
    <div
      className={`shrink-0 transition-opacity duration-500 ${faded ? "opacity-25" : "opacity-100"}`}
      style={{ perspective: "800px" }}
    >
      <div
        onClick={handleClick}
        className={`relative cursor-pointer ${!anySelected && !disabled ? "hover:-translate-y-2 hover:scale-[1.04]" : ""} ${disabled || anySelected ? "cursor-default" : ""}`}
        style={{
          width: cardW,
          height: cardH,
          transition: "width 0.4s ease 0.1s, height 0.4s ease 0.1s, transform 0.3s ease",
        }}
      >
        {/* Flip container */}
        <div
          className="w-full h-full transition-transform duration-[650ms] ease-in-out"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Card back */}
          <div
            className="absolute inset-0"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardBack />
          </div>

          {/* Card front */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden border border-purple-400/40 bg-[#0d0824]"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            {!imageError ? (
              <img
                src={card.imageUrl}
                alt={card.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1a1040] to-[#0d0824] p-2">
                <span className="text-purple-300 text-[11px] text-center font-serif leading-tight">
                  {card.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card name — fades in after flip */}
        <div
          className={`absolute -bottom-5 left-0 right-0 text-center text-[9px] text-purple-300/80 font-medium leading-tight transition-opacity duration-300 ${flipped ? "opacity-100" : "opacity-0"}`}
        >
          {card.name}
        </div>
      </div>
    </div>
  );
}

export default function TarotCardDraw({ cards, onCardSelected, disabled = false }: TarotCardDrawProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  function handleSelect(card: TarotCard) {
    if (selectedId !== null || disabled) return;
    setSelectedId(card.id);
    onCardSelected(card);
  }

  return (
    <div className="mt-3 mb-1">
      <p className="text-[11px] text-purple-400/70 font-medium uppercase tracking-widest mb-3 px-1">
        Choose a card
      </p>
      <div className="flex gap-3 overflow-x-auto pb-8 no-scrollbar px-1 items-end">
        {cards.map((card) => (
          <TarotCardTile
            key={card.id}
            card={card}
            onSelect={() => handleSelect(card)}
            disabled={disabled}
            selected={selectedId === card.id}
            anySelected={selectedId !== null}
          />
        ))}
      </div>
    </div>
  );
}

import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { COINS_PER_MINUTE } from "../../../shared/types";

interface CreditBadgeProps {
  coins: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CreditBadge({
  coins,
  size = "md",
  showLabel = true,
  onClick,
  className,
}: CreditBadgeProps) {
  const getColorClass = () => {
    if (coins > 300) return "text-green-400 border-green-400/30 bg-green-400/10";
    if (coins > 120) return "text-amber-400 border-amber-400/30 bg-amber-400/10";
    return "text-red-400 border-red-400/30 bg-red-400/10";
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-2 py-1 text-xs gap-1";
      case "lg":
        return "px-4 py-2 text-base gap-2";
      default:
        return "px-3 py-1.5 text-sm gap-1.5";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return "w-3 h-3";
      case "lg":
        return "w-5 h-5";
      default:
        return "w-4 h-4";
    }
  };

  const approxMinutes = Math.floor(coins / COINS_PER_MINUTE);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border font-medium transition-colors",
        getColorClass(),
        getSizeClasses(),
        onClick && "cursor-pointer hover:brightness-110",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={`${coins} coins (~${approxMinutes} min)`}
    >
      <Coins className={getIconSize()} />
      {showLabel ? (
        <span>{coins} coins</span>
      ) : (
        <span>{coins}</span>
      )}
    </div>
  );
}

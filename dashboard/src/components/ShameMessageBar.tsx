import type { ShameMessage } from "../api";

interface ShameMessageBarProps {
  message: ShameMessage;
  score: number;
}

function getBarStyle(level: number): string {
  switch (level) {
    case 1: return "bg-green-500/10 border-green-500/30 text-green-400";
    case 2: return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    case 3: return "bg-orange-500/10 border-orange-500/30 text-orange-400";
    case 4: return "bg-red-500/10 border-red-500/30 text-red-400";
    case 5: return "bg-purple-500/10 border-purple-500/30 text-purple-300 animate-shake";
    default: return "bg-gray-500/10 border-gray-500/30 text-gray-400";
  }
}

export function ShameMessageBar({ message, score }: ShameMessageBarProps) {
  return (
    <div className={`border-b ${getBarStyle(message.level)} px-4 py-3`}>
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <span className="text-2xl shrink-0">{message.emoji}</span>
        <p className="text-sm font-medium flex-1">{message.message}</p>
        <span className="text-xs opacity-70 shrink-0">Score: {score}</span>
      </div>
    </div>
  );
}

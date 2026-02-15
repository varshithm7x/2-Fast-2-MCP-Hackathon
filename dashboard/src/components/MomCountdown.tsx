import type { MomCountdown as MomCountdownType } from "../api";
import { useEffect, useState } from "react";

interface MomCountdownProps {
  countdown: MomCountdownType;
}

export function MomCountdown({ countdown }: MomCountdownProps) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!countdown.isActive) return;
    const interval = setInterval(() => setFlash((f) => !f), 500);
    return () => clearInterval(interval);
  }, [countdown.isActive]);

  if (!countdown.isActive) return null;

  return (
    <div className="mom-countdown text-center">
      <div className={`text-4xl mb-2 ${flash ? "opacity-100" : "opacity-50"} transition-opacity`}>
        ☢️
      </div>
      <h3 className="text-red-400 font-bold text-lg mb-1">
        MOM EMAIL COUNTDOWN
      </h3>
      <div className="text-5xl font-mono font-bold text-red-300 mb-2">
        {countdown.minutesRemaining}:{String(0).padStart(2, "0")}
      </div>
      <p className="text-xs text-red-400/80">
        {countdown.warningsSent} warning{countdown.warningsSent !== 1 ? "s" : ""} sent
      </p>
      <p className="text-xs text-gray-500 mt-2">
        Start working to cancel the countdown!
      </p>
    </div>
  );
}

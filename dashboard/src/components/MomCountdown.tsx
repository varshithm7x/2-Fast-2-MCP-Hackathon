import { ProcrastinationScore } from "../api";
import { AlertOctagon } from "lucide-react";
import { cn } from "../lib/utils";

interface MomCountdownProps {
  score: ProcrastinationScore;
  onAdmitDefeat: () => void;
}

export function MomCountdown({ score, onAdmitDefeat }: MomCountdownProps) {
  const isNuclear = score.shameLevel >= 4;
  
  if (!isNuclear) return null;

  return (
     <div className="rounded-xl border border-destructive bg-destructive/10 text-destructive shadow-sm p-6 relative overflow-hidden h-full flex flex-col justify-center">
        <div className="absolute top-0 right-0 p-6 opacity-10">
           <AlertOctagon className="w-24 h-24" />
        </div>
        
        <div className="relative z-10 space-y-4">
           <h3 className="text-lg font-bold flex items-center gap-2">
              <AlertOctagon className="w-5 h-5" />
              ESCALATION PROTOCOL ACTIVE
           </h3>
           <p className="text-sm font-medium">Shame level critical. External notification (Mom) is imminent if productive output does not resume immediately.</p>
           
           <div className="grid grid-cols-2 gap-4 mt-4">
              <button 
                onClick={onAdmitDefeat}
                className="col-span-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors"
               >
                 Admit Defeat (Reset Score)
              </button>
           </div>
        </div>
     </div>
  );
}

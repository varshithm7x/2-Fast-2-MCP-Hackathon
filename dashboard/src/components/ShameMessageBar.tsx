import { ShameMessage } from "../api";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "../lib/utils";

interface ShameMessageBarProps {
  message: ShameMessage | null;
  level: number;
}

export function ShameMessageBar({ message, level }: ShameMessageBarProps) {
  if (!message) return null;

  const isSevere = level >= 4;
  const isNuclear = level >= 5;

  return (
    <div className={cn(
      "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
      isSevere 
        ? "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-destructive/10" 
        : "bg-background text-foreground"
    )}>
      {isNuclear ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <h5 className="mb-1 font-medium leading-none tracking-tight">
        {isNuclear ? "CRITICAL ALERT" : "Status Update"}
      </h5>
      <div className="text-sm [&_p]:leading-relaxed">
        <p className="font-semibold text-lg mb-1">"{message.message}" {message.emoji}</p>
        {message.action && (
          <p className="mt-2 text-muted-foreground font-medium">
             Action Required: <span className="text-foreground underline">{message.action}</span>
          </p>
        )}
      </div>
    </div>
  );
}

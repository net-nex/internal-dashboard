
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <span className="text-2xl md:text-3xl font-black font-headline gradient-text uppercase tracking-wider whitespace-nowrap">Networking Nexus</span>
      <p className="text-muted-foreground mt-1 text-xs tracking-widest uppercase">Join The Nexus</p>
    </div>
  );
}

import { useState, useEffect } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const LAUNCH_DATE = new Date("2025-09-01T00:00:00");

function calcTimeLeft(): TimeLeft {
  const diff = LAUNCH_DATE.getTime() - new Date().getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

interface UnitProps {
  value: number;
  label: string;
}

function Unit({ value, label }: UnitProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl border border-primary/30 bg-card flex items-center justify-center shadow-glow">
          <span className="font-mono text-2xl sm:text-3xl md:text-4xl font-bold text-gradient tabular-nums">
            {String(value).padStart(2, "0")}
          </span>
        </div>
        <div className="absolute inset-0 rounded-xl bg-primary/5 pointer-events-none" />
      </div>
      <span className="mt-2 text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-end gap-3 sm:gap-4 md:gap-6 justify-center" role="timer" aria-live="polite" aria-label="Compte à rebours avant le lancement">
      <Unit value={timeLeft.days} label="Jours" />
      <Separator />
      <Unit value={timeLeft.hours} label="Heures" />
      <Separator />
      <Unit value={timeLeft.minutes} label="Minutes" />
      <Separator />
      <Unit value={timeLeft.seconds} label="Secondes" />
    </div>
  );
}

function Separator() {
  return (
    <div className="mb-8 sm:mb-10 md:mb-12 text-primary/60 font-mono text-2xl sm:text-3xl font-bold leading-none animate-pulse-slow">
      :
    </div>
  );
}

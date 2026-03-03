import { useEffect, useState } from "react";
import logoGenie from "@/assets/logo-genie.png";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1600);
    const removeTimer = setTimeout(() => setVisible(false), 2200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      aria-hidden="true"
      style={{
        background: "hsl(218 30% 6%)",
        transition: "opacity 0.55s ease",
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? "none" : "auto",
      } as React.CSSProperties}
    >
      <div
        className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(235 62% 63% / 0.18) 0%, transparent 70%)",
        }}
      />

      <img
        src={logoGenie}
        alt="GENIE IA"
        className="relative w-48 h-auto animate-splash-scale"
        style={{ filter: "drop-shadow(0 0 32px hsl(235 62% 63% / 0.5))" }}
      />

      <div className="mt-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

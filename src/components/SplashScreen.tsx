import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer   = setTimeout(() => setFadeOut(true),   2000);
    const removeTimer = setTimeout(() => setVisible(false), 2600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0F1C",
        transition: "opacity 0.55s ease",
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? "none" : "auto",
        gap: "2rem",
      }}
    >
      {/* Ambient indigo glow */}
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(82,87,216,0.16) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo text — formetoialia */}
      <div
        style={{
          animation: "splash-fade-scale 0.8s cubic-bezier(0.34,1.3,0.64,1) forwards",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span
            style={{
              fontFamily: "'Orbitron', 'Inter', sans-serif",
              fontSize: 42,
              fontWeight: 900,
              color: "#5257D8",
              letterSpacing: "-1.5px",
              textShadow: "0 0 30px rgba(82,87,216,0.6)",
              lineHeight: 1,
            }}
          >
            formetoi
          </span>
          <span
            style={{
              fontFamily: "'Orbitron', 'Inter', sans-serif",
              fontSize: 42,
              fontWeight: 900,
              color: "#FE2C40",
              letterSpacing: "-1.5px",
              textShadow: "0 0 20px rgba(254,44,64,0.6)",
              lineHeight: 1,
            }}
          >
            alia
          </span>
        </div>

        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.28em",
            color: "#6B7080",
            textTransform: "uppercase",
            marginTop: "0.2rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          La formation qui apprend plus vite que vous
        </span>
      </div>

      {/* K2000 scanner bar */}
      <div
        style={{
          position: "relative",
          width: 240,
          height: 3,
          background: "rgba(254,44,64,0.10)",
          borderRadius: 9999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#FE2C40",
            borderRadius: 9999,
            animation: "splash-bar-pulse 2s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "40%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)",
            animation: "kitt-scan 1.2s ease-in-out infinite",
            borderRadius: 9999,
          }}
        />
      </div>

      {/* Atomic badge */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.15em",
          color: "rgba(82,87,216,0.55)",
          textTransform: "uppercase",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        🇨🇭 Atomic Clock Edition
      </div>
    </div>
  );
}

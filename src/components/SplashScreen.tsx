import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer  = setTimeout(() => setFadeOut(true),  2000);
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
        background: "#13151E",
        transition: "opacity 0.55s ease",
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? "none" : "auto",
        gap: "2rem",
      }}
    >
      {/* Ambient violet glow */}
      <div
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(82,87,216,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo text */}
      <div
        style={{
          animation: "splash-fade-scale 0.8s cubic-bezier(0.34,1.3,0.64,1) forwards",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 56,
              fontWeight: 900,
              color: "#5257D8",
              letterSpacing: "-2px",
              textShadow: "0 0 30px rgba(82,87,216,0.6)",
              lineHeight: 1,
            }}
          >
            GENIE
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 36,
              fontWeight: 800,
              color: "#FE2C40",
              letterSpacing: "-1px",
              textShadow: "0 0 20px rgba(254,44,64,0.6)",
              lineHeight: 1,
            }}
          >
            IA
          </span>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.25em",
            color: "#8B8FA3",
            textTransform: "uppercase",
            marginTop: "0.25rem",
          }}
        >
          Votre copilote intelligent
        </span>
      </div>

      {/* K2000 neon bar */}
      <div
        style={{
          position: "relative",
          width: 240,
          height: 4,
          background: "rgba(254,44,64,0.12)",
          borderRadius: 9999,
          overflow: "hidden",
        }}
      >
        {/* Static pulsing bar */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#FE2C40",
            borderRadius: 9999,
            animation: "splash-bar-pulse 2s ease-in-out infinite",
          }}
        />
        {/* Moving scanner light */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "40%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
            animation: "kitt-scan 1.2s ease-in-out infinite",
            borderRadius: 9999,
          }}
        />
      </div>
    </div>
  );
}

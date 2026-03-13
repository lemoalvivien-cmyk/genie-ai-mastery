/**
 * MagneticCursor — Premium global cursor
 * Blade Runner 2049 x Apple × Formetoialia
 * - Dot inner cursor (mix-blend-difference)
 * - Lagging ring with cyan/red state
 * - Magnetic pull toward buttons/links
 * - Click ripple burst
 * - Micro-haptics via navigator.vibrate
 */
import { useEffect, useRef, useState } from "react";

export function MagneticCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const rippleContainerRef = useRef<HTMLDivElement>(null);

  const pos   = useRef({ x: -100, y: -100 });
  const ring  = useRef({ x: -100, y: -100 });
  const trail = useRef({ x: -100, y: -100 });
  const raf   = useRef<number>(0);

  const [visible, setVisible] = useState(false);
  const [state,   setState]   = useState<"default" | "hover" | "click">("default");

  useEffect(() => {
    // Hide native cursor globally
    document.documentElement.style.cursor = "none";

    const onMove = (e: MouseEvent) => {
      const el  = document.elementFromPoint(e.clientX, e.clientY);
      const mag = el?.closest("button, a, [data-magnetic], input, select, textarea");

      if (mag) {
        const r  = mag.getBoundingClientRect();
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        pos.current = {
          x: e.clientX + (cx - e.clientX) * 0.28,
          y: e.clientY + (cy - e.clientY) * 0.28,
        };
        setState("hover");
      } else {
        pos.current = { x: e.clientX, y: e.clientY };
        setState("default");
      }
      setVisible(true);
    };

    const onDown = () => {
      setState("click");
      // micro-haptics
      if ("vibrate" in navigator) navigator.vibrate(8);
      spawnRipple(pos.current.x, pos.current.y);
    };
    const onUp   = () => setState(s => s === "click" ? "default" : s);
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener("mousemove",  onMove,  { passive: true });
    window.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",    onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    // rAF loop — 60fps
    const tick = () => {
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      ring.current.x  = lerp(ring.current.x,  pos.current.x, 0.09);
      ring.current.y  = lerp(ring.current.y,  pos.current.y, 0.09);
      trail.current.x = lerp(trail.current.x, pos.current.x, 0.05);
      trail.current.y = lerp(trail.current.y, pos.current.y, 0.05);

      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate(${pos.current.x - 4}px, ${pos.current.y - 4}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate(${ring.current.x - 18}px, ${ring.current.y - 18}px)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform =
          `translate(${trail.current.x - 28}px, ${trail.current.y - 28}px)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      document.documentElement.style.cursor = "";
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mouseup",    onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const spawnRipple = (x: number, y: number) => {
    const container = rippleContainerRef.current;
    if (!container) return;
    const el = document.createElement("div");
    el.style.cssText = `
      position:fixed; top:${y}px; left:${x}px;
      width:8px; height:8px; border-radius:50%;
      background:rgba(0,240,255,0.6);
      transform:translate(-50%,-50%) scale(1);
      pointer-events:none; z-index:9997;
      animation: cursor-ripple 0.55s ease-out forwards;
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 600);
  };

  /* colour maps */
  const dotColor  = state === "click" ? "#FE2C40" : state === "hover" ? "#00F0FF" : "#ffffff";
  const ringColor = state === "hover" ? "rgba(0,240,255,0.55)" : state === "click" ? "rgba(254,44,64,0.55)" : "rgba(255,255,255,0.25)";
  const ringScale = state === "hover" ? 1.55 : state === "click" ? 0.65 : 1;
  const trailOp   = state === "hover" ? 0.35 : 0.12;

  return (
    <>
      {/* Keyframe injected once */}
      <style>{`
        @keyframes cursor-ripple {
          0%   { transform: translate(-50%,-50%) scale(1);  opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(9);  opacity: 0; }
        }
      `}</style>

      <div ref={rippleContainerRef} className="pointer-events-none" />

      {/* Outer trail — ghost blob */}
      <div
        ref={trailRef}
        className="fixed top-0 left-0 pointer-events-none z-[9996]"
        style={{
          width: 56, height: 56,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ringColor.replace("0.55","0.18")} 0%, transparent 70%)`,
          opacity: visible ? trailOp : 0,
          transition: "opacity 0.4s, background 0.2s",
          willChange: "transform",
          filter: "blur(6px)",
        }}
      />

      {/* Mid ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998]"
        style={{
          width: 36, height: 36,
          borderRadius: "50%",
          border: `1.5px solid ${ringColor}`,
          opacity: visible ? 1 : 0,
          transform: `scale(${ringScale})`,
          transition: "border-color 0.18s, opacity 0.25s, transform 0.25s cubic-bezier(0.34,1.6,0.64,1)",
          willChange: "transform",
          backdropFilter: state === "hover" ? "blur(2px)" : "none",
        }}
      />

      {/* Inner dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          width: 8, height: 8,
          borderRadius: "50%",
          background: dotColor,
          opacity: visible ? 1 : 0,
          transition: "background 0.15s, opacity 0.2s",
          mixBlendMode: "difference",
          willChange: "transform",
          boxShadow: state === "hover"
            ? "0 0 12px 2px rgba(0,240,255,0.7)"
            : state === "click"
              ? "0 0 16px 4px rgba(254,44,64,0.8)"
              : "none",
        }}
      />
    </>
  );
}

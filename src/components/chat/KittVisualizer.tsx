import { useEffect, useRef, useCallback } from "react";

export type KittState = "idle" | "listening" | "thinking" | "speaking";

interface KittVisualizerProps {
  state: KittState;
  analyserNode?: AnalyserNode | null;
}

const W = 220;
const H = 44;

export default function KittVisualizer({ state, analyserNode }: KittVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef(0);       // 0..1 position of the glow center
  const dirRef = useRef(1);
  const tRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const analyserRef = useRef(analyserNode);
  analyserRef.current = analyserNode;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const st = stateRef.current;
    const analyser = analyserRef.current;

    tRef.current += 1;

    // Speed: faster when speaking/listening, slow idle
    const speed =
      st === "speaking"  ? 0.018 :
      st === "listening" ? 0.014 :
      st === "thinking"  ? 0.010 :
                           0.005;

    posRef.current += dirRef.current * speed;
    if (posRef.current >= 1) { posRef.current = 1; dirRef.current = -1; }
    if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; }

    // Get audio vol
    let vol = 0;
    if (analyser && (st === "speaking" || st === "listening")) {
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf as unknown as Uint8Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      vol = sum / buf.length / 128; // 0..1
    }

    ctx.clearRect(0, 0, W, H);

    const cx = posRef.current * W;
    const cy = H / 2;

    // Base dark track
    ctx.fillStyle = "rgba(254,44,64,0.06)";
    ctx.beginPath();
    ctx.roundRect(0, cy - 2, W, 4, 2);
    ctx.fill();

    // Glow trail gradient — wide halo
    const trailGrad = ctx.createLinearGradient(0, 0, W, 0);
    const glowW = st === "speaking" ? 0.55 : st === "listening" ? 0.45 : 0.35;
    const p = posRef.current;
    const left  = Math.max(0, p - glowW);
    const right = Math.min(1, p + glowW);
    trailGrad.addColorStop(left,  "rgba(254,44,64,0)");
    trailGrad.addColorStop(Math.max(left, p - 0.05), "rgba(254,44,64,0.15)");
    trailGrad.addColorStop(p,     "rgba(254,44,64,0.55)");
    trailGrad.addColorStop(Math.min(right, p + 0.05), "rgba(254,44,64,0.15)");
    trailGrad.addColorStop(right, "rgba(254,44,64,0)");
    ctx.fillStyle = trailGrad;
    ctx.beginPath();
    ctx.roundRect(0, cy - 3, W, 6, 3);
    ctx.fill();

    // Core bar — bright neon line
    const coreGrad = ctx.createLinearGradient(0, 0, W, 0);
    coreGrad.addColorStop(Math.max(0, p - 0.12), "rgba(254,44,64,0)");
    coreGrad.addColorStop(Math.max(0, p - 0.04), "rgba(254,44,64,0.8)");
    coreGrad.addColorStop(p,                      "#FE2C40");
    coreGrad.addColorStop(Math.min(1, p + 0.04), "rgba(254,44,64,0.8)");
    coreGrad.addColorStop(Math.min(1, p + 0.12), "rgba(254,44,64,0)");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.roundRect(0, cy - 1.5, W, 3, 1.5);
    ctx.fill();

    // Hot center dot with glow
    const dotR = st === "speaking" ? 5 + vol * 4 : st === "idle" ? 3 : 4;
    const radialGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3.5);
    radialGrad.addColorStop(0, "rgba(255,255,255,0.95)");
    radialGrad.addColorStop(0.3, "#FE2C40");
    radialGrad.addColorStop(1, "rgba(254,44,64,0)");
    ctx.fillStyle = radialGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, dotR * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Hard dot
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#FE2C40";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Equalizer bars during speaking/listening (overlay)
    if (st === "speaking" || st === "listening") {
      const BAR_COUNT = 18;
      const barW = (W - 4) / (BAR_COUNT * 2 - 1);
      for (let i = 0; i < BAR_COUNT; i++) {
        const bx = 2 + i * barW * 2;
        const noise = Math.sin(tRef.current * 0.09 + i * 0.6) * 0.5 + 0.5;
        const bh = 4 + noise * (10 + vol * 14);
        const by = cy - bh / 2;
        const distToCenter = Math.abs(bx + barW / 2 - cx) / (W / 2);
        const alpha = 0.12 + (1 - distToCenter) * 0.25 + vol * 0.15;
        ctx.fillStyle = `rgba(254,44,64,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(bx, by, barW, bh, 1);
        ctx.fill();
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const stateLabel =
    state === "idle"      ? "EN VEILLE" :
    state === "listening" ? "J'ÉCOUTE…" :
    state === "thinking"  ? "JE RÉFLÉCHIS…" :
                            "KITT PARLE";

  const isActive = state !== "idle";

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div
        className="relative flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all duration-500"
        style={{
          background: isActive
            ? "linear-gradient(145deg, rgba(254,44,64,0.07) 0%, rgba(26,29,46,0.95) 100%)"
            : "rgba(26,29,46,0.8)",
          border: `1px solid ${isActive ? "rgba(254,44,64,0.35)" : "rgba(255,255,255,0.06)"}`,
          boxShadow: isActive
            ? "0 0 28px rgba(254,44,64,0.2), inset 0 1px 0 rgba(254,44,64,0.1)"
            : "none",
        }}
      >
        {/* Corner decorations */}
        <div className="absolute top-1.5 left-2 w-2 h-2 border-l border-t rounded-tl" style={{ borderColor: "rgba(254,44,64,0.5)" }} />
        <div className="absolute top-1.5 right-2 w-2 h-2 border-r border-t rounded-tr" style={{ borderColor: "rgba(254,44,64,0.5)" }} />
        <div className="absolute bottom-1.5 left-2 w-2 h-2 border-l border-b rounded-bl" style={{ borderColor: "rgba(254,44,64,0.5)" }} />
        <div className="absolute bottom-1.5 right-2 w-2 h-2 border-r border-b rounded-br" style={{ borderColor: "rgba(254,44,64,0.5)" }} />

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: "block" }}
          aria-label={`KITT – ${stateLabel}`}
        />

        <span
          className="tracking-[0.2em] uppercase font-mono transition-all duration-300"
          style={{
            fontSize: 8,
            color: isActive ? "#FE2C40" : "rgba(255,255,255,0.2)",
            textShadow: isActive ? "0 0 8px rgba(254,44,64,0.7)" : "none",
          }}
        >
          {stateLabel}
        </span>
      </div>
    </div>
  );
}

import { useEffect, useRef, useCallback } from "react";

export type KittState = "idle" | "listening" | "thinking" | "speaking";

interface KittVisualizerProps {
  state: KittState;
  analyserNode?: AnalyserNode | null;
}

const BAR_COUNT = 20;
const BAR_W = 5;
const BAR_GAP = 3;
const MAX_H = 36;

const STATE_CONFIG: Record<KittState, {
  active: string; mid: string; base: string;
  glow: string; label: string;
}> = {
  idle:      { active: "#ef4444", mid: "#7f1d1d", base: "#2c0a0a", glow: "#ef444440", label: "EN VEILLE" },
  listening: { active: "#818cf8", mid: "#3730a3", base: "#1e1b4b", glow: "#818cf850", label: "J'ÉCOUTE…" },
  thinking:  { active: "#f97316", mid: "#9a3412", base: "#3a1a07", glow: "#f9731650", label: "JE RÉFLÉCHIS…" },
  speaking:  { active: "#ef4444", mid: "#991b1b", base: "#450a0a", glow: "#ef444460", label: "JARVIS PARLE" },
};

export default function KittVisualizer({ state, analyserNode }: KittVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const scanRef   = useRef(0);
  const dirRef    = useRef(1);
  const pulseRef  = useRef(0);
  const stateRef  = useRef(state);
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
    const cfg = STATE_CONFIG[st];

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background subtle grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 8) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const totalW = BAR_COUNT * BAR_W + (BAR_COUNT - 1) * BAR_GAP;
    const startX = (W - totalW) / 2;

    // Get frequency data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let freqData: any = null;
    if (analyser && (st === "listening" || st === "speaking")) {
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf as unknown as Uint8Array<ArrayBuffer>);
      freqData = buf;
    }

    pulseRef.current += 0.04;

    // Scanner advance for speaking
    if (st === "speaking") {
      scanRef.current += dirRef.current * 0.25;
      if (scanRef.current >= BAR_COUNT - 1) { scanRef.current = BAR_COUNT - 1; dirRef.current = -1; }
      if (scanRef.current <= 0) { scanRef.current = 0; dirRef.current = 1; }
    }

    for (let i = 0; i < BAR_COUNT; i++) {
      const x = startX + i * (BAR_W + BAR_GAP);
      let barH = MAX_H * 0.15;
      let alpha = 0.4;
      let glowR = 0;

      if (st === "idle") {
        const p = 0.4 + 0.2 * Math.sin(pulseRef.current * 0.4 + i * 0.3);
        barH = MAX_H * 0.12 * p + MAX_H * 0.04;
        alpha = 0.3 + 0.2 * p;
        ctx.fillStyle = cfg.base;
      } else if (st === "thinking") {
        // Cascading wave
        const wave = 0.5 + 0.5 * Math.sin(pulseRef.current * 1.5 - i * 0.35);
        barH = MAX_H * 0.25 + MAX_H * 0.55 * wave;
        alpha = 0.5 + 0.5 * wave;
        glowR = wave * 0.6;
        ctx.fillStyle = wave > 0.7 ? cfg.active : cfg.mid;
      } else if (st === "listening" && freqData) {
        const bin = Math.floor((i / BAR_COUNT) * (freqData.length / 4));
        const vol = freqData[bin] / 255;
        // Symmetric / mirror effect
        const sym = i < BAR_COUNT / 2 ? i : BAR_COUNT - 1 - i;
        const symNorm = sym / (BAR_COUNT / 2);
        barH = MAX_H * 0.18 + MAX_H * 0.7 * vol * (0.5 + 0.5 * symNorm);
        alpha = 0.5 + 0.5 * vol;
        glowR = vol;
        ctx.fillStyle = vol > 0.5 ? cfg.active : cfg.mid;
      } else if (st === "speaking") {
        // Classic KITT scanner sweep
        const dist = Math.abs(i - scanRef.current);
        if (dist < 0.6) {
          barH = MAX_H;
          alpha = 1;
          glowR = 1;
          ctx.fillStyle = cfg.active;
        } else if (dist < 2.5) {
          const t = 1 - dist / 2.5;
          barH = MAX_H * (0.4 + 0.6 * t);
          alpha = 0.4 + 0.6 * t;
          glowR = t * 0.8;
          ctx.fillStyle = cfg.mid;
        } else if (dist < 4) {
          const t = 1 - dist / 4;
          barH = MAX_H * (0.2 + 0.2 * t);
          alpha = 0.2 + 0.2 * t;
          ctx.fillStyle = cfg.base;
        } else {
          barH = MAX_H * 0.15;
          alpha = 0.25;
          ctx.fillStyle = cfg.base;
        }
        // Overlay audio if available
        if (freqData) {
          const bin = Math.floor((i / BAR_COUNT) * (freqData.length / 4));
          const vol = freqData[bin] / 255;
          barH = Math.max(barH, MAX_H * 0.15 + MAX_H * 0.35 * vol);
        }
      } else {
        ctx.fillStyle = cfg.base;
      }

      const y = (H - barH) / 2;
      ctx.globalAlpha = alpha;

      // Draw bar
      ctx.beginPath();
      ctx.roundRect(x, y, BAR_W, barH, 2);
      ctx.fill();

      // Glow layer
      if (glowR > 0.1) {
        ctx.save();
        ctx.shadowColor = cfg.active;
        ctx.shadowBlur = 10 * glowR;
        ctx.globalAlpha = alpha * glowR;
        ctx.fillStyle = cfg.active;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_W, barH, 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    }

    // Horizontal center line (KITT "spine")
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = cfg.active;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(startX - 6, H / 2);
    ctx.lineTo(startX + totalW + 6, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const cfg = STATE_CONFIG[state];
  const totalW = BAR_COUNT * BAR_W + (BAR_COUNT - 1) * BAR_GAP + 32;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Main visualizer panel */}
      <div
        className="relative flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl border transition-all duration-500"
        style={{
          background: `radial-gradient(ellipse at 50% 120%, ${cfg.glow} 0%, transparent 70%), hsl(var(--background) / 0.95)`,
          borderColor: state !== "idle" ? `${cfg.active}50` : "hsl(var(--border) / 0.3)",
          boxShadow: state !== "idle"
            ? `0 0 24px 4px ${cfg.glow}, inset 0 1px 0 ${cfg.active}20`
            : "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Corner decorations */}
        <div className="absolute top-1.5 left-2 w-2 h-2 border-l border-t rounded-tl" style={{ borderColor: `${cfg.active}60` }} />
        <div className="absolute top-1.5 right-2 w-2 h-2 border-r border-t rounded-tr" style={{ borderColor: `${cfg.active}60` }} />
        <div className="absolute bottom-1.5 left-2 w-2 h-2 border-l border-b rounded-bl" style={{ borderColor: `${cfg.active}60` }} />
        <div className="absolute bottom-1.5 right-2 w-2 h-2 border-r border-b rounded-br" style={{ borderColor: `${cfg.active}60` }} />

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={totalW}
          height={48}
          style={{ display: "block" }}
          aria-label={`KITT – ${cfg.label}`}
        />

        {/* State label */}
        <span
          className="tracking-[0.2em] uppercase font-mono transition-colors duration-300"
          style={{
            fontSize: 8,
            color: state !== "idle" ? cfg.active : "rgba(255,255,255,0.2)",
            textShadow: state !== "idle" ? `0 0 8px ${cfg.active}80` : "none",
          }}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

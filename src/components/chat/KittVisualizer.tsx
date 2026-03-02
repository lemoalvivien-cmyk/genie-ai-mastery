import { useEffect, useRef, useCallback } from "react";

export type KittState = "idle" | "listening" | "speaking" | "thinking";

interface KittVisualizerProps {
  state: KittState;
  analyserNode?: AnalyserNode | null;
}

const BAR_COUNT = 15;
const BAR_WIDTH = 4;
const BAR_GAP = 2;
const BAR_HEIGHT = 20;

// Colors per state
const STATE_COLORS: Record<KittState, { active: string; base: string; mid: string }> = {
  idle:      { active: "#EF4444", mid: "#991B1B", base: "#450a0a" },
  listening: { active: "#6366F1", mid: "#4338CA", base: "#1e1b4b" },
  speaking:  { active: "#EF4444", mid: "#991B1B", base: "#450a0a" },
  thinking:  { active: "#F97316", mid: "#C2410C", base: "#431407" },
};

export default function KittVisualizer({ state, analyserNode }: KittVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const scanPosRef = useRef(0);
  const scanDirRef = useRef(1);
  const pulseRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const colors = STATE_COLORS[state];
    const totalBarWidth = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP;
    const startX = (W - totalBarWidth) / 2;

    // Get frequency data for listening state
      let freqData: Uint8Array<ArrayBuffer> | null = null;
      if (analyserNode && (state === "listening" || state === "speaking")) {
        freqData = new Uint8Array(analyserNode.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        analyserNode.getByteFrequencyData(freqData);
      }

    // Update scanner position for speaking/idle
    if (state === "speaking") {
      scanPosRef.current += scanDirRef.current * 0.18;
      if (scanPosRef.current >= BAR_COUNT - 1) { scanPosRef.current = BAR_COUNT - 1; scanDirRef.current = -1; }
      if (scanPosRef.current <= 0) { scanPosRef.current = 0; scanDirRef.current = 1; }
    }

    // Pulse for thinking
    pulseRef.current += 0.05;

    for (let i = 0; i < BAR_COUNT; i++) {
      const x = startX + i * (BAR_WIDTH + BAR_GAP);

      let barH = BAR_HEIGHT;
      let color = colors.base;
      let glow = 0;

      if (state === "idle") {
        // Subtle slow pulse
        const pulse = 0.5 + 0.2 * Math.sin(pulseRef.current * 0.5);
        barH = BAR_HEIGHT * 0.5 * pulse;
        color = colors.base;
        ctx.globalAlpha = pulse;
      } else if (state === "thinking") {
        // All bars pulse together
        const pulse = 0.5 + 0.5 * Math.abs(Math.sin(pulseRef.current));
        barH = BAR_HEIGHT * 0.6 * pulse + BAR_HEIGHT * 0.2;
        color = colors.active;
        ctx.globalAlpha = 0.6 + 0.4 * pulse;
      } else if (state === "listening" && freqData) {
        // Wave shape from audio
        const binIndex = Math.floor((i / BAR_COUNT) * (freqData.length / 4));
        const sym = Math.abs(i - (BAR_COUNT - 1) / 2) / ((BAR_COUNT - 1) / 2);
        const vol = freqData[binIndex] / 255;
        barH = (BAR_HEIGHT * 0.3) + (BAR_HEIGHT * 0.7) * vol * (1 - sym * 0.5);
        color = colors.active;
        glow = vol;
        ctx.globalAlpha = 0.6 + 0.4 * vol;
      } else if (state === "speaking") {
        // KITT scanner
        const dist = Math.abs(i - scanPosRef.current);
        if (dist < 0.5) {
          color = colors.active;
          glow = 1;
          barH = BAR_HEIGHT;
        } else if (dist < 2) {
          const t = 1 - dist / 2;
          color = colors.mid;
          barH = BAR_HEIGHT * (0.5 + 0.5 * t);
          glow = 0.4 * t;
        } else {
          color = colors.base;
          barH = BAR_HEIGHT * 0.4;
        }

        // Overlay audio reactivity if available
        if (freqData) {
          const binIndex = Math.floor((i / BAR_COUNT) * (freqData.length / 4));
          const vol = freqData[binIndex] / 255;
          barH = Math.max(barH, BAR_HEIGHT * 0.3 + BAR_HEIGHT * 0.4 * vol);
        }

        ctx.globalAlpha = 1;
      }

      // Draw bar
      ctx.fillStyle = color;
      const y = (H - barH) / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, BAR_WIDTH, barH, 1);
      ctx.fill();

      // Glow effect
      if (glow > 0) {
        ctx.shadowColor = colors.active;
        ctx.shadowBlur = 8 * glow;
        ctx.fillStyle = colors.active;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, barH, 1);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [state, analyserNode]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const totalW = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP + 32;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex items-center justify-center rounded-full border border-border/30"
        style={{
          background: "hsl(var(--background) / 0.9)",
          padding: "5px 10px",
          boxShadow: state !== "idle" ? `0 0 16px 2px ${STATE_COLORS[state].active}40` : "none",
          transition: "box-shadow 0.4s ease",
        }}
      >
        <canvas
          ref={canvasRef}
          width={totalW}
          height={30}
          style={{ display: "block" }}
          aria-label={`KITT visualizer – état : ${state}`}
        />
      </div>
      <span
        className="text-muted-foreground/50 tracking-widest uppercase select-none"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}
      >
        GENIE
      </span>
    </div>
  );
}

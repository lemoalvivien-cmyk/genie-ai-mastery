/**
 * KittAvatarCanvas — Animated AI face with Canvas lip-sync
 * Driven by Web Audio AnalyserNode for real-time phoneme approximation.
 * States: idle | listening | thinking | speaking
 */
import { useEffect, useRef, useCallback } from "react";
import type { KittState } from "@/components/chat/KittVisualizer";

interface Props {
  state: KittState;
  analyserNode?: AnalyserNode | null;
  size?: number;
}

// ── Phoneme helpers ──────────────────────────────────────────────────────────
function getMouthOpenness(analyser: AnalyserNode | null, state: KittState, t: number): number {
  if (state === "idle" || state === "thinking") return 0;
  if (state === "listening") {
    // Soft breathing pulse
    return 0.06 + Math.sin(t * 0.05) * 0.04;
  }
  // speaking — sample low-freq energy (100-600 Hz ≈ formant 1)
  if (!analyser) return 0.25 + Math.sin(t * 0.12) * 0.15;

  const buf = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(buf as unknown as Uint8Array<ArrayBuffer>);
  // bins 2-8 ≈ fundamental voice frequency at 44.1kHz / fftSize 64
  let sum = 0;
  const lo = 2, hi = Math.min(10, buf.length);
  for (let i = lo; i < hi; i++) sum += buf[i];
  const energy = sum / ((hi - lo) * 255);
  return Math.min(1, 0.08 + energy * 0.92);
}

function getEyeBlink(t: number): boolean {
  // Blink every ~4 seconds for ~80ms
  const cycle = t % 240;
  return cycle < 5;
}

export default function KittAvatarCanvas({ state, analyserNode, size = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const tRef      = useRef(0);
  const stateRef  = useRef(state);
  const analyserRef = useRef(analyserNode);
  stateRef.current  = state;
  analyserRef.current = analyserNode;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const st  = stateRef.current;
    const t   = tRef.current;
    tRef.current += 1;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R  = W * 0.38;

    // ── Colors by state ──────────────────────────────────────────────────────
    const accent =
      st === "speaking"  ? "#FE2C40" :
      st === "listening" ? "#10B981" :
      st === "thinking"  ? "#8B5CF6" :
                           "#5257D8";

    const glowAlpha = st === "idle" ? 0.12 : 0.35;

    ctx.clearRect(0, 0, W, H);

    // ── Outer ring glow ──────────────────────────────────────────────────────
    const pulse = 1 + (st !== "idle" ? Math.sin(t * 0.08) * 0.015 : 0);
    const outerR = R * 1.18 * pulse;

    const outerGlow = ctx.createRadialGradient(cx, cy, outerR * 0.7, cx, cy, outerR);
    outerGlow.addColorStop(0, `${accent}${Math.round(glowAlpha * 255).toString(16).padStart(2, "0")}`);
    outerGlow.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    // Rotating dashed ring (thinking animation)
    if (st === "thinking") {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.025);
      ctx.setLineDash([8, 10]);
      ctx.strokeStyle = `${accent}60`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ── Face circle ──────────────────────────────────────────────────────────
    const faceGrad = ctx.createRadialGradient(cx, cy - R * 0.15, 0, cx, cy, R);
    faceGrad.addColorStop(0, "#1E2240");
    faceGrad.addColorStop(1, "#0D0F1E");
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = faceGrad;
    ctx.fill();

    // Border ring
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = st === "idle" ? "rgba(255,255,255,0.12)" : `${accent}88`;
    ctx.lineWidth = st === "idle" ? 1 : 2;
    ctx.stroke();

    // ── Scan line (speaking) ──────────────────────────────────────────────────
    if (st === "speaking" || st === "listening") {
      const scanY = cy - R + ((t * (st === "speaking" ? 2 : 1.2)) % (R * 2));
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      const scanGrad = ctx.createLinearGradient(cx - R, scanY - 2, cx - R, scanY + 2);
      scanGrad.addColorStop(0, "transparent");
      scanGrad.addColorStop(0.5, `${accent}22`);
      scanGrad.addColorStop(1, "transparent");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(cx - R, scanY - 2, R * 2, 4);
      ctx.restore();
    }

    // ── Eyebrows ──────────────────────────────────────────────────────────────
    const browY   = cy - R * 0.38;
    const browOff = cx * 0.28;
    const browAngle = st === "thinking" ? 0.12 : st === "speaking" ? 0 : 0.04;

    ctx.save();
    ctx.strokeStyle = st === "idle" ? "rgba(255,255,255,0.45)" : "#fff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    // Left brow
    ctx.save();
    ctx.translate(cx - browOff, browY);
    ctx.rotate(-browAngle);
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();
    ctx.restore();

    // Right brow
    ctx.save();
    ctx.translate(cx + browOff, browY);
    ctx.rotate(browAngle);
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // ── Eyes ─────────────────────────────────────────────────────────────────
    const eyeY    = cy - R * 0.14;
    const eyeOffX = cx * 0.28;
    const blink   = getEyeBlink(t);

    for (const side of [-1, 1]) {
      const ex = cx + side * eyeOffX;

      if (blink) {
        // Blink — thin line
        ctx.save();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ex - 9, eyeY);
        ctx.lineTo(ex + 9, eyeY);
        ctx.stroke();
        ctx.restore();
      } else {
        // Eye white + iris
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Iris
        const irisGrad = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, 5);
        irisGrad.addColorStop(0, accent);
        irisGrad.addColorStop(0.6, `${accent}cc`);
        irisGrad.addColorStop(1, "#000");
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(ex, eyeY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(ex, eyeY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Glint
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(ex + 2, eyeY - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // HUD scanlines in iris when active
        if (st !== "idle") {
          ctx.save();
          ctx.beginPath();
          ctx.arc(ex, eyeY, 5, 0, Math.PI * 2);
          ctx.clip();
          ctx.strokeStyle = `${accent}55`;
          ctx.lineWidth = 0.5;
          for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(ex - 5, eyeY + i * 1.6);
            ctx.lineTo(ex + 5, eyeY + i * 1.6);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }

    // ── Nose (minimal HUD indicator) ─────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(cx, cy + R * 0.08, 2, 0, Math.PI * 2);
    ctx.fill();

    // ── Mouth / Lip-sync ──────────────────────────────────────────────────────
    const mouthY  = cy + R * 0.32;
    const mouthW  = R * 0.55;
    const openness = getMouthOpenness(analyserRef.current, st, t);
    const mouthH  = 4 + openness * R * 0.4;

    // Mouth outline
    ctx.save();
    ctx.translate(cx, mouthY);

    // Upper lip
    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.5, 0);
    ctx.bezierCurveTo(
      -mouthW * 0.25, -mouthH * 0.5,
       mouthW * 0.25, -mouthH * 0.5,
       mouthW * 0.5, 0
    );
    // Lower lip
    ctx.bezierCurveTo(
       mouthW * 0.35, mouthH,
      -mouthW * 0.35, mouthH,
      -mouthW * 0.5, 0
    );
    ctx.closePath();

    // Mouth fill gradient
    const mouthGrad = ctx.createLinearGradient(0, -mouthH * 0.5, 0, mouthH);
    if (openness > 0.1) {
      mouthGrad.addColorStop(0, "#0a0b14");
      mouthGrad.addColorStop(1, "#1a0005");
    } else {
      mouthGrad.addColorStop(0, accent + "44");
      mouthGrad.addColorStop(1, accent + "22");
    }
    ctx.fillStyle = mouthGrad;
    ctx.fill();

    // Mouth border
    ctx.strokeStyle = openness > 0.05 ? accent : `${accent}66`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Teeth hint when wide open
    if (openness > 0.4) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(-mouthW * 0.32, 0, mouthW * 0.64, mouthH * 0.28);
    }

    ctx.restore();

    // ── Corner HUD brackets ───────────────────────────────────────────────────
    const corners = [
      [-R * 0.82, -R * 0.82, 1, 1],
      [ R * 0.82, -R * 0.82, -1, 1],
      [-R * 0.82,  R * 0.82, 1, -1],
      [ R * 0.82,  R * 0.82, -1, -1],
    ];
    ctx.strokeStyle = st === "idle" ? "rgba(255,255,255,0.12)" : `${accent}55`;
    ctx.lineWidth = 1;
    const bLen = R * 0.18;
    for (const [bx, by, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + bx + sx * bLen, cy + by);
      ctx.lineTo(cx + bx, cy + by);
      ctx.lineTo(cx + bx, cy + by + sy * bLen);
      ctx.stroke();
    }

    // ── State badge ───────────────────────────────────────────────────────────
    if (st !== "idle") {
      const label =
        st === "speaking"  ? "TTS ▶" :
        st === "listening" ? "STT ●" :
                             "THINK";
      ctx.fillStyle = `${accent}22`;
      ctx.strokeStyle = `${accent}55`;
      ctx.lineWidth = 1;
      const badgeW = 46, badgeH = 14;
      const bx = cx - badgeW / 2;
      const by2 = cy + R * 0.7;
      ctx.beginPath();
      ctx.roundRect(bx, by2, badgeW, badgeH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.font = `bold 8px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(label, cx, by2 + badgeH * 0.72);
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-label={`KITT Avatar — ${state}`}
      style={{ display: "block" }}
    />
  );
}

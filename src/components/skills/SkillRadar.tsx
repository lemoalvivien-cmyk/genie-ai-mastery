import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { RadarPoint } from "@/hooks/useSkills";

interface Props {
  data: RadarPoint[];
  size?: number;
}

export function SkillRadar({ data, size = 260 }: Props) {
  const hasAnyScore = data.some((d) => d.score > 0);

  return (
    <div style={{ width: size, height: size }} className="mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => [`${v}%`, "Score"]}
          />
          <Radar
            name="Compétences"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={hasAnyScore ? 0.18 : 0}
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

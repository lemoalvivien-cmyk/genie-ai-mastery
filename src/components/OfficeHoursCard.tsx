import { MessageCircle, Video, Crown } from "lucide-react";
import vivienPhoto from "@/assets/vivien-lemoal.png";

export function OfficeHoursCard() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden p-px"
      style={{
        background: "linear-gradient(135deg, rgba(212,175,55,0.6) 0%, rgba(212,175,55,0.15) 40%, rgba(212,175,55,0.05) 60%, rgba(212,175,55,0.5) 100%)",
      }}
    >
      {/* Inner card */}
      <div
        className="relative rounded-2xl p-8"
        style={{
          background: "linear-gradient(135deg, rgba(10,11,20,0.97) 0%, rgba(18,20,35,0.98) 100%)",
        }}
      >
        {/* Subtle golden glow top-left */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)",
            transform: "translate(-30%, -30%)",
          }}
        />

        {/* Crown badge */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{
              background: "rgba(212,175,55,0.12)",
              border: "1px solid rgba(212,175,55,0.35)",
              color: "#D4AF37",
            }}
          >
            <Crown className="w-3 h-3" />
            Office Hours Exclusives
          </div>
        </div>

        {/* Main content: photo + text side by side */}
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-8">
          {/* Photo */}
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.5), rgba(212,175,55,0.1))",
                padding: "2px",
                borderRadius: "1rem",
              }}
            />
            <img
              src={vivienPhoto}
              alt="Vivien Le Moal, CEO GENIE IA"
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover"
              style={{
                border: "2px solid rgba(212,175,55,0.4)",
                boxShadow: "0 0 24px rgba(212,175,55,0.2)",
              }}
            />
            {/* Live indicator */}
            <div
              className="absolute -bottom-1.5 -right-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: "rgba(10,11,20,0.95)",
                border: "1px solid rgba(212,175,55,0.4)",
                color: "#D4AF37",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          </div>

          {/* Text */}
          <div>
            <h3
              className="text-xl sm:text-2xl font-black leading-tight mb-1"
              style={{
                background: "linear-gradient(135deg, #D4AF37 0%, #F5E07A 50%, #D4AF37 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Vivien Le Moal
            </h3>
            <p className="text-sm font-semibold text-muted-foreground mb-3">
              CEO & Spécialiste IA / Business
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed max-w-sm">
              Rejoignez-moi <span style={{ color: "#D4AF37" }} className="font-semibold">1h par semaine en direct</span> pour débloquer vos stratégies de croissance et d'automatisation. Sessions interactives, questions réponses en temps réel.
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 mb-8">
          {[
            { icon: Video, label: "1h / semaine en live" },
            { icon: MessageCircle, label: "Q&R en temps réel" },
            { icon: Crown, label: "Cercle privé membres" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="w-3.5 h-3.5" style={{ color: "#D4AF37" }} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href="https://discord.gg/lovable-dev"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-black text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #D4AF37 0%, #C9982A 100%)",
            color: "#0A0B14",
            boxShadow: "0 0 24px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <MessageCircle className="w-4 h-4" />
          Accéder au Cercle Privé
        </a>
      </div>
    </div>
  );
}

/**
 * AgentJobCreatePage — /app/agent-jobs/new
 * Page de création d'un job OpenClaw sécurisé.
 * Utilise SafePromptComposer pour valider et soumettre.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOpenClaw } from "@/hooks/useOpenClaw";
import { SafePromptComposer } from "@/components/openclaw/SafePromptComposer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot } from "lucide-react";

export default function AgentJobCreatePage() {
  const navigate = useNavigate();
  const { runtimes, isLoadingRuntimes, fetchRuntimes, createJob, isCreatingJob } = useOpenClaw();

  useEffect(() => { fetchRuntimes(); }, [fetchRuntimes]);

  const handleSubmit = async (params: Parameters<typeof createJob>[0]) => {
    const job = await createJob(params);
    if (job) {
      navigate(`/app/agent-jobs/${job.id}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/agent-jobs")} className="gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Retour
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">Nouvelle mission OpenClaw</h1>
              <p className="text-xs text-muted-foreground">Exécution sécurisée et traçable</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl mx-auto w-full">
        {isLoadingRuntimes ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <SafePromptComposer
            runtimes={runtimes}
            onSubmit={handleSubmit}
            isSubmitting={isCreatingJob}
          />
        )}
      </div>
    </div>
  );
}

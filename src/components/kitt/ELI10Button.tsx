/**
 * ELI10Button — "Explique comme si j'avais 10 ans"
 * Sends text to chat for simplification.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
}

export function ELI10Button({ text, className }: Props) {
  const navigate = useNavigate();
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    const prompt = encodeURIComponent(
      `Explique ce texte comme si j'avais 10 ans :\n\n${text.slice(0, 500)}`
    );
    navigate(`/app/chat?prompt=${prompt}`);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-1.5 text-xs text-muted-foreground hover:text-primary", className)}
      onClick={handleClick}
      disabled={clicked}
    >
      <Lightbulb className="w-3.5 h-3.5" />
      Explique simplement
    </Button>
  );
}

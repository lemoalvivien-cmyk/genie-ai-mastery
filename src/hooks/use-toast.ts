/**
 * Passe C — Unification notification system.
 * Canonical: Sonner (App.tsx renders <Toaster as Sonner />).
 * This file re-exports sonner so ALL import paths (hooks/use-toast, ui/use-toast)
 * are routed to Sonner — zero silent toasts.
 */
import { toast as sonnerToast } from "sonner";
import type React from "react";

// Adapter: maps the legacy { title, description, variant } API to Sonner calls
// so existing callers need zero changes.
interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function toast(options: ToastOptions | string) {
  if (typeof options === "string") {
    sonnerToast(options);
    return { id: "", dismiss: () => {}, update: () => {} };
  }

  const { title, description, variant, duration, action } = options;

  const message = title as string;
  const opts = {
    description: description as string | undefined,
    duration,
    ...(action ? { action: { label: action.label, onClick: action.onClick } } : {}),
  };

  if (variant === "destructive") {
    sonnerToast.error(message, opts);
  } else {
    sonnerToast(message, opts);
  }

  return { id: "", dismiss: () => {}, update: () => {} };
}

// Legacy useToast hook — returns same shape as before
function useToast() {
  return {
    toast,
    toasts: [] as never[],
    dismiss: (_id?: string) => {},
  };
}

export { useToast, toast };

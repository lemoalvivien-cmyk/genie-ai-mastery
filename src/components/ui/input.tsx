import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base
          "flex h-11 w-full rounded-xl border border-border/60 bg-input/50 px-4 py-2 text-sm text-foreground",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Backdrop / glass feel
          "backdrop-blur-sm",
          // Focus
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:border-primary/50",
          // Hover
          "hover:border-border transition-all duration-200",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-40",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

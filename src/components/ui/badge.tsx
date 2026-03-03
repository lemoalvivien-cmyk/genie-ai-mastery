import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-primary/30 bg-primary/15 text-primary",
        accent:
          "border border-accent/30 bg-accent/15 text-accent",
        secondary:
          "border border-border bg-secondary text-secondary-foreground",
        destructive:
          "border border-destructive/30 bg-destructive/15 text-destructive",
        outline:
          "border border-border text-foreground",
        emerald:
          "border border-emerald/30 bg-emerald/15 text-emerald",
        glass:
          "glass text-foreground border-border/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

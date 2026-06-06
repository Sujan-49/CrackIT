import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-lime text-black hover:bg-lime/90",
    secondary: "border border-white/12 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]",
    ghost: "text-white/70 hover:bg-white/[0.06]"
  };
  return (
    <button
      className={cn("inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50", variants[variant], className)}
      {...props}
    />
  );
}

import React from "react";
import LevelStudioIcon from "./LevelStudioIcon";

interface LevelStudioLogoProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function LevelStudioLogo({
  variant = "dark",
  size = "md",
  showSubtitle = true,
  className = "",
  onClick,
}: LevelStudioLogoProps) {
  const isLight = variant === "light";

  const iconSizes = {
    sm: "size-6",
    md: "size-8",
    lg: "size-10",
  };

  const titleSizes = {
    sm: "text-[15px]",
    md: "text-[18px]",
    lg: "text-[22px]",
  };

  const subtitleSizes = {
    sm: "text-[8.5px] tracking-[0.2em]",
    md: "text-[9.5px] tracking-[0.22em]",
    lg: "text-[11px] tracking-[0.24em]",
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${
        onClick ? "cursor-pointer transition-opacity hover:opacity-90" : ""
      } ${className}`}
    >
      <LevelStudioIcon className={`${iconSizes[size]} shrink-0`} />
      <div className="flex flex-col leading-none">
        <span
          className={`font-heading font-extrabold tracking-tight ${titleSizes[size]} ${
            isLight ? "text-slate-900" : "text-white"
          }`}
        >
          Level<span className="text-violet-400">Studio</span>
        </span>
        {showSubtitle && (
          <span
            className={`font-sans font-bold uppercase mt-1 ${subtitleSizes[size]} ${
              isLight ? "text-slate-500" : "text-slate-400"
            }`}
          >
            By LevelUp Ecosystem
          </span>
        )}
      </div>
    </div>
  );
}

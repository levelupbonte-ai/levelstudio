import React from "react";

interface LevelStudioIconProps {
  className?: string;
  size?: number | string;
  pulsing?: boolean;
}

export default function LevelStudioIcon({
  className = "size-7",
  size,
  pulsing = false,
}: LevelStudioIconProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={`${className} ${pulsing ? "animate-pulse" : ""}`}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lsi-comp-top-l" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8B3FE" />
          <stop offset="100%" stopColor="#AC7AFE" />
        </linearGradient>
        <linearGradient id="lsi-comp-top-r" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#843FF4" />
          <stop offset="100%" stopColor="#6F23E7" />
        </linearGradient>
        <linearGradient id="lsi-comp-right-u" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7327EB" />
          <stop offset="100%" stopColor="#5C16D6" />
        </linearGradient>
        <linearGradient id="lsi-comp-right-d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5111CA" />
          <stop offset="100%" stopColor="#3A08A3" />
        </linearGradient>
        <linearGradient id="lsi-comp-botr-u" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#430BA8" />
          <stop offset="100%" stopColor="#300586" />
        </linearGradient>
        <linearGradient id="lsi-comp-botr-d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5211C8" />
          <stop offset="100%" stopColor="#3D09A5" />
        </linearGradient>
        <linearGradient id="lsi-comp-botl-d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#691CDD" />
          <stop offset="100%" stopColor="#4F0DBB" />
        </linearGradient>
        <linearGradient id="lsi-comp-botl-u" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C2CF0" />
          <stop offset="100%" stopColor="#6117D2" />
        </linearGradient>
        <linearGradient id="lsi-comp-left-d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9754FD" />
          <stop offset="100%" stopColor="#7A2EF1" />
        </linearGradient>
        <linearGradient id="lsi-comp-left-u" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B583FF" />
          <stop offset="100%" stopColor="#9C64FD" />
        </linearGradient>
      </defs>

      {/* Viewfinder Frame Brackets */}
      <path
        d="M 64 144 L 64 64 L 144 64"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="22"
        strokeLinecap="square"
      />
      <path
        d="M 368 64 L 448 64 L 448 144"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="22"
        strokeLinecap="square"
      />
      <path
        d="M 64 368 L 64 448 L 144 448"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="22"
        strokeLinecap="square"
      />
      <path
        d="M 368 448 L 448 448 L 448 368"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="22"
        strokeLinecap="square"
      />

      {/* Centered 10-Faceted 3D Star */}
      <g transform="translate(256, 256) scale(0.44) translate(-256, -256)">
        <polygon points="256,278 256,38 202,192" fill="url(#lsi-comp-top-l)" />
        <polygon points="256,278 256,38 310,192" fill="url(#lsi-comp-top-r)" />
        <polygon points="256,278 310,192 484,204" fill="url(#lsi-comp-right-u)" />
        <polygon points="256,278 484,204 344,280" fill="url(#lsi-comp-right-d)" />
        <polygon points="256,278 344,280 397,470" fill="url(#lsi-comp-botr-u)" />
        <polygon points="256,278 397,470 256,362" fill="url(#lsi-comp-botr-d)" />
        <polygon points="256,278 256,362 115,470" fill="url(#lsi-comp-botl-d)" />
        <polygon points="256,278 115,470 168,280" fill="url(#lsi-comp-botl-u)" />
        <polygon points="256,278 168,280 28,204" fill="url(#lsi-comp-left-d)" />
        <polygon points="256,278 28,204 202,192" fill="url(#lsi-comp-left-u)" />
      </g>
    </svg>
  );
}

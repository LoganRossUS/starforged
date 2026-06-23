// Original minimal line/hex-style SVG icons (not traced from official art).
import type { SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const IconHex = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 2l8.5 5v10L12 22 3.5 17V7z" />
  </svg>
);
export const IconSheet = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 3h9l5 5v13H6z" />
    <path d="M14 3v6h6M9 13h7M9 17h7" />
  </svg>
);
export const IconDice = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 2l8.5 5v10L12 22 3.5 17V7z" />
    <circle cx="12" cy="8" r="1.1" fill="currentColor" />
    <circle cx="8.5" cy="14" r="1.1" fill="currentColor" />
    <circle cx="15.5" cy="14" r="1.1" fill="currentColor" />
  </svg>
);
export const IconAsset = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="1.5" />
    <path d="M4 9h16M9 9v11" />
  </svg>
);
export const IconOracle = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconMoves = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 5h16M4 12h16M4 19h10" />
  </svg>
);
export const IconSector = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9 4l6 2 6-2v14l-6 2-6-2-6 2V6z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);
export const IconConnections = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="7" cy="8" r="3" />
    <circle cx="17" cy="16" r="3" />
    <path d="M9.5 10l5 4" />
  </svg>
);
export const IconNotes = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 3h14v18l-7-3-7 3z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);
export const IconWizard = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 19l9-9M14 5l5 5M13 6l-8 8v5h5l8-8" />
    <path d="M17 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconSave = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 3h12l4 4v14H5z" />
    <path d="M8 3v6h8V3M8 21v-7h8v7" />
  </svg>
);
export const IconInfo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const IconLog = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 4h14v16H5z" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </svg>
);

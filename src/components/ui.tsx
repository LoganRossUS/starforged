import { type ReactNode, type CSSProperties, useEffect } from 'react';

// ---- HexPanel: a bordered panel with a subtle hex-mesh + clipped corner ----
export function HexPanel({
  children,
  className,
  accent,
  style,
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`hex-panel ${className ?? ''}`}
      style={{ ...(accent ? ({ ['--panel-accent' as string]: accent } as CSSProperties) : {}), ...style }}
    >
      {children}
    </div>
  );
}

// ---- SectionBanner: the black banner header bar in the playkit style ----
export function SectionBanner({
  title,
  right,
  accent,
}: {
  title: string;
  right?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="section-banner hex-mesh" style={accent ? { borderLeftColor: accent } : undefined}>
      <h2>{title}</h2>
      {right && <div className="section-banner-right">{right}</div>}
    </div>
  );
}

// ---- Meter: condition meter / value control with +/- and hex pips ----
export function Meter({
  label,
  value,
  min = 0,
  max = 5,
  onChange,
  disabled,
  accent = 'var(--cyan)',
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  accent?: string;
}) {
  const pips = [];
  for (let i = min; i <= max; i++) pips.push(i);
  return (
    <div className="meter">
      <div className="meter-head">
        <span className="meter-label">{label}</span>
        <span className="meter-value" style={{ color: accent }}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <div className="meter-controls">
        <button className="meter-btn" onClick={() => onChange(value - 1)} disabled={disabled || value <= min}>
          −
        </button>
        <div className="meter-pips">
          {pips.map((i) => (
            <button
              key={i}
              className={`hex-pip ${i <= value && i > 0 ? 'on' : ''} ${i === 0 ? 'zero' : ''}`}
              style={i <= value && i > 0 ? { background: accent, borderColor: accent } : undefined}
              onClick={() => onChange(i)}
              title={String(i)}
            />
          ))}
        </div>
        <button className="meter-btn" onClick={() => onChange(value + 1)} disabled={disabled || value >= max}>
          +
        </button>
      </div>
    </div>
  );
}

// ---- TickTrack: 10-box progress track, each box = 4 ticks (drawn as quarter strokes) ----
export function TickTrack({
  ticks,
  boxes = 10,
  onSetTicks,
  cleared,
  onToggleCleared,
}: {
  ticks: number;
  boxes?: number;
  onSetTicks?: (ticks: number) => void;
  cleared?: boolean;
  onToggleCleared?: () => void;
}) {
  return (
    <div className="tick-track">
      {Array.from({ length: boxes }).map((_, b) => {
        const filled = Math.max(0, Math.min(4, ticks - b * 4));
        return (
          <button
            key={b}
            className="tick-box"
            onClick={() => {
              if (!onSetTicks) return;
              // clicking cycles the box fill between 0 and 4
              const base = b * 4;
              const cur = Math.max(0, Math.min(4, ticks - base));
              const next = cur >= 4 ? base : base + cur + 1;
              onSetTicks(next);
            }}
            title={`Box ${b + 1}`}
          >
            <TickBox filled={filled} last={b === boxes - 1} cleared={cleared} />
          </button>
        );
      })}
      {onToggleCleared && (
        <button
          className={`clear-bubble ${cleared ? 'on' : ''}`}
          onClick={onToggleCleared}
          title="Cleared"
        >
          ✓
        </button>
      )}
    </div>
  );
}

function TickBox({ filled, last, cleared }: { filled: number; last?: boolean; cleared?: boolean }) {
  // Draw 1-4 strokes inside a square (book style: vertical, vertical, X-diagonals)
  return (
    <svg viewBox="0 0 24 24" className={`tickbox-svg ${last ? 'last' : ''} ${cleared ? 'cleared' : ''}`}>
      <rect x="1.5" y="1.5" width="21" height="21" className="tb-frame" />
      {filled >= 1 && <line x1="8" y1="3" x2="8" y2="21" className="tb-stroke" />}
      {filled >= 2 && <line x1="16" y1="3" x2="16" y2="21" className="tb-stroke" />}
      {filled >= 3 && <line x1="3" y1="4" x2="21" y2="20" className="tb-stroke" />}
      {filled >= 4 && <line x1="21" y1="4" x2="3" y2="20" className="tb-stroke" />}
    </svg>
  );
}

// ---- Modal ----
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-head">
            <h3>{title}</h3>
            <button className="icon-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---- Small labeled field ----
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

// ---- Rank badge ----
export function RankBadge({ rank }: { rank?: string }) {
  if (!rank) return null;
  return <span className={`rank-badge rank-${rank}`}>{rank}</span>;
}

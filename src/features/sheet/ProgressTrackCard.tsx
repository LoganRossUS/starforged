import type { ProgressTrack } from '@/store/types';
import { RANKS, RANK_PROGRESS } from '@/store/types';
import { TickTrack, RankBadge } from '@/components/ui';
import { progressScore } from '@/store/logic';
import { useDice } from '@/features/dice/diceStore';

interface Props {
  track: ProgressTrack;
  onChange: (patch: Partial<ProgressTrack>) => void;
  onRemove?: () => void;
}

export function ProgressTrackCard({ track, onChange, onRemove }: Props) {
  const setupProgress = useDice((s) => s.setupProgress);
  const score = progressScore(track);

  const mark = () => {
    if (!track.rank) return;
    onChange({ ticks: Math.min(40, track.ticks + RANK_PROGRESS[track.rank]) });
  };
  const rollProgress = () => {
    setupProgress({ label: track.name || 'Progress Roll', trackId: track.id, progressScore: score });
  };

  return (
    <div className="progress-card">
      <div className="progress-card-head">
        <input
          className="progress-name"
          type="text"
          value={track.name}
          placeholder="Track name…"
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <div className="row center gap-sm">
          <RankBadge rank={track.rank} />
          {onRemove && (
            <button className="icon-btn" onClick={onRemove} title="Delete">
              ✕
            </button>
          )}
        </div>
      </div>

      <TickTrack ticks={track.ticks} onSetTicks={(t) => onChange({ ticks: t })} />

      <div className="progress-card-foot">
        <select value={track.rank ?? 'dangerous'} onChange={(e) => onChange({ rank: e.target.value as ProgressTrack['rank'] })}>
          {RANKS.map((r) => (
            <option key={r} value={r}>
              {r} (+{RANK_PROGRESS[r]})
            </option>
          ))}
        </select>
        <button className="btn sm" onClick={mark} title="Mark progress for rank">
          Mark +{track.rank ? RANK_PROGRESS[track.rank] : 0}
        </button>
        <span className="pill">score {score}</span>
        <button className="btn sm cyan" onClick={rollProgress}>
          Progress Roll
        </button>
      </div>
      {track.notes !== undefined && (
        <textarea
          className="progress-notes"
          rows={2}
          value={track.notes}
          placeholder="Notes…"
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      )}
    </div>
  );
}

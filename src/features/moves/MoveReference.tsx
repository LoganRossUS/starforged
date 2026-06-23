import { useMemo, useState } from 'react';
import './moves.css';
import { moveCategories, allMoves, type Move, type MoveCategory } from '@/content';
import { useStore } from '@/store/store';
import { useDice } from '@/features/dice/diceStore';
import { progressScore } from '@/store/logic';
import { STATS, type ProgressTrack } from '@/store/types';
import { SectionBanner, HexPanel, Modal } from '@/components/ui';
import { Markdown } from '@/components/Markdown';

const CORE_STATS = STATS as readonly string[];
const METER_NAMES = ['health', 'spirit', 'supply'] as const;

const ROLL_TYPE_LABEL: Record<Move['rollType'], string> = {
  action_roll: 'Action',
  progress_roll: 'Progress',
  no_roll: 'No Roll',
  special_track: 'Special',
};

function matchesQuery(move: Move, q: string): boolean {
  if (!q) return true;
  return (
    move.name.toLowerCase().includes(q) ||
    move.text.toLowerCase().includes(q) ||
    move.triggerText.toLowerCase().includes(q)
  );
}

export function MoveReference() {
  const [search, setSearch] = useState('');
  const [azMode, setAzMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // On mobile the detail is shown as a modal; this flag drives that.
  const [mobileOpen, setMobileOpen] = useState(false);

  const q = search.trim().toLowerCase();

  // Category groups filtered by the search query (categories with no matches hidden).
  const filteredCategories = useMemo<MoveCategory[]>(() => {
    return moveCategories
      .map((cat) => ({ ...cat, moves: cat.moves.filter((m) => matchesQuery(m, q)) }))
      .filter((cat) => cat.moves.length > 0);
  }, [q]);

  // Flat A–Z list (search-filtered, alphabetical regardless of category).
  const azMoves = useMemo<Move[]>(() => {
    return allMoves
      .filter((m) => matchesQuery(m, q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [q]);

  const selected = useMemo(
    () => (selectedId ? allMoves.find((m) => m.id === selectedId) ?? null : null),
    [selectedId],
  );

  const totalMatches = azMoves.length;

  const selectMove = (id: string) => {
    setSelectedId(id);
    setMobileOpen(true);
  };

  const renderMoveButton = (move: Move) => (
    <button
      key={move.id}
      className={`move-index-item ${move.id === selectedId ? 'active' : ''}`}
      onClick={() => selectMove(move.id)}
    >
      <span className="move-index-name">{move.name}</span>
      <span className={`move-rolltag rt-${move.rollType}`}>{ROLL_TYPE_LABEL[move.rollType]}</span>
    </button>
  );

  return (
    <div className="move-reference">
      <SectionBanner
        title="Moves"
        right={<span className="pill">{totalMatches} moves</span>}
      />

      <div className="move-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search moves…"
          aria-label="Search moves"
        />
        <div className="move-view-toggle">
          <button
            className={`chip-toggle ${!azMode ? 'on' : ''}`}
            onClick={() => setAzMode(false)}
          >
            Categories
          </button>
          <button
            className={`chip-toggle ${azMode ? 'on' : ''}`}
            onClick={() => setAzMode(true)}
          >
            A–Z
          </button>
        </div>
      </div>

      <div className="move-layout">
        <div className="move-index">
          {totalMatches === 0 ? (
            <div className="empty-state">No moves match your search.</div>
          ) : azMode ? (
            <div className="move-index-group">{azMoves.map(renderMoveButton)}</div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="move-index-cat">
                <div
                  className="move-cat-head"
                  style={cat.color ? { borderLeftColor: cat.color } : undefined}
                >
                  <span className="section-title move-cat-name">{cat.name}</span>
                  {cat.summary && <span className="muted move-cat-summary">{cat.summary}</span>}
                </div>
                <div className="move-index-group">{cat.moves.map(renderMoveButton)}</div>
              </div>
            ))
          )}
        </div>

        {/* Desktop detail pane */}
        <div className="move-detail-pane">
          {selected ? (
            <MoveDetail move={selected} />
          ) : (
            <div className="empty-state move-detail-empty">
              Select a move to read its trigger, text, and outcomes.
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail (modal) */}
      <Modal
        open={mobileOpen && !!selected}
        onClose={() => setMobileOpen(false)}
        title={selected?.name}
        wide
      >
        {selected && <MoveDetail move={selected} hideName />}
      </Modal>
    </div>
  );
}

function MoveDetail({ move, hideName }: { move: Move; hideName?: boolean }) {
  return (
    <HexPanel className="move-detail">
      {!hideName && (
        <div className="move-detail-head">
          <h3 className="move-detail-title">{move.name}</h3>
          <span className={`move-rolltag rt-${move.rollType}`}>
            {ROLL_TYPE_LABEL[move.rollType]}
          </span>
        </div>
      )}

      {move.triggerText && (
        <div className="move-trigger">
          <Markdown>{move.triggerText}</Markdown>
        </div>
      )}

      <MoveRoller move={move} />

      <div className="move-text">
        <Markdown>{move.text}</Markdown>
      </div>

      {move.outcomes && (
        <div className="move-outcomes">
          <div className="move-outcome out-strong">
            <div className="move-outcome-label">Strong Hit</div>
            <Markdown>{move.outcomes.strong}</Markdown>
          </div>
          <div className="move-outcome out-weak">
            <div className="move-outcome-label">Weak Hit</div>
            <Markdown>{move.outcomes.weak}</Markdown>
          </div>
          <div className="move-outcome out-miss">
            <div className="move-outcome-label">Miss</div>
            <Markdown>{move.outcomes.miss}</Markdown>
          </div>
        </div>
      )}
    </HexPanel>
  );
}

function MoveRoller({ move }: { move: Move }) {
  const stats = useStore((s) => s.campaign.character.stats);
  const meters = useStore((s) => s.campaign.character.meters);
  const progressTracks = useStore((s) => s.campaign.progressTracks);
  const backgroundVow = useStore((s) => s.campaign.character.backgroundVow);

  // All progress-roll targets: the campaign tracks plus the background vow.
  const trackOptions = useMemo<ProgressTrack[]>(
    () => [...progressTracks, backgroundVow],
    [progressTracks, backgroundVow],
  );
  const [trackId, setTrackId] = useState<string>(() => trackOptions[0]?.id ?? '');

  if (move.rollType === 'action_roll' && move.stats.length > 0) {
    const statOptions = move.stats.map((name) => {
      let value = 0;
      if (CORE_STATS.includes(name)) {
        value = stats[name as keyof typeof stats] ?? 0;
      } else if ((METER_NAMES as readonly string[]).includes(name)) {
        value = meters[name as keyof typeof meters] ?? 0;
      }
      return { stat: name, value };
    });

    const rollMove = () => {
      useDice.getState().setupAction(
        { label: move.name, statOptions, stat: statOptions[0]?.stat, adds: 0 },
        true,
      );
    };

    return (
      <div className="move-roller">
        <button className="btn primary" onClick={rollMove}>
          Roll this move
        </button>
        <span className="move-roller-hint muted">
          {statOptions.map((o) => `${o.stat} +${o.value}`).join(' · ')}
        </span>
      </div>
    );
  }

  if (move.rollType === 'progress_roll') {
    const selectedTrack = trackOptions.find((t) => t.id === trackId) ?? trackOptions[0];

    const rollProgress = () => {
      if (!selectedTrack) return;
      useDice.getState().setupProgress(
        {
          label: move.name,
          trackId: selectedTrack.id,
          progressScore: progressScore(selectedTrack),
        },
        true,
      );
    };

    if (trackOptions.length === 0) {
      return (
        <div className="move-roller">
          <span className="muted">No progress tracks yet — create one to roll.</span>
        </div>
      );
    }

    return (
      <div className="move-roller move-roller-progress">
        <label className="field move-track-field">
          <span className="field-label">Track</span>
          <select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
            {trackOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({progressScore(t)})
              </option>
            ))}
          </select>
        </label>
        <button className="btn cyan" onClick={rollProgress} disabled={!selectedTrack}>
          Progress Roll
        </button>
      </div>
    );
  }

  // no_roll / special_track: reference / oracle-driven; result tables live in text.
  return null;
}

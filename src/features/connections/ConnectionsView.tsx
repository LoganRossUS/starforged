import { useStore } from '@/store/store';
import { SectionBanner } from '@/components/ui';
import { ProgressTrackCard } from '@/features/sheet/ProgressTrackCard';
import { emptyProgressTrack } from '@/store/defaults';
import { uid } from '@/store/logic';
import { useDice } from '@/features/dice/diceStore';
import type { Connection } from '@/store/types';
import './connections.css';

export function ConnectionsView() {
  const connections = useStore((s) => s.campaign.connections);
  const addConnection = useStore((s) => s.addConnection);
  const updateConnection = useStore((s) => s.updateConnection);
  const removeConnection = useStore((s) => s.removeConnection);

  const create = () => {
    const c: Connection = {
      id: uid('conn'),
      name: '',
      location: '',
      roles: [],
      rank: 'troublesome',
      bonded: false,
      notes: '',
      progress: emptyProgressTrack({ name: 'Connection', type: 'connection', rank: 'troublesome' }),
    };
    addConnection(c);
  };

  return (
    <div>
      <SectionBanner
        title="Connections"
        right={
          <button className="btn sm" onClick={create}>
            + New Connection
          </button>
        }
      />
      {connections.length === 0 ? (
        <div className="empty-state">No connections yet. Add the NPCs your character builds bonds with.</div>
      ) : (
        <div className="conn-grid">
          {connections.map((c) => (
            <ConnectionCard
              key={c.id}
              conn={c}
              onChange={(p) => updateConnection(c.id, p)}
              onRemove={() => removeConnection(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionCard({
  conn,
  onChange,
  onRemove,
}: {
  conn: Connection;
  onChange: (patch: Partial<Connection>) => void;
  onRemove: () => void;
}) {
  const ch = useStore((s) => s.campaign.character);
  const setupAction = useDice((s) => s.setupAction);

  const develop = () => {
    setupAction({
      label: `Develop Relationship — ${conn.name || 'connection'}`,
      statOptions: [
        { stat: 'heart', value: ch.stats.heart },
      ],
      stat: 'heart',
      adds: 0,
    });
  };

  return (
    <div className="conn-card">
      <div className="conn-head">
        <input
          className="progress-name"
          value={conn.name}
          placeholder="Name…"
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <div className="row center gap-sm">
          <button className={`chip-toggle ${conn.bonded ? 'on' : ''}`} onClick={() => onChange({ bonded: !conn.bonded })}>
            {conn.bonded ? '★ Bonded' : 'Bond'}
          </button>
          <button className="icon-btn" onClick={onRemove}>
            ✕
          </button>
        </div>
      </div>

      <div className="conn-fields">
        <label className="field">
          <span className="field-label">Location</span>
          <input value={conn.location ?? ''} onChange={(e) => onChange({ location: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Role 1</span>
          <input
            value={conn.roles[0] ?? ''}
            onChange={(e) => onChange({ roles: [e.target.value, conn.roles[1] ?? ''] })}
          />
        </label>
        <label className="field">
          <span className="field-label">Role 2</span>
          <input
            value={conn.roles[1] ?? ''}
            onChange={(e) => onChange({ roles: [conn.roles[0] ?? '', e.target.value] })}
          />
        </label>
      </div>

      <ProgressTrackCard track={conn.progress} onChange={(p) => onChange({ progress: { ...conn.progress, ...p } })} />

      <div className="row gap-sm">
        <button className="btn sm cyan" onClick={develop}>
          Develop Relationship (+heart)
        </button>
      </div>

      <textarea
        rows={2}
        value={conn.notes ?? ''}
        placeholder="Notes…"
        onChange={(e) => onChange({ notes: e.target.value })}
      />
    </div>
  );
}

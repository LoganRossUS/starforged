import './sheet.css';
import { useStore } from '@/store/store';
import { STATS, type Stat, type ProgressTrack } from '@/store/types';
import { SectionBanner, HexPanel, TickTrack } from '@/components/ui';
import { Meter } from '@/components/ui';
import { ProgressTrackCard } from './ProgressTrackCard';
import { AssetCard } from '@/features/assets/AssetCard';
import { emptyProgressTrack } from '@/store/defaults';
import { useDice } from '@/features/dice/diceStore';

const STAT_LABELS: Record<Stat, string> = {
  edge: 'Edge',
  heart: 'Heart',
  iron: 'Iron',
  shadow: 'Shadow',
  wits: 'Wits',
};

export function CharacterSheet() {
  const ch = useStore((s) => s.campaign.character);
  const tracks = useStore((s) => s.campaign.progressTracks);
  const setStat = useStore((s) => s.setStat);
  const setMeter = useStore((s) => s.setMeter);
  const setMomentumValue = useStore((s) => s.setMomentumValue);
  const burnMomentum = useStore((s) => s.burnMomentum);
  const patchCharacter = useStore((s) => s.patchCharacter);
  const setLegacyTicks = useStore((s) => s.setLegacyTicks);
  const toggleLegacyCleared = useStore((s) => s.toggleLegacyCleared);
  const toggleImpact = useStore((s) => s.toggleImpact);
  const addOtherImpact = useStore((s) => s.addOtherImpact);
  const toggleOtherImpact = useStore((s) => s.toggleOtherImpact);
  const removeOtherImpact = useStore((s) => s.removeOtherImpact);
  const addProgressTrack = useStore((s) => s.addProgressTrack);
  const updateProgressTrack = useStore((s) => s.updateProgressTrack);
  const removeProgressTrack = useStore((s) => s.removeProgressTrack);
  const patchBackgroundVow = useStore((s) => s.patchBackgroundVow);
  const updateAsset = useStore((s) => s.updateAsset);
  const unequipAsset = useStore((s) => s.unequipAsset);
  const setSection = useStore((s) => s.setSection);

  const setupAction = useDice((s) => s.setupAction);

  const quickRoll = (stat: Stat) => {
    setupAction({
      label: `Quick Roll +${stat}`,
      statOptions: STATS.map((s) => ({ stat: s, value: ch.stats[s] })),
      stat,
      adds: 0,
    });
  };

  const meterBlocked = (meter: 'health' | 'spirit' | 'supply') => {
    const map = { health: 'wounded', spirit: 'shaken', supply: 'unprepared' } as const;
    return ch.impacts[map[meter]];
  };

  return (
    <div className="sheet">
      <SectionBanner title="Character" right={<span className="pill">{ch.callsign || 'No callsign'}</span>} />

      {/* Identity */}
      <HexPanel className="identity">
        <div className="identity-grid">
          <label className="field">
            <span className="field-label">Name</span>
            <input value={ch.name} onChange={(e) => patchCharacter({ name: e.target.value })} placeholder="Character name" />
          </label>
          <label className="field">
            <span className="field-label">Pronouns</span>
            <input value={ch.pronouns} onChange={(e) => patchCharacter({ pronouns: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Callsign</span>
            <input value={ch.callsign} onChange={(e) => patchCharacter({ callsign: e.target.value })} />
          </label>
        </div>
        <label className="field" style={{ marginTop: 10 }}>
          <span className="field-label">Characteristics</span>
          <textarea
            rows={2}
            value={ch.characteristics}
            onChange={(e) => patchCharacter({ characteristics: e.target.value })}
            placeholder="Look, role, past, mannerisms…"
          />
        </label>
      </HexPanel>

      {/* Stats */}
      <div className="stats-row">
        {STATS.map((stat) => (
          <div key={stat} className="stat-box">
            <div className="stat-label">{STAT_LABELS[stat]}</div>
            <input
              className="stat-value"
              type="number"
              min={0}
              max={5}
              value={ch.stats[stat]}
              onChange={(e) => setStat(stat, Number(e.target.value))}
            />
            <button className="btn sm" onClick={() => quickRoll(stat)}>
              Roll
            </button>
          </div>
        ))}
      </div>

      {/* Meters + momentum */}
      <div className="meters-grid">
        <Meter
          label="Health"
          value={ch.meters.health}
          onChange={(v) => {
            if (v > ch.meters.health && meterBlocked('health')) return;
            setMeter('health', v);
          }}
          accent="var(--hit)"
        />
        <Meter
          label="Spirit"
          value={ch.meters.spirit}
          onChange={(v) => {
            if (v > ch.meters.spirit && meterBlocked('spirit')) return;
            setMeter('spirit', v);
          }}
          accent="var(--match)"
        />
        <Meter
          label="Supply"
          value={ch.meters.supply}
          onChange={(v) => {
            if (v > ch.meters.supply && meterBlocked('supply')) return;
            setMeter('supply', v);
          }}
          accent="var(--weak)"
        />
        <div className="momentum-box">
          <div className="meter-head">
            <span className="meter-label">Momentum</span>
            <span className="meter-value accent-cyan">
              {ch.momentum.value > 0 ? `+${ch.momentum.value}` : ch.momentum.value}
            </span>
          </div>
          <input
            type="range"
            min={-6}
            max={ch.momentum.max}
            value={ch.momentum.value}
            onChange={(e) => setMomentumValue(Number(e.target.value))}
            className="momentum-slider"
          />
          <div className="row between center" style={{ marginTop: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              max <strong>+{ch.momentum.max}</strong> · reset <strong>+{ch.momentum.reset}</strong>
            </span>
            <button className="btn sm cyan" onClick={burnMomentum}>
              Burn → +{ch.momentum.reset}
            </button>
          </div>
        </div>
      </div>

      {/* Impacts */}
      <HexPanel className="accented" accent="var(--red)">
        <div className="section-title">Impacts ({impactCount(ch.impacts)})</div>
        <div className="impacts-groups">
          <ImpactGroup
            title="Misfortunes"
            items={[
              ['wounded', 'Wounded'],
              ['shaken', 'Shaken'],
              ['unprepared', 'Unprepared'],
            ]}
            impacts={ch.impacts as unknown as Record<string, unknown>}
            toggle={toggleImpact}
          />
          <ImpactGroup
            title="Lasting Effects"
            items={[
              ['permanentlyHarmed', 'Permanently Harmed'],
              ['traumatized', 'Traumatized'],
            ]}
            impacts={ch.impacts as unknown as Record<string, unknown>}
            toggle={toggleImpact}
          />
          <ImpactGroup
            title="Burdens"
            items={[
              ['doomed', 'Doomed'],
              ['tormented', 'Tormented'],
              ['indebted', 'Indebted'],
            ]}
            impacts={ch.impacts as unknown as Record<string, unknown>}
            toggle={toggleImpact}
          />
          <ImpactGroup
            title="Vehicle / Other"
            items={[
              ['battered', 'Battered'],
              ['cursed', 'Cursed'],
            ]}
            impacts={ch.impacts as unknown as Record<string, unknown>}
            toggle={toggleImpact}
          />
        </div>
        <div className="other-impacts">
          {ch.impacts.other.map((o) => (
            <div key={o.id} className="row center gap-sm">
              <button className={`chip-toggle ${o.active ? 'on' : ''}`} onClick={() => toggleOtherImpact(o.id)}>
                {o.label}
              </button>
              <button className="icon-btn" onClick={() => removeOtherImpact(o.id)}>
                ✕
              </button>
            </div>
          ))}
          <AddImpact onAdd={addOtherImpact} />
        </div>
      </HexPanel>

      {/* Legacy tracks */}
      <HexPanel>
        <div className="section-title">
          Legacy Tracks — XP earned <span className="accent-cyan">{ch.legacy.xpEarned}</span> · spent {ch.legacy.xpSpent}
        </div>
        <div className="legacy-grid">
          {(['quests', 'bonds', 'discoveries'] as const).map((t) => (
            <div key={t} className="legacy-track">
              <div className="legacy-label">{t}</div>
              <TickTrack
                ticks={ch.legacy[t]}
                onSetTicks={(v) => setLegacyTicks(t, v)}
                cleared={ch.legacy[`${t}Cleared` as const]}
                onToggleCleared={() => toggleLegacyCleared(t)}
              />
            </div>
          ))}
        </div>
      </HexPanel>

      {/* Background vow */}
      <HexPanel className="accented" accent="var(--match)">
        <div className="section-title">Background Vow (Epic)</div>
        <ProgressTrackCard track={ch.backgroundVow} onChange={(p) => patchBackgroundVow(p)} />
      </HexPanel>

      {/* Progress tracks */}
      <SectionBanner
        title="Progress Tracks"
        accent="var(--cyan)"
        right={
          <div className="row gap-sm">
            {(['vow', 'expedition', 'combat', 'clock'] as ProgressTrack['type'][]).map((type) => (
              <button
                key={type}
                className="btn sm"
                onClick={() =>
                  addProgressTrack(
                    emptyProgressTrack({
                      name: '',
                      type,
                      rank: 'dangerous',
                      notes: '',
                    }),
                  )
                }
              >
                + {type}
              </button>
            ))}
          </div>
        }
      />
      {tracks.length === 0 ? (
        <div className="empty-state">No progress tracks yet. Add a vow, expedition, fight, or clock above.</div>
      ) : (
        <div className="tracks-grid">
          {tracks.map((t) => (
            <ProgressTrackCard
              key={t.id}
              track={t}
              onChange={(p) => updateProgressTrack(t.id, p)}
              onRemove={() => removeProgressTrack(t.id)}
            />
          ))}
        </div>
      )}

      {/* Assets */}
      <SectionBanner
        title="Equipped Assets"
        accent="var(--type-module)"
        right={
          <button className="btn sm" onClick={() => setSection('assets')}>
            + Asset Library
          </button>
        }
      />
      {ch.assets.length === 0 ? (
        <div className="empty-state">
          No assets equipped. Visit the <button className="link-btn" onClick={() => setSection('assets')}>Asset Library</button> to add some.
        </div>
      ) : (
        <div className="asset-grid">
          {ch.assets.map((a) => (
            <AssetCard
              key={a.instanceId}
              asset={a}
              onChange={(patch) => updateAsset(a.instanceId, patch)}
              onRemove={() => unequipAsset(a.instanceId)}
            />
          ))}
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  );
}

function impactCount(impacts: ReturnType<typeof useStore.getState>['campaign']['character']['impacts']) {
  const flags = [
    'wounded',
    'shaken',
    'unprepared',
    'permanentlyHarmed',
    'traumatized',
    'doomed',
    'tormented',
    'indebted',
    'battered',
    'cursed',
  ] as const;
  return flags.filter((f) => impacts[f]).length + impacts.other.filter((o) => o.active).length;
}

function ImpactGroup({
  title,
  items,
  impacts,
  toggle,
}: {
  title: string;
  items: [string, string][];
  impacts: Record<string, unknown>;
  toggle: (flag: never) => void;
}) {
  return (
    <div className="impact-group">
      <div className="impact-group-title">{title}</div>
      {items.map(([key, label]) => (
        <button
          key={key}
          className={`impact-toggle ${impacts[key] ? 'on' : ''}`}
          onClick={() => toggle(key as never)}
        >
          <span className="impact-mark" />
          {label}
        </button>
      ))}
    </div>
  );
}

function AddImpact({ onAdd }: { onAdd: (label: string) => void }) {
  return (
    <form
      className="row gap-sm center"
      onSubmit={(e) => {
        e.preventDefault();
        const input = (e.currentTarget.elements.namedItem('imp') as HTMLInputElement);
        if (input.value.trim()) {
          onAdd(input.value.trim());
          input.value = '';
        }
      }}
    >
      <input name="imp" type="text" placeholder="Custom impact…" style={{ maxWidth: 180 }} />
      <button className="btn sm" type="submit">
        Add
      </button>
    </form>
  );
}

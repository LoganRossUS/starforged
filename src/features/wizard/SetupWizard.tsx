import './wizard.css';
import { useMemo, useState, type ReactNode } from 'react';
import { useStore } from '@/store/store';
import { STATS, type Stat, type LocationKind, type AssetType } from '@/store/types';
import { emptyProgressTrack } from '@/store/defaults';
import { uid } from '@/store/logic';
import {
  truths,
  assets,
  ASSET_TYPE_LABELS,
  starshipAsset,
  type AssetDef,
} from '@/content';
import { createAssetInstance } from '@/features/assets/assetInstance';
import { AssetCard } from '@/features/assets/AssetCard';
import { Markdown } from '@/components/Markdown';
import { SectionBanner, HexPanel } from '@/components/ui';

const STAT_LABELS: Record<Stat, string> = {
  edge: 'Edge',
  heart: 'Heart',
  iron: 'Iron',
  shadow: 'Shadow',
  wits: 'Wits',
};

const STANDARD_ARRAY = [3, 2, 2, 1, 1] as const;

const LOCATION_KINDS: LocationKind[] = [
  'settlement',
  'star',
  'planet',
  'derelict',
  'vault',
  'creature',
  'ship',
  'other',
];

const STEPS = [
  'Title',
  'Truths',
  'Character',
  'Stats',
  'Assets',
  'Background Vow',
  'Sector',
  'Review',
] as const;

const MAX_ASSETS = 3;

export function SetupWizard() {
  // Store state + actions
  const campaign = useStore((s) => s.campaign);
  const setTitle = useStore((s) => s.setTitle);
  const setTruth = useStore((s) => s.setTruth);
  const patchCharacter = useStore((s) => s.patchCharacter);
  const setStat = useStore((s) => s.setStat);
  const equipAsset = useStore((s) => s.equipAsset);
  const patchBackgroundVow = useStore((s) => s.patchBackgroundVow);
  const setSectorField = useStore((s) => s.setSectorField);
  const addLocation = useStore((s) => s.addLocation);
  const addProgressTrack = useStore((s) => s.addProgressTrack);
  const setWizardComplete = useStore((s) => s.setWizardComplete);
  const setSection = useStore((s) => s.setSection);

  const [step, setStep] = useState(0);

  // ---- Local working draft (seeded from the live campaign) ----
  const ch = campaign.character;
  const [title, setTitleDraft] = useState(campaign.meta.title);
  const [name, setName] = useState(ch.name);
  const [pronouns, setPronouns] = useState(ch.pronouns);
  const [callsign, setCallsign] = useState(ch.callsign);
  const [characteristics, setCharacteristics] = useState(ch.characteristics);

  // Stat assignment: map stat -> array index (0..4) or null (unassigned)
  const [statSlots, setStatSlots] = useState<Record<Stat, number | null>>({
    edge: null,
    heart: null,
    iron: null,
    shadow: null,
    wits: null,
  });

  // Truths: which option index is the working selection per category, plus custom text
  const [truthSel, setTruthSel] = useState<Record<string, number | 'custom' | undefined>>(() => {
    const init: Record<string, number | 'custom' | undefined> = {};
    for (const cat of truths) {
      const existing = campaign.truths[cat.id];
      if (existing) {
        init[cat.id] = existing.customText ? 'custom' : Number(existing.choiceId);
      }
    }
    return init;
  });
  const [truthCustom, setTruthCustom] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const cat of truths) {
      const existing = campaign.truths[cat.id];
      if (existing?.customText) init[cat.id] = existing.customText;
    }
    return init;
  });
  const [truthIdx, setTruthIdx] = useState(0);

  // Assets
  const [starshipEquipped, setStarshipEquipped] = useState(
    ch.assets.some((a) => a.type === 'command_vehicle'),
  );
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetFilter, setAssetFilter] = useState<AssetType | 'all'>('all');

  // Background vow
  const [bgVow, setBgVow] = useState(
    ch.backgroundVow.name === 'Background Vow' ? '' : ch.backgroundVow.name,
  );

  // Sector + first location + first quest
  const [sectorName, setSectorName] = useState(campaign.sector.name);
  const [sectorRegion, setSectorRegion] = useState(campaign.sector.region);
  const [sectorControl, setSectorControl] = useState(campaign.sector.control);
  const [locName, setLocName] = useState('');
  const [locKind, setLocKind] = useState<LocationKind>('settlement');
  const [questVow, setQuestVow] = useState('');

  // ---- Derived ----
  const usedSlots = useMemo(
    () => STATS.map((s) => statSlots[s]).filter((v): v is number => v !== null),
    [statSlots],
  );
  const statsValid = useMemo(() => {
    if (usedSlots.length !== 5) return false;
    // each array index used exactly once
    const counts = new Array(STANDARD_ARRAY.length).fill(0);
    for (const v of usedSlots) counts[v]++;
    return counts.every((c) => c === 1);
  }, [usedSlots]);

  const assetTypes = useMemo(() => {
    const set = new Set<AssetType>();
    for (const a of assets) set.add(a.type);
    return Array.from(set);
  }, []);
  const filteredAssets = useMemo(
    () => (assetFilter === 'all' ? assets : assets.filter((a) => a.type === assetFilter)),
    [assetFilter],
  );

  // Preview instances for asset cards (read-only, no onChange)
  const previewCache = useMemo(() => {
    const m = new Map<string, ReturnType<typeof createAssetInstance>>();
    for (const a of filteredAssets) m.set(a.id, createAssetInstance(a));
    return m;
  }, [filteredAssets]);

  // ---- Commit helpers (persist working draft on navigation/finish) ----
  function commitTitle() {
    setTitle(title.trim() || 'Untitled Campaign');
  }
  function commitCharacter() {
    patchCharacter({ name, pronouns, callsign, characteristics });
  }
  function commitStats() {
    if (!statsValid) return;
    for (const s of STATS) {
      const idx = statSlots[s];
      if (idx !== null) setStat(s, STANDARD_ARRAY[idx]);
    }
  }
  function commitBackgroundVow() {
    if (bgVow.trim()) patchBackgroundVow({ name: bgVow.trim() });
  }
  function commitSector() {
    setSectorField({ name: sectorName, region: sectorRegion, control: sectorControl });
  }

  function selectTruthOption(catId: string, optIndex: number) {
    const cat = truths.find((c) => c.id === catId);
    if (!cat) return;
    const opt = cat.options[optIndex];
    setTruthSel((prev) => ({ ...prev, [catId]: optIndex }));
    setTruth(catId, {
      choiceId: String(optIndex),
      summary: opt.summary,
      questStarter: opt.questStarter,
    });
  }
  function selectTruthCustom(catId: string, text: string) {
    setTruthCustom((prev) => ({ ...prev, [catId]: text }));
    setTruthSel((prev) => ({ ...prev, [catId]: 'custom' }));
    setTruth(catId, { choiceId: 'custom', customText: text, summary: text });
  }

  function toggleAsset(def: AssetDef) {
    setSelectedAssetIds((prev) => {
      if (prev.includes(def.id)) return prev.filter((id) => id !== def.id);
      if (prev.length >= MAX_ASSETS) return prev;
      return [...prev, def.id];
    });
  }

  function ensureStarship() {
    if (!starshipEquipped && starshipAsset) {
      equipAsset(createAssetInstance(starshipAsset));
      setStarshipEquipped(true);
    }
  }

  function commitAssets() {
    ensureStarship();
    const alreadyEquipped = new Set(campaign.character.assets.map((a) => a.assetId));
    for (const id of selectedAssetIds) {
      if (alreadyEquipped.has(id)) continue;
      const def = assets.find((a) => a.id === id);
      if (def) equipAsset(createAssetInstance(def));
    }
  }

  function commitSectorAndQuest() {
    commitSector();
    if (locName.trim()) {
      addLocation({ id: uid('loc'), name: locName.trim(), kind: locKind, q: 0, r: 0 });
    }
    if (questVow.trim()) {
      addProgressTrack(
        emptyProgressTrack({ name: questVow.trim(), type: 'vow', rank: 'dangerous', notes: '' }),
      );
    }
  }

  // Persist the current step's draft, then advance.
  function commitCurrentStep() {
    switch (step) {
      case 0:
        commitTitle();
        break;
      case 2:
        commitCharacter();
        break;
      case 3:
        commitStats();
        break;
      case 4:
        commitAssets();
        break;
      case 5:
        commitBackgroundVow();
        break;
      case 6:
        commitSectorAndQuest();
        break;
      // Truths (1) are committed live as the user selects.
    }
  }

  function goNext() {
    commitCurrentStep();
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function goPrev() {
    setStep((s) => Math.max(0, s - 1));
  }
  function goSkip() {
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function finish() {
    // Commit everything one more time to be safe.
    commitTitle();
    commitCharacter();
    commitStats();
    commitAssets();
    commitBackgroundVow();
    commitSectorAndQuest();
    setWizardComplete(true);
    setSection('sheet');
  }

  const isLast = step === STEPS.length - 1;
  const nextDisabled = step === 3 && !statsValid;

  return (
    <div className="wizard">
      <SectionBanner title="Setup Wizard" accent="var(--cyan)" />

      <div className="wiz-progress">
        <div className="wiz-progress-head">
          <h2>{STEPS[step]}</h2>
          <span className="wiz-step-count">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="wiz-bar">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`wiz-bar-seg ${i < step ? 'done' : ''} ${i === step ? 'current' : ''}`}
              title={label}
            />
          ))}
        </div>
      </div>

      <div className="wiz-step">
        {/* ---- 0: Title ---- */}
        {step === 0 && (
          <HexPanel>
            <div className="section-title">Name your campaign</div>
            <p className="wiz-intro">
              Give this saga a title. You can change it later from the campaign menu.
            </p>
            <label className="field">
              <span className="field-label">Campaign Title</span>
              <input
                value={title}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="Untitled Campaign"
                autoFocus
              />
            </label>
          </HexPanel>
        )}

        {/* ---- 1: Truths ---- */}
        {step === 1 && (
          <div>
            <p className="wiz-intro">
              Define the truths of your galaxy. Pick one option per category or write your own.
              Selecting is optional — skip any you want to leave open.
            </p>
            <div className="wiz-truth-tabs">
              {truths.map((cat, i) => (
                <button
                  key={cat.id}
                  className={`wiz-truth-tab ${i === truthIdx ? 'active' : ''} ${
                    truthSel[cat.id] !== undefined ? 'chosen' : ''
                  }`}
                  onClick={() => setTruthIdx(i)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <TruthEditor
              category={truths[truthIdx]}
              selection={truthSel[truths[truthIdx].id]}
              customText={truthCustom[truths[truthIdx].id] ?? ''}
              onSelectOption={(idx) => selectTruthOption(truths[truthIdx].id, idx)}
              onCustom={(text) => selectTruthCustom(truths[truthIdx].id, text)}
            />
            <div className="row between center wrap" style={{ marginTop: 16 }}>
              <button
                className="btn sm"
                disabled={truthIdx === 0}
                onClick={() => setTruthIdx((i) => Math.max(0, i - 1))}
              >
                ← Prev Truth
              </button>
              <span className="muted">
                {truthIdx + 1} / {truths.length}
              </span>
              <button
                className="btn sm"
                disabled={truthIdx === truths.length - 1}
                onClick={() => setTruthIdx((i) => Math.min(truths.length - 1, i + 1))}
              >
                Next Truth →
              </button>
            </div>
          </div>
        )}

        {/* ---- 2: Character basics ---- */}
        {step === 2 && (
          <HexPanel>
            <div className="section-title">Who are you?</div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <label className="field">
                <span className="field-label">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name" />
              </label>
              <label className="field">
                <span className="field-label">Pronouns</span>
                <input value={pronouns} onChange={(e) => setPronouns(e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">Callsign</span>
                <input value={callsign} onChange={(e) => setCallsign(e.target.value)} />
              </label>
            </div>
            <label className="field" style={{ marginTop: 12 }}>
              <span className="field-label">Characteristics</span>
              <textarea
                rows={3}
                value={characteristics}
                onChange={(e) => setCharacteristics(e.target.value)}
                placeholder="Look, role, past, mannerisms…"
              />
            </label>
          </HexPanel>
        )}

        {/* ---- 3: Stats ---- */}
        {step === 3 && (
          <HexPanel>
            <div className="section-title">Assign your stats</div>
            <p className="wiz-intro">
              Distribute the standard array <strong>3, 2, 2, 1, 1</strong> across your five stats —
              each value used exactly once.
            </p>
            <div className="wiz-array-tally">
              {STANDARD_ARRAY.map((v, i) => (
                <span key={i} className={`wiz-array-chip ${usedSlots.includes(i) ? 'used' : ''}`}>
                  +{v}
                </span>
              ))}
            </div>
            <div className="wiz-stat-grid">
              {STATS.map((s) => (
                <div key={s} className="wiz-stat-card">
                  <span className="field-label">{STAT_LABELS[s]}</span>
                  <select
                    value={statSlots[s] === null ? '' : String(statSlots[s])}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      setStatSlots((prev) => ({ ...prev, [s]: val }));
                    }}
                  >
                    <option value="">—</option>
                    {STANDARD_ARRAY.map((v, i) => (
                      <option key={i} value={i}>
                        +{v}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 14 }}>
              {statsValid ? (
                <span className="wiz-valid">✓ Valid assignment.</span>
              ) : (
                <span className="wiz-invalid">
                  Assign each of 3, 2, 2, 1, 1 exactly once (use each dropdown value a single time).
                </span>
              )}
            </p>
          </HexPanel>
        )}

        {/* ---- 4: Assets ---- */}
        {step === 4 && (
          <div>
            <p className="wiz-intro">
              Your Starship command vehicle is equipped automatically. Choose up to{' '}
              <strong>{MAX_ASSETS}</strong> starting assets below.
            </p>
            {starshipAsset && (
              <div className="muted" style={{ marginBottom: 12 }}>
                Auto-equipped: <strong>{starshipAsset.name}</strong>{' '}
                {starshipEquipped ? '(equipped)' : '(will equip on continue)'}
              </div>
            )}
            <div className="wiz-asset-filters">
              <button
                className={`chip-toggle ${assetFilter === 'all' ? 'on' : ''}`}
                onClick={() => setAssetFilter('all')}
              >
                All
              </button>
              {assetTypes.map((t) => (
                <button
                  key={t}
                  className={`chip-toggle ${assetFilter === t ? 'on' : ''}`}
                  onClick={() => setAssetFilter(t)}
                >
                  {ASSET_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="wiz-asset-count">
              Selected <span className="accent-cyan">{selectedAssetIds.length}</span> / {MAX_ASSETS}
            </div>
            <div className="asset-grid">
              {filteredAssets.map((def) => {
                const selected = selectedAssetIds.includes(def.id);
                const disabled = !selected && selectedAssetIds.length >= MAX_ASSETS;
                const preview = previewCache.get(def.id);
                return (
                  <div
                    key={def.id}
                    className={`wiz-asset-pick ${selected ? 'selected' : ''} ${
                      disabled ? 'disabled' : ''
                    }`}
                  >
                    {preview && <AssetCard asset={preview} compact />}
                    <button
                      className={`btn sm wiz-asset-toggle ${selected ? 'cyan' : ''}`}
                      disabled={disabled}
                      onClick={() => toggleAsset(def)}
                    >
                      {selected ? '✓ Selected' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- 5: Background vow ---- */}
        {step === 5 && (
          <HexPanel className="accented" accent="var(--match)">
            <div className="section-title">Background Vow (Epic)</div>
            <p className="wiz-intro">
              Swear the epic vow that defines your character's overarching purpose — the driving
              question behind your whole campaign.
            </p>
            <label className="field">
              <span className="field-label">I swear to…</span>
              <textarea
                rows={3}
                value={bgVow}
                onChange={(e) => setBgVow(e.target.value)}
                placeholder="…uncover who I really am and why I was made."
              />
            </label>
          </HexPanel>
        )}

        {/* ---- 6: Sector & first location ---- */}
        {step === 6 && (
          <div className="col">
            <HexPanel>
              <div className="section-title">Your sector</div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <label className="field">
                  <span className="field-label">Sector Name</span>
                  <input value={sectorName} onChange={(e) => setSectorName(e.target.value)} />
                </label>
                <label className="field">
                  <span className="field-label">Region</span>
                  <input
                    value={sectorRegion}
                    onChange={(e) => setSectorRegion(e.target.value)}
                    placeholder="Terminus / Outlands / Expanse"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Faction Control</span>
                  <input value={sectorControl} onChange={(e) => setSectorControl(e.target.value)} />
                </label>
              </div>
            </HexPanel>

            <HexPanel>
              <div className="section-title">First location</div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <label className="field">
                  <span className="field-label">Name</span>
                  <input
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="Where your story begins"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Kind</span>
                  <select value={locKind} onChange={(e) => setLocKind(e.target.value as LocationKind)}>
                    {LOCATION_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </HexPanel>

            <HexPanel className="accented" accent="var(--cyan)">
              <div className="section-title">First quest vow (Dangerous)</div>
              <label className="field">
                <span className="field-label">I swear to…</span>
                <textarea
                  rows={2}
                  value={questVow}
                  onChange={(e) => setQuestVow(e.target.value)}
                  placeholder="…the inciting quest that sets you in motion."
                />
              </label>
            </HexPanel>
          </div>
        )}

        {/* ---- 7: Review ---- */}
        {step === 7 && (
          <div>
            <p className="wiz-intro">Review your choices, then begin play.</p>
            <div className="wiz-review-grid">
              <ReviewCard title="Campaign">
                <ReviewLine k="Title" v={title.trim() || 'Untitled Campaign'} />
              </ReviewCard>
              <ReviewCard title="Character">
                <ReviewLine k="Name" v={name || '—'} />
                <ReviewLine k="Pronouns" v={pronouns || '—'} />
                <ReviewLine k="Callsign" v={callsign || '—'} />
              </ReviewCard>
              <ReviewCard title="Stats">
                {STATS.map((s) => {
                  const idx = statSlots[s];
                  return (
                    <ReviewLine
                      key={s}
                      k={STAT_LABELS[s]}
                      v={idx === null ? '—' : `+${STANDARD_ARRAY[idx]}`}
                    />
                  );
                })}
              </ReviewCard>
              <ReviewCard title="Assets">
                <ReviewLine k="Starship" v={starshipAsset ? starshipAsset.name : '—'} />
                {selectedAssetIds.length === 0 ? (
                  <ReviewLine k="Chosen" v="None" />
                ) : (
                  selectedAssetIds.map((id) => (
                    <ReviewLine key={id} k="Asset" v={assets.find((a) => a.id === id)?.name ?? id} />
                  ))
                )}
              </ReviewCard>
              <ReviewCard title="Truths">
                <ReviewLine
                  k="Defined"
                  v={`${Object.values(truthSel).filter((x) => x !== undefined).length} / ${truths.length}`}
                />
              </ReviewCard>
              <ReviewCard title="Vows">
                <ReviewLine k="Background" v={bgVow.trim() || '—'} />
                <ReviewLine k="First quest" v={questVow.trim() || '—'} />
              </ReviewCard>
              <ReviewCard title="Sector">
                <ReviewLine k="Name" v={sectorName || '—'} />
                <ReviewLine k="Region" v={sectorRegion || '—'} />
                <ReviewLine k="First location" v={locName.trim() || '—'} />
              </ReviewCard>
            </div>
            <div className="wiz-finish">
              <button className="btn primary" onClick={finish}>
                Finish &amp; Play →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Nav footer ---- */}
      <div className="wiz-nav">
        <button className="btn" disabled={step === 0} onClick={goPrev}>
          ← Prev
        </button>
        <div className="spacer" />
        {!isLast && (
          <>
            <button className="btn ghost" onClick={goSkip}>
              Skip
            </button>
            <button className="btn primary" disabled={nextDisabled} onClick={goNext}>
              Next →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Truth editor for a single category ----
function TruthEditor({
  category,
  selection,
  customText,
  onSelectOption,
  onCustom,
}: {
  category: (typeof truths)[number];
  selection: number | 'custom' | undefined;
  customText: string;
  onSelectOption: (idx: number) => void;
  onCustom: (text: string) => void;
}) {
  return (
    <HexPanel>
      <div className="section-title">{category.name}</div>
      {category.yourCharacter && <p className="wiz-truth-prompt">{category.yourCharacter}</p>}
      <div className="wiz-options">
        {category.options.map((opt, i) => {
          const selected = selection === i;
          return (
            <button
              key={i}
              className={`wiz-option ${selected ? 'selected' : ''}`}
              onClick={() => onSelectOption(i)}
            >
              <div className="wiz-option-summary">
                <span className="wiz-radio" />
                {opt.summary}
              </div>
              {opt.description && <Markdown>{opt.description}</Markdown>}
              {opt.questStarter && (
                <div className="wiz-quest-starter">Quest starter: {opt.questStarter}</div>
              )}
              {opt.table && (
                <div className="wiz-suboracle-note">
                  Includes a sub-oracle ({opt.table.dice}) — roll it later when you flesh this out.
                </div>
              )}
            </button>
          );
        })}
      </div>
      <label className="field wiz-custom-truth">
        <span className="field-label">…or write your own truth</span>
        <textarea
          rows={2}
          value={customText}
          onChange={(e) => onCustom(e.target.value)}
          placeholder="Describe this truth in your own words…"
        />
      </label>
    </HexPanel>
  );
}

// ---- Review helpers ----
function ReviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="wiz-review-card">
      <h4>{title}</h4>
      {children}
    </div>
  );
}
function ReviewLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="row-line">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

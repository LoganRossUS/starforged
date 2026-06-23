import { create } from 'zustand';
import type {
  Campaign,
  Character,
  Stat,
  ProgressTrack,
  Connection,
  AssetInstance,
  SectorLocation,
  SectorLink,
  NoteDoc,
  RollLogEntry,
  Impacts,
  TruthChoice,
} from './types';
import { defaultCampaign } from './defaults';
import { ensureMomentumSync, clamp, uid, legacyBoxXp, deriveMomentum } from './logic';
import { migrate } from './migrations';

const STORAGE_KEY = 'forge-companion:campaign';

type ImpactFlag = Exclude<keyof Impacts, 'other'>;

interface StoreState {
  campaign: Campaign;
  activeSection: string;
  setSection: (s: string) => void;

  // campaign-level
  newCampaign: (title?: string) => void;
  loadCampaign: (raw: unknown) => void;
  replaceCampaign: (c: Campaign) => void;
  setTitle: (t: string) => void;
  setWizardComplete: (v: boolean) => void;

  // character
  patchCharacter: (patch: Partial<Character>) => void;
  setStat: (stat: Stat, value: number) => void;
  setMeter: (meter: 'health' | 'spirit' | 'supply', value: number) => void;
  setMomentumValue: (v: number) => void;
  burnMomentum: () => void;
  toggleImpact: (flag: ImpactFlag) => void;
  addOtherImpact: (label: string) => void;
  toggleOtherImpact: (id: string) => void;
  removeOtherImpact: (id: string) => void;

  // legacy tracks
  setLegacyTicks: (track: 'quests' | 'bonds' | 'discoveries', ticks: number) => void;
  toggleLegacyCleared: (track: 'quests' | 'bonds' | 'discoveries') => void;
  setXp: (earned: number, spent: number) => void;

  // progress tracks
  addProgressTrack: (t: ProgressTrack) => void;
  updateProgressTrack: (id: string, patch: Partial<ProgressTrack>) => void;
  removeProgressTrack: (id: string) => void;
  markProgress: (id: string, ticks: number) => void;
  patchBackgroundVow: (patch: Partial<ProgressTrack>) => void;

  // assets
  equipAsset: (a: AssetInstance) => void;
  unequipAsset: (instanceId: string) => void;
  updateAsset: (instanceId: string, patch: Partial<AssetInstance>) => void;

  // connections
  addConnection: (c: Connection) => void;
  updateConnection: (id: string, patch: Partial<Connection>) => void;
  removeConnection: (id: string) => void;

  // sector
  setSectorField: (patch: Partial<Campaign['sector']>) => void;
  addLocation: (l: SectorLocation) => void;
  updateLocation: (id: string, patch: Partial<SectorLocation>) => void;
  removeLocation: (id: string) => void;
  addLink: (l: SectorLink) => void;
  removeLink: (id: string) => void;

  // notes
  addNote: (n?: Partial<NoteDoc>) => string;
  updateNote: (id: string, patch: Partial<NoteDoc>) => void;
  removeNote: (id: string) => void;

  // truths
  setTruth: (categoryId: string, choice: TruthChoice) => void;

  // log
  addLog: (entry: RollLogEntry) => void;
  clearLog: () => void;
}

function loadInitial(): Campaign {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return defaultCampaign();
}

function persist(c: Campaign) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export const useStore = create<StoreState>((set) => {
  // Helper: mutate campaign, stamp updatedAt, persist.
  const edit = (fn: (c: Campaign) => Campaign | void) => {
    set((state) => {
      const draft = structuredClone(state.campaign);
      const result = fn(draft) ?? draft;
      result.meta.updatedAt = new Date().toISOString();
      persist(result);
      return { campaign: result };
    });
  };

  const editCharacter = (fn: (ch: Character) => Character | void) => {
    edit((c) => {
      const r = fn(c.character);
      c.character = ensureMomentumSync(r ?? c.character);
    });
  };

  const initialCampaign = loadInitial();
  return {
    campaign: initialCampaign,
    activeSection: initialCampaign.wizardComplete ? 'sheet' : 'wizard',
    setSection: (s) => set({ activeSection: s }),

    newCampaign: (title) => {
      const c = defaultCampaign(title);
      persist(c);
      set({ campaign: c, activeSection: 'wizard' });
    },
    loadCampaign: (raw) => {
      const c = migrate(raw);
      persist(c);
      set({ campaign: c, activeSection: c.wizardComplete ? 'sheet' : 'wizard' });
    },
    replaceCampaign: (c) => {
      persist(c);
      set({ campaign: c });
    },
    setTitle: (t) => edit((c) => void (c.meta.title = t)),
    setWizardComplete: (v) => edit((c) => void (c.wizardComplete = v)),

    patchCharacter: (patch) => editCharacter((ch) => ({ ...ch, ...patch })),
    setStat: (stat, value) =>
      editCharacter((ch) => void (ch.stats[stat] = clamp(value, 0, 5))),
    setMeter: (meter, value) =>
      editCharacter((ch) => void (ch.meters[meter] = clamp(value, 0, 5))),
    setMomentumValue: (v) =>
      editCharacter((ch) => {
        ch.momentum.value = clamp(v, -6, ch.momentum.max);
      }),
    burnMomentum: () =>
      editCharacter((ch) => {
        ch.momentum.value = ch.momentum.reset;
      }),
    toggleImpact: (flag) =>
      editCharacter((ch) => {
        (ch.impacts[flag] as boolean) = !ch.impacts[flag];
      }),
    addOtherImpact: (label) =>
      editCharacter((ch) => {
        ch.impacts.other.push({ id: uid('imp'), label, active: true });
      }),
    toggleOtherImpact: (id) =>
      editCharacter((ch) => {
        const o = ch.impacts.other.find((x) => x.id === id);
        if (o) o.active = !o.active;
      }),
    removeOtherImpact: (id) =>
      editCharacter((ch) => {
        ch.impacts.other = ch.impacts.other.filter((x) => x.id !== id);
      }),

    setLegacyTicks: (track, ticks) =>
      editCharacter((ch) => {
        const prev = ch.legacy[track];
        const next = clamp(ticks, 0, 40);
        // auto-earn xp for each newly completed box
        const prevBoxes = Math.floor(prev / 4);
        const nextBoxes = Math.floor(next / 4);
        const clearedFlag =
          track === 'quests'
            ? ch.legacy.questsCleared
            : track === 'bonds'
              ? ch.legacy.bondsCleared
              : ch.legacy.discoveriesCleared;
        if (nextBoxes > prevBoxes) {
          ch.legacy.xpEarned += (nextBoxes - prevBoxes) * legacyBoxXp(clearedFlag);
        }
        ch.legacy[track] = next;
      }),
    toggleLegacyCleared: (track) =>
      editCharacter((ch) => {
        const key = (track + 'Cleared') as 'questsCleared' | 'bondsCleared' | 'discoveriesCleared';
        ch.legacy[key] = !ch.legacy[key];
      }),
    setXp: (earned, spent) =>
      editCharacter((ch) => {
        ch.legacy.xpEarned = Math.max(0, earned);
        ch.legacy.xpSpent = Math.max(0, spent);
      }),

    addProgressTrack: (t) => edit((c) => void c.progressTracks.push(t)),
    updateProgressTrack: (id, patch) =>
      edit((c) => {
        const t = c.progressTracks.find((x) => x.id === id);
        if (t) Object.assign(t, patch);
      }),
    removeProgressTrack: (id) =>
      edit((c) => void (c.progressTracks = c.progressTracks.filter((t) => t.id !== id))),
    markProgress: (id, ticks) =>
      edit((c) => {
        const t = c.progressTracks.find((x) => x.id === id);
        if (t) t.ticks = clamp(t.ticks + ticks, 0, 40);
      }),
    patchBackgroundVow: (patch) =>
      editCharacter((ch) => void Object.assign(ch.backgroundVow, patch)),

    equipAsset: (a) => editCharacter((ch) => void ch.assets.push(a)),
    unequipAsset: (instanceId) =>
      editCharacter((ch) => void (ch.assets = ch.assets.filter((a) => a.instanceId !== instanceId))),
    updateAsset: (instanceId, patch) =>
      editCharacter((ch) => {
        const a = ch.assets.find((x) => x.instanceId === instanceId);
        if (a) Object.assign(a, patch);
      }),

    addConnection: (cn) => edit((c) => void c.connections.push(cn)),
    updateConnection: (id, patch) =>
      edit((c) => {
        const cn = c.connections.find((x) => x.id === id);
        if (cn) Object.assign(cn, patch);
      }),
    removeConnection: (id) =>
      edit((c) => void (c.connections = c.connections.filter((x) => x.id !== id))),

    setSectorField: (patch) => edit((c) => void Object.assign(c.sector, patch)),
    addLocation: (l) => edit((c) => void c.sector.locations.push(l)),
    updateLocation: (id, patch) =>
      edit((c) => {
        const l = c.sector.locations.find((x) => x.id === id);
        if (l) Object.assign(l, patch);
      }),
    removeLocation: (id) =>
      edit((c) => {
        c.sector.locations = c.sector.locations.filter((x) => x.id !== id);
        c.sector.links = c.sector.links.filter((k) => k.from !== id && k.to !== id);
      }),
    addLink: (l) => edit((c) => void c.sector.links.push(l)),
    removeLink: (id) => edit((c) => void (c.sector.links = c.sector.links.filter((x) => x.id !== id))),

    addNote: (n) => {
      const id = uid('note');
      edit((c) =>
        void c.notes.push({
          id,
          title: n?.title ?? 'New Note',
          body: n?.body ?? '',
          updatedAt: new Date().toISOString(),
        }),
      );
      return id;
    },
    updateNote: (id, patch) =>
      edit((c) => {
        const n = c.notes.find((x) => x.id === id);
        if (n) {
          Object.assign(n, patch);
          n.updatedAt = new Date().toISOString();
        }
      }),
    removeNote: (id) => edit((c) => void (c.notes = c.notes.filter((x) => x.id !== id))),

    setTruth: (categoryId, choice) => edit((c) => void (c.truths[categoryId] = choice)),

    addLog: (entry) =>
      edit((c) => {
        c.log.unshift(entry);
        if (c.log.length > 500) c.log.length = 500;
      }),
    clearLog: () => edit((c) => void (c.log = [])),
  };
});

// Convenience selectors
export const selectCharacter = (s: StoreState) => s.campaign.character;
export const selectDerivedMomentum = (s: StoreState) =>
  deriveMomentum(s.campaign.character.impacts);

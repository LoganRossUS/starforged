// Core campaign data model for the Forge Companion app.
// The entire Campaign object is serializable to JSON (the canonical save format).

export type Stat = 'edge' | 'heart' | 'iron' | 'shadow' | 'wits';
export const STATS: Stat[] = ['edge', 'heart', 'iron', 'shadow', 'wits'];

export type Rank = 'troublesome' | 'dangerous' | 'formidable' | 'extreme' | 'epic';
export const RANKS: Rank[] = ['troublesome', 'dangerous', 'formidable', 'extreme', 'epic'];

/** Ticks added to a progress track per mark, by rank. */
export const RANK_PROGRESS: Record<Rank, number> = {
  troublesome: 12, // 3 boxes
  dangerous: 8, // 2 boxes
  formidable: 4, // 1 box
  extreme: 2, // 2 ticks
  epic: 1, // 1 tick
};

export type ProgressType =
  | 'vow'
  | 'expedition'
  | 'connection'
  | 'combat'
  | 'sceneChallenge'
  | 'clock'
  | 'other';

export interface ProgressTrack {
  id: string;
  name: string;
  type: ProgressType;
  rank?: Rank; // not used for legacy / clock tracks
  ticks: number; // 0..40 (4 ticks = 1 box, 10 boxes = full)
  unbounded?: boolean;
  completed?: boolean;
  notes?: string;
  // For clocks (segmented progress that isn't a standard 10-box track)
  clockSegments?: number; // e.g. 4 / 6 / 8 / 10
  clockFilled?: number;
}

export interface LegacyTracks {
  quests: number; // ticks 0..40
  bonds: number;
  discoveries: number;
  questsCleared: boolean;
  bondsCleared: boolean;
  discoveriesCleared: boolean;
  xpEarned: number;
  xpSpent: number;
}

export interface ConditionMeters {
  health: number; // 0..5
  spirit: number; // 0..5
  supply: number; // 0..5
}

export interface Momentum {
  value: number; // -6..max
  max: number; // derived from impacts (10 - impacts)
  reset: number; // +2 / +1 / 0 depending on impacts
}

export interface Impacts {
  // Misfortunes
  wounded: boolean;
  shaken: boolean;
  unprepared: boolean;
  // Lasting effects
  permanentlyHarmed: boolean;
  traumatized: boolean;
  // Burdens
  doomed: boolean;
  tormented: boolean;
  indebted: boolean;
  // Vehicle / other troubles
  battered: boolean;
  cursed: boolean;
  other: { id: string; label: string; active: boolean }[];
}

export interface AssetAbility {
  text: string;
  enabled: boolean;
}

export type AssetType =
  | 'command_vehicle'
  | 'module'
  | 'support_vehicle'
  | 'path'
  | 'companion'
  | 'deed';

export interface AssetInstance {
  instanceId: string; // unique per equipped instance
  assetId: string; // ref into content
  name: string;
  type: AssetType;
  abilities: AssetAbility[];
  fields: Record<string, string>; // NAME, IDEOLOGY, LINKED STAT, etc.
  conditionMeter?: { label: string; value: number; max: number };
  controls?: Record<string, number | boolean | string>; // ammo, integrity, custom counters
}

export interface Connection {
  id: string;
  name: string;
  location?: string;
  roles: string[];
  rank: Rank;
  progress: ProgressTrack;
  bonded: boolean;
  notes?: string;
}

export interface TruthChoice {
  choiceId: string;
  customText?: string;
  summary?: string; // resolved text shown on the sheet
  questStarter?: string;
  subRolls?: string[]; // selected/rolled sub-table result(s), if any
}
export interface Truths {
  [categoryId: string]: TruthChoice;
}

export interface Character {
  name: string;
  pronouns: string;
  callsign: string;
  characteristics: string;
  stats: Record<Stat, number>; // 1..3
  meters: ConditionMeters;
  momentum: Momentum;
  legacy: LegacyTracks;
  impacts: Impacts;
  backgroundVow: ProgressTrack; // epic
  assets: AssetInstance[];
}

// ---- Sector / map ----
export type LocationKind =
  | 'settlement'
  | 'star'
  | 'planet'
  | 'derelict'
  | 'vault'
  | 'creature'
  | 'ship'
  | 'exit'
  | 'other';

export interface SectorLocation {
  id: string;
  name: string;
  kind: LocationKind;
  q: number; // axial hex coords
  r: number;
  notes?: string;
  details?: { label: string; value: string }[];
}

export interface SectorLink {
  id: string;
  from: string;
  to: string;
}

export interface SectorMap {
  name: string;
  region: string;
  control: string; // faction control
  locations: SectorLocation[];
  links: SectorLink[];
}

// ---- Notes ----
export interface NoteDoc {
  id: string;
  title: string;
  body: string; // markdown
  updatedAt: string;
}

// ---- Roll log ----
export type RollType = 'action' | 'progress' | 'oracle' | 'yesno';

export interface RollLogEntry {
  id: string;
  type: RollType;
  timestamp: string;
  label: string; // move/oracle/quick description
  // action
  stat?: string;
  adds?: number;
  actionDie?: number;
  challengeDice?: [number, number];
  score?: number;
  burnedMomentum?: boolean;
  canceledByMomentum?: boolean;
  // progress
  progressScore?: number;
  // oracle
  oracleResult?: string;
  d100?: number;
  // resolution
  outcome?: 'strong' | 'weak' | 'miss' | null;
  match?: boolean;
}

export interface Campaign {
  version: number;
  meta: { title: string; createdAt: string; updatedAt: string };
  truths: Truths;
  character: Character;
  sector: SectorMap;
  connections: Connection[];
  progressTracks: ProgressTrack[];
  notes: NoteDoc[];
  log: RollLogEntry[];
  wizardComplete: boolean;
}

export const CAMPAIGN_VERSION = 1;
